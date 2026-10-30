"""Remote control: a tablet's screen and touch, through droidVNC-NG beside Kiosk Satellite.

The admin page's noVNC opens a websocket to /kiosk/<id>/_vnc. The app connects to the
tablet's VNC port, logs in with the VNC password (one for every tablet, set on the admin
page and kept with the logins), then answers the page as a VNC server that needs no
password, and from there passes the traffic through both ways. The password never reaches
the browser. A failure before that goes to noVNC as VNC's own refusal with a reason, so the
page can say why.

Kiosk Satellite's own API has no touch: its author declined it (kiosk-satellite #1087 for
performance, #1217 for security), hence droidVNC-NG.
"""

from __future__ import annotations

import base64
import contextlib
import hashlib
import logging
import socket
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler
from typing import Any

from Crypto.Cipher import DES

from .commands import Commands

_LOGGER = logging.getLogger(__name__)

VNC_PORT = 5900
RFB = b"RFB 003.008\n"
_WS_GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
_NONE, _VNC_AUTH = 1, 2


class Refused(Exception):
    """Why a session could not start, in words for the page."""


def _exact(sock: socket.socket, n: int) -> bytes:
    data = b""
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            raise Refused("the tablet's VNC server hung up during login")
        data += chunk
    return data


def _reason(sock: socket.socket) -> str:
    """The server's reason string after a refusal (RFB 3.8), or '' if it gives none."""
    try:
        return _exact(sock, struct.unpack(">I", _exact(sock, 4))[0]).decode(
            errors="replace"
        )
    except (Refused, OSError):
        return ""


def vnc_key(password: str) -> bytes:
    """VNC's DES key: the password's first 8 bytes, NUL-padded, each byte's bits reversed
    (a quirk of the original VNC code, kept by every server since)."""
    return bytes(
        int(f"{b:08b}"[::-1], 2) for b in password.encode()[:8].ljust(8, b"\0")
    )


def vnc_login(sock: socket.socket, password: str | None) -> None:
    """Up to and including the server's SecurityResult, as an RFB 3.8 client."""
    if not _exact(sock, 12).startswith(b"RFB "):
        raise Refused("something answers on the VNC port, but not VNC")
    sock.sendall(RFB)

    types = _exact(sock, _exact(sock, 1)[0])
    if not types:
        raise Refused(
            f"the tablet's VNC server refused: {_reason(sock) or 'no reason'}"
        )
    if _VNC_AUTH in types:
        if not password:
            raise Refused("no VNC password is set in Casa Mia (Kiosk Satellites page)")
        sock.sendall(bytes([_VNC_AUTH]))
        challenge = _exact(sock, 16)
        sock.sendall(DES.new(vnc_key(password), DES.MODE_ECB).encrypt(challenge))
    elif _NONE in types:
        sock.sendall(bytes([_NONE]))
    else:
        raise Refused(f"the tablet's VNC server wants an unknown login ({list(types)})")

    if struct.unpack(">I", _exact(sock, 4))[0] != 0:
        reason = _reason(sock)
        raise Refused(f"wrong VNC password{f' ({reason})' if reason else ''}")


class WebSocket:
    """The server end of a websocket (RFC 6455) over a request's connection: binary
    frames out, any data frames in as one byte stream. Enough for noVNC."""

    def __init__(self, h: BaseHTTPRequestHandler) -> None:
        self.rfile = h.rfile
        self.sock = h.connection
        self._send = (
            threading.Lock()
        )  # the pong (reader) and the pump (writer) both send
        self._buf = b""

        accept = base64.b64encode(
            hashlib.sha1(h.headers["Sec-WebSocket-Key"].encode() + _WS_GUID).digest()
        ).decode()
        h.send_response(101)
        h.send_header("Upgrade", "websocket")
        h.send_header("Connection", "Upgrade")
        h.send_header("Sec-WebSocket-Accept", accept)
        if protocols := h.headers.get("Sec-WebSocket-Protocol"):
            h.send_header("Sec-WebSocket-Protocol", protocols.split(",")[0].strip())
        h.end_headers()
        h.close_connection = True

    def _read(self, n: int) -> bytes:
        data = self.rfile.read(n)
        if len(data) < n:
            raise EOFError
        return data

    def recv(self) -> bytes | None:
        """The next data frame's payload; None once the page closes."""
        try:
            while True:
                head = self._read(2)
                op, n = head[0] & 0x0F, head[1] & 0x7F
                if n == 126:
                    n = struct.unpack(">H", self._read(2))[0]
                elif n == 127:
                    n = struct.unpack(">Q", self._read(8))[0]
                mask = self._read(4) if head[1] & 0x80 else b""
                data = self._read(n)
                if mask:
                    pad = (mask * (n // 4 + 1))[:n]
                    data = (
                        int.from_bytes(data, "big") ^ int.from_bytes(pad, "big")
                    ).to_bytes(n, "big")
                if op == 0x8:
                    return None
                if op == 0x9:
                    self.send(data, 0xA)
                elif op in (0x0, 0x1, 0x2):
                    return data
        except (EOFError, OSError):
            return None

    def read(self, n: int) -> bytes:
        """Exactly n bytes of the stream, across frames."""
        while len(self._buf) < n:
            data = self.recv()
            if data is None:
                raise EOFError
            self._buf += data
        out, self._buf = self._buf[:n], self._buf[n:]
        return out

    def leftover(self) -> bytes:
        out, self._buf = self._buf, b""
        return out

    def send(self, data: bytes, op: int = 0x2) -> None:
        n = len(data)
        if n < 126:
            head = struct.pack(">BB", 0x80 | op, n)
        elif n < 65536:
            head = struct.pack(">BBH", 0x80 | op, 126, n)
        else:
            head = struct.pack(">BBQ", 0x80 | op, 127, n)
        with self._send:
            self.sock.sendall(head + data)


def _shut(*socks: socket.socket) -> None:
    """Unblock whatever reads from these, so both pumps end together."""
    for s in socks:
        try:
            s.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass


class Remote(Commands):
    def remote(self, h: BaseHTTPRequestHandler, k: dict[str, Any]) -> None:
        """/kiosk/<id>/_vnc: the tablet's VNC server, logged in, to the page's noVNC."""
        ws = WebSocket(h)
        host = k.get("ip") or k["address"].rpartition(":")[0]

        # The page waits for a VNC greeting either way: the session, or a refusal it shows.
        try:
            tablet = self._vnc_open(host, k["name"])
        except Refused as exc:
            _LOGGER.warning("kiosk %s: remote control refused: %s", k["name"], exc)
            try:
                ws.send(RFB)
                ws.read(12)
                reason = str(exc).encode()
                ws.send(b"\0" + struct.pack(">I", len(reason)) + reason)
            except (EOFError, OSError):
                pass
            return

        with tablet:
            started = time.monotonic()
            try:
                ws.send(RFB)
                ws.read(12)
                ws.send(bytes([1, _NONE]))
                ws.read(1)
                ws.send(struct.pack(">I", 0))
                tablet.sendall(ws.leftover())
            except (EOFError, OSError):
                _LOGGER.info(
                    "kiosk %s: remote control page left before it started", k["name"]
                )
                return
            _LOGGER.info("kiosk %s: remote control started", k["name"])
            ended = self._splice(ws, tablet)
            _LOGGER.info(
                "kiosk %s: remote control ended after %d s (%s)",
                k["name"],
                time.monotonic() - started,
                ended,
            )

    def _vnc_open(self, host: str, name: str) -> socket.socket:
        """A connection to the tablet's VNC server, logged in."""
        try:
            sock = socket.create_connection((host, VNC_PORT), timeout=self.timeout)
        except ConnectionRefusedError:
            raise Refused(
                f"nothing listens on {name}'s VNC port {VNC_PORT}: is droidVNC-NG installed and running?"
            ) from None
        except OSError as exc:
            raise Refused(f"{name} is not answering on its VNC port ({exc})") from exc
        with contextlib.ExitStack() as guard:  # closed on any failure, kept on success
            guard.enter_context(sock)
            try:
                vnc_login(sock, self.vnc_password)
            except OSError as exc:
                raise Refused(
                    f"{name}'s VNC server did not finish the login ({exc})"
                ) from exc
            sock.settimeout(None)
            guard.pop_all()
        return sock

    @staticmethod
    def _splice(ws: WebSocket, tablet: socket.socket) -> str:
        """Pass the traffic both ways until either side ends; say which did."""
        ended: list[str] = []

        def down() -> None:  # the screen: tablet to page
            try:
                while data := tablet.recv(65536):
                    ws.send(data)
                ended.append("the tablet closed it")
            except OSError as exc:
                ended.append(f"the connection failed: {exc}")
            finally:
                _shut(tablet, ws.sock)

        back = threading.Thread(target=down, name="vnc-down", daemon=True)
        back.start()
        try:
            while (data := ws.recv()) is not None:  # touch and keys: page to tablet
                tablet.sendall(data)
            ended.append("the page closed it")
        except OSError as exc:
            ended.append(f"the connection failed: {exc}")
        finally:
            _shut(tablet, ws.sock)
            back.join()
        return ended[0]
