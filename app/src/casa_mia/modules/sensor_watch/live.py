"""The live levels, pushed: the app holds one websocket to Home Assistant and hears, as
they happen, each watched sensor's state (subscribe_entities: its value), each change of
level (the integration's casa_mia_sensor_watch event, taken at once), and each write of
the integration's own entities (the levels asked again of its `list` service, a
backstop that also gives the Home tile its health). The page long-polls wait(), so it
shows a change as soon as Home Assistant does."""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

import aiohttp

from ...ha import HA, HAError
from .common import DOMAIN
from .status import MISSING, Status

_LOGGER = logging.getLogger(__name__)

RETRY = 10.0  # seconds before connecting again
SETTLE = 0.3  # seconds: the integration's entities write in a burst; asked once after
TICK = 1.0  # seconds: how often the loop looks up from the socket
# seconds after the integration takes the records (at its start, or after a change) that
# the levels are asked again: it has judged them all afresh by then, and that writes
# nothing the app hears when the levels come out as they were (HA's restart, say).
TAKEN = 2.0


class Live:
    def __init__(
        self,
        ha: HA,
        status: Status,
        watched: Callable[[], dict[str, str | None]],
    ) -> None:
        self.ha = ha
        self.status = status
        self.watched = (
            watched  # entity id -> the attribute watched, or None (its state)
        )
        self._cond = threading.Condition()
        self._rev = 0
        self._levels: dict[str, dict[str, Any]] = {}
        self._error: str | None = "Waiting for Home Assistant…"
        self._again = threading.Event()  # the records changed: subscribe afresh
        # Told when HA's entity registry changes (an entity added, a label given): groups.
        self.on_registry: Callable[[], None] | None = None
        self._stop = threading.Event()
        self._due: float | None = None  # when to ask the levels again

    def start(self) -> None:
        threading.Thread(
            target=lambda: asyncio.run(self._run()),
            name="sensor-watch-live",
            daemon=True,
        ).start()

    def stop(self) -> None:
        self._stop.set()

    def taken(self) -> None:
        """The integration took the records: ask the levels again in a moment."""
        self._due = time.monotonic() + TAKEN

    def resubscribe(self) -> None:
        """The watched sensors changed: hear the new ones (and ask the levels again)."""
        self._again.set()

    def snapshot(self) -> dict[str, Any]:
        with self._cond:
            return {
                "levels": dict(self._levels),
                "error": self._error,
                "rev": self._rev,
            }

    def wait(self, after: int, timeout: float) -> dict[str, Any]:
        """The levels once they differ from revision `after`, or as they are at `timeout`."""
        with self._cond:
            self._cond.wait_for(lambda: self._rev != after, timeout)
        return self.snapshot()

    def _publish(self, change: Callable[[], None]) -> None:
        with self._cond:
            change()
            self._rev += 1
            self._cond.notify_all()

    def _refresh(self) -> None:
        """Ask the integration for every level now (status.poll keeps the tile's health)."""
        response = self.status.poll()

        def take() -> None:
            if response is None:
                self._error = MISSING
                return
            rows = response.get("sensors") or []
            self._levels = {r["entity_id"]: r for r in rows}
            self._error = None

        self._publish(take)

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await self._session()
            except (
                aiohttp.ClientError,
                TimeoutError,
                OSError,
                ValueError,
                HAError,
            ) as exc:
                _LOGGER.warning(
                    "live levels: lost Home Assistant (%s); again in %ds", exc, RETRY
                )
            if not self._stop.is_set() and not self._again.is_set():
                await asyncio.to_thread(self._stop.wait, RETRY)

    async def _session(self) -> None:
        """One connection: subscribe to the watched sensors and the integration's own
        entities, and follow them until the records change or the connection drops."""
        self._again.clear()
        async with (
            aiohttp.ClientSession() as session,
            session.ws_connect(self.ha.ws_url, heartbeat=30, max_msg_size=0) as ws,
        ):
            await ws.receive_json()  # auth_required
            await ws.send_json({"type": "auth", "access_token": self.ha.token})
            if (await ws.receive_json()).get("type") != "auth_ok":
                raise HAError("Home Assistant refused the app's token")
            await ws.send_json({"id": 1, "type": "config/entity_registry/list"})
            while (m := await ws.receive_json()).get("id") != 1:
                pass
            own = {
                e["entity_id"]
                for e in m.get("result") or []
                if e.get("platform") == DOMAIN
            }
            watched = self.watched()
            await asyncio.to_thread(self._refresh)
            await ws.send_json(
                {
                    "id": 2,
                    "type": "subscribe_entities",
                    "entity_ids": sorted(set(watched) | own),
                }
            )
            # Each change of level, the moment the integration decides it.
            await ws.send_json(
                {"id": 3, "type": "subscribe_events", "event_type": DOMAIN}
            )
            # An entity added, or changed (a label given in HA's own settings): groups look.
            await ws.send_json(
                {
                    "id": 4,
                    "type": "subscribe_events",
                    "event_type": "entity_registry_updated",
                }
            )
            _LOGGER.info(
                "live levels: following %d watched sensors and %d of the integration's entities",
                len(watched),
                len(own),
            )
            while not self._stop.is_set() and not self._again.is_set():
                try:
                    msg = await ws.receive(timeout=TICK)
                except TimeoutError:
                    msg = None
                if msg is not None:
                    if msg.type != aiohttp.WSMsgType.TEXT:
                        raise HAError("the connection closed")
                    m = msg.json()
                    if m.get("id") == 2 and m.get("type") == "event":
                        if self._heard(m["event"], own, watched):
                            self._due = self._due or time.monotonic() + SETTLE
                    elif m.get("id") == 3 and m.get("type") == "event":
                        self._moved(m["event"])
                    elif m.get("id") == 4 and m.get("type") == "event":
                        action = (m["event"].get("data") or {}).get("action")
                        if action in ("create", "update") and self.on_registry:
                            self.on_registry()
                if self._due is not None and time.monotonic() >= self._due:
                    self._due = None
                    await asyncio.to_thread(self._refresh)
            _LOGGER.debug(
                "live levels: the watched sensors changed; subscribing afresh"
            )

    def _moved(self, event: dict[str, Any]) -> None:
        """A change of level, as the integration fired it: that row, at once."""
        data = event.get("data") or {}
        eid = data.get("entity_id")
        if not eid:
            return
        _LOGGER.debug("live levels: %s -> %s", eid, data.get("level"))
        row = {k: data.get(k) for k in ("name", "level", "value", "message")}
        since = event.get("time_fired") or ""

        def take() -> None:
            self._levels[eid] = (
                (self._levels.get(eid) or {"entity_id": eid}) | row | {"since": since}
            )

        self._publish(take)

    def _heard(
        self,
        event: dict[str, Any],
        own: set[str],
        watched: dict[str, str | None] | None = None,
    ) -> bool:
        """Take the new values from a subscribe_entities event ("a": states added, "c":
        changes, each with its state `s` and attributes `a`): the state, or the watched
        attribute; True when one of the integration's own entities wrote (a level moved)."""
        watched = watched or {}
        values: dict[str, Any] = {}
        for e, s in (event.get("a") or {}).items():
            values[e] = _value(s, watched.get(e))
        for e, d in (event.get("c") or {}).items():
            if (v := _value(d.get("+") or {}, watched.get(e))) is not None:
                values[e] = v
        values = {e: v for e, v in values.items() if v is not None}
        touched = set(event.get("a") or {}) | set(event.get("c") or {})
        with self._cond:
            news = {
                e: v
                for e, v in values.items()
                if e in self._levels and self._levels[e].get("value") != v
            }
        if news:

            def take() -> None:
                for e, v in news.items():
                    if e in self._levels:
                        self._levels[e] = self._levels[e] | {"value": v}

            self._publish(take)  # only a value the page shows moves the revision
        return bool(touched & own)


def _value(compressed: dict[str, Any], attribute: str | None) -> str | None:
    """A compressed state's value as watched: the state, or the attribute (as text)
    while the entity is available; None when it doesn't say (a change of something else)."""
    state = compressed.get("s")
    if not attribute or state in ("unavailable", "unknown"):
        return state
    value = (compressed.get("a") or {}).get(attribute)
    return None if value is None else str(value)
