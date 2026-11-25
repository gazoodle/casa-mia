"""The pictures of the songs in a queue or a Sonos playlist.

A speaker lists each song's picture as a path on itself (`/getaa?…`) and serves it over
plain http on its own address. A Home Assistant page reached over https won't load
that, and a page away from home can't reach the speaker at all, so Jukebox fetches the
picture and passes it on.

A page's `<img>` can't sign in, so the address carries a key instead, as Home
Assistant's own player pictures do: made new at each start, and given only to pages
that asked for a queue over their signed-in connection. Only a Sonos room's speaker is
ever asked, and only for a picture.

Spotify's pictures are passed on the same way. A wall tablet kept off the internet
can reach Home Assistant and nothing else, and showed a song's coloured tile in place
of its cover (owner's tablet, 2026-11-25). Only Spotify's picture servers are asked.
"""

from __future__ import annotations

import hmac
import logging
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

import aiohttp
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from yarl import URL as Address

from . import upnp
from .announce import address
from .const import DOMAIN

if TYPE_CHECKING:
    from .feed import Feed

_LOGGER = logging.getLogger(__name__)

URL = f"/api/{DOMAIN}/art"
# How a speaker addresses a picture it serves itself.
_OWN = "/getaa?"
# How many pictures a playlist's tile is made of.
TILE = 4
# In a picture's address where a room goes, for one that is on the internet.
WEB = "web"
# Whose pictures on the internet are passed on: Spotify's servers for them.
_SPOTIFY = (".scdn.co", ".spotifycdn.com")
# A cover is tens of kilobytes; nothing bigger than this is passed on.
_MOST = 4 * 1024 * 1024


def relayed(key: str, picture: str | None) -> str | None:
    """A picture's address as a page is given it: one of Spotify's through Jukebox,
    any other as it is."""
    if picture and picture.startswith("https://"):
        if (Address(picture).host or "").endswith(_SPOTIFY):
            return f"{URL}/{key}/{WEB}?u={quote(picture, safe='')}"
    return picture


def shown(key: str, room: str, picture: str | None) -> str | None:
    """The address a page shows a song's picture from: the speaker's own and
    Spotify's through Jukebox, another on the internet as it is, and nothing else."""
    if not picture:
        return None
    if picture.startswith(_OWN):
        return f"{URL}/{key}/{room}?u={quote(picture, safe='')}"
    return relayed(key, picture) if picture.startswith("https://") else None


async def tiled(feed: Feed, room: str, favourites: list[dict[str, Any]]) -> None:
    """Give each Sonos playlist among the favourites the pictures of its first songs
    (`pictures`), for a tile that shows what is in it: a playlist has no picture of
    its own, and a row of the same blank tiles isn't told apart (owner, 2026-11-24).

    ponytail: the speaker is asked about each playlist every time the favourites are
    fetched, one after another. Remember them by the playlist's change number if a
    house with many playlists finds that slow."""
    host = address(feed.hass, room)
    session = async_get_clientsession(feed.hass)
    for playlist in favourites:
        if not playlist["playlist"] or host is None:
            continue
        try:
            found = await upnp.covers(session, host, playlist["media_content_id"])
        except HomeAssistantError as err:
            # The tile is drawn without them; the playlist can still be played.
            _LOGGER.warning("%s: no pictures for a playlist's tile: %s", room, err)
            continue
        addresses = (shown(feed.art_key, room, picture) for picture in found)
        playlist["pictures"] = [a for a in addresses if a][:TILE]


class View(HomeAssistantView):
    """One picture, fetched from the speaker of a Sonos room or from Spotify."""

    url = URL + "/{key}/{room}"
    name = f"api:{DOMAIN}:art"
    requires_auth = False  # the key in the address stands for it (see the top)

    def __init__(self, feed: Feed) -> None:
        self.feed = feed

    async def get(self, request: web.Request, key: str, room: str) -> web.Response:
        path = request.query.get("u", "")
        if not hmac.compare_digest(key, self.feed.art_key):
            return web.Response(status=404)
        if room == WEB:
            # Only what `relayed` would have sent here: never any address at all.
            if relayed(key, path) == path:
                return web.Response(status=404)
            where = Address(path)
        else:
            host = address(self.feed.hass, room)
            if room not in self.feed.rooms or not path.startswith(_OWN) or not host:
                return web.Response(status=404)
            # The path exactly as the speaker wrote it: it is already encoded.
            where = Address(f"http://{host}:{upnp.PORT}{path}", encoded=True)

        try:
            session = async_get_clientsession(self.feed.hass)
            # One of Spotify's servers is never followed to somewhere else.
            ask = session.get(
                where, timeout=aiohttp.ClientTimeout(10), allow_redirects=room != WEB
            )
            async with ask as got:
                kind = got.content_type
                if got.status != 200 or not kind.startswith("image/"):
                    # Usual for a song with no cover: the page draws its own tile.
                    _LOGGER.debug("%s has no picture there (%s)", room, got.status)
                    return web.Response(status=404)
                if int(got.headers.get("Content-Length") or 0) > _MOST:
                    _LOGGER.warning("%s: a song's picture is too big to pass on", room)
                    return web.Response(status=404)
                # All of it. Reading "up to" a size gives only what has arrived so far,
                # and the page was then sent the top part of a cover (b21 to b23).
                picture = await got.read()
        except (aiohttp.ClientError, OSError, TimeoutError) as err:
            _LOGGER.warning(
                "%s: a song's picture couldn't be fetched: %s",
                room,
                err or type(err).__name__,
            )
            return web.Response(status=502)
        # A song's picture doesn't change; the key in the address does, at a restart.
        keep = {"Cache-Control": "private, max-age=86400"}
        return web.Response(body=picture, content_type=kind, headers=keep)
