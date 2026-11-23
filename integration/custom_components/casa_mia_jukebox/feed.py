"""The page's two ends in Home Assistant: the house's music, pushed whenever a speaker
changes, and what the page asks to be done.

Everything the page does comes through `do` here and never goes to a speaker by another
way, so Jukebox always knows which changes were its own. (The party lock, when it is
built, tells a guest's change from the owners' by that.)

The rooms are every media player of Home Assistant's Sonos integration: nothing is
listed in Jukebox's options. Changes arrive as Home Assistant's own state events (RULE
FOUR); nothing is polled.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Mapping
from typing import Any

import aiohttp
from homeassistant.const import ATTR_ENTITY_ID, EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

from . import find, house, upnp
from .announce import address, room_name
from .const import DOMAIN
from .house import QUEUE
from .party import Parties

_LOGGER = logging.getLogger(__name__)
PLAYER = "media_player"
SONOS = "sonos"
# Where a favourite can go in the queue, in Home Assistant's own words.
ENQUEUE = ("next", "add", "replace", "play")
# A Sonos favourite, as Home Assistant's browsing names its kind, and the two places in
# the queue that leave the rest of it alone.
FAVOURITE = "favorite_item_id"
LINED_UP = ("next", "add")
# The folder Home Assistant puts a favourite playlist in, and Jukebox the Sonos playlists.
PLAYLISTS = "Playlists"


class Feed:
    """The house's music for whoever is listening. It watches the speakers only while
    someone is, builds the model once for all of them, and once for a burst of changes
    (a group reports through every one of its speakers at the same instant)."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._heard: list[Callable[[dict[str, Any]], None]] = []
        self._stops: list[Callable[[], None]] = []
        self._rooms: frozenset[str] | None = None
        self._last: dict[str, Any] | None = None
        self._due = False
        self.parties = Parties(hass, self._changed)
        # The order the owner arranged the page's players in, kept across restarts.
        self._store: Store[dict[str, list[str]]] = Store(hass, 1, f"{DOMAIN}.order")
        self.order: list[str] = []

    async def load(self) -> None:
        """Read the saved order. Once, before the page is shown."""
        self.order = list((await self._store.async_load() or {}).get("rooms", []))

    async def arrange(self, who: str, rooms: list[str]) -> None:
        """Keep the order the page's players were dragged into, and tell every page."""
        self.order = rooms
        await self._store.async_save({"rooms": rooms})
        _LOGGER.info("%s: arranged the players: %s", who, ", ".join(rooms))
        self._changed()

    @property
    def rooms(self) -> frozenset[str]:
        """The Sonos players, read from the registry once and again only when it
        changes."""
        if self._rooms is None:
            self._rooms = frozenset(
                entry.entity_id
                for entry in er.async_get(self.hass).entities.values()
                if entry.platform == SONOS
                and entry.domain == PLAYER
                and not entry.disabled_by
            )
        return self._rooms

    def model(self) -> dict[str, Any]:
        players = {}
        for entity in self.rooms:
            state = self.hass.states.get(entity)
            players[entity] = (
                room_name(self.hass, entity),
                state.state if state else "unavailable",
                state.attributes if state else {},
            )
        model = house.house(players, self.order)
        for group in model["groups"]:
            party = self.parties.led_by(group["id"])
            group["party"] = party.view() if party else None
        return model

    @callback
    def listen(self, heard: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        """Send the model to `heard` now and at each change, until what this returns is
        called."""
        if not self._heard:
            self._stops = [
                self.hass.bus.async_listen(
                    EVENT_STATE_CHANGED, self._changed, event_filter=self._ours
                ),
                self.hass.bus.async_listen(
                    er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed
                ),
            ]
            self._last = self.model()
        self._heard.append(heard)
        assert self._last is not None
        heard(self._last)

        @callback
        def stop() -> None:
            self._heard.remove(heard)
            if not self._heard:
                for unlisten in self._stops:
                    unlisten()
                self._stops, self._last = [], None

        return stop

    @callback
    def _ours(self, data: Mapping[str, Any]) -> bool:
        return data[ATTR_ENTITY_ID] in self.rooms

    @callback
    def _registry_changed(self, _event: Event) -> None:
        # A speaker added, renamed, disabled or removed.
        self._rooms = None
        self._changed()

    @callback
    def _changed(self, _event: Event | None = None) -> None:
        if not self._due:
            self._due = True
            self.hass.loop.call_soon(self._push)

    @callback
    def _push(self) -> None:
        self._due = False
        if not self._heard:
            return
        now = self.model()
        if now != self._last:
            self._last = now
            for heard in list(self._heard):
                heard(now)


class Refused(HomeAssistantError):
    """Something the page asked for that can't be done, in words for the page."""


class _Doing:
    """One thing asked for: the group it is for, and how each action is carried out."""

    def __init__(
        self,
        hass: HomeAssistant,
        model: dict[str, Any],
        entity: str,
        data: dict,
        parties: Parties,
    ) -> None:
        group = house.group_of(model, entity)
        if group is None:
            raise Refused(f"{entity} is not a Sonos room that is answering")
        self.hass, self.model, self.entity, self.data = hass, model, entity, data
        self.group: dict[str, Any] = group
        self.parties = parties
        # What this changed that a party must know of, to tell it from a guest's change
        # (party.own): the volumes it set, and a room it brought in or took out.
        self.volumes: dict[str, int] = {}
        self.joined: str | None = None
        self.left: str | None = None

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
            await self._play_from(1)
            return

        if not favourite:
            # Something found by searching or browsing always goes into the queue and
            # is played from there. Left to itself ("replace", its default), Home
            # Assistant plays a library song's file directly, and the queue then
            # doesn't show what is playing (owner, 2026-11-23).
            if enqueue == "replace":
                await upnp.clear(*self._speaker())
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

    async def queue_move(self) -> None:
        await upnp.move(*self._speaker(), self._song(), self._song("to"))

    async def queue_remove(self) -> None:
        await upnp.remove(*self._speaker(), self._song())

    async def queue_clear(self) -> None:
        await upnp.clear(*self._speaker())

    async def queue_save(self) -> None:
        name = str(self._value("name")).strip()
        if not name:
            raise Refused("The playlist needs a name")
        await upnp.save(*self._speaker(), name)

    async def playlist_delete(self) -> None:
        # Only what a speaker keeps as a playlist of its own: never a favourite, whose
        # id would name something else to destroy.
        playlist = self._value("media_content_id")
        if not playlist.startswith(upnp.SAVED_QUEUES):
            raise Refused("Only a Sonos playlist can be deleted here")
        await upnp.delete_playlist(*self._speaker(), playlist)

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

    def _room(self) -> str:
        room = self._value("room")
        if not self.model["rooms"].get(room, {}).get("available"):
            raise Refused(f"{room} is not a Sonos room that is answering")
        return room


ACTIONS: dict[str, Callable[[_Doing], Awaitable[None]]] = {
    "play": _Doing.play,
    "pause": _Doing.pause,
    "next": _Doing.next,
    "previous": _Doing.previous,
    "seek": _Doing.seek,
    "shuffle": _Doing.shuffle,
    "repeat": _Doing.repeat,
    "play_media": _Doing.play_media,
    "queue_play": _Doing.queue_play,
    "queue_move": _Doing.queue_move,
    "queue_remove": _Doing.queue_remove,
    "queue_clear": _Doing.queue_clear,
    "queue_save": _Doing.queue_save,
    "playlist_delete": _Doing.playlist_delete,
    "volume": _Doing.volume,
    "mute": _Doing.mute,
    "group_volume": _Doing.group_volume,
    "join": _Doing.join,
    "leave": _Doing.leave,
    "party": _Doing.party,
}


async def do(
    feed: Feed, who: str, action: str, entity: str, data: dict[str, Any]
) -> None:
    """Carry out one thing the page asked for, and write down who asked. Raises
    HomeAssistantError, with the reason, when it can't be done."""
    doing = _Doing(feed.hass, feed.model(), entity, data, feed.parties)
    party = feed.parties.led_by(doing.group["id"])
    # The addresses of what is played stay out of the log: a link can carry a key.
    said = {k: v for k, v in data.items() if k != "media_content_id"}
    try:
        if party is None or action == "party":
            await ACTIONS[action](doing)
        else:
            # Held while the speakers are asked and the party's copy is renewed, so
            # that this is never compared as if a guest had done it.
            async with party.lock:
                await ACTIONS[action](doing)
                await party.own(action, doing)
    except HomeAssistantError as err:
        _LOGGER.warning("%s: %s in %s %s failed: %s", who, action, entity, said, err)
        raise
    _LOGGER.info("%s: %s in %s %s", who, action, entity, said)


async def queue(feed: Feed, entity: str) -> dict[str, Any]:
    """The queue of the group `entity` is in (upnp.queue)."""
    doing = _Doing(feed.hass, feed.model(), entity, {}, feed.parties)
    return await upnp.queue(*doing._speaker())


async def favourites(hass: HomeAssistant, entity: str) -> list[dict[str, Any]]:
    """The Sonos favourites and playlists, as one list: each with the folder Sonos keeps
    it in (playlists, radio, tracks), its picture, and the address `play_media` takes
    back. The favourites are Home Assistant's; the playlists are read from the speaker,
    since Home Assistant's list of those goes out of date (upnp.playlists)."""

    async def browse(**what: str) -> list[dict[str, Any]]:
        node = await find.ask(hass, entity, "browse_media", **what)
        return node.get("children") or []

    def one(folder: str, title: str, id: str, **more: Any) -> dict[str, Any]:
        return {
            "folder": folder,
            "title": title,
            "live": False,
            "playlist": False,
            "picture": None,
            "media_content_id": id,
            "media_content_type": FAVOURITE,
            **more,
        }

    items, pictures = [], {}
    for folder in await browse(media_content_type="favorites", media_content_id=""):
        for item in await browse(
            media_content_type=folder["media_content_type"],
            media_content_id=folder["media_content_id"],
        ):
            id = item["media_content_id"]
            if id.startswith(upnp.SAVED_QUEUES):
                # A playlist as Home Assistant last knew it: only its picture is kept.
                pictures[id] = item.get("thumbnail")
            elif item.get("can_play"):
                items.append(
                    one(
                        folder["title"],
                        item["title"],
                        id,
                        # A station (Sonos files those as a genre) plays at once and
                        # leaves the queue alone; the rest is lined up in it.
                        live=item["media_class"] == "genre",
                        picture=item.get("thumbnail"),
                        media_content_type=item["media_content_type"],
                    )
                )

    host = address(hass, entity)
    if host is None:
        raise Refused("Home Assistant has no address for this speaker")
    playlists = [
        one(
            PLAYLISTS, p["title"], p["id"], playlist=True, picture=pictures.get(p["id"])
        )
        for p in await upnp.playlists(async_get_clientsession(hass), host)
    ]
    # The playlists lead, in their folder with any favourite that is a playlist too.
    return (
        playlists
        + [item for item in items if item["folder"] == PLAYLISTS]
        + [item for item in items if item["folder"] != PLAYLISTS]
    )
