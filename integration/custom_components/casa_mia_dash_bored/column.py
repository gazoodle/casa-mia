"""The agent's column in the Gazette, written by a model from what a ZenOS-AI house's agent
has written about it (katas.py; docs/design/dash-bored-column.md).

Each time ZenOS writes a newer whole-house summary, the model ZenOS uses is asked once
for the column in all three papers' voices. The latest is kept (in memory, and in a
Store so that a restart serves it at once) and fed to every page: as it stands when a
page subscribes, then again each time it changes. Only one write runs at a time, and a
newer summary cancels the one under way, whose copy would already be out of date.

What the pages are told, `now`, is empty where there is no column: no Kata cabinet, or
the Configure dialog's switch off. Otherwise it holds the last good column (or none
yet), since when a write has been under way, and why the copy is late, if it is. The
pages say when the column's summary is too old to be how the house stands.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import COLUMN, CONF_COLUMN, DOMAIN, HIDE_LABEL
from .feed import Send, follow
from .katas import (
    DOJO,
    KATAS,
    MODEL,
    MOST,
    PERSONA,
    STRUCTURE,
    brief,
    pieces,
    said,
    shaped,
    summary,
)

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_column"
TIMEOUT = 120  # seconds the model is given; a local one takes 30 or so
HIDDEN = "dash_bored_hide"  # HIDE_LABEL's id: on the cabinet, it keeps the column off


class Late(Exception):
    """Why a write gave no column, in words for the page."""


class Column:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.feeds: list[Send] = []
        self.now: dict[str, Any] = {}
        self.kept: dict[str, Any] | None = None  # the last good column
        self.late: dict[str, Any] | None = (
            None  # why there is no newer one, and since when
        )
        self.writing: float | None = None  # since when a write has been under way
        self.asked = 0.0  # the time of the summary last written from, or tried
        self.on = True
        self._store: Store[dict[str, Any]] = Store(hass, 1, f"{DOMAIN}.column")
        self._entry: ConfigEntry | None = None
        self._cabinet: str | None = None
        self._unwatch: Any = None
        self._task: asyncio.Task | None = None

    async def start(self, entry: ConfigEntry) -> None:
        """For as long as the entry is loaded: follow the Kata cabinet, and find it again
        whenever the entity registry changes (a label put on, or ZenOS installed)."""
        if self.kept is None and (kept := await self._store.async_load()):
            self.kept, self.asked = kept, kept["at"]
        self._entry = entry
        self.on = entry.options.get(CONF_COLUMN, True)
        entry.async_on_unload(self.stop)
        entry.async_on_unload(
            self.hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self.find)
        )
        self.find()

    @callback
    def switch(self, on: bool) -> None:
        """The Configure dialog's switch, as just saved."""
        if on != self.on:
            self.on = on
            _LOGGER.info("Dash-Bored's column switched %s", "on" if on else "off")
            self.find()

    @callback
    def stop(self) -> None:
        self._entry = None
        self.find()

    def _labelled(self, label: str) -> str | None:
        entries = er.async_entries_for_label(er.async_get(self.hass), label)
        return next((e.entity_id for e in entries if HIDDEN not in e.labels), None)

    @callback
    def find(self, _event: Event | None = None) -> None:
        """Follow the Kata cabinet there is now, if any, and if the column is wanted."""
        cabinet = self._labelled(KATAS) if self.on and self._entry else None
        if cabinet == self._cabinet:
            return

        if self._unwatch:
            self._unwatch()
            self._unwatch = None
        if self._task:
            self._task.cancel()
            self._task = None
        self.writing = None
        self._cabinet = cabinet
        if cabinet:
            _LOGGER.info("Dash-Bored's column is written from %s", cabinet)
            self._unwatch = async_track_state_change_event(
                self.hass, cabinet, self._changed
            )
            self._changed()
        else:
            _LOGGER.info("Dash-Bored has no agent's column: %s", self._why_none())
        self._tell()

    def _why_none(self) -> str:
        if not self._entry:
            return "Dash-Bored has stopped"
        if not self.on:
            return "switched off"
        return (
            f"no sensor carries the label {KATAS} (ZenOS-AI), or it has {HIDE_LABEL!r}"
        )

    @callback
    def _changed(self, _event: Event | None = None) -> None:
        """The cabinet has changed. A newer summary is a new column; a component's Kata
        alone is not, since the next summary takes it in."""
        state = self.hass.states.get(self._cabinet) if self._cabinet else None
        drawers = state.attributes.get("variables") if state else None
        lead = summary(drawers) if isinstance(drawers, dict) else None
        if not lead or lead["at"] <= self.asked or not self._entry:
            return

        self.asked = lead["at"]
        if self._task:
            self._task.cancel()
            _LOGGER.info("A newer summary: the column being written is dropped")
        self._task = self._entry.async_create_background_task(
            self.hass, self._write(drawers, lead), "Dash-Bored's column"
        )

    async def _write(self, drawers: dict[str, Any], lead: dict[str, Any]) -> None:
        # Cancelled, it touches nothing: what cancelled it says what happens instead.
        self.writing = dt_util.utcnow().timestamp()
        self._tell()
        try:
            column = await self._ask(drawers, lead)
        except Late as err:
            _LOGGER.warning("Dash-Bored's column is late: %s", err)
            since = self.late["since"] if self.late else self.writing
            self.late = {"reason": str(err), "since": since}
        else:
            self.kept, self.late = column, None
            await self._store.async_save(column)
        self.writing = None
        self._task = None
        self._tell()

    async def _ask(self, drawers: dict[str, Any], lead: dict[str, Any]) -> dict:
        model_state = self.hass.states.get(MODEL)
        model = said(model_state.state) if model_state else None
        if not model:
            raise Late(f"ZenOS names no model to write with ({MODEL} is not set)")
        dojo_id = self._labelled(DOJO)
        dojo = self.hass.states.get(dojo_id) if dojo_id else None
        parts = dojo.attributes.get("variables") if dojo else None
        notes = pieces(drawers, parts if isinstance(parts, dict) else {})[:MOST]
        persona = self.hass.states.get(PERSONA)
        by = said(persona.state) if persona else None

        began = time.monotonic()
        try:
            async with asyncio.timeout(TIMEOUT):
                reply = await self.hass.services.async_call(
                    "ai_task",
                    "generate_data",
                    {
                        "task_name": "Dash-Bored's column",
                        "entity_id": model,
                        "instructions": brief(
                            self.hass.config.location_name, by, lead, notes
                        ),
                        "structure": STRUCTURE,
                    },
                    blocking=True,
                    return_response=True,
                )
        except TimeoutError as err:
            raise Late(f"the model didn't answer within {TIMEOUT} s") from err
        except Exception as err:  # the model's failure, whatever it is, is the reason
            raise Late(f"the model failed ({model}: {err})") from err
        try:
            papers = shaped((reply or {}).get("data"))
        except ValueError as err:
            raise Late(str(err)) from err

        took = round(time.monotonic() - began, 1)
        chars = sum(len(" ".join(p["body"])) for p in papers.values())
        _LOGGER.info(
            "Dash-Bored's column written from the summary of %s by %s, from %d Kata(s), "
            "in %.1f s: %d characters",
            dt_util.utc_from_timestamp(lead["at"]).isoformat(),
            model,
            len(notes),
            took,
            chars,
        )
        return {
            "at": lead["at"],
            "written": dt_util.utcnow().timestamp(),
            "model": model,
            "took": took,
            "by": by,
            "papers": papers,
        }

    @callback
    def _tell(self) -> None:
        if not self._cabinet:
            self.now = {}
        else:
            kept = self.kept or {}
            self.now = {
                "by": kept.get("by"),
                "at": kept.get("at"),
                "papers": kept.get("papers"),
                "writing": self.writing,
                "late": self.late,
            }
        for feed in list(self.feeds):
            feed(self.now)


def setup(hass: HomeAssistant) -> Column:
    """Once per Home Assistant run."""
    column = hass.data[KEY] = Column(hass)
    websocket_api.async_register_command(hass, _ws_column)
    return column


@websocket_api.websocket_command({vol.Required("type"): COLUMN})
@callback
def _ws_column(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The column as it stands, then again each time it changes."""
    column: Column = hass.data[KEY]
    follow(connection, msg, column.feeds, [column.now])
