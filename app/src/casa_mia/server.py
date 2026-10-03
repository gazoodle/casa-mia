"""The app's local API (/health and module controls, for the integration) and the admin
panel's web UI (everything else, for HA's ingress gateway only)."""

from __future__ import annotations

import html
import json
import logging
import mimetypes
import re
import socket
import threading
import urllib.parse
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import app_version

_LOGGER = logging.getLogger(__name__)

PORT = 8780
# Bump when the local API changes incompatibly; the integration checks it (Repair on mismatch).
API_VERSION = 1
# The built admin UI (app/web, built by tools/build_web, committed).
WEB_DIR = Path(__file__).parent / "web"
# Ingress requests all come from the Supervisor's gateway; nothing else gets the UI.
INGRESS_GATEWAY = "172.30.32.2"
# POSTs that only read (the Camera Dashboard's live previews, one per edit): not logged
# at INFO with the admin page's changes.
READS = ("/api/camera-dashboard/render",)


def integration_url() -> str:
    """The address the Casa Mia integration is set up with. Inside an app the container's
    hostname is its Supervisor hostname (e.g. a6aa04a6-casa-mia), which Core can reach."""
    return f"http://{socket.gethostname()}:{PORT}"


# A module's admin API: handler(method, rest_of_path, query, body) -> (status, type, body).
ApiHandler = Callable[[str, str, dict[str, list[str]], bytes], tuple[int, str, bytes]]


# A pass-through for a whole site under a path: handler(request, rest_of_path) answers
# the request itself (any method, websockets too).
ProxyHandler = Callable[[BaseHTTPRequestHandler, str], None]


class Handler(BaseHTTPRequestHandler):
    def _proxy(self) -> bool:
        """A proxied site (e.g. a kiosk's admin page), for the ingress gateway only. True
        if this request was one (answered there, even if refused)."""
        for prefix, handle in self.server.proxies.items():  # type: ignore[attr-defined]
            if self.path.startswith(prefix):
                admin_from = self.server.admin_from  # type: ignore[attr-defined]
                if admin_from and self.client_address[0] != admin_from:
                    self.send_error(403)
                else:
                    handle(self, self.path[len(prefix) :])
                return True
        return False

    def _api(self, method: str) -> bool:
        """The admin API under /api/<module>/, for the ingress gateway only. True if this
        request was one (answered here, even if refused)."""
        url = urllib.parse.urlparse(self.path)
        if not url.path.startswith("/api/"):
            return False
        admin_from = self.server.admin_from  # type: ignore[attr-defined]
        if admin_from and self.client_address[0] != admin_from:
            self.send_error(403)
            return True
        for prefix, handle in self.server.api.items():  # type: ignore[attr-defined]
            if url.path.startswith(prefix):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                status, ctype, data = handle(
                    method,
                    url.path[len(prefix) :],
                    urllib.parse.parse_qs(url.query),
                    body,
                )
                # Every change made on the admin page is logged (never the body: it can
                # hold passwords); reads are not, the page polls.
                if method != "GET" and url.path not in READS:
                    _LOGGER.info("admin page: %s %s -> %d", method, url.path, status)
                else:
                    _LOGGER.debug("admin page: %s %s -> %d", method, url.path, status)
                self.send_response(status)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(data)
                return True
        self.send_error(404)
        return True

    def do_PATCH(self) -> None:
        if not self._proxy():
            self.send_error(404)

    def do_HEAD(self) -> None:
        if not self._proxy():
            self.send_error(404)

    def do_PUT(self) -> None:
        if self._proxy():
            return
        if not self._api("PUT"):
            self.send_error(404)

    def do_DELETE(self) -> None:
        if self._proxy():
            return
        if not self._api("DELETE"):
            self.send_error(404)

    def do_GET(self) -> None:
        if self._proxy() or self._api("GET"):
            return
        if self.path.split("?")[0] != "/health":
            self._web()
            return
        from . import header  # here: header imports this module

        modules = {name: health() for name, health in self.server.modules.items()}  # type: ignore[attr-defined]
        body = json.dumps(
            {
                "status": "ok",
                "version": app_version(),
                "api": API_VERSION,
                "integration_url": integration_url(),
                "house": header.HOUSE,
                "modules": modules,
            }
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if self._proxy() or self._api("POST"):
            return
        # /<module>/check -> the module's registered action; runs in the background.
        for prefix, handle in self.server.post_handlers.items():  # type: ignore[attr-defined]
            if self.path.startswith(prefix):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                status = handle(self.path[len(prefix) :], body)
                _LOGGER.info("integration: POST %s -> %d", self.path, status)
                self.send_response(status)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
        action = self.server.actions.get(self.path)  # type: ignore[attr-defined]
        if action is None:
            self.send_error(404)
            return
        _LOGGER.info("integration: POST %s -> started", self.path)
        threading.Thread(target=action, daemon=True).start()
        self.send_response(202)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _web(self) -> None:
        """The admin UI. Unknown paths get index.html (the UI routes itself)."""
        admin_from = self.server.admin_from  # type: ignore[attr-defined]
        if admin_from and self.client_address[0] != admin_from:
            self.send_error(403)
            return
        web: Path = self.server.web_dir  # type: ignore[attr-defined]
        rel = self.path.split("?")[0].lstrip("/")
        target = (web / rel).resolve()
        if rel and target.is_file() and target.is_relative_to(web.resolve()):
            body = target.read_bytes()
            ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            cache = (
                "max-age=31536000, immutable"
                if rel.startswith("assets/")
                else "no-cache"
            )
        elif (web / "index.html").is_file():
            # Ingress serves us under a prefix the browser must resolve against (a pattern
            # adapted from an earlier app): rewrite <base href> from the Supervisor's header.
            prefix = self.headers.get("X-Ingress-Path", "")
            if not prefix.startswith("/api/hassio_ingress/"):
                prefix = ""
            page = (web / "index.html").read_text()
            body = re.sub(
                r'<base href="/"\s*/?>',
                f'<base href="{html.escape(prefix)}/">',
                page,
                count=1,
            ).encode()
            ctype, cache = "text/html; charset=utf-8", "no-store"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        pass  # ponytail: silent, switch to logging when modules need request logs


def make_server(
    port: int = PORT,
    modules: dict[str, Callable[[], dict]] | None = None,
    actions: dict[str, Callable[[], None]] | None = None,
    post_handlers: dict[str, Callable[[str, bytes], int]] | None = None,
    admin_from: str | None = INGRESS_GATEWAY,
    api: dict[str, ApiHandler] | None = None,
    web_dir: Path = WEB_DIR,
    proxies: dict[str, ProxyHandler] | None = None,
) -> ThreadingHTTPServer:
    """`modules` maps a module name to its health() callable, reported under /health.
    `actions` maps a POST path (e.g. /gitproxy/check) to a callable run in the background.
    `post_handlers` maps a POST path prefix to a handler(rest_of_path, body) -> HTTP
    status, run inline."""
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    server.modules = modules or {}  # type: ignore[attr-defined]
    server.actions = actions or {}  # type: ignore[attr-defined]
    server.post_handlers = post_handlers or {}  # type: ignore[attr-defined]
    server.admin_from = admin_from  # type: ignore[attr-defined]
    server.web_dir = web_dir  # type: ignore[attr-defined]
    server.api = api or {}  # type: ignore[attr-defined]
    server.proxies = proxies or {}  # type: ignore[attr-defined]
    return server
