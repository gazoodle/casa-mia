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
import unicodedata
from collections.abc import Iterable
from typing import NamedTuple

# What a title carries that isn't its name: "(Remastered 2011)", "[Live]", and whatever
# follows " - " or "feat." ("- 2009 Remaster", "feat. Someone").
_ASIDE = re.compile(r"\([^)]*\)|\[[^\]]*\]|\s-\s.*$|\b(?:feat|ft|featuring)\b\.?.*$")
_WORDS = re.compile(r"[^\w]+")
# A hyphen or an apostrophe inside a word: "Un-Break" is "Unbreak", "Don't" is "Dont".
_INSIDE = re.compile(r"(?<=\w)[-‐'’](?=\w)")
# The words that only join two artists' names.
_JOINS = frozenset({"and", "x", "with", "vs", "feat", "ft", "featuring"})
# What parts one artist's name from the next: a joining word, or a mark.
_NEXT = re.compile(rf"\s+(?:{'|'.join(sorted(_JOINS))})\b\.?\s+|\s*[&,+/]\s*")


class Song(NamedTuple):
    """One of Spotify's songs, and the record it is on: who the record is by, what
    kind it is ("single", "album", "compilation") and when it came out. `uri` is
    Spotify's address for the song (`spotify:track:…`), which a playlist takes."""

    title: str
    artists: str
    picture: str
    record_by: str = ""
    kind: str = ""
    date: str = ""
    uri: str = ""


def _words(text: str) -> str:
    # Spotify spells some names with marks a station leaves off ("JAŸ-Z", "Beyoncé"),
    # and one side may hyphenate a word the other doesn't ("Un-Break My Heart"):
    # owner's box, 2026-11-25, two songs without a cover.
    bare = "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )
    return _WORDS.sub(" ", _INSIDE.sub("", bare.lower())).strip()


def plain(text: str) -> str:
    """A title or an artist as it is compared: its words, in small letters."""
    return _words(_ASIDE.sub(" ", text.lower()))


def _bare(name: str) -> str:
    """A name as Spotify is asked for it: without its asides, its spelling kept. A
    quotation mark would end the phrase it is asked in."""
    return " ".join(_ASIDE.sub(" ", name.lower()).replace('"', " ").split())


def _first(artists: str) -> str:
    """The first of the artists named, which is enough to ask Spotify with: `best`
    checks the rest."""
    return _NEXT.split(artists, maxsplit=1)[0] or artists


def searches(pair: tuple[str, str]) -> list[str]:
    """What Spotify is asked for a station's song; `best` then chooses from all that
    the searches find. Measured on the owner's box, 2026-11-26, for "This Is What You
    Came For" by "Calvin Harris feat. Rihanna", which had no cover:

    - Asked for the station's words as they are, Spotify sent ten songs and the
      artist's own wasn't one: karaoke and tribute versions came first, since their
      titles hold every word ("… Originally Performed by Calvin Harris feat. Rihanna").
    - Asked with its `track:` and `artist:` filters, it sent only that artist's songs
      of that title, and allowed for marks, hyphens and apostrophes ("unbreak" found
      "Un-Break", "ac" found "AC/DC"). With the two names the wrong way round it sent
      nothing, and a station may give them either way, so both are asked.
    - The plain words, without the asides, are asked as well, for a song the filters
      are too strict for.
    """
    one, other = (_bare(name) for name in pair)
    return [
        f'track:"{other}" artist:"{_first(one)}"',
        f'track:"{one}" artist:"{_first(other)}"',
        f"{one} {other}",
    ]


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
    """The picture of the best of Spotify's `songs` that is the station's song."""
    found = best(pair, songs)
    return found.picture if found else None


def best(pair: tuple[str, str], songs: Iterable[tuple[str, ...]]) -> Song | None:
    """The best of Spotify's `songs` (each a Song, or its fields) that is the
    station's song, its two names taken either way round. Among equals, Spotify's own
    order decides. The one whose cover is shown is the one added to a playlist, so
    the two never disagree."""
    # As the station named it, or that without its asides: a station's "(Radio Edit)"
    # is the song itself before its "Extended Mix".
    said = {form(name) for name in pair for form in (_words, plain)}
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
                ranked.append((rank, song))
                break
    # `min` keeps the first of equals: Spotify's order.
    return min(ranked, key=lambda found: found[0])[1] if ranked else None
