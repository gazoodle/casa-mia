"""Sensor Watch in the app: the records (`sensor-watch.json`), the admin page's API
(/api/sensor-watch/) and the history scans. The integration reads the records from
/health and does the watching; the page asks it for the live levels through its
`list` service."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA, HAError
from . import suggest
from .common import DEFAULT_HOLD_OFF, DOMAIN, LEVELS, BadRequest, Response, _json, clean
from .history import LIST_LIMIT, Reader, from_history, from_statistics, order

_LOGGER = logging.getLogger(__name__)

MAX_SCAN = 500  # sensors a scan round reads; the next round starts at `next`
DAYS = 30  # history read by default
MAX_DAYS = 365
FILTERS = ("q", "area", "label", "platform", "device_class", "kind")


def matches(c: dict[str, Any], f: dict[str, str]) -> bool:
    """Does candidate `c` pass the filters (each empty or absent = any)?"""
    q = (f.get("q") or "").strip().lower()
    return (
        (not q or q in c["name"].lower() or q in c["entity_id"])
        and (not f.get("area") or c["area_id"] == f["area"])
        and (not f.get("label") or f["label"] in c["labels"])
        and (not f.get("platform") or c["platform"] == f["platform"])
        and (not f.get("device_class") or c["device_class"] == f["device_class"])
        and (not f.get("kind") or c["kind"] == f["kind"])
    )


def proposal(c: dict[str, Any], s: dict[str, Any] | None) -> dict[str, Any]:
    """The record a suggestion makes (or a plain one without a suggestion)."""
    base = {
        "kind": c["kind"],
        "name": "",
        "hold_off": DEFAULT_HOLD_OFF,
        "unavailable": "error",
    }
    if c["kind"] == "binary":
        return base | {
            "nominal": (s or {}).get("nominal", "off"),
            "other": "warning",
            "message": "",
        }
    bands = (s or {}).get("bands") or [
        {"from": None, "to": None, "level": "nominal", "message": ""}
    ]
    return base | {"bands": bands, "otherwise": "error"}


class SensorWatch:
    def __init__(
        self,
        store_path: Path,
        ha: HA | None,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        self.store_path = store_path
        self.reader = Reader(ha) if ha else None
        self.ha = ha
        self.on_change = on_change
        self._lock = threading.Lock()
        self.records: dict[str, dict[str, Any]] = {}
        self._broken: str | None = None
        self._revision = ""
        try:
            raw = json.loads(store_path.read_text()).get("records", [])
            self.records = {r["entity_id"]: r for r in raw}
        except FileNotFoundError:
            pass
        except (OSError, ValueError, AttributeError, KeyError, TypeError) as exc:
            _LOGGER.error("cannot read %s, nothing is watched: %s", store_path, exc)
            self._broken = str(exc)
        self._revise()
        _LOGGER.info("watching %d sensors", len(self.records))

    def health(self) -> dict[str, Any]:
        """Small at any size: the integration fetches the records themselves (for_integration())
        only when `revision` moves."""
        with self._lock:
            return {
                "state": "offline" if self._broken else "running",
                "error": self._broken
                and f"cannot read {self.store_path.name}: {self._broken}",
                "watching": len(self.records),
                "revision": self._revision,
            }

    def for_integration(self) -> dict[str, Any]:
        """For the integration (GET /sensor-watch/records)."""
        with self._lock:
            return {"revision": self._revision, "records": list(self.records.values())}

    def _revise(self) -> None:
        """A hash of the records (caller holds the lock, or nobody else has it yet)."""
        text = json.dumps(self.records, sort_keys=True)
        self._revision = hashlib.sha256(text.encode()).hexdigest()[:16]

    # -- the admin page's API

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            parts = [p for p in path.strip("/").split("/") if p]
            q = {k: v[0] for k, v in query.items() if v}
            return self._route(method, parts, q, payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})

    def _route(
        self, method: str, parts: list[str], q: dict[str, str], body: dict[str, Any]
    ) -> Response:
        if method == "GET" and parts == []:
            return _json(200, self.view())
        if method == "GET" and parts == ["levels"]:
            return _json(200, self.levels())
        if method == "GET" and parts == ["candidates"]:
            return _json(200, self.candidates(q))
        if method == "GET" and parts == ["suggest"]:
            return _json(200, self.suggest(q.get("entity", ""), _days(q.get("days"))))
        if method == "POST" and parts == ["scan"]:
            return _json(200, self.scan(body, _days(body.get("days"))))
        if method == "POST" and parts == ["accept"]:
            return self._accept(body.get("records"))
        if len(parts) == 1 and method == "PUT":
            record = clean(parts[0], body)
            self._save({parts[0]: record}, f"saved {parts[0]} ({_describe(record)})")
            return _json(200, self.view())
        if len(parts) == 1 and method == "DELETE":
            with self._lock:
                if parts[0] not in self.records:
                    return _json(404, {"error": "Not watched."})
            self._save({parts[0]: None}, f"stopped watching {parts[0]}")
            return _json(200, self.view())
        return _json(404, {"error": "Not found."})

    def view(self) -> dict[str, Any]:
        with self._lock:
            records = [dict(r) for r in self.records.values()]
        names = self._names()
        for r in records:
            r["label"] = r["name"] or names.get(r["entity_id"], r["entity_id"])
        records.sort(key=lambda r: r["label"].lower())
        return {"records": records, "levels": list(LEVELS), "error": self._broken}

    def levels(self) -> dict[str, Any]:
        """Each watched sensor's level now, from the integration (its `list` service)."""
        if self.ha is None:
            return {"levels": {}, "error": "Home Assistant is not reachable."}
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
        except HAError as exc:
            _LOGGER.debug("levels: %s", exc)
            return {
                "levels": {},
                "error": "Add the Casa Mia Sensor Watch integration (Settings → Devices & services) to see live levels.",
            }
        rows = ((result or {}).get("response") or {}).get("sensors") or []
        return {"levels": {r["entity_id"]: r for r in rows}, "error": None}

    def candidates(self, f: dict[str, str]) -> dict[str, Any]:
        reader = self._reader()
        found = [c for c in reader.candidates() if matches(c, f)]
        with self._lock:
            watched = set(self.records)
        return {
            "total": len(found),
            "sensors": [
                c | {"watched": c["entity_id"] in watched} for c in found[:LIST_LIMIT]
            ],
            "options": reader.options(),
        }

    def suggest(self, entity_id: str, days: float) -> dict[str, Any]:
        reader = self._reader()
        c = reader.find(entity_id)
        if c is None:
            raise BadRequest(f"{entity_id} is not a sensor Sensor Watch can watch.")
        data = None
        if c["kind"] == "numeric" and c["statistics"]:
            data = from_statistics(
                reader.statistics([entity_id], days).get(entity_id, [])
            )
        if not data or not data["samples"]:
            data = from_history(reader.history([entity_id], days).get(entity_id, []))
        found = (
            suggest.numeric(data["samples"])
            if c["kind"] == "numeric"
            else suggest.binary(data.get("seconds", {}))
        )
        _LOGGER.info(
            "suggest %s: %d days asked, %s from %s, %s",
            entity_id,
            days,
            data["source"],
            data["first"] or "nothing",
            "a suggestion" if found else "no suggestion",
        )
        return {
            "sensor": c,
            "source": data["source"],
            "first": data["first"],
            "points": data["points"],
            "suggestion": found,
            "record": proposal(c, found),
        }

    def scan(self, f: dict[str, Any], days: float) -> dict[str, Any]:
        """A suggested record for each unwatched sensor the filters pick, MAX_SCAN a
        round: `start` is where this round begins (by name), `next` where the next would
        (None when done). A whole house goes round by round; skipped ones don't return."""
        reader = self._reader()
        with self._lock:
            watched = set(self.records)
        filters = {k: str(f.get(k) or "") for k in FILTERS}
        start: Any = f.get("start")  # [name, entity id] of the round's first sensor
        every = [
            c
            for c in reader.candidates()
            if c["entity_id"] not in watched and matches(c, filters)
        ]
        rest = (
            [c for c in every if order(c) >= tuple(start)] if _place(start) else every
        )
        found, after = rest[:MAX_SCAN], rest[MAX_SCAN:]
        by_stats = [
            c["entity_id"] for c in found if c["kind"] == "numeric" and c["statistics"]
        ]
        stats = reader.statistics(by_stats, days) if by_stats else {}
        rest = [
            c["entity_id"]
            for c in found
            if c["entity_id"] not in by_stats or not stats.get(c["entity_id"])
        ]
        hist = reader.history(rest, days) if rest else {}
        out, skipped = [], 0
        for c in found:
            eid = c["entity_id"]
            data = (
                from_statistics(stats[eid])
                if stats.get(eid)
                else from_history(hist.get(eid, []))
            )
            s = (
                suggest.numeric(data["samples"])
                if c["kind"] == "numeric"
                else suggest.binary(data.get("seconds", {}))
            )
            if s is None:
                skipped += 1
                continue
            out.append(
                {
                    "sensor": c,
                    "source": data["source"],
                    "first": data["first"],
                    "suggestion": s,
                    "record": proposal(c, s),
                }
            )
        _LOGGER.info(
            "scan (%s, %d days): %d of %d sensors, %d suggestions, %d without history",
            ", ".join(f"{k}={v}" for k, v in filters.items() if v) or "no filters",
            days,
            len(found),
            len(every),
            len(out),
            skipped,
        )
        return {
            "found": out,
            "skipped": skipped,
            "matched": len(every),
            "remaining": len(after),
            "next": list(order(after[0])) if after else None,
        }

    # -- saving

    def _accept(self, records: Any) -> Response:
        if not isinstance(records, list) or not records:
            raise BadRequest("Expected records to accept.")
        cleaned = {}
        for r in records:
            if not isinstance(r, dict):
                raise BadRequest("Each record must be an object.")
            eid = str(r.get("entity_id") or "")
            cleaned[eid] = clean(eid, r)
        self._save(
            cleaned, f"accepted {len(cleaned)} suggested records: {', '.join(cleaned)}"
        )
        return _json(200, self.view())

    def _save(self, changes: dict[str, dict[str, Any] | None], what: str) -> None:
        with self._lock:
            if self._broken:
                raise BadRequest(
                    f"{self.store_path.name} could not be read; fix or remove it first."
                )
            for eid, record in changes.items():
                if record is None:
                    self.records.pop(eid, None)
                else:
                    self.records[eid] = record
            tmp = self.store_path.with_name(self.store_path.name + ".tmp")
            self.store_path.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_text(
                json.dumps({"records": list(self.records.values())}, indent=2)
            )
            tmp.replace(self.store_path)
            self._revise()
        _LOGGER.info("%s", what)
        if self.on_change:
            threading.Thread(target=self.on_change, daemon=True).start()

    def _reader(self) -> Reader:
        if self.reader is None:
            raise BadRequest("Home Assistant is not reachable.")
        return self.reader

    def _names(self) -> dict[str, str]:
        if self.reader is None:
            return {}
        try:
            return {c["entity_id"]: c["name"] for c in self.reader.candidates()}
        except HAError:
            return {}


def _place(start: Any) -> bool:
    """A scan round's start as `next` gave it: [name, entity id]."""
    return (
        isinstance(start, list)
        and len(start) == 2
        and all(isinstance(s, str) for s in start)
    )


def _days(value: Any) -> float:
    try:
        days = float(value) if value not in (None, "") else DAYS
    except (TypeError, ValueError):
        raise BadRequest("days: a number.") from None
    if not 1 <= days <= MAX_DAYS:
        raise BadRequest(f"days: 1 to {MAX_DAYS}.")
    return days


def _describe(record: dict[str, Any]) -> str:
    if record["kind"] == "binary":
        return f"binary, nominal {record['nominal']}, else {record['other']}"
    return f"{len(record['bands'])} bands, else {record['otherwise']}"
