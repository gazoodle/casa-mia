"""Guest login, tightened: 2FA codes, closing (sessions ended, a new address), the
engineer and house-info pages, what each login can reach, and QR codes for any page."""

import json
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace

import pytest

from casa_mia.modules.guest_login import Endpoint, GuestLogin, login
from casa_mia.modules.guest_login.reach import report
from test_guest_api import GUEST, FakeHA, call
from test_guest_login import get

CODE = "246810"


class FakeMFA(BaseHTTPRequestHandler):
    """HA's login flow for a user with two-factor sign-in."""

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/auth/login_flow":
            out = {"flow_id": "f2"}
        elif body.get("username") == "two":  # two 2FA modules: HA asks which first
            out = {
                "type": "form",
                "step_id": "select_mfa_module",
                "data_schema": [
                    {
                        "name": "multi_factor_auth_module",
                        "options": [["notify", "Notify"], ["totp", "App"]],
                    }
                ],
            }
        elif "username" in body or body.get("multi_factor_auth_module") == "totp":
            out = {"type": "form", "step_id": "mfa", "flow_id": "f2"}
        elif body.get("code") == CODE:
            out = {"type": "create_entry", "result": "CODE2FA"}
        else:
            out = {"type": "form", "step_id": "mfa", "errors": {"base": "invalid_code"}}
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def post_json(url, body=None):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode() if body else None, method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read() or b"{}")


def test_a_2fa_login_asks_for_the_code(serve):
    ha = serve(ThreadingHTTPServer(("127.0.0.1", 0), FakeMFA))
    gl = GuestLogin(
        [Endpoint("plant", "Plant room", "/knx", "engineer", slug="s3cret-plant")],
        {"house-guest": ("eng", "pw")},
        port=0,
        internal_url=ha,
    )
    gl.start()
    try:
        gl.control("plant/enable")
        go = f"http://127.0.0.1:{gl.port}/e/s3cret-plant/go"
        status, out = post_json(go)
        assert status == 200 and set(out) == {"mfa"}
        assert post_json(go, {"pending": out["mfa"], "code": "000000"}) == (
            401,
            {"error": "bad_code"},
        )
        status, done = post_json(go, {"pending": out["mfa"], "code": CODE})
        assert status == 200 and "code=CODE2FA" in done["url"]
        # Used up: the same token is no good again.
        assert post_json(go, {"pending": out["mfa"], "code": CODE})[1] == {
            "error": "mfa_expired"
        }
        assert gl.test_login("house-guest") is None  # the password itself is right
        gl.accounts["house-guest"] = ("two", "pw")
        assert post_json(go)[1].keys() == {"mfa"}
    finally:
        gl.stop()


def closing(ha, **flags):
    """A GuestLogin whose closed endpoints are collected, and the event that says so."""
    eps = [
        Endpoint("a", "A", "/x", slug="slug-for-a-1", **flags),
        Endpoint("b", "B", "/y", slug="slug-for-b-1"),
    ]
    gl = GuestLogin(eps, {"house-guest": ("u", "p")}, port=0, internal_url=ha)
    seen, done = [], threading.Event()

    def closed(ep):
        seen.append(ep.id)
        done.set()

    gl.on_closed = closed
    return gl, seen, done


def test_closing_calls_back_only_when_it_has_work(monkeypatch):
    gl, seen, done = closing("http://127.0.0.1:1")
    gl.control("a/enable")
    gl.control("a/disable")
    assert seen == []  # neither end_sessions nor rotate
    gl, seen, done = closing("http://127.0.0.1:1", end_sessions=True)
    gl.control("a/disable")  # already closed: nothing to end
    gl.control("a/enable")
    gl.control("a/disable")
    assert done.wait(2) and seen == ["a"]


def test_a_timed_opening_closes_properly_when_it_runs_out(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(
        login,
        "time",
        SimpleNamespace(time=lambda: now[0], monotonic=login.time.monotonic),
    )
    gl, seen, done = closing("http://127.0.0.1:1", rotate=True)
    gl.control("a/enable?minutes=1")
    gl._expire()
    assert seen == []
    now[0] += 60
    gl._expire()
    assert done.wait(2) and seen == ["a"] and not gl.endpoints["a"].enabled
    assert gl.others_open(gl.endpoints["a"]) == []
    gl.control("b/enable")
    assert gl.others_open(gl.endpoints["a"]) == ["b"]  # same (default) login


class SignOutHA(FakeHA):
    def __init__(self, admin=False):
        super().__init__()
        self.admin, self.signed_out = admin, []

    def users(self):
        return [{**u, "is_admin": self.admin} for u in super().users()]

    def sign_out(self, user_id):
        self.signed_out.append(user_id)


def setup(api, ha, **flags):
    api.ha = ha
    assert call(api, "POST", "logins", GUEST)[0] == 201
    for n in (1, 2):
        ep = {
            "id": f"s{n}",
            "label": f"S{n}",
            "dashboard": "/g/v",
            "slug": f"slug-{n}-abcdefgh",
        }
        assert call(api, "POST", "endpoints", {**ep, **flags})[0] == 201


def test_closing_ends_sessions_unless_the_login_is_still_open(api, caplog):
    caplog.set_level("INFO")
    ha = SignOutHA()
    setup(api, ha, end_sessions=True)
    api.guest.on_closed = None  # called by hand below, not on a thread
    call(api, "POST", "endpoints/s1/on")
    call(api, "POST", "endpoints/s2/on")
    call(api, "POST", "endpoints/s1/off")
    api._closed(api.guest.endpoints["s1"])
    assert ha.signed_out == [] and "s2 still open" in caplog.text
    call(api, "POST", "endpoints/s2/off")
    api._closed(api.guest.endpoints["s2"])
    assert ha.signed_out == ["u1"]
    # By hand, from the login's card.
    status, out = call(api, "POST", "logins/house-guest/sign-out")
    assert status == 200 and ha.signed_out == ["u1", "u1"]


def test_an_administrator_is_never_signed_out(api, caplog):
    ha = SignOutHA(admin=True)
    setup(api, ha, end_sessions=True)
    api._closed(api.guest.endpoints["s1"])
    assert ha.signed_out == [] and "administrator" in caplog.text
    assert call(api, "POST", "logins/house-guest/sign-out")[0] == 400


def test_closing_gives_a_rotating_endpoint_a_new_address(api):
    setup(api, SignOutHA(), rotate=True)
    before = api.guest.endpoints["s1"].slug
    api._closed(api.guest.endpoints["s1"])
    after = api.data["endpoints"][0]["slug"]
    assert after != before and api.guest.endpoints["s1"].slug == after
    assert api.data["endpoints"][1]["slug"] == "slug-2-abcdefgh"
    # A rotating endpoint needs a secret address to rotate.
    bad = {"id": "p", "label": "P", "dashboard": "/x", "legacy": True, "rotate": True}
    assert call(api, "POST", "endpoints", bad)[0] == 400


def test_house_info_and_the_engineer_page(api):
    setup(api, SignOutHA())
    info = {"text": "Shoes off at <the door>.\n\nCheck-out by 11."}
    assert call(api, "PUT", "settings", {"house_info": info})[1]["house_info"] == info
    guest = Endpoint("g", "G", "/g", info=True)
    page = api.guest._page(guest)
    assert "&lt;the door&gt;.</p><p>Check-out" in page and "info=true" in page
    assert "url(" in page  # the house photo
    engineer = Endpoint("e", "E", "/e", "engineer", info=True)
    page = api.guest._page(engineer)
    assert "Maintenance access" in page and "Check-out" not in page
    assert "delay=0," in page and "url(" not in page


def test_a_qr_code_for_any_page(api, tmp_path):
    status, svg = call(
        api, "GET", "page-qr/code.svg", query={"path": ["lovelace/hall"]}
    )
    assert status == 200 and svg.startswith(b"<?xml") or b"<svg" in svg
    status, out = call(api, "POST", "page-qr/media", query={"path": ["/lovelace/hall"]})
    assert out["url"] == "http://192.168.1.20:8123/lovelace/hall"
    assert (tmp_path / "media" / "casa-mia/page-qr/lovelace-hall.png").exists()
    bad = call(api, "GET", "page-qr/code.svg", query={"path": ["<script>"]})
    assert bad[0] == 400


def board(url_path, views, kiosk=None, **kw):
    config = {"views": views, **({"kiosk_mode": kiosk} if kiosk else {})}
    return {
        "url_path": url_path,
        "title": url_path or "Overview",
        "config": config,
        **kw,
    }


USER = {"id": "u1", "name": "House Guest", "username": "guest", "is_admin": False}
STORE = {
    "logins": {"house-guest": {"username": "guest", "user_id": "u1"}},
    "default_login": "house-guest",
    "endpoints": [{"id": "s1", "label": "Suite 1", "dashboard": "/guests/one"}],
}


def levels(entry):
    return [(f["level"], f["text"].split(":")[0]) for f in entry["flags"]]


def test_reach_flags_what_is_open():
    facts = {
        "users": [{**USER, "local_only": False}],
        "boards": [
            board(None, [{"path": "home"}]),
            board("guests", [{"path": "one"}, {"path": "two", "visible": False}]),
            board("admin", [], require_admin=True),
        ],
        "kiosk_installed": False,
    }
    (entry,) = report(STORE, facts)
    texts = " ".join(f["text"] for f in entry["flags"])
    assert "outside the house network" in texts
    assert "kiosk-mode is not installed" in texts
    assert "1 other dashboard(s) open to every user" in texts
    assert [d["path"] for d in entry["dashboards"]] == ["/lovelace", "/guests"]
    views = entry["dashboards"][1]["views"]
    assert [v["tab"] for v in views] == [True, False]


def test_reach_reads_kiosk_mode_for_the_user():
    facts = {
        "users": [{**USER, "local_only": True}],
        "boards": [
            board(
                "guests",
                [{"path": "one"}],
                {"user_settings": [{"users": ["house guest"], "kiosk": True}]},
            )
        ],
        "kiosk_installed": True,
    }
    (entry,) = report(STORE, facts)
    assert entry["flags"] == []
    facts["boards"][0]["config"]["kiosk_mode"] = {
        "non_admin_settings": {"hide_header": True}
    }
    (entry,) = report(STORE, facts)
    assert levels(entry) == [("bad", "Suite 1")]
    facts["users"][0]["is_admin"] = True
    assert ("bad", "An administrator") in levels(report(STORE, facts)[0])


@pytest.mark.parametrize("dashboard", ["/missing/x", "/admin/x"])
def test_reach_flags_a_landing_the_user_cannot_open(dashboard):
    store = {**STORE, "endpoints": [{**STORE["endpoints"][0], "dashboard": dashboard}]}
    facts = {
        "users": [{**USER, "local_only": True}],
        "boards": [board("admin", [], require_admin=True)],
        "kiosk_installed": True,
    }
    assert "cannot open" in report(store, facts)[0]["flags"][0]["text"]


def test_the_engineer_page_is_served(serve):
    ha = serve(ThreadingHTTPServer(("127.0.0.1", 0), FakeMFA))
    gl = GuestLogin(
        [Endpoint("e", "E", "/e", "engineer", slug="engineer-slug")],
        {"house-guest": ("u", "p")},
        port=0,
        internal_url=ha,
    )
    gl.start()
    try:
        gl.control("e/enable")
        status, page = get(f"http://127.0.0.1:{gl.port}/e/engineer-slug")
        assert status == 200 and b"Maintenance access" in page
    finally:
        gl.stop()


def test_a_passcode_comes_before_the_sign_in(login_server):
    gl = GuestLogin(
        [Endpoint("s", "Suite", "/g", slug="suite-slug-123", pin="2468")],
        {"house-guest": ("guest", 'p"w')},
        port=0,
        internal_url=login_server,
    )
    gl.start()
    try:
        gl.control("s/enable")
        base = f"http://127.0.0.1:{gl.port}/e/suite-slug-123"
        page = get(base)[1].decode()
        assert 'passcode="numeric"' in page and "2468" not in page  # never sent
        assert post_json(f"{base}/go") == (401, {"error": "bad_passcode"})
        assert post_json(f"{base}/go", {"passcode": "1357"})[1] == {
            "error": "bad_passcode"
        }
        status, out = post_json(f"{base}/go", {"passcode": " 2468 "})
        assert status == 200 and "code=CODE123" in out["url"]
        assert gl.has_mfa("house-guest") is False  # learnt from that sign-in
    finally:
        gl.stop()


def test_no_passcode_on_a_login_with_2fa(api):
    assert call(api, "POST", "logins", GUEST)[0] == 201
    ep = {"id": "s1", "label": "S1", "dashboard": "/g", "slug": "slug-1-abcdefgh"}
    assert call(api, "POST", "endpoints", {**ep, "pin": "12"})[0] == 400  # too short
    api.guest.mfa["house-guest"] = True
    status, out = call(api, "POST", "endpoints", {**ep, "pin": "2468"})
    assert status == 400 and "two-factor" in out["error"]
    api.guest.mfa["house-guest"] = False
    status, view = call(api, "POST", "endpoints", {**ep, "pin": "2468"})
    assert status == 201 and view["endpoints"][0]["pin"] == "2468"
    assert view["logins"][0]["mfa"] is False
    assert call(api, "GET", "logins/house-guest/mfa")[1] == {"mfa": False}
    assert b"Your host will give you a code" in call(api, "GET", "card/s1.svg")[1]
