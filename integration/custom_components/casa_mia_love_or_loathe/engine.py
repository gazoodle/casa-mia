"""The watching and the acting: each chosen media player's track, as Home Assistant
reports it changing (pushed, never polled), against the groups; then the group's action,
and its undoing.

What an action changes is always put back by something that must happen: a volume change
or a mute at the player's next track, a switch of station at a time kept in Home
Assistant's storage, so a restart in between loses neither. Nothing is put back over a
person's own change: a volume someone has moved since is left alone, and a player that
is no longer playing what was put on is not switched back.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, STATE_PLAYING
from homeassistant.core import (
    CALLBACK_TYPE,
    Event,
    EventStateChangedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_track_point_in_time,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_DELAY,
    CONF_KIND,
    CONF_LIBRARY,
    CONF_MEDIA,
    CONF_MINUTES,
    CONF_PATTERNS,
    CONF_PLAYERS,
    DOMAIN,
    EVENT,
    GROUP,
    MUTE,
    STATION,
    SWITCH,
    VOLUME,
)
from .pure import Group, Matcher, leads, pick, scaled

_LOGGER = logging.getLogger(__name__)
ID = "media_content_id"
TYPE = "media_content_type"
# A player rounds the volume it is given; within this it is still the one set here.
SAME_VOLUME = 0.011


@dataclass(frozen=True, slots=True)
class Station:
    id: str
    name: str
    media: dict[str, str]  # media_content_id and media_content_type, for play_media


@dataclass(slots=True)
class Player:
    """One watched player. `undo` and `away` are kept in storage (Engine._save)."""

    track: tuple[str, str] | None = None
    # What to put back at the next track: ["volume", was, set] or ["mute"].
    undo: list[Any] | None = None
    # Switched to another station: {"until": ISO time, "origin": media to go back to or
    # None, "tried": station ids, "was": the content id before the switch, "ours": the
    # one the player reported after it}.
    away: dict[str, Any] | None = None
    back: CALLBACK_TYPE | None = None  # the timer for the return
    # One track's work at a time: the undo of the last before the action of the next.
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class Engine:
    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        libraries: dict[str, dict[str, Any]],
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.delay = float(entry.options.get(CONF_DELAY, 0))
        self.players = {e: Player() for e in entry.options.get(CONF_PLAYERS, [])}

        subentries = list(entry.subentries.values())
        self.stations = [
            Station(s.subentry_id, s.title, dict(s.data[CONF_MEDIA]))
            for s in subentries
            if s.subentry_type == STATION
        ]
        self.groups = [
            Group(
                id=s.subentry_id,
                name=s.title,
                kind=s.data[CONF_KIND],
                action=s.data[CONF_ACTION],
                amount=s.data[CONF_AMOUNT],
                minutes=s.data[CONF_MINUTES],
                own=Matcher.of(s.data.get(CONF_PATTERNS, "").splitlines()),
                library=Matcher.of(
                    libraries.get(s.data.get(CONF_LIBRARY, ""), {}).get("patterns", [])
                ),
            )
            for s in subentries
            if s.subentry_type == GROUP
        ]
        # Each group's switch (switch.py) says whether it counts; on until it says not.
        self.off: set[str] = set()

        self.last: dict[str, Any] | None = None  # the last match, for the sensor
        self.silent: set[str] = set()  # playing, but reporting no title
        # The content id each station turned out to have on a player, which can differ
        # from the one it was started with: how a station already playing is recognised.
        self.learned: dict[str, str] = {}
        self._store: Store[dict[str, Any]] = Store(hass, 1, DOMAIN)
        self._listeners: list[Callable[[], None]] = []
        self._actions: dict[
            str, Callable[[str, Player, Group, State], Awaitable[str]]
        ] = {VOLUME: self._volume, MUTE: self._mute, SWITCH: self._switch}

    # --- the sensor's side -------------------------------------------------------

    def listen(self, heard: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(heard)
        return lambda: self._listeners.remove(heard)

    def _tell(self) -> None:
        for heard in list(self._listeners):
            heard()

    @property
    def away(self) -> dict[str, str]:
        """Each player on another station now, and when it goes back."""
        return {e: p.away["until"] for e, p in self.players.items() if p.away}

    # --- starting and stopping ---------------------------------------------------

    async def start(self) -> None:
        """Take up what storage says was in force (a restart came between an action and
        its undoing), then follow the players. The track playing now is taken as heard:
        a reload must not act on it a second time."""
        kept = await self._store.async_load() or {}
        self.learned = kept.get("learned", {})
        for entity, was in kept.get("players", {}).items():
            player = self.players.get(entity)
            if player is None:
                continue
            player.undo, player.away = was.get("undo"), was.get("away")
            if player.away:
                self._arm(entity, player)

        for entity, player in self.players.items():
            state = self.hass.states.get(entity)
            if state is not None and state.state == STATE_PLAYING:
                player.track = _track(state)

        self.entry.async_on_unload(
            async_track_state_change_event(self.hass, list(self.players), self._changed)
        )
        _LOGGER.info(
            "Watching %d players against %d groups, with %d stations to switch to",
            len(self.players),
            len(self.groups),
            len(self.stations),
        )

    async def stop(self) -> None:
        """Unloading: put back every volume and mute now, since nothing will be here at
        the next track. A switch of station stays in storage and is taken up again."""
        for entity, player in self.players.items():
            if player.back:
                player.back()
            async with player.lock:
                await self._undo(entity, player)
        await self._save()

    async def _save(self) -> None:
        players = {
            e: {"undo": p.undo, "away": p.away}
            for e, p in self.players.items()
            if p.undo or p.away
        }
        await self._store.async_save({"players": players, "learned": self.learned})

    # --- following the players ---------------------------------------------------

    @callback
    def _changed(self, event: Event[EventStateChangedData]) -> None:
        state = event.data["new_state"]
        if state is None:
            return
        entity, player = state.entity_id, self.players[state.entity_id]

        if state.state != STATE_PLAYING:
            if entity in self.silent:
                self.silent.discard(entity)
                self._tell()
            return
        self._settle(entity, player, state)

        track = _track(state)
        if track == player.track:
            return
        player.track = track
        _LOGGER.debug("%s: now %r by %r", entity, *track)
        if (not track[0]) != (entity in self.silent):
            self.silent ^= {entity}
            self._tell()
            if not track[0]:
                _LOGGER.info(
                    "%s is playing but reports no title: nothing to match", entity
                )

        # A background task of the entry's: cancelled when it unloads.
        self.entry.async_create_background_task(
            self.hass, self._heard(entity, player, state, track), f"{DOMAIN} {entity}"
        )

    def _settle(self, entity: str, player: Player, state: State) -> None:
        """While away: learn the content id the station put on turned out to have, and
        after that take a different one as a person choosing something else, which
        calls the return off.

        ponytail: a player whose content id changes with every track of one station
        looks like a person's choice, and it then stays on the new station. Compare the
        station's name instead if such a player turns up."""
        away, now = player.away, state.attributes.get(ID)
        if away is None or not now or now == away["was"]:
            return

        if away["ours"] is None:
            away["ours"] = now
            self.learned[away["tried"][-1]] = now
        elif now != away["ours"]:
            _LOGGER.info(
                "%s was changed by someone while away: not switching it back", entity
            )
            self._home(player)
        else:
            return
        self.entry.async_create_background_task(self.hass, self._save(), DOMAIN)
        self._tell()

    async def _heard(
        self, entity: str, player: Player, state: State, track: tuple[str, str]
    ) -> None:
        """A new track on a player: undo what the last one brought, then act on this."""
        title, artist = track
        async with player.lock:
            await self._undo(entity, player)
            await self._save()

            groups = [g for g in self.groups if g.id not in self.off]
            group = pick(groups, title, artist) if title else None
            if group is None or not leads(
                entity, state.attributes.get("group_members")
            ):
                return

            # The report runs ahead of the sound on some players (the entry's Delay).
            if self.delay:
                await asyncio.sleep(self.delay)
                if player.track != track:
                    return

            act = self._actions.get(group.action)
            try:
                result = (
                    await act(entity, player, group, state) if act else "event only"
                )
            except HomeAssistantError as exc:
                result = f"failed: {exc}"
                _LOGGER.warning(
                    "%s: could not %s for %r by %r (%s): %s",
                    entity,
                    group.action,
                    title,
                    artist,
                    group.name,
                    exc,
                )
            else:
                _LOGGER.info(
                    "%s: %r by %r is in %s (%s): %s",
                    entity,
                    title,
                    artist,
                    group.name,
                    group.kind,
                    result,
                )
            await self._save()

        self.last = {
            ATTR_ENTITY_ID: entity,
            "title": title,
            "artist": artist,
            "group": group.name,
            "kind": group.kind,
            "action": group.action,
            "result": result,
            "at": dt_util.utcnow().isoformat(),
        }
        self.hass.bus.async_fire(EVENT, self.last)
        self._tell()

    # --- the actions: each answers what it did -----------------------------------

    async def _call(self, service: str, entity: str, **data: Any) -> None:
        await self.hass.services.async_call(
            "media_player", service, {ATTR_ENTITY_ID: entity, **data}, blocking=True
        )

    async def _volume(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        was = state.attributes.get("volume_level")
        if was is None:
            raise HomeAssistantError("the player reports no volume")
        to = scaled(was, group.amount)
        await self._call("volume_set", entity, volume_level=to)
        player.undo = ["volume", was, to]
        return f"volume {was:.0%} to {to:.0%} until the next track"

    async def _mute(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        await self._call("volume_mute", entity, is_volume_muted=True)
        player.undo = ["mute"]
        return "muted until the next track"

    async def _switch(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        """To the next station not yet tried. One round of the list at most: when every
        station is playing something loathed, mute this track instead."""
        away, now = player.away, state.attributes.get(ID)
        tried = list(away["tried"]) if away else []
        here = next(
            (s for s in self.stations if now in (s.media[ID], self.learned.get(s.id))),
            None,
        )
        if here and here.id not in tried:
            tried.append(here.id)
        station = next((s for s in self.stations if s.id not in tried), None)
        if station is None:
            return "no station left to try: " + await self._mute(
                entity, player, group, state
            )

        await self._call("play_media", entity, **station.media)
        if away is None:
            # Where to go back to: the station it was on, or whatever the player says it
            # was playing. A player that says nothing can't be switched back.
            origin = here.media if here else None
            if origin is None and now:
                origin = {ID: now, TYPE: state.attributes.get(TYPE) or "music"}
            until = dt_util.utcnow() + timedelta(minutes=group.minutes)
            away = player.away = {"until": until.isoformat(), "origin": origin}
            self._arm(entity, player)
        away.update(tried=[*tried, station.id], was=now, ours=None)
        return f"switched to {station.name} until {away['until']}"

    async def _undo(self, entity: str, player: Player) -> None:
        undo, player.undo = player.undo, None
        state = self.hass.states.get(entity)
        if undo is None or state is None:
            return

        try:
            if undo[0] == "mute":
                if state.attributes.get("is_volume_muted"):
                    await self._call("volume_mute", entity, is_volume_muted=False)
                return
            _, was, to = undo
            now = state.attributes.get("volume_level")
            if now is not None and abs(now - to) < SAME_VOLUME:
                await self._call("volume_set", entity, volume_level=was)
            else:
                _LOGGER.info("%s: volume moved by someone since: left alone", entity)
        except HomeAssistantError as exc:
            _LOGGER.warning("%s: could not put back %s: %s", entity, undo[0], exc)
            self._problem(entity, f"could not put back {undo[0]}: {exc}")

    # --- coming back from another station ----------------------------------------

    def _arm(self, entity: str, player: Player) -> None:
        """The return, at its time; at once when that passed while nothing ran."""
        assert player.away is not None
        until = dt_util.parse_datetime(player.away["until"])
        assert until is not None

        @callback
        def due(_now: datetime) -> None:
            player.back = None
            self.entry.async_create_background_task(
                self.hass, self._return(entity, player), f"{DOMAIN} return {entity}"
            )

        player.back = async_track_point_in_time(self.hass, due, until)

    def _home(self, player: Player) -> None:
        """No longer away, whether back or staying where it is."""
        if player.back:
            player.back()
        player.back = player.away = None

    async def _return(self, entity: str, player: Player) -> None:
        async with player.lock:
            away = player.away
            if away is None:
                return
            self._home(player)
            await self._save()

            state = self.hass.states.get(entity)
            origin = away["origin"]
            if state is None or state.state != STATE_PLAYING:
                _LOGGER.info("%s is no longer playing: not switching it back", entity)
            elif origin is None:
                _LOGGER.warning(
                    "%s never said what it was playing: can't switch it back", entity
                )
                self._problem(
                    entity,
                    "can't switch back: the player never said what it was playing",
                )
            else:
                try:
                    await self._call("play_media", entity, **origin)
                except HomeAssistantError as exc:
                    _LOGGER.warning("%s: could not switch back: %s", entity, exc)
                    self._problem(entity, f"could not switch back: {exc}")
                else:
                    _LOGGER.info("%s: switched back to %s", entity, origin[ID])
        self._tell()

    def _problem(self, entity: str, what: str) -> None:
        """A failure after the match was reported: shown on the sensor as its result."""
        if self.last and self.last[ATTR_ENTITY_ID] == entity:
            self.last = {**self.last, "result": f"failed: {what}"}
        self._tell()


def _track(state: State) -> tuple[str, str]:
    return (
        str(state.attributes.get("media_title") or ""),
        str(state.attributes.get("media_artist") or ""),
    )
