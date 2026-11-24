"""The pictures of the songs in a queue or a Sonos playlist.

A speaker lists each song's picture as a path on itself (`/getaa?…`) and serves it over
plain http on its own address. A Home Assistant page reached over https won't load
that, and a page away from home can't reach the speaker at all, so Jukebox fetches the
picture and passes it on.

A page's `<img>` can't sign in, so the address carries a key instead, as Home
Assistant's own player pictures do: made new at each start, and given only to pages
that asked for a queue over their signed-in connection. Only a Sonos room's speaker is
ever asked, and only for a picture.
"""

from __future__ import annotations

import hmac
import logging
from typing import TYPE_CHECKING
from urllib.parse import quote

import aiohttp
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
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
# A cover is tens of kilobytes; nothing bigger than this is passed on.
_MOST = 4 * 1024 * 1024


def shown(key: str, room: str, picture: str | None) -> str | None:
    """The address a page shows a song's picture from: the speaker's own through
    Jukebox, one on the internet as it is, and nothing else."""
    if not picture:
        return None
    if picture.startswith(_OWN):
        return f"{URL}/{key}/{room}?u={quote(picture, safe='')}"
    return picture if picture.startswith("https://") else None


class View(HomeAssistantView):
    """One picture, fetched from the speaker of a Sonos room."""

    url = URL + "/{key}/{room}"
    name = f"api:{DOMAIN}:art"
    requires_auth = False  # the key in the address stands for it (see the top)

    def __init__(self, feed: Feed) -> None:
        self.feed = feed

    async def get(self, request: web.Request, key: str, room: str) -> web.Response:
        path = request.query.get("u", "")
        known = hmac.compare_digest(key, self.feed.art_key)
        if not known or room not in self.feed.rooms or not path.startswith(_OWN):
            return web.Response(status=404)
        host = address(self.feed.hass, room)
        if host is None:
            return web.Response(status=404)

        try:
            # The path exactly as the speaker wrote it: it is already encoded.
            where = Address(f"http://{host}:{upnp.PORT}{path}", encoded=True)
            session = async_get_clientsession(self.feed.hass)
            async with session.get(where, timeout=aiohttp.ClientTimeout(10)) as got:
                kind = got.content_type
                if got.status != 200 or not kind.startswith("image/"):
                    # Usual for a song with no cover: the page draws its own tile.
                    _LOGGER.debug("%s has no picture there (%s)", room, got.status)
                    return web.Response(status=404)
                picture = await got.content.read(_MOST)
        except (aiohttp.ClientError, OSError, TimeoutError) as err:
            _LOGGER.warning(
                "%s: a song's picture couldn't be fetched from the speaker: %s",
                room,
                err or type(err).__name__,
            )
            return web.Response(status=502)
        # A song's picture doesn't change; the key in the address does, at a restart.
        keep = {"Cache-Control": "private, max-age=86400"}
        return web.Response(body=picture, content_type=kind, headers=keep)
