import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from casa_mia.modules.guest_login import Endpoint, GuestLogin


class FakeHA(BaseHTTPRequestHandler):
    """Just enough of HA's /auth/login_flow."""

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/auth/login_flow":
            out = {"flow_id": "f1", "echo": body}
        elif body["username"] == "guest" and body["password"] == 'p"w':
            out = {"type": "create_entry", "result": "CODE123"}
        else:
            out = {"type": "form", "errors": {"base": "invalid_auth"}}
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


@pytest.fixture
def ha(serve):
    return serve(ThreadingHTTPServer(("127.0.0.1", 0), FakeHA))


def make(ha, accounts=None, **kw):
    endpoints = [
        Endpoint("suite-1", "Suite 1", "/guest-dashboards/ABC", legacy=True),
        Endpoint("plant", "Plant room", "/knx-panel", "engineer", slug="s3cret"),
    ]
    events = []
    gl = GuestLogin(
        endpoints,
        accounts or {"house-guest": ("guest", 'p"w')},
        port=0,
        internal_url=ha,
        ha_port=lambda: 8123,
        on_login=lambda ep, ip: events.append((ep.id, ip)),
        **kw,
    )
    gl.start()
    return gl, events, f"http://127.0.0.1:{gl.port}"


def get(url):
    try:
        with urllib.request.urlopen(url) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()


def post(url):
    req = urllib.request.Request(url, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read() or b"{}")


def test_off_by_default_and_unknown_look_identical(ha, caplog):
    gl, _, base = make(ha)
    try:
        off = get(f"{base}/?d=/guest-dashboards/ABC")
        unknown = get(f"{base}/?d=/guest-dashboards/NOPE")
        assert off == unknown and off[0] == 404
        assert get(f"{base}/e/s3cret")[0] == 404
        assert post(f"{base}/go?d=/guest-dashboards/ABC")[0] == 404
        assert not gl.health()["endpoints"]["suite-1"]["enabled"]
        # The page reveals nothing; the log says which it was.
        assert "endpoint suite-1 is switched off" in caplog.text
        assert "unknown endpoint for dashboard /guest-dashboards/NOPE" in caplog.text
        assert (
            "landing dashboard /guest-dashboards/NOPE and 'Legacy QR code' on"
            in caplog.text
        )
        assert "Guest login page" in caplog.text
    finally:
        gl.stop()


def test_legacy_and_slug_login(ha):
    gl, events, base = make(ha)
    try:
        assert gl.control("suite-1/enable") == 204 and gl.control("plant/enable") == 204
        assert get(f"{base}/?d=/guest-dashboards/ABC")[0] == 200
        assert (
            get(f"{base}/?d=guest-dashboards/ABC")[0] == 200
        )  # leading slash optional
        status, out = post(f"{base}/go?d=/guest-dashboards/ABC")
        assert status == 200
        url = urllib.parse.urlsplit(out["url"])
        assert url.hostname == "127.0.0.1" and url.port == 8123
        assert url.path == "/guest-dashboards/ABC"
        q = urllib.parse.parse_qs(url.query)
        assert q["code"] == ["CODE123"] and q["auth_callback"] == ["1"]
        state = json.loads(base64.b64decode(q["state"][0]))
        assert state == {
            "hassUrl": "http://127.0.0.1:8123",
            "clientId": "http://127.0.0.1:8123/",
        }
        assert events == [("suite-1", "127.0.0.1")]
        assert get(f"{base}/e/s3cret")[0] == 200
        assert post(f"{base}/e/s3cret/go")[0] == 200
        health = gl.health()["endpoints"]
        assert health["suite-1"]["logins"] == 1 and health["suite-1"]["last_login"]
    finally:
        gl.stop()


def test_ha_host_only_for_the_box_s_own_names(ha):
    gl, _, base = make(ha, ha_hosts=lambda: ["homeassistant.local"])
    try:
        gl.control("suite-1/enable")
        q = "/go?d=/guest-dashboards/ABC&ha_host="
        url = post(base + q + "homeassistant.local")[1]["url"]
        assert urllib.parse.urlsplit(url).hostname == "homeassistant.local"
        state = json.loads(
            base64.b64decode(
                urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)["state"][0]
            )
        )
        assert state["hassUrl"] == "http://homeassistant.local:8123"
        # Any other host is ignored: it would hand a login code to a stranger.
        url = post(base + q + "evil.example")[1]["url"]
        assert urllib.parse.urlsplit(url).hostname == "127.0.0.1"
    finally:
        gl.stop()


def test_disable_closes_again(ha):
    gl, _, base = make(ha)
    try:
        gl.control("suite-1/enable")
        assert get(f"{base}/?d=/guest-dashboards/ABC")[0] == 200
        gl.control("suite-1/disable")
        assert get(f"{base}/?d=/guest-dashboards/ABC")[0] == 404
        assert gl.control("nope/enable") == 404
        assert gl.control("suite-1/enable?minutes=abc") == 400
    finally:
        gl.stop()


def test_timed_enable_expires(ha, monkeypatch):
    from types import SimpleNamespace

    from casa_mia.modules.guest_login import login

    now = 1000.0
    monkeypatch.setattr(
        login, "time", SimpleNamespace(time=lambda: now, monotonic=login.time.monotonic)
    )
    gl, _, base = make(ha)
    try:
        gl.control("suite-1/enable?minutes=1")
        now += 59
        assert gl.health()["endpoints"]["suite-1"]["enabled"]
        now += 1
        assert not gl.health()["endpoints"]["suite-1"]["enabled"]
    finally:
        gl.stop()


def test_bad_password_is_401_and_ha_down_is_502(ha):
    gl, _, base = make(ha, accounts={"house-guest": ("guest", "wrong")})
    try:
        gl.control("suite-1/enable")
        assert post(f"{base}/go?d=/guest-dashboards/ABC") == (
            401,
            {"error": "login_failed"},
        )
    finally:
        gl.stop()
    gl, _, base = make("http://127.0.0.1:1")
    try:
        gl.control("suite-1/enable")
        assert post(f"{base}/go?d=/guest-dashboards/ABC") == (
            502,
            {"error": "ha_unreachable"},
        )
    finally:
        gl.stop()


def test_rate_limit(ha):
    gl, _, base = make(ha, accounts={"house-guest": ("guest", "wrong")})
    try:
        gl.control("suite-1/enable")
        codes = [post(f"{base}/go?d=/guest-dashboards/ABC")[0] for _ in range(12)]
        assert codes[:10] == [401] * 10 and codes[10:] == [429, 429]
    finally:
        gl.stop()


def test_config_problems_are_reported(ha, caplog):
    endpoints = [
        Endpoint("a", "A", "/x", account="other", legacy=True),
        Endpoint("b", "B", "/y"),
    ]
    gl = GuestLogin(
        endpoints, {"house-guest": ("guest", "pw")}, port=0, internal_url=ha
    )
    gl.start()
    gl.stop()
    assert "login 'other' does not exist (have: house-guest)" in caplog.text
    assert "unreachable: give it a secret address or a printed QR" in caplog.text
    caplog.clear()
    GuestLogin([], {}, port=0, internal_url=ha).start()
    assert "no endpoints yet" in caplog.text


def test_login_failures_say_why(ha, caplog):
    gl, _, base = make(ha, accounts={"house-guest": ("guest", "wrong")})
    try:
        gl.control("suite-1/enable")
        post(f"{base}/go?d=/guest-dashboards/ABC")
        assert "Home Assistant rejected user 'guest'" in caplog.text
    finally:
        gl.stop()
    caplog.clear()
    gl, _, base = make(ha, accounts={"other": ("a", "b")})
    try:
        gl.control("suite-1/enable")
        assert post(f"{base}/go?d=/guest-dashboards/ABC")[0] == 500
        assert (
            "uses login 'house-guest', which does not exist (have: other)"
            in caplog.text
        )
    finally:
        gl.stop()


def test_welcome_page_settings_and_overrides(ha):
    endpoints = [
        Endpoint("a", "A", "/x", legacy=True),
        Endpoint("b", "B", "/y", slug="sb", title="Suite <2>", message="Hi", delay=0),
    ]
    gl = GuestLogin(
        endpoints,
        {"house-guest": ("u", "p")},
        port=0,
        internal_url=ha,
        title="Hello",
        welcome_message="Wait",
        welcome_delay=5,
    )
    gl.start()
    try:
        gl.control("a/enable")
        gl.control("b/enable")
        base = f"http://127.0.0.1:{gl.port}"
        a = get(f"{base}/?d=/x")[1].decode()
        assert '<h1 id="h">Hello</h1>' in a and "Wait" in a and "delay=5000" in a
        b = get(f"{base}/e/sb")[1].decode()
        assert "Suite &lt;2&gt;" in b and "<2>" not in b  # escaped
        assert "delay=0," in b and "preview=false" in b
        # The house photo, served beside the page on the guest port.
        status, image = get(f"{base}/welcome/header.jpg")
        assert status == 200 and image.startswith(b"\xff\xd8")
        assert "/welcome/header.jpg" in a
    finally:
        gl.stop()


def test_state_survives_restart(ha, tmp_path):
    state = tmp_path / "state.json"

    def fresh():
        eps = [
            Endpoint("a", "A", "/x", legacy=True),
            Endpoint("b", "B", "/y", slug="sb"),
        ]
        return GuestLogin(
            eps, {"house-guest": ("u", "p")}, port=0, internal_url=ha, state_path=state
        )

    first = fresh()
    first.control("a/enable")
    first.control("b/enable?minutes=60")
    first.control("a/disable")
    first.control("a/enable")
    again = fresh()  # an app restart
    health = again.health()["endpoints"]
    assert health["a"]["enabled"] and health["b"]["enabled"]
    again.control("a/disable")
    assert not fresh().health()["endpoints"]["a"]["enabled"]
    assert fresh().health()["endpoints"]["b"]["enabled"]


def test_expired_timed_opening_is_not_restored(ha, tmp_path):
    state = tmp_path / "state.json"
    state.write_text(
        json.dumps({"a": {"enabled": True, "until": 1.0}, "gone": {"enabled": True}})
    )
    gl = GuestLogin(
        [Endpoint("a", "A", "/x")], {}, port=0, internal_url=ha, state_path=state
    )
    assert not gl.health()["endpoints"]["a"]["enabled"]


def test_unreadable_state_starts_everything_off(ha, tmp_path):
    state = tmp_path / "state.json"
    state.write_text("not json")
    gl = GuestLogin(
        [Endpoint("a", "A", "/x")], {}, port=0, internal_url=ha, state_path=state
    )
    assert not gl.health()["endpoints"]["a"]["enabled"]


def test_printed_qr_ids_never_logged(caplog):
    from casa_mia.modules.guest_login import Endpoint, GuestLogin

    secret = "0123456789ABCDEF"  # gitleaks:allow (a made-up printed QR id)
    ep = Endpoint(
        id="suite", label="Suite", dashboard=f"/guest-dashboards/{secret}", legacy=True
    )
    gl = GuestLogin([ep], {"house-guest": ("guest", "pw")}, port=0)
    with caplog.at_level("DEBUG"):
        gl._report_config()
        why = gl._why("/", f"d=/guest-dashboards/{secret}")  # on, so not refused...
        ep.legacy = False  # ...but a dashboard match with printed QR off is
        why_off = gl._why("/", f"d=/guest-dashboards/{secret}")
    assert secret not in caplog.text
    assert "/guest-dashboards/<printed QR id>" in caplog.text
    assert secret not in why_off and "endpoint suite has that dashboard" in why_off
    assert why


def test_the_welcome_page_names_the_house(monkeypatch):
    from casa_mia import header
    from casa_mia.modules.guest_login import render_welcome

    monkeypatch.setattr(header, "HOUSE", "Villa Rosa")
    assert GuestLogin([], {}).welcome[0] == "Welcome to Villa Rosa"
    assert "Villa Rosa" in render_welcome("Hi", "", 0, None)
