"""Sensor Watch's constants and its records, checked before they are saved.

A record watches one entity (keyed by its entity id):
- numeric: `bands`, each {from, to, level, message}: from inclusive, to exclusive,
  either open (None), saved only as a ladder out from one nominal band (_ladder());
  `otherwise`, the level of a state that isn't a number (and, in a record saved before
  2026.10.11-b25, of a value in a gap between bands); `accuracy`
  (optional) {amount, percent}: how far the meter may be out, as a percentage of each
  edge or an amount in its unit, so a reading that close to an edge holds its level;
- binary: `off` and `on`, each {level, message}: what each state means, so either can
  be nominal, or neither (a task when off, an error when on). Records from before
  2026.10.8-b20 have `nominal` (the state all is well in), `other` (the other's level)
  and `message`: read as they are (sides()), turned into the new form when saved, and
  sent to the integration in both (with_legacy(), for one not yet restarted);
- state (exact states): `states` (the nominal ones, as text: "0", or "idle" and
  "standby"), `exceptions` (states with a level and message of their own: a lock's
  "jammed"), `other` (the level of anything else) and its `message`;
- available (whether it's there at all, whatever its state): `available` {level,
  message} for any state, `unknown` included; `unavailable` (below) and its `message`
  for unavailable or gone from Home Assistant (renamed, its integration removed). Either
  may be nominal: a level when something that should stay gone comes back;
- all: `unavailable` (a level, or "ignore"), `hold_off` (seconds a new, worse level
  must last before it counts; a better one counts at once), `unavailable_hold` (seconds
  it must be unavailable before that counts; an availability watch uses its hold-off),
  an optional display `name`, and an optional `attribute`: watch that
  attribute's value instead of the state (a climate's current_temperature, a cover's
  current_position); `days_until` (numeric only: the state is a date or timestamp, read
  as the days until it, negative once it's passed, so a reminder's due date is banded
  in days); and `disabled` (true: kept, with its group, but not watched: the
  integration isn't sent it, and the page lists it apart); `escalate` (optional)
  {level: seconds}: having stood that long at a level (task, warning or error), it
  shows the next one up, rung by rung (the integration's levels.escalation).
The integration works out the levels (casa_mia_sensor_watch/levels.py, whose LEVELS
must match these; a test checks)."""

from __future__ import annotations

import json
from typing import Any

LEVELS = ("nominal", "task", "warning", "error", "critical")
IGNORE = "ignore"
KINDS = ("numeric", "binary", "state", "available")
DEFAULT_HOLD_OFF = 60  # seconds
# seconds unavailable before it counts: a restart, a reload or a car asleep is usual.
# The integration's levels.UNAVAILABLE_HOLD, for records saved before it.
DEFAULT_UNAVAILABLE_HOLD = 300
MAX_HOLD_OFF = 24 * 3600
MAX_BANDS = 12
MAX_ACCURACY_PERCENT = 50
MAX_ESCALATE = 365 * 24 * 3600  # seconds at one level before it moves up
MAX_STATES = 20
MAX_TEXT = 80  # a name
# A message: past 80 characters, notifications and cards may cut it short (the page says so).
MAX_MESSAGE = 255
# In Casa Mia's integration (its own, casa_mia_sensor_watch, until 2026.10.10-b3): the
# event on each change of level, and the list service.
EVENT = "casa_mia_sensor_watch"
SERVICE = ("casa_mia", "sensor_watch_list")
REFRESH = ("casa_mia", "sensor_watch_refresh")  # every watch judged afresh
# The integration's websocket command the records are pushed by (its push.py), and its
# own entities' translation keys (the Home tile's health comes from the status, counts).
APPLY = "casa_mia/sensor_watch/apply"
STATUS = "sensor_watch_status"
COUNT = "sensor_watch_{}_count"


def own(entry: dict) -> bool:
    """Is this entity registry entry one of Sensor Watch's own (status, counts, problem)?
    Never watched: it would judge itself."""
    if entry.get("platform") == "casa_mia_sensor_watch":  # before it joined Casa Mia
        return True
    return entry.get("platform") == "casa_mia" and str(
        entry.get("translation_key") or ""
    ).startswith("sensor_watch_")


Response = tuple[int, str, bytes]


class BadRequest(Exception):
    pass


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()


def _level(value: Any, what: str, allow_ignore: bool = False) -> str:
    if value in LEVELS or (allow_ignore and value == IGNORE):
        return value
    raise BadRequest(
        f"{what}: one of {', '.join(LEVELS)}{' or ignore' if allow_ignore else ''}."
    )


def _text(value: Any, what: str, limit: int = MAX_TEXT) -> str:
    text = str(value or "").strip()
    if len(text) > limit:
        raise BadRequest(f"{what}: at most {limit} characters.")
    return text


def _number(value: Any, what: str) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise BadRequest(f"{what}: a number, or empty for open.")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise BadRequest(f"{what}: a number, or empty for open.") from None
    if number != number or number in (float("inf"), float("-inf")):
        raise BadRequest(f"{what}: a number, or empty for open.")
    return number


def clean(entity_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """The record to save for `entity_id`, or BadRequest saying what is wrong."""
    if "." not in entity_id or len(entity_id) > 255:
        raise BadRequest("Not an entity id.")
    kind = body.get("kind")
    if kind not in KINDS:
        raise BadRequest("kind: numeric, binary, state or available.")
    hold_off = _number(body.get("hold_off", DEFAULT_HOLD_OFF), "Hold-off")
    if hold_off is None or not 0 <= hold_off <= MAX_HOLD_OFF:
        raise BadRequest(f"Hold-off: 0 to {MAX_HOLD_OFF} seconds.")
    gone_hold = _number(
        body.get("unavailable_hold", DEFAULT_UNAVAILABLE_HOLD), "Unavailable for"
    )
    if gone_hold is None or not 0 <= gone_hold <= MAX_HOLD_OFF:
        raise BadRequest(f"Unavailable for: 0 to {MAX_HOLD_OFF} seconds.")
    record: dict[str, Any] = {
        "entity_id": entity_id,
        "kind": kind,
        "name": _text(body.get("name"), "Name"),
        **(
            {"attribute": a} if (a := _text(body.get("attribute"), "Attribute")) else {}
        ),
        "hold_off": int(hold_off),
        "unavailable_hold": int(gone_hold),
        "unavailable": _level(
            body.get("unavailable", "error"), "When unavailable", True
        ),
    }
    if escalate := _escalate(body.get("escalate")):
        record["escalate"] = escalate
    if kind == "binary":
        if "on" not in body and "off" not in body:  # the form before b20
            nominal = body.get("nominal", "off")
            if nominal not in ("on", "off"):
                raise BadRequest("Nominal state: on or off.")
            body = body | sides(body)
        for state, default in (("off", "nominal"), ("on", "warning")):
            side = body.get(state) or {}
            if not isinstance(side, dict):
                raise BadRequest(f"When {state}: a level and a message.")
            record[state] = {
                "level": _level(side.get("level", default), f"When {state}"),
                "message": _text(
                    side.get("message"), f"When {state}'s message", MAX_MESSAGE
                ),
            }
        return record
    if kind == "available":
        side = body.get("available") or {}
        if not isinstance(side, dict):
            raise BadRequest("When available: a level and a message.")
        record["available"] = {
            "level": _level(side.get("level", "nominal"), "When available"),
            "message": _text(
                side.get("message"), "When available's message", MAX_MESSAGE
            ),
        }
        record["message"] = _text(
            body.get("message"), "When unavailable's message", MAX_MESSAGE
        )
        return record
    if kind == "state":
        states = body.get("states")
        if not isinstance(states, list):
            raise BadRequest("Nominal states: a list.")
        cleaned = list(dict.fromkeys(_text(s, "Nominal state") for s in states))
        cleaned = [s for s in cleaned if s]
        if not cleaned or len(cleaned) > MAX_STATES:
            raise BadRequest(f"Nominal states: 1 to {MAX_STATES}.")
        record["states"] = cleaned
        record["other"] = _level(body.get("other", "error"), "Anything else's level")
        record["message"] = _text(body.get("message"), "Message", MAX_MESSAGE)
        exceptions = body.get("exceptions") or []
        if not isinstance(exceptions, list) or len(exceptions) > MAX_STATES:
            raise BadRequest(f"States with their own level: at most {MAX_STATES}.")
        record["exceptions"] = []
        for n, ex in enumerate(exceptions, 1):
            if not isinstance(ex, dict) or not _text(ex.get("state"), f"State {n}"):
                raise BadRequest(f"State {n} with its own level: which state?")
            record["exceptions"].append(
                {
                    "state": _text(ex.get("state"), f"State {n}"),
                    "level": _level(ex.get("level"), f"State {n}'s level"),
                    "message": _text(
                        ex.get("message"), f"State {n}'s message", MAX_MESSAGE
                    ),
                }
            )
        return record
    bands = body.get("bands")
    if not isinstance(bands, list) or not bands:
        raise BadRequest("A numeric sensor needs at least one band.")
    if len(bands) > MAX_BANDS:
        raise BadRequest(f"At most {MAX_BANDS} bands.")
    out = []
    for n, band in enumerate(bands, 1):
        if not isinstance(band, dict):
            raise BadRequest(f"Band {n}: expected from, to and level.")
        low, high = (
            _number(band.get("from"), f"Band {n} from"),
            _number(band.get("to"), f"Band {n} to"),
        )
        if low is not None and high is not None and low >= high:
            raise BadRequest(f"Band {n}: from must be below to.")
        out.append(
            {
                "from": low,
                "to": high,
                "level": _level(band.get("level"), f"Band {n} level"),
                "message": _text(band.get("message"), f"Band {n} message", MAX_MESSAGE),
            }
        )
    out.sort(key=lambda b: float("-inf") if b["from"] is None else b["from"])
    record["bands"] = _ladder(out)
    record["otherwise"] = _level(body.get("otherwise", "error"), "Not a number")
    if accuracy := _accuracy(body.get("accuracy")):
        record["accuracy"] = accuracy
    if body.get("days_until") is True:
        record["days_until"] = True
    return record


def _ladder(bands: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """`bands` (sorted) if they are a ladder out from nominal, else BadRequest: open at
    both ends, each edge shared with the next band (no gap, no overlap), exactly one
    nominal band, and each band out from it worse than the one inside. The editor can't
    write anything else; this refuses it from anywhere."""
    if bands[0]["from"] is not None or bands[-1]["to"] is not None:
        raise BadRequest(
            "Bands must be open at both ends: nothing below the lowest, nothing above the highest."
        )

    for a, b in zip(bands, bands[1:]):
        if a["to"] is None or b["from"] is None or b["from"] < a["to"]:
            raise BadRequest(f"Bands overlap: {_span(a)} and {_span(b)}.")
        if b["from"] > a["to"]:
            raise BadRequest(f"No band covers {a['to']:g}–{b['from']:g}.")

    nominal = [i for i, b in enumerate(bands) if b["level"] == "nominal"]
    if len(nominal) != 1:
        raise BadRequest("Exactly one band must be nominal.")

    # Walk out from nominal each way: the levels must only get worse.
    n = nominal[0]
    for side in (bands[n::-1], bands[n:]):
        for inner, outer in zip(side, side[1:]):
            if LEVELS.index(outer["level"]) <= LEVELS.index(inner["level"]):
                raise BadRequest(
                    f"Band {_span(outer)}: each band out from nominal must be worse than the one inside it."
                )
    return bands


def _escalate(value: Any) -> dict[str, int] | None:
    """A ladder: {level: seconds at it before the next one up}, for the levels that
    have one above them but nominal (nominal for too long is staleness, not severity);
    None for none."""
    if value is None:
        return None
    if not isinstance(value, dict):
        raise BadRequest("Escalate: for each level, how long before it moves up.")
    ladder = {}
    for level, seconds in value.items():
        if level not in LEVELS[1:-1]:
            raise BadRequest(f"Escalate: {', '.join(LEVELS[1:-1])} only.")
        n = _number(seconds, f"Escalate from {level}")
        if n is None or n == 0:
            continue
        if not 60 <= n <= MAX_ESCALATE:
            raise BadRequest(f"Escalate from {level}: a minute to a year.")
        ladder[level] = int(n)
    return ladder or None


def _accuracy(value: Any) -> dict[str, Any] | None:
    """A numeric record's accuracy, or None for none (missing, or an amount of 0)."""
    if value is None:
        return None
    if not isinstance(value, dict):
        raise BadRequest("Accuracy: an amount, and whether it's a percentage.")
    amount = _number(value.get("amount"), "Accuracy")
    if not amount:
        return None
    percent = value.get("percent") is True
    if amount < 0 or (percent and amount > MAX_ACCURACY_PERCENT):
        raise BadRequest(
            f"Accuracy: more than 0{f', at most {MAX_ACCURACY_PERCENT} %' if percent else ''}."
        )
    return {"amount": amount, "percent": percent}


def sides(record: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """An on/off record's `off` and `on`, from either form (unchecked)."""
    if "on" in record or "off" in record:
        return {
            s: record.get(s) or {"level": "nominal", "message": ""}
            for s in ("off", "on")
        }
    nominal = record.get("nominal", "off")
    other = "on" if nominal == "off" else "off"
    return {
        nominal: {"level": "nominal", "message": ""},
        other: {
            "level": record.get("other", "warning"),
            "message": record.get("message", ""),
        },
    }


def normal(record: dict[str, Any]) -> dict[str, Any]:
    """A record with an on/off watch in today's form (the page and the integration read
    that); any other as it is."""
    if record.get("kind") != "binary":
        return record
    old = ("nominal", "other", "message")
    return {k: v for k, v in record.items() if k not in old} | sides(record)


def with_legacy(record: dict[str, Any]) -> dict[str, Any]:
    """An on/off record with the form before b20 beside today's, for an integration not
    yet restarted: the better state as nominal, the other's level and message."""
    if record.get("kind") != "binary":
        return record
    s = sides(record)
    good = min(
        ("off", "on"),
        key=lambda k: LEVELS.index(s[k]["level"]) if s[k]["level"] in LEVELS else 0,
    )
    bad = "on" if good == "off" else "off"
    return record | {
        "nominal": good,
        "other": s[bad]["level"],
        "message": s[bad]["message"],
    }


def _span(band: dict[str, Any]) -> str:
    low = "…" if band["from"] is None else f"{band['from']:g}"
    high = "…" if band["to"] is None else f"{band['to']:g}"
    return f"{low}–{high}"


def displayed(value: Any, precision: int | None) -> Any:
    """A reading as Home Assistant shows it: a number rounded to the entity's display
    precision when it has one, anything else as it is. The same rule as the integration's
    levels.displayed, which gives each row its precision (a test holds them together)."""
    if precision is None:
        return value
    try:
        return f"{float(value):.{precision}f}"
    except (TypeError, ValueError):
        return value


def precision_of(entry: dict[str, Any]) -> int | None:
    """A sensor's display precision from its entity registry entry (yours, else its
    integration's suggested one), as HA's frontend takes it; none for anything else."""
    if not str(entry.get("entity_id", "")).startswith("sensor."):
        return None
    options = (entry.get("options") or {}).get("sensor") or {}
    if (precision := options.get("display_precision")) is not None:
        return precision
    return options.get("suggested_display_precision")
