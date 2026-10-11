"""Sensor Watch's constants and its records, checked before they are saved.

A record watches one entity (keyed by its entity id):
- numeric: `bands`, each {from, to, level, message}: from inclusive, to exclusive,
  either open (None); `otherwise`, the level of a value in no band;
- binary: `off` and `on`, each {level, message}: what each state means, so either can
  be nominal, or neither (a task when off, an error when on). Records from before
  2026.10.8-b20 have `nominal` (the state all is well in), `other` (the other's level)
  and `message`: read as they are (sides()), turned into the new form when saved, and
  sent to the integration in both (with_legacy(), for one not yet restarted);
- state (exact states): `states` (the nominal ones, as text: "0", or "idle" and
  "standby"), `exceptions` (states with a level and message of their own: a lock's
  "jammed"), `other` (the level of anything else) and its `message`;
- both: `unavailable` (a level, or "ignore"), `hold_off` (seconds a new level must last
  before it counts), and an optional display `name`.
The integration works out the levels (casa_mia_sensor_watch/levels.py, whose LEVELS
must match these; a test checks)."""

from __future__ import annotations

import json
from typing import Any

LEVELS = ("nominal", "task", "warning", "error", "critical")
IGNORE = "ignore"
KINDS = ("numeric", "binary", "state")
DEFAULT_HOLD_OFF = 60  # seconds
MAX_HOLD_OFF = 24 * 3600
MAX_BANDS = 12
MAX_STATES = 20
MAX_TEXT = 80  # a name
# A message: past 80 characters, notifications and cards may cut it short (the page says so).
MAX_MESSAGE = 255
DOMAIN = "casa_mia_sensor_watch"  # the integration: its websocket command, its entities

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
        raise BadRequest("kind: numeric, binary or state.")
    hold_off = _number(body.get("hold_off", DEFAULT_HOLD_OFF), "Hold-off")
    if hold_off is None or not 0 <= hold_off <= MAX_HOLD_OFF:
        raise BadRequest(f"Hold-off: 0 to {MAX_HOLD_OFF} seconds.")
    record: dict[str, Any] = {
        "entity_id": entity_id,
        "kind": kind,
        "name": _text(body.get("name"), "Name"),
        "hold_off": int(hold_off),
        "unavailable": _level(
            body.get("unavailable", "error"), "When unavailable", True
        ),
    }
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
    for a, b in zip(out, out[1:]):
        a_high = float("inf") if a["to"] is None else a["to"]
        b_low = float("-inf") if b["from"] is None else b["from"]
        if b_low < a_high:
            raise BadRequest(f"Bands overlap: {_span(a)} and {_span(b)}.")
    record["bands"] = out
    record["otherwise"] = _level(body.get("otherwise", "error"), "Outside every band")
    return record


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
