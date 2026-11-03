"""Screenshot swap: while it is on, each rule (a real string: a phone number, a name, an
address, and its stand-in; see engine.py) shows the stand-in in place of the real string.
For screenshots and demos without private data. Developer mode only (the app option).

The rules are kept in swap.json in the app's config folder and edited on the admin page's
Swap page (api.py). A swap.json hand-edited in the integration's folder, as before
2026.10.12-b8, is converted once and then left alone.

Every browser on Home Assistant swaps its own text, Casa Mia's pages included: the
integration fetches the rules (for_integration) when /health's stamp moves and tells them.
The app swaps only what no browser can (`out`): text drawn into pictures (QR codes, guest
cards, the compositor's labels) and the guest welcome and goodbye pages, which are public,
so the rules (the real strings) must never be sent to them."""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Any, NamedTuple

from .. import settings
from . import engine

_LOGGER = logging.getLogger(__name__)

# Set at start to the app's config folder; tests point it elsewhere.
PATH = Path("/config/swap.json")
# The hand-edited file from before 2026.10.12-b8. Its `camera_images` paths are beside it.
OLD = Path("/homeassistant/custom_components/casa_mia/swap.json")

Rule = Callable[[str], str]


def _same(text: str) -> str:
    return text


class State(NamedTuple):
    mtime: int | None
    out: Rule
    stamp: str
    photo: bool
    images: dict[str, Path]
    rules: list[dict[str, Any]] = []  # the enabled rules, as saved


# Replaced whole, so the server's threads see one or the other.
_state = State(None, _same, "", False, {})
_OFF = State(None, _same, "", False, {})


def _rule(rules: list[dict[str, Any]]) -> Rule:
    """The rules as one function (engine.py). A rule that won't compile is left out and
    logged by its number, not its text, which is a real string."""
    if not rules:
        return _same
    compiled = engine.Rules(rules)
    for i, why in compiled.errors:
        _LOGGER.warning("screenshot swap: rule %d left out (%s)", i + 1, why)
    return compiled.out


def _images(found: object, folder: Path) -> dict[str, Path]:
    """`camera_images` as paths, each kept inside `folder`. Whether the picture is there
    is asked when it is used: pictures often arrive after the rules."""
    if not isinstance(found, dict):
        return {}
    out = {}
    for title, name in found.items():
        path = (folder / str(name)).resolve()
        if not path.is_relative_to(folder.resolve()):
            _LOGGER.warning("screenshot swap: %s is outside %s, not used", name, folder)
        else:
            out[str(title)] = path
    return out


def new_id() -> str:
    return uuid.uuid4().hex[:8]


def document(path: Path | None = None) -> dict[str, Any]:
    """swap.json as saved, with every key there: off and empty when it is missing."""
    try:
        data = json.loads((path or PATH).read_text())
    except FileNotFoundError:
        data = {}
    except (OSError, ValueError) as exc:
        _LOGGER.warning(
            "screenshot swap: %s is unreadable, so it is off (%s)", PATH, exc
        )
        data = {}
    data = data if isinstance(data, dict) else {}
    rules = data.get("rules")
    return {
        "on": data.get("on") is True,
        "rules": [r for r in rules if isinstance(r, dict)]
        if isinstance(rules, list)
        else [],
        "original_photo": data.get("original_photo") is True,
        "camera_images": data.get("camera_images") or {},
    }


def save(doc: dict[str, Any]) -> None:
    """swap.json written whole (through a temporary file, so a reader never sees half)."""
    tmp = PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False))
    tmp.replace(PATH)


def adopt() -> None:
    """The hand-edited file from before 2026.10.12-b8 (OLD), converted once: its pairs
    become exact rules in PATH. OLD is left as it was."""
    if PATH.exists() or not OLD.exists():
        return
    try:
        old = json.loads(OLD.read_text())
    except (OSError, ValueError) as exc:
        _LOGGER.warning(
            "screenshot swap: %s is unreadable, not converted (%s)", OLD, exc
        )
        return
    if not isinstance(old, dict):
        return
    settings_keys = ("swap", "original_photo", "camera_images")
    rules = [
        {"id": new_id(), "match": k, "replace": v, "mode": "exact", "enabled": True}
        for k, v in old.items()
        if k not in settings_keys and k and isinstance(v, str)
    ]
    save(
        {
            "on": old.get("swap") is True,
            "rules": rules,
            "original_photo": old.get("original_photo") is True,
            "camera_images": old.get("camera_images") or {},
        }
    )
    _LOGGER.info("screenshot swap: %d rules converted from %s", len(rules), OLD)


def _read(mtime: int) -> State:
    """The swap as swap.json says (off when it says so, or out of developer mode)."""
    doc = document()
    if not doc["on"] or not settings.DEVELOPER:
        return _OFF._replace(mtime=mtime)
    rules = [r for r in doc["rules"] if r.get("enabled", True) is not False]
    photo = doc["original_photo"]
    images = _images(doc["camera_images"], OLD.parent)
    on = bool(rules or photo or images)
    return State(mtime, _rule(rules), str(mtime) if on else "", photo, images, rules)


def _current() -> State:
    global _state
    try:
        mtime: int | None = PATH.stat().st_mtime_ns
    except OSError:
        mtime = None
    if mtime == _state.mtime:
        return _state
    _state = _read(mtime) if mtime is not None else _OFF
    if _state.stamp:
        _LOGGER.info(
            "screenshot swap on: %d rules%s%s",
            len(_state.rules),
            ", the shipped house photo shown" if _state.photo else "",
            f", {len(_state.images)} camera pictures" if _state.images else "",
        )
    else:
        _LOGGER.info("screenshot swap off")
    return _state


def for_integration() -> dict[str, Any]:
    """What the integration fetches when /health's stamp moves: the stamp, and the
    enabled rules while the swap is on (none while off)."""
    state = _current()
    return {"stamp": state.stamp, "rules": state.rules if state.stamp else []}


def out(text: str) -> str:
    """Real strings as their stand-ins: for a picture, or a public page."""
    return _current().out(text)


def stamp() -> str:
    """Changes whenever the swap does ("" while off): the integration fetches the rules
    when it moves."""
    return _current().stamp


def original_photo() -> bool:
    """The shipped house photo is shown in place of the uploaded one (which is kept)."""
    return _current().photo


def camera_image(title: str) -> Path | None:
    """The picture shown in place of the camera titled `title`, if the swap has one
    and it is there."""
    path = _current().images.get(title)
    return path if path and path.is_file() else None
