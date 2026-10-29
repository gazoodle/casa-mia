"""Sensor Watch's overall health for the Home tile, kept for /health: taken from the
integration's own entities as Home Assistant pushes them (live.py hears them), the
status's level and culprits and a count per level, which the integration works out once
per change; so the tile follows Home Assistant as it changes."""

from __future__ import annotations

import logging
import threading
from typing import Any

from ...ha import HA, HAError
from .common import COUNT, LEVELS, SERVICE, STATUS

_LOGGER = logging.getLogger(__name__)

MISSING = "Restart Home Assistant (with Sensor Watch on) to see the levels: Casa Mia's integration watches them."


def summarise(own: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """The tile's view of the integration's entities (translation key -> its state as
    subscribe_entities gives it: `s`, attributes `a`): the worst level, a count per
    level, and the worst culprit (first in its level's list: longest standing)."""
    status = own.get(STATUS) or {}
    health = status.get("s") if status.get("s") in LEVELS else None
    counts = {}
    for lv in LEVELS[1:]:
        try:
            n = int(float((own.get(COUNT.format(lv)) or {}).get("s") or ""))
        except (TypeError, ValueError):  # unavailable, or not there
            continue
        if n:
            counts[lv] = n
    listed = (status.get("a") or {}).get(f"{health}_list") or [{}]
    top = listed[0] if health not in (None, "nominal") else {}
    return {
        "health": health,
        "counts": counts,
        "worst": (top or None)
        and f"{top.get('name') or top.get('entity_id')}: {top.get('message') or top.get('value')}",
        # No status: Sensor Watch isn't running in the integration.
        "problem": None if health else MISSING,
    }


class Status:
    def __init__(self, ha: HA | None) -> None:
        self.ha = ha
        self._lock = threading.Lock()
        self._now: dict[str, Any] = {
            "health": None,
            "counts": {},
            "worst": None,
            "problem": None,
        }

    def now(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._now)

    def heard(self, own: dict[str, dict[str, Any]]) -> None:
        """The integration's entities, as they are now (summarise)."""
        self._take(summarise(own))

    def poll(self) -> dict[str, Any] | None:
        """Ask the integration for every watched sensor's level now: its answer, or None
        when it can't say (and the tile says why)."""
        if self.ha is None:
            return None
        try:
            (result,) = self.ha.call(
                {
                    "type": "call_service",
                    "domain": SERVICE[0],
                    "service": SERVICE[1],
                    "service_data": {"levels": list(LEVELS)},
                    "return_response": True,
                }
            )
        except HAError as exc:
            _LOGGER.debug("overall health: %s", exc)
            self._take(
                {"health": None, "counts": {}, "worst": None, "problem": MISSING}
            )
            return None
        return (result or {}).get("response") or {}

    def _take(self, found: dict[str, Any]) -> None:
        with self._lock:
            before, self._now = self._now.get("health"), found
        if found["health"] != before:
            _LOGGER.info(
                "overall health: %s -> %s%s",
                before or "unknown",
                found["health"] or "unknown",
                f" (worst: {found['worst']})" if found["worst"] else "",
            )
