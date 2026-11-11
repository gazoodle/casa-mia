"""The watching: each record's entity followed live, its level worked out (levels.py),
held off so a blip doesn't count, and each change fired as an event and told to the
entities. The records are its own store's (records/store.py), given whole at the start
and then only those changed, as each is saved (take()). Built for thousands of records:
HA's state tracker hands us only watched entities (one dict lookup per state change in
the house); attribute-only updates stop at once; the summary is worked out once per
change; the entities write at most once a TELL; and the page is sent only the rows that
moved (`moved`)."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime
from typing import Any

from homeassistant.core import (
    CALLBACK_TYPE,
    CoreState,
    Event,
    EventStateChangedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from .const import EVENT
from .levels import (
    UNAVAILABLE,
    UNAVAILABLE_HOLD,
    displayed,
    escalation,
    level_of,
    rank,
    reading,
    summary,
)
from .records.store import merged
from .stale import Stale
from .swap import Rule, same, shown

_LOGGER = logging.getLogger(__name__)
# seconds: the entities write at once, then at most once in this while changes keep
# coming, so a storm is a write a TELL, not one per change.
TELL = 0.2


class _Rows(dict[str, dict[str, Any]]):
    """The levels now, noting each entity whose row is set or taken away (`touched`), so
    what follows them (the page) is sent those alone. A row changed in place must be
    set again to be noted."""

    def __init__(self) -> None:
        super().__init__()
        self.touched: set[str] = set()

    def __setitem__(self, eid: str, row: dict[str, Any]) -> None:
        self.touched.add(eid)
        super().__setitem__(eid, row)

    def pop(self, eid: str, *default: Any) -> Any:
        self.touched.add(eid)
        return super().pop(eid, *default)


class Watcher:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.records: dict[str, dict[str, Any]] = {}
        # entity -> {level, message, value, since, name}: its level now, as counted;
        # escalated (levels.escalation), also `real`, the level its reading gives, and
        # `escalated`; `since` is always the real level's. `stale`: the level is its
        # record's stale rule's, not its reading's (stale.py).
        self.now = _Rows()
        # Which entities have stopped reporting: it has us consider one when that changes.
        self.stale = Stale(hass, self._consider)
        # The entities whose rows changed since the listeners were last told: read by a
        # listener while it is being told (_told).
        self.moved: set[str] = set()
        self._pending: dict[str, tuple[str, CALLBACK_TYPE]] = {}  # level, its timer
        self._steps: dict[str, CALLBACK_TYPE] = {}  # each escalation's next step
        # The least an escalated sensor may show while its real level gets worse (it
        # mustn't drop then): kept here, not in its row. ponytail: lost at a restart.
        self._floors: dict[str, str] = {}
        # Events held until Home Assistant has started (its automations listen then):
        # entity -> its level before the first change held, and whether it was found.
        # (Not `_held`: that is the hold-off's method, which a dict of that name hid, so
        # no hold-off that had to wait ever counted, 2026.11.2-b27 to 2026.11.4.)
        self._unsaid: dict[str, tuple[str | None, bool]] = {}
        self._waiting: CALLBACK_TYPE | None = None  # for _started
        self._unsub: CALLBACK_TYPE | None = None
        self._listeners: list[Callable[[], None]] = []
        self.swap: Rule = same  # the screenshot swap (swap.py), looked at every few s
        self._summary: dict[str, Any] | None = None  # cached until the next change
        self._telling: CALLBACK_TYPE | None = None  # the TELL after a write
        self._more = False  # changes since that write, to write when it ends
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
    def afresh(self) -> None:
        """Refresh state (its button, its service): every watch judged afresh, as at the
        start (each level as found, at once; one unavailable waits out its wait for
        unavailable). For when something looks stuck."""
        for eid in list(self._pending):
            self._cancel(eid)
        for eid, record in self.records.items():
            self.now.pop(eid, None)
            self.stale.watch(eid, record)
        for eid in self.records:
            self._consider(eid, initial=True)
        _LOGGER.info(
            "refresh state: %d watches judged afresh (%d with a level now)",
            len(self.records),
            sum(1 for e in self.records if e in self.now),
        )
        self._tell()

    @callback
    def take(self, msg: dict[str, Any]) -> None:
        """The records as the store now has them (its outgoing(): every one, or those
        changed and removed by a save), and the page's settings for Home Assistant's own
        health."""
        self._apply(merged(self.records, msg))
        system = msg["system"]
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
            self._unstep(eid)
            self.stale.drop(eid)
            self.now.pop(eid, None)
        if self._unsub:
            self._unsub()
        self._unsub = (
            async_track_state_change_event(self.hass, list(records), self._changed)
            if records
            else None
        )
        for eid in changed:
            self.stale.watch(eid, records[eid])
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
        for eid in list(self._steps):
            self._unstep(eid)
        self.stale.unload()
        if self._waiting:
            self._waiting()
            self._waiting = None
        self._unsaid.clear()
        if self._telling:
            self._telling()
            self._telling = None

    @callback
    def _changed(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        # Before the test below: a stale sensor's report may change nothing it watches.
        self.stale.seen(event.data["entity_id"])
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
        real = current and _real(current)  # an escalated level isn't the reading's
        # A stale row's level isn't its reading's either: nothing for the reading's
        # accuracy to hold on to, and its message is to go when the sensor reports.
        was_stale = bool(current and current.get("stale"))
        level, message = level_of(
            record, reading(record, state, dt_util.now()), None if was_stale else real
        )

        # Stale, and that's worse than what its (old) reading gives: counted at once,
        # from the moment it went stale. Its own time is the wait; a hold-off on top
        # would be a second one.
        stale = self.stale.of(eid)
        if stale and (level is None or rank(stale[0]) > rank(level)):
            self._cancel(eid)
            if not was_stale or real != stale[0]:
                self._commit(
                    eid,
                    stale[0],
                    stale[1],
                    state,
                    initial=initial,
                    since=stale[2],
                    stale=True,
                )
            return

        if level is None or (current is not None and real == level and not was_stale):
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
        # sensor back from unavailable (a car's reload) shouldn't stay in error. So does
        # a stale sensor's first report, whatever it reads: "no report" is no longer so.
        if there and current is not None and (was_stale or rank(level) < rank(real)):
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
            record, reading(record, state, dt_util.now()), current and _real(current)
        )
        if now == level:
            self._commit(eid, level, message, state, since=began)
        else:
            self._consider(eid)

    def _cancel(self, eid: str) -> None:
        if pending := self._pending.pop(eid, None):
            pending[1]()

    def _unstep(self, eid: str) -> None:
        if step := self._steps.pop(eid, None):
            step()
        self._floors.pop(eid, None)

    def _commit(
        self,
        eid: str,
        level: str,
        message: str | None,
        state: State | None,
        initial: bool = False,
        since: datetime | None = None,
        stale: bool = False,
    ) -> None:
        record = self.records[eid]
        name = record.get("name") or (state.name if state else eid)
        before = self.now.get(eid) or {}
        previous = before.get("level")
        precision = self._precision(eid, record)
        value = displayed(reading(record, state, dt_util.now()), precision)
        unit = _unit(record, state)
        if since is None:
            since = state.last_changed if initial and state else dt_util.utcnow()
        # Worse on its own: the ladder starts again from this level's time, but what's
        # shown mustn't drop. Better: escalation's done with (recovery resets it).
        floor = None
        if before and record.get("escalate") and rank(level) > rank(_real(before)):
            floor = max(previous, self._floors.get(eid), key=rank)
        self._unstep(eid)
        if floor is not None:
            self._floors[eid] = floor
        self.now[eid] = {
            "level": level,
            "message": message,
            "value": value,
            "since": since.isoformat(),
            "name": name,
            # So the page rounds the live values it shows as this one is.
            **({"precision": precision} if precision is not None else {}),
            **({"unit": unit} if unit else {}),
            **({"attribute": record["attribute"]} if record.get("attribute") else {}),
            **({"days_until": True} if record.get("days_until") else {}),
            **({"stale": True} if stale else {}),
        }
        self._escalate(eid)
        if initial:
            # Found at a level (Home Assistant's start, a watch edited, Refresh state):
            # said, so an automation hears of a problem that was there before the
            # restart, whose notification the restart cleared. Nominal goes unsaid.
            if self.now[eid]["level"] != "nominal":
                self._fire(eid, self.now[eid], None, initial=True)
            return
        if self.now[eid]["level"] == previous:
            self._tell()  # its reading's level moved, not what's shown
            return
        self._fire(eid, self.now[eid], previous)

    def _precision(self, eid: str, record: dict[str, Any]) -> int | None:
        """A sensor's display precision in Home Assistant (yours, else its
        integration's suggested one), for its own state; none for an attribute or the
        days until a date. Looked up at each change of level.
        ponytail: a precision changed in HA's settings shows from the sensor's next
        change of level, or Refresh state."""
        if record.get("attribute") or record.get("days_until"):
            return None
        entry = er.async_get(self.hass).async_get(eid)
        if entry is None or entry.domain != "sensor":
            return None
        options = entry.options.get("sensor") or {}
        if (precision := options.get("display_precision")) is not None:
            return precision
        return options.get("suggested_display_precision")

    @callback
    def _escalate(self, eid: str) -> bool:
        """Show the level the record's ladder gives for how long its real level has
        stood (levels.escalation), and set the timer for its next step; True if what's
        shown changed."""
        row, record = self.now.get(eid), self.records.get(eid)
        if row is None or record is None or not record.get("escalate"):
            return False
        real = _real(row)
        stood = (
            dt_util.utcnow() - datetime.fromisoformat(row["since"])
        ).total_seconds()
        shown, wait = escalation(record, real, stood)
        shown = max(shown, self._floors.get(eid, shown), key=rank)
        moved = shown != row["level"]
        if shown == real:
            row.pop("real", None)
            row.pop("escalated", None)
        else:
            row.update(level=shown, real=real, escalated=True)
        if moved:
            self.now[eid] = row  # changed in place: noted (_Rows)
        if wait is not None:
            # @callback: on HA's loop, as the hold-off's timer (firing needs it).
            self._steps[eid] = async_call_later(
                self.hass, wait, callback(lambda _now: self._stepped(eid))
            )
        return moved

    @callback
    def _stepped(self, eid: str) -> None:
        """An escalation's step came due: it moves up, and says so."""
        self._steps.pop(eid, None)
        previous = (self.now.get(eid) or {}).get("level")
        if self._escalate(eid):
            row = self.now[eid]
            _LOGGER.info(
                "%s (%s): escalated, %s for %s",
                row["name"],
                eid,
                row["real"],
                dt_util.utcnow() - datetime.fromisoformat(row["since"]),
            )
            self._fire(eid, row, previous)

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
                self._fire(
                    key, self.now[key], old and old["level"], initial=old is None
                )
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

    @callback
    def _started(self, _hass: HomeAssistant) -> None:
        """Home Assistant has started: each watch whose level changed while it started
        says where it is now. Not when that's where it was, or when it had no level
        before and is nominal now (as found at the start, nominal goes unsaid)."""
        self._waiting = None
        held, self._unsaid = self._unsaid, {}
        for eid, (previous, initial) in held.items():
            row = self.now.get(eid)  # none: no longer watched
            if row is None or row["level"] == previous:
                continue
            if previous is None and row["level"] == "nominal":
                continue
            self._fire(eid, row, previous, initial or previous is None)

    def _fire(
        self,
        eid: str,
        row: dict[str, Any],
        previous: str | None,
        initial: bool = False,
    ) -> None:
        """Log a change of level, fire the event (with its group, area and attribute,
        for a notification to say), and have the entities write. `initial`: found at
        that level, not changed to it. Held until Home Assistant has started: an event
        before then reaches no automation."""
        if self.hass.state is not CoreState.running:
            # One event per watch for the whole start, said by _started. Each change on
            # its own let out a storm: in 2026.11.2-b26 every light not yet loaded fired
            # "gone" and then "back" in the same second (a hold-off of 0).
            self._unsaid.setdefault(eid, (previous, initial))
            if self._waiting is None:
                self._waiting = async_at_started(self.hass, self._started)
            self._tell()
            return
        _LOGGER.info(
            "%s (%s): %s -> %s at %s (%s)",
            row["name"],
            eid,
            "found" if initial else previous or "nothing",
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
                    "precision": row.get("precision"),  # its value's, as HA shows it
                    "unit": row.get("unit"),
                    "message": row["message"],
                    "group": (self.records.get(eid) or {}).get("group"),
                    "area": self._area(eid),
                    "attribute": (self.records.get(eid) or {}).get("attribute"),
                    # Escalated: the level its reading gives, since when.
                    "escalated": bool(row.get("escalated")),
                    "real": row.get("real") or row["level"],
                    "since": row.get("since"),
                    # Its level is for having stopped reporting, not for its value.
                    "stale": bool(row.get("stale")),
                    # Found at it (the start, a watch edited), not changed to it.
                    "initial": initial,
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
        self.moved, self.now.touched = self.now.touched, set()
        for told in list(self._listeners):
            told()
        self._telling = async_call_later(self.hass, TELL, self._quiet)

    @callback
    def _quiet(self, _now: Any) -> None:
        self._telling = None
        if self._more:
            self._told()  # what changed meanwhile, in one write


def _real(row: dict[str, Any]) -> str:
    """The level a row's reading gives (an escalated row shows another)."""
    return row.get("real") or row["level"]


def _unit(record: dict[str, Any], state: State | None) -> str | None:
    """The unit its value is in, to say beside it ("56.58 Mbit/s"): days for a date's
    days until it; its own unit for its state; none for an attribute, whose unit Home
    Assistant doesn't state."""
    if record.get("days_until"):
        return "days"
    if record.get("attribute") or state is None:
        return None
    return state.attributes.get("unit_of_measurement") or None
