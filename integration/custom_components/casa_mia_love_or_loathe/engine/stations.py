"""A switch to another station, and the return from it."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from homeassistant.const import STATE_PLAYING
from homeassistant.core import (
    State,
    callback,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_track_point_in_time,
)
from homeassistant.util import dt as dt_util

from .. import trail
from ..const import DOMAIN, SOURCE
from ..pure import Group
from .common import (
    ID,
    LONGEST_SONG,
    TYPE,
    Player,
    Station,
    favourite,
)
from .volume import Volumes

_LOGGER = logging.getLogger(__name__)


class Stations(Volumes):
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
            self._note(
                trail.RETURN,
                "Changed by someone while on the other station: not switching it back",
                entity,
            )
            self._home(player)
        else:
            return
        self.entry.async_create_background_task(self.hass, self._save(), DOMAIN)
        self._tell()

    async def _switch(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        """To the next station not yet tried. One round of the list at most: when every
        station is playing something loathed, mute this track instead."""
        away, now = player.away, state.attributes.get(ID)
        tried = list(away["tried"]) if away else []
        source = favourite(state)
        here = next((s for s in self.stations if self._is(s, now, source)), None)
        if here and here.id not in tried:
            tried.append(here.id)
        station = next((s for s in self.stations if s.id not in tried), None)
        if station is None:
            return "no station left to try: " + await self._mute(
                entity, player, group, state
            )

        await self._play(entity, station.media)
        if away is None:
            # Where to go back to: the station it was on, else the one of its own
            # sources it was on, else the address it says it was playing. A player that
            # says nothing can't be switched back.
            origin = here.media if here else None
            if origin is None and source:
                origin = {ID: source, TYPE: SOURCE}
            if origin is None and now:
                origin = {ID: now, TYPE: state.attributes.get(TYPE) or "music"}
            until = dt_util.utcnow() + timedelta(minutes=group.act.minutes)
            away = player.away = {
                "until": until.isoformat(),
                "origin": origin,
                "home": now,
            }
            self._arm(entity, player)
        away.update(tried=[*tried, station.id], was=now, ours=None)
        # In words for the trail, the sensor and the event: the time as the house reads it.
        back = dt_util.as_local(
            dt_util.parse_datetime(away["until"]) or dt_util.utcnow()
        )
        if self.at_end:
            return f"switched to {station.name} until the song on at {back:%H:%M} ends"
        return f"switched to {station.name} until {back:%H:%M}"

    # --- coming back from another station ----------------------------------------

    def _arm(self, entity: str, player: Player) -> None:
        """The return, at its time; at once when that passed while nothing ran. With the
        entry's back at the end of a song, the time only starts the wait for the next
        track (_heard goes back then), and this goes back after LONGEST_SONG anyway."""
        away = player.away
        assert away is not None
        until = dt_util.parse_datetime(away["until"])
        assert until is not None
        if away.get("waiting"):
            until += LONGEST_SONG

        @callback
        def due(_now: datetime) -> None:
            player.back = None
            if self.at_end and not away.get("waiting"):
                away.update(waiting=True, song=list(player.track or ()))
                self._arm(entity, player)
                self._note(
                    trail.RETURN,
                    "Time is up: switching back when this song ends",
                    entity,
                )
                self.entry.async_create_background_task(self.hass, self._save(), DOMAIN)
                self._tell()
                return

            if away.get("waiting"):
                self._note(
                    trail.RETURN,
                    f"No new song within {LONGEST_SONG.seconds // 60} minutes: "
                    "switching back now",
                    entity,
                )
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
            await self._back(entity, player)
        self._tell()

    async def _back(self, entity: str, player: Player) -> bool:
        """Back to where it was, holding the player's lock; whether it was switched now.

        The return is forgotten (_home) only when it has been made or never can be.
        While the player is not playing (paused, or not yet there after a restart) or
        refuses the call, it is kept as due, and _look and _heard make it when the
        player next plays. Forgetting it first lost the return at every restart that
        the time passed in (2026.11.9)."""
        away = player.away
        if away is None:
            return False
        state = self.hass.states.get(entity)
        origin = away["origin"]

        # Never possible, or already done by someone: nothing left to wait for.
        if origin is None:
            self._home(player)
            await self._save()
            self._problem(
                entity,
                "can't switch back: the player never said what it was playing",
            )
            return False
        home = away.get("home")
        if state is not None and home and state.attributes.get(ID) == home:
            self._home(player)
            await self._save()
            self._note(trail.RETURN, f"Already back on {self._named(origin)}", entity)
            return False

        # Not now: kept, and said once.
        again = away.get("due")
        if state is None or state.state != STATE_PLAYING:
            if not again:
                away["due"] = True
                await self._save()
                self._note(
                    trail.RETURN,
                    "Not playing: switching back when it next plays",
                    entity,
                )
            return False
        try:
            await self._play(entity, origin)
        except HomeAssistantError as exc:
            away["due"] = True
            await self._save()
            self._problem(
                entity, f"could not switch back: {exc}. Trying again at the next track"
            )
            return False

        self._home(player)
        await self._save()
        self._note(trail.RETURN, f"Switched back to {self._named(origin)}", entity)
        return True

    async def _play(self, entity: str, media: dict[str, str]) -> None:
        """Put a station on: one of the player's own sources by its name, which a Sonos
        then plays as the favourite it is, with the station's name and picture; any
        other by its address, which arrives bare (the logo was missing after every
        switch, 2026.11.12)."""
        if media[TYPE] == SOURCE:
            await self._call("select_source", entity, source=media[ID])
        else:
            await self._call("play_media", entity, **media)

    def _is(self, station: Station, now: str | None, source: str | None) -> bool:
        """Whether a player on the address `now`, and on `source` of its own sources,
        is on this station."""
        if station.media[TYPE] == SOURCE and station.media[ID] == source:
            return True
        return bool(now) and now in (station.media[ID], self.learned.get(station.id))

    def _named(self, media: dict[str, str]) -> str:
        """A station's name for what a player is to play, else what it is."""
        return next(
            (
                s.name
                for s in self.stations
                if media[ID] in (s.media[ID], self.learned.get(s.id))
            ),
            media[ID],
        )
