"""Guest login: the goodbye page, the Wi-Fi's QR code and the guest card, and the reach
check's fixes."""

import json
import urllib.parse
from http.server import ThreadingHTTPServer
from typing import Any

import pytest

from casa_mia.modules.guest_login import BadRequest, Endpoint, GuestLogin
from casa_mia.modules.guest_login.printing import card_svg, wifi_text
from casa_mia.modules.guest_login.reach import fix as run_fix
from test_guest_api import GUEST, FakeHA, call
from test_guest_login import FakeHA as FakeLogin
from test_guest_login import get


def test_the_goodbye_page_is_served_and_health_says_where_to(serve):
    gl = GuestLogin(
        [Endpoint("a", "A", "/x", slug="slug-for-a-1", end_sessions=True)],
        {"house-guest": ("u", "p")},
        port=0,
    )
    gl.goodbye = {"title": "Bye <now>", "message": "Come again"}
    gl.user_of = lambda name: "u1" if name == "house-guest" else None
    gl.start()
    try:
        status, page = get(f"http://127.0.0.1:{gl.port}/bye")
        assert status == 200 and b"Bye &lt;now&gt;" in page and b"Come again" in page
        assert b"<script>" not in page  # it signs nobody in
        health = gl.health()
        assert health["goodbye_url"] is None
        assert health["endpoints"]["a"]["user_id"] == "u1"
        assert health["endpoints"]["a"]["end_sessions"] is True
    finally:
        gl.stop()


def test_goodbye_and_wifi_settings(api):
    body = {
        "goodbye": {"title": "Bye", "message": "", "url": "https://example.com/thanks"},
        "wifi": {"ssid": "Oak Tree", "password": "p;w", "security": "odd"},
    }
    status, view = call(api, "PUT", "settings", body)
    assert status == 200 and view["goodbye"]["url"] == "https://example.com/thanks"
    assert view["wifi"] == {
        "ssid": "Oak Tree",
        "password": "p;w",
        "security": "WPA",
        "hidden": False,
    }
    assert api.guest.health()["goodbye_url"] == "https://example.com/thanks"
    bad = call(api, "PUT", "settings", {"goodbye": {"url": "javascript:alert(1)"}})
    assert bad[0] == 400


def test_the_wifi_code_escapes_what_it_must():
    text = wifi_text({"ssid": 'Barn;1,"x"', "password": "a:b\\c", "hidden": True})
    assert text == 'WIFI:T:WPA;S:Barn\\;1\\,\\"x\\";P:a\\:b\\\\c;H:true;;'
    assert wifi_text({"ssid": "Open", "security": "nopass", "password": "x"}) == (
        "WIFI:T:nopass;S:Open;;"
    )


def test_the_guest_card(api):
    one = card_svg("Hi <you>", None, "http://192.0.2.1:8675/e/x", "Annex").decode()
    assert "Hi &lt;you&gt;" in one and "Scan to sign in" in one and "1. " not in one
    two = card_svg(
        "Hi", {"ssid": "Oak", "password": "pw"}, "http://192.0.2.1:8675/e/x", "Annex"
    ).decode()
    assert (
        "1. Join the Wi-Fi" in two and "Password: pw" in two and two.count("<svg") == 3
    )
    assert call(api, "POST", "logins", GUEST)[0] == 201
    ep = {"id": "s1", "label": "S1", "dashboard": "/g", "slug": "slug-1-abcdefgh"}
    assert call(api, "POST", "endpoints", ep)[0] == 201
    status, page = call(api, "GET", "card/s1")
    assert status == 200 and b"print()" in page and b"<svg" in page
    assert call(api, "GET", "card/s1.svg")[1].startswith(b"<svg")
    assert call(api, "GET", "wifi.svg")[0] == 404  # no network saved yet
    call(api, "PUT", "settings", {"wifi": {"ssid": "Oak", "password": "pw"}})
    assert call(api, "GET", "wifi.png")[1].startswith(b"\x89PNG")


class FixHA(FakeHA):
    """HA's websocket for the fixes: the calls made, and a dashboard to change."""

    def __init__(self, admin=False):
        super().__init__()
        self.admin, self.calls = admin, []
        self.config: dict[str, Any] = {"views": [{"path": "one"}]}

    def users(self):
        return [{**u, "is_admin": self.admin} for u in super().users()]

    def call(self, *commands):
        self.calls += commands
        out = []
        for c in commands:
            if c["type"] == "lovelace/dashboards/list":
                out.append(
                    [
                        {"id": "d1", "url_path": "guests", "mode": "storage"},
                        {"id": "d2", "url_path": "heating", "title": "Heating"},
                    ]
                )
            elif c["type"] == "lovelace/config":
                out.append(self.config)
            else:
                out.append(None)
        return out


STORE = {
    "logins": {"house-guest": {"username": "guest", "user_id": "u1"}},
    "default_login": "house-guest",
    "endpoints": [{"id": "s1", "label": "Suite 1", "dashboard": "/guests/one"}],
}


def fix(ha: Any, store, body):
    """The reach check's fix, over the fake HA."""
    return run_fix(ha, store, body)


def sent(ha, kind):
    return [c for c in ha.calls if c["type"] == kind]


def test_fix_local_only_and_admin_only():
    ha = FixHA()
    assert "only from the house network" in fix(
        ha, STORE, {"action": "local_only", "login": "house-guest"}
    )
    assert sent(ha, "config/auth/update") == [
        {"type": "config/auth/update", "user_id": "u1", "local_only": True}
    ]
    assert "administrators only" in fix(
        ha, STORE, {"action": "admin_only", "dashboard_id": "d2"}
    )
    assert sent(ha, "lovelace/dashboards/update")[0]["require_admin"] is True
    with pytest.raises(BadRequest, match="Suite 1"):  # an endpoint lands there
        fix(ha, STORE, {"action": "admin_only", "dashboard_id": "d1"})
    with pytest.raises(BadRequest):
        fix(ha, STORE, {"action": "config/auth/delete"})  # only the named fixes
    with pytest.raises(BadRequest, match="administrator"):
        fix(FixHA(admin=True), STORE, {"action": "local_only", "login": "house-guest"})


def test_fix_kiosk_adds_the_user_and_keeps_the_rest():
    ha = FixHA()
    ha.config["kiosk_mode"] = {
        "hide_search": True,
        "user_settings": [{"users": ["house guest"], "hide_header": True}],
    }
    fix(ha, STORE, {"action": "kiosk", "login": "house-guest", "dashboard": "guests"})
    (saved,) = sent(ha, "lovelace/config/save")
    block = saved["config"]["kiosk_mode"]
    assert block["hide_search"] is True
    assert block["user_settings"] == [
        {"users": ["house guest"], "hide_header": True, "hide_sidebar": True}
    ]
    assert saved["config"]["views"] == [{"path": "one"}]


def test_a_shared_login_signs_out_when_its_last_endpoint_closes(api):
    """Sessions belong to the login: one endpoint set to sign out is enough, whichever
    endpoint closes last."""

    class SignOutHA(FakeHA):
        signed_out: list[str] = []

        def sign_out(self, user_id):
            self.signed_out.append(user_id)

    api.ha = ha = SignOutHA()
    assert call(api, "POST", "logins", GUEST)[0] == 201
    for n, flags in ((1, {"end_sessions": True}), (2, {})):
        ep = {"id": f"s{n}", "label": f"S{n}", "dashboard": "/g/v", "legacy": True}
        assert call(api, "POST", "endpoints", {**ep, "dashboard": f"/g/{n}", **flags})[
            0
        ]
    api.guest.on_closed = None  # called by hand below, not on a thread
    call(api, "POST", "endpoints/s1/on")
    call(api, "POST", "endpoints/s2/on")
    call(api, "POST", "endpoints/s1/off")
    api._closed(api.guest.endpoints["s1"])
    assert ha.signed_out == []  # s2 still open
    assert api.guest.health()["endpoints"]["s2"]["end_sessions"] is True  # the login's
    call(api, "POST", "endpoints/s2/off")
    api._closed(api.guest.endpoints["s2"])  # s2 doesn't sign out itself, but s1 does
    assert ha.signed_out == ["u1"]


class TokenHA(FakeLogin):
    """HA's login flow, plus /auth/token and /auth/revoke (forms)."""

    revoked: list[str] = []

    def do_POST(self):
        if self.path in ("/auth/token", "/auth/revoke"):
            form = urllib.parse.parse_qs(
                self.rfile.read(int(self.headers["Content-Length"])).decode()
            )
            if self.path == "/auth/revoke":
                TokenHA.revoked.append(form["token"][0])
                data = b""
            else:
                assert form["code"] == ["CODE123"]
                data = json.dumps(
                    {"access_token": "AT", "refresh_token": "RT"}
                ).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_POST()


def test_who_is_signed_in(serve, monkeypatch):
    from casa_mia.modules.guest_login import signin

    class TokenWS:
        def __init__(self, url, token):
            assert url.endswith("/api/websocket") and token == "AT"

        def call(self, command):
            assert command == {"type": "auth/refresh_tokens"}
            return [
                [
                    {"type": "normal", "is_current": True},  # the look itself
                    {"type": "normal", "last_used_ip": "192.0.2.7", "created_at": "x"},
                    {"type": "long_lived_access_token"},
                ]
            ]

    monkeypatch.setattr(signin, "HA", TokenWS)
    url = serve(ThreadingHTTPServer(("127.0.0.1", 0), TokenHA))
    gl = GuestLogin([], {"house-guest": ("guest", 'p"w')}, port=0, internal_url=url)
    found = gl.sessions("house-guest")
    assert found["long_lived"] == 1
    assert [s["ip"] for s in found["sessions"]] == ["192.0.2.7"]
    assert TokenHA.revoked == ["RT"]  # the look leaves no session behind
    assert "error" in GuestLogin([], {}, port=0, internal_url=url).sessions("nope")
