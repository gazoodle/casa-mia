"""Each kiosk's settings or full config, exported on a timer and kept when it changes; restored on request."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from typing import Any

from .common import (
    BACKUP_NAME,
    EVERY_HOURS,
    KINDS,
    MAX_KEEP,
    Response,
    _describe,
    _json,
    _now,
    _stamp_iso,
    material_changes,
)
from .finder import Finder

_LOGGER = logging.getLogger(__name__)


class Backups(Finder):
    def backup(self, kid: str) -> dict[str, Any]:
        """Get the latest export of the chosen kind; keep it if it differs materially
        from the newest kept one. {saved, changes} or {error}."""
        k, token = self.kiosks.get(kid), self.tokens.get(kid)
        if not k or not token:
            return {"error": "Not logged in to that kiosk."}
        kind = self.settings["kind"]
        self.checked[kid] = _now()
        try:
            status, data = self._request(
                k["address"], f"/api/{kind}/export", token=token, timeout=30
            )
            new = json.loads(data) if status == 200 else None
        except (OSError, ValueError) as exc:
            status, new = 0, None
            _LOGGER.debug("kiosk %s: export failed: %s", k["name"], exc)
        if new is None:
            k["backup_error"] = f"export failed ({status or 'no answer'})"
            _LOGGER.warning(
                "kiosk %s: %s backup %s", k["name"], kind, k["backup_error"]
            )
            with self._lock:
                self._save()
            return {"error": f"The kiosk did not give its {KINDS[kind].lower()}."}
        k["backup_error"] = None
        kept = self._files(kid, kind)
        changes: list[str] = []
        if kept:
            try:
                changes = material_changes(json.loads(kept[0].read_bytes()), new)
            except (OSError, ValueError):
                changes = ["(the last backup could not be read)"]
            if not changes:
                _LOGGER.info(
                    "kiosk %s: %s unchanged since the backup of %s",
                    k["name"],
                    kind,
                    _stamp_iso(kept[0]),
                )
                with self._lock:
                    self._save()
                return {"saved": False, "changes": []}
        path = self._dir(kid) / f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{kind}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)
        _LOGGER.info(
            "kiosk %s: %s backed up (%d KB), %s",
            k["name"],
            kind,
            len(data) // 1024,
            _describe(changes) if kept else "the first",
        )
        self._prune(kid)
        with self._lock:
            self._save()
        return {"saved": True, "changes": changes}

    def _prune(self, kid: str) -> None:
        for kind in KINDS:
            for old in self._files(kid, kind)[self.settings["keep"] :]:
                old.unlink(missing_ok=True)
                _LOGGER.info("kiosk %s: old backup %s removed", kid, old.name)

    def backups(self, kid: str) -> list[dict[str, Any]]:
        """A kiosk's kept backups, newest first, each with what changed since the one
        before it of the same kind."""
        files = self._files(kid)
        out = []
        for n, path in enumerate(files):
            kind = path.stem.rsplit("-", 1)[1]
            older = next(
                (p for p in files[n + 1 :] if p.stem.endswith(f"-{kind}")), None
            )
            changes = None
            if older:
                try:
                    changes = material_changes(
                        json.loads(older.read_bytes()), json.loads(path.read_bytes())
                    )
                except (OSError, ValueError):
                    changes = []
            out.append(
                {
                    "name": path.name,
                    "kind": kind,
                    "at": _stamp_iso(path),
                    "size": path.stat().st_size,
                    "changes": changes,
                }
            )
        return out

    def restore(self, kid: str, name: str) -> Response:
        """Send a kept backup back to the kiosk (its identity stays the kiosk's own)."""
        k, token = self.kiosks.get(kid), self.tokens.get(kid)
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})
        path = self._dir(kid) / name
        if not BACKUP_NAME.match(name) or not path.is_file():
            return _json(404, {"error": "No such backup."})
        kind = path.stem.rsplit("-", 1)[1]
        query = {"adoptIdentity": 0}
        if kind == "config":
            query["importLocalStorage"] = 1
        status, data = self._request(
            k["address"],
            f"/api/{kind}/import?{urllib.parse.urlencode(query)}",
            "POST",
            path.read_bytes(),
            token,
            timeout=30,
        )
        log = _LOGGER.info if status == 200 else _LOGGER.warning
        log(
            "kiosk %s: %s backup of %s restored -> %d",
            k["name"],
            kind,
            _stamp_iso(path),
            status,
        )
        if status != 200:
            return _json(502, {"error": f"The kiosk answered {status}: {data[:200]!r}"})
        return _json(200, {"backups": self.backups(kid)})

    def _due(self) -> None:
        """Back up each logged-in kiosk whose last check is older than the interval."""
        every = self.settings["every_hours"] * 3600
        now = datetime.now(UTC)
        for kid, k in list(self.kiosks.items()):
            if kid not in self.tokens or not k.get("online"):
                continue
            last = self.checked.get(kid)
            if last and (now - datetime.fromisoformat(last)).total_seconds() < every:
                continue
            self.backup(kid)

    def check_all(self) -> dict[str, Any]:
        """Check every logged-in, online kiosk now, whatever the interval: a copy is
        kept where something changed. How many were checked, saved, and failed."""
        kids = [
            kid
            for kid, k in list(self.kiosks.items())
            if kid in self.tokens and k.get("online")
        ]
        results = [self.backup(kid) for kid in kids]
        saved = sum(1 for r in results if r.get("saved"))
        failed = sum(1 for r in results if "error" in r)
        _LOGGER.info(
            "kiosk backups checked now (asked on the admin page): %d kiosks, %d saved, "
            "%d failed",
            len(kids),
            saved,
            failed,
        )
        return {"checked": len(kids), "saved": saved, "failed": failed}

    def set_backup(self, body: dict[str, Any]) -> Response:
        kind, keep, every = body.get("kind"), body.get("keep"), body.get("every_hours")
        if kind not in KINDS:
            return _json(400, {"error": "Choose settings only or full config."})
        if not isinstance(keep, int) or not 1 <= keep <= MAX_KEEP:
            return _json(400, {"error": f"Keep 1 to {MAX_KEEP} backups."})
        if every not in EVERY_HOURS:
            return _json(400, {"error": "Choose how often."})
        with self._lock:
            self.settings = {"kind": kind, "keep": keep, "every_hours": every}
            self._save()
        _LOGGER.info("kiosk backups: %s, keep %d, every %d h", kind, keep, every)
        for kid in list(self.kiosks):
            self._prune(kid)
        return _json(200, self.view())
