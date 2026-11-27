"""Finding music to play: searching the Sonos music library and Spotify together, and
browsing what a speaker can play.

The library is searched through Home Assistant's Sonos integration. Spotify is searched
with Jukebox's own sign-in (config_flow.py), on Spotify's public Web API: Home
Assistant's Spotify integration has no search that keeps each song's album, and its
client is that integration's own (hacs/default#14999). Sonos's browsing already
includes Spotify's once that integration is set up, and Sonos plays what either finds,
honouring where in the queue it should go. A Spotify result is given the address
Spotify's own browsing gives, so it is browsed and played the same way.

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

import aiohttp
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_entry_oauth2_flow

from . import cover
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
PLAYER = "media_player"
SPOTIFY = "spotify"
SEARCH = "https://api.spotify.com/v1/search"
# How long Spotify has to answer a search.
WAIT = aiohttp.ClientTimeout(total=10)
SIGN_IN = (
    "Jukebox isn't signed in to Spotify. In Settings, Devices & services, open Jukebox "
    "and choose Reconfigure from its menu."
)
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


async def signed_in(hass: HomeAssistant) -> config_entry_oauth2_flow.OAuth2Session:
    """Jukebox's own sign-in to Spotify (config_flow.py), its token renewed if it has
    run out. It is the house's one Spotify account."""
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries or "token" not in entries[0].data:
        raise HomeAssistantError(SIGN_IN)
    entry = entries[0]

    try:
        session = config_entry_oauth2_flow.OAuth2Session(
            hass,
            entry,
            await config_entry_oauth2_flow.async_get_config_entry_implementation(
                hass, entry
            ),
        )
        await session.async_ensure_token_valid()
    except (aiohttp.ClientError, HomeAssistantError, ValueError) as err:
        raise HomeAssistantError(
            f"Spotify wouldn't renew Jukebox's sign-in "
            f"({err or type(err).__name__}). {SIGN_IN}"
        ) from err
    return session


async def _seek(hass: HomeAssistant, query: str, kinds: list[str]) -> Any:
    """What Spotify's own search finds, asked with Jukebox's sign-in. Spotify's
    answer, not a library's reading of it: a song's album is what has its cover, and
    Home Assistant's Spotify integration drops it (owner's box, 2026-11-25)."""
    session = await signed_in(hass)
    asked = {"q": query, "limit": SPOTIFY_EACH, "type": ",".join(kinds)}

    try:
        async with await session.async_request(
            "GET", SEARCH, params=asked, timeout=WAIT
        ) as answer:
            if answer.status != 200:
                raise HomeAssistantError(
                    f"Spotify refused the search ({answer.status})"
                )
            # Read by name: `found.tracks.items[0].album.images`.
            return json.loads(
                await answer.text(),
                object_hook=lambda fields: SimpleNamespace(**fields),
            )
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        # No network, or an answer that isn't Spotify's JSON: this source's reason,
        # never the whole search's end.
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
    """The song a radio station is playing, found on Spotify from the station's own
    words for it (cover.py): its cover is shown, and it is what is added to a playlist.
    Asked once for each song, when a speaker is first seen playing it, never on a
    timer; `changed` is called when the answer comes. The station's logo stays the
    group's picture: the cover is shown as well, not in its place (owner, 2026-11-24)."""

    # ponytail: the newest few hundred songs are remembered, in memory.
    KEPT = 500
    NOT_NAMED = "The station didn't say an artist and a title for it"
    ASKING = "It is still being looked for on Spotify"
    NOT_FOUND = "Spotify has no song that matches what the station says"

    def __init__(self, hass: HomeAssistant, changed: Callable[[], None]) -> None:
        self.hass, self._changed = hass, changed
        # Each song's match on Spotify, or why there is none.
        self._known: dict[tuple[str, str], cover.Song | str] = {}
        self._asking: set[tuple[str, str]] = set()
        self._why = ""

    def of(self, artist: str, title: str) -> cover.Song | str:
        """The song on Spotify, if it is known, or why it isn't; if it hasn't been
        asked for, it is now."""
        pair = cover.names(artist, title)
        if pair is None:
            # Said once for each thing a station says, so the log shows why a song
            # has no cover: nothing was asked.
            if (artist or title) and (artist, title) not in self._known:
                self._keep((artist, title), self.NOT_NAMED)
                _LOGGER.info(
                    "A station's words, %r / %r, aren't an artist and a title: "
                    "no cover is looked for",
                    artist,
                    title,
                )
            return self.NOT_NAMED
        if pair not in self._known and pair not in self._asking:
            self._asking.add(pair)
            self.hass.async_create_background_task(
                self._ask(pair), f"{PLAYER} cover on Spotify"
            )
        return self._known.get(pair, self.ASKING)

    def again(self, artist: str, title: str) -> bool:
        """Forget that a song wasn't found, or that Spotify didn't answer for it, and
        ask once more: for someone who wants to add it. A failure is otherwise kept,
        since asking at every change would be a poll. True when it is asked."""
        pair = cover.names(artist, title)
        known = self._known.get(pair) if pair else None
        if pair is None or pair in self._asking or isinstance(known, cover.Song):
            return False
        self._known.pop(pair, None)
        self.of(artist, title)
        self._changed()
        return True

    async def _ask(self, pair: tuple[str, str]) -> None:
        found: cover.Song | str = self.NOT_FOUND
        try:
            # Several searches at once, and the best of all they find (cover.searches
            # says why). If one fails, the song has that reason, and is looked for
            # again when someone asks.
            answers = await asyncio.gather(
                *(_seek(self.hass, query, ["track"]) for query in cover.searches(pair))
            )
            songs = [
                cover.Song(
                    song.name,
                    _by(song),
                    images[0].url,
                    _by(song.album) if hasattr(song.album, "artists") else "",
                    getattr(song.album, "album_type", ""),
                    getattr(song.album, "release_date", ""),
                    getattr(song, "uri", ""),
                )
                for answer in answers
                for song in _each(answer, "tracks")
                if (images := _images(song))
            ]
            found = cover.best(pair, songs) or self.NOT_FOUND
            if isinstance(found, cover.Song):
                said = "its cover found"
            else:
                # What Spotify did send, each once, so the log shows why none was it.
                sent = dict.fromkeys(f"{s.title!r} by {s.artists!r}" for s in songs)
                said = f"none of {len(songs)} songs is it ({', '.join(sent)})"
            _LOGGER.info("A station's song, %s / %s: %s on Spotify", *pair, said)
            self._why = ""
        except HomeAssistantError as err:
            found = str(err)
            # Said once for each reason, not at every song: a house without Spotify
            # would otherwise fill its log.
            if str(err) != self._why:
                self._why = str(err)
                _LOGGER.warning("No covers for stations' songs: %s", err)
        finally:
            self._asking.discard(pair)
        self._keep(pair, found)
        # Told either way: the page says why a song can't be added until it can.
        self._changed()

    def _keep(self, pair: tuple[str, str], found: cover.Song | str) -> None:
        self._known[pair] = found
        while len(self._known) > self.KEPT:
            del self._known[next(iter(self._known))]


async def _spotify(hass: HomeAssistant, query: str) -> list[dict]:
    # What is found is opened and played through Home Assistant's Spotify integration,
    # by an address that names its entry.
    entries = hass.config_entries.async_loaded_entries(SPOTIFY)
    if not entries:
        raise HomeAssistantError(
            "Home Assistant's Spotify integration isn't set up, and what Spotify "
            "finds is opened through it"
        )
    entry = entries[0]
    found = await _seek(hass, query, ["track", "album", "playlist", "artist"])

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
