"""The Sensor Watch page's end in Home Assistant. The records (records/) are kept in Home
Assistant's storage and given to the watcher as each is saved. The page talks to websocket
commands, admins only: one that carries each of the records' routes (API), and feeds, each
pushed as it changes: every watch's level (LEVELS_FEED), the overall health (SUMMARY, for
Casa Mia's Home tile) and one entity's watch (ENTITY, the eye in its dialog).

A feed outlives the watcher it follows: when Sensor Watch stops (its entry reloads) every
feed says so, and when it starts again each is sent everything, so an open page is never
left showing levels nothing is keeping current."""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.storage import Store

from .const import ENTITY
from .levels import LEVELS, watching
from .records import HAError, SensorWatch
from .source import Source
from .swap import shown
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)

# Home Assistant's storage key for the records, and where the running Sensor Watch is
# kept in hass.data. Its own from the start, so the records need not move again.
DATA = "casa_mia_sensor_watch"
FEEDS = f"{DATA}_feeds"  # hass.data: what each open feed is sent by, for this HA run
API = f"{DATA}/api"
LEVELS_FEED = f"{DATA}/levels"
SUMMARY = f"{DATA}/summary"
NOT_RUNNING = "Sensor Watch isn't running in Home Assistant"
SAVE_TIMEOUT = 30.0  # seconds a save waits for Home Assistant's storage
# seconds after an entity, device, area, label or floor changes before the groups look
# for new members: a device's entities arrive together, and are read once.
SETTLE = 2.0
REGISTRIES = (
    er.EVENT_ENTITY_REGISTRY_UPDATED,
    dr.EVENT_DEVICE_REGISTRY_UPDATED,
    ar.EVENT_AREA_REGISTRY_UPDATED,
    fr.EVENT_FLOOR_REGISTRY_UPDATED,
    lr.EVENT_LABEL_REGISTRY_UPDATED,
)

# A feed's sender: told `whole` when it must send everything (Sensor Watch started or
# stopped), else after each change of level.
Send = Callable[[bool], None]


@dataclass
class Running:
    records: SensorWatch
    watcher: Watcher


def running(hass: HomeAssistant) -> Running | None:
    return hass.data.get(DATA)


async def start(hass: HomeAssistant, watcher: Watcher) -> CALLBACK_TYPE:
    """Load the records, give them to the watcher (now, and as each is saved), keep the
    groups up to date, and serve the page's commands. Returns what stops it."""
    if (
        FEEDS not in hass.data
    ):  # once per Home Assistant run: commands can't be taken off
        hass.data[FEEDS] = []
        for command in (_ws_api, _ws_levels, _ws_summary, _ws_entity):
            websocket_api.async_register_command(hass, command)
    feeds: list[Send] = hass.data[FEEDS]
    store: Store[dict[str, Any]] = Store(hass, 1, DATA)
    data = await store.async_load()

    def save(data: dict[str, Any]) -> None:
        """From the worker thread a route runs in: wait for Home Assistant's storage.
        ponytail: Home Assistant logs a failed write itself and doesn't raise, so only
        a write that never ends is refused here."""
        future = asyncio.run_coroutine_threadsafe(store.async_save(data), hass.loop)
        try:
            future.result(SAVE_TIMEOUT)
        except TimeoutError as exc:
            future.cancel()
            raise HAError(
                f"Home Assistant did not save the records in {SAVE_TIMEOUT:.0f} s"
            ) from exc

    # One at a time, read and handed over together: two saves in two threads reach the
    # watcher in the order they were read, so it never ends on the older.
    telling = threading.Lock()

    def changed(eids: set[str] | None) -> None:
        with telling:
            hass.loop.call_soon_threadsafe(watcher.take, records.outgoing(eids))

    records = SensorWatch(
        data,
        Source(hass),
        save,
        changed,
        afresh=lambda: hass.loop.call_soon_threadsafe(watcher.afresh),
    )
    watcher.take(records.outgoing(None))

    # The groups take in new members when Home Assistant's entities change: a registry
    # changed, or an entity with no registry entry got its first state. Pushed (CLAUDE.md
    # RULE FOUR); the only timer is the one-off SETTLE.
    settling: list[CALLBACK_TYPE] = []
    stops: list[CALLBACK_TYPE] = []

    @callback
    def look(*_: Any) -> None:
        if settling:
            return

        @callback
        def settled(_now: Any) -> None:
            settling.clear()
            hass.async_add_executor_job(records.look)

        settling.append(async_call_later(hass, SETTLE, settled))

    @callback
    def started(_hass: HomeAssistant) -> None:
        # Not while Home Assistant starts: every entity is new then, and is read once
        # here instead.
        stops.extend(hass.bus.async_listen(event, look) for event in REGISTRIES)
        stops.append(
            hass.bus.async_listen(
                EVENT_STATE_CHANGED,
                look,
                event_filter=callback(lambda data: data["old_state"] is None),
            )
        )
        look()

    stops.append(async_at_started(hass, started))
    stops.append(watcher.listen(lambda: [send(False) for send in list(feeds)]))
    hass.data[DATA] = Running(records, watcher)
    for send in list(feeds):
        send(True)

    @callback
    def stop() -> None:
        hass.data.pop(DATA, None)
        for one in stops + settling:
            one()
        for send in list(feeds):
            send(True)

    return stop


def _feed(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    say: Callable[[Running, bool], dict[str, Any] | None],
) -> None:
    """Subscribe the connection to a feed: `say` gives what to send now (everything when
    told `whole`; None for nothing new), and while Sensor Watch isn't running, that is
    said instead."""
    feeds: list[Send] = hass.data[FEEDS]
    was_running = [True]

    @callback
    def send(whole: bool) -> None:
        found = running(hass)
        if found is None:
            was_running[0] = False
            event: dict[str, Any] | None = {"error": NOT_RUNNING}
        else:
            event = say(found, whole or not was_running[0])
            was_running[0] = True
        if event is not None:
            connection.send_message(websocket_api.event_message(msg["id"], event))

    feeds.append(send)
    connection.subscriptions[msg["id"]] = lambda: feeds.remove(send)
    connection.send_result(msg["id"])
    send(True)


@websocket_api.websocket_command(
    {
        vol.Required("type"): API,
        vol.Required("method"): vol.In(("GET", "POST", "PUT", "DELETE")),
        vol.Required("path"): str,
        vol.Optional("query", default=dict): {str: str},
        vol.Optional("body"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_api(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """One of the records' routes (records/api.py), run in a worker thread: its status
    and JSON answer, as the page always had them. Each change is logged here (method,
    path, result), never its body."""
    found = running(hass)
    if found is None:
        connection.send_error(msg["id"], "not_running", NOT_RUNNING)
        return
    method, path = msg["method"], msg["path"]
    body = json.dumps(msg["body"]).encode() if "body" in msg else b""
    query = {k: [v] for k, v in msg["query"].items()}
    try:
        status, _type, answer = await hass.async_add_executor_job(
            found.records.handle, method, path, query, body
        )
    except Exception as exc:  # said to the page, with what it was: never a silent hang
        _LOGGER.exception("page: %s /%s failed", method, path)
        connection.send_error(msg["id"], "failed", f"{type(exc).__name__}: {exc}")
        return
    if method != "GET":
        _LOGGER.info("page: %s /%s -> %d", method, path.strip("/"), status)
    connection.send_result(msg["id"], {"status": status, "body": json.loads(answer)})


@websocket_api.websocket_command({vol.Required("type"): LEVELS_FEED})
@websocket_api.require_admin
@callback
def _ws_levels(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Every watch's level now ({"whole": true, "levels": {entity: its row}}), then at
    each change only the rows that moved (`levels`) or went (`removed`)."""
    swap: list[Any] = [None]

    def say(found: Running, whole: bool) -> dict[str, Any] | None:
        watcher = found.watcher
        # The screenshot swap changed how every row is shown.
        whole, swap[0] = whole or watcher.swap is not swap[0], watcher.swap
        eids = list(watcher.now) if whole else watcher.moved
        if not whole and not eids:
            return None
        return {
            "whole": whole,
            "levels": {
                e: shown(watcher.swap, {"entity_id": e, **watcher.now[e]})
                for e in eids
                if e in watcher.now
            },
            "removed": [e for e in eids if e not in watcher.now],
        }

    _feed(hass, connection, msg, say)


@websocket_api.websocket_command({vol.Required("type"): SUMMARY})
@websocket_api.require_admin
@callback
def _ws_summary(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The overall health, now and when it changes: the worst level, how many are
    watched, a count per level, and the worst culprit (the longest standing at it)."""
    last: list[dict[str, Any]] = []

    def say(found: Running, whole: bool) -> dict[str, Any] | None:
        s = found.watcher.summary()
        worst = s["worst"]
        top = (s.get(f"{worst}_list") or [{}])[0] if worst != "nominal" else {}
        now = {
            "health": worst,
            "watching": s["watching"],
            "counts": {lv: s[lv] for lv in LEVELS[1:] if s[lv]},
            "worst": f"{top.get('name') or top.get('entity_id')}: "
            f"{top.get('message') or top.get('value')}"
            if top
            else None,
        }
        if not whole and last == [now]:
            return None  # `whole`: said even if as before, after "not running"
        last[:] = [now]
        return now

    _feed(hass, connection, msg, say)


@websocket_api.websocket_command(
    {vol.Required("type"): ENTITY, vol.Required("entity_id"): str}
)
@websocket_api.require_admin
@callback
def _ws_entity(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """One entity's watch (levels.watching), now and again at each change: the eye in
    its dialog. Admins only, as the page it leads to. Error `not_running`: no eye."""
    if running(hass) is None:
        connection.send_error(msg["id"], "not_running", NOT_RUNNING)
        return
    last: list[dict[str, Any]] = []

    def say(found: Running, whole: bool) -> dict[str, Any] | None:
        now = watching(found.watcher.records, found.watcher.now, msg["entity_id"])
        if not whole and last == [now]:
            return None  # `whole`: said even if as before, after "not running"
        last[:] = [now]
        return now

    _feed(hass, connection, msg, say)
