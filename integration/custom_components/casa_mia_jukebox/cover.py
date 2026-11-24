"""Which of Spotify's songs is the one a radio station says it is playing, so that its
cover can be shown. Nothing here imports Home Assistant, so it is tested by itself.

A station's words are untidy. Some send "Artist - Title" as the title with no artist.
Some reach the speaker with the two the wrong way round (one rock station on Sonos,
always: seen 2026-11-15, and again by the owner 2026-11-24). So both orders are tried
against what Spotify found, and a cover is only taken when the title and the artist
both agree: a wrong cover is worse than the station's logo alone.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

# What a title carries that isn't its name: "(Remastered 2011)", "[Live]", and whatever
# follows " - " or "feat." ("- 2009 Remaster", "feat. Someone").
_ASIDE = re.compile(r"\([^)]*\)|\[[^\]]*\]|\s-\s.*$|\b(?:feat|ft|featuring)\b\.?.*$")
_WORDS = re.compile(r"[^\w]+")


def plain(text: str) -> str:
    """A title or an artist as it is compared: its words, in small letters."""
    return _WORDS.sub(" ", _ASIDE.sub(" ", text.lower())).strip()


def names(artist: str, title: str) -> tuple[str, str] | None:
    """The two names a station gave for its song, in the order it gave them; none when
    it gave one name only, which can't be checked against anything."""
    artist, title = artist.strip(), title.strip()
    if not artist and " - " in title:
        artist, _, title = title.partition(" - ")
    return (artist, title) if plain(artist) and plain(title) else None


def cover(pair: tuple[str, str], songs: Iterable[tuple[str, str, str]]) -> str | None:
    """The picture of the first of Spotify's `songs` (title, artists, picture) that is
    the station's song, its two names taken either way round."""
    one, other = plain(pair[0]), plain(pair[1])
    for title, artists, picture in songs:
        title, artists = plain(title), plain(artists)
        for by, called in ((one, other), (other, one)):
            # Spotify lists every artist of a song; a station names the first.
            if called == title and (by in artists or artists in by) and artists:
                return picture
    return None
