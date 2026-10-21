"""The records and the live levels, pushed both ways over one websocket the app holds to
Home Assistant. Out: each change of the records, pushed to the integration as it's saved
(its APPLY command: the records changed, or every one when it may not have the last),
whose answer carries the levels of the records it took. In, as they happen: each watched
sensor's state (subscribe_entities: its value), each change of level (the integration's
casa_mia_sensor_watch event, taken at once), and the integration's own entities (the Home
tile's health, status.py). The levels are asked of its `list` service only to start
from the truth: on connecting, and when it has taken every record. The page long-polls
wait(), so it shows a change as soon as Home Assistant does."""

from __future__ import annotations

import asyncio
import itertools
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

import aiohttp

from ...ha import HA, HAError
from .common import APPLY, EVENT
from .common import own as is_own
from .status import MISSING, Status

_LOGGER = logging.getLogger(__name__)

RETRY = 10.0  # seconds before connecting again
TICK = 1.0  # seconds: how often the loop looks up from the socket
# seconds after the integration fetches the records (at its start, or Refresh state)
# that the levels are asked again: it has judged them all afresh by then, and that
# writes nothing the app hears when the levels come out as they were (HA's restart, say).
TAKEN = 2.0
OLDER = (
    "the integration is older than the app (restart Home Assistant to finish "
    "updating): asked it to fetch the records"
)


class Live:
    def __init__(
        self,
        ha: HA,
        status: Status,
        watched: Callable[[], dict[str, str | None]],
        outgoing: Callable[[set[str] | None], dict[str, Any]],
        doorbell: Callable[[], None] | None = None,
    ) -> None:
        self.ha = ha
        self.status = status
        self.watched = (
            watched  # entity id -> the attribute watched, or None (its state)
        )
        # The records the integration is sent, for these entity ids (None: every one).
        self.outgoing = outgoing
        # Rung for an integration older than the push (until HA restarts): it fetches.
        self.doorbell = doorbell
        self._cond = threading.Condition()
        self._rev = 0
        self._levels: dict[str, dict[str, Any]] = {}
        self._error: str | None = "Waiting for Home Assistant…"
        # Told when HA's entity registry changes (an entity added, a label given): groups.
        self.on_registry: Callable[[], None] | None = None
        self._stop = threading.Event()
        self._due: float | None = None  # when to ask the levels again
        # And its entities too: it fetched the records, so it (re)started; the first
        # time Sensor Watch is on there, they're new.
        self._relist = False
        # The records changed since the last push (None: any of them), if any.
        self._lock = threading.Lock()
        self._pending: set[str] | None = set()
        self._unsent = False
        # While connected (_session): the socket, its loop, and what it's doing.
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._sending: asyncio.Lock | None = (
            None  # a push and its subscribing, in order
        )
        self._ids = itertools.count(1)
        self._answers: dict[int, Callable[[dict[str, Any]], None]] = {}
        # The revision the integration has, as far as we know; None: send every record.
        self._base: str | None = None
        self._older = False  # the integration has no APPLY: ring the doorbell instead
        self._following: dict[str, str | None] = {}  # the watched sensors subscribed
        self._entities: int | None = None  # that subscription's id
        self._own: dict[str, str] = {}  # the integration's entities -> translation key
        self._own_states: dict[str, dict[str, Any]] = {}  # theirs, as pushed

    def start(self) -> None:
        threading.Thread(
            target=lambda: asyncio.run(self._run()),
            name="sensor-watch-live",
            daemon=True,
        ).start()

    def stop(self) -> None:
        self._stop.set()

    def taken(self) -> None:
        """The integration fetched the records: ask the levels again in a moment."""
        self._relist = True
        self._due = time.monotonic() + TAKEN

    def changed(self, eids: set[str] | None) -> None:
        """Records saved (None: profiles or groups, so any of them): pushed now while
        connected; connecting pushes every record anyway."""
        with self._lock:
            self._pending = (
                None if eids is None or self._pending is None else self._pending | eids
            )
            self._unsent = True
        if (loop := self._loop) is not None:
            try:
                asyncio.run_coroutine_threadsafe(self._push(), loop)
            except RuntimeError:  # the session just ended: the next one sends them
                pass

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

    def _refresh(self, relist: bool = False) -> dict[str, str] | None:
        """Ask the integration for every level now; and, to `relist`, which entities are
        its own (they come with Sensor Watch there): theirs, or None when not asked or
        HA can't say."""
        response = self.status.poll()

        def take() -> None:
            if response is None:
                self._error = MISSING
                return
            rows = response.get("sensors") or []
            self._levels = {r["entity_id"]: r for r in rows}
            self._error = None

        self._publish(take)
        if not relist:
            return None
        try:
            (entries,) = self.ha.call({"type": "config/entity_registry/list"})
        except HAError as exc:
            _LOGGER.debug("live levels: the integration's entities: %s", exc)
            return None
        return _own(entries)

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
            if not self._stop.is_set():
                await asyncio.to_thread(self._stop.wait, RETRY)

    async def _session(self) -> None:
        """One connection: push every record, subscribe to the watched sensors, the
        integration's entities and its events, and follow them (pushing each change of
        the records) until the connection drops."""
        async with (
            aiohttp.ClientSession() as session,
            session.ws_connect(self.ha.ws_url, heartbeat=30, max_msg_size=0) as ws,
        ):
            await ws.receive_json()  # auth_required
            await ws.send_json({"type": "auth", "access_token": self.ha.token})
            if (await ws.receive_json()).get("type") != "auth_ok":
                raise HAError("Home Assistant refused the app's token")
            self._ids = itertools.count(1)
            registry = next(self._ids)
            await ws.send_json({"id": registry, "type": "config/entity_registry/list"})
            while (m := await ws.receive_json()).get("id") != registry:
                pass
            self._own, self._own_states = _own(m.get("result") or []), {}
            if not self._own:  # else their states, subscribed below, say
                self.status.heard({})
            # Every record, to start from the truth; then each change as it's saved.
            self._ws, self._loop = ws, asyncio.get_running_loop()
            self._sending = asyncio.Lock()
            self._answers, self._base, self._older = {}, None, False
            self._entities, self._following = None, {}
            with self._lock:
                self._pending, self._unsent = None, True
            try:
                await self._converse(ws)
            finally:
                self._ws = self._loop = self._sending = None

    async def _converse(self, ws: aiohttp.ClientWebSocketResponse) -> None:
        """The connection's life once signed in (_session)."""
        await self._push()
        # Each change of level, the moment the integration decides it.
        levels = next(self._ids)
        await ws.send_json(
            {"id": levels, "type": "subscribe_events", "event_type": EVENT}
        )
        # An entity added, or changed (a label given in HA's own settings): groups look.
        registry = next(self._ids)
        await ws.send_json(
            {
                "id": registry,
                "type": "subscribe_events",
                "event_type": "entity_registry_updated",
            }
        )
        _LOGGER.info(
            "live levels: following %d watched sensors and %d of the integration's entities",
            len(self._following),
            len(self._own),
        )
        while not self._stop.is_set():
            try:
                msg = await ws.receive(timeout=TICK)
            except TimeoutError:
                msg = None
            if msg is not None:
                if msg.type != aiohttp.WSMsgType.TEXT:
                    raise HAError("the connection closed")
                m = msg.json()
                if m.get("type") == "result":
                    if answer := self._answers.pop(m.get("id"), None):
                        answer(m)
                elif m.get("type") == "event":
                    if m.get("id") == self._entities:
                        self._heard(m["event"])
                    elif m.get("id") == levels:
                        self._moved(m["event"])
                    elif m.get("id") == registry:
                        action = (m["event"].get("data") or {}).get("action")
                        if action in ("create", "update") and self.on_registry:
                            self.on_registry()
            if self._due is not None and time.monotonic() >= self._due:
                self._due, relist, self._relist = None, self._relist, False
                own = await asyncio.to_thread(self._refresh, relist)
                if own is not None and own != self._own:
                    self._own = own
                    self._own_states = {
                        e: s for e, s in self._own_states.items() if e in own
                    }
                    if not own:
                        self.status.heard({})
                    assert self._sending is not None
                    async with self._sending:
                        await self._follow(ws, again=True)

    async def _push(self) -> None:
        """Push the records saved since the last push to the integration (every one when
        it may not have the last: on connecting, after a refusal), then follow any newly
        watched sensors. Its answer is taken in the loop (_answered)."""
        ws, sending = self._ws, self._sending
        if ws is None or sending is None:
            return
        async with sending:
            with self._lock:
                if not self._unsent:
                    return  # an earlier push took them
                eids, self._pending, self._unsent = self._pending, set(), False
            whole = eids is None or self._base is None
            out = await asyncio.to_thread(self.outgoing, None if whole else eids)
            if self._older:
                _LOGGER.info("%s", OLDER)
                self._ring()
            else:
                n = next(self._ids)
                msg = {"id": n, "type": APPLY, **out}
                if not whole:
                    msg["base"] = self._base
                self._base = out["revision"]  # as far as we know, till it answers
                self._answers[n] = lambda m: self._answered(m, whole, out)
                await ws.send_json(msg)
                _LOGGER.info(
                    "pushed to the integration: %s (revision %s)",
                    f"all {len(out['records'])} records"
                    if whole
                    else f"{len(out['records'])} changed, {len(out['removed'])} removed",
                    out["revision"],
                )
            await self._follow(ws)

    def _answered(self, m: dict[str, Any], whole: bool, out: dict[str, Any]) -> None:
        """The integration's answer to a push: the levels of the records it took (after
        every record: asked of `list` now), or why it didn't take them."""
        if m.get("success"):
            if whole:
                self._due = time.monotonic()
                return
            levels = (m.get("result") or {}).get("levels") or {}

            def take() -> None:
                for e in out["removed"]:
                    self._levels.pop(e, None)
                self._levels.update(levels)

            self._publish(take)
            return
        error = m.get("error") or {}
        self._base = None  # the next push sends every record
        if error.get("code") == "resync":
            _LOGGER.info("the integration has other records: pushing every one")
            self.changed(None)
            return
        if error.get("code") == "unknown_command":
            self._older = True  # for this connection: HA's restart brings the new one
            _LOGGER.info("%s", OLDER)
            self._ring()
        else:
            _LOGGER.warning(
                "the integration refused the records (%s: %s); it fetches them when it "
                "starts, or when /health shows a revision it hasn't",
                error.get("code"),
                error.get("message"),
            )
        if whole:
            self._due = (
                time.monotonic()
            )  # the levels as they are, or why there are none

    def _ring(self) -> None:
        if self.doorbell:
            threading.Thread(target=self.doorbell, daemon=True).start()

    async def _follow(
        self, ws: aiohttp.ClientWebSocketResponse, again: bool = False
    ) -> None:
        """Subscribe to the watched sensors and the integration's entities afresh when
        they changed (or `again`). Caller holds _sending."""
        watched = self.watched()
        if not again and self._entities is not None and watched == self._following:
            return
        if self._entities is not None:
            await ws.send_json(
                {
                    "id": next(self._ids),
                    "type": "unsubscribe_events",
                    "subscription": self._entities,
                }
            )
        self._following, self._entities = watched, next(self._ids)
        await ws.send_json(
            {
                "id": self._entities,
                "type": "subscribe_entities",
                "entity_ids": sorted(set(watched) | set(self._own)),
            }
        )
        _LOGGER.debug("live levels: following %d watched sensors", len(watched))

    def _keyed(self) -> dict[str, dict[str, Any]]:
        """The integration's entities as pushed, by translation key (for status.py)."""
        return {self._own[e]: s for e, s in self._own_states.items() if e in self._own}

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

    def _heard(self, event: dict[str, Any]) -> None:
        """Take a subscribe_entities event ("a": states added, "c": changes, each with
        its state `s` and attributes `a`, "+" added or changed and "-" removed): a watched
        sensor's state, or its watched attribute; and the integration's own entities,
        for the Home tile."""
        watched = self._following
        values: dict[str, Any] = {}
        for e, s in (event.get("a") or {}).items():
            values[e] = _value(s, watched.get(e))
        for e, d in (event.get("c") or {}).items():
            if (v := _value(d.get("+") or {}, watched.get(e))) is not None:
                values[e] = v
        values = {e: v for e, v in values.items() if v is not None}
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
        if self._took_own(event):
            self.status.heard(self._keyed())

    def _took_own(self, event: dict[str, Any]) -> bool:
        """Keep the integration's own entities' states from the event; True if any."""
        took = False
        for e, s in (event.get("a") or {}).items():
            if e in self._own:
                self._own_states[e] = {"s": s.get("s"), "a": dict(s.get("a") or {})}
                took = True
        for e, d in (event.get("c") or {}).items():
            if e in self._own:
                now = self._own_states.setdefault(e, {"s": None, "a": {}})
                plus, minus = d.get("+") or {}, d.get("-") or {}
                if "s" in plus:
                    now["s"] = plus["s"]
                now["a"] = {
                    k: v for k, v in now["a"].items() if k not in (minus.get("a") or ())
                } | (plus.get("a") or {})
                took = True
        for e in event.get("r") or ():
            if self._own_states.pop(e, None) is not None:
                took = True
        return took


def _own(entries: list[dict[str, Any]]) -> dict[str, str]:
    """The integration's own entities (common.own) in a registry list, each with its
    translation key."""
    return {
        e["entity_id"]: str(e.get("translation_key") or "")
        for e in entries
        if is_own(e)
    }


def _value(compressed: dict[str, Any], attribute: str | None) -> str | None:
    """A compressed state's value as watched: the state, or the attribute (as text)
    while the entity is available; None when it doesn't say (a change of something else)."""
    state = compressed.get("s")
    if not attribute or state in ("unavailable", "unknown"):
        return state
    value = (compressed.get("a") or {}).get(attribute)
    return None if value is None else str(value)
