"""The screenshot swap, for what Sensor Watch shows in Home Assistant: while the swap is
on, its rules (casa_mia/swap_rules: Swap.rule) swap the shown words of the event (so
notifications), the `list` service (so the card) and the status sensor's lists. Entity
ids are left alone, so a tap still opens the right entity. No Home Assistant imports, so
the tests load it by path."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

# A row's or event's words that are shown (not its entity id, level or times).
SHOWN = ("name", "value", "message", "area", "group")

Rule = Callable[[str], str]


def same(text: str) -> str:
    return text


def shown(swap: Rule, row: dict[str, Any]) -> dict[str, Any]:
    """A row (or event) with its shown words swapped."""
    if swap is same:
        return row
    return row | {k: swap(v) for k in SHOWN if isinstance(v := row.get(k), str)}
