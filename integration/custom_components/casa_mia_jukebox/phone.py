"""Listening on the device in someone's own hand: a phone, a tablet or a computer, with
its earbuds. The page there is one more room, which it plays in itself and keeps the
queue of (the cards' phone.ts); nothing of that room is known here. What the page can't
do by itself is asked for here:

- `songs`: what a favourite, a Sonos playlist, or something found by searching holds, as
  songs the page can play one after another (playable.py says which those are);
- `address`: where the page fetches one of them from, asked as each song starts, since
  a link to a file runs out and a station's address is looked up;
- `token`: Jukebox's own sign-in to Spotify (config_flow.py), for Spotify's player in
  the page. Home Assistant's Spotify integration is a remote control and may not play.

A library song is a link to the file among Home Assistant's media, signed for this
login. A station is its own web address; a page reached over https can't play one that
is plain http, so that is passed on from here (`Stream`), by a link signed in the same
way. Only a station a speaker named itself is looked up: Home Assistant fetches the
address, and the page's word for it would let any login make it fetch anything on the
house's network (hacs/default#14999).
"""

from __future__ import annotations

import hashlib
import logging
from collections.abc import Awaitable, Callable
from datetime import timedelta
from typing import Any
from urllib.parse import quote

import aiohttp
import voluptuous as vol
from aiohttp import web
from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.auth import async_sign_path
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import art, find, may, playable, upnp
from .announce import address
from .const import DOMAIN
from .feed import FAVOURITE, Feed, Refused
from .house import _STREAMS
from .may import Who

_LOGGER = logging.getLogger(__name__)
PHONE = f"{DOMAIN}_phone"  # hass.data
SONGS = f"{DOMAIN}/phone/songs"
ADDRESS = f"{DOMAIN}/phone/address"
TOKEN = f"{DOMAIN}/phone/token"
STREAM = f"/api/{DOMAIN}/stream"
TUNEIN = "https://opml.radiotime.com/Tune.ashx"
# What Spotify's player in a page needs leave for: to play, to be told what to play,
# and (its own rule) to read the account it plays as.
SCOPES = "streaming user-read-email user-read-private user-modify-playback-state"
# How long a link to a song's file or a station's stream lasts: longer than any song,
# and a song paused overnight is asked for again (phone.ts).
LINK = timedelta(hours=6)
# Seconds for TuneIn or a station to answer, and for a stream to send nothing before
# it is given up.
ANSWER = 10
STALL = 30


def _one(title: str, by: str, uri: str, source: str, **more: Any) -> dict[str, Any]:
    """A song for the page that no speaker listed: what is known of it."""
    return {
        "title": title,
        "artist": by,
        "album": "",
        "duration": None,
        "picture": None,
        "source": source,
        "uri": uri,
        **more,
    }


def _playable(listed: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Of the songs a speaker listed, those a phone can play, and how many it can't."""
    songs = [song for one in listed if (song := playable.track(one))]
    return songs, len(listed) - len(songs)


class Phone:
    def __init__(self, feed: Feed) -> None:
        self.hass, self.feed = feed.hass, feed
        # Where each share of the music library is among Home Assistant's media
        # (playable.placed): found once.
        self._shares: dict[str, tuple[str, str]] = {}
        # The plain-http streams passed on, by the name each is asked for with.
        # ponytail: one for each station played since Home Assistant started.
        self.streams: dict[str, str] = {}

    def spotify(self, who: Who) -> bool:
        """Whether this login can be given Spotify's player: the page asks only then."""
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        return who.admin and bool(entries) and "token" in entries[0].data

    async def songs(
        self, who: Who, entity: str, thing: str, kind: str, name: str, by: str
    ) -> dict[str, Any]:
        """The songs of one thing the page was asked to play. `entity` is a Sonos room
        to read them through; `name` and `by` are what the page shows the thing as, for
        a song nothing else describes."""
        if entity not in self.feed.rooms:
            raise Refused(f"{entity} is not a Sonos room")
        host = address(self.hass, entity)
        if host is None:
            raise Refused("Home Assistant has no address for this speaker")
        speaker = async_get_clientsession(self.hass), host

        picture = None
        if kind == FAVOURITE and not thing.startswith(upnp.SAVED_QUEUES):
            # A favourite stands for something else: a station, a song, an album.
            item, thing = await upnp.favourite_item(*speaker, thing)
            title, picture = upnp.named(item)
            name = title or name
        found, left = await self._songs(entity, speaker, thing, name, by)
        if not found:
            raise Refused(
                f"None of its {left} songs can be played on a phone or tablet: they "
                "are from another music service"
                if left
                else "There are no songs in it"
            )

        for song in found:
            song["picture"] = art.shown(
                self.feed.art_key, entity, song["picture"] or picture
            )
        _LOGGER.info(
            "%s: %d songs to play on their own device%s",
            who,
            len(found),
            f", and {left} left out that a phone can't play" if left else "",
        )
        return {"songs": found, "left_out": left}

    async def _songs(
        self,
        entity: str,
        speaker: tuple[aiohttp.ClientSession, str],
        thing: str,
        title: str,
        by: str,
    ) -> tuple[list[dict[str, Any]], int]:
        if thing.startswith(upnp.SAVED_QUEUES):
            return _playable(await upnp.detailed(*speaker, thing))
        if thing.startswith(_STREAMS):
            return [_one(title, "", thing, "radio", live=True)], 0
        if streamed := playable.spotify(thing):
            what, uri = streamed
            if what == "track":
                return [_one(title, by, uri, "spotify")], 0
            return await self._spotify(entity, what, uri, title), 0
        if thing.startswith(playable.FILE):
            return [_one(title, by, thing, "library")], 0

        # An album or the like of the music library, by the speaker's own name for it.
        # A favourite's address has the speaker's id in front of that.
        place = thing.partition("#")[2] if thing.startswith("x-rincon-") else thing
        if place.startswith(("A:", "S:")):
            return _playable(await upnp.library(*speaker, place))
        raise Refused(
            "That can't be played on a phone or tablet: only Spotify, the music "
            "library and radio stations can"
        )

    async def _spotify(
        self, entity: str, what: str, uri: str, title: str
    ) -> list[dict[str, Any]]:
        """The songs of an album or a playlist of Spotify's, as Home Assistant's own
        browsing lists them: their titles and pictures. Spotify's player says the rest
        of each as it plays."""
        entries = self.hass.config_entries.async_loaded_entries(find.SPOTIFY)
        if not entries:
            raise Refused(
                "Home Assistant's Spotify integration isn't set up, so what is in "
                f"“{title}” can't be listed"
            )
        node = await find.ask(
            self.hass,
            entity,
            "browse_media",
            media_content_type=f"{find.SPOTIFY}://{what}",
            media_content_id=f"{find.SPOTIFY}://{entries[0].entry_id}/{uri}",
        )
        album = node.get("title") or title if what == "album" else ""
        songs = [
            _one(
                child.get("title") or "",
                "",
                song[1],
                "spotify",
                album=album,
                picture=child.get("thumbnail") or node.get("thumbnail"),
            )
            for child in node.get("children") or []
            if (song := playable.spotify(child.get("media_content_id") or ""))
            and song[0] == "track"
        ]
        if not songs:
            raise Refused(
                f"“{title}” holds no songs itself: open it and choose an album or a song"
            )
        return songs

    async def address(self, who: Who, uri: str, secure: bool) -> dict[str, str]:
        """Where the page fetches a song of the library or a station from. `secure` is
        that the page is reached over https, which plays nothing sent over plain http."""
        if uri.startswith(playable.FILE):
            place = await self.hass.async_add_executor_job(
                playable.placed, self.hass.config.media_dirs, uri, self._shares
            )
            if place is None:
                raise Refused(
                    "This song's file isn't among Home Assistant's media. Add the "
                    "music library's share under Settings, System, Storage, for "
                    "media, so that a phone can be sent it."
                )
            # Signed for the login that asked. The signer gives the path back
            # unquoted, so it is quoted again for the page.
            signed = async_sign_path(
                self.hass, quote(f"/media/{place[0]}/{place[1]}"), LINK
            )
            path, _, key = signed.rpartition("?")
            url, what = f"{quote(path)}?{key}", "a song of the music library"
        elif uri.startswith(_STREAMS):
            if not await self._named(uri):
                raise Refused(
                    "Only a station a Sonos room is playing, or one of the Sonos "
                    "favourites, can be played on a phone or tablet"
                )
            url = playable.direct(uri) or await self._tunein(uri)
            if secure and url.startswith("http://"):
                url = self._relayed(url)
            what = "a station"
        else:
            raise Refused("Only a library song or a radio station is fetched here")
        # Never the address itself: a link carries a key.
        _LOGGER.info("%s: %s to play on their own device", who, what)
        return {"url": url}

    async def _named(self, uri: str) -> bool:
        """Whether a speaker named this station itself: a room is playing it, or it is
        one of the favourites. Asked at each start, not remembered from `songs`: the
        page keeps its station when it is opened again, after a restart too."""
        for room in self.feed.rooms:
            state = self.hass.states.get(room)
            if state and state.attributes.get("media_content_id") == uri:
                return True

        host = next(
            filter(None, (address(self.hass, r) for r in self.feed.rooms)), None
        )
        if host is None:
            raise Refused("No Sonos speaker has an address to ask for its favourites")
        session = async_get_clientsession(self.hass)
        return uri in await upnp.favourite_addresses(session, host)

    async def _tunein(self, uri: str) -> str:
        station = playable.tunein(uri)
        if station is None:
            raise Refused("This station's address isn't one a phone can be given")
        session = async_get_clientsession(self.hass)
        wait = aiohttp.ClientTimeout(total=ANSWER)
        asked = {"id": station, "render": "json", "formats": "mp3,aac"}
        try:
            async with session.get(TUNEIN, params=asked, timeout=wait) as got:
                told = await got.json(content_type=None)
            body = told.get("body") if isinstance(told, dict) else None
            if (picked := playable.chosen(body)) is None:
                raise Refused("TuneIn has no stream for this station")
            url, stream = picked
            if not stream:
                # A list of the station's streams, to take the first from.
                async with session.get(url, timeout=wait) as got:
                    url = playable.listed(await got.text(errors="replace")) or ""
        except (aiohttp.ClientError, TimeoutError, ValueError) as err:
            raise Refused(
                f"TuneIn didn't give this station's address "
                f"({err or type(err).__name__})"
            ) from err
        if not url:
            raise Refused("TuneIn's list for this station has no stream in it")
        return url

    def _relayed(self, url: str) -> str:
        """The address of a plain-http stream as passed on from here, signed for the
        login that asked: an <audio> can't sign in."""
        name = hashlib.sha256(url.encode()).hexdigest()[:24]
        self.streams[name] = url
        return async_sign_path(self.hass, f"{STREAM}/{name}", LINK)

    async def token(self, who: Who) -> dict[str, Any]:
        """Jukebox's sign-in to Spotify, renewed if it has run out, for Spotify's
        player in the page. Administrators only: it is the house's one Spotify
        account, and whoever holds this can act as it (hacs/default#14999)."""
        if not who.admin:
            raise Refused(
                "Only an administrator can listen to Spotify on a device of their "
                "own: the page is given the key to the house's Spotify account"
            )
        session = await find.signed_in(self.hass)
        _LOGGER.info("%s: Spotify's player on their own device", who)
        token = session.token
        return {"token": token["access_token"], "expires": token["expires_at"]}


class Stream(HomeAssistantView):
    """A station's plain-http stream, passed on to a page that is reached over https.
    Only a stream `Phone.address` named, by a signed link, and only sound."""

    url = STREAM + "/{name}"
    name = f"api:{DOMAIN}:stream"

    def __init__(self, phone: Phone) -> None:
        self.phone = phone

    async def get(self, request: web.Request, name: str) -> web.StreamResponse:
        where = self.phone.streams.get(name)
        if where is None:
            return web.Response(status=404)

        session = async_get_clientsession(self.phone.hass)
        wait = aiohttp.ClientTimeout(total=None, sock_connect=ANSWER, sock_read=STALL)
        passing: web.StreamResponse | None = None
        try:
            async with session.get(where, timeout=wait) as got:
                kind = got.content_type
                if got.status != 200 or not kind.startswith(
                    ("audio/", "application/ogg")
                ):
                    _LOGGER.warning(
                        "A station's stream wasn't passed on: it answered %s, %s",
                        got.status,
                        kind,
                    )
                    return web.Response(status=502)
                passing = web.StreamResponse(
                    headers={"Content-Type": kind, "Cache-Control": "no-store"}
                )
                await passing.prepare(request)
                _LOGGER.info("Passing a station's stream on to a phone")
                async for chunk in got.content.iter_any():
                    await passing.write(chunk)
        except ConnectionError:
            _LOGGER.info("The phone stopped listening to a station's stream")
        except (aiohttp.ClientError, OSError, TimeoutError) as err:
            # The page hears the stream end, and says so there.
            _LOGGER.warning("A station's stream stopped: %s", err or type(err).__name__)
        return passing if passing is not None else web.Response(status=502)


def setup(hass: HomeAssistant, feed: Feed) -> Phone:
    """Once per Home Assistant run, with the page (page.setup)."""
    hass.data[PHONE] = phone = Phone(feed)
    hass.http.register_view(Stream(phone))
    for command in (_ws_songs, _ws_address, _ws_token):
        websocket_api.async_register_command(hass, command)
    return phone


async def _answer(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    ask: Callable[[Phone, Who], Awaitable[dict[str, Any]]],
) -> None:
    """Answer one of the page's requests, or say why it can't be."""
    who = may.who(hass, connection.user)
    try:
        found = await ask(hass.data[PHONE], who)
    except HomeAssistantError as err:
        _LOGGER.warning("%s: %s failed: %s", who, msg["type"], err)
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"], found)


@websocket_api.websocket_command(
    {
        vol.Required("type"): SONGS,
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Required("media_content_id"): str,
        vol.Required("media_content_type"): str,
        vol.Optional("name", default=""): str,
        vol.Optional("by", default=""): str,
    }
)
@websocket_api.async_response
async def _ws_songs(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    await _answer(
        hass,
        connection,
        msg,
        lambda phone, who: phone.songs(
            who,
            msg[ATTR_ENTITY_ID],
            msg["media_content_id"],
            msg["media_content_type"],
            msg["name"],
            msg["by"],
        ),
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): ADDRESS,
        vol.Required("uri"): str,
        vol.Optional("secure", default=False): bool,
    }
)
@websocket_api.async_response
async def _ws_address(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    await _answer(
        hass,
        connection,
        msg,
        lambda phone, who: phone.address(who, msg["uri"], msg["secure"]),
    )


@websocket_api.websocket_command({vol.Required("type"): TOKEN})
@websocket_api.async_response
async def _ws_token(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    await _answer(hass, connection, msg, lambda phone, who: phone.token(who))
