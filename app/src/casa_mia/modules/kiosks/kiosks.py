"""The Kiosk Satellites module: its timer, the admin page's API, and the proxy to each kiosk's own admin page."""

from __future__ import annotations

import json
import logging
import re
import socket
import threading
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from typing import Any

from .commands import Commands
from .common import (
    BACKUP_NAME,
    HOP,
    POLL_SECONDS,
    PORT,
    Response,
    _address,
    _json,
    _needs_shim,
    page_head,
)

_LOGGER = logging.getLogger(__name__)


class Kiosks(Commands):
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
            _LOGGER.info(
                "kiosk %s: admin page opened through the app (version %s, %s)",
                k["name"],
                k.get("version"),
                "shim added" if _needs_shim(k.get("version")) else "no shim needed",
            )
            data = data.replace(
                b"<head>", b"<head>" + page_head(bool(token), k.get("version")), 1
            )
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
