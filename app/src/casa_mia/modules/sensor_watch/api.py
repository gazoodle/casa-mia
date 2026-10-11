"""Sensor Watch in the app: the records (`sensor-watch.json`), the admin page's API
(/api/sensor-watch/) and the history scans. The integration reads the records from
/health and does the watching; the page asks it for the live levels through its
`list` service."""

from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA, HAError
from . import suggest
from .common import DEFAULT_HOLD_OFF, DOMAIN, LEVELS, BadRequest, Response, _json, clean
from .history import LIST_LIMIT, Reader, from_history, from_statistics, order
from .status import Status

_LOGGER = logging.getLogger(__name__)

MAX_SCAN = 500  # sensors a scan round reads; the next round starts at `next`
DAYS = 30  # history read by default
MAX_DAYS = 365
# What Sensor Watch needs running in Home Assistant: without them there is no history,
# no statistics, no suggestions (and HA's own History panel is broken too).
NEEDS = {"recorder": "Recorder", "history": "History"}
FILTERS = ("q", "area", "label", "platform", "device_class", "kind", "device")


def words(text: str) -> list[str]:
    """A search's words, ignoring case and punctuation: "Tank - Top" -> tank, top."""
    return re.findall(r"[a-z0-9]+", text.lower())


def matches(c: dict[str, Any], f: dict[str, str]) -> bool:
    """Does candidate `c` pass the filters (each empty or absent = any)? The search
    matches when every word is somewhere in its name or entity id, in any order: "tank
    top" finds "Tank - Top", "Top of tank" and "Topup Tank"."""
    hay = f"{c['name'].lower()} {c['entity_id']} {c.get('device', '').lower()}"
    return (
        all(w in hay for w in words(f.get("q") or ""))
        and (not f.get("area") or c["area_id"] == f["area"])
        and (not f.get("label") or f["label"] in c["labels"])
        and (not f.get("platform") or c["platform"] == f["platform"])
        and (not f.get("device_class") or c["device_class"] == f["device_class"])
        and (not f.get("kind") or c["kind"] == f["kind"])
        and (not f.get("device") or c.get("device_id") == f["device"])
    )


def suggestion(kind: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """A suggestion of `kind` from what history.py read."""
    if kind == "numeric":
        return suggest.numeric(data["samples"])
    if kind == "binary":
        return suggest.binary(data.get("seconds", {}))
    return suggest.states(data.get("seconds", {}))


def proposal(
    c: dict[str, Any], s: dict[str, Any] | None, kind: str | None = None
) -> dict[str, Any]:
    """The record a suggestion makes (or a plain one without a suggestion); `kind` when
    the editor asks for another than the sensor's own (exact states for a number)."""
    kind = kind or c["kind"]
    base = {
        "kind": kind,
        "name": "",
        "hold_off": DEFAULT_HOLD_OFF,
        "unavailable": "error",
    }
    if kind == "binary":
        return base | {
            "nominal": (s or {}).get("nominal", "off"),
            "other": "warning",
            "message": "",
        }
    if kind == "state":
        return base | {
            "states": (s or {}).get("states") or [],
            "other": "error",
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
        self.status = Status(ha)  # overall health, for the Home tile (start() polls it)
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
                **self.status.now(),
            }

    def start(self) -> None:
        self.status.start()

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
        if method == "GET" and parts == ["check"]:
            return _json(200, self.check())
        if method == "GET" and parts == ["levels"]:
            return _json(200, self.levels())
        if method == "GET" and parts == ["candidates"]:
            return _json(200, self.candidates(q))
        if method == "GET" and parts == ["suggest"]:
            return _json(
                200,
                self.suggest(q.get("entity", ""), _days(q.get("days")), q.get("kind")),
            )
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

    def check(self) -> dict[str, Any]:
        """Are HA's Recorder and History running? A serious fault in HA if not."""
        if self.ha is None:
            return {"missing": [], "error": "Home Assistant is not reachable."}
        (config,) = self.ha.call({"type": "get_config"})
        running = set((config or {}).get("components") or [])
        missing = [name for key, name in NEEDS.items() if key not in running]
        if missing:
            _LOGGER.warning(
                "Home Assistant is not running %s: no history, statistics or suggestions",
                " or ".join(missing),
            )
        return {"missing": missing, "error": None}

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
        every = reader.candidates()
        found = [c for c in every if matches(c, f)]
        # The devices on offer: those with sensors matching the other filters, so a big
        # house's list narrows (choose ESPHome, and only ESPHome devices are listed).
        pool = [c for c in every if matches(c, f | {"device": ""})]
        devices = {
            c["device_id"]: c["device"]
            for c in pool
            if c.get("device_id") and c.get("device")
        }
        with self._lock:
            watched = set(self.records)
        return {
            "total": len(found),
            "sensors": [
                c | {"watched": c["entity_id"] in watched} for c in found[:LIST_LIMIT]
            ],
            "options": reader.options()
            | {
                "devices": sorted(
                    ({"id": k, "name": v} for k, v in devices.items()),
                    key=lambda d: d["name"].lower(),
                )
            },
        }

    def suggest(
        self, entity_id: str, days: float, kind: str | None = None
    ) -> dict[str, Any]:
        """Its history and a suggestion from it, as `kind` (the sensor's own by default)."""
        reader = self._reader()
        c = reader.find(entity_id)
        if c is None:
            raise BadRequest(f"{entity_id} is not a sensor Sensor Watch can watch.")
        if kind not in (None, "", c["kind"]) and not (
            kind == "state" and c["kind"] == "numeric"
        ):
            raise BadRequest(f"A {c['kind']} sensor can't be watched as {kind}.")
        as_kind: str = kind or c["kind"]
        problems: list[str] = []
        data = None
        if as_kind == "numeric" and c["statistics"]:
            rows = _read(reader.statistics, [entity_id], days, problems)
            data = from_statistics(rows.get(entity_id, []))
        if not data or not data["samples"]:
            rows = _read(reader.history, [entity_id], days, problems)
            data = from_history(rows.get(entity_id, []))
        found = suggestion(as_kind, data)
        _LOGGER.info(
            "suggest %s: %d days asked, %s from %s, %s%s",
            entity_id,
            days,
            data["source"],
            data["first"] or "nothing",
            "a suggestion" if found else "no suggestion",
            f" ({'; '.join(problems)})" if problems else "",
        )
        return {
            "sensor": c,
            "source": data["source"],
            "first": data["first"],
            "points": data["points"],
            "suggestion": found,
            "record": proposal(c, found, as_kind),
            "problem": "; ".join(problems) or None,
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
        problems: list[str] = []
        stats = _read(reader.statistics, by_stats, days, problems) if by_stats else {}
        rest = [
            c["entity_id"]
            for c in found
            if c["entity_id"] not in by_stats or not stats.get(c["entity_id"])
        ]
        hist = _read(reader.history, rest, days, problems) if rest else {}
        out, skipped = [], 0
        for c in found:
            eid = c["entity_id"]
            data = (
                from_statistics(stats[eid])
                if stats.get(eid)
                else from_history(hist.get(eid, []))
            )
            s = suggestion(c["kind"], data)
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
            "problem": "; ".join(problems) or None,
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


def _read(
    fetch: Callable[[list[str], float], dict[str, Any]],
    ids: list[str],
    days: float,
    problems: list[str],
) -> dict[str, Any]:
    """History or statistics, or nothing (and why, in `problems`) when HA can't give it:
    e.g. "history/history_during_period: Unknown command" where HA's History
    integration isn't loaded. The rest of Sensor Watch works without it."""
    try:
        return fetch(ids, days)
    except HAError as exc:
        _LOGGER.warning("could not read history for %d sensors: %s", len(ids), exc)
        problems.append(f"couldn't read history: {exc}")
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
    if record["kind"] == "state":
        return f"exact states {', '.join(record['states'])}, else {record['other']}"
    return f"{len(record['bands'])} bands, else {record['otherwise']}"
