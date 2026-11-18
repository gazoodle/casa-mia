"""Topology's rules, with no Home Assistant in them: what a save may hold, the one form a
direction is kept in, and the feed every consumer is sent (docs/design/topology.md, "The
contract"). The integration's glue hands in the area and floor registries as plain
dicts; tests/test_topology.py checks this against tests/topology_cases.json, which
Dash-Bored's tests read too.

The record holds only what Home Assistant lacks, keyed by area_id and floor_id:

    {"sites": [{"id", "name"}],
     "buildings": [{"id", "name", "site": id | None, "floors": [floor_id], "areas": [area_id]}],
     "connections": [{"a": area_id, "b": area_id, "way": dir | None, "back": dir | None}]}

`way` is the direction from a to b, `back` from b to a; an empty `back` is the opposite
of `way`."""

from __future__ import annotations

import re
from collections import Counter
from typing import Any

# The sixteen points in order round the compass, so that the opposite of one is the
# point eight further on.
POINTS = (
    "n", "nne", "ne", "ene", "e", "ese", "se", "sse",
    "s", "ssw", "sw", "wsw", "w", "wnw", "nw", "nnw",
)  # fmt: skip
DIRECTIONS = (*POINTS, "up", "down")
_WORDS = (("north", "n"), ("south", "s"), ("east", "e"), ("west", "w"))
# What may sit between the parts of a direction: "n/e", "north-east", "South South East".
_SEPARATORS = re.compile(r"[\s/\-_.]+")


class Invalid(ValueError):
    """A save that is refused, with every reason, so the editor can show them all."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


def direction(text: str) -> str:
    """A direction in the one form it is kept in ("ne", "sse", "up"), from any of the
    usual ways of writing it (owner, 2026-11-18: SSE and the like must not be refused)."""
    folded = _SEPARATORS.sub("", text.strip().lower())
    for word, letter in _WORDS:
        folded = folded.replace(word, letter)
    if folded not in DIRECTIONS:
        raise ValueError(f"not a direction: {text!r}")
    return folded


def opposite(way: str) -> str:
    if way in ("up", "down"):
        return "down" if way == "up" else "up"
    return POINTS[(POINTS.index(way) + 8) % 16]


def check(
    record: dict[str, Any], areas: dict[str, str | None], floors: set[str]
) -> dict[str, Any]:
    """The record as it is to be kept, its directions in their one form, or Invalid with
    every reason. `areas` is each area's floor (None: on no floor). A save may name only
    areas and floors that exist now; one removed later shows as broken (`view`)."""
    problems: list[str] = []

    def way(text: str | None, where: str) -> str | None:
        if not text:
            return None
        try:
            return direction(text)
        except ValueError as exc:
            problems.append(f"{where}: {exc}")
            return None

    # Sites and buildings: ids unique, a building's site one of the sites.
    sites = [dict(s) for s in record.get("sites", [])]
    site_ids = [s["id"] for s in sites]
    problems += [f"two sites are {i!r}" for i in _twice(site_ids)]
    buildings = [dict(b) for b in record.get("buildings", [])]
    problems += [
        f"two buildings are {i!r}" for i in _twice([b["id"] for b in buildings])
    ]

    # A floor or an area is in one building at most, and an area is put in a building
    # only when it is on no floor: otherwise its floor's building says where it is.
    placed: dict[str, str] = {}
    for b in buildings:
        if b.get("site") and b["site"] not in site_ids:
            problems.append(f"building {b['id']!r}: no site {b['site']!r}")
        for kind, known in (("floors", floors), ("areas", set(areas))):
            for ref in b.get(kind, []):
                if ref not in known:
                    problems.append(f"building {b['id']!r}: no {kind[:-1]} {ref!r}")
                elif ref in placed:
                    problems.append(f"{ref!r} is in {placed[ref]!r} and {b['id']!r}")
                else:
                    placed[ref] = b["id"]
        for ref in b.get("areas", []):
            if areas.get(ref):
                problems.append(f"building {b['id']!r}: {ref!r} is on a floor")

    # Connections: real areas, never one to itself, and each pair once whichever way round.
    connections = []
    pairs: set[frozenset[str]] = set()
    for c in record.get("connections", []):
        a, b = c["a"], c["b"]
        where = f"{a} to {b}"
        problems += [f"{where}: no area {x!r}" for x in (a, b) if x not in areas]
        if a == b:
            problems.append(f"{where}: an area joined to itself")
        elif frozenset((a, b)) in pairs:
            problems.append(f"{where}: joined twice")
        pairs.add(frozenset((a, b)))
        connections.append(
            {
                "a": a,
                "b": b,
                "way": way(c.get("way"), where),
                "back": way(c.get("back"), where),
            }
        )

    if problems:
        raise Invalid(problems)
    return {"sites": sites, "buildings": buildings, "connections": connections}


def view(
    record: dict[str, Any], rev: int, areas: dict[str, str | None], floors: set[str]
) -> dict[str, Any]:
    """What every consumer is sent (casa_mia/topology/subscribe): the record without
    what is broken, each area's exits worked out once here, and what is broken, so the
    editor can show it. Sent again when the registries change, so a removed area is
    reported at once (nothing fails silently)."""
    broken: list[dict[str, Any]] = []

    # A building keeps what still exists; anything else it named is broken.
    buildings = []
    for b in record["buildings"]:
        kept = {"floors": [], "areas": []}
        for kind in ("floors", "areas"):
            for ref in b.get(kind, []):
                why = _gone(kind, ref, areas, floors)
                if why:
                    broken.append(
                        {"kind": "building", "id": b["id"], "ref": ref, "why": why}
                    )
                else:
                    kept[kind].append(ref)
        buildings.append({**b, **kept})

    # Each connection is an exit from both of its ends, unless an end has gone.
    exits: dict[str, list[dict[str, str]]] = {}
    for c in record["connections"]:
        gone = [x for x in (c["a"], c["b"]) if x not in areas]
        for ref in gone:
            broken.append(
                {
                    "kind": "connection",
                    "a": c["a"],
                    "b": c["b"],
                    "ref": ref,
                    "why": "gone",
                }
            )
        if gone:
            continue
        back = c["back"] or (opposite(c["way"]) if c["way"] else None)
        for here, there, w in ((c["a"], c["b"], c["way"]), (c["b"], c["a"], back)):
            exits.setdefault(here, []).append(
                {"to": there, **({"way": w} if w else {})}
            )

    return {
        "rev": rev,
        "sites": record["sites"],
        "buildings": buildings,
        "exits": exits,
        "broken": broken,
    }


def _gone(
    kind: str, ref: str, areas: dict[str, str | None], floors: set[str]
) -> str | None:
    """Why a building's floor or area no longer counts, or None if it still does."""
    if kind == "floors":
        return None if ref in floors else "gone"
    if ref not in areas:
        return "gone"
    # Put on a floor since: its floor's building now says where it is.
    return "on a floor" if areas[ref] else None


def _twice(ids: list[str]) -> list[str]:
    return [i for i, n in Counter(ids).items() if n > 1]
