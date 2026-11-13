"""Love it or Loathe it's matching, with no Home Assistant imports: a track's title and
artist against each group's patterns.

A pattern is one line: a title, or `title | artist`, with `*` for any run of characters
(`* | Cliff Richard` is everything by one artist). Case, accents and punctuation don't
count.

A group is loved, loathed or ignored at the moment (its feeling), and has an action for
each. When a song is in more than one group, a pattern with no `*` beats one with; when
that doesn't settle it, a loved group beats a loathed one.
"""

from __future__ import annotations

import fnmatch
import json
import re
import unicodedata
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

LIBRARY = Path(__file__).parent / "library"
LOVE, LOATHE, IGNORE = "love", "loathe", "ignore"  # a group's feeling
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
    def of(cls, patterns: Iterable[tuple[str, str]]) -> Matcher:
        """From parsed patterns (parse)."""
        patterns = list(patterns)
        titles = [t for t, a in patterns if not a]
        return cls(
            _regex(titles) if titles else None,
            tuple((_regex([t]), _regex([a])) for t, a in patterns if a),
        )

    @classmethod
    def split(cls, lines: Iterable[str]) -> tuple[Matcher, Matcher]:
        """A group's songs as two matchers: the patterns with no `*`, and the rest."""
        good, _bad = parse(lines)
        wild = [pattern for pattern in good if "*" in "".join(pattern)]
        return cls.of(p for p in good if p not in wild), cls.of(wild)

    def matches(self, tracks: set[tuple[str, str]]) -> bool:
        return any(
            (self.titles is not None and self.titles.match(title))
            or any(t.match(title) and a.match(artist) for t, a in self.pairs)
            for title, artist in tracks
        )


@dataclass(frozen=True, slots=True)
class Act:
    """What to do when a song comes on."""

    action: str
    amount: float  # the volume change, in per cent of the volume now
    minutes: float  # how long a switch of station lasts


@dataclass(frozen=True, slots=True)
class Group:
    id: str
    name: str
    feeling: str  # LOVE, LOATHE or IGNORE, now
    person: str  # the person entity whose ratings it collects, or ""
    love: Act  # what to do while it is loved
    loathe: Act
    exact: Matcher  # its patterns with no *
    wild: Matcher
    # It also has any song heard `times` times in the last `hours` hours (0: it doesn't).
    times: int = 0
    hours: float = 0

    @property
    def act(self) -> Act:
        return self.love if self.feeling == LOVE else self.loathe


def pick(groups: Iterable[Group], title: str, artist: str) -> Group | None:
    """The group this track belongs to, of those not ignored: the first with a pattern
    naming it outright, else the first with a `*` pattern that takes it in; loved
    groups before loathed ones each time."""
    tracks = candidates(title, artist)
    # The sort is stable: within a feeling, the order the groups were made in.
    live = sorted(
        (g for g in groups if g.feeling != IGNORE), key=lambda g: g.feeling != LOVE
    )
    for part in ("exact", "wild"):
        for group in live:
            if getattr(group, part).matches(tracks):
                return group
    return None


# A song heard again within this many seconds is the same play, not another: two players
# on one station report it together, and a save of a group judges it afresh.
SAME_PLAY = 600.0
KEPT = 48 * 3600.0  # seconds a play is remembered: the longest a group can look back


class History:
    """The songs an entry's players have played and when, for the groups that act on a
    song heard too often. Times are seconds (a timestamp), given by the caller."""

    def __init__(self, plays: Iterable[tuple[float, str, str]] = ()) -> None:
        self._at: dict[tuple[str, str], list[float]] = {}
        for at, title, artist in plays:
            self._at.setdefault((title, artist), []).append(at)

    def heard(self, title: str, artist: str, now: float) -> None:
        times = self._at.setdefault((fold(title), fold(artist)), [])
        if not times or now - times[-1] > SAME_PLAY:
            times.append(now)

    def count(self, title: str, artist: str, now: float, hours: float) -> int:
        """How many times it was played in the last `hours`, this play included."""
        times = self._at.get((fold(title), fold(artist)), ())
        return sum(at > now - hours * 3600 for at in times)

    def dump(self, now: float) -> list[tuple[float, str, str]]:
        """The plays still remembered, for storage; the older ones are forgotten."""
        kept = {
            song: [at for at in times if at > now - KEPT]
            for song, times in self._at.items()
        }
        self._at = {song: times for song, times in kept.items() if times}
        return [(at, *song) for song, times in self._at.items() for at in times]


def repeated(groups: Iterable[Group], heard: Callable[[float], int]) -> Group | None:
    """The group that has a song for how often it has been played: `heard` says how
    many times in the last so many hours. Asked only when no group names the song
    (pick): a song you named is treated as you said, however often it comes round.
    Ignored groups have none; a loved group beats a loathed one, then group order."""
    found = [
        g
        for g in groups
        if g.feeling != IGNORE and g.times and heard(g.hours) >= g.times
    ]
    return next((g for g in found if g.feeling == LOVE), found[0] if found else None)


def _names(line: str, title: str, artist: str) -> bool:
    """Whether a line names this very song, with no `*`."""
    good, _bad = parse([line])
    return (
        bool(good)
        and "*" not in "".join(good[0])
        and Matcher.of(good).matches(candidates(title, artist))
    )


def with_song(songs: str, title: str, artist: str) -> str:
    """A group's songs with this one added as a line, `Title | Artist`, unless a line
    names it already."""
    lines = songs.splitlines()
    if any(_names(line, title, artist) for line in lines):
        return songs
    title, artist = (
        " ".join(part.replace("|", " ").replace("*", " ").split())
        for part in (title, artist)
    )
    return "\n".join([*lines, f"{title} | {artist}" if artist else title]).strip()


def has_song(songs: str, title: str, artist: str) -> bool:
    """Whether a line of a group's songs names this one (not a `*` that takes it in)."""
    return any(_names(line, title, artist) for line in songs.splitlines())


def without_song(songs: str, title: str, artist: str) -> str:
    """A group's songs without the lines naming this one. A `*` line that takes it in
    stays: it was written for more than this song."""
    return "\n".join(
        line for line in songs.splitlines() if not _names(line, title, artist)
    )


def home(data: Mapping[str, Any]) -> str:
    """Love or loathe: what a group (its data) is for, even while it is ignored. IGNORE
    for one that has never been either."""
    feeling = data["feeling"]
    return data.get("before", IGNORE) if feeling == IGNORE else feeling


def felt(was: Mapping[str, Any], now: Mapping[str, Any]) -> dict[str, Any]:
    """`now`, a group's data about to be saved over `was`. Ignored, it keeps which it
    was before: it is still somebody's loved or loathed list, for the rate action."""
    out = {key: value for key, value in now.items() if key != "before"}
    before = home(was) if "feeling" in was else IGNORE
    if now["feeling"] == IGNORE and before != IGNORE:
        out["before"] = before
    return out


def scaled(level: float, percent: float) -> float:
    """A volume (0 to 1) changed by a percentage of itself, kept within the scale."""
    return round(min(1.0, max(0.0, level * (1 + percent / 100))), 2)


def leads(entity_id: str, members: object) -> bool:
    """Whether this player acts for its speaker group. Every member reports the same
    track, and one switch of station is enough."""
    return not isinstance(members, list) or not members or members[0] == entity_id


def libraries() -> dict[str, dict[str, object]]:
    """The shipped lists, by file name: {"name": ..., "patterns": [...]}. A group can
    start from one; after that its songs are the group's own, to add to and cut."""
    return {
        path.stem: json.loads(path.read_text("utf-8"))
        for path in sorted(LIBRARY.glob("*.json"))
    }
