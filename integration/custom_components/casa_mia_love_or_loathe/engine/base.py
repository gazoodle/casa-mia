"""The engine's ground: what it is made from, its listeners, its trail and its storage."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import (
    HomeAssistant,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .. import trail
from ..const import (
    CONF_BACK_AT_END,
    CONF_DELAY,
    CONF_ENABLED,
    CONF_FEELING,
    CONF_HOURS,
    CONF_MEDIA,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_REPEATS,
    CONF_REPEATS_ON,
    CONF_TIMES,
    DEFAULT_REPEATS,
    GROUP,
    LOATHE,
    LOVE,
    PLAYED_TOO_OFTEN,
    STATION,
)
from ..pure import Group, History, Matcher
from .common import (
    REPORT_LAG,
    Player,
    Station,
    _act,
    ordered,
    store_key,
)

_LOGGER = logging.getLogger(__name__)


class Base:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.delay = float(entry.options.get(CONF_DELAY, 0))
        self.at_end: bool = entry.options.get(CONF_BACK_AT_END, False)
        self.enabled: bool = entry.options.get(CONF_ENABLED, True)
        self.players = {e: Player() for e in entry.options.get(CONF_PLAYERS, [])}

        subentries = ordered(entry)
        self.stations = [
            Station(s.subentry_id, s.title, dict(s.data[CONF_MEDIA]))
            for s in subentries
            if s.subentry_type == STATION
        ]
        self.groups = [
            Group(
                s.subentry_id,
                s.title,
                s.data[CONF_FEELING],
                s.data.get(CONF_PERSON, ""),
                _act(s.data[LOVE]),
                _act(s.data[LOATHE]),
                *Matcher.split(s.data.get(CONF_PATTERNS, "").splitlines()),
            )
            for s in subentries
            if s.subentry_type == GROUP
        ]

        # The strike: a song played `times` times in the last `hours` (CONF_REPEATS),
        # as a loathed group of no songs, so the actions take it as they take any group.
        # None while it is off or set to 0 times.
        repeats = {**DEFAULT_REPEATS, **entry.options.get(CONF_REPEATS, {})}
        self.times, self.hours = int(repeats[CONF_TIMES]), float(repeats[CONF_HOURS])
        nothing = Matcher.of([])
        on = entry.options.get(CONF_REPEATS_ON, True) and self.times
        self.strike = (
            Group(
                "",
                PLAYED_TOO_OFTEN,
                LOATHE,
                "",
                _act(repeats),
                _act(repeats),
                nothing,
                nothing,
            )
            if on
            else None
        )

        self.last: dict[str, Any] | None = None  # the last match, for the sensor
        self.silent: set[str] = set()  # playing, but reporting no title
        # The content id each station turned out to have on a player, which can differ
        # from the one it was started with: how a station already playing is recognised.
        self.learned: dict[str, str] = {}
        # The volume each speaker was last given here, [from, to, when], kept in
        # storage so that a reload between a putting back and the next change has it.
        self.given: dict[str, list[float]] = {}
        # What has been played, for the strike.
        self.history = History()
        self._store: Store[dict[str, Any]] = Store(hass, 1, store_key(entry))
        self._listeners: list[Callable[[], None]] = []

    # --- the sensor's side -------------------------------------------------------

    def listen(self, heard: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(heard)
        return lambda: self._listeners.remove(heard)

    def _tell(self) -> None:
        for heard in list(self._listeners):
            heard()

    def _note(self, kind: str, text: str, entity: str = "") -> None:
        """Something happened: into the log, and the trail the owner reads (trail.py)."""
        level = logging.WARNING if kind == trail.PROBLEM else logging.INFO
        _LOGGER.log(level, "%s%s", f"{entity}: " if entity else "", text)
        trail.note(self.hass, self.entry, kind, text, entity)

    @property
    def away(self) -> dict[str, str]:
        """Each player on another station now, and when it goes back."""
        return {e: p.away["until"] for e, p in self.players.items() if p.away}

    @property
    def doing(self) -> dict[str, dict[str, Any]]:
        """What was last done to each player and why, and whether it is still in force
        (`now`): a volume or a mute to be put back, another station to come back from
        (`until`, and `next` once the return waits on something), or an action being
        carried out this moment. For whoever shows the player, and for anything that
        must tell these changes from a person's (Jukebox's party lock)."""
        doing = {}
        for entity, player in self.players.items():
            if player.last is None:
                continue
            away = player.away
            said = {**player.last, "now": bool(player.acting or player.undo or away)}
            if away:
                said["until"] = away["until"]
                if away.get("due"):
                    said["next"] = "Switching back when it next plays"
                elif away.get("waiting"):
                    said["next"] = "Switching back when this song ends"
            doing[entity] = said
        return doing

    async def _save(self) -> None:
        players = {
            e: {"undo": p.undo, "away": p.away, "last": p.last}
            for e, p in self.players.items()
            if p.undo or p.away
        }
        now = dt_util.utcnow().timestamp()
        plays = self.history.dump(now)
        given = {s: g for s, g in self.given.items() if now - g[2] < REPORT_LAG}
        await self._store.async_save(
            {
                "players": players,
                "learned": self.learned,
                "plays": plays,
                "given": given,
            }
        )

    # --- the actions: each answers what it did -----------------------------------

    async def _call(self, service: str, entity: str | list[str], **data: Any) -> None:
        await self.hass.services.async_call(
            "media_player", service, {ATTR_ENTITY_ID: entity, **data}, blocking=True
        )

    def _attr(self, entity: str, name: str) -> Any:
        state = self.hass.states.get(entity)
        return state.attributes.get(name) if state else None

    def _problem(self, entity: str, what: str) -> None:
        """A failure after the match was reported: shown on the sensor as its result."""
        self._note(trail.PROBLEM, what[0].upper() + what[1:], entity)
        if self.last and self.last[ATTR_ENTITY_ID] == entity:
            self.last = {**self.last, "result": f"failed: {what}"}
        self._tell()
