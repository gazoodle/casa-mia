"""The house's music as every page is told it, built when a speaker changes."""

from __future__ import annotations

import logging
import secrets
from collections.abc import Callable, Mapping
from typing import Any

import aiohttp
from homeassistant.const import ATTR_ENTITY_ID, EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .. import art, cover, find, house, upnp
from ..announce import address, room_name
from ..const import DOMAIN
from ..curate import Curator
from ..love import Love
from ..may import Who
from ..party import Parties
from ..undo import Undo
from .common import PLAYER, SONOS

_LOGGER = logging.getLogger(__name__)


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
        self.love = Love(hass, self._love_changed)
        self.parties = Parties(hass, self._changed, self.love.acting)
        # A station's name and picture where Home Assistant has none, as the speaker
        # gave them: {room: (the stream it was asked about, name, picture)}. Asked once
        # for each stream, when a speaker is seen on it, never on a timer.
        self._stations: dict[str, tuple[str, str, str | None]] = {}
        self._asking: set[str] = set()
        # When each room's music was last changed from Jukebox (NEW_MUSIC).
        self._renewed: dict[str, str] = {}
        # The Sonos playlist each group's queue was loaded from or last saved as, from
        # Jukebox, by its coordinator: the one the page offers to save the queue back
        # to. Not kept across a restart.
        # ponytail: a queue replaced from another app isn't noticed, so the page may
        # offer the wrong playlist first. It asks before replacing, with both counts.
        self.sources: dict[str, str] = {}
        # Tidying a playlist as a whole, and its memory of a sort to put back.
        self.curator = Curator()
        # A queue Jukebox replaced or cleared, kept for a while to put back.
        self.undo = Undo(hass, self._changed)
        # The cover of the song a station is playing, found on Spotify (find.Covers).
        self.covers = find.Covers(hass, self._changed)
        # What a page shows a song's picture with (art.py): new at each start.
        self.art_key = secrets.token_urlsafe(16)
        # The order the owner arranged the page's players in, kept across restarts.
        self._store: Store[dict[str, list[str]]] = Store(hass, 1, f"{DOMAIN}.order")
        self.order: list[str] = []

    async def load(self) -> None:
        """Read the saved order. Once, before the page is shown."""
        self.order = list((await self._store.async_load() or {}).get("rooms", []))

    async def arrange(self, who: Who, rooms: list[str]) -> None:
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
            if group["kind"] == house.RADIO and not (
                group["channel"] and group["picture"]
            ):
                stream = players[group["id"]][2].get("media_content_id")
                self._station(group, str(stream or ""))
            # A station's song, found on Spotify: its own cover as well as the
            # station's picture, and what is added to a playlist. Or why it wasn't.
            match = (
                self.covers.of(group["artist"], group["title"])
                if group["kind"] == house.RADIO
                else None
            )
            song = match if isinstance(match, cover.Song) else None
            group["cover"] = art.relayed(self.art_key, song.picture) if song else None
            group["found"] = (
                {"uri": song.uri, "title": song.title, "by": song.artists}
                if song and song.uri
                else None
            )
            group["unfound"] = match if isinstance(match, str) else None
            party = self.parties.led_by(group["id"])
            group["party"] = party.view() if party else None
            # What Love it or Loathe it last did to this player, and why (love.py),
            # unless that is over and different music was chosen since: an advert's
            # volume was still being explained over a playlist started after it
            # (owner, 2026-11-24).
            love = self.love.of(group["id"])
            stale = love and not love.get("now")
            if stale and str(love.get("at", "")) <= self._renewed.get(group["id"], ""):
                love = None
            group["source"] = self.sources.get(group["id"])
            # A queue replaced or cleared from Jukebox can still be put back (undo.py).
            group["undo"] = self.undo.has(group["id"])
            group["love"] = love
        return model

    def _station(self, group: dict[str, Any], stream: str) -> None:
        """Fill in a station's name and picture from what its speaker said, and ask the
        speaker if it hasn't been asked about this stream."""
        room = group["id"]
        known = self._stations.get(room)
        if known and known[0] == stream:
            group["channel"] = group["channel"] or known[1]
            group["picture"] = group["picture"] or known[2]
        elif room not in self._asking:
            self._asking.add(room)
            self.hass.async_create_background_task(
                self._ask_station(room, stream), f"{DOMAIN} station {room}"
            )

    async def _ask_station(self, room: str, stream: str) -> None:
        name: str = ""
        picture: str | None = None
        try:
            host = address(self.hass, room)
            if host is None:
                raise HomeAssistantError("Home Assistant has no address for it")
            session = async_get_clientsession(self.hass)
            name, picture = await upnp.station(session, host)
        except (HomeAssistantError, aiohttp.ClientError, OSError, TimeoutError) as err:
            # Kept as asked, so a speaker that can't answer isn't asked at every change.
            _LOGGER.warning(
                "%s: the speaker couldn't be asked which station it is on: %s",
                room,
                err or type(err).__name__,
            )
        finally:
            self._asking.discard(room)
        self._stations[room] = (stream, name, picture)
        self._changed()

    @callback
    def renewed(self, room: str) -> None:
        """Different music was put on in this room's group, from Jukebox."""
        self._renewed[room] = dt_util.utcnow().isoformat()
        self._changed()

    @callback
    def _love_changed(self) -> None:
        self.parties.recheck()
        self._changed()

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
