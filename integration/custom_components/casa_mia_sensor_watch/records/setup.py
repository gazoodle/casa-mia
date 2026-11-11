"""The first step of the page's set-up: what the house has many of, as groups to make.
Each class is a set of filters a group can hold (groups.py), how many entities not
watched yet it would take now, and the levels they would get: the built-in ones by what
each is (defaults.py), or, for an integration's mains voltage and frequency sensors, the
library's profile for Home Assistant's country.

Nothing is made here. The page makes the ticked ones with the routes it always uses, so
what the set-up leaves behind is ordinary profiles and groups."""

from __future__ import annotations

from typing import Any

from .defaults import default_record
from .groups import DEFAULTS

# Home Assistant's country -> how the library names its supply ("UK mains voltage").
# EU: the EU and EEA countries and Switzerland, where EN 50160 is the standard.
REGIONS = {"GB": "UK", "US": "US", "JP": "Japan", "CN": "China", "AU": "Australia"}
REGIONS |= dict.fromkeys(
    "AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LT LI LU MT NL NO PL PT RO SK"
    " SI ES SE CH".split(),
    "EU",
)
# A sensor's device class -> its unit, and the words of the library profile's name.
MAINS = {"voltage": ("V", "mains voltage"), "frequency": ("Hz", "grid frequency")}
# Classes named better than by their device class or domain.
NAMES = {
    "binary_sensor:moisture": "Leak sensors",
    "binary_sensor:battery": "Low-battery sensors",
    "sensor:battery": "Battery levels",
    "date:": "Dates due",
}


def _name(domain: str, device_class: str) -> str:
    """ "Smoke sensors" for a device class, "Covers" for a domain."""
    if found := NAMES.get(f"{domain}:{device_class}"):
        return found
    what = (device_class or domain).replace("_", " ").capitalize()
    return f"{what} sensors" if device_class else f"{what}s"


def _like(profile: dict[str, Any], state: str) -> bool:
    """Does this reading look like the supply the profile is for? A 12 V battery's
    voltage sensor on the same integration doesn't, and would be critical for ever.
    One that isn't a number now (unavailable) can't be told apart, and is taken.

    ponytail: within a fifth of the profile's outermost edges, read once, now. A sensor
    that reads far out at that moment is left out; it can be let back in on the group."""
    try:
        value = float(state)
    except (TypeError, ValueError):
        return True
    edges = [e for b in profile["bands"] for e in (b["from"], b["to"]) if e is not None]
    return min(edges) * 0.8 <= value <= max(edges) * 1.2


def classes(
    every: list[dict[str, Any]],
    watched: set[str],
    groups: list[dict[str, Any]],
    shipped: list[dict[str, Any]],
    country: str | None,
) -> list[dict[str, Any]]:
    """The groups worth making, biggest first: each with its `name`, its `filters`, the
    `count` it would take now, a `record` showing the levels, and either `profile`
    (DEFAULTS) or `library` (the library profile to take and follow) with `left` (those
    its filters match that don't read like mains). A class some group already has the
    filters of is not offered again."""
    region = REGIONS.get(country or "")
    supply = {
        dc: next(
            (p for p in shipped if p["name"].startswith(f"{region} {words}")), None
        )
        for dc, (_unit, words) in MAINS.items()
    }
    found: dict[tuple[tuple[str, str], ...], dict[str, Any]] = {}

    def row(name: str, filters: dict[str, str], **what: Any) -> dict[str, Any]:
        new = {"name": name, "filters": filters, "count": 0, "left": []} | what
        return found.setdefault(tuple(sorted(filters.items())), new)

    for c in every:
        if c["entity_id"] in watched:
            continue
        domain, dc = c["domain"], c["device_class"]

        # By what it is: one group per device class of sensor, or per domain.
        if (record := default_record(c)) is not None:
            classed = domain in ("binary_sensor", "sensor")
            filters = {"domain": domain} | ({"device_class": dc} if classed else {})
            name = _name(domain, dc if classed else "")
            row(name, filters, profile=DEFAULTS, record=record)["count"] += 1

        # An integration's mains sensors (twenty plugs each measuring the voltage).
        elif domain == "sensor" and c["platform"] and (profile := supply.get(dc)):
            unit, words = MAINS[dc]
            maker = c["platform"].replace("_", " ").capitalize()
            filters = {"domain": domain, "platform": c["platform"], "device_class": dc}
            mains = row(f"{maker} {words}", filters, library=profile, record=profile)
            if c["unit"] == unit and _like(profile, c["state"]):
                mains["count"] += 1
            else:
                mains["left"].append(c["entity_id"])

    made = [g["filters"] for g in groups]
    out = [r for r in found.values() if r["count"] and r["filters"] not in made]
    out.sort(key=lambda r: (-r["count"], r["name"]))
    return out
