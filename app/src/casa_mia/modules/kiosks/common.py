"""Kiosk Satellites: the constants and helpers its parts share."""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from ... import swap

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


# From this Kiosk Satellite version the admin page works under a sub-path itself (its API
# and websocket follow the page's path, its token is kept per path), so no shim.
SUBPATH_VERSION = (2026, 10, 8)


def _needs_shim(version: Any) -> bool:
    """True for a kiosk older than SUBPATH_VERSION, or whose version is not known."""
    parts = re.match(r"(\d+)\.(\d+)\.(\d+)", str(version or ""))
    return not parts or tuple(map(int, parts.groups())) < SUBPATH_VERSION


def page_head(logged_in: bool, version: Any = None) -> bytes:
    """What goes straight after the page's <head>: the shim (only for a kiosk too old to
    work under a sub-path), when the app holds a login for the kiosk the placeholder
    token that skips their login screen, and while the screenshot swap is on its shim."""
    shim = _needs_shim(version)
    head = PAGE_SHIM if shim else ""
    if logged_in:
        head += f'<script>localStorage.setItem("ks_token","{PAGE_TOKEN}");'
        if not shim:  # newer pages keep the token per path
            head += (
                'localStorage.setItem("ks_token:"+location.pathname.replace(/[^/]*$/,""),'
                f'"{PAGE_TOKEN}")'
            )
        head += "</script>"
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
