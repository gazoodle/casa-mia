"""Tidying a Sonos playlist as a whole: sorting it, putting a sort back, and taking out
the songs that are in it twice. What is to be done is worked out in tidy.py; the speaker
is asked in upnp.py. Each is one of the page's actions (`feed.ACTIONS`), given the
action being carried out, and says what it did in its `result`, for the page to say.
"""

from __future__ import annotations

from typing import Any

from homeassistant.exceptions import HomeAssistantError

from . import tidy, upnp


class Curator:
    """Remembers how to put back each playlist's last sort: the speaker has no undo. In
    memory only, and only while the playlist is as the sort left it."""

    def __init__(self) -> None:
        # {playlist: (its change number after the sort, the order that undoes it)}
        self._back: dict[str, tuple[int, list[int]]] = {}

    async def sort(self, doing: Any) -> None:
        speaker, playlist = doing._speaker(), doing._playlist()
        by = doing._value("by")
        songs = await upnp.detailed(*speaker, playlist)
        order = tidy.order(songs, by)
        if order == list(range(len(songs))):
            doing.result = {"moved": False}
            return
        await upnp.playlist_arrange(*speaker, playlist, order)
        after = await upnp.changes(*speaker, playlist)
        self._back[playlist] = (after, tidy.inverse(order))
        doing.result = {"moved": True}

    async def unsort(self, doing: Any) -> None:
        speaker, playlist = doing._speaker(), doing._playlist()
        after, back = self._back.get(playlist, (None, []))
        if after is None:
            raise HomeAssistantError("There is no sort of this playlist to put back")
        if await upnp.changes(*speaker, playlist) != after:
            del self._back[playlist]
            raise HomeAssistantError(
                "The playlist has been changed since it was sorted, so the order it "
                "had can't be put back"
            )
        await upnp.playlist_arrange(*speaker, playlist, back)
        del self._back[playlist]

    async def dedupe(self, doing: Any) -> None:
        speaker, playlist = doing._speaker(), doing._playlist()
        songs = await upnp.detailed(*speaker, playlist)
        again = tidy.repeats([song["address"] for song in songs])
        if again:
            await upnp.playlist_drop(*speaker, playlist, again)
        doing.result = {"removed": len(again)}
