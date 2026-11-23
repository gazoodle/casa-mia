"""The watching and the acting: each chosen media player's track, as Home Assistant
reports it changing (pushed, never polled), against the groups; then the group's action,
and its undoing.

What an action changes is always put back by something that must happen: a volume change
or a mute at the player's next track, a switch of station at a time kept in Home
Assistant's storage, so a restart in between loses neither. Nothing is put back over a
person's own change: a volume someone has moved since is left alone, and a player that
is no longer playing what was put on is not switched back.

A return is forgotten only once the player has been switched back (or someone has chosen
something else). One that can't be made at its time, because the player is not playing,
has not turned up yet after a restart or refuses the call, is kept as due and made when
the player next plays.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry, ConfigSubentry
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

from . import trail
from .const import (
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_BACK_AT_END,
    CONF_DELAY,
    CONF_ENABLED,
    CONF_FEELING,
    CONF_HOURS,
    CONF_MEDIA,
    CONF_MINUTES,
    CONF_ORDER,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_REPEATS,
    CONF_REPEATS_ON,
    CONF_TIMES,
    DEFAULT_REPEATS,
    DOMAIN,
    EVENT,
    GROUP,
    LOATHE,
    LOVE,
    MUTE,
    PLAYED_TOO_OFTEN,
    STATION,
    SWITCH,
    VOLUME,
)
from .pure import Act, Group, History, Matcher, leads, pick, scaled

_LOGGER = logging.getLogger(__name__)
ID = "media_content_id"
TYPE = "media_content_type"
# A player rounds the volume it is given; within this it is still the one set here.
SAME_VOLUME = 0.011
# A speaker reports a new volume a moment after it is given one. For this long after a
# change made here, a report that still shows the volume from before it is taken as late
# (Engine._level).
# ponytail: a fixed window. Follow each speaker's own state changes if it proves wrong.
REPORT_LAG = 10.0
# Back at the end of a song (CONF_BACK_AT_END): the longest the return waits for the next
# track, for a station whose title never changes.
LONGEST_SONG = timedelta(minutes=10)


@dataclass(frozen=True, slots=True)
class Station:
    id: str
    name: str
    media: dict[str, str]  # media_content_id and media_content_type, for play_media


@dataclass(slots=True)
class Player:
    """One watched player. `undo` and `away` are kept in storage (Engine._save)."""

    track: tuple[str, str] | None = None
    playing: bool = False  # as last told to the listeners
    # What to put back at the next track: ["volume", was, set] or ["mute"].
    undo: list[Any] | None = None
    # Switched to another station: {"until": ISO time, "origin": media to go back to or
    # None, "tried": station ids, "was": the content id before the switch, "ours": the
    # one the player reported after it, "waiting": true once the time is up and the
    # return waits for "song", [title, artist], to end (CONF_BACK_AT_END), "home": the
    # content id before the first switch, "due": true once the return was tried and
    # could not be made, so it is made when the player next plays (_back)}.
    away: dict[str, Any] | None = None
    back: CALLBACK_TYPE | None = None  # the timer for the return
    # One track's work at a time: the undo of the last before the action of the next.
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class Engine:
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

    def _note(self, kind: str, text: str, entity: str = "") -> None:
        """Something happened: into the log, and the trail the owner reads (trail.py)."""
        level = logging.WARNING if kind == trail.PROBLEM else logging.INFO
        _LOGGER.log(level, "%s%s", f"{entity}: " if entity else "", text)
        trail.note(self.hass, self.entry, kind, text, entity)

    @property
    def away(self) -> dict[str, str]:
        """Each player on another station now, and when it goes back."""
        return {e: p.away["until"] for e, p in self.players.items() if p.away}

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

    async def _save(self) -> None:
        players = {
            e: {"undo": p.undo, "away": p.away}
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

            action = group.act.action
            act = self._actions.get(action)
            try:
                result = (
                    await act(entity, player, group, state) if act else "event only"
                )
            except HomeAssistantError as exc:
                result = f"failed: {exc}"
                self._note(trail.PROBLEM, f"Could not {action}: {exc}", entity)
            else:
                self._note(trail.CHANGE if act else trail.SKIP, _said(result), entity)
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

    # --- the actions: each answers what it did -----------------------------------

    async def _call(self, service: str, entity: str | list[str], **data: Any) -> None:
        await self.hass.services.async_call(
            "media_player", service, {ATTR_ENTITY_ID: entity, **data}, blocking=True
        )

    async def _volume(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        """Each speaker of the group by the same share, from its own volume."""
        if state.attributes.get("volume_level") is None:
            raise HomeAssistantError("the player reports no volume")
        undo: dict[str, list[float]] = {}
        for speaker in _speakers(state):
            was = self._level(speaker)
            if was is None:
                continue  # a member that says nothing of its volume is left alone
            to = scaled(was, group.act.amount)
            await self._give(speaker, was, to)
            undo[speaker] = [was, to]
        player.undo = ["volume", undo]
        was, to = undo[entity]
        return f"volume {was:.0%} to {to:.0%}{_on(undo)} until the next track"

    async def _mute(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        speakers = _speakers(state)
        await self._call("volume_mute", speakers, is_volume_muted=True)
        player.undo = ["mute", speakers]
        return f"muted{_on(speakers)} until the next track"

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

    async def _undo(self, entity: str, player: Player) -> None:
        """Each speaker the action changed, put back unless someone has since."""
        undo, player.undo = player.undo, None
        if undo is None or self.hass.states.get(entity) is None:
            return

        # As 2026.11.8 and before kept it: the one player, ["mute"] or ["volume", was, to].
        if undo == ["mute"]:
            undo = ["mute", [entity]]
        elif undo[0] == "volume" and len(undo) == 3:
            undo = ["volume", {entity: undo[1:]}]

        try:
            if undo[0] == "mute":
                muted = [s for s in undo[1] if self._attr(s, "is_volume_muted")]
                if muted:
                    await self._call("volume_mute", muted, is_volume_muted=False)
                    self._note(trail.BACK, f"Unmuted{_on(muted)}", entity)
                else:
                    self._note(trail.BACK, "Already unmuted by someone", entity)
                return

            back, moved = {}, []
            for speaker, (was, to) in undo[1].items():
                now = self._level(speaker)
                if now is not None and abs(now - to) < SAME_VOLUME:
                    await self._give(speaker, to, was)
                    back[speaker] = was
                else:
                    moved.append(speaker)
            if back:
                was = back.get(entity, next(iter(back.values())))
                self._note(
                    trail.BACK, f"Volume put back to {was:.0%}{_on(back)}", entity
                )
            if moved:
                self._note(
                    trail.BACK,
                    f"Volume moved by someone since: left alone{_on(moved)}",
                    entity,
                )
        except HomeAssistantError as exc:
            self._problem(entity, f"could not put back {undo[0]}: {exc}")

    async def _give(self, speaker: str, was: float, to: float) -> None:
        await self._call("volume_set", speaker, volume_level=to)
        self.given[speaker] = [was, to, dt_util.utcnow().timestamp()]

    def _level(self, speaker: str) -> float | None:
        """A speaker's volume: what it reports, unless that is still the volume from
        before a change made here moments ago, when it is what it was given.

        Taking the report as it stood made one loathed song straight after another
        halve the volume each time (2026.11.12): the last one's volume was put back,
        the speaker had not yet said so, and the next change started from the lowered
        volume it still reported. Only the last of those changes was ever undone."""
        level = self._attr(speaker, "volume_level")
        was, to, at = self.given.get(speaker, (0.0, 0.0, 0.0))
        late = dt_util.utcnow().timestamp() - at < REPORT_LAG
        if level is not None and late and abs(level - was) < SAME_VOLUME:
            return to
        return level

    def _attr(self, entity: str, name: str) -> Any:
        state = self.hass.states.get(entity)
        return state.attributes.get(name) if state else None

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
            await self._call("play_media", entity, **origin)
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

    def _problem(self, entity: str, what: str) -> None:
        """A failure after the match was reported: shown on the sensor as its result."""
        self._note(trail.PROBLEM, what[0].upper() + what[1:], entity)
        if self.last and self.last[ATTR_ENTITY_ID] == entity:
            self.last = {**self.last, "result": f"failed: {what}"}
        self._tell()


def _said(result: str) -> str:
    """An action's own account of itself, as a line of the trail."""
    if result == "event only":
        return "Nothing done to the player: the action is to fire the event only"
    return result[0].upper() + result[1:]


def _act(data: dict[str, Any]) -> Act:
    return Act(data[CONF_ACTION], data[CONF_AMOUNT], data[CONF_MINUTES])


def ordered(entry: ConfigEntry) -> list[ConfigSubentry]:
    """The entry's groups and stations in the order the page gave them (CONF_ORDER);
    any it doesn't name come after, as made."""
    order = entry.options.get(CONF_ORDER, [])
    place = {id: n for n, id in enumerate(order)}
    return sorted(
        entry.subentries.values(),
        key=lambda s: place.get(s.subentry_id, len(place)),
    )


def store_key(entry: ConfigEntry) -> str:
    """Each entry's own file in Home Assistant's storage."""
    return f"{DOMAIN}.{entry.entry_id}"


def _speakers(state: State) -> list[str]:
    """The player and every speaker grouped with it, which hear what it plays. Sonos
    mutes and sets the volume of each speaker by itself, so a mute of the leader alone
    left the rest of its group playing (2026-11-15)."""
    members = state.attributes.get("group_members") or []
    return [state.entity_id, *(m for m in members if m != state.entity_id)]


def _on(speakers: Any) -> str:
    """ " on 2 speakers", for an action on more than the player."""
    return f" on {len(speakers)} speakers" if len(speakers) > 1 else ""


def _track(state: State) -> tuple[str, str]:
    return (
        str(state.attributes.get("media_title") or ""),
        str(state.attributes.get("media_artist") or ""),
    )
