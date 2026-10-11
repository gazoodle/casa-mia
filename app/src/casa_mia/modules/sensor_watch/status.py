"""Sensor Watch's overall health for the Home tile, kept for /health: summarised from
the integration's `list` service each time live.py asks it (on connecting, and when a
level moves), so the tile follows Home Assistant as it changes."""

from __future__ import annotations

import logging
import threading
from typing import Any

from ...ha import HA, HAError
from .common import DOMAIN, LEVELS

_LOGGER = logging.getLogger(__name__)

MISSING = "Add the Casa Mia Sensor Watch integration to see the levels."


def summarise(response: dict[str, Any]) -> dict[str, Any]:
    """The tile's view of a `list` answer: the worst level, a count per level, and the
    worst culprit (the list comes worst first, then longest standing)."""
    rows = response.get("sensors") or []
    counts = {
        lv: n
        for lv in LEVELS[1:]
        if (n := sum(1 for r in rows if r.get("level") == lv))
    }
    top = next((r for r in rows if r.get("level") != "nominal"), None)
    return {
        "health": response.get("worst") or "nominal",
        "counts": counts,
        "worst": top
        and f"{top.get('name') or top.get('entity_id')}: {top.get('message') or top.get('value')}",
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

    def poll(self) -> dict[str, Any] | None:
        """Ask the integration for every watched sensor's level now; keep the overall
        health, and return the answer (None when it can't say, and why is kept)."""
        if self.ha is None:
            return None
        response = None
        try:
            (result,) = self.ha.call(
                {
                    "type": "call_service",
                    "domain": DOMAIN,
                    "service": "list",
                    "service_data": {"levels": list(LEVELS)},
                    "return_response": True,
                }
            )
            response = (result or {}).get("response") or {}
            found = summarise(response) | {"problem": None}
        except HAError as exc:
            _LOGGER.debug("overall health: %s", exc)
            found = {"health": None, "counts": {}, "worst": None, "problem": MISSING}
        with self._lock:
            before, self._now = self._now.get("health"), found
        if found["health"] != before:
            _LOGGER.info(
                "overall health: %s -> %s%s",
                before or "unknown",
                found["health"] or "unknown",
                f" (worst: {found['worst']})" if found["worst"] else "",
            )
        return response
