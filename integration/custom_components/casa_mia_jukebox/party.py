"""The party lock. While a party is on for a group of rooms, its queue, its rooms and
their volumes can be changed only from Jukebox. A change made any other way (the Sonos
app on a guest's phone, another app's stream, a hand on a speaker's buttons) is put back
and written down.

Sonos has no permissions: anyone on the house's network can change anything. So nothing
is prevented here. Jukebox keeps its own copy of how things should be, and whenever the
speakers report a change it compares them with that copy and puts back what differs.
This is a deliberate exception to "the speakers hold the truth", for the length of a
party (owner, 2026-11-23).

- Jukebox's own changes all come through `feed.do`, which holds the party's lock while
  a speaker is asked and then renews the copy (`own`). That is how its changes are told
  from a guest's.
- The speakers are compared only when they report something: Home Assistant's state
  events for the rooms, and the leading speaker's own report of its queue (a move isn't
  told to Home Assistant). Nothing is polled.
- A speaker's report of a change follows the change by a moment, so after Jukebox's own
  change, or a putting back, the comparison waits (`SETTLE`) for the reports to arrive.
- Skipping, pausing and seeking are left alone: they can't be told from the music
  moving on by itself. A broken song that Sonos skips changes nothing in the queue, so
  it is never taken for someone's change.

A party ends when Home Assistant restarts.
"""

from __future__ import annotations

import asyncio
import logging
from collections import Counter
from collections.abc import Awaitable, Callable
from typing import Any

import aiohttp
from homeassistant.const import ATTR_ENTITY_ID, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from . import speaker, upnp
from .announce import address, room_name
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
PLAYER = "media_player"
# Fired for each change put back, for automations: {"rooms": [...], "what": "..."}.
EVENT = f"{DOMAIN}_put_back"
# Seconds the comparison waits after Jukebox's own change or a putting back, for the
# speakers' reports of it to arrive. Sooner, a report of the old volume would be taken
# for someone turning it back.
SETTLE = 3.0
# Seconds the comparison waits after a speaker's report for the reports to stop coming.
# Replacing a queue from another app is several changes one after another; comparing
# half-way would have Jukebox and that app both changing the queue at once.
BURST = 1.5
# How many changes put back a party remembers for the page.
KEPT = 20
# Seconds before the watch on a speaker's queue is tried again, doubling to the limit.
RETRY = (5, 60)
# What Jukebox does that changes the queue or what is played from, after which the copy
# of both is read from the speaker again.
CHANGES_MUSIC = frozenset(
    {
        "play_media",
        "queue_play",
        "queue_add",
        "queue_move",
        "queue_remove",
        "queue_clear",
        "queue_back",
    }
)


class Party:
    """One group's party: the copy of how its rooms, volumes and music should be, and
    the putting back of anything else."""

    def __init__(
        self,
        hass: HomeAssistant,
        rooms: list[str],
        volumes: dict[str, int],
        changed: Callable[[Party, dict[str, Any] | None], None],
        excused: Callable[[str], bool],
    ) -> None:
        self.hass = hass
        # The leader (the group's coordinator) first: it holds the queue.
        self.rooms = list(rooms)
        self.volumes = dict(volumes)
        self.uri = self.about = ""
        self.queue: list[tuple[str, str]] = []
        self.song = 0
        self.playing = False  # whether the music was playing when last compared
        # How many seconds into its song the music was when last compared, and when
        # that was (the loop's clock); and when the first report came of the changes
        # now waited on, which is when someone else's music cut in.
        self.at: tuple[int, float] = (0, 0.0)
        self._since: float | None = None
        # The speaker's own copy of the queue: the id of a Sonos playlist of Jukebox's
        # (`_keep`), or none when the queue is empty or it couldn't be saved.
        self.copy = ""
        self.since = dt_util.utcnow().isoformat()
        self.undone: list[dict[str, Any]] = []
        # When the watch on the queue was lost; none while it is held, or not yet made.
        self.unwatched: str | None = dt_util.utcnow().isoformat()
        self.lock = asyncio.Lock()
        # Whether the screens (wall tablets) may change the music: a host's choice,
        # made anew for each party (may.py).
        self.open = False
        self._changed = changed
        # Whether a room's volume and what it plays from are in someone else's hands
        # for now (Love it or Loathe it's, love.py), and so not a guest's change.
        self._excused = excused
        self._quiet_until = 0.0
        self._due: asyncio.TimerHandle | None = None
        self._unlisten: Callable[[], None] | None = None
        self._watch: asyncio.Task[None] | None = None

    @property
    def leader(self) -> str:
        return self.rooms[0]

    def view(self) -> dict[str, Any]:
        """The party as the page shows it."""
        return {
            "since": self.since,
            "undone": self.undone,
            "unwatched": self.unwatched,
            "open": self.open,
        }

    # ---- Starting, stopping and following the rooms

    async def start(self) -> None:
        await self._read_music()
        self._follow()

    def stop(self) -> None:
        if self._due:
            self._due.cancel()
        self._unfollow()
        if self.copy:
            self.hass.async_create_background_task(
                self._forget(self.copy), f"{DOMAIN} party copy {self.leader}"
            )

    async def _forget(self, copy: str) -> None:
        try:
            await upnp.delete_playlist(*self._speaker(), copy)
        except (HomeAssistantError, aiohttp.ClientError, OSError, TimeoutError) as err:
            _LOGGER.warning(
                "Party in %s ended, but its copy of the queue is still among the "
                "Sonos playlists (it couldn't be deleted: %s)",
                self._names(),
                err or type(err).__name__,
            )

    def _follow(self) -> None:
        """Hear of every change in the party's rooms, and watch the leader's queue."""
        self._unfollow()
        self._unlisten = async_track_state_change_event(
            self.hass, self.rooms, self._heard
        )
        self._watch = self.hass.async_create_background_task(
            self._watching(), f"{DOMAIN} party watch {self.leader}"
        )

    def _unfollow(self) -> None:
        if self._unlisten:
            self._unlisten()
        if self._watch:
            self._watch.cancel()
        self._unlisten = self._watch = None

    async def _watching(self) -> None:
        """Keep a watch on the leader's queue for as long as the party lasts. When it is
        lost the page says since when, and it is tried again."""
        wait = RETRY[0]
        while True:
            try:
                await speaker.watch_queue(*self._speaker(), self._watched, self.due)
            except (aiohttp.ClientError, OSError, TimeoutError, ValueError) as err:
                reason: Exception = err
            except HomeAssistantError as err:
                reason = err
            if self.unwatched is None:
                self.unwatched = dt_util.utcnow().isoformat()
                wait = RETRY[0]
                _LOGGER.warning(
                    "Party in %s: the watch on the queue was lost (%s); a song moved in "
                    "another app won't be noticed until it is back",
                    self._names(),
                    reason or type(reason).__name__,
                )
                self._changed(self, None)
            await asyncio.sleep(wait)
            wait = min(RETRY[1], wait * 2)

    @callback
    def _watched(self) -> None:
        self.unwatched = None
        self._changed(self, None)
        # Whatever happened while nobody was watching.
        self.due()

    def _speaker(self) -> tuple[aiohttp.ClientSession, str]:
        host = address(self.hass, self.leader)
        if host is None:
            raise HomeAssistantError("Home Assistant has no address for this speaker")
        return async_get_clientsession(self.hass), host

    def _names(self) -> str:
        return " + ".join(room_name(self.hass, room) for room in self.rooms)

    # ---- Jukebox's own changes

    async def own(self, action: str, doing: Any) -> None:
        """Renew the copy after something Jukebox did itself. Called with the lock
        held, straight after the speakers were asked."""
        self.volumes.update(doing.volumes)
        if doing.joined and doing.joined not in self.rooms:
            self.rooms.append(doing.joined)
            if (level := self._volume(doing.joined)) is not None:
                self.volumes[doing.joined] = level
        if doing.left in self.rooms:
            self.rooms.remove(doing.left)
            self.volumes.pop(doing.left, None)
        if doing.joined or doing.left:
            self._follow()

        if action in CHANGES_MUSIC:
            try:
                await self._read_music()
            except HomeAssistantError as err:
                # The change was made; only the copy is stale, which the page must say.
                self._record(
                    f"The party's copy of the queue couldn't be renewed: {err}", True
                )
        self._settle()

    async def _read_music(self) -> None:
        session, host = self._speaker()
        self.uri, self.about = await upnp.source(session, host)
        self.queue = await upnp.songs(session, host)
        await self._note_place(session, host)
        await self._keep(session, host)

    async def _note_place(self, session: aiohttp.ClientSession, host: str) -> None:
        """Remember where the music is, to return to it."""
        self.song, seconds = await upnp.place(session, host)
        self.at = (seconds, self.hass.loop.time())
        self.playing = await upnp.playing(session, host)

    def _where(self) -> int:
        """How far into its song the music had got when it was cut into: where it was
        last seen, and the time it played on after that. From the start of the song
        when that is only a few seconds."""
        seconds, when = self.at
        if self.playing:
            seconds += int((self._since or self.hass.loop.time()) - when)
        return seconds if seconds >= 5 else 0

    async def _back_to_the_song(
        self, session: aiohttp.ClientSession, host: str, found: str
    ) -> None:
        seconds = self._where()
        _LOGGER.info(
            "Party in %s: back to song %s, %s s into it (%s)",
            self._names(),
            self.song,
            seconds,
            found,
        )
        await upnp.play_from(session, host, self.uri, self.about, self.song, seconds)

    async def _keep(self, session: aiohttp.ClientSession, host: str) -> None:
        """Have the speaker keep the queue as a playlist of Jukebox's own, to put the
        queue back from (upnp.keep)."""
        name = f"{upnp.COPY} ({room_name(self.hass, self.leader)})"
        try:
            self.copy = await upnp.keep(session, host, name) if self.queue else ""
        except HomeAssistantError as err:
            self.copy = ""
            self._record(
                "The speaker couldn't keep a copy of the queue, so a song someone "
                f"takes out will be put back with fewer of its details: {err}",
                True,
            )

    def _settle(self) -> None:
        self._quiet_until = self.hass.loop.time() + SETTLE

    # ---- Comparing, and putting back

    @callback
    def _heard(self, _event: Any) -> None:
        self.due()

    @callback
    def due(self) -> None:
        """Compare the speakers with the copy soon: once for a burst of reports, when
        they have stopped coming (BURST), and not before the reports of Jukebox's own
        last change have had time to arrive."""
        if self._due:
            self._due.cancel()
        if self._since is None:
            self._since = self.hass.loop.time()
        wait = max(BURST, self._quiet_until - self.hass.loop.time())
        self._due = self.hass.loop.call_later(wait, self._compare)

    @callback
    def _compare(self) -> None:
        self._due = None
        self.hass.async_create_background_task(
            self.check(), f"{DOMAIN} party check {self.leader}"
        )

    async def check(self) -> None:
        """Put back whatever differs from the copy, and write each thing down."""
        async with self.lock:
            before = len(self.undone)
            try:
                if await self._rooms_right():
                    # Love it or Loathe it turning a song down, or away on another
                    # station: left alone until it has put that back, when its sensor
                    # says so and the speakers are compared again (Parties.recheck).
                    excused = self._excused(self.leader)
                    if not excused:
                        await self._volumes_right()
                    await self._music_right(excused)
            except HomeAssistantError as err:
                self._record(
                    f"The speakers couldn't be compared with the party: {err}", True
                )
            if len(self.undone) != before:
                self._settle()
            self._since = None

    async def _put_back(self, what: str, how: Awaitable[Any]) -> None:
        try:
            await how
        except HomeAssistantError as err:
            self._record(f"Someone {what}, and it couldn't be put back: {err}", True)
        else:
            self._record(f"Someone {what}", False)

    def _record(self, what: str, failed: bool) -> None:
        entry = {"at": dt_util.utcnow().isoformat(), "what": what, "failed": failed}
        self.undone = [entry, *self.undone][:KEPT]
        log = _LOGGER.warning if failed else _LOGGER.info
        log("Party in %s: %s%s", self._names(), "" if failed else "put back: ", what)
        self._changed(self, entry)

    def _call(self, service: str, entity: str, **data: Any) -> Awaitable[Any]:
        return self.hass.services.async_call(
            PLAYER, service, {ATTR_ENTITY_ID: entity, **data}, blocking=True
        )

    def _answering(self, room: str) -> bool:
        state = self.hass.states.get(room)
        return state is not None and state.state != STATE_UNAVAILABLE

    def _volume(self, room: str) -> int | None:
        state = self.hass.states.get(room)
        level = state.attributes.get("volume_level") if state else None
        return round(level * 100) if isinstance(level, (int, float)) else None

    async def _rooms_right(self) -> bool:
        """The rooms as they should be. False when the rest can't be compared yet: the
        leader isn't answering, or has only now been taken back from another group."""
        state = self.hass.states.get(self.leader)
        if state is None or state.state == STATE_UNAVAILABLE:
            return False
        members = list(state.attributes.get("group_members") or [self.leader])
        if members[0] != self.leader:
            await self._put_back(
                f"moved {room_name(self.hass, self.leader)} into another group",
                self._call("unjoin", self.leader),
            )
            return False

        for room in self.rooms[1:]:
            if room not in members and self._answering(room):
                await self._put_back(
                    f"took {room_name(self.hass, room)} out of the group",
                    self._call("join", self.leader, group_members=[room]),
                )
        for room in members:
            if room not in self.rooms:
                await self._put_back(
                    f"added {room_name(self.hass, room)} to the group",
                    self._call("unjoin", room),
                )
        return True

    async def _volumes_right(self) -> None:
        for room, want in self.volumes.items():
            have = self._volume(room)
            if have is None or have == want or not self._answering(room):
                continue
            way = "up" if have > want else "down"
            await self._put_back(
                f"turned {room_name(self.hass, room)} {way} to {have}",
                self._call("volume_set", room, volume_level=want / 100),
            )

    async def _music_right(self, excused: bool) -> None:
        session, host = self._speaker()
        uri, _ = await upnp.source(session, host)
        if uri != self.uri and not excused:
            await self._put_back(
                "played something of their own",
                upnp.play_from(session, host, self.uri, self.about, self.song),
            )

        have = await upnp.songs(session, host)
        if [song[0] for song in have] != [song[0] for song in self.queue]:
            await self._put_back(
                self._queue_change(have), self._queue_back(session, host, have)
            )
        elif uri == self.uri:
            # Nothing to put back.
            await self._note_place(session, host)

    def _queue_change(self, have: list[tuple[str, str]]) -> str:
        want, now = (Counter(s[0] for s in songs) for songs in (self.queue, have))
        added, gone = sum((now - want).values()), sum((want - now).values())
        said = [
            f"{count} song{'' if count == 1 else 's'} {how}"
            for count, how in ((added, "added to"), (gone, "taken out of"))
            if count
        ]
        if not said:
            return "moved songs in the queue"
        return f"changed the queue ({' and '.join(f'{part} it' for part in said)})"

    async def _reload(self, session: aiohttp.ClientSession, host: str) -> bool:
        """Songs are missing: have the speaker load its own copy of the queue (`_keep`)
        in place of what is there, and go back to the song it was on, playing if it
        was. False when there is no copy to load, with the queue left as it was found.

        ponytail: the whole queue for one song taken out, so the song that is playing
        starts again. Put the one song back from the copy's own listing if that jars."""
        if not self.copy:
            return False
        # Looked for before the queue is emptied: someone may have deleted it.
        if self.copy not in [p["id"] for p in await upnp.playlists(session, host)]:
            self.copy = ""
            self._record(
                "The party's copy of the queue was deleted from the Sonos playlists, "
                "so songs are put back with fewer of their details",
                True,
            )
            return False

        await upnp.clear(session, host)
        await upnp.queue_favourite(session, host, self.copy, None)
        if self.uri.startswith(upnp.OWN_QUEUE):
            if self.playing:
                await self._back_to_the_song(
                    session, host, "the queue was loaded again"
                )
            elif self.song:
                await upnp.go_to(session, host, self.song)
        return True

    async def _queue_back(
        self, session: aiohttp.ClientSession, host: str, have: list[tuple[str, str]]
    ) -> None:
        """Make the speaker's queue the copy again, changing as little as can be: what
        shouldn't be there is taken out, then each place is given its song, put in if
        it has gone and moved up if it is further down."""
        now = [song[0] for song in have]
        gone = Counter(song[0] for song in self.queue) - Counter(now)
        if gone and await self._reload(session, host):
            return

        wanted = Counter(song[0] for song in self.queue)
        keep = []
        for at, uri in enumerate(now):
            if wanted[uri] > 0:
                wanted[uri] -= 1
                keep.append(at)
        # From the end, so the numbers of those still to go don't change.
        for at in reversed(range(len(now))):
            if at not in keep:
                await upnp.remove(session, host, at + 1)
                del now[at]

        missing = Counter(song[0] for song in self.queue) - Counter(now)
        for at, song in enumerate(self.queue):
            if at < len(now) and now[at] == song[0]:
                continue
            if missing[song[0]] > 0:
                missing[song[0]] -= 1
                await upnp.insert(session, host, song, at + 1)
                now.insert(at, song[0])
            else:
                found = now.index(song[0], at + 1)
                await upnp.move(session, host, found + 1, at + 1)
                now.insert(at, now.pop(found))

        # A queue replaced from another app leaves the speaker stopped at its first
        # song (2026-11-24): back to the song it was on, playing, if it was playing.
        # Not when the music carried on through the change (a song added to the end),
        # which this would start again from its beginning.
        if not self.playing or not self.uri.startswith(upnp.OWN_QUEUE):
            return
        carried_on = await upnp.playing(session, host)
        at = await upnp.track(session, host)
        if not carried_on or at != self.song:
            found = f"the speaker was at song {at}, playing: {carried_on}"
            await self._back_to_the_song(session, host, found)


class Parties:
    """Every party in the house, and what the entities and the page are told of them."""

    def __init__(
        self,
        hass: HomeAssistant,
        changed: Callable[[], None],
        excused: Callable[[str], bool],
    ) -> None:
        self.hass = hass
        self._tell_page = changed
        self._excused = excused
        self._parties: list[Party] = []
        self._listeners: list[Callable[[], None]] = []
        # Since Home Assistant started, for the sensor.
        self.put_back = 0
        self.last: dict[str, Any] | None = None

    @property
    def rooms(self) -> list[list[str]]:
        """The rooms of each party that is on, by name."""
        return [
            [room_name(self.hass, room) for room in party.rooms]
            for party in self._parties
        ]

    @property
    def on(self) -> bool:
        """A party is on somewhere in the house."""
        return bool(self._parties)

    def of(self, room: str) -> Party | None:
        """The party a room is in."""
        return next((p for p in self._parties if room in p.rooms), None)

    def led_by(self, leader: str) -> Party | None:
        return next((p for p in self._parties if p.leader == leader), None)

    @callback
    def listen(self, heard: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(heard)
        return lambda: self._listeners.remove(heard)

    async def start(self, rooms: list[str], volumes: dict[str, int]) -> None:
        """A party for a group: its rooms, leader first, and their volumes now."""
        if any(self.of(room) for room in rooms):
            raise HomeAssistantError("There is already a party in one of these rooms")
        party = Party(self.hass, rooms, volumes, self._changed, self._excused)
        await party.start()
        self._parties.append(party)
        self._changed(party, None)

    def stop(self, party: Party) -> None:
        party.stop()
        self._parties.remove(party)
        self._changed(party, None)

    @callback
    def recheck(self) -> None:
        """Compare every party with its speakers again: what excused a change may have
        ended."""
        for party in self._parties:
            party.due()

    def opened(self, party: Party, on: bool) -> None:
        """Let the screens change the music at this party, or stop them."""
        party.open = on
        self._changed(party, None)

    @callback
    def stop_all(self, _event: Any = None) -> None:
        for party in list(self._parties):
            self.stop(party)

    @callback
    def _changed(self, party: Party, undone: dict[str, Any] | None) -> None:
        """A party began, ended, lost or regained its watch, or put something back."""
        if undone and not undone["failed"]:
            self.put_back += 1
            self.last = {**undone, "rooms": party._names()}
            self.hass.bus.async_fire(
                EVENT, {"rooms": party._names(), "what": undone["what"]}
            )
        self._tell_page()
        for heard in list(self._listeners):
            heard()
