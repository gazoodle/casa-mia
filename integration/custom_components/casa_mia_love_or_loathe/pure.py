"""Love it or Loathe it's matching, with no Home Assistant imports: a track's title and
artist against each group's patterns.

A pattern is one line: a title, or `title | artist`, with `*` for any run of characters
(`* | Cliff Richard` is everything by one artist). Case, accents and punctuation don't
count. A group's own patterns beat every shipped library's, so a love group naming one
song exempts it from a library that loathes it.
"""

from __future__ import annotations

import fnmatch
import json
import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

LIBRARY = Path(__file__).parent / "library"
_BRACKETS = re.compile(r"[(\[][^)\]]*[)\]]")
_APOSTROPHES = re.compile(r"['’`]")
_JUNK = re.compile(r"[^a-z0-9*]+")
_STARS = re.compile(r"[* ]*")


def fold(text: str) -> str:
    """Lower case, no accents, no punctuation, single spaces. `*` survives, for patterns;
    apostrophes vanish, so "Rockin'" and "Rockin" are the same word."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = _APOSTROPHES.sub("", text.lower()).replace("&", " and ")
    return " ".join(_JUNK.sub(" ", text).split())


def candidates(title: str, artist: str) -> set[tuple[str, str]]:
    """Every (title, artist) a player's report could mean, folded. Radio streams often
    send "Artist - Title" as the title with no artist, some the other way round, and
    streaming services add "(Remastered 2011)" or " - Single Version"."""
    title, artist = title.replace("*", " "), artist.replace("*", " ")
    pairs = [(title, artist)]
    if " - " in title:
        left, right = title.split(" - ", 1)
        pairs += [(left, artist)] if artist else [(right, left), (left, right)]

    out: set[tuple[str, str]] = set()
    for t, a in pairs:
        out.add((fold(t), fold(a)))
        out.add((fold(_BRACKETS.sub(" ", t)), fold(a)))
    return out


def parse(lines: Iterable[str]) -> tuple[list[tuple[str, str]], list[str]]:
    """The patterns as folded (title, artist) pairs (artist "" for any), and the lines
    that can't be one: a pattern of nothing but `*` would match every song."""
    good: list[tuple[str, str]] = []
    bad: list[str] = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        title, _, artist = (fold(part) for part in line.partition("|"))
        if _STARS.fullmatch(title) and _STARS.fullmatch(artist):
            bad.append(line)
        else:
            good.append((title or "*", artist))
    return good, bad


def _regex(patterns: Iterable[str]) -> re.Pattern[str]:
    return re.compile("|".join(fnmatch.translate(p) for p in patterns))


@dataclass(frozen=True, slots=True)
class Matcher:
    """A list of patterns, compiled once: the title-only ones as a single regex."""

    titles: re.Pattern[str] | None
    pairs: tuple[tuple[re.Pattern[str], re.Pattern[str]], ...]

    @classmethod
    def of(cls, lines: Iterable[str]) -> Matcher:
        good, _bad = parse(lines)
        titles = [t for t, a in good if not a]
        return cls(
            _regex(titles) if titles else None,
            tuple((_regex([t]), _regex([a])) for t, a in good if a),
        )

    def matches(self, tracks: set[tuple[str, str]]) -> bool:
        return any(
            (self.titles is not None and self.titles.match(title))
            or any(t.match(title) and a.match(artist) for t, a in self.pairs)
            for title, artist in tracks
        )


@dataclass(frozen=True, slots=True)
class Group:
    id: str
    name: str
    kind: str  # const.LOVE or const.LOATHE
    action: str
    amount: float  # the volume change, in per cent of the volume now
    minutes: float  # how long a switch of station lasts
    own: Matcher
    library: Matcher


def pick(groups: Iterable[Group], title: str, artist: str) -> Group | None:
    """The group this track belongs to: the first whose own patterns match, else the
    first whose library does."""
    groups, tracks = list(groups), candidates(title, artist)
    for part in ("own", "library"):
        for group in groups:
            if getattr(group, part).matches(tracks):
                return group
    return None


def scaled(level: float, percent: float) -> float:
    """A volume (0 to 1) changed by a percentage of itself, kept within the scale."""
    return round(min(1.0, max(0.0, level * (1 + percent / 100))), 2)


def leads(entity_id: str, members: object) -> bool:
    """Whether this player acts for its speaker group. Every member reports the same
    track, and one switch of station is enough."""
    return not isinstance(members, list) or not members or members[0] == entity_id


def libraries() -> dict[str, dict[str, object]]:
    """The shipped lists, by file name: {"name": ..., "patterns": [...]}."""
    return {
        path.stem: json.loads(path.read_text("utf-8"))
        for path in sorted(LIBRARY.glob("*.json"))
    }
