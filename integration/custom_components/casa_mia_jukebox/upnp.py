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

# The standard library's reader: what it reads comes from the owner's own speaker, and
# Home Assistant's Python has expat's guard against entity bombs. defusedxml would be
# the first requirement of any Casa Mia component.
from xml.etree.ElementTree import Element, ParseError, fromstring
from xml.sax.saxutils import escape, quoteattr

import aiohttp
from homeassistant.exceptions import HomeAssistantError

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
# How many favourites are read at once.
# ponytail: one page. Read on from the answer's TotalMatches if a house saves more.
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
    found = await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=favourite.rpartition("/")[0] or SAVED_QUEUES,
        BrowseFlag="BrowseDirectChildren",
        Filter="*",
        StartingIndex=0,
        RequestedCount=PAGE,
        SortCriteria="",
    )
    try:
        # A favourite is an item in the answer, a playlist a container.
        items = fromstring(found.get("Result") or "<none/>").iter()
        item = next((i for i in items if i.get("id") == favourite), None)
    except (ParseError, ValueError) as err:
        raise HomeAssistantError("The speaker's favourites couldn't be read") from err
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


async def queue(session: aiohttp.ClientSession, host: str) -> dict[str, object]:
    """The queue of the speaker at `host`, in order: each song's title, artist, album
    and length in seconds, and how many songs there are in all."""
    found = await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=QUEUE,
        BrowseFlag="BrowseDirectChildren",
        Filter="*",
        StartingIndex=0,
        # ponytail: the first page only, and the page is told how many there are in
        # all. Read on from StartingIndex when someone queues more than this.
        RequestedCount=PAGE,
        SortCriteria="",
    )
    try:
        items = list(fromstring(found.get("Result") or "<none/>").iter(f"{DIDL}item"))
    except (ParseError, ValueError) as err:
        raise HomeAssistantError("The speaker's queue couldn't be read") from err
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
        }
        for item in items
    ]
    return {"songs": songs, "total": int(found.get("TotalMatches") or len(songs))}


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


async def save(session: aiohttp.ClientSession, host: str, name: str) -> str:
    """Save the queue as a new Sonos playlist called `name`, and give its id (`SQ:3`).
    A playlist that already has the name is left as it is: Sonos allows two."""
    saved = await call(
        session, host, "AVTransport", "SaveQueue", InstanceID=0, Title=name, ObjectID=""
    )
    return saved.get("AssignedObjectID", "")


async def delete_playlist(
    session: aiohttp.ClientSession, host: str, playlist: str
) -> None:
    """Delete a Sonos playlist (`SQ:3`) from the system, for good."""
    await call(session, host, "ContentDirectory", "DestroyObject", ObjectID=playlist)
