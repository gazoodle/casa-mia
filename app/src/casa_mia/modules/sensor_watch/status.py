"""Sensor Watch's overall health for the Home tile: once a minute the app asks the
integration's `list` service what isn't nominal, and keeps the answer for /health (the
levels live in the integration; this is one small call a minute, whoever is looking)."""

from __future__ import annotations

import logging
import threading
from typing import Any

from ...ha import HA, HAError
from .common import DOMAIN, LEVELS

_LOGGER = logging.getLogger(__name__)

POLL = 60.0  # seconds
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
    top = rows[0] if rows else None
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
        self._stop = threading.Event()

    def now(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._now)

    def start(self) -> None:
        threading.Thread(
            target=self._run, name="sensor-watch-status", daemon=True
        ).start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            self.poll()
            self._stop.wait(POLL)

    def poll(self) -> None:
        """Ask the integration now; keep what it says (or why it couldn't)."""
        if self.ha is None:
            return
        try:
            (result,) = self.ha.call(
                {
                    "type": "call_service",
                    "domain": DOMAIN,
                    "service": "list",
                    "service_data": {},
                    "return_response": True,
                }
            )
            found = summarise((result or {}).get("response") or {}) | {"problem": None}
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
