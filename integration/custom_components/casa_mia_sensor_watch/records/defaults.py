"""Sensible records by what a sensor is (its domain and device class), offered by Watch
an entity and the scan before any history: a leak is critical, a low battery a task, a
window open a task. Where a sensor has one, it is used rather than a guess from history
(which knows how a sensor behaved, not what it means); either way the user confirms."""

from __future__ import annotations

from typing import Any

from .common import DEFAULT_HOLD_OFF, sides

# binary_sensor device class -> (the nominal state, the other's level, its message)
BINARY: dict[str, tuple[str, str, str]] = {
    "moisture": ("off", "critical", "Leak detected"),
    "smoke": ("off", "critical", "Smoke detected"),
    "gas": ("off", "critical", "Gas detected"),
    "carbon_monoxide": ("off", "critical", "Carbon monoxide detected"),
    "safety": ("off", "critical", "Unsafe"),
    "problem": ("off", "error", "Problem reported"),
    "connectivity": ("on", "error", "Disconnected"),
    "tamper": ("off", "warning", "Tampering detected"),
    "battery": ("off", "task", "Replace the battery"),
    "door": ("off", "task", "Door open"),
    "garage_door": ("off", "task", "Garage door open"),
    "window": ("off", "task", "Window open"),
    "opening": ("off", "task", "Open"),
}

# domain -> (nominal states, other's level, its message, [(state, level, message)])
STATES: dict[str, tuple[list[str], str, str, list[tuple[str, str, str]]]] = {
    "cover": (["closed"], "task", "Open", []),
    "lock": (["locked"], "task", "Unlocked", [("jammed", "error", "Jammed")]),
    "vacuum": (
        ["docked", "cleaning", "returning", "idle", "paused"],
        "error",
        "Vacuum error",
        [],
    ),
    "alarm_control_panel": (
        [
            "disarmed",
            "armed_home",
            "armed_away",
            "armed_night",
            "armed_vacation",
            "armed_custom_bypass",
            "arming",
            "pending",
            "disarming",
        ],
        "warning",
        "Alarm in an unexpected state",
        [("triggered", "critical", "Alarm triggered")],
    ),
    "lawn_mower": (
        ["docked", "mowing", "returning", "paused"],
        "error",
        "Mower error",
        [],
    ),
}

# What can't wait a minute: told the moment it happens (hold-off 0).
AT_ONCE = {"moisture", "smoke", "gas", "carbon_monoxide", "safety"}
AT_ONCE_DOMAINS = {"alarm_control_panel"}

BATTERY = [
    {"from": None, "to": 5, "level": "warning", "message": "Battery flat"},
    {"from": 5, "to": 20, "level": "task", "message": "Replace the battery"},
    {"from": 20, "to": None, "level": "nominal", "message": ""},
]
# A battery left needing replacing for a fortnight: a warning (the device goes dark).
BATTERY_ESCALATE = {"task": 14 * 86400}


# A date something is due (a spa's Rinse filter due): read as days until it, so the
# bands are days. A task in the fortnight before, a warning in its week, an error once
# it's passed, critical a month after.
DUE = [
    {
        "from": None,
        "to": -30,
        "level": "critical",
        "message": "Overdue by more than a month",
    },
    {"from": -30, "to": 0, "level": "error", "message": "Overdue"},
    {"from": 0, "to": 7, "level": "warning", "message": "Due this week"},
    {"from": 7, "to": 14, "level": "task", "message": "Due in under two weeks"},
    {"from": 14, "to": None, "level": "nominal", "message": ""},
]


def due_record() -> dict[str, Any]:
    """A due date's record: days until it, banded (DUE); judged at once."""
    return {
        "name": "",
        "hold_off": 0,
        "unavailable": "error",
        "kind": "numeric",
        "bands": DUE,
        "otherwise": "error",
        "days_until": True,
    }


def default_record(c: dict[str, Any]) -> dict[str, Any] | None:
    """The record for candidate `c` by what it is, or None to go by its history."""
    domain = c["entity_id"].split(".", 1)[0]
    at_once = c["device_class"] in AT_ONCE or domain in AT_ONCE_DOMAINS
    hold_off = 0 if at_once else DEFAULT_HOLD_OFF
    base = {"name": "", "hold_off": hold_off, "unavailable": "error"}
    if domain == "binary_sensor" and c["device_class"] in BINARY:
        nominal, other, message = BINARY[c["device_class"]]
        old = {"nominal": nominal, "other": other, "message": message}
        if c["device_class"] == "battery":
            base = base | {"escalate": BATTERY_ESCALATE}
        return base | {"kind": "binary"} | sides(old)
    if domain == "update":
        old = {"nominal": "off", "other": "task", "message": "Update available"}
        return base | {"kind": "binary"} | sides(old)
    if domain in STATES:
        states, other, message, exceptions = STATES[domain]
        return base | {
            "kind": "state",
            "states": states,
            "other": other,
            "message": message,
            "exceptions": [
                {"state": s, "level": lv, "message": m} for s, lv, m in exceptions
            ],
        }
    # A date entity is a day to come (a reminder). Not a timestamp sensor: most of those
    # are a day gone (last boot, last seen), so they go by what the user says.
    if domain == "date":
        return due_record()
    if domain == "sensor" and c["device_class"] == "battery" and c["unit"] == "%":
        return base | {
            "kind": "numeric",
            "bands": BATTERY,
            "otherwise": "error",
            "escalate": BATTERY_ESCALATE,
        }
    return None
