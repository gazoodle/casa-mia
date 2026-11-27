"""What is asked of the feed from outside: an action carried out and logged, the
queue and the favourites read, and a favourite played by name."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .. import art, find, may, upnp
from ..announce import address
from ..may import Who
from .common import FAVOURITE, NEW_MUSIC, PLAYLISTS, Refused
from .doing import ACTIONS, _Doing
from .model import Feed

_LOGGER = logging.getLogger(__name__)


async def do(
    feed: Feed, who: Who, action: str, entity: str, data: dict[str, Any]
) -> dict[str, Any] | None:
    """Carry out one thing the page asked for, and write down who asked. Raises
    HomeAssistantError, with the reason, when it can't be done, or when this asker may
    not do it while a party is on (may.py)."""
    doing = _Doing(
        feed.hass,
        feed.model(),
        entity,
        data,
        feed.parties,
        feed.curator,
        feed.covers,
        feed.undo,
    )
    party = feed.parties.led_by(doing.group["id"])
    # The addresses of what is played stay out of the log: a link can carry a key.
    said = {k: v for k, v in data.items() if k != "media_content_id"}
    try:
        opened = bool(party and party.open)
        partying = feed.parties.on
        if why := may.refusal(who, action, party is not None, opened, partying):
            raise Refused(why)
        if party is None or action in may.PARTY:
            await ACTIONS[action](doing)
        else:
            # Held while the speakers are asked and the party's copy is renewed, so
            # that this is never compared as if a guest had done it.
            async with party.lock:
                await ACTIONS[action](doing)
                await party.own(action, doing)
    except HomeAssistantError as err:
        _LOGGER.warning("%s: %s in %s %s failed: %s", who, action, entity, said, err)
        raise
    if doing.source is not None:
        feed.sources[doing.group["id"]] = doing.source
        feed._changed()
    if action in NEW_MUSIC:
        feed.renewed(doing.group["id"])
    _LOGGER.info("%s: %s in %s %s %s", who, action, entity, said, doing.result or "")
    return doing.result


async def queue(feed: Feed, entity: str, playlist: str = "") -> dict[str, Any]:
    """The queue of the group `entity` is in, or the songs of a Sonos playlist, read
    through that group's speaker (upnp.queue)."""
    doing = _Doing(feed.hass, feed.model(), entity, {}, feed.parties)
    if playlist and not playlist.startswith(upnp.SAVED_QUEUES):
        raise Refused("Only a Sonos playlist's songs can be listed")
    found = await upnp.queue(*doing._speaker(), playlist or upnp.QUEUE)
    for song in found["songs"]:
        song["picture"] = art.shown(feed.art_key, doing.group["id"], song["picture"])
    return found


async def favourites(hass: HomeAssistant, entity: str) -> list[dict[str, Any]]:
    """The Sonos favourites and playlists, as one list: each with the folder Sonos keeps
    it in (playlists, radio, tracks), its picture, and the address `play_media` takes
    back. The favourites are Home Assistant's; the playlists are read from the speaker,
    since Home Assistant's list of those goes out of date (upnp.playlists)."""

    async def browse(**what: str) -> list[dict[str, Any]]:
        node = await find.ask(hass, entity, "browse_media", **what)
        return node.get("children") or []

    def one(folder: str, title: str, id: str, **more: Any) -> dict[str, Any]:
        return {
            "folder": folder,
            "title": title,
            "live": False,
            "playlist": False,
            "picture": None,
            "media_content_id": id,
            "media_content_type": FAVOURITE,
            **more,
        }

    items, pictures = [], {}
    for folder in await browse(media_content_type="favorites", media_content_id=""):
        for item in await browse(
            media_content_type=folder["media_content_type"],
            media_content_id=folder["media_content_id"],
        ):
            id = item["media_content_id"]
            if id.startswith(upnp.SAVED_QUEUES):
                # A playlist as Home Assistant last knew it: only its picture is kept.
                pictures[id] = item.get("thumbnail")
            elif item.get("can_play"):
                items.append(
                    one(
                        folder["title"],
                        item["title"],
                        id,
                        # A station (Sonos files those as a genre) plays at once and
                        # leaves the queue alone; the rest is lined up in it.
                        live=item["media_class"] == "genre",
                        picture=item.get("thumbnail"),
                        media_content_type=item["media_content_type"],
                    )
                )

    host = address(hass, entity)
    if host is None:
        raise Refused("Home Assistant has no address for this speaker")
    playlists = [
        one(
            PLAYLISTS, p["title"], p["id"], playlist=True, picture=pictures.get(p["id"])
        )
        for p in await upnp.playlists(async_get_clientsession(hass), host)
        if not p["title"].startswith(upnp.COPIES)
    ]
    # The playlists lead, in their folder with any favourite that is a playlist too.
    return (
        playlists
        + [item for item in items if item["folder"] == PLAYLISTS]
        + [item for item in items if item["folder"] != PLAYLISTS]
    )


async def play(
    feed: Feed, who: Who, rooms: list[str], name: str, enqueue: str | None
) -> None:
    """Play a favourite or a Sonos playlist, by its name, in these rooms together: the
    `play` action, for a dashboard button, an automation or a voice command. It goes
    the way the page's own requests go (`do`), so it is logged with who asked and a
    party doesn't take it for a guest's change. The first room leads; the others join
    it. Without `enqueue` it plays now."""
    leader, *others = rooms
    wanted = name.strip().casefold()
    found = await favourites(feed.hass, leader)
    match = next((f for f in found if f["title"].strip().casefold() == wanted), None)
    if match is None:
        raise Refused(f"Sonos has no favourite or playlist called '{name.strip()}'")

    for room in others:
        await do(feed, who, "join", leader, {"room": room})
    what = {key: match[key] for key in ("media_content_id", "media_content_type")}
    # A station has no place in a queue: it plays now, whatever was asked.
    where = {"enqueue": enqueue} if enqueue and not match["live"] else {}
    await do(feed, who, "play_media", leader, {**what, **where})
