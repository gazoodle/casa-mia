"""Putting a Sonos playlist in order, and finding the songs that are in it twice: what
is worked out before the speaker is asked for anything. Nothing here imports Home
Assistant, so it is tested by itself.

A speaker has no sort of its own. It does move many songs in one request: name the songs
by where they are now, give them rising places, and they land there with the rest left
in the order they had (a real speaker, 2026-11-24: twenty songs reversed in one request;
with the places not rising it refused, error 402). So a whole new order is the songs
named in that order, with the places 0, 1, 2 and so on.
"""

from __future__ import annotations

import re
from collections.abc import Iterator, Mapping, Sequence
from typing import Any

# What a playlist can be sorted by, as the page names it.
BY = ("title", "artist", "album")
# ponytail: how many songs are named in one request. Twenty were tried on a real
# speaker; this many haven't been. Lower it if a long playlist's sort is refused.
EACH = 200
_NUMBER = re.compile(r"(\d+)")


def natural(text: str) -> tuple[tuple[int, int | str], ...]:
    """A name as it is sorted: without regard to capitals, and with a number in it
    counted, so that "2 Something" comes before "10 Something" and songs named with
    their track numbers ("01 …", "02 …") fall in order."""
    parts = _NUMBER.split(text.casefold().strip())
    return tuple((0, int(p)) if p.isdigit() else (1, p) for p in parts if p)


def order(songs: Sequence[Mapping[str, Any]], by: str) -> list[int]:
    """The songs' places, counted from 0, in the order they would be in sorted by a
    title, an artist or an album. Songs that are equal keep the order they had. Within
    an album the songs go by their track number, where the speaker has one."""

    def key(n: int) -> tuple:
        song = songs[n]
        title, album = natural(song["title"]), natural(song["album"])
        track = (song.get("track") or 0, title)
        if by == "title":
            return (title,)
        if by == "artist":
            return (natural(song["artist"]), album, *track)
        return (album, *track)

    return sorted(range(len(songs)), key=key)


def inverse(order: Sequence[int]) -> list[int]:
    """The order that puts back what `order` rearranged."""
    back = [0] * len(order)
    for place, was in enumerate(order):
        back[was] = place
    return back


def steps(
    order: Sequence[int], each: int = EACH
) -> Iterator[tuple[list[int], list[int]]]:
    """A new order as the requests that make it, `each` songs at a time: for each, the
    songs to move, by where they are when that request is made, and the places they go
    to. The songs already placed are at the front, and the rest are as they were."""
    now = list(range(len(order)))
    for start in range(0, len(order), each):
        wanted = list(order[start : start + each])
        places = list(range(start, start + len(wanted)))
        where = {song: place for place, song in enumerate(now)}
        tracks = [where[song] for song in wanted]
        if tracks != places:
            yield tracks, places
        placed = set(order[: start + len(wanted)])
        now = list(order[: start + len(wanted)]) + [s for s in now if s not in placed]


def repeats(addresses: Sequence[str]) -> list[int]:
    """The places, counted from 0, of every song that is in the list already: the same
    address further up. The first of each is kept."""
    seen: set[str] = set()
    again = []
    for place, address in enumerate(addresses):
        if address and address in seen:
            again.append(place)
        seen.add(address)
    return again
