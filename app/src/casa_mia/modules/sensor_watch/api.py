"""Sensor Watch in the app: the admin page's API (/api/sensor-watch/), on the store
(store.py), the scans (scans.py) and the groups (groups.py). The integration reads the records from /health and
does the watching; the page has the live levels from live.py."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from ...ha import HAError
from .common import BadRequest, Response, _json
from .groups import Grouper
from .profiles import clean_profile, export, follower, library, merge, new_id, resolve
from .scans import _days
from .store import _describe

_LOGGER = logging.getLogger(__name__)

MAX_TEXT_NAME = 120  # an ignored integration's name, as listed
WAIT = 25.0  # seconds the page's long poll for the levels is held
# What Sensor Watch needs running in Home Assistant: without them there is no history,
# no statistics, no suggestions (and HA's own History panel is broken too).
NEEDS = {"recorder": "Recorder", "history": "History"}


class SensorWatch(Grouper):
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
        if parts[:1] == ["groups"]:
            return self._groups(method, parts[1:], body)
        if len(parts) == 1 and method == "PUT":
            record = self._record(parts[0], body)
            with self._lock:  # an edited member stays in its group
                group = (self.records.get(parts[0]) or {}).get("group")
            if group:
                record["group"] = group
            self._save({parts[0]: record}, f"saved {parts[0]} ({_describe(record)})")
            return _json(200, self.view())
        if len(parts) == 1 and method == "DELETE":
            with self._lock:
                if parts[0] not in self.records:
                    return _json(404, {"error": "Not watched."})
            self._save(
                {parts[0]: None},
                f"stopped watching {parts[0]}",
                groups=self.leaving([parts[0]]),
            )
            return _json(200, self.view())
        return _json(404, {"error": "Not found."})

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
                groups=self.leaving(gone),
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
            with self._lock:
                users = [
                    g["name"]
                    for g in self.groups.values()
                    if g["profile"] == profile["id"]
                ]
            if users:
                raise BadRequest(
                    f"{profile['name']} is used by the group {', '.join(users)}: change or delete that first."
                )
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
