import json
import shutil
import socket
import subprocess
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from casa_mia.ha import HAError
from casa_mia.modules.kiosks import PAGE_SHIM, PAGE_TOKEN, Kiosks
from casa_mia.server import make_server

PASSWORD = "sesame"


class FakeKiosk(BaseHTTPRequestHandler):
    """Kiosk Satellite's remote API, as much as the module uses."""

    kiosk_id = "k1"
    name = "Kitchen"
    peers: list = []
    seen: list  # (method, path, authorization)
    imported: list
    profile: dict  # what the kiosk's exports contain
    exports = 0

    def log_message(self, *args):
        pass

    def _send(self, status, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _authorised(self):
        return self.headers.get("Authorization") == f"Bearer token-{self.kiosk_id}"

    def do_GET(self):
        self.seen.append(("GET", self.path, self.headers.get("Authorization")))
        if self.headers.get("Upgrade") == "websocket":
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            self.end_headers()
            self.wfile.write(f"path={self.path}\n".encode())
            self.wfile.write(self.connection.recv(100))  # echo once
            return
        if self.path == "/api/fleet/identity":
            self._send(
                200,
                {
                    "id": self.kiosk_id,
                    "name": self.name,
                    "version": "2026.9.98",
                    "leader": self.kiosk_id == "k1",
                    "follows": None
                    if self.kiosk_id == "k1"
                    else "Kitchen",  # a name, as Kiosk Satellite gives it
                },
            )
        elif self.path == "/api/health":
            self._send(
                200,
                {
                    "name": self.name,
                    "ip": "127.0.0.1",
                    "battery": 51,
                    "link": {"rssi": -46},
                },
            )
        elif self.path in ("/api/settings/export", "/api/config/export"):
            if not self._authorised():
                return self._send(401, {})
            type(self).exports += 1  # exportedAt differs every time, as on a real kiosk
            self._send(
                200, {"exportedAt": f"t{self.exports}", "settings": dict(self.profile)}
            )
        elif self.path == "/":
            self._send(
                200,
                b"<html><head><title>KS</title></head></html>",
                "text/html; charset=utf-8",
            )
        elif self.path.startswith("/static/core.js"):
            self._send(
                200,
                b'fetch("/api/settings");new WebSocket(`ws://${location.host}/api/ws?token=x`)',
                "text/javascript",
            )
        else:
            self._send(404, {})

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        self.seen.append(("POST", self.path, self.headers.get("Authorization")))
        if self.path == "/api/login":
            if json.loads(body)["password"] != PASSWORD:
                return self._send(401, {})
            self._send(200, {"token": f"token-{self.kiosk_id}"})
        elif self.path in (
            "/api/commands/checkUpdateNow",
            "/api/commands/installUpdate",
        ):
            if not self._authorised():
                return self._send(401, {})
            self.imported.append((self.path, None))
            self._send(200, {"ok": True, "data": {"availableVersion": "2026.10.2"}})
        elif self.path == "/api/commands/fleet":
            if not self._authorised():
                return self._send(401, {})
            self._send(
                200, {"ok": True, "data": {"enabled": True, "devices": self.peers}}
            )
        elif self.path.startswith(("/api/settings/import", "/api/config/import")):
            if not self._authorised():
                return self._send(401, {})
            self.imported.append((self.path, json.loads(body)))
            self._send(200, {"ok": True})
        else:
            self._send(404, {})


def kiosk(kiosk_id, name, peers=()):
    handler = type(
        f"Fake{kiosk_id}",
        (FakeKiosk,),
        {
            "kiosk_id": kiosk_id,
            "name": name,
            "peers": list(peers),
            "seen": [],
            "imported": [],
            "profile": {"device.name": name},
            "exports": 0,
        },
    )
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, handler, f"127.0.0.1:{server.server_port}"


class FakeHA:
    def __init__(self, devices):
        self.devices = devices

    def call(self, command):
        assert command == {"type": "config/device_registry/list"}
        if self.devices is None:
            raise HAError("down")
        return [self.devices]


@pytest.fixture
def two(tmp_path):
    """Kiosk 2 is known only to kiosk 1; kiosk 1 only to HA (through ESPHome)."""
    s2, h2, a2 = kiosk("k2", "Hall")
    s1, h1, a1 = kiosk(
        "k1",
        "Kitchen",
        [{"address": "127.0.0.1", "port": s2.server_port, "self": False}],
    )
    ha = FakeHA(
        [
            {"manufacturer": "kiosk_satellite", "configuration_url": f"http://{a1}"},
            {"manufacturer": "Shelly", "configuration_url": "http://10.0.0.9"},
        ]
    )
    k = Kiosks(
        tmp_path / "kiosks.json",
        tmp_path / "backups",
        ha,  # type: ignore[arg-type]
        latest=lambda: "2026.10.2",
    )
    yield k, (h1, a1), (h2, a2)
    for s in (s1, s2):
        s.shutdown()
        s.server_close()


def call(k, method, rest="", body=None, **query):
    status, _, data = k.handle(
        method,
        rest,
        {n: [v] for n, v in query.items()},
        json.dumps(body).encode() if body is not None else b"",
    )
    return status, json.loads(data)


def test_found_through_ha_then_through_each_other_once_logged_in(two, tmp_path):
    k, (h1, a1), (h2, a2) = two
    k.scan()
    assert list(k.kiosks) == ["k1"]
    assert k.health()["need_login"] == 1 and k.health()["behind"] == 1

    assert call(k, "POST", "login", {"password": "wrong"})[1]["results"] == {
        "k1": "refused"
    }
    status, view = call(k, "POST", "login", {"password": PASSWORD})
    assert status == 200 and view["results"] == {"k1": "ok"}
    k.scan()  # now kiosk 1 can be asked who else it has heard
    assert sorted(k.kiosks) == ["k1", "k2"]
    assert k.kiosks["k2"]["source"] == "another kiosk"
    assert k.kiosks["k1"]["leader"] and k.kiosks["k2"]["follows"] == "Kitchen"
    assert call(k, "POST", "login", {"password": PASSWORD})[1]["results"] == {
        "k1": "ok",
        "k2": "ok",
    }

    stored = (tmp_path / "kiosks.json").read_text()
    assert PASSWORD not in stored and "token-k2" in stored
    assert (tmp_path / "kiosks.json").stat().st_mode & 0o077 == 0


def test_offline_and_added_by_address(two, tmp_path):
    k, (h1, a1), (h2, a2) = two
    k.ha = FakeHA(None)  # type: ignore[assignment]
    k.scan()
    assert k.kiosks == {} and k.ha_error
    assert call(k, "POST", "addresses", {"address": "127.0.0.1:1"})[0] == 400
    status, view = call(k, "POST", "addresses", {"address": f"http://{a2}"})
    assert status == 200 and [r["name"] for r in view["kiosks"]] == ["Hall"]
    again = Kiosks(tmp_path / "kiosks.json", tmp_path / "backups")
    assert again.addresses == [a2] and again.kiosks["k2"]["online"] is False


def test_backups_keep_only_material_changes_and_restore(two, monkeypatch):
    k, (h1, a1), _ = two
    monkeypatch.setattr("casa_mia.modules.kiosks.datetime", _Clock())
    k.scan()
    assert k.backup("k1") == {"error": "Not logged in to that kiosk."}
    k.login(PASSWORD)

    assert k.backup("k1") == {"saved": True, "changes": []}  # the first
    assert k.backup("k1") == {"saved": False, "changes": []}  # only exportedAt moved
    h1.profile["screen.brightness"] = 80
    assert k.backup("k1") == {"saved": True, "changes": ["settings/screen.brightness"]}
    status, listed = call(k, "GET", "k1/backups")
    assert status == 200 and [b["kind"] for b in listed["backups"]] == [
        "config",
        "config",
    ]
    assert listed["backups"][0]["changes"] == ["settings/screen.brightness"]
    assert listed["backups"][1]["changes"] is None  # nothing older to compare with
    assert k.view()["kiosks"][0]["backups"] == 2

    oldest = listed["backups"][1]["name"]
    status, data = k.handle("GET", f"k1/backups/{oldest}", {}, b"")[0::2]
    assert status == 200 and json.loads(data)["settings"] == {"device.name": "Kitchen"}
    status, _ = call(k, "POST", f"k1/backups/{oldest}")
    assert status == 200
    assert h1.imported[-1] == (
        "/api/config/import?adoptIdentity=0&importLocalStorage=1",
        json.loads(data),
    )
    assert call(k, "POST", "k1/backups/../kiosks.json")[0] == 404


def test_keep_prunes_and_settings_are_checked(two, monkeypatch):
    k, (h1, _), _ = two
    k.scan()
    k.login(PASSWORD)
    monkeypatch.setattr("casa_mia.modules.kiosks.datetime", _Clock())
    for n in range(4):
        h1.profile["n"] = n
        k.backup("k1")
    assert len(k.backups("k1")) == 3  # the default keeps 3
    assert (
        call(k, "PUT", "backup", {"kind": "config", "keep": 7, "every_hours": 24})[0]
        == 400
    )
    assert (
        call(k, "PUT", "backup", {"kind": "secrets", "keep": 2, "every_hours": 24})[0]
        == 400
    )
    status, view = call(
        k, "PUT", "backup", {"kind": "settings", "keep": 1, "every_hours": 6}
    )
    assert status == 200 and view["backup"] == {
        "kind": "settings",
        "keep": 1,
        "every_hours": 6,
    }
    assert len(k.backups("k1")) == 1


def test_due_backs_up_once_per_interval(two):
    k, (h1, _), _ = two
    k.scan()
    k.login(PASSWORD)
    k._due()
    k._due()  # checked a moment ago: not due
    assert h1.exports == 1
    k.checked["k1"] = "2000-01-01T00:00:00+00:00"
    k._due()
    assert h1.exports == 2


class _Clock:
    """datetime with now() a second later on each call, so backups get distinct names."""

    def __init__(self):
        from datetime import datetime

        self._real, self._t = datetime, datetime(2026, 10, 2, 12, 0, 0)

    def now(self, tz=None):
        from datetime import timedelta

        self._t += timedelta(seconds=1)
        return self._t.replace(tzinfo=tz)

    def __getattr__(self, name):
        return getattr(self._real, name)


@pytest.fixture
def proxied(two):
    k, (h1, a1), _ = two
    k.scan()
    k.login(PASSWORD)
    server = make_server(0, admin_from=None, proxies={"/kiosk/": k.proxy})
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"127.0.0.1:{server.server_port}", h1
    server.shutdown()
    server.server_close()


def test_proxy_logs_in_for_the_page_and_leaves_its_scripts_alone(proxied):
    base, h1 = proxied
    req = urllib.request.Request(
        f"http://{base}/kiosk/k1/", headers={"Authorization": "Bearer from-browser"}
    )
    with urllib.request.urlopen(req) as r:
        page = r.read().decode()
        assert r.headers.get("X-Frame-Options") is None
    assert f'localStorage.setItem("ks_token","{PAGE_TOKEN}")' in page
    assert page.index(PAGE_SHIM) < page.index("<title>")
    assert h1.seen[-1] == ("GET", "/", "Bearer token-k1")
    with urllib.request.urlopen(f"http://{base}/kiosk/k1/static/core.js?v=1") as r:
        # their scripts test and slice "/api/..." strings, so they pass through as they are
        assert b'fetch("/api/settings")' in r.read()


def test_proxy_unknown_kiosk_is_404(proxied):
    base, _ = proxied
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(f"http://{base}/kiosk/nope/")
    assert err.value.code == 404


def test_websocket_is_tunnelled_with_the_apps_token(proxied):
    base, h1 = proxied
    host, port = base.split(":")
    with socket.create_connection((host, int(port))) as s:
        s.sendall(
            f"GET /kiosk/k1/api/ws?token={PAGE_TOKEN} HTTP/1.1\r\nHost: {base}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: x\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n".encode()
        )
        s.settimeout(5)
        got = b""
        while b"path=" not in got or not got.endswith(b"\n"):
            got += s.recv(1000)
        assert b"101" in got.split(b"\r\n")[0]
        assert b"path=/api/ws?token=token-k1\n" in got
        s.sendall(b"hello")
        echoed = b""
        while not echoed.endswith(b"hello"):
            echoed += s.recv(100)


def test_log_out_forgets_only_the_apps_login(two):
    k, _, _ = two
    k.scan()
    k.login(PASSWORD)
    status, view = call(k, "DELETE", "k1/login")
    assert status == 200 and view["kiosks"][0]["logged_in"] is False
    assert "k1" in k.kiosks and "k1" not in k.tokens
    assert call(k, "DELETE", "k1/login")[0] == 404


def test_update_asks_the_kiosk_to_check_then_install(two):
    k, (h1, _), _ = two
    k.scan()
    assert call(k, "POST", "k1/update")[0] == 409  # not logged in
    k.login(PASSWORD)
    status, result = call(k, "POST", "k1/update")
    assert status == 200 and result == {"started": True, "version": "2026.10.2"}
    assert [path for path, _ in h1.imported] == [
        "/api/commands/checkUpdateNow",
        "/api/commands/installUpdate",
    ]


NODE_CHECK = """
const seen = [];
globalThis.location = { pathname: "/api/hassio_ingress/TOK/kiosk/K/" };
globalThis.window = globalThis;
globalThis.fetch = (u) => seen.push(u);
globalThis.XMLHttpRequest = class { open(m, u) { seen.push(u); } };
globalThis.WebSocket = class { constructor(u) { this.url = u; seen.push(u); } };
eval(SHIM);
fetch("/api/settings"); fetch("api/setup/status");
new XMLHttpRequest().open("POST", "/api/update/upload");
new WebSocket(new WebSocket("wss://ha/api/ws?token=x").url);  // reconnects with its url
console.log(JSON.stringify(seen));
"""


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_page_script_prefixes_api_calls_once_under_ingress():
    script = PAGE_SHIM.removeprefix("<script>").removesuffix("</script>")
    out = subprocess.run(
        ["node", "-e", NODE_CHECK.replace("SHIM", json.dumps(script))],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    base = "/api/hassio_ingress/TOK/kiosk/K/"
    assert json.loads(out) == [
        f"{base}api/settings",
        "api/setup/status",
        f"{base}api/update/upload",
        f"wss://ha{base}api/ws?token=x",
        f"wss://ha{base}api/ws?token=x",
    ]
