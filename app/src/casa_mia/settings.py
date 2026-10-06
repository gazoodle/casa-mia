"""Settings that have no other home, set on the admin page's Settings page (the cog by the
house photo's pencil). The integration gets them in /health and hands them to the dashboard
cards (its websocket command casa_mia/settings), so a change reaches a tablet within the
integration's poll (30 s) and its next view change or page load.

Admin API (/api/settings/): GET "" the values, PUT "" a change (known keys only, each of
its default's type)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)

# The app's config folder (backed up with the app); tests point it elsewhere.
FOLDER = Path("/config")
# Every setting, by section, with its default (which also gives its type).
DEFAULTS: dict[str, dict[str, Any]] = {
    "tablet_view": {
        "identify_panels": False,  # an outline round each panel
        "identify_outline": "1px solid red",  # CSS: the outline drawn
        "show_size": False,  # the view's size, in a label top right
    },
}
MAX_TEXT = 100

Response = tuple[int, str, bytes]


def _store() -> Path:
    return FOLDER / "settings.json"


def _clean(saved: Any) -> dict[str, dict[str, Any]]:
    """Every setting, the saved value where it is the right type, else the default."""
    saved = saved if isinstance(saved, dict) else {}
    out = {}
    for section, defaults in DEFAULTS.items():
        have = saved.get(section)
        have = have if isinstance(have, dict) else {}
        out[section] = {
            key: have[key] if type(have.get(key)) is type(default) else default
            for key, default in defaults.items()
        }
    return out


def values() -> dict[str, dict[str, Any]]:
    try:
        saved = json.loads(_store().read_text())
    except (OSError, ValueError):
        saved = {}
    return _clean(saved)


def _json(status: int, data: dict) -> Response:
    return status, "application/json", json.dumps(data).encode()


def _save(body: bytes) -> Response:
    try:
        change = json.loads(body or b"{}")
    except ValueError:
        return _json(400, {"error": "Not JSON."})
    current = values()
    for section, settings in change.items() if isinstance(change, dict) else []:
        for key, value in settings.items() if isinstance(settings, dict) else []:
            default = DEFAULTS.get(section, {}).get(key)
            if default is None or type(value) is not type(default):
                return _json(
                    400, {"error": f"Unknown setting or wrong type: {section}.{key}"}
                )
            if isinstance(value, str) and len(value) > MAX_TEXT:
                return _json(
                    400, {"error": f"{section}.{key}: at most {MAX_TEXT} characters."}
                )
            if current[section][key] != value:
                _LOGGER.info("setting %s.%s: %r", section, key, value)
            current[section][key] = value
    tmp = _store().with_suffix(".tmp")
    tmp.write_text(json.dumps(current, indent=2))
    tmp.replace(_store())
    return _json(200, current)


def handle(method: str, rest: str, query: dict, body: bytes) -> Response:
    rest = rest.strip("/")
    if method == "GET" and rest == "":
        return _json(200, values())
    if method == "PUT" and rest == "":
        return _save(body)
    return _json(404, {"error": "Unknown request."})
