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
import json
import logging
from collections.abc import Callable
from types import SimpleNamespace
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from . import cover

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
    hass: HomeAssistant, who: object, entity: str, query: str
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


async def _seek(hass: HomeAssistant, query: str, kinds: list[str]) -> tuple[Any, Any]:
    """Ask Spotify, through Home Assistant's integration: its entry and what it found."""
    entries = hass.config_entries.async_loaded_entries(SPOTIFY)
    if not entries:
        raise HomeAssistantError(
            "Home Assistant's Spotify integration isn't set up, or isn't signed in"
        )
    entry = entries[0]
    # The Spotify integration's own signed-in client. It is another integration's
    # inside, so its shape is checked and its absence said, not assumed.
    coordinator = getattr(getattr(entry, "runtime_data", None), "coordinator", None)
    # Its request, not its `search`: that one drops each song's album, and the album
    # is what has the cover (owner's box, 2026-11-25: every song came without one).
    get = getattr(getattr(coordinator, "client", None), "_get", None)
    if get is None:
        raise HomeAssistantError(
            "This version of Home Assistant's Spotify integration can't be searched"
        )
    asked = {"q": query, "limit": SPOTIFY_EACH, "type": ",".join(kinds)}
    try:
        # Spotify's own answer, read by name: `found.tracks.items[0].album.images`.
        return entry, json.loads(
            await get("v1/search", params=asked),
            object_hook=lambda fields: SimpleNamespace(**fields),
        )
    except Exception as err:
        # Whatever Spotify's library raises (no network, a refused token, a change in
        # what Spotify sends) is this source's reason, never the whole search's end.
        raise HomeAssistantError(
            f"Spotify didn't answer: {err or type(err).__name__}"
        ) from err


def _images(thing: Any) -> list[Any]:
    """A thing's pictures, biggest first. A song has none of its own: its album's."""
    album = getattr(thing, "album", None)
    return getattr(thing, "images", None) or getattr(album, "images", None) or []


def _each(found: Any, kind: str) -> list[Any]:
    """What Spotify found of one kind. It leaves a gap in a list for something it has
    withdrawn, and leaves out a kind it wasn't asked for."""
    things = getattr(getattr(found, kind, None), "items", None) or []
    return [thing for thing in things if thing is not None]


def _by(thing: Any) -> str:
    return ", ".join(artist.name for artist in thing.artists)


class Covers:
    """The cover of the song a radio station is playing, found on Spotify from the
    station's own words for it (cover.py). Asked once for each song, when a speaker
    is first seen playing it, never on a timer; `changed` is called when one is found.
    The station's logo stays the group's picture: this is shown as well, not in its
    place (owner, 2026-11-24)."""

    # ponytail: the newest few hundred songs are remembered, in memory.
    KEPT = 500

    def __init__(self, hass: HomeAssistant, changed: Callable[[], None]) -> None:
        self.hass, self._changed = hass, changed
        self._known: dict[tuple[str, str], str | None] = {}
        self._asking: set[tuple[str, str]] = set()
        self._why = ""

    def of(self, artist: str, title: str) -> str | None:
        """The cover, if it is known; if it hasn't been asked for, it is now."""
        pair = cover.names(artist, title)
        if pair is None:
            # Said once for each thing a station says, so the log shows why a song
            # has no cover: nothing was asked.
            if (artist or title) and (artist, title) not in self._known:
                self._keep((artist, title), None)
                _LOGGER.info(
                    "A station's words, %r / %r, aren't an artist and a title: "
                    "no cover is looked for",
                    artist,
                    title,
                )
            return None
        if pair not in self._known and pair not in self._asking:
            self._asking.add(pair)
            self.hass.async_create_background_task(
                self._ask(pair), f"{PLAYER} cover on Spotify"
            )
        return self._known.get(pair)

    async def _ask(self, pair: tuple[str, str]) -> None:
        found: str | None = None
        try:
            _, answer = await _seek(self.hass, " ".join(pair), ["track"])
            songs = [
                (song.name, _by(song), images[0].url)
                for song in _each(answer, "tracks")
                if (images := _images(song))
            ]
            found = cover.cover(pair, songs)
            _LOGGER.info(
                "A station's song, %s / %s: %s on Spotify",
                *pair,
                "its cover found" if found else f"none of {len(songs)} songs is it",
            )
            self._why = ""
        except HomeAssistantError as err:
            # Said once for each reason, not at every song: a house without Spotify
            # would otherwise fill its log.
            if str(err) != self._why:
                self._why = str(err)
                _LOGGER.warning("No covers for stations' songs: %s", err)
        finally:
            self._asking.discard(pair)
        self._keep(pair, found)
        if found:
            self._changed()

    def _keep(self, pair: tuple[str, str], found: str | None) -> None:
        self._known[pair] = found
        while len(self._known) > self.KEPT:
            del self._known[next(iter(self._known))]


async def _spotify(hass: HomeAssistant, query: str) -> list[dict]:
    entry, found = await _seek(hass, query, ["track", "album", "playlist", "artist"])

    def one(
        heading: str, kind: str, thing: Any, by: str = "", expand: bool = False
    ) -> dict:
        images = _images(thing)
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

    return [
        *(one("Songs", "track", t, _by(t)) for t in _each(found, "tracks")),
        *(
            one("Albums", "album", a, _by(a), expand=True)
            for a in _each(found, "albums")
        ),
        *(
            one("Playlists", "playlist", p, p.owner.display_name or "", expand=True)
            for p in _each(found, "playlists")
        ),
        *(one("Artists", "artist", a, expand=True) for a in _each(found, "artists")),
    ]
