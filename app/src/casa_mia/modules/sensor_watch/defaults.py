"""Sensible records by what a sensor is (its domain and device class), offered by Watch
an entity and the scan before any history: a leak is critical, a low battery a task, a
window open a task. Where a sensor has one, it is used rather than a guess from history
(which knows how a sensor behaved, not what it means); either way the user confirms."""

from __future__ import annotations

from typing import Any

from .common import DEFAULT_HOLD_OFF

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
    "lawn_mower": (
        ["docked", "mowing", "returning", "paused"],
        "error",
        "Mower error",
        [],
    ),
}

BATTERY = [
    {"from": None, "to": 5, "level": "warning", "message": "Battery flat"},
    {"from": 5, "to": 20, "level": "task", "message": "Replace the battery"},
    {"from": 20, "to": None, "level": "nominal", "message": ""},
]


def default_record(c: dict[str, Any]) -> dict[str, Any] | None:
    """The record for candidate `c` by what it is, or None to go by its history."""
    domain = c["entity_id"].split(".", 1)[0]
    base = {"name": "", "hold_off": DEFAULT_HOLD_OFF, "unavailable": "error"}
    if domain == "binary_sensor" and c["device_class"] in BINARY:
        nominal, other, message = BINARY[c["device_class"]]
        return base | {
            "kind": "binary",
            "nominal": nominal,
            "other": other,
            "message": message,
        }
    if domain == "update":
        return base | {
            "kind": "binary",
            "nominal": "off",
            "other": "task",
            "message": "Update available",
        }
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
    if domain == "sensor" and c["device_class"] == "battery" and c["unit"] == "%":
        return base | {"kind": "numeric", "bands": BATTERY, "otherwise": "error"}
    return None
