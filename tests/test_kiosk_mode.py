import json

import pytest

from casa_mia.ha import HAError
from casa_mia.modules.kiosk_mode import (
    BadRequest,
    KioskMode,
    merge,
    parse_yaml,
    split,
    summary,
)


def test_split_and_merge_keep_everything():
    # Shaped like kiosk-mode's README: roles, named users, mobile settings and a template.
    block = {
        "hide_header": True,
        "hide_sidebar": "{{ is_state('input_boolean.hide_sidebar', 'on') }}",
        "non_admin_settings": {"kiosk": True, "hide_search": True},
        "admin_settings": {"hide_header": False},
        "user_settings": [
            {
                "users": ["Ann", "Kitchen tablet"],
                "hide_sidebar": True,
                "custom_thing": 3,
            },
            {"users": "{{ user_name }}", "kiosk": True},
        ],
        "mobile_settings": {"hide_header": True, "custom_width": 768},
    }
    ui, extras = split(block)
    assert ui["everyone"] == ["hide_header"]
    assert ui["non_admin_settings"] == [
        "hide_header",
        "hide_search",
        "hide_sidebar",
    ]  # kiosk: its halves
    assert ui["admin_settings"] == []  # off is the default: dropped
    assert ui["users"] == [{"users": ["Ann", "Kitchen tablet"], "on": ["hide_sidebar"]}]
    assert extras == {
        "hide_sidebar": "{{ is_state('input_boolean.hide_sidebar', 'on') }}",
        "mobile_settings": {"hide_header": True, "custom_width": 768},
        "user_settings": [
            {"users": ["Ann", "Kitchen tablet"], "custom_thing": 3},
            {"users": "{{ user_name }}", "kiosk": True},
        ],
    }
    back = merge(ui, extras)
    assert back["hide_header"] is True
    assert back["hide_sidebar"].startswith("{{")  # the template wins over nothing
    assert back["non_admin_settings"] == {
        "hide_header": True,
        "hide_search": True,
        "hide_sidebar": True,
    }
    assert "admin_settings" not in back
    assert back["user_settings"] == [
        {
            "users": ["Ann", "Kitchen tablet"],
            "hide_sidebar": True,
            "custom_thing": 3,
        },  # one entry again
        {"users": "{{ user_name }}", "kiosk": True},
    ]
    assert back["mobile_settings"] == {"hide_header": True, "custom_width": 768}
    assert split(back) == (ui, extras)  # stable


def test_parse_yaml_takes_readme_examples():
    assert parse_yaml("kiosk_mode:\n  mobile_settings:\n    hide_header: true\n") == {
        "mobile_settings": {"hide_header": True}
    }
    assert parse_yaml("mobile_settings:\n  custom_width: 768\n") == {
        "mobile_settings": {"custom_width": 768}
    }
    assert parse_yaml("") == {}
    assert parse_yaml("kiosk_mode:\n") == {}
    with pytest.raises(BadRequest, match="line 2"):
        parse_yaml("hide_header: true\n  bad: [\n")
    with pytest.raises(BadRequest, match="Expected options"):
        parse_yaml("- hide_header\n")


def test_summary():
    ui = {
        "everyone": [],
        "non_admin_settings": ["hide_header", "hide_sidebar", "hide_search"],
        "admin_settings": [],
        "users": [{"users": ["Ann"], "on": ["hide_sidebar"]}],
    }
    assert summary(ui) == "Non-admins: header and sidebar, 1 more; Ann: sidebar"
    assert summary({"everyone": [], "users": []}) == "Nothing hidden yet"


class FakeHA:
    """Dashboards in memory: the default one (taken over), a storage one with kiosk_mode,
    a YAML one and one Home Assistant makes."""

    def __init__(self, installed=True):
        self.installed = installed
        self.configs = {
            None: {"views": [{"title": "Home"}]},
            "tablet": {
                "kiosk_mode": {"non_admin_settings": {"hide_header": True}},
                "views": [],
            },
            "yamlboard": {"views": []},
            "energy": {"strategy": {"type": "energy"}},
        }
        self.saved = []

    def call(self, *commands):
        out = []
        for c in commands:
            if c["type"] == "lovelace/dashboards/list":
                out.append(
                    [
                        {"url_path": "tablet", "title": "Tablet", "mode": "storage"},
                        {"url_path": "yamlboard", "title": "YAML", "mode": "yaml"},
                        {"url_path": "energy", "title": "Energy", "mode": "storage"},
                    ]
                )
            elif c["type"] == "lovelace/config":
                out.append(json.loads(json.dumps(self.configs[c["url_path"]])))
            elif c["type"] == "lovelace/config/save":
                self.configs[c["url_path"]] = c["config"]
                self.saved.append(c["url_path"])
                out.append(None)
            elif c["type"] == "lovelace/resources":
                url = "/hacsfiles/kiosk-mode/kiosk-mode.js?hacstag=1"
                out.append([{"url": url}] if self.installed else [])
            else:
                raise HAError(c["type"])
        return out

    def users(self):
        return [{"name": "Ann", "is_admin": False, "is_active": True}]


def call(km, method, path="", body=None):
    status, _, data = km.handle(
        method, path, {}, json.dumps(body).encode() if body is not None else b""
    )
    return status, json.loads(data)


def test_api_lists_edits_and_removes():
    ha = FakeHA()
    km = KioskMode(ha)  # type: ignore[arg-type]
    status, view = call(km, "GET")
    assert status == 200 and view["resource"]["url"].startswith("/hacsfiles/kiosk-mode")
    boards = {d["id"]: d for d in view["dashboards"]}
    assert boards["tablet"]["enabled"] and boards["tablet"]["ui"][
        "non_admin_settings"
    ] == ["hide_header"]
    assert boards["-"]["editable"] and not boards["-"]["enabled"]
    assert not boards["yamlboard"]["editable"] and not boards["energy"]["editable"]
    assert km.health() == {
        "state": "running",
        "installed": "/hacsfiles/kiosk-mode/kiosk-mode.js?hacstag=1",
        "dashboards": 1,
        "names": ["Tablet"],
    }

    # Turn it on for the default dashboard: header and sidebar for Ann, plus README YAML.
    ui = {
        "everyone": [],
        "non_admin_settings": [],
        "admin_settings": [],
        "users": [{"users": ["Ann"], "on": ["hide_header", "hide_sidebar"]}],
    }
    status, view = call(
        km,
        "PUT",
        "-",
        {"ui": ui, "yaml": "kiosk_mode:\n  mobile_settings:\n    hide_header: true\n"},
    )
    assert status == 200
    assert ha.configs[None]["kiosk_mode"] == {
        "user_settings": [
            {"users": ["Ann"], "hide_header": True, "hide_sidebar": True}
        ],
        "mobile_settings": {"hide_header": True},
    }
    assert ha.configs[None]["views"] == [{"title": "Home"}]  # the rest untouched

    # Bad YAML is refused, and nothing is saved.
    status, err = call(km, "PUT", "-", {"ui": ui, "yaml": "a: [\n"})
    assert status == 400 and "Not valid YAML" in err["error"] and ha.saved == [None]
    assert call(km, "POST", "check", {"yaml": "a: [\n"})[0] == 400
    assert call(km, "POST", "check", {"yaml": "a: 1\n"}) == (200, {"ok": True})
    # Unknown options from the page are refused.
    assert call(km, "PUT", "-", {"ui": {"everyone": ["rm_rf"]}, "yaml": ""})[0] == 400

    # YAML and generated dashboards are not saved.
    assert call(km, "PUT", "yamlboard", {"ui": ui, "yaml": ""})[0] == 400
    assert call(km, "PUT", "energy", {"ui": ui, "yaml": ""})[0] == 400

    status, view = call(km, "DELETE", "tablet")
    assert status == 200 and "kiosk_mode" not in ha.configs["tablet"]
    assert km.health()["dashboards"] == 1  # the default one now


def test_without_kiosk_mode_installed_or_ha():
    km = KioskMode(FakeHA(installed=False))  # type: ignore[arg-type]
    call(km, "GET")
    assert km.health()["state"] == "unconfigured"
    assert (
        call(KioskMode(None), "GET")[1]["error"] == "Home Assistant is not reachable."
    )
