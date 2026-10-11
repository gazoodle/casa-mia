"""Sensor Watch's store: the records (`sensor-watch.json`), Home Assistant's own health
settings, the profiles and the groups, what the integration is sent (/health's revision, then the
records), and saving a change. The layers above: scans (candidates, suggestions, the
scan), groups (keeping them up to date), then api (the admin page's routes)."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from ...ha import HA, HAError
from .common import LEVELS, BadRequest, clean
from .history import (
    Reader,
)
from .live import Live
from .profiles import follower, resolve
from .status import Status

_LOGGER = logging.getLogger(__name__)

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


class Store:
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
        self.groups: dict[str, dict[str, Any]] = {}  # id -> a group (groups.py)
        self._broken: str | None = None
        self._revision = ""
        try:
            data = json.loads(store_path.read_text())
            self.records = {r["entity_id"]: r for r in data.get("records", [])}
            self.system = SYSTEM | (data.get("system") or {})
            self.profiles = data.get("profiles") or {}
            self.groups = data.get("groups") or {}
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
                "records": [self._sent(r) for r in self.records.values()],
                "system": self.system | {"ignore": sorted(self.system["ignore"])},
            }

    def _sent(self, record: dict[str, Any]) -> dict[str, Any]:
        """A record as the integration has it: resolved, with its group's name (the
        `list` service filters by it). Caller holds the lock."""
        r = resolve(record, self.profiles)
        group = self.groups.get(r.get("group") or "")
        return {k: v for k, v in r.items() if k != "group"} | (
            {"group": group["name"]} if group else {}
        )

    def _revise(self) -> None:
        """A hash of the records and settings (caller holds the lock, or nobody else
        has it yet)."""
        text = json.dumps(
            [self.records, self.system, self.profiles, self.groups], sort_keys=True
        )
        self._revision = hashlib.sha256(text.encode()).hexdigest()[:16]

    def view(self) -> dict[str, Any]:
        with self._lock:
            records = [resolve(r, self.profiles) for r in self.records.values()]
            profiles = [dict(p) for p in self.profiles.values()]
            groups = [dict(g) for g in self.groups.values()]
        for p in profiles:
            p["followers"] = sum(1 for r in records if r.get("profile") == p["id"])
        profiles.sort(key=lambda p: p["name"].lower())
        for g in groups:
            g["members"] = sum(1 for r in records if r.get("group") == g["id"])
        groups.sort(key=lambda g: g["name"].lower())
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
            "groups": groups,
            "system": system,
            "levels": list(LEVELS),
            "labels": dict(self.reader.labels) if self.reader else {},  # id -> its name
            "error": self._broken,
        }

    def _save(
        self,
        changes: Mapping[str, dict[str, Any] | None],
        what: str,
        system: dict[str, Any] | None = None,
        profiles: dict[str, dict[str, Any]] | None = None,
        groups: dict[str, dict[str, Any]] | None = None,
    ) -> None:
        """Apply record changes (None removes one) and any new `system` settings,
        `profiles` or `groups`, then save, log `what`, and have the integration ask
        again."""
        with self._lock:
            if self._broken:
                raise BadRequest(
                    f"{self.store_path.name} could not be read; fix or remove it first."
                )
            if system is not None:
                self.system = system
            if profiles is not None:
                self.profiles = profiles
            if groups is not None:
                self.groups = groups
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
                "groups": self.groups,
            }
            tmp.write_text(json.dumps(data, indent=2))
            tmp.replace(self.store_path)
            self._revise()
        _LOGGER.info("%s", what)
        if self.live:
            self.live.resubscribe()
        if self.on_change:
            threading.Thread(target=self.on_change, daemon=True).start()

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


def _describe(record: dict[str, Any]) -> str:
    if record.get("profile"):
        return f"follows profile {record['profile']}"
    if record["kind"] == "binary":
        return f"binary, nominal {record['nominal']}, else {record['other']}"
    if record["kind"] == "state":
        return f"exact states {', '.join(record['states'])}, else {record['other']}"
    return f"{len(record['bands'])} bands, else {record['otherwise']}"
