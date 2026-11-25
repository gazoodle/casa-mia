"""A speaker's queue and what it is playing: songs moved, taken out and put back, the
queue saved as a playlist, and the music stopped, read and started again."""

from __future__ import annotations

import logging
from xml.etree.ElementTree import ParseError, fromstring

import aiohttp
from homeassistant.exceptions import HomeAssistantError

from .common import DC, DIDL, OWN_QUEUE, QUEUE, UPNP, _described, _listed, call
from .listing import _seconds

_LOGGER = logging.getLogger(__name__)


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
