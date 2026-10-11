"""Sensor Watch's levels: a watched entity's state against its record, Home Assistant's
own health (system_rows), and the summary of them all. No Home Assistant imports, so the tests load it by path. The app checks
the records when they are saved (app/src/casa_mia/modules/sensor_watch/common.py, whose
LEVELS must match these; a test checks)."""

from __future__ import annotations

from typing import Any

# From fine to worst. A task is something to do (top up the salt), not a fault.
LEVELS = ("nominal", "task", "warning", "error", "critical")
UNAVAILABLE = ("unavailable", "unknown")
IGNORE = "ignore"  # a record's `unavailable`: no opinion while it is unavailable
# Culprits listed per level in the status sensor's attributes, the longest standing
# first: a glance, kept small (HA's recorder drops attributes over 16 kB, and a broken
# integration can take hundreds of sensors with it). The `list` service gives them all.
MAX_LISTED = 10
# Home Assistant's own health, counted like any watched sensor. Without the Recorder
# (and History, which needs it) there is no history or statistics at all.
SYSTEM = {"recorder": "Recorder", "history": "History"}
# Config entry states that mean an integration isn't working (not disabled ones).
FAILED = ("setup_error", "setup_retry", "migration_error", "not_loaded")
SETTLE = 300  # seconds an integration may take to set up before its failure counts


def rank(level: str | None) -> int:
    return LEVELS.index(level) if level in LEVELS else -1


def same(state: str, nominal: str) -> bool:
    """An exact state, as text or, when both are numbers, as a number ("0" is "0.0")."""
    if state == nominal:
        return True
    try:
        return float(state) == float(nominal)
    except ValueError:
        return False


def reading(record: dict[str, Any], state: Any) -> str | None:
    """What a record watches of `state` (a Home Assistant State, or None): the state, or
    its `attribute`'s value as text (None, so unavailable, when it hasn't one)."""
    if state is None:
        return None
    attribute = record.get("attribute")
    if not attribute or state.state in UNAVAILABLE:
        return state.state
    value = state.attributes.get(attribute)
    return None if value is None else str(value)


def level_of(
    record: dict[str, Any], state: str | None
) -> tuple[str | None, str | None]:
    """The level a state puts its entity at, and why (a band's message, "unavailable",
    "outside every band"); (None, None) while unavailable and the record ignores that."""
    if state is None or state in UNAVAILABLE:
        level = record.get("unavailable", "error")
        return (None, None) if level == IGNORE else (level, "unavailable")
    if record.get("kind") == "binary":
        # What each state means (the form since 2026.10.8-b20): either may be nominal.
        side = record.get("on" if state == "on" else "off")
        if isinstance(side, dict):
            return side.get("level", "nominal"), side.get("message") or None
        if state == record.get("nominal", "off"):  # the form before
            return "nominal", None
        return record.get("other", "warning"), record.get("message") or None
    if record.get("kind") == "state":
        if any(same(state, s) for s in record.get("states") or []):
            return "nominal", None
        # A state with a level of its own (a lock: jammed is an error, unlocked a task).
        for ex in record.get("exceptions") or []:
            if same(state, ex.get("state", "")):
                return ex.get("level", "error"), ex.get("message") or None
        return record.get("other", "error"), record.get("message") or None
    try:
        value = float(state)
    except ValueError:
        return record.get("otherwise", "error"), f"not a number: {state}"
    for band in record.get("bands") or []:
        low, high = band.get("from"), band.get("to")
        if (low is None or value >= low) and (high is None or value < high):
            return band.get("level", "nominal"), band.get("message") or None
    return record.get("otherwise", "error"), "outside every band"


def listing(
    now: dict[str, dict[str, Any]], levels: list[str] | None = None
) -> list[dict[str, Any]]:
    """Every watched entity at one of `levels` (all but nominal when None), worst first,
    then longest standing: the `list` service's answer."""
    wanted = set(levels or LEVELS[1:])
    rows = [{"entity_id": e, **n} for e, n in now.items() if n.get("level") in wanted]
    return sorted(rows, key=lambda r: (-rank(r["level"]), r.get("since") or ""))


def summary(now: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """The worst level, a count per level, and the culprits per level (worst first,
    then longest standing), from each entity's current {level, message, value, since,
    name}. Entities with no level (ignored while unavailable) don't count."""
    counted = {e: n for e, n in now.items() if n.get("level") in LEVELS}
    worst = max((n["level"] for n in counted.values()), key=rank, default="nominal")
    out: dict[str, Any] = {"worst": worst, "watching": len(now)}
    for level in LEVELS[1:]:
        these = sorted(
            (e for e, n in counted.items() if n["level"] == level),
            key=lambda e: counted[e].get("since") or "",
        )
        out[level] = len(these)
        out[f"{level}_list"] = [
            {
                "entity_id": e,
                **{k: counted[e].get(k) for k in ("name", "value", "message", "since")},
            }
            for e in these[:MAX_LISTED]
        ]
    return out


def system_rows(
    components: set[str],
    entries: list[dict[str, Any]],
    first_bad: dict[str, float],
    now: float,
    settings: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Home Assistant's own health as rows like a watched sensor's: the Recorder and
    History (critical when not running, nominal when they are) and each integration that
    has failed to set up for SETTLE seconds (error). `entries`: each config entry's
    entry_id, domain, title, state, reason, source and disabled; `first_bad`: when each
    was first seen failing, kept by the caller between checks (updated here); `settings`
    (the app's page): `core` and `integrations` on or off, and `ignore` (entry ids)."""
    settings = settings or {}
    rows: dict[str, dict[str, Any]] = {}
    if settings.get("core", True):
        for key, name in SYSTEM.items():
            up = key in components
            rows[f"homeassistant.{key}"] = {
                "name": name,
                "level": "nominal" if up else "critical",
                "value": "running" if up else "not running",
                "message": None if up else "not running: no history or statistics",
            }
    ignored = set(settings.get("ignore") or [])
    failing = {
        e["entry_id"]: e
        for e in entries
        if settings.get("integrations", True)
        and e["state"] in FAILED
        and not e["disabled"]
        # A discovery the user chose to ignore is kept as an entry that never loads.
        and e.get("source") != "ignore"
        and e["entry_id"] not in ignored
    }
    for gone in set(first_bad) - set(failing):
        del first_bad[gone]
    for entry_id, e in failing.items():
        if now - first_bad.setdefault(entry_id, now) < SETTLE:
            continue
        state = e["state"].replace("_", " ")
        rows[f"integration.{entry_id}"] = {
            "name": f"{e['title']} ({e['domain']})",
            "level": "error",
            "value": e["state"],
            "message": f"{state}: {e['reason']}" if e.get("reason") else state,
        }
    return rows
