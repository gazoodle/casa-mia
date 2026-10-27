"""The watching: each record's entity followed live, its level worked out (levels.py),
held off so a blip doesn't count, and each change fired as an event and told to the
entities. Built for thousands of records: the app pushes only those changed (push.py,
over its websocket), and they are fetched whole only at the start, or when the revision
in its /health differs from ours (a push missed); HA's state tracker hands us only watched entities (one
dict lookup per state change in the house); attribute-only updates stop at once; the
summary is worked out once per change; and the entities write at most once a TELL."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime
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

from ..coordinator import CasaMiaCoordinator
from .const import EVENT, MODULE
from .levels import UNAVAILABLE, UNAVAILABLE_HOLD, level_of, rank, reading, summary
from .push import merged
from .swap import Rule, same, shown

_LOGGER = logging.getLogger(__name__)
# seconds: the entities write at once, then at most once in this while changes keep
# coming, so a storm is a write a TELL, not one per change.
TELL = 0.2
RECORDS = (
    "/sensor-watch/records"  # the app's records, fetched when we're not at its revision
)


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
        """Each report from the app: fetch the records if we're not at their revision
        (the start, or a push missed: the app pushes each change as it's saved)."""
        revision = module(self.coordinator).get("revision")
        if revision is None or revision == self._revision or self._fetching:
            return
        self._fetching = True
        self.hass.async_create_task(self._fetch(revision))

    async def afresh(self) -> None:
        """Refresh state (its button, its service): the records fetched again, and every
        watch judged afresh, as at the start (each level as found, at once; one
        unavailable waits out its wait for unavailable). For when something looks stuck."""
        if not self._fetching:
            self._fetching = True
            await self._fetch(module(self.coordinator).get("revision") or "")
        for eid in list(self._pending):
            self._cancel(eid)
        for eid in self.records:
            self.now.pop(eid, None)
        for eid in self.records:
            self._consider(eid, initial=True)
        _LOGGER.info(
            "refresh state: %d watches judged afresh (%d with a level now)",
            len(self.records),
            sum(1 for e in self.records if e in self.now),
        )
        self._tell()

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
        self._take(
            data.get("revision", revision),
            {r["entity_id"]: r for r in data.get("records") or []},
            data.get("system") or {},
        )

    @callback
    def push(self, msg: dict[str, Any]) -> dict[str, dict[str, Any]] | None:
        """Records pushed by the app (its websocket command), applied at once. For a
        change: the levels of the records it carried, as judged now (applying fires no
        event, so the app learns them here); every record: nothing (the app asks `list`).
        None when it doesn't follow on from ours: the app then sends them all."""
        records = merged(self.records, self._revision, msg)
        if records is None:
            _LOGGER.info(
                "a push from revision %s, but we have %s: asked the app for every record",
                msg.get("base"),
                self._revision,
            )
            return None
        self._take(msg["revision"], records, msg["system"])
        if "base" not in msg:
            return {}
        sent = (r["entity_id"] for r in msg["records"])
        return {
            e: shown(self.swap, {"entity_id": e, **self.now[e]})
            for e in sent
            if e in self.now
        }

    @callback
    def _take(
        self, revision: str, records: dict[str, dict[str, Any]], system: dict[str, Any]
    ) -> None:
        """The app's records and settings at `revision`, fetched or pushed."""
        self._revision = revision
        self._apply(records)
        if system != self.system_settings:
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
        current = self.now.get(eid)
        level, message = level_of(
            record,
            reading(record, state, dt_util.now()),
            current and current["level"],
        )
        if level is None or (current is not None and current["level"] == level):
            self._cancel(eid)  # back where it was (or no opinion): nothing to wait for
            return
        there = state is not None and state.state not in UNAVAILABLE
        # As found, at once: at the start, or its first real reading after it started
        # unavailable (a car asleep at HA's start): the hold-off is for changes from a
        # level it has, not for having one at all.
        if there and (initial or current is None):
            self._commit(eid, level, message, state, initial=True)
            return
        began = self._began(record, state)
        # Better news counts at once: the hold-off guards against false alarms, and a
        # sensor back from unavailable (a car's reload) shouldn't stay in error.
        if there and current is not None and rank(level) < rank(current["level"]):
            self._cancel(eid)
            self._commit(eid, level, message, state, since=began)
            return
        if (pending := self._pending.get(eid)) and pending[0] == level:
            return  # already waiting to see whether it lasts
        self._cancel(eid)
        # Unavailable waits longer than a value: a restart, a reload or a car asleep is
        # usual, not trouble. An availability watch's whole point is unavailable: its
        # hold-off is the wait.
        gone = not there and record.get("kind") != "available"
        hold = (
            record.get("unavailable_hold", UNAVAILABLE_HOLD)
            if gone
            else record.get("hold_off", 60)
        )
        # Timed from when the entity changed (its last changed, as Home Assistant's own
        # dialogs show it), so a level's "since" is the moment it began.
        wait = hold - (dt_util.utcnow() - began).total_seconds()
        if wait <= 0:
            self._commit(eid, level, message, state, since=began)
            return
        _LOGGER.debug("%s: %s for %.0f s more before it counts", eid, level, wait)
        # @callback: on HA's loop. A bare lambda runs in a worker thread, where firing
        # the event fails and nothing is told (the level changed, unseen).
        timer = async_call_later(
            self.hass, wait, callback(lambda _now: self._held(eid, level, began))
        )
        self._pending[eid] = (level, timer)

    @staticmethod
    def _began(record: dict[str, Any], state: State | None) -> datetime:
        """When the entity's reading last changed: its state's last changed (last
        updated for an attribute); now for a date watch, whose days move without it."""
        if state is None or record.get("days_until"):
            return dt_util.utcnow()
        return state.last_updated if record.get("attribute") else state.last_changed

    @callback
    def _held(self, eid: str, level: str, began: datetime) -> None:
        self._pending.pop(eid, None)
        record = self.records.get(eid)
        if record is None:
            return
        state = self.hass.states.get(eid)
        current = self.now.get(eid)
        now, message = level_of(
            record,
            reading(record, state, dt_util.now()),
            current and current["level"],
        )
        if now == level:
            self._commit(eid, level, message, state, since=began)
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
        since: datetime | None = None,
    ) -> None:
        record = self.records[eid]
        name = record.get("name") or (state.name if state else eid)
        previous = (self.now.get(eid) or {}).get("level")
        value = reading(record, state, dt_util.now())
        if since is None:
            since = state.last_changed if initial and state else dt_util.utcnow()
        self.now[eid] = {
            "level": level,
            "message": message,
            "value": value,
            "since": since.isoformat(),
            "name": name,
            **({"attribute": record["attribute"]} if record.get("attribute") else {}),
            **({"days_until": True} if record.get("days_until") else {}),
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
    def tick(self, _now: object = None) -> None:
        """Time passing: a date watch's days until come down though its state doesn't
        change (a reminder comes due), so they're judged again now and then."""
        for eid, record in self.records.items():
            if record.get("days_until"):
                self._consider(eid)

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
