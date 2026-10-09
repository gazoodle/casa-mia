"""commander: shared constants and helpers; the integration's entities for each commander,
by unique id."""

from __future__ import annotations

import json
from typing import Any

from ..compositor import (
    commanders_of,
    slug,
)

# The integration's Camera Commander devices, one per commander: each one's Main camera
# select (options: its camera titles), which its taps and automations set. The first
# commander there was (id "") is on the Camera Commander device itself; the others on a
# device each, "Camera Commander <name>". Found in HA's entity registry by unique id.
COMMANDER_SELECT = "select.camera_commander_main_camera"


# Casa Mia Camera Commander's unique ids for a commander's entities, after its entry id and "_":
# the first commander's (id ""), and any other's.
# Per entity: its domain, its unique id for the first commander (id "") and for any
# other, and the end of the entity id the integration gives it.
UNIQUE_IDS = {
    "main": ("select", "commander_main", "commander_{}_main", "main_camera"),
    "track_motion": (
        "switch",
        "track_motion",
        "commander_{}_track_motion",
        "track_motion",
    ),
}


def commander_entities(
    store: dict[str, Any], registry: list[dict] | None, what: str = "main"
) -> dict[str, str]:
    """Each commander's (by id) Main camera select (`what` "main") or Track motion switch
    ("track_motion"): as HA's entity registry
    has it (by unique id), else the entity id the integration gives a new one (from its
    device's name)."""
    domain, first, other, name = UNIQUE_IDS[what]
    found = {
        e.get("unique_id", "").partition("_")[2]: e["entity_id"]
        for e in registry or []
        if e.get("platform") == "casa_mia_commander"
        and e["entity_id"].startswith(domain + ".")
    }
    out = {}
    for cmd in commanders_of(store):
        cid = cmd["id"]
        device = "camera_commander" + (
            "_" + slug(cmd["name"]).replace("-", "_") if cid else ""
        )
        out[cid] = found.get(other.format(cid) if cid else first) or (
            f"{domain}.{device}_{name}"
        )
    return out


def commander_selects(
    store: dict[str, Any], registry: list[dict] | None
) -> dict[str, str]:
    return commander_entities(store, registry, "main")


STORE = (
    "commanders.json"  # the commanders, and the address their pictures are served on
)
# Where the commanders were kept before: what was deployed live, else the draft.
OLD_STORES = ("camera-dashboard-live.json", "camera-dashboard.json")

Response = tuple[int, str, bytes]


class BadRequest(Exception):
    pass


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
