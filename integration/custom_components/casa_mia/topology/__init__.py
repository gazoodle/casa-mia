"""Topology in Home Assistant: buildings and sites above its floors, and which area leads
to which (docs/design/topology.md). The rules are model.py's; this keeps the record in
Home Assistant's storage and serves the contract over the websocket:

- casa_mia/topology/subscribe (any signed-in user): the feed now, and again whenever
  it changes, by a save or by the area and floor registries (RULE FOUR: never polled).
- casa_mia/topology/save (administrators): the whole record and the rev it was based
  on. One based on an older rev is refused, so two editors can't overwrite each other.

One per Home Assistant run, made by casa_mia's async_setup and not its entry: the
entry's set-up fails while the app is down, and Topology needs nothing of the app's."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import floor_registry as fr
from homeassistant.helpers.storage import Store

from ..const import DOMAIN
from . import model

_LOGGER = logging.getLogger(__name__)

DATA = f"{DOMAIN}_topology"
EMPTY: dict[str, Any] = {"sites": [], "buildings": [], "connections": []}

# The shape of a save; what it means is model.check's.
_DIRECTION = vol.Any(None, str)
_SAVE = {
    vol.Required("type"): f"{DOMAIN}/topology/save",
    vol.Required("rev"): int,
    vol.Required("sites"): [{vol.Required("id"): str, vol.Required("name"): str}],
    vol.Required("buildings"): [
        {
            vol.Required("id"): str,
            vol.Required("name"): str,
            vol.Optional("site"): vol.Any(None, str),
            vol.Optional("floors"): [str],
            vol.Optional("areas"): [str],
        }
    ],
    vol.Required("connections"): [
        {
            vol.Required("a"): str,
            vol.Required("b"): str,
            vol.Optional("way"): _DIRECTION,
            vol.Optional("back"): _DIRECTION,
        }
    ],
}


class Stale(Exception):
    """A save based on a rev that is no longer the latest."""


class Topology:
    def __init__(
        self, hass: HomeAssistant, store: Store[dict[str, Any]], saved: dict[str, Any]
    ) -> None:
        self.hass = hass
        self._store = store
        self.rev: int = saved.get("rev", 0)
        self.record: dict[str, Any] = saved.get("record", EMPTY)
        self._listeners: list[Callable[[], None]] = []
        # Worked out once for each change, not for each page that asks.
        self.view = self._view()
        self._said_broken(self.view["broken"])

    def listen(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    def _registry(self) -> tuple[dict[str, str | None], set[str]]:
        areas = {a.id: a.floor_id for a in ar.async_get(self.hass).async_list_areas()}
        floors = {f.floor_id for f in fr.async_get(self.hass).async_list_floors()}
        return areas, floors

    def _view(self) -> dict[str, Any]:
        return model.view(self.record, self.rev, *self._registry())

    @callback
    def refresh(self, _event: Event | None = None) -> None:
        """Work the feed out again and send it, if it differs (an area renamed changes
        nothing here; one removed does)."""
        view = self._view()
        if view == self.view:
            return
        if view["broken"] != self.view["broken"]:
            self._said_broken(view["broken"])
        self.view = view
        for listener in list(self._listeners):
            listener()

    async def save(self, record: dict[str, Any], rev: int) -> int:
        """Keep a new record (model.Invalid or Stale if it can't be), and tell everyone."""
        if rev != self.rev:
            raise Stale(
                f"saved elsewhere since: the latest is {self.rev}, this was based on {rev}"
            )
        kept = model.check(record, *self._registry())

        # Written before it is believed: a failed write leaves everything as it was.
        await self._store.async_save({"rev": rev + 1, "record": kept})
        self.rev, self.record = rev + 1, kept
        _LOGGER.info(
            "topology saved (rev %d): %d sites, %d buildings, %d connections",
            self.rev, len(kept["sites"]), len(kept["buildings"]), len(kept["connections"]),
        )  # fmt: skip
        self.refresh()
        return self.rev

    @staticmethod
    def _said_broken(broken: list[dict[str, Any]]) -> None:
        # A fault, said in the log as well as the editor: nothing fails silently.
        def where(b: dict[str, Any]) -> str:
            if b["kind"] == "building":
                return f"building {b['id']}"
            return f"{b['a']} to {b['b']}"

        if broken:
            _LOGGER.warning(
                "topology names what no longer counts: %s",
                "; ".join(f"{b['ref']} in {where(b)} ({b['why']})" for b in broken),
            )


async def set_up(hass: HomeAssistant) -> Topology:
    """This run's Topology, loaded from storage, with its websocket commands."""
    store: Store[dict[str, Any]] = Store(hass, 1, f"{DOMAIN}.topology")
    topology = hass.data[DATA] = Topology(hass, store, await store.async_load() or {})
    for event in (ar.EVENT_AREA_REGISTRY_UPDATED, fr.EVENT_FLOOR_REGISTRY_UPDATED):
        hass.bus.async_listen(event, topology.refresh)
    websocket_api.async_register_command(hass, _ws_subscribe)
    websocket_api.async_register_command(hass, _ws_save)
    return topology


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/topology/subscribe"})
@callback
def _ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The feed now and at each change; any user (every page may draw the house)."""
    topology: Topology = hass.data[DATA]

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], topology.view))

    connection.subscriptions[msg["id"]] = topology.listen(send)
    connection.send_result(msg["id"])
    send()


@websocket_api.websocket_command(_SAVE)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """A new record from the editor; the answer is its rev, or why it was refused."""
    topology: Topology = hass.data[DATA]
    record = {key: msg[key] for key in EMPTY}
    try:
        rev = await topology.save(record, msg["rev"])
    except Stale as exc:
        _LOGGER.warning("topology save refused: %s", exc)
        connection.send_error(msg["id"], "stale", str(exc))
    except model.Invalid as exc:
        _LOGGER.warning("topology save refused: %s", exc)
        connection.send_error(msg["id"], "invalid", str(exc))
    else:
        connection.send_result(msg["id"], {"rev": rev})
