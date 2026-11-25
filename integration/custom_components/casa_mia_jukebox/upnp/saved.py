"""Changing a Sonos playlist where the speaker keeps it: its songs moved, taken out and
added to."""

from __future__ import annotations

import re
from urllib.parse import quote
from xml.etree.ElementTree import ParseError, fromstring
from xml.sax.saxutils import escape, quoteattr

import aiohttp
from homeassistant.exceptions import HomeAssistantError

from .. import tidy
from ..playable import FILE
from .common import (
    ABOUT,
    DC,
    DIDL,
    _described,
    _everything,
    _glance,
    _listed,
    call,
)

# ---- Changing a Sonos playlist where it is kept. A playlist's songs are numbered from 0
# by the speaker; here, as everywhere in Jukebox, from 1.
# Tried on a real speaker, 2026-11-24. Each change must name the playlist's change
# number as it stands (`_changes`): one that is out of date is refused, error 1028.


async def changes(session: aiohttp.ClientSession, host: str, playlist: str) -> int:
    """A playlist's change number: 0 when made, and one more after each change."""
    return int((await _glance(session, host, playlist)).get("UpdateID") or 0)


async def _reorder(
    session: aiohttp.ClientSession,
    host: str,
    playlist: str,
    song: int | str,
    to: str,
) -> None:
    """One request to move or take out songs of a playlist. `song` is one song's
    number, or several songs' places counted from 0, with commas."""
    await call(
        session,
        host,
        "AVTransport",
        "ReorderTracksInSavedQueue",
        InstanceID=0,
        ObjectID=playlist,
        UpdateID=await changes(session, host, playlist),
        TrackList=song - 1 if isinstance(song, int) else song,
        NewPositionList=to,
    )


async def playlist_arrange(
    session: aiohttp.ClientSession, host: str, playlist: str, order: list[int]
) -> None:
    """Put a Sonos playlist's songs in a new order: `order` is where each song is now,
    counted from 0, in the order wanted (tidy.py says how a speaker takes that)."""
    for tracks, places in tidy.steps(order):
        named = ",".join(map(str, tracks))
        await _reorder(session, host, playlist, named, ",".join(map(str, places)))


async def playlist_drop(
    session: aiohttp.ClientSession, host: str, playlist: str, songs: list[int]
) -> None:
    """Take several songs out of a Sonos playlist at once, by their places counted
    from 0 (a real speaker, 2026-11-24). The last of them first, a few at a time, so
    that the places of those still to go don't change."""
    last_first = sorted(songs, reverse=True)
    for start in range(0, len(last_first), tidy.EACH):
        named = ",".join(map(str, sorted(last_first[start : start + tidy.EACH])))
        await _reorder(session, host, playlist, named, "")


async def playlist_move(
    session: aiohttp.ClientSession, host: str, playlist: str, song: int, to: int
) -> None:
    """Move song number `song` of a Sonos playlist to be number `to`."""
    await _reorder(session, host, playlist, song, str(to - 1))


async def playlist_remove(
    session: aiohttp.ClientSession, host: str, playlist: str, song: int
) -> None:
    """Take song number `song` out of a Sonos playlist: no new place for it."""
    await _reorder(session, host, playlist, song, "")


# Spotify as Sonos numbers it among its music services, and how each kind of thing from
# Spotify is addressed and described to a speaker: what its address starts with, what
# its id starts with, and its class. As SoCo's share links have them, which is how Home
# Assistant's Sonos integration queues a Spotify song. The speaker picks the account.
# ponytail: 2311 is Spotify outside the United States (3079 there). Read it from a
# Spotify song already in a queue (its `sid`, times 256, plus 7) if that is ever wanted.
SPOTIFY = 2311
_SPOTIFY = {
    "track": ("", "00032020", "object.item.audioItem.musicTrack"),
    "album": (
        "x-rincon-cpcontainer:1004206c",
        "00040000",
        "object.container.album.musicAlbum",
    ),
    "playlist": (
        "x-rincon-cpcontainer:1006206c",
        "1006206c",
        "object.container.playlistContainer",
    ),
}


def spotify(thing: str, title: str = "") -> tuple[str, str] | None:
    """The address and description a speaker takes for something from Spotify
    (`…spotify:track:4uLU6h…`), or None when it isn't a song, an album or a playlist
    of Spotify's."""
    found = re.search(r"spotify:(track|album|playlist):(\w+)", thing)
    if not found:
        return None
    start, key, kind = _SPOTIFY[found[1]]
    named = quote(found[0], safe="")
    about = (
        '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
        ' xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/"'
        ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
        f'<item id="{key}{named}" restricted="true"><dc:title>{escape(title)}</dc:title>'
        f"<upnp:class>{kind}</upnp:class>"
        '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">'
        f"SA_RINCON{SPOTIFY}_X_#Svc{SPOTIFY}-0-Token</desc></item></DIDL-Lite>"
    )
    return start + named, about


async def playlist_add(
    session: aiohttp.ClientSession,
    host: str,
    playlist: str,
    thing: str,
    title: str = "",
    to: int | None = None,
) -> None:
    """Add something to a Sonos playlist, to be its song number `to` (an album's songs
    from there on), or at its end without one. From the music library: a song, by
    the address of its file, or an album, artist or the like by the speaker's id for
    it (`A:ALBUM/…`); the speaker is asked for its own description of the thing, which
    is what it is then given. From Spotify: a song, an album or a playlist (`spotify`),
    with `title` to list it by."""
    if streamed := spotify(thing, title):
        await _add_to(session, host, playlist, *streamed, to)
        return
    if thing.startswith(FILE):
        await _add_to(session, host, playlist, thing, _filed(thing, title), to)
        return
    found = await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=thing,
        BrowseFlag="BrowseMetadata",
        Filter="*",
        StartingIndex=0,
        RequestedCount=1,
        SortCriteria="",
    )
    try:
        item = next(
            e for e in fromstring(found.get("Result") or "<none/>") if e.get("id")
        )
    except (ParseError, ValueError, StopIteration) as err:
        raise HomeAssistantError("The speaker couldn't describe that") from err
    address = item.findtext(f"{DIDL}res")
    if not address:
        raise HomeAssistantError("The speaker gave no address for that")
    await _add_to(session, host, playlist, address, _described(item), to)


def _filed(address: str, title: str) -> str:
    """A song of the music library, by its file, as a playlist is told of it. The
    speaker lists the same file as `S://…`, and won't describe one song when asked (a
    real speaker, 2026-11-24), so it is given the short description Sonos's own apps
    give, and looks the rest up in its library."""
    return ABOUT.format(
        id=quoteattr("S:" + address.partition(":")[2]),
        parent=quoteattr("A:TRACKS"),
        title=escape(title),
        kind="object.item.audioItem.musicTrack",
    )


async def playlist_send(
    session: aiohttp.ClientSession,
    host: str,
    playlist: str,
    song: int,
    called: str,
    into: str,
    keep: bool = False,
    again: bool = True,
) -> bool:
    """Move song number `song` of a Sonos playlist to the end of the playlist `into`,
    or copy it there with `keep`. It is added there before it is taken out here: a
    failure between the two leaves it in both, never in neither. Without `again`, a
    song that `into` holds already is left where it is, and the answer is False.

    `called` is the start of the song's title as the asker saw it. The song is asked
    for by its number, and the playlist may have been changed since the asker's list
    was read: a different song at that number is refused, not moved."""
    listed, _ = await _listed(session, host, playlist, "playlist", 1, song - 1)
    item = listed[0] if listed else None
    address = item.findtext(f"{DIDL}res") if item is not None else None
    title = (item.findtext(f"{DC}title") or "") if item is not None else ""
    if item is None or not address or not title.startswith(called):
        raise HomeAssistantError(
            "The playlist has changed since it was listed, and that song isn't "
            "where it was. Nothing was changed."
        )

    # A streamed song keeps everything the speaker said of it: given less, a song put
    # back into the queue lost its names (`_described`).
    if not again and await holds(session, host, into, address):
        return False
    about = _filed(address, title) if address.startswith(FILE) else _described(item)
    await _add_to(session, host, into, address, about, None)
    if keep:
        return True
    try:
        await playlist_remove(session, host, playlist, song)
    except HomeAssistantError as err:
        # Said as it is: the song is in both, and the asker can take one out.
        raise HomeAssistantError(
            f"The song was added to the other playlist, but couldn't be taken out "
            f"of this one, so it is in both ({err})"
        ) from err
    return True


# Spotify's id for a song, as a speaker writes it in a playlist's address
# (`x-sonos-spotify:spotify%3atrack%3a…`) and as Spotify does (`spotify:track:…`).
_SPOTIFY_SONG = re.compile(r"spotify(?::|%3a)track(?::|%3a)(\w+)", re.IGNORECASE)


def _same(address: str) -> str:
    """What tells one song from another however its address is written: Spotify's id
    for it, or the address itself."""
    found = _SPOTIFY_SONG.search(address)
    return f"spotify:track:{found[1]}" if found else address


async def holds(
    session: aiohttp.ClientSession, host: str, playlist: str, address: str
) -> bool:
    """Whether a Sonos playlist has this song in it already."""
    items, _ = await _everything(session, host, playlist, "playlist")
    song = _same(address)
    return any(_same(item.findtext(f"{DIDL}res") or "") == song for item in items)


async def playlist_new(session: aiohttp.ClientSession, host: str, name: str) -> str:
    """Make an empty Sonos playlist called `name`, and give its id (`SQ:7`): the
    speaker's request for making one from something, with nothing named, as SoCo's
    `create_sonos_playlist` makes one. Not tried on a real speaker (2026-11-25)."""
    made = await call(
        session,
        host,
        "AVTransport",
        "CreateSavedQueue",
        InstanceID=0,
        Title=name,
        EnqueuedURI="",
        EnqueuedURIMetaData="",
    )
    if not (playlist := made.get("AssignedObjectID", "")):
        raise HomeAssistantError("The speaker made no playlist, and didn't say why")
    return playlist


async def _add_to(
    session: aiohttp.ClientSession,
    host: str,
    playlist: str,
    address: str,
    about: str,
    to: int | None,
) -> None:
    await call(
        session,
        host,
        "AVTransport",
        "AddURIToSavedQueue",
        InstanceID=0,
        ObjectID=playlist,
        UpdateID=await changes(session, host, playlist),
        EnqueuedURI=address,
        EnqueuedURIMetaData=about,
        # Counted from 0 by the speaker, and an album goes in whole at that place
        # (a real speaker, 2026-11-24); or Sonos's own number for "at the end".
        AddAtIndex=to - 1 if to else 4294967295,
    )
