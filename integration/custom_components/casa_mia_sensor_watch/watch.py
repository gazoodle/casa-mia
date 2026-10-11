"""The watching: each record's entity followed live, its level worked out (levels.py),
held off so a blip doesn't count, and each change fired as an event and told to the
entities. Built for thousands of records: they are fetched from the app only when the
revision in its /health moves; HA's state tracker hands us only watched entities (one
dict lookup per state change in the house); attribute-only updates stop at once; the
summary is worked out once per change; and the entities write at most once a TELL."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import aiohttp
from homeassistant.core import (
    CALLBACK_TYPE,
    Event,
    EventStateChangedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.util import dt as dt_util

from ..casa_mia.coordinator import CasaMiaCoordinator
from .const import EVENT, MODULE
from .levels import UNAVAILABLE, level_of, reading, summary
from .swap import Rule, same, shown

_LOGGER = logging.getLogger(__name__)
# seconds: the entities write at once, then at most once in this while changes keep
# coming, so a storm is a write a TELL, not one per change.
TELL = 0.2
RECORDS = "/sensor-watch/records"  # the app's records, fetched when the revision moves


def module(coordinator: CasaMiaCoordinator) -> dict[str, Any]:
    """The sensor_watch module's health from /health (empty if the app lacks it)."""
    return coordinator.data.get("modules", {}).get(MODULE, {})


class Watcher:
    def __init__(self, hass: HomeAssistant, coordinator: CasaMiaCoordinator) -> None:
        self.hass = hass
        self.coordinator = coordinator
        self.records: dict[str, dict[str, Any]] = {}
        # entity -> {level, message, value, since, name}: its level now, as counted
        self.now: dict[str, dict[str, Any]] = {}
        self._pending: dict[str, tuple[str, CALLBACK_TYPE]] = {}  # level, its timer
        self._unsub: CALLBACK_TYPE | None = None
        self._listeners: list[Callable[[], None]] = []
        self.swap: Rule = same  # the screenshot swap (swap.py), looked at every few s
        self._summary: dict[str, Any] | None = None  # cached until the next change
        self._telling: CALLBACK_TYPE | None = None  # the TELL after a write
        self._more = False  # changes since that write, to write when it ends
        self._revision: str | None = None  # of the records applied
        self._fetching = False
        # Keys of Home Assistant's own rows (apply_system).
        self._system: set[str] = set()
        # The page's settings for Home Assistant's own health (levels.system_rows), and
        # what checks it again (system.start_checks), when they change.
        self.system_settings: dict[str, Any] = {}
        self.recheck: Callable[[], None] | None = None

    def listen(self, told: Callable[[], None]) -> Callable[[], None]:
        """Be told after each change of level (the entities write their state)."""
        self._listeners.append(told)
        return lambda: self._listeners.remove(told)

    def summary(self) -> dict[str, Any]:
        if self._summary is None:
            # `watching`: the sensors given bands, not Home Assistant's own rows
            found = summary(self.now) | {"watching": len(self.records)}
            for key, rows in found.items():  # the lists of culprits, as shown
                if key.endswith("_list"):
                    found[key] = [shown(self.swap, r) for r in rows]
            self._summary = found
        return self._summary

    @callback
    def refresh(self) -> None:
        """Each report from the app: fetch the records if their revision moved."""
        revision = module(self.coordinator).get("revision")
        if revision is None or revision == self._revision or self._fetching:
            return
        self._fetching = True
        self.hass.async_create_task(self._fetch(revision))

    async def _fetch(self, revision: str) -> None:
        url = f"{self.coordinator.url}{RECORDS}"
        try:
            session = async_get_clientsession(self.hass)
            async with session.get(
                url, timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response.raise_for_status()
                data = await response.json()
        except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
            _LOGGER.warning(
                "could not fetch the records (%s); trying at the next poll", exc
            )
            return
        finally:
            self._fetching = False
        self._revision = data.get("revision", revision)
        self._apply({r["entity_id"]: r for r in data.get("records") or []})
        if (system := data.get("system") or {}) != self.system_settings:
            self.system_settings = system
            _LOGGER.info("Home Assistant's own health: %s", system)
            if self.recheck:
                self.recheck()

    @callback
    def _apply(self, records: dict[str, dict[str, Any]]) -> None:
        """Follow the records as they are now."""
        if records == self.records:
            return
        changed = {e for e, r in records.items() if r != self.records.get(e)}
        gone = set(self.records) - set(records)
        self.records = records
        for eid in changed | gone:
            self._cancel(eid)
            self.now.pop(eid, None)
        if self._unsub:
            self._unsub()
        self._unsub = (
            async_track_state_change_event(self.hass, list(records), self._changed)
            if records
            else None
        )
        for eid in changed:
            self._consider(eid, initial=True)
        _LOGGER.info(
            "watching %d sensors (%d new or changed, %d no longer watched)",
            len(records),
            len(changed),
            len(gone),
        )
        self._tell()

    @callback
    def unload(self) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None
        for eid in list(self._pending):
            self._cancel(eid)
        if self._telling:
            self._telling()
            self._telling = None

    @callback
    def _changed(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        record = self.records.get(event.data["entity_id"]) or {}
        if (
            old is not None
            and new is not None
            and reading(record, old) == reading(record, new)
        ):
            return  # what it watches didn't change (its attributes, or the state)
        self._consider(event.data["entity_id"])

    @callback
    def _consider(self, eid: str, initial: bool = False) -> None:
        record = self.records.get(eid)
        if record is None:
            return
        state = self.hass.states.get(eid)
        level, message = level_of(record, reading(record, state))
        current = self.now.get(eid)
        if level is None or (current is not None and current["level"] == level):
            self._cancel(eid)  # back where it was (or no opinion): nothing to wait for
            return
        if initial and state is not None and state.state not in UNAVAILABLE:
            self._commit(eid, level, message, state, initial=True)  # as found, at once
            return
        if (pending := self._pending.get(eid)) and pending[0] == level:
            return  # already waiting to see whether it lasts
        self._cancel(eid)
        hold = record.get("hold_off", 60)
        if hold <= 0:
            self._commit(eid, level, message, state)
            return
        _LOGGER.debug("%s: %s for %s s before it counts", eid, level, hold)
        timer = async_call_later(self.hass, hold, lambda _now: self._held(eid, level))
        self._pending[eid] = (level, timer)

    @callback
    def _held(self, eid: str, level: str) -> None:
        self._pending.pop(eid, None)
        record = self.records.get(eid)
        if record is None:
            return
        state = self.hass.states.get(eid)
        now, message = level_of(record, reading(record, state))
        if now == level:
            self._commit(eid, level, message, state)
        else:
            self._consider(eid)

    def _cancel(self, eid: str) -> None:
        if pending := self._pending.pop(eid, None):
            pending[1]()

    def _commit(
        self,
        eid: str,
        level: str,
        message: str | None,
        state: State | None,
        initial: bool = False,
    ) -> None:
        record = self.records[eid]
        name = record.get("name") or (state.name if state else eid)
        previous = (self.now.get(eid) or {}).get("level")
        value = reading(record, state)
        since = state.last_changed if initial and state else dt_util.utcnow()
        self.now[eid] = {
            "level": level,
            "message": message,
            "value": value,
            "since": since.isoformat(),
            "name": name,
            **({"attribute": record["attribute"]} if record.get("attribute") else {}),
        }
        if initial:
            if level != "nominal":
                _LOGGER.info(
                    "%s (%s) found at %s: %s (%s)",
                    name,
                    eid,
                    level,
                    value,
                    message or "no message",
                )
            return  # refresh tells the entities once for all
        self._fire(eid, self.now[eid], previous)

    @callback
    def apply_system(self, rows: dict[str, dict[str, Any]]) -> None:
        """Home Assistant's own health (levels.system_rows), counted beside the sensors:
        a change of level fires the event as a sensor's does; an integration that
        recovers is told as nominal, then no longer listed."""
        for key in self._system - set(rows):
            gone = self.now.pop(key)
            dropped = not self._still_watched(key)
            self._fire(
                key,
                gone
                | {
                    "level": "nominal",
                    "value": "no longer watched" if dropped else "loaded",
                    "message": "ignored on the Sensor Watch page" if dropped else None,
                },
                gone["level"],
            )
        changed = set(rows) != self._system
        for key, row in rows.items():
            old = self.now.get(key)
            if old is not None and old["level"] == row["level"]:
                continue
            changed = True
            self.now[key] = row | {"since": dt_util.utcnow().isoformat()}
            if old is not None or row["level"] != "nominal":
                self._fire(key, self.now[key], old and old["level"])
        self._system = set(rows)
        if changed:
            self._tell()

    def _still_watched(self, key: str) -> bool:
        """Is this row of Home Assistant's own health still wanted by the page's settings
        (not ignored, its kind not switched off)?"""
        s = self.system_settings
        if key.startswith("integration."):
            return s.get("integrations", True) and key.split(".", 1)[1] not in (
                s.get("ignore") or []
            )
        return s.get("core", True)

    def _fire(self, eid: str, row: dict[str, Any], previous: str | None) -> None:
        """Log a change of level, fire the event (with its group, area and attribute,
        for a notification to say), and have the entities write."""
        _LOGGER.info(
            "%s (%s): %s -> %s at %s (%s)",
            row["name"],
            eid,
            previous or "nothing",
            row["level"],
            row["value"],
            row["message"] or "no message",
        )
        self.hass.bus.async_fire(
            EVENT,
            shown(
                self.swap,
                {
                    "entity_id": eid,
                    "name": row["name"],
                    "level": row["level"],
                    "previous": previous,
                    "value": row["value"],
                    "message": row["message"],
                    "group": (self.records.get(eid) or {}).get("group"),
                    "area": self._area(eid),
                    "attribute": (self.records.get(eid) or {}).get("attribute"),
                },
            ),
        )
        self._tell()

    def _area(self, eid: str) -> str | None:
        """The entity's area's name (its own, else its device's), if it has one."""
        entry = er.async_get(self.hass).async_get(eid)
        if entry is None:
            return None
        area_id = entry.area_id
        if area_id is None and entry.device_id:
            device = dr.async_get(self.hass).async_get(entry.device_id)
            area_id = device.area_id if device else None
        area = ar.async_get(self.hass).async_get_area(area_id) if area_id else None
        return area.name if area else None

    @callback
    def swapped(self, swap: Rule) -> None:
        """The screenshot swap changed: the entities write again, as now shown."""
        if swap is not self.swap:
            self.swap = swap
            self._tell()

    def _tell(self) -> None:
        """Have the entities write: at once, then at most once a TELL while changes keep
        coming (a storm: one write for all of them at the end of each TELL)."""
        self._summary = None
        if (
            self._telling is not None
        ):  # written within the last TELL: once more after it
            self._more = True
            return
        self._told()

    @callback
    def _told(self) -> None:
        self._more = False
        for told in list(self._listeners):
            told()
        self._telling = async_call_later(self.hass, TELL, self._quiet)

    @callback
    def _quiet(self, _now: Any) -> None:
        self._telling = None
        if self._more:
            self._told()  # what changed meanwhile, in one write
