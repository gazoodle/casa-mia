"""Remote control: the app logs in to a tablet's VNC server and serves the page's noVNC."""

import base64
import contextlib
import json
import os
import socket
import struct
import threading

import pytest
from Crypto.Cipher import DES

from casa_mia.modules.kiosks import Kiosks
from casa_mia.modules.kiosks.vnc import vnc_key
from casa_mia.server import make_server

VNC_PASSWORD = "open-up"
WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="  # RFC 6455's example, and its answer below
WS_ACCEPT = "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="


class FakeVNC:
    """droidVNC-NG's server as far as the app sees it: RFB 3.8, VNC authentication, then
    "INIT" for the page's ClientInit and an echo of everything after."""

    def __init__(self, password=VNC_PASSWORD):
        self.password = password
        self.server = socket.create_server(("127.0.0.1", 0))
        self.port = self.server.getsockname()[1]
        self.got_init = threading.Event()
        self.page_left = threading.Event()
        self.conns: list[socket.socket] = []
        threading.Thread(target=self._serve, daemon=True).start()

    def _serve(self):
        with self.server:
            try:
                conn, _ = self.server.accept()
            except OSError:
                return
        self.conns.append(conn)
        # Any step may meet a closed connection (the app hung up, or close() in a test):
        # that ends the conversation.
        with conn, contextlib.suppress(OSError):
            self._talk(conn)

    def _talk(self, conn):
        conn.sendall(b"RFB 003.008\n")
        if conn.recv(12) != b"RFB 003.008\n":  # a check: the greeting only
            return
        conn.sendall(bytes([1, 2]))
        if conn.recv(1) != b"\x02":  # the app gave up first (no password set)
            return
        challenge = os.urandom(16)
        conn.sendall(challenge)
        answer = conn.recv(16)
        if answer != DES.new(vnc_key(self.password), DES.MODE_ECB).encrypt(challenge):
            reason = b"Authentication failed"
            conn.sendall(struct.pack(">II", 1, len(reason)) + reason)
            return
        conn.sendall(struct.pack(">I", 0))
        if conn.recv(1) == b"\x01":  # ClientInit, shared
            self.got_init.set()
            conn.sendall(b"INIT")
        while data := conn.recv(1000):
            conn.sendall(b"echo:" + data)
        self.page_left.set()

    def close(self):
        self.server.close()
        for c in self.conns:
            c.close()


class Page:
    """noVNC's side: a websocket to /kiosk/<id>/_vnc, the RFB stream inside its frames."""

    def __init__(self, base):
        host, port = base.split(":")
        self.sock = socket.create_connection((host, int(port)), timeout=5)
        self.sock.sendall(
            f"GET /kiosk/k1/_vnc HTTP/1.1\r\nHost: {base}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {WS_KEY}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n".encode()
        )
        head = b""
        while b"\r\n\r\n" not in head:
            head += self.sock.recv(1)
        self.head = head.decode()
        self.buf = b""

    def send(self, data):
        mask = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes([0x82, 0x80 | len(data)]) + mask + masked)

    def _exact(self, n):
        out = b""
        while len(out) < n:
            chunk = self.sock.recv(n - len(out))
            if not chunk:
                raise EOFError
            out += chunk
        return out

    def read(self, n):
        while len(self.buf) < n:
            op, size = self._exact(2)
            assert op & 0x0F == 0x2 and size < 126  # binary, unmasked, small here
            self.buf += self._exact(size)
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def refusal(self):
        """The reason, after the page's version, when the app refuses."""
        assert self.read(12) == b"RFB 003.008\n"
        self.send(b"RFB 003.008\n")
        assert self.read(1) == b"\0"  # no security types: a reason follows
        return self.read(struct.unpack(">I", self.read(4))[0]).decode()


@pytest.fixture
def remote(tmp_path, serve, monkeypatch):
    """A known tablet at 127.0.0.1 whose VNC port is a FakeVNC; returns (kiosks, base, vnc)."""
    vnc = FakeVNC()
    monkeypatch.setattr("casa_mia.modules.kiosks.vnc.VNC_PORT", vnc.port)
    k = Kiosks(tmp_path / "kiosks.json", tmp_path / "backups", timeout=2)
    k.kiosks["k1"] = {"id": "k1", "name": "Kitchen", "address": "127.0.0.1:1"}
    base = serve(make_server(0, admin_from=None, proxies={"/kiosk/": k.proxy}))
    yield k, base.removeprefix("http://"), vnc
    vnc.close()


def put_password(k, password):
    status, _, data = k.handle(
        "PUT", "vnc", {}, json.dumps({"password": password}).encode()
    )
    return status, json.loads(data)


def started(base, vnc):
    """A page through the handshake to the tablet's first bytes."""
    page = Page(base)

    # The page is offered no password at all: the app has done the real login.
    assert page.read(12) == b"RFB 003.008\n"
    page.send(b"RFB 003.008\n")
    assert page.read(2) == bytes([1, 1])
    page.send(b"\x01")
    assert page.read(4) == b"\0\0\0\0"

    page.send(b"\x01")  # ClientInit reaches the tablet as it is
    assert vnc.got_init.wait(5) and page.read(4) == b"INIT"
    return page


def test_a_session_logs_in_for_the_page_and_passes_both_ways(remote):
    k, base, vnc = remote
    put_password(k, VNC_PASSWORD)
    page = started(base, vnc)
    assert page.head.split()[1] == "101"
    assert f"Sec-WebSocket-Accept: {WS_ACCEPT}" in page.head

    page.send(b"tap")
    assert page.read(8) == b"echo:tap"

    page.sock.close()  # Done: the tablet's side closes too
    assert vnc.page_left.wait(5)


def test_the_tablet_hanging_up_closes_the_page(remote):
    k, base, vnc = remote
    put_password(k, VNC_PASSWORD)
    page = started(base, vnc)
    vnc.close()
    with pytest.raises(EOFError):
        page.read(1)


def test_a_wrong_password_is_refused_with_the_reason(remote):
    k, base, _ = remote
    put_password(k, "guess")
    assert Page(base).refusal() == "wrong VNC password (Authentication failed)"


def test_no_password_set_says_where_to_set_it(remote):
    _, base, _ = remote
    assert "no VNC password is set" in Page(base).refusal()


def test_nothing_on_the_vnc_port_asks_whether_droidvnc_runs(remote, monkeypatch):
    k, base, vnc = remote
    put_password(k, VNC_PASSWORD)
    vnc.close()
    assert "droidVNC-NG is not installed or not running" in Page(base).refusal()


def test_the_dialogs_check_reads_the_greeting_without_logging_in(remote):
    k, _, vnc = remote
    status, _, data = k.handle("GET", "k1/vnc", {}, b"")
    assert status == 200 and json.loads(data) == {"ok": True, "why": None}
    assert not vnc.got_init.is_set()

    vnc.close()
    answer = json.loads(k.handle("GET", "k1/vnc", {}, b"")[2])
    assert answer["ok"] is False
    assert (
        answer["why"]
        == "Kitchen has no VNC (droidVNC-NG is not installed or not running)"
    )
    assert k.handle("GET", "nope/vnc", {}, b"")[0] == 404


def test_the_password_is_kept_but_never_shown(remote, tmp_path):
    k, _, _ = remote
    status, view = put_password(k, VNC_PASSWORD)
    assert status == 200 and view["vnc_password_set"] is True
    assert VNC_PASSWORD not in json.dumps(view)
    stored = tmp_path / "kiosks.json"
    assert json.loads(stored.read_text())["vnc_password"] == VNC_PASSWORD
    assert stored.stat().st_mode & 0o077 == 0
    assert Kiosks(stored, tmp_path / "backups").vnc_password == VNC_PASSWORD
    assert put_password(k, "")[1]["vnc_password_set"] is False


def test_vnc_key_reverses_each_bytes_bits():
    # 'p' is 0x70 (01110000), reversed 00001110; short passwords are NUL-padded to 8.
    assert vnc_key("pa") == bytes([0x0E, 0x86]) + bytes(6)
    assert base64.b16encode(vnc_key("12345678abc")) == b"8C4CCC2CAC6CEC1C"
