"""Asking a Sonos speaker itself, over UPnP on port 1400, for what Home Assistant's Sonos
integration has no action for, or does differently from what the page offers.

The queue is read, and a song in it moved or taken out, here: Home Assistant can't
move one, and its reading of the queue has no lengths.

Home Assistant plays a Sonos favourite by clearing the queue first, whatever `enqueue`
says (read in its code, 2026-11-23, after "Add to the end" replaced the owner's queue).
So a favourite is added to the queue here, as the Sonos app does it: its address and
description are read from the speaker's list of favourites and handed to the queue.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import quote

# The standard library's reader: what it reads comes from the owner's own speaker, and
# Home Assistant's Python has expat's guard against entity bombs. defusedxml would be
# the first requirement of any Casa Mia component.
from xml.etree.ElementTree import Element, ParseError, fromstring
from xml.sax.saxutils import escape, quoteattr

import aiohttp
from homeassistant.exceptions import HomeAssistantError

_LOGGER = logging.getLogger(__name__)
PORT = 1400
# Seconds for the speaker to answer. A long playlist takes a while to add.
ANSWER = 30
PATHS = {
    "AVTransport": "MediaRenderer/AVTransport",
    "ContentDirectory": "MediaServer/ContentDirectory",
}
ENVELOPE = (
    '<?xml version="1.0" encoding="utf-8"?>'
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"'
    ' s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>'
    '<u:{action} xmlns:u="urn:schemas-upnp-org:service:{service}:1">{args}</u:{action}>'
    "</s:Body></s:Envelope>"
)
DIDL = "{urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/}"
SONOS = "{urn:schemas-rinconnetworks-com:metadata-1-0/}"
DC = "{http://purl.org/dc/elements/1.1/}"
UPNP = "{urn:schemas-upnp-org:metadata-1-0/upnp/}"
# Where a speaker keeps the Sonos playlists.
SAVED_QUEUES = "SQ:"
QUEUE = "Q:0"
# How the name of a playlist starts that is a party's copy of its queue (party.py), kept
# by the speaker for Jukebox: not one of the household's, so it isn't listed with them.
COPY = "Jukebox party copy"
# How a speaker names its own queue as what it plays from.
OWN_QUEUE = "x-rincon-queue:"
ABOUT = (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
    ' xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/"'
    ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
    '<item id={id} parentID={parent} restricted="true"><dc:title>{title}</dc:title>'
    "<upnp:class>{kind}</upnp:class>"
    '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">'
    "RINCON_AssociatedZPUDN</desc></item></DIDL-Lite>"
)
ERROR = ".//{urn:schemas-upnp-org:control-1-0}errorCode"
# How many of anything a speaker lists are read at once (_listed).
PAGE = 500


async def call(
    session: aiohttp.ClientSession, host: str, service: str, action: str, **args: object
) -> dict[str, str]:
    """One UPnP action on a speaker, and what it answered. Raises HomeAssistantError,
    with the speaker's own error number, when it is refused or goes unanswered."""
    body = ENVELOPE.format(
        action=action,
        service=service,
        args="".join(f"<{k}>{escape(str(v))}</{k}>" for k, v in args.items()),
    )
    try:
        async with session.post(
            f"http://{host}:{PORT}/{PATHS[service]}/Control",
            data=body.encode(),
            headers={
                "Content-Type": 'text/xml; charset="utf-8"',
                "SOAPACTION": f'"urn:schemas-upnp-org:service:{service}:1#{action}"',
            },
            timeout=aiohttp.ClientTimeout(total=ANSWER),
        ) as response:
            status, text = response.status, await response.text()
        root = fromstring(text)
    except (aiohttp.ClientError, TimeoutError, ParseError, ValueError) as err:
        raise HomeAssistantError(
            f"The speaker didn't answer {action} ({err or type(err).__name__})"
        ) from err

    if status != 200:
        code = root.findtext(ERROR) or f"HTTP {status}"
        raise HomeAssistantError(f"The speaker refused {action} (error {code})")
    answer = root.find(
        f".//{{urn:schemas-upnp-org:service:{service}:1}}{action}Response"
    )
    return {part.tag: part.text or "" for part in answer} if answer is not None else {}


async def _listed(
    session: aiohttp.ClientSession, host: str, what: str, name: str, count: int = PAGE
) -> tuple[list[Element], int]:
    """What a speaker lists under `what` (its queue, favourites or playlists): each
    thing listed, a favourite or a song as an item and a playlist as a container, and
    how many there are in all."""
    found = await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=what,
        BrowseFlag="BrowseDirectChildren",
        Filter="*",
        StartingIndex=0,
        # ponytail: the first page only, and the caller is told how many there are in
        # all. Read on from StartingIndex when a list is longer than this.
        RequestedCount=count,
        SortCriteria="",
    )
    try:
        listed = [
            e for e in fromstring(found.get("Result") or "<none/>") if e.get("id")
        ]
    except (ParseError, ValueError) as err:
        raise HomeAssistantError(f"The speaker's {name} couldn't be read") from err
    return listed, int(found.get("TotalMatches") or len(listed))


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


async def queue_favourite(
    session: aiohttp.ClientSession, host: str, favourite: str, after: int | None
) -> int:
    """Add a Sonos favourite (`FV:2/7`), or a Sonos playlist (`SQ:3`: Home Assistant
    lists those among the favourites), to the queue of the speaker at `host`, which
    must be its group's coordinator: straight after song number `after`, or at the end
    when that is None. The queue is otherwise left as it is, and nothing starts or
    stops. Gives how many songs were added."""
    listed, _ = await _listed(
        session, host, favourite.rpartition("/")[0] or SAVED_QUEUES, "favourites"
    )
    item = next((i for i in listed if i.get("id") == favourite), None)
    address = item.findtext(f"{DIDL}res") if item is not None else None
    if item is None or not address:
        raise HomeAssistantError("Sonos doesn't have that favourite any more")

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


async def queue(
    session: aiohttp.ClientSession, host: str, what: str = QUEUE
) -> dict[str, object]:
    """The queue of the speaker at `host`, or the Sonos playlist `what` (`SQ:3`), in
    order: each song's title, artist, album, length in seconds and picture (as the
    speaker addresses it: art.py), and how many songs there are in all."""
    items, total = await _listed(session, host, what, "queue")
    songs = [
        {
            "title": item.findtext(f"{DC}title") or "",
            "artist": item.findtext(f"{DC}creator") or "",
            "album": item.findtext(f"{UPNP}album") or "",
            "duration": _seconds(
                res.get("duration")
                if (res := item.find(f"{DIDL}res")) is not None
                else None
            ),
            "picture": item.findtext(f"{UPNP}albumArtURI") or None,
        }
        for item in items
    ]
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


# ---- Changing a Sonos playlist where it is kept. A playlist's songs are numbered from 0
# by the speaker; here, as everywhere in Jukebox, from 1.
# Tried on a real speaker, 2026-11-24. Each change must name the playlist's change
# number as it stands (`_changes`): one that is out of date is refused, error 1028.


async def _changes(session: aiohttp.ClientSession, host: str, playlist: str) -> int:
    """A playlist's change number: 0 when made, and one more after each change."""
    return int((await _glance(session, host, playlist)).get("UpdateID") or 0)


async def _glance(
    session: aiohttp.ClientSession, host: str, what: str
) -> dict[str, str]:
    """What a speaker says of a list without listing it: how many it holds
    (`TotalMatches`) and its change number (`UpdateID`)."""
    return await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=what,
        BrowseFlag="BrowseDirectChildren",
        Filter="*",
        StartingIndex=0,
        RequestedCount=1,
        SortCriteria="",
    )


async def _reorder(
    session: aiohttp.ClientSession, host: str, playlist: str, song: int, to: str
) -> None:
    await call(
        session,
        host,
        "AVTransport",
        "ReorderTracksInSavedQueue",
        InstanceID=0,
        ObjectID=playlist,
        UpdateID=await _changes(session, host, playlist),
        TrackList=song - 1,
        NewPositionList=to,
    )


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
    if thing.startswith("x-file-cifs:"):
        # A song's file. The speaker lists the same file as `S://…`, and won't describe
        # one song when asked (a real speaker, 2026-11-24), so it is given the short
        # description Sonos's own apps give, and looks the rest up in its library.
        about = ABOUT.format(
            id=quoteattr("S:" + thing.partition(":")[2]),
            parent=quoteattr("A:TRACKS"),
            title=escape(title),
            kind="object.item.audioItem.musicTrack",
        )
        await _add_to(session, host, playlist, thing, about, to)
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
        UpdateID=await _changes(session, host, playlist),
        EnqueuedURI=address,
        EnqueuedURIMetaData=about,
        # Counted from 0 by the speaker, and an album goes in whole at that place
        # (a real speaker, 2026-11-24); or Sonos's own number for "at the end".
        AddAtIndex=to - 1 if to else 4294967295,
    )


async def move(session: aiohttp.ClientSession, host: str, song: int, to: int) -> None:
    """Move song number `song` of the queue so that it becomes number `to`."""
    await call(
        session,
        host,
        "AVTransport",
        "ReorderTracksInQueue",
        InstanceID=0,
        StartingIndex=song,
        NumberOfTracks=1,
        # The speaker is told which song to put it in front of, counted before the move.
        InsertBefore=to if to < song else to + 1,
        UpdateID=0,
    )


async def remove(session: aiohttp.ClientSession, host: str, song: int) -> None:
    """Take song number `song` out of the queue."""
    await call(
        session,
        host,
        "AVTransport",
        "RemoveTrackFromQueue",
        InstanceID=0,
        ObjectID=f"{QUEUE}/{song}",
        UpdateID=0,
    )


async def clear(session: aiohttp.ClientSession, host: str) -> None:
    """Empty the queue. What is playing from it stops."""
    await call(session, host, "AVTransport", "RemoveAllTracksFromQueue", InstanceID=0)


async def rest(session: aiohttp.ClientSession, host: str, player: str) -> None:
    """Leave the speaker at `host` playing nothing and with nothing to play: it is set
    to play from its own queue, which stops a station or another app's stream
    (measured 2026-11-23), and the queue is emptied. `player` is the speaker's own id
    (`RINCON_…`), which names its queue."""
    await call(
        session,
        host,
        "AVTransport",
        "SetAVTransportURI",
        InstanceID=0,
        CurrentURI=f"{OWN_QUEUE}{player}#0",
        CurrentURIMetaData="",
    )
    await clear(session, host)


async def save(
    session: aiohttp.ClientSession, host: str, name: str, over: str = ""
) -> str:
    """Save the queue as a new Sonos playlist called `name`, and give its id (`SQ:3`).
    A playlist that already has the name is left as it is: Sonos allows two.

    With `over`, a playlist's id, the queue takes the place of that playlist's songs
    and the id stays. `name` must then be that playlist's own name: with any other the
    speaker refuses (error 402; a real speaker, 2026-11-24)."""
    saved = await call(
        session,
        host,
        "AVTransport",
        "SaveQueue",
        InstanceID=0,
        Title=name,
        ObjectID=over,
    )
    return saved.get("AssignedObjectID", "")


async def delete_playlist(
    session: aiohttp.ClientSession, host: str, playlist: str
) -> None:
    """Delete a Sonos playlist (`SQ:3`) from the system, for good."""
    await call(session, host, "ContentDirectory", "DestroyObject", ObjectID=playlist)


# ---- For the party lock (party.py): what a speaker is playing from, and each song of its
# queue with enough of it kept to put the song back.


async def source(session: aiohttp.ClientSession, host: str) -> tuple[str, str]:
    """What the speaker at `host` plays from, as it names it: its own queue
    (`x-rincon-queue:…`), a station, a line-in, or another app's stream. With it, the
    description the speaker needs to be given it back."""
    told = await call(session, host, "AVTransport", "GetMediaInfo", InstanceID=0)
    return told.get("CurrentURI", ""), told.get("CurrentURIMetaData", "")


async def station(session: aiohttp.ClientSession, host: str) -> tuple[str, str | None]:
    """The station the speaker at `host` is on, as the speaker itself describes it: its
    name and the address of its picture. An empty name where it describes none.

    Home Assistant can lose both while the speaker still has them: for one model of
    speaker it had the name when a station started and none from the next song on
    (seen 2026-11-24)."""
    _, about = await source(session, host)
    if not about.strip().startswith("<"):
        return "", None
    try:
        told = fromstring(about)
    except ParseError as err:
        raise HomeAssistantError(
            f"The speaker's description can't be read: {err}"
        ) from err
    name = told.findtext(f".//{DC}title") or ""
    return name, told.findtext(f".//{UPNP}albumArtURI") or None


async def track(session: aiohttp.ClientSession, host: str) -> int:
    """The number of the song the speaker is at in its queue, from 1."""
    told = await call(session, host, "AVTransport", "GetPositionInfo", InstanceID=0)
    try:
        return int(told.get("Track") or 0)
    except ValueError:
        return 0


async def place(session: aiohttp.ClientSession, host: str) -> tuple[int, int]:
    """Where the speaker is: the number of the song in its queue, from 1, and how many
    seconds into it."""
    told = await call(session, host, "AVTransport", "GetPositionInfo", InstanceID=0)
    try:
        song = int(told.get("Track") or 0)
    except ValueError:
        song = 0
    return song, _seconds(told.get("RelTime")) or 0


async def play_from(
    session: aiohttp.ClientSession,
    host: str,
    uri: str,
    about: str,
    song: int,
    seconds: int = 0,
) -> None:
    """Make the speaker play from `uri` again (see `source`), and when that is its
    queue, from song number `song`, `seconds` into it. A song that can't be moved
    within plays from its start."""
    await call(
        session,
        host,
        "AVTransport",
        "SetAVTransportURI",
        InstanceID=0,
        CurrentURI=uri,
        CurrentURIMetaData=about,
    )
    if uri.startswith(OWN_QUEUE) and song:
        await go_to(session, host, song)
        if seconds:
            clock = f"{seconds // 3600}:{seconds // 60 % 60:02}:{seconds % 60:02}"
            try:
                await call(
                    session,
                    host,
                    "AVTransport",
                    "Seek",
                    InstanceID=0,
                    Unit="REL_TIME",
                    Target=clock,
                )
            except HomeAssistantError as err:
                _LOGGER.info("%s: playing song %s from its start (%s)", host, song, err)
    await call(session, host, "AVTransport", "Play", InstanceID=0, Speed=1)


async def go_to(session: aiohttp.ClientSession, host: str, song: int) -> None:
    """Move to song number `song` of the queue. Nothing starts or stops."""
    await call(
        session, host, "AVTransport", "Seek", InstanceID=0, Unit="TRACK_NR", Target=song
    )


async def songs(session: aiohttp.ClientSession, host: str) -> list[tuple[str, str]]:
    """The queue as (address, description) for each song, in order: what `insert`
    needs to put one back."""
    listed, _ = await _listed(session, host, QUEUE, "queue")
    return [(item.findtext(f"{DIDL}res") or "", _described(item)) for item in listed]


# The names a speaker writes its descriptions with. A description written with any
# others (the standard library's writer makes up `ns0`, `ns1`) reads the same to an XML
# reader, but a streamed song put back with one lost its title, artist and album on a
# real speaker (2026-11-24); a library song didn't, since the speaker looks those up.
_NAMES = {DIDL: "", DC: "dc:", UPNP: "upnp:", SONOS: "r:"}


def _described(item: Element) -> str:
    """One song of a list, as the description `AddURIToQueue` takes: everything the
    speaker said of it, written as the speaker writes it."""

    def named(tag: str) -> str | None:
        space, _, name = tag.rpartition("}")
        prefix = _NAMES.get(space + "}")
        return None if prefix is None else prefix + name

    parts = []
    for child in item:
        name = named(child.tag)
        if name is None:
            continue  # nothing of Sonos's or UPnP's: not known how to write it
        attributes = "".join(f" {k}={quoteattr(v)}" for k, v in child.attrib.items())
        parts.append(f"<{name}{attributes}>{escape(child.text or '')}</{name}>")
    attributes = "".join(f" {k}={quoteattr(v)}" for k, v in item.attrib.items())
    return (
        '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
        ' xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/"'
        ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
        f"<item{attributes}>{''.join(parts)}</item></DIDL-Lite>"
    )


async def playing(session: aiohttp.ClientSession, host: str) -> bool:
    """Whether the speaker at `host` is playing now, or about to."""
    told = await call(session, host, "AVTransport", "GetTransportInfo", InstanceID=0)
    return told.get("CurrentTransportState") in ("PLAYING", "TRANSITIONING")


async def insert(
    session: aiohttp.ClientSession, host: str, song: tuple[str, str], at: int
) -> None:
    """Put a song (from `songs`) into the queue as number `at`."""
    await call(
        session,
        host,
        "AVTransport",
        "AddURIToQueue",
        InstanceID=0,
        EnqueuedURI=song[0],
        EnqueuedURIMetaData=song[1],
        DesiredFirstTrackNumberEnqueued=at,
        EnqueueAsNext=0,
    )
