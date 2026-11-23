"""Sensor Watch's levels: a watched entity's state against its record, Home Assistant's
own health (system_rows), and the summary of them all. No Home Assistant imports, so the
tests load it by path."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

# From fine to worst. A task is something to do (top up the salt), not a fault.
LEVELS = ("nominal", "task", "warning", "error", "critical")
UNAVAILABLE = ("unavailable", "unknown")
IGNORE = "ignore"  # a record's `unavailable`: no opinion while it is unavailable
# seconds unavailable before that counts, unless a record says (its `unavailable_hold`):
# a restart, a reload or a car asleep is usual, not trouble.
UNAVAILABLE_HOLD = 300
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
INTEGRATION = "integration."  # an integration's row's key: this, then its entry id
# A failing integration's state, as its row's message says it.
FAILING = {
    "setup_error": "failed to set up",
    "setup_retry": "not connecting",
    "migration_error": "failed to migrate",
    "not_loaded": "not loaded",
}


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


def reading(
    record: dict[str, Any], state: Any, now: datetime | None = None
) -> str | None:
    """What a record watches of `state` (a Home Assistant State, or None): the state, or
    its `attribute`'s value as text (None, so unavailable, when it hasn't one); with
    `days_until`, that date as the days from `now` until it."""
    if state is None:
        return None
    attribute = record.get("attribute")
    if not attribute or state.state in UNAVAILABLE:
        value: str | None = state.state
    else:
        found = state.attributes.get(attribute)
        value = None if found is None else str(found)
    if record.get("days_until") and value is not None and value not in UNAVAILABLE:
        return days_until(value, now or datetime.now(UTC))
    return value


def is_gone(record: dict[str, Any], state: str | None) -> bool:
    """Is the entity itself unavailable (or not in Home Assistant at all)? Not an
    attribute it lacks. An availability watch counts unknown as there."""
    if record.get("kind") == "available":
        return state is None or state == "unavailable"
    return state is None or state in UNAVAILABLE


def days_until(text: str, now: datetime) -> str:
    """A date or timestamp as the days from `now` until it, to a tenth (negative once
    it's passed); a date alone is its midnight where `now` is. Text that isn't a date
    comes back as it is (and counts as not a number)."""
    try:
        when = datetime.fromisoformat(text)
    except ValueError:
        return text
    if when.tzinfo is None:
        when = when.replace(tzinfo=now.tzinfo)
    return f"{(when - now).total_seconds() / 86400:.1f}"


def level_of(
    record: dict[str, Any], state: str | None, current: str | None = None
) -> tuple[str | None, str | None]:
    """The level a state puts its entity at, and why (a band's message, "unavailable",
    "outside every band"); (None, None) while unavailable and the record ignores that.
    `current`: the level it has now, which a numeric record's `accuracy` holds to while
    the reading is too close to an edge to be sure (in_bands)."""
    if record.get("kind") == "available":  # there at all; unknown counts as there
        if state is None or state == "unavailable":
            level = record.get("unavailable", "error")
            message = record.get("message") or "unavailable"
            return (None, None) if level == IGNORE else (level, message)
        side = record.get("available") or {}
        return side.get("level", "nominal"), side.get("message") or None
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
    return in_bands(record, value, current)


def in_bands(
    record: dict[str, Any], value: float, current: str | None
) -> tuple[str, str | None]:
    """A number's level by the bands. A meter is only so accurate (the record's
    `accuracy`: {amount, percent}, a percentage of each edge or an amount in its unit),
    so a reading within that of an edge might be either side of it. Then: a worse level
    counts only once the reading is past the edge by the accuracy; a better one as soon
    as it's back inside the real edge; in between the level holds, so a reading on the
    line doesn't flap. At the start (no `current`), the doubt goes the better way."""
    accuracy = record.get("accuracy") or {}
    amount = accuracy.get("amount") or 0

    def margin(edge: float | None) -> float:
        if edge is None:
            return 0
        return abs(edge) * amount / 100 if accuracy.get("percent") else amount

    # Each band the reading is in, or might be in: (level, message), the real one first.
    real: tuple[str, str | None] = (
        record.get("otherwise", "error"),
        "outside every band",
    )
    maybe: list[tuple[str, str | None]] = []
    for band in record.get("bands") or []:
        low, high = band.get("from"), band.get("to")
        found = (band.get("level", "nominal"), band.get("message") or None)
        if (low is None or value >= low) and (high is None or value < high):
            real = found
        elif (low is None or value >= low - margin(low)) and (
            high is None or value < high + margin(high)
        ):
            maybe.append(found)
    if current is not None and rank(real[0]) <= rank(current):
        return real  # better (or the same): the real edge is enough
    held = [m for m in maybe if m[0] == current]
    if held:
        return held[0]
    # Worse, or the start: the best it might be (no better than it was).
    floor = -1 if current is None else rank(current)
    return min(
        (m for m in [real, *maybe] if rank(m[0]) > floor),
        key=lambda m: rank(m[0]),
    )


def escalation(
    record: dict[str, Any], real: str, stood: float
) -> tuple[str, float | None]:
    """The level shown for a `real` level that has stood `stood` seconds, by the record's
    ladder (`escalate`: {level: seconds at that level before it moves up one}, each
    rung timed from reaching it), and the seconds until the next step (None: it stops
    there). Worked out each time, never counted, so a restart doesn't reset it."""
    ladder = record.get("escalate") or {}
    level, reached = real, 0.0
    while level in ladder and rank(level) < len(LEVELS) - 1:
        due = reached + ladder[level]
        if stood < due:
            return level, due - stood
        level, reached = LEVELS[rank(level) + 1], due
    return level, None


def span(seconds: float) -> str:
    """A length of time as the page writes it: "45 s", "90 min", "6 h", "1.5 days"."""
    for size, unit in ((86400, "day"), (3600, "h"), (60, "min")):
        if seconds >= size:
            n = f"{seconds / size:.1f}".removesuffix(".0")
            return f"{n} {unit}{'s' if unit == 'day' and n != '1' else ''}"
    return f"{seconds:.0f} s"


def stale_message(stale: dict[str, Any], restamped: bool = False) -> str:
    """What a stale sensor says: its record's message, else "no report for 6 h" (or "no
    change"). `restamped`: its last report is from before Home Assistant finished
    starting, which stamps every restored entity as just reported, so how long it has
    really been silent isn't known and the message says only that."""
    if stale.get("message"):
        return stale["message"]
    what = "change" if stale.get("by") == "change" else "report"
    if restamped:
        return f"no {what} since Home Assistant started"
    return f"no {what} for {span(stale['after'])}"


def by_name(row: dict[str, Any]) -> list[tuple[bool, int, str]]:
    """By name as people count: Appliance 2 before Appliance 10."""
    words = (row.get("name") or "").lower().split()
    return [(not w.isdecimal(), int(w) if w.isdecimal() else 0, w) for w in words]


def listing(
    now: dict[str, dict[str, Any]], levels: list[str] | None = None
) -> list[dict[str, Any]]:
    """Every watched entity at one of `levels` (all but nominal when None), worst first,
    then longest standing: the `list` service's answer."""
    wanted = set(levels or LEVELS[1:])
    rows, under = [], {}
    for eid, row in now.items():
        if parent := row.get("under"):
            under.setdefault(parent, []).append({"entity_id": eid, **row})
        elif row.get("level") in wanted:
            rows.append({"entity_id": eid, **row})
    for row in rows:  # a failed integration's: the sensors rolled up into it
        if sensors := under.get(row["entity_id"]):
            row["sensors"] = sorted(sensors, key=by_name)
    return sorted(rows, key=lambda r: (-rank(r["level"]), r.get("since") or ""))


def in_group(
    records: dict[str, Any], now: dict[str, dict[str, Any]], group: str
) -> dict[str, dict[str, Any]]:
    """The rows a group is asked about: its members', and the integrations that any of
    them are rolled up into, or the group would look well while its sensors are gone."""
    mine = {
        e: n for e, n in now.items() if (records.get(e) or {}).get("group") == group
    }
    parents = {n["under"] for n in mine.values() if n.get("under")}
    return mine | {p: now[p] for p in parents if p in now}


def displayed(value: Any, precision: int | None) -> Any:
    """A reading as Home Assistant shows it: a number rounded to the entity's display
    precision when it has one (HA's frontend shows every digit otherwise), anything else
    as it is. The app's live values use the same rule (its common.displayed)."""
    if precision is None:
        return value
    try:
        return f"{float(value):.{precision}f}"
    except (TypeError, ValueError):
        return value


def watching(
    records: dict[str, Any], now: dict[str, dict[str, Any]], entity_id: str
) -> dict[str, Any]:
    """One entity's watch, as the eye in its Home Assistant dialog and the gauge card
    show it: whether it's watched, and if so its level now (none yet while it waits out
    a hold-off) and what the gauge draws from its record: its kind, what it reads, and
    a numeric one's bands (their edges and levels; the level at none of them)."""
    record = records.get(entity_id)
    if record is None:
        return {"watched": False}
    row = now.get(entity_id) or {}

    keep = ("level", "message", "escalated", "real", "since", "stale")
    watch = {"watched": True, "kind": record.get("kind", "numeric")}
    watch |= {k: row[k] for k in keep if row.get(k) is not None}
    watch |= {
        k: record[k] for k in ("attribute", "days_until", "disabled") if record.get(k)
    }
    if watch["kind"] == "numeric":
        watch["bands"] = [
            {
                "from": b.get("from"),
                "to": b.get("to"),
                "level": b.get("level", LEVELS[0]),
            }
            for b in record.get("bands") or []
        ]
        watch["otherwise"] = record.get("otherwise", "error")
    return watch


def fault(key: str, row: dict[str, Any]) -> str | None:
    """The kind of fault a row has, so a snooze can tell another kind from the one it was
    given: an integration's state (retrying, or an error that needs someone), a sensor's
    being unavailable, having stopped reporting, or what it reads. None for an
    integration that isn't loaded: it passes through that at each reload, which says
    nothing of what is wrong with it."""
    if key.startswith(INTEGRATION):
        return None if row["value"] == "not_loaded" else str(row["value"])
    return "gone" if row.get("gone") else "stale" if row.get("stale") else "reading"


def still(key: str, row: dict[str, Any], now: datetime) -> str:
    """What a fault says as its snooze runs out: "still failing, down 16 days: ..."."""
    lasted = span((now - datetime.fromisoformat(row["since"])).total_seconds())
    said = (
        f"still failing, down {lasted}"
        if key.startswith(INTEGRATION)
        else f"still so after {lasted}"
    )
    return f"{said}: {row['message']}" if row.get("message") else said


def summary(now: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """The worst level, a count per level, and the culprits per level (worst first,
    then longest standing), from each entity's current {level, message, value, since,
    name}. Entities with no level (ignored while unavailable) don't count, nor do those
    rolled up into a failed integration (`rolled_up`: how many): its row is their one.
    Nor do those snoozed (`snoozed`, and `snoozed_list`, the first to end first): a
    known fault held the worst level, and what came after it changed nothing."""
    counted = {
        e: n
        for e, n in now.items()
        if n.get("level") in LEVELS and not n.get("under") and not n.get("snoozed")
    }
    worst = max((n["level"] for n in counted.values()), key=rank, default="nominal")
    snoozed = sorted(
        (e for e, n in now.items() if n.get("snoozed") and not n.get("under")),
        key=lambda e: now[e]["snoozed"]["until"],
    )
    out: dict[str, Any] = {
        "worst": worst,
        "watching": len(now),
        "rolled_up": sum(1 for n in now.values() if n.get("under")),
        "snoozed": len(snoozed),
        "snoozed_list": [
            {
                "entity_id": e,
                **{k: now[e].get(k) for k in ("name", "level", "message", "since")},
                **now[e]["snoozed"],
            }
            for e in snoozed[:MAX_LISTED]
        ],
    }
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


def track_failures(
    entries: list[dict[str, Any]], failing: dict[str, dict[str, Any]], now: float
) -> None:
    """Which integrations are failing, since when (`now`, a timestamp) and why, in
    `failing` (by entry id; updated here, kept by the caller across restarts). Only proof
    ends a failure: loaded, disabled or deleted. Home Assistant passes through "setup in
    progress" at each retry, and counting that as a recovery said "back" every ten
    minutes of an outage and lost how long it had lasted (to 2026.11.11)."""
    seen = set()
    for e in entries:
        entry_id = e["entry_id"]
        # A discovery the user chose to ignore is kept as an entry that never loads.
        if e["disabled"] or e.get("source") == "ignore" or e["state"] == "loaded":
            continue
        known = failing.get(entry_id)
        if e["state"] in FAILED:
            failing[entry_id] = {
                "since": known["since"] if known else now,
                "state": e["state"],
                "reason": e.get("reason"),
            }
        elif not known:
            continue  # setting up for the first time: no failure
        seen.add(entry_id)
    for over in set(failing) - seen:
        del failing[over]


def failure_message(failure: dict[str, Any], rolled_up: int = 0) -> str:
    """What a failed integration's row says: "not connecting, 4 watched sensors
    unavailable: 503 Service Unavailable"."""
    state = str(failure["state"])
    said = FAILING.get(state, state.replace("_", " "))
    if rolled_up:
        sensors = "sensor" if rolled_up == 1 else "sensors"
        said += f", {rolled_up} watched {sensors} unavailable"
    return f"{said}: {failure['reason']}" if failure.get("reason") else said


def titled(entry: dict[str, Any]) -> str:
    """An integration's row's name: the integration's, then its entry's title, which
    alone can name the wrong thing (a cloud's is often "Home Assistant Cloud")."""
    title, name = entry["title"], entry.get("integration")
    if not name:
        return f"{title} ({entry['domain']})"
    return title if title.casefold() == name.casefold() else f"{name} ({title})"


def system_rows(
    components: set[str],
    entries: list[dict[str, Any]],
    failing: dict[str, dict[str, Any]],
    now: float,
    settings: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Home Assistant's own health as rows like a watched sensor's: the Recorder and
    History (critical when not running, nominal when they are) and each integration that
    has been failing for SETTLE seconds (error). `entries`: each config entry's
    entry_id, domain, integration (its name), title, state, reason, source and disabled;
    `failing`: track_failures'; `settings` (the page's): `core` and `integrations` on or
    off, and `ignore` (entry ids)."""
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
    if not settings.get("integrations", True):
        return rows
    ignored = set(settings.get("ignore") or [])
    for e in entries:
        failure = failing.get(e["entry_id"])
        if not failure or e["entry_id"] in ignored or settling(failure, now):
            continue
        rows[f"{INTEGRATION}{e['entry_id']}"] = {
            "name": titled(e),
            "level": "error",
            "value": failure["state"],
            "message": failure_message(failure),
            "since": datetime.fromtimestamp(failure["since"], UTC).isoformat(),
        }
    return rows


def settling(failure: dict[str, Any], now: float) -> bool:
    """Still within the time an integration has to set up. A clock put back counts as
    time up: better early than never."""
    return 0 <= now - failure["since"] < SETTLE


TRIGGERS = ("reached", "escalated", "back")  # the device triggers (device_trigger.py)


def trigger_matches(
    kind: str, level: str | None = None, group: str | None = None
) -> list[dict[str, Any]]:
    """The events a device trigger fires on, as event data to match (each a subset of
    the event's): `reached` a level or worse (one match per level, so a jump straight to
    critical counts), `escalated` (a step of a ladder), `back` to nominal. Never a level
    found at Home Assistant's start or an edited watch (`initial`): it wasn't reached then.
    `group`: only that group's sensors (and the failed integrations they are rolled up
    into, which are said again for each group); none: each change once."""
    only = {"initial": False} | ({"group": group} if group else {"for_group": False})
    if kind == "reached":
        least = rank(level or "warning")
        return [only | {"level": lv} for lv in LEVELS[max(1, least) :]]
    if kind == "escalated":
        return [only | {"escalated": True}]
    if kind == "back":
        return [only | {"level": "nominal"}]
    raise ValueError(f"no device trigger {kind}")
