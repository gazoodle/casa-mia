"""How a speaker is asked anything, and how what it lists is read and written back: the
request itself, its lists a page at a time, and a song's description as the speaker
writes it. The parts of the package are built on this."""

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
# Where a speaker keeps the Sonos playlists, and its favourites.
SAVED_QUEUES = "SQ:"
FAVOURITES = "FV:2"
QUEUE = "Q:0"
# How the name of a playlist starts that is a party's copy of its queue (party.py), kept
# by the speaker for Jukebox: not one of the household's, so it isn't listed with them.
COPY = "Jukebox party copy"
# The queue as it was before Jukebox replaced or cleared it, for a while (undo.py).
UNDO = "Jukebox undo copy"
# Jukebox's own copies, which are never listed as playlists or saved over.
COPIES = (COPY, UNDO)
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
    session: aiohttp.ClientSession,
    host: str,
    what: str,
    name: str,
    count: int = PAGE,
    start: int = 0,
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
        StartingIndex=start,
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


# ponytail: the most songs of one list that are read. A longer list is shown and tidied
# as far as this, and the page says how many more there are.
MOST = 2000


async def _everything(
    session: aiohttp.ClientSession, host: str, what: str, name: str
) -> tuple[list[Element], int]:
    """As `_listed`, with every page of a long list, up to MOST."""
    listed, total = await _listed(session, host, what, name)
    while len(listed) < min(total, MOST):
        more, total = await _listed(session, host, what, name, start=len(listed))
        if not more:
            break
        listed += more
    return listed[:MOST], total


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
