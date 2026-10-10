import json

from casa_mia.ha import HAError
from casa_mia.modules.guest_login import (
    GuestLogin,
    empty_store,
    load_store,
    runtime,
)


class FakeHA:
    """Stands in for HA's websocket API."""

    def __init__(self):
        self.created, self.passwords = [], {}

    def users(self):
        return [
            {
                "id": "u1",
                "name": "House Guest",
                "username": "guest",
                "is_admin": False,
                "is_active": True,
            }
        ]

    def dashboards(self):
        return [
            {"path": "/guest-dashboards/ABC", "dashboard": "Guests", "view": "Suite 1"}
        ]

    def create_user(self, name, username, password):
        self.created.append((name, username, password))
        return "new-id"

    def set_password(self, user_id, password):
        self.passwords[user_id] = password


def call(api, method, path, body=None, query=None):
    status, ctype, data = api.handle(
        method, path, query or {}, json.dumps(body).encode() if body else b""
    )
    return status, json.loads(data) if ctype == "application/json" else data


GUEST = {
    "name": "house-guest",
    "username": "guest",
    "user_id": "u1",
    "password": 'p"w45678',
}
SUITE = {
    "id": "suite-1",
    "label": "Suite 1",
    "dashboard": "guest-dashboards/ABC",
    "legacy": True,
}


def test_logins_and_endpoints_round_trip(api, tmp_path):
    assert call(api, "POST", "logins", GUEST)[0] == 201
    status, view = call(api, "POST", "endpoints", SUITE)
    assert status == 201
    (ep,) = view["endpoints"]
    # The printed cards' exact address: leading slash restored on the dashboard.
    assert ep["url"] == "http://192.168.1.20:8675/?d=/guest-dashboards/ABC"
    assert (
        view["default_login"] == "house-guest" and view["logins"][0]["endpoints"] == 1
    )
    assert "password" not in json.dumps(view["logins"])  # never sent back
    # Saved to the store and applied live.
    stored = load_store(tmp_path / "guest-login.json")
    assert stored["endpoints"][0]["id"] == "suite-1"
    assert "suite-1" in api.guest.endpoints


def test_validation_explains(api):
    call(api, "POST", "logins", GUEST)
    status, out = call(api, "POST", "endpoints", {**SUITE, "id": "Suite 1"})
    assert status == 400 and "lower-case" in out["error"]
    status, out = call(api, "POST", "endpoints", {**SUITE, "legacy": False})
    assert status == 400 and "secret address" in out["error"]
    status, out = call(api, "POST", "endpoints", {**SUITE, "account": "nobody"})
    assert status == 400 and "no login called nobody" in out["error"]
    call(api, "POST", "endpoints", SUITE)
    status, out = call(api, "POST", "endpoints", {**SUITE, "id": "suite-2"})
    assert status == 400 and "already answers printed QR codes" in out["error"]


def test_rename_keeps_state_and_stats(api):
    call(api, "POST", "logins", GUEST)
    call(api, "POST", "endpoints", SUITE)
    call(api, "POST", "endpoints/suite-1/on")
    api.guest.endpoints["suite-1"].logins = 3
    status, view = call(
        api,
        "PUT",
        "endpoints/suite-1",
        {**SUITE, "id": "suite-one", "label": "Suite One"},
    )
    assert status == 200
    (ep,) = view["endpoints"]
    assert ep["id"] == "suite-one" and ep["enabled"] and ep["logins"] == 3


def test_login_in_use_cannot_be_deleted(api):
    call(api, "POST", "logins", GUEST)
    call(api, "POST", "endpoints", SUITE)
    status, out = call(api, "DELETE", "logins/house-guest")
    assert status == 400 and "suite-1" in out["error"]
    call(api, "DELETE", "endpoints/suite-1")
    assert call(api, "DELETE", "logins/house-guest")[1]["logins"] == []


def test_create_ha_user_and_change_password(api):
    status, view = call(
        api,
        "POST",
        "logins",
        {
            "name": "engineer",
            "password": "longpass1",
            "create": {"name": "Engineer", "username": "engineer"},
        },
    )
    assert status == 201 and api.ha.created == [("Engineer", "engineer", "longpass1")]
    assert view["logins"][0]["user_id"] == "new-id"
    call(api, "PUT", "logins/engineer", {"password": "newpass99", "set_in_ha": True})
    assert api.ha.passwords == {"new-id": "newpass99"}


def test_test_login_uses_ha(api):
    call(api, "POST", "logins", {**GUEST, "password": 'p"w'.ljust(8, "x")})
    assert call(api, "POST", "logins/house-guest/test")[1]["ok"] is False
    api.data["logins"]["house-guest"]["password"] = 'p"w'  # what the fake HA accepts
    api.guest.accounts["house-guest"] = ("guest", 'p"w')
    assert call(api, "POST", "logins/house-guest/test")[1]["ok"] is True


def test_qr_images_and_media(api, tmp_path):
    call(api, "POST", "logins", GUEST)
    call(
        api,
        "POST",
        "endpoints",
        {**SUITE, "id": "plant", "legacy": False, "slug": "abcdefghijklmnop"},
    )
    status, png = call(api, "GET", "qr/plant.png")
    assert status == 200 and png.startswith(b"\x89PNG")
    assert call(api, "GET", "qr/plant.svg")[1].startswith(b"<svg")
    status, out = call(api, "POST", "qr/plant/media")
    assert (
        out["media_source"]
        == "media-source://media_source/local/casa-mia/guest-qr/plant.png"
    )
    assert (
        (tmp_path / "media/casa-mia/guest-qr/plant.png")
        .read_bytes()
        .startswith(b"\x89PNG")
    )
    assert call(api, "GET", "qr/nope.png")[0] == 404


def test_ha_errors_are_partial(api):
    def broken():
        raise HAError("no HA")

    api.ha.users = broken
    out = call(api, "GET", "ha")[1]
    assert out["error"] == "no HA" and out["users"] == []


def test_hosts_lists_every_name_once(api):
    api.mdns_name = lambda: "homeassistant.local"
    assert call(api, "GET", "config")[1]["hosts"] == [
        "192.168.1.20",
        "homeassistant.local",
    ]


def test_remember_caches_the_first_answer():
    from casa_mia.modules.guest_login import remember

    answers = iter([None, "a", "b"])
    cached = remember(lambda: next(answers))
    assert [cached(), cached(), cached()] == [None, "a", "a"]


def test_settings(api):
    call(api, "POST", "logins", GUEST)
    view = call(
        api, "PUT", "settings", {"qr_host": "house.lan", "welcome": {"delay": 99}}
    )[1]
    assert view["qr_host_effective"] == "house.lan" and view["welcome"]["delay"] == 30
    assert call(api, "PUT", "settings", {"qr_host": "http://x"})[0] == 400


def test_login_stats_survive_restart(tmp_path, login_server):
    state = tmp_path / "state.json"
    data = empty_store()
    data["endpoints"] = [{"id": "a", "label": "A", "dashboard": "/x", "legacy": True}]
    g = GuestLogin(
        *runtime(data)[:3], port=0, internal_url=login_server, state_path=state
    )
    g.endpoints["a"].logins, g.endpoints["a"].last_login = (
        2,
        "2026-10-02T10:00:00+00:00",
    )
    with g._lock:
        g._save()
    again = GuestLogin(
        *runtime(data)[:3], port=0, internal_url=login_server, state_path=state
    )
    assert again.health()["endpoints"]["a"]["logins"] == 2


def test_ha_users_parse_ha_s_real_shape(monkeypatch):
    from casa_mia.ha import HA

    # As homeassistant/components/config/auth.py _user_info returns them.
    listed = [
        {
            "id": "a",
            "username": "guest",
            "name": "House Guest",
            "is_owner": False,
            "is_active": True,
            "local_only": True,
            "system_generated": False,
            "group_ids": ["system-users"],
            "credentials": [{"type": "homeassistant"}],
        },
        {
            "id": "b",
            "username": "alex",
            "name": "Alex",
            "is_owner": True,
            "is_active": True,
            "local_only": False,
            "system_generated": False,
            "group_ids": ["system-admin"],
            "credentials": [{"type": "homeassistant"}],
        },
        {
            "id": "c",
            "username": None,
            "name": "Supervisor",
            "is_owner": False,
            "is_active": True,
            "local_only": False,
            "system_generated": True,
            "group_ids": ["system-admin"],
            "credentials": [],
        },
    ]
    ha = HA("ws://x", "t")
    monkeypatch.setattr(ha, "call", lambda *c: [listed])
    users = ha.users()
    assert [(u["username"], u["is_admin"]) for u in users] == [
        ("alex", True),
        ("guest", False),
    ]


def test_preview_uses_unsaved_values_and_signs_nobody_in(api):
    status, page = call(
        api, "GET", "preview", query={"title": ["Hello <you>"], "delay": ["7"]}
    )
    page = page.decode()
    assert status == 200 and "Hello &lt;you&gt;" in page
    assert "preview=true" in page and "delay=7000" in page
    assert 'url("header.jpg")' in page  # relative, so it works through ingress
    status, image = call(api, "GET", "header.jpg")
    assert status == 200 and image.startswith(b"\xff\xd8")


def test_ha_dashboards_leave_out_admin_only(monkeypatch):
    from casa_mia.ha import HA

    listed = [
        {"url_path": "guest-dashboards", "title": "Guests", "require_admin": False},
        {"url_path": "plant", "title": "Plant", "require_admin": True},
    ]
    configs = {
        None: {"views": [{"path": "home", "title": "Home"}]},
        "guest-dashboards": {"views": [{"path": "abc", "title": "Suite 1"}]},
    }

    def call(*commands):
        c = commands[0]
        return (
            [listed]
            if c["type"] == "lovelace/dashboards/list"
            else [configs[c["url_path"]]]
        )

    ha = HA("ws://x", "t")
    monkeypatch.setattr(ha, "call", call)
    assert [d["path"] for d in ha.dashboards()] == [
        "/lovelace/home",
        "/guest-dashboards/abc",
    ]
