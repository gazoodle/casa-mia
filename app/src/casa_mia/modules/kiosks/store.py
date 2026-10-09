"""The kiosks as stored (/config/kiosks.json), the requests to them, and how each is shown."""

from __future__ import annotations

import json
import logging
import threading
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA
from .common import (
    BACKUP_NAME,
    DEFAULT_BACKUP,
    EVERY_HOURS,
    KINDS,
    MAX_KEEP,
    TIMEOUT,
    _stamp_iso,
)

_LOGGER = logging.getLogger(__name__)


class Store:
    def __init__(
        self,
        store_path: Path,
        backup_dir: Path,
        ha: HA | None = None,
        latest: Callable[[], str | None] = lambda: None,
        seeds: Callable[[], list[str]] = lambda: [],
        timeout: float = TIMEOUT,
        firmware_url: Callable[[], str | None] = lambda: None,
    ) -> None:
        """`latest` is the newest Kiosk Satellite release (from the firmware server);
        `seeds` are more addresses to try (tablets seen checking the firmware server);
        `firmware_url` is the firmware server's address for the tablets (None: off)."""
        self.store_path = store_path
        self.backup_dir = backup_dir
        self.ha = ha
        self.latest = latest
        self.seeds = seeds
        self.firmware_url = firmware_url
        self.timeout = timeout
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._wake = threading.Event()
        self.kiosks: dict[str, dict[str, Any]] = {}  # id -> what we know
        self.addresses: list[str] = []  # host:port added on the admin page
        self.tokens: dict[str, str] = {}  # id -> token
        self.ha_error: str | None = None
        self.last_scan: str | None = None
        self.settings: dict[str, Any] = dict(DEFAULT_BACKUP)
        self.checked: dict[str, str] = {}  # id -> when its backup was last checked
        # The last Run everywhere: its command, when, and each kiosk's result as it came.
        self.everywhere: dict[str, Any] | None = None
        self._load()

    # -- store

    def _load(self) -> None:
        try:
            data = json.loads(self.store_path.read_text())
        except FileNotFoundError:
            return
        except (OSError, ValueError) as exc:
            _LOGGER.error(
                "kiosks: %s unreadable (%s); starting empty", self.store_path, exc
            )
            return
        self.addresses = [a for a in data.get("addresses", []) if isinstance(a, str)]
        self.tokens = {
            k: v for k, v in (data.get("tokens") or {}).items() if isinstance(v, str)
        }
        for kid, known in (data.get("known") or {}).items():
            self.kiosks[kid] = {**known, "online": False}
        backup = data.get("backup") or {}
        if backup.get("kind") in KINDS:
            self.settings["kind"] = backup["kind"]
        if isinstance(backup.get("keep"), int) and 1 <= backup["keep"] <= MAX_KEEP:
            self.settings["keep"] = backup["keep"]
        if backup.get("every_hours") in EVERY_HOURS:
            self.settings["every_hours"] = backup["every_hours"]
        self.checked = {
            k: v for k, v in (data.get("checked") or {}).items() if isinstance(v, str)
        }

    def _save(self) -> None:
        known = {
            kid: {k: k_[k] for k in ("id", "name", "address", "version") if k in k_}
            for kid, k_ in self.kiosks.items()
        }
        data = {
            "addresses": self.addresses,
            "tokens": self.tokens,
            "known": known,
            "backup": self.settings,
            "checked": self.checked,
        }
        tmp = self.store_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2))
        tmp.chmod(0o600)  # tokens
        tmp.replace(self.store_path)

    # -- talking to a kiosk

    def _request(
        self,
        address: str,
        path: str,
        method: str = "GET",
        body: bytes | None = None,
        token: str | None = None,
        timeout: float | None = None,
    ) -> tuple[int, bytes]:
        headers = {"Content-Type": "application/json"} if body is not None else {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(
            f"http://{address}{path}", data=body, method=method, headers=headers
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    def _get_json(self, address: str, path: str, token: str | None = None) -> Any:
        status, data = self._request(address, path, token=token)
        if status != 200:
            raise OSError(f"{path} answered {status}")
        return json.loads(data)

    # -- backups: exports kept in the app's data, only when they changed

    def _dir(self, kid: str) -> Path:
        return self.backup_dir / kid

    def _files(self, kid: str, kind: str | None = None) -> list[Path]:
        """A kiosk's kept backups, newest first (of one kind, or all)."""
        folder = self._dir(kid)
        if not folder.is_dir():
            return []
        return sorted(
            (p for p in folder.glob("*.json") if BACKUP_NAME.match(p.name))
            if kind is None
            else (
                p for p in folder.glob(f"*-{kind}.json") if BACKUP_NAME.match(p.name)
            ),
            reverse=True,
        )

    # -- what the page and the tile see

    def _row(self, k: dict[str, Any]) -> dict[str, Any]:
        latest = self.latest()
        return {
            **k,
            "logged_in": k["id"] in self.tokens,
            "behind": bool(latest and k.get("version") and k["version"] != latest),
            "lan_url": self._lan_url(k),
            "backups": len(kept := self._files(k["id"], self.settings["kind"])),
            "last_backup": _stamp_iso(kept[0]) if kept else None,
            "checked": self.checked.get(k["id"]),
        }

    @staticmethod
    def _lan_url(k: dict[str, Any]) -> str | None:
        """The kiosk's admin page on the LAN (home only), by IP: .local names do not
        resolve everywhere."""
        if "address" not in k:
            return None
        host, _, port = k["address"].rpartition(":")
        return f"http://{k.get('ip') or host}:{port}/"

    def health(self) -> dict[str, Any]:
        with self._lock:
            ks = list(self.kiosks.values())
        latest = self.latest()
        return {
            "state": "running",
            "kiosks": len(ks),
            "online": sum(1 for k in ks if k.get("online")),
            "behind": sum(
                1 for k in ks if latest and k.get("version") and k["version"] != latest
            ),
            "need_login": sum(1 for k in ks if k["id"] not in self.tokens),
            "backed_up": sum(
                1 for k in ks if self._files(k["id"], self.settings["kind"])
            ),
            "backup_every": self.settings["every_hours"],
            "latest": latest,
            "last_scan": self.last_scan,
        }

    def view(self) -> dict[str, Any]:
        with self._lock:
            rows = [self._row(k) for k in self.kiosks.values()]
        return {
            "kiosks": sorted(rows, key=lambda r: r.get("name", "").lower()),
            "addresses": self.addresses,
            "latest": self.latest(),
            "firmware_url": self.firmware_url(),
            "last_scan": self.last_scan,
            "ha_error": self.ha_error,
            "kinds": KINDS,
            "backup": self.settings,
            "max_keep": MAX_KEEP,
            "every_hours": EVERY_HOURS,
            "everywhere": self.everywhere,
        }
