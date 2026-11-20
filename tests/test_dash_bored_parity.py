"""Every Dash-Bored family shows every capability, in its own style (owner, 2026-11-17).

Why: the Gazette had the weather and who is at home from its first weeks. Aurora and the
Console were built later without them and nobody noticed, though both were already in the
`House` every family is given.

How: a capability is something a family can read: a field of `House`, an optional field of
`Device`, one of the integration's feeds, or one of MORE below. One that any family reads
must be read by all of them, or be in OWED with the reason it is not. So a family that
starts to show something new fails this test until the others show it or are listed.

It reads the sources as text, so it is a net and not a proof: a field with a common name
(`title`) is found wherever anything has that name, and a family that reads only part of
something (the Console shows the outside temperature and not the sky) passes. The table in
docs/design/dash-bored-survey.md says what each family really shows."""

import re
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "integration/cards/src/dash-bored"
# Each family's own sources. What they share (family.ts, house.ts) is nobody's. stories.ts is
# the Gazette's reading of the house: the others take only its helpers.
FAMILIES = {
    "gazette": [
        "gazette.ts",
        "gazette",
        "voices.ts",
        "voices",
        "stories.ts",
        "clipping.ts",
    ],
    "console": ["console"],
    "fridge": ["fridge.ts", "fridge"],
    "aurora": ["aurora.ts", "aurora"],
    "digs": ["digs.ts", "digs"],
    "contraption": ["contraption.ts", "contraption"],
}
COMMENT = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)
FEED = re.compile(r'const (\w+) = "(casa_mia_dash_bored/\w+)"')
# What has no field or feed of its own, by how a family is seen to use it.
MORE = {
    "the forecast by the day": r"\b_days\b",
    # family.ts follows the cameras' sightings for a family that asks it to.
    "feed casa_mia_dash_bored/sightings": r"_follow\(SIGHTINGS\b|_watch\(",
}

PARITY = "BACKLOG.md, Dash-Bored: every family gets every capability"
# (family, capability): why the family does not show it. An entry goes when the family does.
OWED = {
    ("console", "house.people"): PARITY,
    ("aurora", "house.people"): PARITY,
    ("aurora", "house.outside"): PARITY,
    ("console", "house.gaps"): PARITY,
    ("fridge", "house.gaps"): PARITY,
    ("aurora", "house.gaps"): PARITY,
    ("console", "house.appliances"): PARITY,
    ("fridge", "house.appliances"): PARITY,
    ("aurora", "house.appliances"): PARITY,
    ("fridge", "the forecast by the day"): PARITY,
    ("aurora", "the forecast by the day"): PARITY,
    ("fridge", "device.zoom"): PARITY,
    ("fridge", "device.presets"): PARITY,
    ("fridge", "device.controls"): PARITY,
    ("aurora", "device.title"): PARITY,
    ("gazette", "device.choices"): PARITY,
    ("console", "device.choices"): PARITY,
    ("fridge", "device.choices"): PARITY,
    **{
        (family, f"feed casa_mia_dash_bored/{feed}"): PARITY
        for family in ("console", "fridge", "aurora", "digs")
        for feed in ("personal", "playing", "column")
    },
    # Digs' first build (2026.11.9-b16): BACKLOG.md, "Digs, the fifth family".
    **{
        ("digs", what): PARITY
        for what in (
            "house.appliances",
            "device.zoom",
            "device.presets",
            "device.controls",
            "device.choices",
            "feed casa_mia_dash_bored/sightings",
        )
    },
    # Contraption's first build (2026.11.9-b18) is one room's devices and nothing of the
    # house round them: BACKLOG.md, "Contraption, the sixth family".
    **{
        ("contraption", what): PARITY
        for what in (
            "house.people",
            "house.outside",
            "house.gaps",
            "house.scenes",
            "house.appliances",
            "house.kw",
            "the forecast by the day",
            "device.phase",
            "device.picture",
            "device.zoom",
            "device.presets",
            "device.controls",
            "device.choices",
            *(
                f"feed casa_mia_dash_bored/{feed}"
                for feed in ("alerts", "sightings", "personal", "playing", "column")
            ),
        )
    },
}


def _text(paths: list[Path]) -> str:
    files = [
        f for p in paths for f in ([p] if p.is_file() else sorted(p.rglob("*.ts")))
    ]
    return "\n".join(
        COMMENT.sub("", f.read_text()) for f in files if ".test." not in f.name
    )


def _fields(house: str, name: str, optional: bool) -> list[str]:
    body = re.search(rf"export type {name} = \{{\n(.*?)\n\}};", house, re.S)
    assert body, f"house.ts no longer has `export type {name}` as this test reads it"
    return re.findall(
        r"^  (\w+)\?:" if optional else r"^  (\w+)\??:", body.group(1), re.M
    )


def _signs() -> dict[str, str]:
    """Each capability, and the pattern that says a family's sources read it."""
    house = (SRC / "house.ts").read_text()
    everything = _text([SRC])
    signs = {f"house.{f}": rf"\.{f}\b" for f in _fields(house, "House", optional=False)}
    signs |= {
        f"device.{f}": rf"\.{f}\b" for f in _fields(house, "Device", optional=True)
    }
    signs |= {
        f"feed {feed}": rf"_follow\({const}\b"
        for const, feed in FEED.findall(everything)
    }
    return signs | MORE


def _missing() -> set[tuple[str, str]]:
    """Each (family, capability) where another family reads it and this one does not."""
    texts = {
        family: _text([SRC / p for p in paths]) for family, paths in FAMILIES.items()
    }
    shown = {
        what: {family for family, text in texts.items() if re.search(sign, text)}
        for what, sign in _signs().items()
    }
    return {
        (family, what)
        for what, by in shown.items()
        if by
        for family in FAMILIES
        if family not in by
    }


def test_the_sources_are_read():
    signs = _signs()
    assert {
        "house.outside",
        "house.people",
        "device.choices",
        "feed casa_mia_dash_bored/alerts",
    } <= set(signs)


def test_every_family_shows_what_any_family_shows():
    unexplained = sorted(_missing() - set(OWED))
    assert not unexplained, (
        "A family shows something that another does not (owner, 2026-11-17: every family gets every "
        "capability). Show it there too, or add it to OWED with the reason and to BACKLOG.md, and to "
        "the table in docs/design/dash-bored-survey.md:\n"
        + "\n".join(f"  {family}: {what}" for family, what in unexplained)
    )


def test_nothing_is_owed_that_is_shown():
    stale = sorted(set(OWED) - _missing())
    assert not stale, (
        "OWED lists what is now shown, or was never a capability. Remove:\n"
        + "\n".join(f"  {family}: {what}" for family, what in stale)
    )
    assert all(OWED.values()), "every entry in OWED says why"
