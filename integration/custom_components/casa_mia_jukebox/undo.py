"""Putting back a queue that Jukebox replaced or cleared.

Before a favourite replaces the queue (`play_media` with `enqueue: "replace"`) or the
queue is cleared, the speaker keeps the queue as a playlist of Jukebox's own
(upnp.keep), and where it was in it is noted. For FOR seconds the page offers to put it
back (`queue_back`); then the copy is deleted. Why (owner, 2026-11-26): replacing the
queue was asked about in the same red as deleting a playlist, although the queue is
easily got back; an undo is worth more than a question.

If the copy can't be made, nothing is replaced or cleared: the page is told why, and the
queue stays as it was. If the replacing fails part-way, the queue is put back at once
(`_Doing._in_place`). In memory only: after a restart there is nothing to put back, and
a copy left behind is replaced, by its name, the next time one is kept.

The page offers a queue back only while the house's model says one is kept for the group
(`has`, pushed at each change): the offer lapses with the copy, and is still there after
a put-back that failed.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import upnp
from .announce import address, room_name
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Seconds a queue can be put back. The page offers it for less (UNDO in big.ts), so that
# the offer never outlives the copy.
FOR = 120


@dataclass
class _Kept:
    copy: str
    # What the speaker played from (upnp.source), and where it was.
    uri: str
    about: str
    song: int
    seconds: int
    playing: bool
    # The playlist the queue held, for the page (Feed.sources).
    source: str
    lapse: asyncio.TimerHandle


class Undo:
    """One kept queue for each group, by its coordinator. `changed` is called when one
    is kept or is no longer, for the page to be told."""

    def __init__(self, hass: HomeAssistant, changed: Callable[[], None]) -> None:
        self.hass = hass
        self._changed = changed
        self._kept: dict[str, _Kept] = {}

    def has(self, group: str) -> bool:
        """Whether a queue is kept for this group, to put back."""
        return group in self._kept

    async def keep(self, doing: Any) -> None:
        """Before the queue of `doing`'s group goes: keep it. Nothing is kept of an
        empty queue."""
        group = doing.group["id"]
        self._lapse(group)
        session, host = doing._speaker()
        try:
            if not await upnp.size(session, host):
                return
            uri, about = await upnp.source(session, host)
            song, seconds = await upnp.place(session, host)
            playing = await upnp.playing(session, host)
            name = f"{upnp.UNDO} ({room_name(self.hass, group)})"
            copy = await upnp.keep(session, host, name)
        except HomeAssistantError as err:
            raise HomeAssistantError(
                "The queue couldn't be kept to put back, so it was left as it is: "
                f"{err}"
            ) from err

        lapse = self.hass.loop.call_later(FOR, self._lapse, group)
        source = doing.group.get("source") or ""
        self._kept[group] = _Kept(
            copy, uri, about, song, seconds, playing, source, lapse
        )
        _LOGGER.info(
            "%s: the queue is kept as %s for %s s, to put back", group, copy, FOR
        )
        self._changed()

    async def back(self, doing: Any) -> None:
        """Put the kept queue back in place of what is there, and go back to the song
        it was on, playing if it was. A failure leaves the copy, to try again."""
        group = doing.group["id"]
        kept = self._kept.get(group)
        if kept is None:
            raise HomeAssistantError("The queue can't be put back any more")

        session, host = doing._speaker()
        await upnp.clear(session, host)
        await upnp.queue_favourite(session, host, kept.copy, None)
        await upnp.play_from(
            session, host, kept.uri, kept.about, kept.song, kept.seconds, kept.playing
        )

        doing.source = kept.source
        self._lapse(group)
        _LOGGER.info("%s: the queue kept in %s is put back", group, kept.copy)

    @callback
    def _lapse(self, group: str) -> None:
        """The kept queue can't be put back any more: delete its copy."""
        kept = self._kept.pop(group, None)
        if kept is None:
            return
        kept.lapse.cancel()
        self.hass.async_create_background_task(
            self._forget(group, kept.copy), f"{DOMAIN} undo copy {group}"
        )
        self._changed()

    @callback
    def stop_all(self, _event: Any = None) -> None:
        """Home Assistant is stopping: no copy is left among the Sonos playlists."""
        for group in list(self._kept):
            self._lapse(group)

    async def _forget(self, group: str, copy: str) -> None:
        host = address(self.hass, group)
        try:
            if host is None:
                raise HomeAssistantError("Home Assistant has no address for it")
            await upnp.delete_playlist(async_get_clientsession(self.hass), host, copy)
        except HomeAssistantError as err:
            _LOGGER.warning(
                "%s: the copy kept to put the queue back (%s) is still among the Sonos "
                "playlists; it is replaced the next time (%s)",
                group,
                copy,
                err,
            )
