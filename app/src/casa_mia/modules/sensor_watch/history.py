"""What Sensor Watch reads from Home Assistant: the sensors it could watch (with their
area, labels and integration, for the filters) and their history.

Numeric sensors with long-term statistics (a state_class) are read from the recorder's
hourly statistics (mean, min, max), which HA keeps for good; anything else from the
state history, which HA keeps only `purge_keep_days` (10 by default), so a 30-day ask
may get less: the answer says from when."""

from __future__ import annotations

import logging
import math
import threading
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from ...ha import HA
from .common import DOMAIN

_LOGGER = logging.getLogger(__name__)

# ponytail: the whole list is rebuilt each minute (get_states is a few MB in a big house);
# subscribe to state changes if that ever shows.
CANDIDATE_TTL = 60  # seconds
CHUNK = 50  # entities per history or statistics request
MAX_POINTS = 300  # chart points sent to the page
LIST_LIMIT = 200  # candidates sent to the page per query; the filters narrow it


def _is_number(text: Any) -> bool:
    try:
        return math.isfinite(float(text))
    except (TypeError, ValueError):
        return False


# What can be watched: sensors, and other entities whose state says something needs
# attention (a window open, a lock jammed, an update waiting, a vacuum stuck).
DOMAINS = (
    "sensor",
    "binary_sensor",
    "update",
    "cover",
    "lock",
    "valve",
    "vacuum",
    "lawn_mower",
)


def order(c: dict[str, Any]) -> tuple[str, str]:
    """Candidates' order (and a scan round's place in it): by name, then entity id."""
    return (c["name"].lower(), c["entity_id"])


def _since(days: float) -> str:
    return (datetime.now(UTC) - timedelta(days=days)).isoformat()


class Reader:
    def __init__(self, ha: HA) -> None:
        self.ha = ha
        self._lock = threading.Lock()
        self._at = 0.0
        self._cands: list[dict[str, Any]] = []
        self._labels: dict[str, str] = {}

    # -- the sensors

    def candidates(self) -> list[dict[str, Any]]:
        """Everything Sensor Watch could watch (DOMAINS; not its own entities)."""
        with self._lock:
            if time.monotonic() - self._at < CANDIDATE_TTL:
                return self._cands
            states, entities, devices, areas, labels = self.ha.call(
                {"type": "get_states"},
                {"type": "config/entity_registry/list"},
                {"type": "config/device_registry/list"},
                {"type": "config/area_registry/list"},
                {"type": "config/label_registry/list"},
            )
            reg = {e["entity_id"]: e for e in entities or []}
            device_area = {d["id"]: d.get("area_id") for d in devices or []}
            device_name = {
                d["id"]: d.get("name_by_user") or d.get("name") or ""
                for d in devices or []
            }
            area_name = {a["area_id"]: a["name"] for a in areas or []}
            self._labels = {lb["label_id"]: lb["name"] for lb in labels or []}
            out = []
            for st in states or []:
                eid = st["entity_id"]
                domain = eid.split(".", 1)[0]
                entry = reg.get(eid, {})
                if domain not in DOMAINS or entry.get("platform") == DOMAIN:
                    continue
                attrs = st.get("attributes") or {}
                if domain in ("binary_sensor", "update"):
                    kind = "binary"
                elif domain != "sensor":
                    kind = "state"  # covers, locks, valves, vacuums, mowers
                elif attrs.get("state_class") or _is_number(st["state"]):
                    kind = "numeric"
                else:
                    kind = "state"  # text and enum sensors: exact states
                area_id = entry.get("area_id") or device_area.get(
                    entry.get("device_id")
                )
                out.append(
                    {
                        "entity_id": eid,
                        "name": attrs.get("friendly_name") or eid,
                        "kind": kind,
                        "area_id": area_id,
                        "area": area_name.get(area_id, ""),
                        "device_id": entry.get("device_id"),
                        "device": device_name.get(entry.get("device_id"), ""),
                        "labels": entry.get("labels") or [],
                        "platform": entry.get("platform") or "",
                        "device_class": attrs.get("device_class") or "",
                        "unit": attrs.get("unit_of_measurement") or "",
                        "state": st["state"],
                        "statistics": bool(attrs.get("state_class")),
                        "options": [str(o) for o in attrs.get("options") or []][:50],
                    }
                )
            out.sort(key=order)
            self._cands, self._at = out, time.monotonic()
            _LOGGER.debug("candidates: %d sensors read from Home Assistant", len(out))
            return out

    def options(self) -> dict[str, Any]:
        """The filters' choices: only those some candidate has."""
        cands = self.candidates()
        areas = {c["area_id"]: c["area"] for c in cands if c["area_id"]}
        labels = {lb for c in cands for lb in c["labels"]}
        return {
            "areas": sorted(
                ({"id": k, "name": v} for k, v in areas.items()),
                key=lambda a: a["name"].lower(),
            ),
            "labels": sorted(
                ({"id": k, "name": self._labels.get(k, k)} for k in labels),
                key=lambda lb: lb["name"].lower(),
            ),
            "platforms": sorted({c["platform"] for c in cands if c["platform"]}),
            "device_classes": sorted(
                {c["device_class"] for c in cands if c["device_class"]}
            ),
        }

    def find(self, entity_id: str) -> dict[str, Any] | None:
        return next((c for c in self.candidates() if c["entity_id"] == entity_id), None)

    # -- their history

    def statistics(
        self, ids: list[str], days: float
    ) -> dict[str, list[dict[str, Any]]]:
        """Hourly mean, min and max per sensor, `CHUNK` sensors a request."""
        out: dict[str, list[dict[str, Any]]] = {}
        for at in range(0, len(ids), CHUNK):
            (rows,) = self.ha.call(
                {
                    "type": "recorder/statistics_during_period",
                    "start_time": _since(days),
                    "statistic_ids": ids[at : at + CHUNK],
                    "period": "hour",
                    "types": ["mean", "min", "max"],
                }
            )
            out.update(rows or {})
        return out

    def history(self, ids: list[str], days: float) -> dict[str, list[dict[str, Any]]]:
        """Each state change (state `s`, at `lu` seconds), `CHUNK` entities a request."""
        out: dict[str, list[dict[str, Any]]] = {}
        for at in range(0, len(ids), CHUNK):
            (rows,) = self.ha.call(
                {
                    "type": "history/history_during_period",
                    "start_time": _since(days),
                    "entity_ids": ids[at : at + CHUNK],
                    "minimal_response": True,
                    "no_attributes": True,
                    "significant_changes_only": False,
                }
            )
            out.update(rows or {})
        return out


def from_statistics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Samples (every hour's mean, min and max) and chart points (the means)."""
    samples = [
        r[k] for r in rows for k in ("mean", "min", "max") if _is_number(r.get(k))
    ]
    points = [[r["start"], r["mean"]] for r in rows if _is_number(r.get("mean"))]
    return {
        "source": "statistics",
        "samples": samples,
        "points": thin(points),
        "first": _iso(rows[0]["start"] / 1000) if rows else None,
    }


def from_history(
    rows: list[dict[str, Any]], now: float | None = None
) -> dict[str, Any]:
    """Numeric samples and chart points, and the seconds spent in each state."""
    now = time.time() if now is None else now
    seconds: dict[str, float] = {}
    for row, nxt in zip(rows, [*rows[1:], None]):
        end = nxt["lu"] if nxt else now
        seconds[row["s"]] = seconds.get(row["s"], 0.0) + max(0.0, end - row["lu"])
    points = [[r["lu"] * 1000, float(r["s"])] for r in rows if _is_number(r["s"])]
    return {
        "source": "history",
        "samples": [p[1] for p in points],
        "seconds": seconds,
        "points": thin(points),
        "first": _iso(rows[0]["lu"]) if rows else None,
    }


def thin(points: list[list[float]]) -> list[list[float]]:
    """At most MAX_POINTS for the chart: each run of points averaged into one."""
    if len(points) <= MAX_POINTS:
        return points
    size = math.ceil(len(points) / MAX_POINTS)
    return [
        [run[0][0], sum(p[1] for p in run) / len(run)]
        for run in (points[i : i + size] for i in range(0, len(points), size))
    ]


def _iso(seconds: float) -> str:
    return datetime.fromtimestamp(seconds, UTC).isoformat()
