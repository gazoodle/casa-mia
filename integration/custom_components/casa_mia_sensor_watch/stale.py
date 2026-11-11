"""Stale: a watched entity that is there but has stopped reporting (or stopped changing),
which its state alone never shows. A record's `stale` ({after, by, level, message}) gives
its entity a deadline: its last report (`by` "report") or its last change ("change"),
plus `after` seconds. When the deadline comes the entity is read again: reported since,
and the deadline moves on; not, and it is stale from that moment until it reports again.

One timer per entity, set from a timestamp, so nothing runs while a sensor reports as it
should (a chatty one writes many times a second, and each write would be a callback).
Reports are listened for only on the entities that are stale now, to see them recover.

A restart of Home Assistant stamps every restored entity as just reported, so a sensor
that died before it looks fresh: it is caught one `after` later, and its message says
that the start is all that's known."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import (
    CALLBACK_TYPE,
    CoreState,
    Event,
    EventStateReportedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.helpers.event import async_call_later, async_track_state_report_event
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from .levels import UNAVAILABLE, stale_message


def last(record: dict[str, Any], state: State) -> datetime:
    """When the entity last did what its record's `stale` waits for."""
    if record["stale"]["by"] == "report":
        return state.last_reported
    return state.last_updated if record.get("attribute") else state.last_changed


class Stale:
    def __init__(self, hass: HomeAssistant, flipped: Callable[[str], None]) -> None:
        self.hass = hass
        # Told an entity's id when it goes stale, and when it is fresh again.
        self._flipped = flipped
        self._records: dict[str, dict[str, Any]] = {}  # those with a `stale`
        self._timers: dict[str, CALLBACK_TYPE] = {}  # each one's deadline
        # The stale ones: since when, and whether its last report is from before Home
        # Assistant finished starting (a restart's stamp, as likely as a real report).
        self._stale: dict[str, tuple[datetime, bool]] = {}
        self._unsub: CALLBACK_TYPE | None = None  # the stale ones' reports
        # When Home Assistant finished starting, if this was loaded while it did.
        self._started: datetime | None = None
        self._unstart: CALLBACK_TYPE | None = None
        if hass.state is not CoreState.running:
            self._unstart = async_at_started(hass, self._at_start)

    @callback
    def _at_start(self, _hass: HomeAssistant) -> None:
        self._unstart = None
        self._started = dt_util.utcnow()

    def of(self, eid: str) -> tuple[str, str, datetime] | None:
        """A stale entity's level, its message and since when; None while it's fresh."""
        if (found := self._stale.get(eid)) is None:
            return None
        since, restamped = found
        stale = self._records[eid]["stale"]
        return stale["level"], stale_message(stale, restamped), since

    @callback
    def watch(self, eid: str, record: dict[str, Any]) -> None:
        """Follow this entity by its record as it is now, judged at once."""
        self.drop(eid)
        if record.get("stale"):
            self._records[eid] = record
            # Untold: the watcher considers it next anyway, as found.
            self._judge(eid, tell=False)

    @callback
    def drop(self, eid: str) -> None:
        self._records.pop(eid, None)
        if timer := self._timers.pop(eid, None):
            timer()
        if self._stale.pop(eid, None) is not None:
            self._listen()

    @callback
    def seen(self, eid: str) -> None:
        """Its state changed (the watcher hears each change of a watched entity anyway):
        a stale one may be fresh again, and one with no deadline (it was unavailable, or
        not yet in Home Assistant) gets one."""
        if eid in self._records and (eid in self._stale or eid not in self._timers):
            self._judge(eid)

    @callback
    def unload(self) -> None:
        for eid in list(self._records):
            self.drop(eid)
        if self._unstart:
            self._unstart()
            self._unstart = None

    @callback
    def _judge(self, eid: str, tell: bool = True) -> None:
        """Read the entity now: set its deadline, or count it stale from its deadline.
        One that is unavailable is neither: that has a rule of its own."""
        if timer := self._timers.pop(eid, None):
            timer()
        record = self._records[eid]
        state = self.hass.states.get(eid)

        found: tuple[datetime, bool] | None = None
        if state is not None and state.state not in UNAVAILABLE:
            at = last(record, state)
            due = at + timedelta(seconds=record["stale"]["after"])
            wait = (due - dt_util.utcnow()).total_seconds()
            if wait > 0:
                # @callback: on HA's loop, where the watcher fires its event.
                self._timers[eid] = async_call_later(
                    self.hass, wait, callback(lambda _now: self._due(eid))
                )
            else:
                found = (due, self._started is not None and at <= self._started)

        was = self._stale.get(eid)
        if found is None:
            self._stale.pop(eid, None)
        elif was is None:
            self._stale[eid] = found
        if (was is None) != (found is None):
            self._listen()
            if tell:
                self._flipped(eid)

    @callback
    def _due(self, eid: str) -> None:
        self._timers.pop(eid, None)
        if eid in self._records:
            self._judge(eid)

    @callback
    def _reported(self, event: Event[EventStateReportedData]) -> None:
        if event.data["entity_id"] in self._records:
            self._judge(event.data["entity_id"])

    def _listen(self) -> None:
        """Listen for the reports of those stale by report (a change is heard by seen()).
        ponytail: subscribed afresh at each change of who is stale; one subscription per
        entity if many go stale at once often enough to matter."""
        if self._unsub:
            self._unsub()
            self._unsub = None
        waiting = [
            eid for eid in self._stale if self._records[eid]["stale"]["by"] == "report"
        ]
        if waiting:
            self._unsub = async_track_state_report_event(
                self.hass, waiting, self._reported
            )
