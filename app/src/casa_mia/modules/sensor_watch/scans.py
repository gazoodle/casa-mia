"""Sensor Watch's scans: the candidates (any entity HA has, filtered), a sensor's
history and the suggestion from it, and Scan my house in rounds."""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from typing import Any

from ...ha import HAError
from . import suggest
from .common import DEFAULT_HOLD_OFF, BadRequest, sides
from .defaults import default_record
from .history import (
    LIST_LIMIT,
    SCAN_DOMAINS,
    from_history,
    from_statistics,
    order,
)
from .store import Store

_LOGGER = logging.getLogger(__name__)

MAX_SCAN = 500  # sensors a scan round reads; the next round starts at `next`
DAYS = 30  # history read by default
MAX_DAYS = 365
FILTERS = ("domain", "q", "area", "label", "platform", "device_class", "kind", "device")


def words(text: str) -> tuple[list[str], list[str]]:
    """A search's words, ignoring case and punctuation, and those it rules out (each
    with a minus, taken whole): "Tank - Top -vcc" -> ([tank, top], [vcc])."""
    want: list[str] = []
    unwanted: list[str] = []
    for term in text.lower().split():
        if term.startswith("-"):
            if term[1:]:
                unwanted.append(term[1:])  # whole: "-temp_02" rules out just that
        else:
            want.extend(re.findall(r"[a-z0-9]+", term))
    return want, unwanted


def matches(c: dict[str, Any], f: dict[str, str]) -> bool:
    """Does candidate `c` pass the filters (each empty or absent = any)? The search
    matches when every word is somewhere in its name, entity id or device, in any order:
    "tank top" finds "Tank - Top", "Top of tank" and "Topup Tank"; a word with a minus
    rules out any that has it ("voltage -vcc"), so a group never takes them."""
    hay = f"{c['name'].lower()} {c['entity_id']} {c.get('device', '').lower()}"
    want, unwanted = words(f.get("q") or "")
    return (
        all(w in hay for w in want)
        and not any(w in hay for w in unwanted)
        and (not f.get("area") or c["area_id"] == f["area"])
        and (not f.get("label") or f["label"] in c["labels"])
        and (not f.get("platform") or c["platform"] == f["platform"])
        and (not f.get("device_class") or c["device_class"] == f["device_class"])
        and (not f.get("kind") or c["kind"] == f["kind"])
        and (not f.get("device") or c.get("device_id") == f["device"])
        and (not f.get("domain") or c.get("domain") == f["domain"])
    )


def suggestion(kind: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """A suggestion of `kind` from what history.py read."""
    if kind == "numeric":
        return suggest.numeric(data["samples"])
    if kind == "binary":
        return suggest.binary(data.get("seconds", {}))
    return suggest.states(data.get("seconds", {}))


def proposal(
    c: dict[str, Any], s: dict[str, Any] | None, kind: str | None = None
) -> dict[str, Any]:
    """The record a suggestion makes (or a plain one without a suggestion); `kind` when
    the editor asks for another than the sensor's own (exact states for a number)."""
    kind = kind or c["kind"]
    base = {
        "kind": kind,
        "name": "",
        "hold_off": DEFAULT_HOLD_OFF,
        "unavailable": "error",
    }
    if kind == "binary":  # the state it spends most time in is nominal
        old = {"nominal": (s or {}).get("nominal", "off"), "other": "warning"}
        return base | sides(old | {"message": ""})
    if kind == "state":
        return base | {
            "states": (s or {}).get("states") or [],
            "other": "error",
            "message": "",
        }
    bands = (s or {}).get("bands") or [
        {"from": None, "to": None, "level": "nominal", "message": ""}
    ]
    return base | {"bands": bands, "otherwise": "error"}


class Scanner(Store):
    def candidates(self, f: dict[str, str]) -> dict[str, Any]:
        reader = self._reader()
        every = reader.candidates()
        found = [c for c in every if matches(c, f)]
        # The devices on offer: those with sensors matching the other filters, so a big
        # house's list narrows (choose ESPHome, and only ESPHome devices are listed).
        pool = [c for c in every if matches(c, f | {"device": ""})]
        devices = {
            c["device_id"]: c["device"]
            for c in pool
            if c.get("device_id") and c.get("device")
        }
        with self._lock:
            watched = set(self.records)
        return {
            "total": len(found),
            "sensors": [
                c
                | {
                    "watched": c["entity_id"] in watched,
                    # Set up by what it is (a group following the defaults takes it).
                    "has_default": default_record(c) is not None,
                }
                for c in found[:LIST_LIMIT]
            ],
            "options": reader.options()
            | {
                "devices": sorted(
                    ({"id": k, "name": v} for k, v in devices.items()),
                    key=lambda d: d["name"].lower(),
                )
            },
        }

    def suggest(
        self, entity_id: str, days: float, kind: str | None = None
    ) -> dict[str, Any]:
        """Its history and a suggestion from it, as `kind` (the sensor's own by default)."""
        reader = self._reader()
        c = reader.find(entity_id)
        if c is None:
            raise BadRequest(f"{entity_id} is not a sensor Sensor Watch can watch.")
        if kind not in (None, "", c["kind"]) and not (
            kind == "state" and c["kind"] == "numeric"
        ):
            raise BadRequest(f"A {c['kind']} sensor can't be watched as {kind}.")
        as_kind: str = kind or c["kind"]
        problems: list[str] = []
        data = None
        if as_kind == "numeric" and c["statistics"]:
            rows = _read(reader.statistics, [entity_id], days, problems)
            data = from_statistics(rows.get(entity_id, []))
        if not data or not data["samples"]:
            rows = _read(reader.history, [entity_id], days, problems)
            data = from_history(rows.get(entity_id, []))
        found = suggestion(as_kind, data)
        _LOGGER.info(
            "suggest %s: %d days asked, %s from %s, %s%s",
            entity_id,
            days,
            data["source"],
            data["first"] or "nothing",
            "a suggestion" if found else "no suggestion",
            f" ({'; '.join(problems)})" if problems else "",
        )
        # What it is beats how it behaved: a leak sensor is critical whatever its history.
        known = default_record(c)
        record = (
            known if known and known["kind"] == as_kind else proposal(c, found, as_kind)
        )
        return {
            "sensor": c,
            "source": data["source"],
            "first": data["first"],
            "points": data["points"],
            "suggestion": found,
            "record": record,
            "default": record is known,
            "problem": "; ".join(problems) or None,
        }

    def scan(self, f: dict[str, Any], days: float) -> dict[str, Any]:
        """A suggested record for each unwatched sensor the filters pick, MAX_SCAN a
        round: `start` is where this round begins (by name), `next` where the next would
        (None when done). A whole house goes round by round; skipped ones don't return."""
        reader = self._reader()
        with self._lock:
            watched = set(self.records)
        filters = {k: str(f.get(k) or "") for k in FILTERS}
        start: Any = f.get("start")  # [name, entity id] of the round's first sensor
        # No domain asked for: the usual ones, not every light, switch and helper.
        every = [
            c
            for c in reader.candidates()
            if c["entity_id"] not in watched
            and matches(c, filters)
            and (filters["domain"] or c["domain"] in SCAN_DOMAINS)
        ]
        rest = (
            [c for c in every if order(c) >= tuple(start)] if _place(start) else every
        )
        found, after = rest[:MAX_SCAN], rest[MAX_SCAN:]
        # Those with a record by what they are need no history.
        known = {c["entity_id"]: d for c in found if (d := default_record(c))}
        by_stats = [
            c["entity_id"]
            for c in found
            if c["kind"] == "numeric"
            and c["statistics"]
            and c["entity_id"] not in known
        ]
        problems: list[str] = []
        stats = _read(reader.statistics, by_stats, days, problems) if by_stats else {}
        rest = [
            c["entity_id"]
            for c in found
            if c["entity_id"] not in known
            and (c["entity_id"] not in by_stats or not stats.get(c["entity_id"]))
        ]
        hist = _read(reader.history, rest, days, problems) if rest else {}
        out, skipped = [], 0
        for c in found:
            eid = c["entity_id"]
            if eid in known:
                out.append(
                    {
                        "sensor": c,
                        "source": "default",
                        "first": None,
                        "suggestion": None,
                        "record": known[eid],
                        "default": True,
                    }
                )
                continue
            data = (
                from_statistics(stats[eid])
                if stats.get(eid)
                else from_history(hist.get(eid, []))
            )
            s = suggestion(c["kind"], data)
            if s is None:
                skipped += 1
                continue
            out.append(
                {
                    "sensor": c,
                    "source": data["source"],
                    "first": data["first"],
                    "suggestion": s,
                    "record": proposal(c, s),
                }
            )
        _LOGGER.info(
            "scan (%s, %d days): %d of %d sensors, %d suggestions, %d without history",
            ", ".join(f"{k}={v}" for k, v in filters.items() if v) or "no filters",
            days,
            len(found),
            len(every),
            len(out),
            skipped,
        )
        return {
            "found": out,
            "skipped": skipped,
            "matched": len(every),
            "remaining": len(after),
            "next": list(order(after[0])) if after else None,
            "problem": "; ".join(problems) or None,
        }

    # -- saving


def _read(
    fetch: Callable[[list[str], float], dict[str, Any]],
    ids: list[str],
    days: float,
    problems: list[str],
) -> dict[str, Any]:
    """History or statistics, or nothing (and why, in `problems`) when HA can't give it:
    e.g. "history/history_during_period: Unknown command" where HA's History
    integration isn't loaded. The rest of Sensor Watch works without it."""
    try:
        return fetch(ids, days)
    except HAError as exc:
        _LOGGER.warning("could not read history for %d sensors: %s", len(ids), exc)
        problems.append(f"couldn't read history: {exc}")
        return {}


def _place(start: Any) -> bool:
    """A scan round's start as `next` gave it: [name, entity id]."""
    return (
        isinstance(start, list)
        and len(start) == 2
        and all(isinstance(s, str) for s in start)
    )


def _days(value: Any) -> float:
    try:
        days = float(value) if value not in (None, "") else DAYS
    except (TypeError, ValueError):
        raise BadRequest("days: a number.") from None
    if not 1 <= days <= MAX_DAYS:
        raise BadRequest(f"days: 1 to {MAX_DAYS}.")
    return days
