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
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from ...ha import HA, HAError
from . import suggest
from .common import DEFAULT_HOLD_OFF, LEVELS, BadRequest, Response, _json, clean
from .defaults import default_record
from .history import (
    LIST_LIMIT,
    SCAN_DOMAINS,
    Reader,
    from_history,
    from_statistics,
    order,
)
from .live import Live
from .profiles import clean_profile, export, follower, library, merge, new_id, resolve
from .status import Status

_LOGGER = logging.getLogger(__name__)

MAX_TEXT_NAME = 120  # an ignored integration's name, as listed
MAX_SCAN = 500  # sensors a scan round reads; the next round starts at `next`
DAYS = 30  # history read by default
MAX_DAYS = 365
WAIT = 25.0  # seconds the page's long poll for the levels is held
# What Sensor Watch needs running in Home Assistant: without them there is no history,
# no statistics, no suggestions (and HA's own History panel is broken too).
NEEDS = {"recorder": "Recorder", "history": "History"}
# Home Assistant's own health (the integration's levels.system_rows), set on the page:
# the Recorder and History, integrations failing to set up, and those to leave out
# (entry id -> its name when it was ignored, to list them).
SYSTEM = {"core": True, "integrations": True, "ignore": {}}
# A watched sensor's details the page filters by (from the candidates).
META = (
    "domain",
    "name",
    "area_id",
    "area",
    "labels",
    "platform",
    "device_id",
    "device",
    "device_class",
    "kind",
)
FILTERS = ("domain", "q", "area", "label", "platform", "device_class", "kind", "device")


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
        and (not f.get("domain") or c.get("domain") == f["domain"])
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
        self.status = Status(ha)  # overall health, for the Home tile (live.py feeds it)
        # The levels as they change in Home Assistant, pushed (start() connects).
        self.live = Live(ha, self.status, lambda: list(self.records)) if ha else None
        self._lock = threading.Lock()
        self.records: dict[str, dict[str, Any]] = {}
        self.system: dict[str, Any] = dict(SYSTEM)
        self.profiles: dict[str, dict[str, Any]] = {}  # id -> a profile (profiles.py)
        self._broken: str | None = None
        self._revision = ""
        try:
            data = json.loads(store_path.read_text())
            self.records = {r["entity_id"]: r for r in data.get("records", [])}
            self.system = SYSTEM | (data.get("system") or {})
            self.profiles = data.get("profiles") or {}
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
        if self.live:
            self.live.start()

    def for_integration(self) -> dict[str, Any]:
        """For the integration (GET /sensor-watch/records)."""
        with self._lock:
            return {
                "revision": self._revision,
                "records": [resolve(r, self.profiles) for r in self.records.values()],
                "system": self.system | {"ignore": sorted(self.system["ignore"])},
            }

    def _revise(self) -> None:
        """A hash of the records and settings (caller holds the lock, or nobody else
        has it yet)."""
        text = json.dumps([self.records, self.system, self.profiles], sort_keys=True)
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
        if parts[:1] == ["system"]:
            return self._system(method, parts[1:], body)
        if method == "GET" and parts == ["check"]:
            return _json(200, self.check())
        if method == "GET" and parts == ["levels"]:
            return _json(200, self.levels(q.get("after")))
        if method == "GET" and parts == ["candidates"]:
            return _json(200, self.candidates(q))
        if method == "GET" and parts == ["suggest"]:
            return _json(
                200,
                self.suggest(q.get("entity", ""), _days(q.get("days")), q.get("kind")),
            )
        if method == "POST" and parts == ["scan"]:
            return _json(200, self.scan(body, _days(body.get("days"))))
        if method == "POST" and parts == ["forget"]:
            return self._forget(body.get("entity_ids"))
        if method == "POST" and parts == ["accept"]:
            return self._accept(body.get("records"))
        if parts[:1] == ["profiles"]:
            return self._profiles(method, parts[1:], body)
        if len(parts) == 1 and method == "PUT":
            record = self._record(parts[0], body)
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
            records = [resolve(r, self.profiles) for r in self.records.values()]
            profiles = [dict(p) for p in self.profiles.values()]
        for p in profiles:
            p["followers"] = sum(1 for r in records if r.get("profile") == p["id"])
        profiles.sort(key=lambda p: p["name"].lower())
        known = self._known()
        for r in records:
            c = known.get(r["entity_id"], {})
            r["label"] = r["name"] or c.get("name") or r["entity_id"]
            # What the page filters and groups the watched sensors by.
            r["meta"] = {k: c.get(k) for k in META}
        records.sort(key=lambda r: r["label"].lower())
        with self._lock:
            system = self.system | {"ignore": dict(self.system["ignore"])}
        return {
            "records": records,
            "profiles": profiles,
            "system": system,
            "levels": list(LEVELS),
            "labels": dict(self.reader.labels) if self.reader else {},  # id -> its name
            "error": self._broken,
        }

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

    def levels(self, after: str | None = None) -> dict[str, Any]:
        """Each watched sensor's level now, as live.py hears it from the integration;
        `after` (a revision the page has): held until something changes, or WAIT."""
        if self.live is None:
            return {"levels": {}, "error": "Home Assistant is not reachable.", "rev": 0}
        try:
            return self.live.wait(int(after), WAIT) if after else self.live.snapshot()
        except ValueError:
            raise BadRequest("after: a revision.") from None

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
        # What it is beats how it behaved: a leak sensor is critical whatever its history.
        known = default_record(c)
        record = (
            known if known and known["kind"] == as_kind else proposal(c, found, as_kind)
        )
        return {
            "sensor": c,
            "source": data["source"],
            "first": data["first"],
            "points": data["points"],
            "suggestion": found,
            "record": record,
            "default": record is known,
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
        # No domain asked for: the usual ones, not every light, switch and helper.
        every = [
            c
            for c in reader.candidates()
            if c["entity_id"] not in watched
            and matches(c, filters)
            and (filters["domain"] or c["domain"] in SCAN_DOMAINS)
        ]
        rest = (
            [c for c in every if order(c) >= tuple(start)] if _place(start) else every
        )
        found, after = rest[:MAX_SCAN], rest[MAX_SCAN:]
        # Those with a record by what they are need no history.
        known = {c["entity_id"]: d for c in found if (d := default_record(c))}
        by_stats = [
            c["entity_id"]
            for c in found
            if c["kind"] == "numeric"
            and c["statistics"]
            and c["entity_id"] not in known
        ]
        problems: list[str] = []
        stats = _read(reader.statistics, by_stats, days, problems) if by_stats else {}
        rest = [
            c["entity_id"]
            for c in found
            if c["entity_id"] not in known
            and (c["entity_id"] not in by_stats or not stats.get(c["entity_id"]))
        ]
        hist = _read(reader.history, rest, days, problems) if rest else {}
        out, skipped = [], 0
        for c in found:
            eid = c["entity_id"]
            if eid in known:
                out.append(
                    {
                        "sensor": c,
                        "source": "default",
                        "first": None,
                        "suggestion": None,
                        "record": known[eid],
                        "default": True,
                    }
                )
                continue
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

    def _forget(self, entity_ids: Any) -> Response:
        """Stop watching many at once (the page's Stop watching these / all)."""
        if not isinstance(entity_ids, list) or not all(
            isinstance(e, str) for e in entity_ids
        ):
            raise BadRequest("Expected entity_ids to stop watching.")
        with self._lock:
            gone = [e for e in dict.fromkeys(entity_ids) if e in self.records]
        if gone:
            self._save(
                dict.fromkeys(gone),
                f"stopped watching {len(gone)} sensors: {', '.join(gone)}",
            )
        return _json(200, self.view())

    def _accept(self, records: Any) -> Response:
        if not isinstance(records, list) or not records:
            raise BadRequest("Expected records to accept.")
        cleaned = {}
        for r in records:
            if not isinstance(r, dict):
                raise BadRequest("Each record must be an object.")
            eid = str(r.get("entity_id") or "")
            cleaned[eid] = self._record(eid, r)
        self._save(
            cleaned, f"accepted {len(cleaned)} suggested records: {', '.join(cleaned)}"
        )
        return _json(200, self.view())

    def _save(
        self,
        changes: Mapping[str, dict[str, Any] | None],
        what: str,
        system: dict[str, Any] | None = None,
        profiles: dict[str, dict[str, Any]] | None = None,
    ) -> None:
        """Apply record changes (None removes one) and any new `system` settings or
        `profiles`, then save, log `what`, and have the integration ask again."""
        with self._lock:
            if self._broken:
                raise BadRequest(
                    f"{self.store_path.name} could not be read; fix or remove it first."
                )
            if system is not None:
                self.system = system
            if profiles is not None:
                self.profiles = profiles
            for eid, record in changes.items():
                if record is None:
                    self.records.pop(eid, None)
                else:
                    self.records[eid] = record
            tmp = self.store_path.with_name(self.store_path.name + ".tmp")
            self.store_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "records": list(self.records.values()),
                "system": self.system,
                "profiles": self.profiles,
            }
            tmp.write_text(json.dumps(data, indent=2))
            tmp.replace(self.store_path)
            self._revise()
        _LOGGER.info("%s", what)
        if self.live:
            self.live.resubscribe()
        if self.on_change:
            threading.Thread(target=self.on_change, daemon=True).start()

    def _system(self, method: str, parts: list[str], body: dict[str, Any]) -> Response:
        """The settings for Home Assistant's own health: PUT system {core, integrations};
        POST system/ignore {entry_id, name}; DELETE system/ignore/<entry id>."""
        with self._lock:
            system = self.system | {"ignore": dict(self.system["ignore"])}
        if method == "PUT" and parts == []:
            for key in ("core", "integrations"):
                if key in body:
                    if not isinstance(body[key], bool):
                        raise BadRequest(f"{key}: true or false.")
                    system[key] = body[key]
            what = f"Home Assistant's own health: Recorder and History {'on' if system['core'] else 'off'}, failing integrations {'on' if system['integrations'] else 'off'}"
        elif method == "POST" and parts == ["ignore"]:
            entry_id = str(body.get("entry_id") or "")
            if not re.fullmatch(r"[A-Za-z0-9_]{1,64}", entry_id):
                raise BadRequest("entry_id: a config entry's id.")
            name = str(body.get("name") or entry_id)[:MAX_TEXT_NAME]
            system["ignore"][entry_id] = name
            what = f"ignoring the integration {name} ({entry_id})"
        elif method == "DELETE" and parts[:1] == ["ignore"] and len(parts) == 2:
            name = system["ignore"].pop(parts[1], None)
            if name is None:
                return _json(404, {"error": "Not ignored."})
            what = f"watching the integration {name} ({parts[1]}) again"
        else:
            return _json(404, {"error": "Not found."})
        self._save({}, what, system)
        return _json(200, self.view())

    def _record(self, entity_id: str, body: dict[str, Any]) -> dict[str, Any]:
        """A record to save: its own levels, or following a profile (`profile`)."""
        pid = body.get("profile")
        if not pid:
            return clean(entity_id, body)
        with self._lock:
            profile = self.profiles.get(str(pid))
        if profile is None:
            raise BadRequest("No such profile.")
        return follower(
            entity_id,
            str(body.get("name") or "").strip(),
            profile,
            self._kind(entity_id),
        )

    def _kind(self, entity_id: str) -> str | None:
        """The sensor's own kind, when Home Assistant can say (for what it may follow)."""
        try:
            c = self.reader.find(entity_id) if self.reader else None
        except HAError:
            c = None
        return c["kind"] if c else None

    def _profiles(
        self, method: str, parts: list[str], body: dict[str, Any]
    ) -> Response:
        """GET profiles/export (all, to share), GET profiles/library (those shipped),
        POST profiles/import (a shared file: same name replaces); POST profiles (a new one); PUT profiles/<id> (its name or levels); DELETE
        profiles/<id> (its followers keep a copy); POST profiles/<id>/apply {entity_ids}
        (those sensors follow it, watched or not; any of a kind it doesn't fit are
        skipped)."""
        with self._lock:
            profiles = {k: dict(v) for k, v in self.profiles.items()}
            records = dict(self.records)
        if method == "POST" and parts == []:
            profile = clean_profile(body) | {"id": new_id(profiles)}
            profiles[profile["id"]] = profile
            self._save(
                {},
                f"new profile {profile['name']} ({profile['kind']})",
                profiles=profiles,
            )
            return _json(201, self.view() | {"created": profile["id"]})
        if method == "GET" and parts == ["export"]:
            return _json(200, export(profiles))
        if method == "GET" and parts == ["library"]:
            return _json(200, {"profiles": library()})
        if method == "POST" and parts == ["import"]:
            merged, added, replaced = merge(body, profiles)
            for (
                r
            ) in records.values():  # a replaced profile must still fit its followers
                if r.get("profile") in merged and r["profile"] in profiles:
                    follower(
                        r["entity_id"],
                        r.get("name", ""),
                        merged[r["profile"]],
                        self._kind(r["entity_id"]),
                    )
            what = f"imported profiles: added {added or 'none'}, replaced {replaced or 'none'}"
            self._save({}, what, profiles=merged)
            return _json(200, self.view() | {"added": added, "replaced": replaced})
        profile = profiles.get(parts[0]) if parts else None
        if profile is None:
            return _json(404, {"error": "No such profile."})
        followers = [r for r in records.values() if r.get("profile") == profile["id"]]
        if method == "PUT" and len(parts) == 1:
            changed = clean_profile(body) | {"id": profile["id"]}
            for r in followers:  # a new kind must still fit every follower
                follower(
                    r["entity_id"],
                    r.get("name", ""),
                    changed,
                    self._kind(r["entity_id"]),
                )
            profiles[profile["id"]] = changed
            what = (
                f"profile {changed['name']} saved, followed by {len(followers)} sensors"
            )
            self._save({}, what, profiles=profiles)
            return _json(200, self.view())
        if method == "DELETE" and len(parts) == 1:
            copies = {
                r["entity_id"]: {
                    k: v for k, v in resolve(r, profiles).items() if k != "profile"
                }
                for r in followers
            }
            del profiles[profile["id"]]
            what = f"profile {profile['name']} deleted; its {len(copies)} followers keep a copy"
            self._save(copies, what, profiles=profiles)
            return _json(200, self.view())
        if method == "POST" and parts[1:] == ["apply"]:
            ids = body.get("entity_ids")
            if not isinstance(ids, list) or not all(isinstance(e, str) for e in ids):
                raise BadRequest("Expected entity_ids to follow the profile.")
            now, skipped = {}, 0
            for e in dict.fromkeys(ids):
                kind = self._kind(e)
                if e not in records and kind is None:
                    continue  # not watched, and not known to Home Assistant
                try:
                    name = records.get(e, {}).get("name", "")
                    now[e] = follower(e, name, profile, kind)
                except BadRequest:
                    skipped += 1  # a kind the profile doesn't fit
            self._save(
                now,
                f"{len(now)} sensors now follow {profile['name']}"
                f" ({skipped} skipped, a kind it doesn't fit): {', '.join(now)}",
            )
            return _json(200, self.view() | {"followed": len(now), "skipped": skipped})
        return _json(404, {"error": "Not found."})

    def _reader(self) -> Reader:
        if self.reader is None:
            raise BadRequest("Home Assistant is not reachable.")
        return self.reader

    def _known(self) -> dict[str, dict[str, Any]]:
        """What HA says of each entity it has (cached a minute), or nothing if it can't."""
        if self.reader is None:
            return {}
        try:
            return {c["entity_id"]: c for c in self.reader.candidates()}
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
    if record.get("profile"):
        return f"follows profile {record['profile']}"
    if record["kind"] == "binary":
        return f"binary, nominal {record['nominal']}, else {record['other']}"
    if record["kind"] == "state":
        return f"exact states {', '.join(record['states'])}, else {record['other']}"
    return f"{len(record['bands'])} bands, else {record['otherwise']}"
