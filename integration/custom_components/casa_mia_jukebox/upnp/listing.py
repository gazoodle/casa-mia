"""Reading what a speaker lists: its queue, its favourites, its playlists and the music
library, and a favourite put into the queue as the speaker lists it."""

from __future__ import annotations

from typing import Any
from xml.etree.ElementTree import Element
from xml.sax.saxutils import escape, quoteattr

import aiohttp
from homeassistant.exceptions import HomeAssistantError

from ..playable import FILE
from .common import (
    ABOUT,
    DC,
    DIDL,
    MOST,
    QUEUE,
    SAVED_QUEUES,
    SONOS,
    UPNP,
    _everything,
    _glance,
    _listed,
    call,
)


def _about(item: Element) -> str:
    """What the queue is told about a playlist. A favourite carries its own description
    (`resMD`); a playlist has none, so it is written as Sonos's own apps write it."""
    return ABOUT.format(
        id=quoteattr(item.get("id") or ""),
        parent=quoteattr(item.get("parentID") or ""),
        title=escape(item.findtext(f"{DC}title") or ""),
        kind=escape(
            item.findtext(f"{UPNP}class") or "object.container.playlistContainer"
        ),
    )


async def favourite_item(
    session: aiohttp.ClientSession, host: str, favourite: str
) -> tuple[Element, str]:
    """A Sonos favourite (`FV:2/7`) or playlist (`SQ:3`) as the speaker lists it, and
    the address it plays from."""
    listed, _ = await _listed(
        session, host, favourite.rpartition("/")[0] or SAVED_QUEUES, "favourites"
    )
    item = next((i for i in listed if i.get("id") == favourite), None)
    address = item.findtext(f"{DIDL}res") if item is not None else None
    if item is None or not address:
        raise HomeAssistantError("Sonos doesn't have that favourite any more")
    return item, address


def named(item: Element) -> tuple[str, str | None]:
    """What a thing a speaker lists is called, and its picture as the speaker
    addresses it."""
    return item.findtext(f"{DC}title") or "", item.findtext(f"{UPNP}albumArtURI")


async def library(
    session: aiohttp.ClientSession, host: str, place: str, deep: int = 2
) -> list[dict[str, Any]]:
    """Every song in one place of the music library (`A:ALBUM/…`), in order, as
    `detailed` gives a playlist's. A place that holds other places (an artist's
    albums) is read `deep` levels down. An artist is listed with an "All" beside the
    albums, so a song met twice is kept once."""
    items, _ = await _everything(session, host, place, "music library")
    songs: dict[str, dict[str, Any]] = {}
    for item in items:
        if item.tag != f"{DIDL}container":
            song = _song(item)
            songs.setdefault(song["address"], song)
        elif deep > 1 and len(songs) < MOST:
            for song in await library(session, host, item.get("id") or "", deep - 1):
                songs.setdefault(song["address"], song)
    return list(songs.values())[:MOST]


async def queue_favourite(
    session: aiohttp.ClientSession, host: str, favourite: str, after: int | None
) -> int:
    """Add a Sonos favourite (`FV:2/7`), or a Sonos playlist (`SQ:3`: Home Assistant
    lists those among the favourites), to the queue of the speaker at `host`, which
    must be its group's coordinator: straight after song number `after`, or at the end
    when that is None. The queue is otherwise left as it is, and nothing starts or
    stops. Gives how many songs were added."""
    item, address = await favourite_item(session, host, favourite)
    added = await call(
        session,
        host,
        "AVTransport",
        "AddURIToQueue",
        InstanceID=0,
        EnqueuedURI=address,
        EnqueuedURIMetaData=item.findtext(f"{SONOS}resMD") or _about(item),
        DesiredFirstTrackNumberEnqueued=after + 1 if after else 0,
        EnqueueAsNext=int(bool(after)),
    )
    return int(added.get("NumTracksAdded") or 0)


def _seconds(length: str | None) -> int | None:
    """A song's length as the speaker writes it, `0:03:14`."""
    try:
        hours, minutes, seconds = (length or "").split(":")
        return int(hours) * 3600 + int(minutes) * 60 + int(float(seconds))
    except ValueError:
        return None


def _source(address: str) -> str:
    """Where a song is from, for the page to say: the music library, Spotify, or
    another streaming service."""
    if address.startswith(FILE):
        return "library"
    return "spotify" if "spotify" in address else "streamed" if address else ""


def _song(item: Element) -> dict[str, Any]:
    res = item.find(f"{DIDL}res")
    track = item.findtext(f"{UPNP}originalTrackNumber") or ""
    address = (res.text or "") if res is not None else ""
    return {
        "title": item.findtext(f"{DC}title") or "",
        "artist": item.findtext(f"{DC}creator") or "",
        "album": item.findtext(f"{UPNP}album") or "",
        "duration": _seconds(res.get("duration") if res is not None else None),
        "picture": item.findtext(f"{UPNP}albumArtURI") or None,
        "source": _source(address),
        # For tidying a playlist (tidy.py); not sent to the page.
        "address": address,
        "track": int(track) if track.isdigit() else None,
    }


async def detailed(
    session: aiohttp.ClientSession, host: str, playlist: str
) -> list[dict[str, Any]]:
    """Every song of a Sonos playlist, in order, with what tidying it goes by: its
    address, and its track number where the speaker has one."""
    items, _ = await _everything(session, host, playlist, "playlist")
    return [_song(item) for item in items]


async def queue(
    session: aiohttp.ClientSession, host: str, what: str = QUEUE
) -> dict[str, Any]:
    """The queue of the speaker at `host`, or the Sonos playlist `what` (`SQ:3`), in
    order: each song's title, artist, album, length in seconds, picture (as the
    speaker addresses it: art.py) and where it is from, and how many songs there are
    in all."""
    items, total = await _everything(session, host, what, "queue")
    mine = ("address", "track")
    songs = [{k: v for k, v in _song(i).items() if k not in mine} for i in items]
    return {"songs": songs, "total": total}


async def covers(session: aiohttp.ClientSession, host: str, playlist: str) -> list[str]:
    """The pictures of a Sonos playlist's first songs, one for each album among them,
    as the speaker addresses them: what its tile is made of. Every song has a picture
    address of its own, even two of one album, so they are told apart by the album."""
    listed, _ = await _listed(session, host, playlist, "playlist", count=16)
    found: dict[str, str] = {}
    for item in listed:
        if picture := item.findtext(f"{UPNP}albumArtURI"):
            found.setdefault(item.findtext(f"{UPNP}album") or picture, picture)
    return list(found.values())


async def size(session: aiohttp.ClientSession, host: str) -> int:
    """How many songs the queue holds, without listing them."""
    return int((await _glance(session, host, QUEUE)).get("TotalMatches") or 0)


async def playlists(session: aiohttp.ClientSession, host: str) -> list[dict[str, str]]:
    """The Sonos playlists as the speaker has them now: each one's id (`SQ:3`) and
    title. Home Assistant's own list of them is renewed only when a favourite changes,
    so a playlist saved or deleted since isn't in it (seen 2026-11-23)."""
    listed, _ = await _listed(session, host, SAVED_QUEUES, "playlists")
    return [
        {"id": item.get("id") or "", "title": item.findtext(f"{DC}title") or ""}
        for item in listed
    ]
