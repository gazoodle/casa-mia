"""Finding music to play: searching the Sonos music library and Spotify together, and
browsing what a speaker can play.

Both come from Home Assistant: the library through its Sonos integration, and Spotify
through its Spotify integration, whose signed-in account is used as it stands (Jukebox
has no login of its own). Sonos's browsing already includes Spotify's once that
integration is set up, and Sonos plays what either finds, honouring where in the queue
it should go. A Spotify result is given the address Spotify's own browsing gives, so it
is browsed and played the same way.

One source failing never hides the other: each comes back with its results, or the
reason there are none.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

_LOGGER = logging.getLogger(__name__)
PLAYER = "media_player"
SPOTIFY = "spotify"
LIBRARY_NAME = "Music library"
SPOTIFY_NAME = "Spotify"
# What Sonos keeps the favourites under, which have a tab of their own on the page.
FAVOURITES = "favorites"
# What the library is searched for, and the heading each is shown under.
LIBRARY = (("track", "Songs"), ("album", "Albums"), ("artist", "Artists"))
# How many of each a search shows. Spotify refuses a request for more than 10 of a kind
# (owner's box, 2026-11-23: "limit must be between 1 and 10").
EACH = 20
SPOTIFY_EACH = 10


async def ask(hass: HomeAssistant, entity: str, service: str, **what: Any) -> dict:
    """What one of Home Assistant's media player actions answers for a speaker: its
    browsing of a place, or a search."""
    answer = await hass.services.async_call(
        PLAYER,
        service,
        {ATTR_ENTITY_ID: entity, **what},
        blocking=True,
        return_response=True,
    )
    found: Any = (answer or {}).get(entity)
    return found.as_dict() if hasattr(found, "as_dict") else found or {}


def item(folder: str, node: dict[str, Any], **more: Any) -> dict[str, Any]:
    """One thing to play or to open, as the page shows it. `node` is as Home
    Assistant's browsing gives it."""
    return {
        "folder": folder,
        "title": node.get("title") or "",
        "by": "",
        "live": False,
        "playlist": False,
        "picture": node.get("thumbnail"),
        "can_play": bool(node.get("can_play")),
        "can_expand": bool(node.get("can_expand")),
        "media_content_id": node.get("media_content_id") or "",
        "media_content_type": node.get("media_content_type") or "",
        **more,
    }


async def browse(
    hass: HomeAssistant, entity: str, kind: str | None, id: str | None
) -> dict[str, Any]:
    """One place in what a speaker can play, and what is in it. With no place, the
    top: the music library and, when it is set up, Spotify."""
    where = {"media_content_type": kind, "media_content_id": id or ""} if kind else {}
    node = await ask(hass, entity, "browse_media", **where)
    children = [
        child
        for child in node.get("children") or []
        if kind or child.get("media_content_type") != FAVOURITES
    ]
    title = node.get("title") or ""
    return {"title": title, "items": [item(title, child) for child in children]}


async def search(
    hass: HomeAssistant, who: str, entity: str, query: str
) -> dict[str, Any]:
    """Search the music library and Spotify at once. Each source comes with what it
    found, or with why it found nothing."""

    async def source(name: str, found: Any) -> dict[str, Any]:
        try:
            return {"name": name, "items": await found, "why": None}
        except HomeAssistantError as err:
            _LOGGER.warning("Searching %s failed: %s", name, err)
            return {"name": name, "items": [], "why": str(err)}

    sources = await asyncio.gather(
        source(LIBRARY_NAME, _library(hass, entity, query)),
        source(SPOTIFY_NAME, _spotify(hass, query)),
    )
    _LOGGER.info(
        "%s searched for %r: %s",
        who,
        query,
        ", ".join(f"{len(s['items'])} in {s['name']}" for s in sources),
    )
    return {"sources": list(sources)}


async def _library(hass: HomeAssistant, entity: str, query: str) -> list[dict]:
    async def of(kind: str, heading: str) -> list[dict]:
        found = await ask(
            hass, entity, "search_media", search_query=query, media_content_type=kind
        )
        return [item(heading, node) for node in (found.get("result") or [])[:EACH]]

    kinds = await asyncio.gather(*(of(kind, heading) for kind, heading in LIBRARY))
    return [found for kind in kinds for found in kind]


async def _spotify(hass: HomeAssistant, query: str) -> list[dict]:
    entries = hass.config_entries.async_loaded_entries(SPOTIFY)
    if not entries:
        raise HomeAssistantError(
            "Home Assistant's Spotify integration isn't set up, or isn't signed in"
        )
    entry = entries[0]
    # The Spotify integration's own signed-in client. It is another integration's
    # inside, so its shape is checked and its absence said, not assumed.
    coordinator = getattr(getattr(entry, "runtime_data", None), "coordinator", None)
    seek = getattr(getattr(coordinator, "client", None), "search", None)
    if seek is None:
        raise HomeAssistantError(
            "This version of Home Assistant's Spotify integration can't be searched"
        )
    try:
        kinds = ["track", "album", "playlist", "artist"]
        found = await seek(query, kinds, limit=SPOTIFY_EACH)
    except Exception as err:
        # Whatever Spotify's library raises (no network, a refused token, a change in
        # what Spotify sends) is this source's reason, never the whole search's end.
        raise HomeAssistantError(
            f"Spotify didn't answer: {err or type(err).__name__}"
        ) from err

    def one(
        heading: str, kind: str, thing: Any, by: str = "", expand: bool = False
    ) -> dict:
        images = getattr(thing, "images", None) or []
        return {
            "folder": heading,
            "title": thing.name,
            "by": by,
            "live": False,
            "playlist": False,
            "picture": images[0].url if images else None,
            "can_play": True,
            "can_expand": expand,
            "media_content_id": f"{SPOTIFY}://{entry.entry_id}/{thing.uri}",
            "media_content_type": f"{SPOTIFY}://{kind}",
        }

    def by(thing: Any) -> str:
        return ", ".join(artist.name for artist in thing.artists)

    # Spotify leaves a gap in a list for something it has withdrawn.
    def each(things: Any) -> list[Any]:
        return [thing for thing in things or [] if thing is not None]

    return [
        *(one("Songs", "track", t, by(t)) for t in each(found.tracks)),
        *(one("Albums", "album", a, by(a), expand=True) for a in each(found.albums)),
        *(
            one("Playlists", "playlist", p, p.owner.display_name or "", expand=True)
            for p in each(found.playlists)
        ),
        *(one("Artists", "artist", a, expand=True) for a in each(found.artists)),
    ]
