"""Screenshot swap: while swap.json in the integration's folder on the box holds `"swap":
true`, every other key in it (a real string: a phone number, a name, an address) is shown
as its value (a stand-in), and a stand-in coming back from the page is turned into the real
string again. For screenshots without private data: edit it in place on the box, and each
save shows on the panel within 5 s. The component install leaves it alone.

Applied where strings leave and enter the app: the admin API and /health (so the
integration too), the guest QR codes shown on the page, and the guest welcome page."""

from __future__ import annotations

import json
import logging
import re
import urllib.parse
from collections.abc import Callable
from pathlib import Path

_LOGGER = logging.getLogger(__name__)

PATH = Path("/homeassistant/custom_components/casa_mia/swap.json")

Rule = Callable[[str], str]


def _same(text: str) -> str:
    return text


# (file mtime, out, back, stamp); replaced whole, so the server's threads see one or the other.
_state: tuple[int | None, Rule, Rule, str] = (None, _same, _same, "")


def _rule(pairs: dict[str, str]) -> Rule:
    """One pass, longest first, so a replacement is never replaced again."""
    if not pairs:
        return _same
    pattern = re.compile(
        "|".join(re.escape(k) for k in sorted(pairs, key=len, reverse=True))
    )
    return lambda text: pattern.sub(lambda m: pairs[m.group(0)], text)


def _pairs(path: Path) -> dict[str, str]:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        _LOGGER.warning(
            "screenshot swap: %s is unreadable, so it is off (%s)", path, exc
        )
        return {}
    if not isinstance(data, dict) or data.get("swap") is not True:
        return {}
    pairs = {k: v for k, v in data.items() if k != "swap" and k and isinstance(v, str)}
    # JSON answers send non-ASCII as escapes (é as a backslash-u code): match those too.
    for k, v in list(pairs.items()):
        pairs.setdefault(json.dumps(k)[1:-1], json.dumps(v)[1:-1])
    return pairs


def _current() -> tuple[int | None, Rule, Rule, str]:
    global _state
    try:
        mtime: int | None = PATH.stat().st_mtime_ns
    except OSError:
        mtime = None
    if mtime == _state[0]:
        return _state
    pairs = _pairs(PATH) if mtime is not None else {}
    back = {v: k for k, v in pairs.items() if v}
    _state = (mtime, _rule(pairs), _rule(back), str(mtime) if pairs else "")
    if pairs:
        _LOGGER.info("screenshot swap on: %d strings replaced", len(pairs))
    else:
        _LOGGER.info("screenshot swap off")
    return _state


def out(text: str) -> str:
    """Real strings as their stand-ins, on the way to a page."""
    return _current()[1](text)


def back(text: str) -> str:
    """Stand-ins as the real strings, on the way in from a page."""
    return _current()[2](text)


def stamp() -> str:
    """Changes whenever the swap does ("" while off), so an open panel can reload."""
    return _current()[3]


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
