"""Sensor Watch's store: the records, Home Assistant's own health settings, the profiles
and the groups, what the watcher is given of them (outgoing(), at each change), and
saving a change. Loading and saving are handed in (Home Assistant's storage; a file in
the tests), so nothing here needs Home Assistant. The layers above: scans (candidates,
suggestions, the scan), groups (keeping them up to date), then api (the page's routes)."""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Mapping
from typing import Any

from .common import (
    LEVELS,
    BadRequest,
    HAError,
    Source,
    clean,
    normal,
    sides,
    with_legacy,
)
from .history import Reader, kind_of
from .profiles import follower, resolve

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
    "floor_id",
    "floor",
    "manufacturer",
    "model",
    "category",
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
        data: dict[str, Any] | None,
        ha: Source | None,
        save: Callable[[dict[str, Any]], None],
        changed: Callable[[set[str] | None], None] | None = None,
    ) -> None:
        """`data`: what was saved (None: nothing yet). `save` keeps it, or raises (the
        change is then refused, and said). `changed` is told after each save: the
        entities whose records changed, or None for any of them."""
        self.reader = Reader(ha) if ha else None
        self.ha = ha
        self.save = save
        self.changed = changed
        self._lock = threading.Lock()
        self.records: dict[str, dict[str, Any]] = {}
        self.system: dict[str, Any] = dict(SYSTEM)
        self.profiles: dict[str, dict[str, Any]] = {}  # id -> a profile (profiles.py)
        self.groups: dict[str, dict[str, Any]] = {}  # id -> a group (groups.py)
        self._broken: str | None = None
        try:
            data = data or {}
            self.records = {r["entity_id"]: r for r in data.get("records", [])}
            self.system = SYSTEM | (data.get("system") or {})
            self.profiles = data.get("profiles") or {}
            self.groups = data.get("groups") or {}
        except (ValueError, AttributeError, KeyError, TypeError) as exc:
            _LOGGER.error("cannot read the saved records, nothing is watched: %s", exc)
            self._broken = str(exc)
        _LOGGER.info("watching %d sensors", len(self.records))

    def outgoing(self, eids: set[str] | None) -> dict[str, Any]:
        """What the watcher is given: the records in `eids` as it has them, and those of
        them it should no longer watch (gone, or disabled: kept, but not watched); every
        record when None."""
        with self._lock:
            if eids is None:
                now = self.records
            else:
                now = {e: self.records.get(e) for e in sorted(eids)}
            return {
                "whole": eids is None,
                "records": [
                    self._sent(r) for r in now.values() if r and not r.get("disabled")
                ],
                "removed": [e for e, r in now.items() if not r or r.get("disabled")],
                "system": self.system | {"ignore": sorted(self.system["ignore"])},
            }

    def _sent(self, record: dict[str, Any]) -> dict[str, Any]:
        """A record as the watcher has it: resolved, with its group's name (the
        `list` service filters by it). Caller holds the lock."""
        r = with_legacy(normal(resolve(record, self.profiles)))
        group = self.groups.get(r.get("group") or "")
        return {k: v for k, v in r.items() if k != "group"} | (
            {"group": group["name"]} if group else {}
        )

    def view(self) -> dict[str, Any]:
        with self._lock:
            records = [normal(resolve(r, self.profiles)) for r in self.records.values()]
            profiles = [normal(dict(p)) for p in self.profiles.values()]
            groups = [dict(g) for g in self.groups.values()]
        for p in profiles:
            p["followers"] = sum(1 for r in records if r.get("profile") == p["id"])
        profiles.sort(key=lambda p: p["name"].lower())
        for g in groups:
            g["members"] = sum(
                1
                for r in records
                if r.get("group") == g["id"] and not r.get("disabled")
            )
        groups.sort(key=lambda g: g["name"].lower())
        known = self._known()
        for r in records:
            c = known.get(r["entity_id"], {})
            r["label"] = r["name"] or c.get("name") or r["entity_id"]
            # What the page filters and groups the watched sensors by.
            r["meta"] = {k: c.get(k) for k in META}
            if r.get(
                "attribute"
            ):  # its kind is the attribute's (a climate's temperature)
                r["meta"]["kind"] = r["kind"]
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
        `profiles` or `groups`, then save, log `what`, and tell the watcher: the records
        changed, or all of them when profiles or groups changed (a profile's followers,
        a group's members, change with them)."""
        with self._lock:
            if self._broken:
                raise BadRequest(
                    f"The saved records could not be read ({self._broken}); "
                    "nothing is saved over them."
                )
            records = dict(self.records)
            for eid, record in changes.items():
                if record is None:
                    records.pop(eid, None)
                else:
                    records[eid] = record
            data = {
                "records": list(records.values()),
                "system": self.system if system is None else system,
                "profiles": self.profiles if profiles is None else profiles,
                "groups": self.groups if groups is None else groups,
            }

            # Saved before it is taken up: a save that fails leaves what is watched as
            # it was saved, not ahead of it until the next restart.
            self.save(data)
            self.records = records
            self.system = data["system"]
            self.profiles = data["profiles"]
            self.groups = data["groups"]
        _LOGGER.info("%s", what)
        if self.changed:
            whole = profiles is not None or groups is not None
            self.changed(None if whole else set(changes))

    def _record(self, entity_id: str, body: dict[str, Any]) -> dict[str, Any]:
        """A record to save: its own levels, or following a profile (`profile`);
        disabled (kept, not watched) when the body says so."""
        if body.get("disabled") not in (None, True, False):
            raise BadRequest("disabled: true or false.")
        if self._owned(entity_id):
            raise BadRequest(
                f"{entity_id} is Sensor Watch's own: watching it would judge itself, "
                "each change of level feeding the next."
            )
        off = {"disabled": True} if body.get("disabled") else {}
        return self._levels_record(entity_id, body) | off

    def _levels_record(self, entity_id: str, body: dict[str, Any]) -> dict[str, Any]:
        pid = body.get("profile")
        if not pid:
            return clean(entity_id, body)
        with self._lock:
            profile = self.profiles.get(str(pid))
        if profile is None:
            raise BadRequest("No such profile.")
        attribute = str(body.get("attribute") or "").strip()
        return follower(
            entity_id,
            str(body.get("name") or "").strip(),
            profile,
            self._kind(entity_id, attribute),
            attribute,
        )

    def _kind(self, entity_id: str, attribute: str | None = None) -> str | None:
        """The sensor's own kind (or its attribute's), when Home Assistant can say (for
        what it may follow)."""
        try:
            c = self.reader.find(entity_id) if self.reader else None
        except HAError:
            c = None
        if c and attribute:
            value = c["attributes"].get(attribute)
            return None if value is None else kind_of("", value, {})
        return c["kind"] if c else None

    def _owned(self, entity_id: str) -> bool:
        """One of Sensor Watch's own entities? The page never offers them, but a save by
        hand or an import could name one. Unknown while HA can't say: saved, and logged."""
        if self.reader is None:
            return False
        try:
            return self.reader.owned(entity_id)
        except HAError as exc:
            _LOGGER.warning(
                "saving %s unchecked: is it Sensor Watch's own? (%s)", entity_id, exc
            )
            return False

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


def merged(
    have: dict[str, dict[str, Any]], msg: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """The records the watcher watches once it is given `msg` (outgoing()): its records
    alone when it is the whole set; else those it has, with the changes."""
    sent = {r["entity_id"]: r for r in msg["records"]}
    if msg["whole"]:
        return sent
    removed = set(msg["removed"])
    return {e: r for e, r in have.items() if e not in removed} | sent


def _describe(record: dict[str, Any]) -> str:
    if record.get("disabled"):
        return "disabled: " + _describe(
            {k: v for k, v in record.items() if k != "disabled"}
        )
    if record.get("profile"):
        return f"follows profile {record['profile']}"
    if record["kind"] == "binary":
        s = sides(record)
        return f"on/off: off {s['off']['level']}, on {s['on']['level']}"
    if record["kind"] == "available":
        return f"available {record['available']['level']}, unavailable {record['unavailable']}"
    if record["kind"] == "state":
        return f"exact states {', '.join(record['states'])}, else {record['other']}"
    return f"{len(record['bands'])} bands, else {record['otherwise']}"
