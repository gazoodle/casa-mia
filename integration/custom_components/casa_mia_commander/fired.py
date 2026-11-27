"""When each commander camera's event entity last fired, kept across restarts, for the
Camera Commander card's chip that says a camera's latest detection.

Why: Home Assistant gives an event entity its time back after a restart from the state it
saved as it stopped (event/__init__.py: async_internal_added_to_hass). UniFi Protect's
entities fed by its events websocket (ring, smart detection, motion, package, sound) go
unavailable as Home Assistant stops, as that websocket closes first, so the state saved is
"unavailable" and they start again as unknown: their kind and event id come back, their
time doesn't. The chip then named an older detection, from an entity that kept its time
(found 2026-11-27).

So each fire is recorded here (its time, event id and type) in Home Assistant's storage,
and the Main camera select gives the card the time of each entity whose state has none
(its `fired` attribute), where the entity's restored event is the one recorded. An entity
with no record is looked up once in the recorder, which keeps its time and type (not its
event id), so the chip is right from the first restart.

Fixed in Home Assistant 2026.12.0 (core PR #192994, issue #192255: Protect now stops its
state callbacks before its websocket, so the time is what is saved). Once that is the
oldest Home Assistant Casa Mia supports, this can go (BACKLOG.md)."""

from __future__ import annotations

import logging
from collections.abc import Callable, Iterable, Mapping
from datetime import timedelta
from typing import Any

from homeassistant.components.recorder import get_instance, history
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, State, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
FIRED: HassKey[Fired] = HassKey(f"{DOMAIN}_fired")
# Seconds a write waits, so a burst of detections is one write (Home Assistant writes
# it when stopping).
SAVE_AFTER = 10
# How far the recorder is asked back, newest first: each restart adds two states with
# no time (unavailable, unknown), so an entity that last fired more than about 50
# restarts ago, or before the recorder's own keep (10 days by default), has no record
# until it fires again.
LOOK_BACK = 100
LOOK_DAYS = 10
# Seconds before the selects say new times, so the burst of entities Home Assistant adds
# as it starts is one write of each.
SAY_AFTER = 1


def fired_at(state: State | None) -> bool:
    """Whether an event entity's state is the time it last fired (not unknown or
    unavailable)."""
    return state is not None and dt_util.parse_datetime(state.state) is not None


def same_event(record: Mapping[str, Any], attributes: Mapping[str, Any]) -> bool:
    """Whether an entity's restored event is the one recorded: by its event id where the
    record has one, else by its type (a record from the recorder has no id)."""
    if record.get("event_id"):
        return record["event_id"] == attributes.get("event_id")
    return record.get("event_type") == attributes.get("event_type")


class Fired:
    def __init__(self, hass: HomeAssistant, found: Callable[[], None]) -> None:
        self.hass = hass
        self._found = found  # the selects: new times to give the card
        self._store: Store[dict[str, dict[str, Any]]] = Store(hass, 1, FIRED)
        # event entity -> {at: its state (ISO), event_id, event_type}. An entity no
        # longer on a commander keeps its record: a few bytes, and back if it returns.
        self.records: dict[str, dict[str, Any]] = {}
        self._watched: frozenset[str] = frozenset()
        self._asked: set[str] = set()  # looked up in the recorder this run
        self._unsub: CALLBACK_TYPE | None = None
        self._due: CALLBACK_TYPE | None = None  # the selects told soon

    async def load(self) -> Fired:
        try:
            data = await self._store.async_load() or {}
            self.records = {
                entity: record
                for entity, record in data.items()
                if isinstance(record, dict) and isinstance(record.get("at"), str)
            }
        except (HomeAssistantError, ValueError, AttributeError) as exc:
            _LOGGER.warning(
                "the times event entities last fired could not be read (%s): each is "
                "known again from its next detection",
                exc,
            )
        return self

    @callback
    def watch(self, entities: Iterable[str]) -> None:
        """Record these entities' fires, in place of the last ones'."""
        wanted = frozenset(entities)
        if wanted == self._watched:
            return

        if self._unsub:
            self._unsub()
        self._watched = wanted
        self._unsub = (
            async_track_state_change_event(self.hass, sorted(wanted), self._changed)
            if wanted
            else None
        )

        # Those whose time survived the restart are recorded as they are; those with
        # neither a time nor a record are looked up, once.
        for entity in wanted:
            self._record(self.hass.states.get(entity))
        missing = sorted(e for e in wanted - self._asked if e not in self.records)
        if missing:
            self._asked.update(missing)
            self.hass.async_create_background_task(
                self._from_recorder(missing), f"{DOMAIN} fired from the recorder"
            )

    @callback
    def lost(self, entities: Iterable[str]) -> dict[str, str]:
        """entity -> the time it last fired, for these entities whose state has lost it
        and whose restored event is the one recorded."""
        out: dict[str, str] = {}
        for entity in entities:
            state = self.hass.states.get(entity)
            record = self.records.get(entity)
            if state and record and not fired_at(state):
                if same_event(record, state.attributes):
                    out[entity] = record["at"]
        return out

    @callback
    def _changed(self, event: Event) -> None:
        # A fire is recorded. An entity there with no time (added after this as Home
        # Assistant starts) is said to the card: once for each burst of them.
        state = event.data.get("new_state")
        if not self._record(state) and state and self.lost([state.entity_id]):
            self._soon()

    @callback
    def _soon(self) -> None:
        if self._due is None:
            self._due = async_call_later(self.hass, SAY_AFTER, self._say)

    @callback
    def _say(self, _now: Any = None) -> None:
        self._due = None
        self._found()

    @callback
    def _record(self, state: State | None) -> bool:
        """Record a state that is a fire; whether it was new."""
        if state is None or not fired_at(state):
            return False
        a = state.attributes
        record = {
            "at": state.state,
            "event_id": a.get("event_id"),
            "event_type": a.get("event_type"),
        }
        if self.records.get(state.entity_id) == record:
            return False
        self.records[state.entity_id] = record
        self._store.async_delay_save(lambda: self.records, SAVE_AFTER)
        return True

    async def _from_recorder(self, entities: list[str]) -> None:
        if "recorder" not in self.hass.config.components:
            _LOGGER.info(
                "no recorder: %s are known from their next detection",
                ", ".join(entities),
            )
            return
        start = dt_util.utcnow() - timedelta(days=LOOK_DAYS)
        found: list[str] = []
        for entity in entities:
            try:
                states = await get_instance(self.hass).async_add_executor_job(
                    history.state_changes_during_period,
                    self.hass,
                    start,
                    None,
                    entity,
                    False,  # its attributes: the event's type
                    True,  # newest first
                    LOOK_BACK,
                    False,
                )
            except (
                Exception
            ) as exc:  # whatever it is: the recorder's database can be away
                _LOGGER.warning(
                    "the recorder could not say when %s last fired (%s): each is known "
                    "again from its next detection",
                    ", ".join(entities[entities.index(entity) :]),
                    exc,
                )
                break
            last = next((s for s in states.get(entity, []) if fired_at(s)), None)
            # A fire while it looked is newer than the recorder's.
            if last and entity not in self.records and self._record(last):
                found.append(f"{entity} at {last.state}")
        if found:
            _LOGGER.info(
                "event entities' last fires, from the recorder: %s", "; ".join(found)
            )
            self._soon()

    @callback
    def unload(self) -> None:
        for cancel in (self._unsub, self._due):
            if cancel:
                cancel()
        self._unsub = self._due = None
