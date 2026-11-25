"""One thing the page asked for, and how each action is carried out."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import aiohttp
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .. import house, speaker, upnp
from ..announce import address
from ..curate import Curator
from ..house import QUEUE
from ..party import Parties
from .common import FAVOURITE, LINED_UP, PLAYER, SONOS, Refused


class _Doing:
    """One thing asked for: the group it is for, and how each action is carried out."""

    def __init__(
        self,
        hass: HomeAssistant,
        model: dict[str, Any],
        entity: str,
        data: dict,
        parties: Parties,
        curator: Curator | None = None,
    ) -> None:
        group = house.group_of(model, entity)
        if group is None:
            raise Refused(f"{entity} is not a Sonos room that is answering")
        self.hass, self.model, self.entity, self.data = hass, model, entity, data
        self.group: dict[str, Any] = group
        self.parties = parties
        self.curator = curator
        # What an action has to say of what it did, for the page: none for most.
        self.result: dict[str, Any] | None = None
        # What this changed that a party must know of, to tell it from a guest's change
        # (party.own): the volumes it set, and a room it brought in or took out.
        self.volumes: dict[str, int] = {}
        self.joined: str | None = None
        self.left: str | None = None
        # The playlist the queue now holds (Feed.sources): its id, "" when the queue
        # was emptied or replaced by something else, and None when this didn't say.
        self.source: str | None = None

    def _call(self, service: str, entity: str, **data: Any) -> Awaitable[Any]:
        return self.hass.services.async_call(
            PLAYER, service, {ATTR_ENTITY_ID: entity, **data}, blocking=True
        )

    def _coordinator(self, service: str, **data: Any) -> Awaitable[Any]:
        return self._call(service, self.group["id"], **data)

    def _value(self, name: str) -> Any:
        if name not in self.data:
            raise Refused(f"'{name}' is missing")
        return self.data[name]

    async def stop(self) -> None:
        """End the music here: nothing playing, nothing queued, and every room by
        itself again, so the page lists them as quiet."""
        if self.parties.led_by(self.group["id"]):
            raise Refused("There is a party here. End the party first.")
        session, host = self._speaker()
        try:
            player = (await speaker.info(session, host)).get("playerId")
        except (aiohttp.ClientError, OSError, TimeoutError, ValueError) as err:
            raise Refused(
                f"The speaker didn't answer ({err or type(err).__name__})"
            ) from err
        if not player:
            raise Refused("The speaker didn't say which it is")
        await upnp.rest(session, host, player)
        self.source = ""
        for room in self.group["rooms"][1:]:
            await self._call("unjoin", room)

    # What plays: asked of the group's coordinator, which every room follows.
    async def play(self) -> None:
        await self._coordinator("media_play")

    async def pause(self) -> None:
        await self._coordinator("media_pause")

    async def next(self) -> None:
        await self._coordinator("media_next_track")

    async def previous(self) -> None:
        await self._coordinator("media_previous_track")

    async def seek(self) -> None:
        await self._coordinator("media_seek", seek_position=self._value("value"))

    async def shuffle(self) -> None:
        await self._coordinator("shuffle_set", shuffle=bool(self._value("on")))

    async def repeat(self) -> None:
        await self._coordinator("repeat_set", repeat=self._value("mode"))

    async def play_media(self) -> None:
        """Something to play: a favourite, or what a search or browsing found. Without
        `enqueue` it plays now. A favourite playlist then takes the queue's place, so
        the page asks first; anything else joins the queue and is played from it."""
        enqueue = self.data.get("enqueue")
        favourite = self._value("media_content_type") == FAVOURITE
        if favourite and enqueue in LINED_UP:
            await self._line_up(enqueue == "next")
            return
        if favourite and self._value("media_content_id").startswith(upnp.SAVED_QUEUES):
            # A Sonos playlist in place of the queue. Home Assistant can't be asked: it
            # doesn't know of a playlist saved since its list was last renewed.
            await upnp.clear(*self._speaker())
            await self._line_up(next=False)
            self.source = self._value("media_content_id")
            await self._play_from(1)
            return

        if not favourite:
            # Something found by searching or browsing always goes into the queue and
            # is played from there. Left to itself ("replace", its default), Home
            # Assistant plays a library song's file directly, and the queue then
            # doesn't show what is playing (owner, 2026-11-23).
            if enqueue == "replace":
                await upnp.clear(*self._speaker())
                self.source = ""
            enqueue = enqueue if enqueue in LINED_UP else "play"

        extra = {"enqueue": enqueue} if enqueue else {}
        await self._coordinator(
            "play_media",
            media_content_id=self._value("media_content_id"),
            media_content_type=self._value("media_content_type"),
            **extra,
        )

    async def _line_up(self, next: bool) -> None:
        """A favourite into the queue, by the speaker itself: Home Assistant clears the
        queue for any favourite, whatever `enqueue` says (upnp.py)."""
        # Next means after the song that is playing; there is none on a radio station.
        after = self.group["queue_position"] if self.group["kind"] == QUEUE else None
        await upnp.queue_favourite(
            *self._speaker(),
            self._value("media_content_id"),
            after if next else None,
        )

    # The queue, which the group's coordinator keeps. Songs are numbered from 1.
    async def queue_play(self) -> None:
        await self._play_from(self._song())

    async def _play_from(self, song: int) -> None:
        """Play the queue from song number `song`, whatever was playing."""
        await self.hass.services.async_call(
            SONOS,
            "play_queue",
            {ATTR_ENTITY_ID: self.group["id"], "queue_position": song - 1},
            blocking=True,
        )

    async def queue_add(self) -> None:
        """Something found by searching or browsing, into the queue to be its song
        number `to` (an album's songs from there on), or at its end without one.
        Nothing starts or stops.

        Home Assistant adds it, as only it knows how each kind of thing is queued, and
        it can only add at the end; the speaker then moves each song added up to its
        place."""
        speaker = self._speaker()
        before = await upnp.size(*speaker)
        await self._coordinator(
            "play_media",
            media_content_id=self._value("media_content_id"),
            media_content_type=self._value("media_content_type"),
            enqueue="add",
        )
        if "to" not in self.data or (to := self._song("to")) > before:
            return
        # ponytail: one song at a time, which is what has been seen to work on a real
        # speaker. The speaker's move takes a count of songs: use it if a long album
        # is slow to land.
        for n in range(await upnp.size(*speaker) - before):
            await upnp.move(*speaker, before + 1 + n, to + n)

    async def queue_move(self) -> None:
        await upnp.move(*self._speaker(), self._song(), self._song("to"))

    async def queue_remove(self) -> None:
        await upnp.remove(*self._speaker(), self._song())

    async def queue_clear(self) -> None:
        await upnp.clear(*self._speaker())
        self.source = ""

    async def queue_save(self) -> None:
        """Save the queue as a new playlist called `name`, or, given `playlist`, in
        place of that playlist's songs."""
        speaker = self._speaker()
        if over := self.data.get("playlist"):
            # The name is the speaker's own for it, which is the only one it accepts.
            over = self._playlist()
            titles = {p["id"]: p["title"] for p in await upnp.playlists(*speaker)}
            if not (name := titles.get(over, "")):
                raise Refused("That playlist is no longer in Sonos")
            if name.startswith(upnp.COPY):
                raise Refused("That is a party's copy of its queue, not a playlist")
        elif not (name := str(self._value("name")).strip()):
            raise Refused("The playlist needs a name")
        self.source = await upnp.save(*speaker, name, over or "") or None

    async def playlist_delete(self) -> None:
        # Only what a speaker keeps as a playlist of its own: never a favourite, whose
        # id would name something else to destroy.
        playlist = self._value("media_content_id")
        if not playlist.startswith(upnp.SAVED_QUEUES):
            raise Refused("Only a Sonos playlist can be deleted here")
        await upnp.delete_playlist(*self._speaker(), playlist)

    # A Sonos playlist where it is kept: its songs moved, taken out and added to.
    def _playlist(self, name: str = "playlist") -> str:
        playlist = str(self._value(name))
        if not playlist.startswith(upnp.SAVED_QUEUES):
            raise Refused("Only a Sonos playlist can be changed here")
        return playlist

    async def playlist_send(self, keep: bool = False) -> None:
        """Move a song of a playlist to the end of another one (`into`), or copy it
        there with `keep`."""
        playlist, into = self._playlist(), self._playlist("into")
        if into == playlist:
            raise Refused("The song is in that playlist already")
        # The song's title as the page showed it, to tell that it is still the one.
        called = str(self._value("name"))
        await upnp.playlist_send(
            *self._speaker(), playlist, self._song(), called, into, keep
        )

    async def playlist_copy(self) -> None:
        await self.playlist_send(keep=True)

    async def playlist_move(self) -> None:
        await upnp.playlist_move(
            *self._speaker(), self._playlist(), self._song(), self._song("to")
        )

    async def playlist_remove(self) -> None:
        await upnp.playlist_remove(*self._speaker(), self._playlist(), self._song())

    async def playlist_add(self) -> None:
        thing = str(self._value("media_content_id"))
        if "spotify:" in thing and upnp.spotify(thing) is None:
            raise Refused(
                "From Spotify, only a song, an album or a playlist can be added to a "
                "playlist"
            )
        # The name is what a Spotify song is listed by until the speaker has its own.
        name = str(self.data.get("name", ""))
        to = self._song("to") if "to" in self.data else None
        await upnp.playlist_add(*self._speaker(), self._playlist(), thing, name, to)

    def _song(self, name: str = "value") -> int:
        if (song := int(self._value(name))) < 1:
            raise Refused("The queue's songs are numbered from 1")
        return song

    def _speaker(self) -> tuple[aiohttp.ClientSession, str]:
        """The group's coordinator, for what is asked of it directly: the session to
        ask with and its address."""
        host = address(self.hass, self.group["id"])
        if host is None:
            raise Refused("Home Assistant has no address for this speaker")
        return async_get_clientsession(self.hass), host

    # How loud: each room has its own volume.
    async def volume(self) -> None:
        level = self._level()
        await self._call("volume_set", self.entity, volume_level=level)
        self.volumes[self.entity] = round(level * 100)

    async def mute(self) -> None:
        await self._call("volume_mute", self.entity, is_volume_muted=self._value("on"))

    async def group_mute(self) -> None:
        for room in self.group["rooms"]:
            await self._call("volume_mute", room, is_volume_muted=self._value("on"))

    async def group_volume(self) -> None:
        # ponytail: each room is set by itself. The speakers have a group volume of
        # their own (measured 2026-11-23) to use if this is heard to step.
        rooms = self.model["rooms"]
        new = house.shifted(
            {room: rooms[room]["volume"] for room in self.group["rooms"]},
            self._value("value"),
        )
        for room, volume in new.items():
            await self._call("volume_set", room, volume_level=volume / 100)
        self.volumes.update(new)

    def _level(self) -> float:
        return max(0, min(100, int(self._value("value")))) / 100

    # Which rooms: `room` joins this group, or leaves whichever it is in.
    async def join(self) -> None:
        room = self._room()
        if room not in self.group["rooms"]:
            if self.parties.of(room):
                raise Refused(
                    "That room is in a party of its own. End that party first."
                )
            await self._coordinator("join", group_members=[room])
            self.joined = room

    async def leave(self) -> None:
        room = self._room()
        party = self.parties.of(room)
        if party and party.leader == room:
            # The leader holds the queue the party guards.
            raise Refused(
                "That room leads the party's music. End the party to take it out."
            )
        await self._call("unjoin", room)
        self.left = room

    # The party lock (party.py): on for this group as it stands, or off.
    async def party(self) -> None:
        party = self.parties.led_by(self.group["id"])
        if not self._value("on"):
            if party:
                self.parties.stop(party)
            return
        if party is None:
            rooms = self.model["rooms"]
            await self.parties.start(
                self.group["rooms"],
                {
                    room: rooms[room]["volume"]
                    for room in self.group["rooms"]
                    if rooms[room]["volume"] is not None
                },
            )

    async def party_open(self) -> None:
        party = self.parties.led_by(self.group["id"])
        if party is None:
            raise Refused("There is no party in these rooms")
        self.parties.opened(party, bool(self._value("on")))

    def _room(self) -> str:
        room = self._value("room")
        if not self.model["rooms"].get(room, {}).get("available"):
            raise Refused(f"{room} is not a Sonos room that is answering")
        return room


ACTIONS: dict[str, Callable[[_Doing], Awaitable[None]]] = {
    "play": _Doing.play,
    "pause": _Doing.pause,
    "stop": _Doing.stop,
    "next": _Doing.next,
    "previous": _Doing.previous,
    "seek": _Doing.seek,
    "shuffle": _Doing.shuffle,
    "repeat": _Doing.repeat,
    "play_media": _Doing.play_media,
    "queue_play": _Doing.queue_play,
    "queue_add": _Doing.queue_add,
    "queue_move": _Doing.queue_move,
    "queue_remove": _Doing.queue_remove,
    "queue_clear": _Doing.queue_clear,
    "queue_save": _Doing.queue_save,
    "playlist_delete": _Doing.playlist_delete,
    "volume": _Doing.volume,
    "mute": _Doing.mute,
    "group_mute": _Doing.group_mute,
    "group_volume": _Doing.group_volume,
    "join": _Doing.join,
    "leave": _Doing.leave,
    "playlist_move": _Doing.playlist_move,
    "playlist_remove": _Doing.playlist_remove,
    "playlist_add": _Doing.playlist_add,
    "playlist_send": _Doing.playlist_send,
    "playlist_copy": _Doing.playlist_copy,
    "playlist_sort": lambda doing: doing.curator.sort(doing),
    "playlist_unsort": lambda doing: doing.curator.unsort(doing),
    "playlist_dedupe": lambda doing: doing.curator.dedupe(doing),
    "party": _Doing.party,
    "party_open": _Doing.party_open,
}
