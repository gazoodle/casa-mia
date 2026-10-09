"""camera_dashboard: Shared constants, the store's defaults and small helpers."""

from __future__ import annotations

import copy
import json
import re
from typing import Any

from ..compositor import (
    EMPTY_COMMANDER,
    commanders_of,
)

DRAFT_PORT = 8098


BACKUPS = "camera-dashboard-backups"


DEPLOYED = "camera-dashboard-live.json"  # the store as last deployed live
DEPLOYS = "camera-dashboard-deploys.json"  # when each was last deployed: live, preview


SETTINGS = "camera-dashboard-settings.json"  # {"keep": older live versions to keep}


MAX_KEEP = 5


DEFAULT_KEEP = 3


PREVIEW = (
    "-preview"  # a preview dashboard's url_path ends with this; it keeps one backup
)


# A 1x1 transparent image: the tap zones over a composite.
BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"


# The same, marked: the commander's highlight, which Keep camera pictures live pulses.
HIGHLIGHT = BLANK + "#cm-highlight"


URL_PATH = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)+$")  # HA wants a hyphen in it


FITS = (
    "cover",
    "contain",
    "stack",
    "reverse",
    "centre",
)  # a panel's (see EMPTY_COMMANDER)


CARDS = ("picture-entity", "webrtc-camera", "advanced-camera-card")


DEFAULTS: dict[str, Any] = {
    "dashboard": "dashboard-cameras",
    "title": "Cameras",
    "home": "/lovelace",
    "help": "/lovelace/troubleshooting",
    "nav_style": "badges",  # Back / Home / Help as header badges, or "tiles"
    "theme": "",
    # Tiles need an entity; this one is only a placeholder (an input_button helper).
    "placeholder": "input_button.navigate_placeholder",
    # Screens by media query: portrait ones (for the commanders to come, each shown to
    # the screens it suits) and phones (the medium channel).
    "portrait_query": "(orientation: portrait)",
    "phone_query": "(max-width: 767px)",
    "wall_users": [],  # HA user ids of the wall tablets: they get the medium channel
    "live_card": "picture-entity",  # wall tablets and phones
    "hi_live_card": "",  # everyone else; blank = the same as live_card
    "compositor_host": "",  # blank = this box's LAN address
    "cameras": {},
    "commanders": [EMPTY_COMMANDER],  # in order: the dashboard's first pages
}


Response = tuple[int, str, bytes]


Store = dict[str, Any]


def with_defaults(store: Store) -> Store:
    """A store with every setting and nothing else (settings since dropped, such as the
    groups, are left out); its own copy, sharing nothing with DEFAULTS. A store from
    before there were several commanders gets its one as the first (named Cameras)."""
    if "commanders" not in store and isinstance(store.get("commander"), dict):
        store = {**store, "commanders": commanders_of(store)}
    return copy.deepcopy(
        {**DEFAULTS, **{k: v for k, v in store.items() if k in DEFAULTS}}
    )


# --- the module ------------------------------------------------------------------------


class BadRequest(Exception):
    pass


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
