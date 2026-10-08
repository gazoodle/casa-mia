"""Screenshot swap: while swap.json in the integration's folder on the box holds `"swap":
true`, every other key in it (a real string: a phone number, a name, an address) is shown
as its value (a stand-in), and a stand-in coming back from the page is turned into the real
string again. For screenshots without private data: edit it in place on the box, and each
save shows on the panel within 5 s. The component install leaves it alone.

Applied where strings leave and enter the app: the admin API and /health (so the
integration too: only its shown text, see out_shown), the guest QR codes shown on the
page, and the guest welcome page."""

from __future__ import annotations

import json
import logging
import re
import urllib.parse
from collections.abc import Callable
from pathlib import Path
from typing import NamedTuple

_LOGGER = logging.getLogger(__name__)

PATH = Path("/homeassistant/custom_components/casa_mia/swap.json")

Rule = Callable[[str], str]


def _same(text: str) -> str:
    return text


# Settings in swap.json beside the strings: `original_photo` (true: the shipped house
# photo), `camera_images` (a camera's real title -> a picture shown in place of its feed,
# a path beside swap.json, e.g. "swap/backyard.jpg").
SETTINGS = ("swap", "original_photo", "camera_images")


class State(NamedTuple):
    mtime: int | None
    out: Rule
    back: Rule
    stamp: str
    photo: bool
    images: dict[str, Path]
    pairs: dict[str, str] = {}  # real -> stand-in, as swap.json says


# Replaced whole, so the server's threads see one or the other.
_state = State(None, _same, _same, "", False, {})


def _rule(pairs: dict[str, str]) -> Rule:
    """One pass, longest first, so a replacement is never replaced again. Not inside a
    longer word ("Ann" leaves "Annex"), but digits and _ are no word: a number still
    matches inside "+44...", a name inside "camera.oak_tree_main"."""
    if not pairs:
        return _same
    keys = "|".join(re.escape(k) for k in sorted(pairs, key=len, reverse=True))
    pattern = re.compile(rf"(?<![^\W\d_])(?:{keys})(?![^\W\d_])")
    return lambda text: pattern.sub(lambda m: pairs[m.group(0)], text)


def _images(found: object, folder: Path) -> dict[str, Path]:
    """`camera_images` as paths, each kept inside swap.json's folder. Whether the
    picture is there is asked when it is used: pictures often arrive after swap.json."""
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


def _read(path: Path) -> State:
    """The swap as swap.json says (off when it is unreadable or says so)."""
    mtime = path.stat().st_mtime_ns
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        _LOGGER.warning(
            "screenshot swap: %s is unreadable, so it is off (%s)", path, exc
        )
        return State(mtime, _same, _same, "", False, {})
    if not isinstance(data, dict) or data.get("swap") is not True:
        return State(mtime, _same, _same, "", False, {})
    pairs = {
        k: v for k, v in data.items() if k not in SETTINGS and k and isinstance(v, str)
    }
    plain = dict(pairs)
    # JSON answers send non-ASCII as escapes (é as a backslash-u code): match those too.
    for k, v in list(pairs.items()):
        pairs.setdefault(json.dumps(k)[1:-1], json.dumps(v)[1:-1])
    back = {v: k for k, v in pairs.items() if v}
    photo = data.get("original_photo") is True
    images = _images(data.get("camera_images"), path.parent)
    on = bool(pairs or photo or images)
    return State(
        mtime,
        _rule(pairs),
        _rule(back),
        str(mtime) if on else "",
        photo,
        images,
        plain,
    )


def _current() -> State:
    global _state
    try:
        mtime: int | None = PATH.stat().st_mtime_ns
    except OSError:
        mtime = None
    if mtime == _state.mtime:
        return _state
    try:
        _state = (
            _read(PATH)
            if mtime is not None
            else State(None, _same, _same, "", False, {})
        )
    except OSError:  # gone between the two looks
        _state = State(None, _same, _same, "", False, {})
    if _state.stamp:
        _LOGGER.info(
            "screenshot swap on: strings replaced%s%s",
            ", the shipped house photo shown" if _state.photo else "",
            f", {len(_state.images)} camera pictures" if _state.images else "",
        )
    else:
        _LOGGER.info("screenshot swap off")
    return _state


def out(text: str) -> str:
    """Real strings as their stand-ins, on the way to a page."""
    return _current().out(text)


# Strings a machine reads, not a person: an entity id, an address or a path. Home
# Assistant keeps what the integration is given (it never comes back to be swapped back),
# so these stay real there: a swapped one points at nothing.
_MACHINE = re.compile(r"[a-z_]+\.[a-z0-9_]+|.*://.*|/.*", re.DOTALL)


def out_shown(value: object) -> object:
    """`out` for the integration's JSON: only the text it shows (string values), never
    dict keys or machine strings (_MACHINE)."""
    if isinstance(value, dict):
        return {k: out_shown(v) for k, v in value.items()}
    if isinstance(value, list):
        return [out_shown(v) for v in value]
    if isinstance(value, str) and not _MACHINE.fullmatch(value):
        return out(value)
    return value


def back(text: str) -> str:
    """Stand-ins as the real strings, on the way in from a page."""
    return _current().back(text)


def stamp() -> str:
    """Changes whenever the swap does ("" while off), so an open panel can reload."""
    return _current().stamp


def original_photo() -> bool:
    """The shipped house photo is shown in place of the uploaded one (which is kept)."""
    return _current().photo


def camera_image(title: str) -> Path | None:
    """The picture shown in place of the camera titled `title`, if the swap has one
    and it is there."""
    path = _current().images.get(title)
    return path if path and path.is_file() else None


def pairs() -> dict[str, str]:
    """Real -> stand-in, as swap.json says ({} while off): for a page to swap itself."""
    return _current().pairs


def out_bytes(data: bytes, ctype: str) -> bytes:
    """`out` for a text answer (JSON, HTML, SVG...); anything else as it is."""
    if not ctype.startswith("text/") and not any(
        t in ctype for t in ("json", "javascript", "xml")
    ):
        return data
    try:
        return out(data.decode()).encode()
    except UnicodeDecodeError:
        return data


def back_bytes(data: bytes) -> bytes:
    """`back` for a request body, unless it is binary (an uploaded photo)."""
    try:
        return back(data.decode()).encode()
    except UnicodeDecodeError:
        return data


def back_path(path: str) -> str:
    """`back` for a URL path, which arrives %-encoded; as it came unless a stand-in is in it."""
    plain = urllib.parse.unquote(path)
    real = back(plain)
    return path if real == plain else urllib.parse.quote(real, safe="/")
