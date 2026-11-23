"""Asking a Sonos speaker itself, over UPnP on port 1400, for what Home Assistant's Sonos
integration has no action for, or does differently from what the page offers.

Home Assistant plays a Sonos favourite by clearing the queue first, whatever `enqueue`
says (read in its code, 2026-11-23, after "Add to the end" replaced the owner's queue).
So a favourite is added to the queue here, as the Sonos app does it: its address and
description are read from the speaker's list of favourites and handed to the queue.
"""

from __future__ import annotations

# The standard library's reader: what it reads comes from the owner's own speaker, and
# Home Assistant's Python has expat's guard against entity bombs. defusedxml would be
# the first requirement of any Casa Mia component.
from xml.etree.ElementTree import ParseError, fromstring
from xml.sax.saxutils import escape

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


async def queue_favourite(
    session: aiohttp.ClientSession, host: str, favourite: str, after: int | None
) -> int:
    """Add a Sonos favourite (`FV:2/7`) to the queue of the speaker at `host`, which
    must be its group's coordinator: straight after song number `after`, or at the end
    when that is None. The queue is otherwise left as it is, and nothing starts or
    stops. Gives how many songs were added."""
    found = await call(
        session,
        host,
        "ContentDirectory",
        "Browse",
        ObjectID=favourite.rpartition("/")[0],
        BrowseFlag="BrowseDirectChildren",
        Filter="*",
        StartingIndex=0,
        RequestedCount=PAGE,
        SortCriteria="",
    )
    try:
        items = fromstring(found.get("Result") or "<none/>").iter(f"{DIDL}item")
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
        EnqueuedURIMetaData=item.findtext(f"{SONOS}resMD") or "",
        DesiredFirstTrackNumberEnqueued=after + 1 if after else 0,
        EnqueueAsNext=int(bool(after)),
    )
    return int(added.get("NumTracksAdded") or 0)
