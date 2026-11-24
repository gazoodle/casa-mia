"""The engine itself: starting and stopping, and following the players' tracks."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, STATE_PLAYING
from homeassistant.core import (
    Event,
    EventStateChangedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .. import trail
from ..const import (
    DOMAIN,
    EVENT,
    LOATHE,
    MUTE,
    SKIP,
    SWITCH,
    VOLUME,
)
from ..pure import Group, History, leads, pick
from .common import (
    SKIPS,
    Player,
    _said,
    _track,
    skippable,
)
from .stations import Stations

_LOGGER = logging.getLogger(__name__)


class Engine(Stations):
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(hass, entry)
        self._actions: dict[
            str, Callable[[str, Player, Group, State], Awaitable[str]]
        ] = {
            VOLUME: self._volume,
            MUTE: self._mute,
            SWITCH: self._switch,
            SKIP: self._skip,
        }

    # --- starting and stopping ---------------------------------------------------

    async def start(self) -> None:
        """Take up what storage says was in force (a restart came between an action and
        its undoing), then follow the players, starting with what each is playing now:
        a song already on when its group's list is saved is acted on at that save."""
        kept = await self._store.async_load() or {}
        self.learned = kept.get("learned", {})
        self.given = kept.get("given", {})
        self.history = History(kept.get("plays", []))
        for entity, was in kept.get("players", {}).items():
            player = self.players.get(entity)
            if player is None:
                continue
            player.undo, player.away = was.get("undo"), was.get("away")
            player.last = was.get("last")
            if player.away:
                self._arm(entity, player)
        self._tell()  # the sensor was made before this: it shows who is away

        if not self.enabled:
            # Returns stay armed above, so a player that is away still comes back.
            self._note(trail.START, "Started, but switched off: nothing is watched")
            return
        self.entry.async_on_unload(
            async_track_state_change_event(self.hass, list(self.players), self._changed)
        )
        self._note(
            trail.START,
            f"Started watching {len(self.players)} players against "
            f"{len(self.groups)} groups, with {len(self.stations)} stations to switch to",
        )
        self.afresh()

    async def stop(self) -> None:
        """Unloading: put back every volume and mute now, since nothing will be here at
        the next track. A switch of station stays in storage and is taken up again."""
        for entity, player in self.players.items():
            if player.back:
                player.back()
            async with player.lock:
                await self._undo(entity, player)
        await self._save()
        self._note(trail.STOP, "Stopped")

    # --- following the players ---------------------------------------------------

    def judge(self, title: str, artist: str) -> tuple[Group | None, int]:
        """What has a song now, the first of (owner, 2026-11-15): a loathed group, whose
        own action it gets (a Christmas group's switch, not the strike's mute); the
        strike, when it has been played too often, loved or not ("repetition is to
        prevent boredom"); a loved group. The second answer is how many times it was
        played, for the strike (else 0)."""
        if not title:
            return None, 0
        group = pick(self.groups, title, artist)
        if group and group.feeling == LOATHE:
            return group, 0

        if self.strike:
            now = dt_util.utcnow().timestamp()
            played = self.history.count(title, artist, now, self.hours)
            if played >= self.times:
                return self.strike, played
        return group, 0

    @callback
    def afresh(self) -> None:
        """Judge what each player is playing now, as if it had just come on: at every
        start, so at each save of a group, change of its feeling and song rated. What
        the track had brought was undone at the unload, so nothing is done twice."""
        for entity, player in self.players.items():
            player.track = None
            state = self.hass.states.get(entity)
            if state is not None:
                self._look(state)

    @callback
    def _changed(self, event: Event[EventStateChangedData]) -> None:
        state = event.data["new_state"]
        if state is not None:
            self._look(state)

    def _look(self, state: State) -> None:
        entity, player = state.entity_id, self.players[state.entity_id]

        playing = state.state == STATE_PLAYING
        started, player.playing = playing != player.playing, playing
        if not playing:
            self.silent.discard(entity)
            if started:
                self._tell()
            return
        self._settle(entity, player, state)

        track = _track(state)
        if track == player.track:
            if started:
                self._tell()
                # Playing again, the song it stopped on: no new track for _heard to
                # make a due return at, so it is made here.
                if player.away and player.away.get("due"):
                    self.entry.async_create_background_task(
                        self.hass,
                        self._return(entity, player),
                        f"{DOMAIN} return {entity}",
                    )
            return
        player.track = track
        _LOGGER.debug("%s: now %r by %r", entity, *track)
        if (not track[0]) != (entity in self.silent):
            self.silent ^= {entity}
            if not track[0]:
                self._note(
                    trail.SKIP,
                    "Playing, but reports no title: nothing to match",
                    entity,
                )
        self._tell()  # the page shows what each player is playing (admin.py)

        # A background task of the entry's: cancelled when it unloads.
        self.entry.async_create_background_task(
            self.hass, self._heard(entity, player, state, track), f"{DOMAIN} {entity}"
        )

    async def _heard(
        self, entity: str, player: Player, state: State, track: tuple[str, str]
    ) -> None:
        """A new track on a player: undo what the last one brought, then act on this."""
        title, artist = track
        async with player.lock:
            await self._undo(entity, player)

            # The song that was on when the time was up has ended: back now. This track,
            # on the other station, is gone at once, so it isn't heard or judged. The
            # same song again is a restart hearing it afresh, not its end. A return that
            # is due (_back) is made at any track. When the player wasn't switched,
            # this track plays on, so it is judged like any other.
            away = player.away
            ended = away and away.get("waiting") and list(track) != away.get("song")
            if away and (ended or away.get("due")):
                switched = await self._back(entity, player)
                self._tell()
                if switched:
                    return

            if title:
                self.history.heard(title, artist, dt_util.utcnow().timestamp())
            await self._save()

            group, repeats = self.judge(title, artist)
            if group is None:
                player.skips = 0
                return
            by = f" by {artist}" if artist else ""
            why = (
                f"played {repeats} times in the last {self.hours:g} hours"
                if repeats
                else f"is in {group.name} ({group.feeling})"
            )
            self._note(trail.MATCH, f"{title}{by} {why}", entity)

            # Every reason nothing is then done is said: a match with no action after it
            # otherwise looks like a fault.
            members = state.attributes.get("group_members")
            if not leads(entity, members):
                assert isinstance(members, list)
                self._note(
                    trail.SKIP,
                    f"Nothing done: {members[0]} leads its speaker group and acts for it",
                    entity,
                )
                return

            # The report runs ahead of the sound on some players (the entry's Delay).
            if self.delay:
                await asyncio.sleep(self.delay)
                if player.track != track:
                    self._note(
                        trail.SKIP,
                        f"Nothing done: the track changed within the {self.delay:g} s delay",
                        entity,
                    )
                    return

            action = self._skip_or(entity, player, group, repeats, state)
            act = self._actions.get(action)
            if act:
                # Said before anything is done to the player, so that whoever tells
                # these changes from a person's knows of it before the speaker reports
                # the change (Base.doing).
                player.acting = True
                player.last = {
                    "did": "",
                    "why": f"{title}{by} {why}",
                    "at": dt_util.utcnow().isoformat(),
                }
                self._tell()
            try:
                result = (
                    await act(entity, player, group, state) if act else "event only"
                )
            except HomeAssistantError as exc:
                result = f"failed: {exc}"
                self._note(trail.PROBLEM, f"Could not {action}: {exc}", entity)
            else:
                self._note(trail.CHANGE if act else trail.SKIP, _said(result), entity)
            finally:
                player.acting = False
            if player.last and act:
                player.last["did"] = _said(result)
            player.skips = player.skips + 1 if action == SKIP else 0
            await self._save()

        self.last = {
            ATTR_ENTITY_ID: entity,
            "title": title,
            "artist": artist,
            # No group for the strike: `repeats` then says how many times it was played
            # in the entry's hours (else 0), and the feeling is loathe.
            "group": "" if repeats else group.name,
            "feeling": group.feeling,
            "action": action,
            "result": result,
            "repeats": repeats,
            "at": dt_util.utcnow().isoformat(),
        }
        self.hass.bus.async_fire(EVENT, self.last)
        self._tell()

    # --- a loathed song in a queue -----------------------------------------------

    def _skip_or(
        self, entity: str, player: Player, group: Group, repeats: int, state: State
    ) -> str:
        """The action for this song: its group's own, or a skip. A loathed song that is
        one of a queue is skipped, with nothing to set up, where its group would mute it
        or switch station: muting it leaves a silence the length of the song, and there
        is no station to come back to. Not for a song played too often (each skip
        counts as a play, so a short queue would soon be skipped whole), and not when
        the group only changes the volume or fires the event."""
        action = group.act.action
        wanted = group.feeling == LOATHE and not repeats and action in (MUTE, SWITCH)
        if not wanted or not skippable(state):
            return action
        if player.skips >= SKIPS:
            self._note(
                trail.SKIP,
                f"{SKIPS} songs skipped one after another: this one isn't skipped",
                entity,
            )
            return action
        return SKIP

    async def _skip(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        """On to the next song. Where the player refuses (the last song of a queue has
        no next), the group's own action instead."""
        try:
            await self._call("media_next_track", entity)
        except HomeAssistantError as exc:
            own = await self._actions[group.act.action](entity, player, group, state)
            return f"could not skip ({exc}): {own}"
        return "skipped: it was one of a queue"
