"""Kiosk Satellites: finds the wall tablets running Kiosk Satellite on the LAN, keeps a login
to each, backs up their settings or full config, and opens each one's own admin page
through ingress so it works from outside the home.

Finding them (at start and on Look now): Home Assistant's device registry (the tablets join HA
through ESPHome, manufacturer `kiosk_satellite`, with their admin page as the device's
configuration URL), addresses added on the admin page, and each kiosk's own list of the
kiosks it has heard on the network (its `fleet` command). Each address is asked for
`/api/fleet/identity` (no login), whose id is the kiosk's key here; it also says whether
the kiosk leads a fleet or follows one. Known kiosks are asked how they are every minute.

Logging in: one shared remote-admin password, entered on the admin page and never kept.
The app asks each kiosk for a 10-year token and keeps those (`/config/kiosks.json`).

Backups: every logged-in kiosk's settings or full config (chosen on the admin page) is
exported on a timer (daily by default) and on Get latest, and kept in the app's data
(`/data/kiosks/<id>/`, so in HA backups) only when it differs materially from the newest
kept one; the last few are kept per kiosk and each can be restored to it.

The admin page proxy (/kiosk/<id>/...): passes everything to the kiosk with the app's
token. Their page loads its files relatively but calls its API at absolute /api/...
paths, which under ingress would reach Home Assistant; a small script added to the page
(PAGE_SHIM) sends those under the page's path, and the proxy tunnels the websocket.
"""

from __future__ import annotations

import json
import logging
import re
import socket
import threading
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

from .. import swap
from ..ha import HA, HAError

_LOGGER = logging.getLogger(__name__)

PORT = 2324
MANUFACTURER = "kiosk_satellite"
POLL_SECONDS = 60  # each known kiosk's health
TIMEOUT = 4
TOKEN_DAYS = 3650
KINDS = {"settings": "Settings only", "config": "Full config"}
# Backups: which export, how many of each kind to keep per kiosk, how often to check.
MAX_KEEP = 6
EVERY_HOURS = (6, 12, 24, 168)
DEFAULT_BACKUP = {"kind": "config", "keep": 3, "every_hours": 24}
BACKUP_NAME = re.compile(r"^\d{8}T\d{6}Z-(settings|config)\.json$")
# Keys that change on every export without the kiosk's setup changing; ignored when
# deciding whether a new export is worth keeping. Each kept backup logs the keys that
# changed, so add any that turn out to be noise.
NOISE = {"exportedAt"}
# The placeholder the proxied page keeps as its token, so it skips its login screen; the
# proxy swaps in the real one. The real token never reaches the browser.
PAGE_TOKEN = "casa-mia-proxy"
HOP = {
    "connection",
    "keep-alive",
    "transfer-encoding",
    "upgrade",
    "proxy-connection",
    "te",
    "trailer",
    "content-length",
    "content-encoding",
    "x-frame-options",
}

Response = tuple[int, str, bytes]


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()


# Added to the top of the kiosk's admin page. Their scripts call the API at absolute
# /api/... paths (and test and slice those strings, so the scripts must not be edited);
# under ingress those would reach Home Assistant. This sends them under the page's own
# path instead, for fetch, XMLHttpRequest and the websocket. Under ingress the page's own
# path starts /api/hassio_ingress/..., so an address that already carries it (their
# websocket reconnects with the address it had) is left alone, not prefixed twice.
PAGE_SHIM = (
    "<script>(()=>{"
    'const b=location.pathname.replace(/[^/]*$/,""),'
    'fix=u=>typeof u=="string"&&u.startsWith("/api/")&&!u.startsWith(b)?b+u.slice(1):u;'
    "const f=window.fetch;window.fetch=(u,o)=>f(fix(u),o);"
    "const x=XMLHttpRequest.prototype.open;"
    "XMLHttpRequest.prototype.open=function(m,u,...r){return x.call(this,m,fix(u),...r)};"
    "const W=window.WebSocket;window.WebSocket=class extends W{constructor(u,p){"
    "u=String(u);const m=u.match(/^(wss?:\\/\\/[^/]+)(\\/api\\/.*)$/);"
    "super(m&&!m[2].startsWith(b)?m[1]+b+m[2].slice(1):u,p)}}"
    "})()</script>"
)


# While the screenshot swap is on: the page's text shows the stand-ins (PAIRS: real ->
# stand-in), as it is drawn and redrawn, matched as swap.py does (not inside a longer
# word). Only the text shown: form fields keep the real values, so a save never writes a
# stand-in to the tablet.
SWAP_SHIM = (
    "<script>(()=>{const P=PAIRS,"
    "k=Object.keys(P).sort((a,b)=>b.length-a.length)"
    '.map(s=>s.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")),'
    'r=new RegExp("(?<!\\\\p{L})(?:"+k.join("|")+")(?!\\\\p{L})","gu"),'
    "done=new WeakMap(),"
    "fix=n=>{if(n.nodeType==3){if(done.get(n)===n.data)return;"
    "const t=n.data.replace(r,m=>P[m]);if(t!==n.data)n.data=t;done.set(n,t)}"
    "else if(n.nodeType==1&&!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName))"
    "n.childNodes.forEach(fix)};"
    "new MutationObserver(ms=>ms.forEach(m=>m.type=='characterData'?fix(m.target)"
    ":m.addedNodes.forEach(fix))).observe(document,"
    "{subtree:true,childList:true,characterData:true})"
    "})()</script>"
)


def page_head(logged_in: bool) -> bytes:
    """What goes straight after the page's <head>: the shim, when the app holds a login
    for the kiosk the placeholder token that skips their login screen, and while the
    screenshot swap is on its shim."""
    head = PAGE_SHIM
    if logged_in:
        head += f'<script>localStorage.setItem("ks_token","{PAGE_TOKEN}")</script>'
    if pairs := swap.pairs():
        head += SWAP_SHIM.replace("PAIRS", json.dumps(pairs).replace("</", "<\\/"))
    return head.encode()


def _flatten(value: Any, path: str = "") -> dict[str, Any]:
    """{"a": {"b": 1}} -> {"a/b": 1}, leaving out NOISE keys."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key, item in value.items():
            if key not in NOISE:
                out.update(_flatten(item, f"{path}{key}/"))
        return out
    if isinstance(value, list):
        out = {}
        for n, item in enumerate(value):
            out.update(_flatten(item, f"{path}{n}/"))
        return out
    return {path.rstrip("/"): value}


def material_changes(old: Any, new: Any) -> list[str]:
    """The keys (as a/b paths) that differ between two exports, noise left out."""
    a, b = _flatten(old), _flatten(new)
    return sorted(key for key in a.keys() | b.keys() if a.get(key, a) != b.get(key, b))


def _describe(changes: list[str]) -> str:
    shown = ", ".join(changes[:8])
    more = f" and {len(changes) - 8} more" if len(changes) > 8 else ""
    return f"changed: {shown}{more}"


def _stamp_iso(path: Path) -> str:
    """20261002T201500Z-config.json -> 2026-10-02T20:15:00+00:00"""
    stamp = path.name.split("-", 1)[0]
    return datetime.strptime(stamp, "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC).isoformat()


def _model(health: dict[str, Any]) -> str:
    """Lenovo TB305FU, not Lenovo LENOVO TB305FU."""
    brand, model = health.get("brand") or "", health.get("model") or ""
    if brand and model.lower().startswith(brand.lower()):
        return model
    return f"{brand} {model}".strip()


def _address(host: str, port: int) -> str:
    return f"{host}:{port}"


class Kiosks:
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

    def _probe(self, address: str, source: str) -> str | None:
        """Ask an address who it is; record the kiosk. Its id, or None if no kiosk."""
        try:
            ident = self._get_json(address, "/api/fleet/identity")
            health = self._get_json(address, "/api/health")
        except (OSError, ValueError) as exc:
            _LOGGER.debug("kiosks: nothing at %s (%s)", address, exc)
            return None
        kid = str(ident.get("id") or "")
        if not kid:
            return None
        link = health.get("link") or {}
        with self._lock:
            old = self.kiosks.get(kid, {})
            if not old.get("online"):
                _LOGGER.info(
                    "kiosk %s (%s) %s at %s, version %s",
                    ident.get("name"),
                    kid,
                    "found" if not old else "back online",
                    address,
                    ident.get("version"),
                )
            elif old.get("version") != ident.get("version"):
                _LOGGER.info(
                    "kiosk %s updated %s -> %s",
                    ident.get("name"),
                    old.get("version"),
                    ident.get("version"),
                )
            self.kiosks[kid] = {
                **old,
                "id": kid,
                "name": ident.get("name") or health.get("name") or kid,
                "address": address,
                "ip": health.get("ip"),
                "version": ident.get("version") or health.get("appVersion"),
                "leader": bool(ident.get("leader")),
                "follows": ident.get("follows") or None,
                "model": _model(health),
                "battery": health.get("battery"),
                "charging": health.get("charging"),
                "rssi": link.get("rssi"),
                "online": True,
                "last_seen": _now(),
                "source": old.get("source") or source,
                "error": None,
            }
        return kid

    # -- finding them

    def _from_ha(self) -> list[str]:
        """Addresses of the kiosks HA knows through ESPHome."""
        if self.ha is None:
            return []
        try:
            (devices,) = self.ha.call({"type": "config/device_registry/list"})
            self.ha_error = None
        except HAError as exc:
            self.ha_error = str(exc)
            _LOGGER.warning("kiosks: cannot read Home Assistant's devices: %s", exc)
            return []
        out = []
        for d in devices or []:
            if d.get("manufacturer") != MANUFACTURER:
                continue
            url = urllib.parse.urlsplit(d.get("configuration_url") or "")
            if url.hostname:
                out.append(_address(url.hostname, url.port or PORT))
        return out

    def _from_fleet(self) -> list[str]:
        """Addresses from each logged-in kiosk's list of the kiosks it has heard."""
        out = []
        for kid, token in list(self.tokens.items()):
            k = self.kiosks.get(kid)
            if not (k and k.get("online")):
                continue
            try:
                status, data = self._request(
                    k["address"], "/api/commands/fleet", "POST", b"{}", token
                )
                devices = (json.loads(data).get("data") or {}).get("devices") or []
            except (OSError, ValueError) as exc:
                _LOGGER.debug("kiosks: fleet list from %s failed: %s", k["name"], exc)
                continue
            if status != 200:
                continue
            for d in devices:
                if d.get("address") and not d.get("self"):
                    out.append(_address(d["address"], int(d.get("port") or PORT)))
        return out

    def scan(self, discover: bool = True) -> None:
        """Probe every address we know (and, with `discover`, look for more)."""
        with self._lock:
            known = {
                k["address"]: "seen" for k in self.kiosks.values() if "address" in k
            }
        tried: set[str] = set()
        rounds: list[tuple[str, list[str]]] = [("added", list(self.addresses))]
        if discover:
            rounds.append(("Home Assistant", self._from_ha()))
            rounds.append(
                ("firmware server", [_address(ip, PORT) for ip in self.seeds()])
            )
        rounds.append(("seen", list(known)))
        found: set[str] = set()
        for source, addresses in rounds:
            for address in addresses:
                if address not in tried:
                    tried.add(address)
                    kid = self._probe(address, source)
                    if kid:
                        found.add(kid)
        if discover:
            for address in self._from_fleet():
                if address not in tried:
                    tried.add(address)
                    kid = self._probe(address, "another kiosk")
                    if kid:
                        found.add(kid)
        with self._lock:
            for kid, k in self.kiosks.items():
                if kid not in found and k.get("online"):
                    k["online"] = False
                    _LOGGER.warning(
                        "kiosk %s (%s) not answering", k.get("name"), k.get("address")
                    )
            if discover:
                self.last_scan = _now()
            self._save()

    def _run(self) -> None:
        """Look for kiosks at start and on Look now; check the known ones every minute."""
        discover = True
        while not self._stop.is_set():
            try:
                self.scan(discover)
                self._due()
            except Exception:  # noqa: BLE001 - the loop must survive anything
                _LOGGER.exception("kiosks: scan or backup failed")
            discover = self._wake.wait(POLL_SECONDS)
            self._wake.clear()

    def start(self) -> None:
        _LOGGER.info(
            "kiosks: starting, %d known, %d logged in",
            len(self.kiosks),
            len(self.tokens),
        )
        threading.Thread(target=self._run, name="kiosks", daemon=True).start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()

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
        }

    # -- actions

    def login(self, password: str) -> dict[str, str]:
        """Log in to every kiosk that answers; each one's result."""
        results = {}
        for kid, k in list(self.kiosks.items()):
            if not k.get("online"):
                results[kid] = "offline"
                continue
            try:
                status, data = self._request(
                    k["address"],
                    "/api/login",
                    "POST",
                    json.dumps({"password": password, "ttl_days": TOKEN_DAYS}).encode(),
                )
                token = json.loads(data).get("token") if status == 200 else None
            except (OSError, ValueError) as exc:
                status, token = 0, None
                _LOGGER.warning("kiosk %s: login failed: %s", k["name"], exc)
            if token:
                self.tokens[kid] = token
                results[kid] = "ok"
                _LOGGER.info("kiosk %s: logged in", k["name"])
            else:
                results[kid] = (
                    "refused" if status in (401, 403) else f"failed ({status})"
                )
                _LOGGER.warning("kiosk %s: login %s", k["name"], results[kid])
        with self._lock:
            self._save()
        return results

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

    def update(self, kid: str) -> Response:
        """Ask the kiosk to check its update source (the firmware server) and install
        what it finds, as its own Updates button does."""
        k, token = self.kiosks.get(kid), self.tokens.get(kid)
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})

        def command(name: str) -> dict[str, Any]:
            try:
                status, data = self._request(
                    k["address"], f"/api/commands/{name}", "POST", b"{}", token, 30
                )
                answer = json.loads(data or b"{}")
            except (OSError, ValueError) as exc:
                return {"ok": False, "error": str(exc)}
            _LOGGER.debug("kiosk %s: %s -> %d %s", k["name"], name, status, answer)
            if status != 200:
                return {
                    "ok": False,
                    "error": answer.get("error") or f"answered {status}",
                }
            return answer

        checked = command("checkUpdateNow")
        if checked.get("ok") is False:
            _LOGGER.warning(
                "kiosk %s: update check failed: %s", k["name"], checked.get("error")
            )
            return _json(502, {"error": f"Update check failed: {checked.get('error')}"})
        started = command("installUpdate")
        error = str(started.get("error") or "")
        if started.get("ok") is False and "already running" not in error:
            _LOGGER.warning("kiosk %s: update not started: %s", k["name"], error)
            return _json(502, {"error": f"The update did not start: {error}"})
        available = (checked.get("data") or {}).get("availableVersion")
        _LOGGER.info(
            "kiosk %s: updating from %s to %s",
            k["name"],
            k.get("version"),
            available or "the latest",
        )
        return _json(200, {"started": True, "version": available})

    def use_firmware_server(self, kid: str) -> Response:
        """Point a fleet leader's updates at the firmware server (Update source: Custom
        repository, at the server's address). Its followers take both settings from it."""
        k, token, url = self.kiosks.get(kid), self.tokens.get(kid), self.firmware_url()
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})
        if not k.get("leader"):
            return _json(409, {"error": f"{k['name']} does not lead a fleet."})
        if not url:
            return _json(409, {"error": "The firmware server is off."})
        body = {"update.source": "custom", "update.source_url": url}
        try:
            status, data = self._request(
                k["address"], "/api/settings", "PATCH", json.dumps(body).encode(), token
            )
        except OSError as exc:
            status, data = 0, str(exc).encode()
        if status != 200:
            _LOGGER.warning(
                "kiosk %s: updates not pointed at %s: %s %r",
                k["name"],
                url,
                status or "no answer",
                data[:200],
            )
            return _json(502, {"error": f"The kiosk answered {status or 'nothing'}."})
        _LOGGER.info(
            "kiosk %s: updates now from the firmware server at %s (its fleet follows)",
            k["name"],
            url,
        )
        return _json(200, {"url": url})

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

    def handle(self, method: str, rest: str, query: dict, body: bytes) -> Response:
        """Admin API under /api/kiosks/."""
        parts = rest.strip("/").split("/") if rest.strip("/") else []
        if method == "GET" and not parts:
            return _json(200, self.view())
        if method == "POST" and parts == ["scan"]:
            self._wake.set()
            return _json(202, {})
        if method == "POST" and parts == ["backup", "check"]:
            return _json(200, {**self.view(), "check": self.check_all()})
        if method == "PUT" and parts == ["backup"]:
            try:
                return self.set_backup(json.loads(body or b"{}"))
            except (ValueError, AttributeError):
                return _json(400, {"error": "Not JSON."})
        if method == "POST" and parts == ["login"]:
            try:
                password = json.loads(body or b"{}").get("password") or ""
            except ValueError:
                password = ""
            if not password:
                return _json(400, {"error": "Enter the password."})
            results = self.login(password)
            return _json(200, {**self.view(), "results": results})
        if method == "POST" and parts == ["addresses"]:
            try:
                raw = str(json.loads(body or b"{}").get("address") or "").strip()
            except ValueError:
                raw = ""
            host = urllib.parse.urlsplit(raw if "//" in raw else f"//{raw}")
            if not host.hostname:
                return _json(400, {"error": "Enter an IP address or host name."})
            address = _address(host.hostname, host.port or PORT)
            if not self._probe(address, "added"):
                return _json(
                    400, {"error": f"No Kiosk Satellite answers at {address}."}
                )
            with self._lock:
                if address not in self.addresses:
                    self.addresses.append(address)
                    _LOGGER.info("kiosks: address %s added", address)
                self._save()
            return _json(200, self.view())
        if method == "DELETE" and len(parts) == 2 and parts[1] == "login":
            with self._lock:
                k = self.kiosks.get(parts[0])
                if not k or self.tokens.pop(parts[0], None) is None:
                    return _json(404, {"error": "No login kept for that kiosk."})
                self._save()
            _LOGGER.info("kiosk %s: the app's login forgotten", k.get("name"))
            return _json(200, self.view())
        if method == "DELETE" and len(parts) == 1:
            with self._lock:
                k = self.kiosks.pop(parts[0], None)
                if not k:
                    return _json(404, {"error": "No such kiosk."})
                self.tokens.pop(parts[0], None)
                if k.get("address") in self.addresses:
                    self.addresses.remove(k["address"])
                self._save()
            _LOGGER.info(
                "kiosk %s forgotten (comes back if still found)", k.get("name")
            )
            return _json(200, self.view())
        if method == "POST" and len(parts) == 2 and parts[1] == "update":
            return self.update(parts[0])
        if method == "POST" and len(parts) == 2 and parts[1] == "firmware-server":
            return self.use_firmware_server(parts[0])
        if len(parts) >= 2 and parts[1] == "backups" and parts[0] in self.kiosks:
            kid = parts[0]
            if method == "GET" and len(parts) == 2:
                return _json(200, {"backups": self.backups(kid)})
            if method == "POST" and len(parts) == 2:  # Get latest
                result = self.backup(kid)
                status = 502 if "error" in result else 200
                return _json(status, {**result, "backups": self.backups(kid)})
            if len(parts) == 3 and BACKUP_NAME.match(parts[2]):
                path = self._dir(kid) / parts[2]
                if method == "GET" and path.is_file():
                    return 200, "application/json", path.read_bytes()
                if method == "POST":
                    return self.restore(kid, parts[2])
        return _json(404, {"error": "Unknown request."})

    # -- the kiosk's own admin page, through ingress

    def proxy(self, h: BaseHTTPRequestHandler, rest: str) -> None:
        """/kiosk/<id>/<path>: the kiosk's admin page and API, logged in as the app."""
        kid, slash, path = rest.partition("/")
        k = self.kiosks.get(kid)
        if not k or "address" not in k:
            h.send_error(404, "No such kiosk")
            return
        if not slash:  # /kiosk/<id>: the page needs the trailing slash
            h.send_response(301)
            h.send_header("Location", f"{kid}/")
            h.send_header("Content-Length", "0")
            h.end_headers()
            return
        token = self.tokens.get(kid)
        if h.headers.get("Upgrade", "").lower() == "websocket":
            self._tunnel(h, k, path, token)
            return
        length = int(h.headers.get("Content-Length") or 0)
        body = h.rfile.read(length) if length else None
        headers = {
            name: value
            for name, value in h.headers.items()
            if name.lower()
            not in HOP
            | {
                "host",
                "authorization",
                "accept-encoding",
                "cookie",
                "origin",
                "referer",
            }
            and not name.lower().startswith("x-")
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        elif h.headers.get("Authorization"):
            headers["Authorization"] = h.headers["Authorization"]
        req = urllib.request.Request(
            f"http://{k['address']}/{path}",
            data=body,
            method=h.command,
            headers=headers,
        )
        try:
            resp = urllib.request.urlopen(req, timeout=60)
        except urllib.error.HTTPError as exc:
            resp = exc
        except OSError as exc:
            _LOGGER.warning("kiosk %s: admin page proxy failed: %s", k["name"], exc)
            h.send_error(502, f"{k['name']} is not answering")
            return
        with resp:
            data = resp.read()
            status, out_headers = int(resp.status or 502), resp.headers
        ctype = out_headers.get("Content-Type", "")
        plain = path.split("?")[0]
        _LOGGER.debug("kiosk %s: %s /%s -> %d", k["name"], h.command, path, status)
        if ctype.startswith("text/html") and plain in ("", "index.html"):
            _LOGGER.info("kiosk %s: admin page opened through the app", k["name"])
            data = data.replace(b"<head>", b"<head>" + page_head(bool(token)), 1)
        h.send_response(status)
        for name, value in out_headers.items():
            if name.lower() not in HOP:
                h.send_header(name, value)
        h.send_header("Content-Length", str(len(data)))
        h.end_headers()
        if h.command != "HEAD":
            h.wfile.write(data)

    def _tunnel(
        self, h: BaseHTTPRequestHandler, k: dict[str, Any], path: str, token: str | None
    ) -> None:
        """Pass a websocket through, byte for byte, with the app's token."""
        if token:
            path = re.sub(r"(?<=[?&])token=[^&]*", f"token={token}", path)
        host, _, port = k["address"].rpartition(":")
        try:
            upstream = socket.create_connection((host, int(port)), timeout=self.timeout)
        except OSError as exc:
            h.send_error(502, f"{k['name']} is not answering ({exc})")
            return
        upstream.settimeout(None)
        lines = [f"GET /{path} HTTP/1.1", f"Host: {k['address']}"]
        for name in (
            "Upgrade",
            "Connection",
            "Sec-WebSocket-Key",
            "Sec-WebSocket-Version",
            "Sec-WebSocket-Protocol",
            "Sec-WebSocket-Extensions",
        ):
            if h.headers.get(name):
                lines.append(f"{name}: {h.headers[name]}")
        upstream.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
        h.close_connection = True
        client = h.connection
        client.settimeout(None)
        _LOGGER.debug("kiosk %s: websocket opened", k["name"])

        def pump(src: socket.socket, dst: socket.socket) -> None:
            try:
                while data := src.recv(65536):
                    dst.sendall(data)
            except OSError:
                pass
            finally:
                for s in (src, dst):
                    try:
                        s.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass

        back = threading.Thread(target=pump, args=(upstream, client), daemon=True)
        back.start()
        pump(client, upstream)
        back.join()
        upstream.close()
        _LOGGER.debug("kiosk %s: websocket closed", k["name"])
