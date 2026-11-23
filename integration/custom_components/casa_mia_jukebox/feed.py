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

from homeassistant.const import ATTR_ENTITY_ID, EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import house, upnp
from .announce import address, room_name
from .house import QUEUE

_LOGGER = logging.getLogger(__name__)
PLAYER = "media_player"
SONOS = "sonos"
# Where a favourite can go in the queue, in Home Assistant's own words.
ENQUEUE = ("next", "add", "replace", "play")
# A Sonos favourite, as Home Assistant's browsing names its kind, and the two places in
# the queue that leave the rest of it alone.
FAVOURITE = "favorite_item_id"
LINED_UP = ("next", "add")


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
        return house.house(players)

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
        self, hass: HomeAssistant, model: dict[str, Any], entity: str, data: dict
    ) -> None:
        group = house.group_of(model, entity)
        if group is None:
            raise Refused(f"{entity} is not a Sonos room that is answering")
        self.hass, self.model, self.entity, self.data = hass, model, entity, data
        self.group: dict[str, Any] = group

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
        """A favourite, as the speaker's own browsing named it. Without `enqueue` it
        plays now, and a playlist then takes the queue's place: the page asks first."""
        enqueue = self.data.get("enqueue")
        if self._value("media_content_type") == FAVOURITE and enqueue in LINED_UP:
            await self._line_up(enqueue == "next")
            return

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
            async_get_clientsession(self.hass),
            self._host(),
            self._value("media_content_id"),
            after if next else None,
        )

    # The queue, which the group's coordinator keeps. Songs are numbered from 1.
    async def queue_play(self) -> None:
        await self.hass.services.async_call(
            SONOS,
            "play_queue",
            {ATTR_ENTITY_ID: self.group["id"], "queue_position": self._song() - 1},
            blocking=True,
        )

    async def queue_move(self) -> None:
        await upnp.move(
            async_get_clientsession(self.hass),
            self._host(),
            self._song(),
            self._song("to"),
        )

    async def queue_remove(self) -> None:
        await upnp.remove(
            async_get_clientsession(self.hass), self._host(), self._song()
        )

    def _song(self, name: str = "value") -> int:
        if (song := int(self._value(name))) < 1:
            raise Refused("The queue's songs are numbered from 1")
        return song

    def _host(self) -> str:
        """The address of the group's coordinator, for what is asked of it directly."""
        host = address(self.hass, self.group["id"])
        if host is None:
            raise Refused("Home Assistant has no address for this speaker")
        return host

    # How loud: each room has its own volume.
    async def volume(self) -> None:
        await self._call("volume_set", self.entity, volume_level=self._level())

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

    def _level(self) -> float:
        return max(0, min(100, int(self._value("value")))) / 100

    # Which rooms: `room` joins this group, or leaves whichever it is in.
    async def join(self) -> None:
        room = self._room()
        if room not in self.group["rooms"]:
            await self._coordinator("join", group_members=[room])

    async def leave(self) -> None:
        await self._call("unjoin", self._room())

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
    "volume": _Doing.volume,
    "mute": _Doing.mute,
    "group_volume": _Doing.group_volume,
    "join": _Doing.join,
    "leave": _Doing.leave,
}


async def do(
    feed: Feed, who: str, action: str, entity: str, data: dict[str, Any]
) -> None:
    """Carry out one thing the page asked for, and write down who asked. Raises
    HomeAssistantError, with the reason, when it can't be done."""
    doing = _Doing(feed.hass, feed.model(), entity, data)
    # The addresses of what is played stay out of the log: a link can carry a key.
    said = {k: v for k, v in data.items() if k != "media_content_id"}
    try:
        await ACTIONS[action](doing)
    except HomeAssistantError as err:
        _LOGGER.warning("%s: %s in %s %s failed: %s", who, action, entity, said, err)
        raise
    _LOGGER.info("%s: %s in %s %s", who, action, entity, said)


async def queue(feed: Feed, entity: str) -> dict[str, Any]:
    """The queue of the group `entity` is in (upnp.queue)."""
    doing = _Doing(feed.hass, feed.model(), entity, {})
    return await upnp.queue(async_get_clientsession(feed.hass), doing._host())


async def favourites(hass: HomeAssistant, entity: str) -> list[dict[str, Any]]:
    """The Sonos favourites, as one list: each with the folder Sonos keeps it in
    (playlists, radio, tracks), its picture, and the address `play_media` takes back."""

    async def browse(**what: str) -> list[dict[str, Any]]:
        answer = await hass.services.async_call(
            PLAYER,
            "browse_media",
            {ATTR_ENTITY_ID: entity, **what},
            blocking=True,
            return_response=True,
        )
        found: Any = (answer or {}).get(entity)
        found = found.as_dict() if hasattr(found, "as_dict") else found or {}
        return found.get("children") or []

    items = []
    for folder in await browse(media_content_type="favorites", media_content_id=""):
        for item in await browse(
            media_content_type=folder["media_content_type"],
            media_content_id=folder["media_content_id"],
        ):
            if item.get("can_play"):
                items.append(
                    {
                        "folder": folder["title"],
                        "title": item["title"],
                        # A station (Sonos files those as a genre) plays at once and
                        # leaves the queue alone; the rest is lined up in it.
                        "live": item["media_class"] == "genre",
                        "picture": item.get("thumbnail"),
                        "media_content_id": item["media_content_id"],
                        "media_content_type": item["media_content_type"],
                    }
                )
    return items
