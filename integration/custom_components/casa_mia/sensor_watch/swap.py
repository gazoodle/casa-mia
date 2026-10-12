"""The screenshot swap, for what Sensor Watch shows in Home Assistant: while Casa Mia's
swap.json says `"swap": true`, each of its other keys (a real name, a place) is shown as
its value (a stand-in) in the event (so notifications), the `list` service (so the card)
and the status sensor's lists. Entity ids are left alone, so a tap still opens the
right entity. The same file and the same rule as the app's swap.py (app/src/casa_mia/
swap.py: _rule; a test keeps them alike). No Home Assistant imports, so the tests load
it by path."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

PATH = Path(__file__).parent.parent / "casa_mia" / "swap.json"
SETTINGS = ("swap", "original_photo", "camera_images")
# A row's or event's words that are shown (not its entity id, level or times).
SHOWN = ("name", "value", "message", "area", "group")

Rule = Callable[[str], str]


def same(text: str) -> str:
    return text


def rule(pairs: dict[str, str]) -> Rule:
    """One pass, longest first, so a replacement is never replaced again. Not inside a
    longer word ("Ann" leaves "Annex"), but digits and _ are no word."""
    if not pairs:
        return same
    keys = "|".join(re.escape(k) for k in sorted(pairs, key=len, reverse=True))
    pattern = re.compile(rf"(?<![^\W\d_])(?:{keys})(?![^\W\d_])")
    return lambda text: pattern.sub(lambda m: pairs[m.group(0)], text)


_seen: tuple[int | None, Rule] = (None, same)


def current(path: Path = PATH) -> Rule:
    """The swap as swap.json says now (read again only when it changes); off when it's
    gone, unreadable or says so. Blocking: run it in the executor."""
    global _seen
    try:
        mtime: int | None = path.stat().st_mtime_ns
    except OSError:
        mtime = None
    if mtime == _seen[0]:
        return _seen[1]
    found = same
    if mtime is not None:
        try:
            data = json.loads(path.read_text("utf-8"))
        except (OSError, ValueError):
            data = None
        if isinstance(data, dict) and data.get("swap") is True:
            found = rule(
                {
                    k: v
                    for k, v in data.items()
                    if k not in SETTINGS and k and isinstance(v, str)
                }
            )
    _seen = (mtime, found)
    return found


def shown(swap: Rule, row: dict[str, Any]) -> dict[str, Any]:
    """A row (or event) with its shown words swapped."""
    if swap is same:
        return row
    return row | {k: swap(v) for k in SHOWN if isinstance(v := row.get(k), str)}
