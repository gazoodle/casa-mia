"""Which of Spotify's songs is the one a radio station says it is playing, so that its
cover can be shown. Nothing here imports Home Assistant, so it is tested by itself.

A station's words are untidy. Some send "Artist - Title" as the title with no artist.
Some reach the speaker with the two the wrong way round (one rock station on Sonos,
always: seen 2026-11-15, and again by the owner 2026-11-24). So both orders are tried
against what Spotify found, and a cover is only taken when the title and the artist
both agree: a wrong cover is worse than the station's logo alone.

A station joins the artists of a song into one name, "The Marigolds and Velvet Arcade"
or "The Marigolds feat. Velvet Arcade" (hip-hop above all), where Spotify lists each by
itself. So the artists agree when one side names nobody the other doesn't, the joining
words aside (owner, 2026-11-25: a song by two artists joined by "and" had no cover).

Spotify has a song on many records, and lists a collection of the decade's hits as
readily as the song's own. Of those that agree, the cover taken is the artist's own
record before anyone else's, the song as the station named it before a live or
remastered one, the single before the album (owner, 2026-11-25), then the earliest.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import NamedTuple

# What a title carries that isn't its name: "(Remastered 2011)", "[Live]", and whatever
# follows " - " or "feat." ("- 2009 Remaster", "feat. Someone").
_ASIDE = re.compile(r"\([^)]*\)|\[[^\]]*\]|\s-\s.*$|\b(?:feat|ft|featuring)\b\.?.*$")
_WORDS = re.compile(r"[^\w]+")
# The words that only join two artists' names.
_JOINS = frozenset({"and", "x", "with", "vs", "feat", "ft", "featuring"})


class Song(NamedTuple):
    """One of Spotify's songs, and the record it is on: who the record is by, what
    kind it is ("single", "album", "compilation") and when it came out."""

    title: str
    artists: str
    picture: str
    record_by: str = ""
    kind: str = ""
    date: str = ""


def _words(text: str) -> str:
    return _WORDS.sub(" ", text.lower()).strip()


def plain(text: str) -> str:
    """A title or an artist as it is compared: its words, in small letters."""
    return _words(_ASIDE.sub(" ", text.lower()))


def names(artist: str, title: str) -> tuple[str, str] | None:
    """The two names a station gave for its song, in the order it gave them; none when
    it gave one name only, which can't be checked against anything."""
    artist, title = artist.strip(), title.strip()
    if not artist and " - " in title:
        artist, _, title = title.partition(" - ")
    return (artist, title) if plain(artist) and plain(title) else None


def _within(one: str, other: str) -> bool:
    return bool(one and other) and (one in other or other in one)


def _people(text: str) -> frozenset[str]:
    """The words of the artists named, without those that only join two names; all
    of them where nothing else is left (a band called X)."""
    words = frozenset(_words(text).split())
    return words - _JOINS or words


def _is_by(named: str, artists: str) -> bool:
    """Whether the artists a station named are the ones Spotify lists. A station
    often names only the first of a song's artists, and Spotify sometimes leaves out
    one a station names, so either may name fewer; neither may name somebody else."""
    ours, theirs = _people(named), _people(artists)
    same = bool(ours and theirs) and (ours <= theirs or theirs <= ours)
    return same or _within(plain(named), plain(artists))


def cover(pair: tuple[str, str], songs: Iterable[tuple[str, ...]]) -> str | None:
    """The picture of the best of Spotify's `songs` (each a Song, or its fields) that
    is the station's song, its two names taken either way round. Among equals,
    Spotify's own order decides."""
    said = {_words(pair[0]), _words(pair[1])}
    ranked = []
    for song in (Song(*fields) for fields in songs):
        title = plain(song.title)
        for by, called in (pair, pair[::-1]):
            if plain(called) == title and _is_by(by, song.artists):
                rank = (
                    not _is_by(by, song.record_by),
                    _words(song.title) not in said,
                    song.kind != "single",
                    song.date or "9999",
                )
                ranked.append((rank, song.picture))
                break
    # `min` keeps the first of equals: Spotify's order.
    return min(ranked, key=lambda found: found[0])[1] if ranked else None
