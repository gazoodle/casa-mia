"""Guest login's sign-in log: its own store, pruned by age and count, enriched with the
device and person behind an address, and fed by every scan, sign-in and refusal."""

import json
from datetime import datetime, timedelta, timezone

from casa_mia.modules.guest_login import Endpoint, GuestLogin
from casa_mia.modules.guest_login.audit import (
    Audit,
    clean_client,
    device_of,
    states_lookup,
)
from test_guest_api import GUEST, call
from test_guest_login import get
from test_guest_tighten import post_json

IPHONE = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
)


def test_records_survive_a_restart_and_are_pruned(tmp_path):
    path = tmp_path / "audit.jsonl"
    audit = Audit(path, keep_days=30, keep_max=3)
    for n in range(5):
        audit.record({"event": "scan", "ok": None, "ip": f"192.0.2.{n}"})
    audit.flush()
    again = Audit(path, keep_days=30, keep_max=3)  # a restart
    assert [r["ip"] for r in again.records()["records"]] == [
        "192.0.2.4",
        "192.0.2.3",
        "192.0.2.2",
    ]
    old = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    path.write_text(
        json.dumps({"time": old, "event": "scan"})
        + "\n"
        + "not json\n"  # a line cut short by a crash
        + path.read_text()
    )
    assert Audit(path, keep_days=30, keep_max=10).records()["total"] == 3
    assert len(path.read_text().splitlines()) == 3  # pruned on disk too


def test_filters_and_csv(tmp_path):
    audit = Audit(tmp_path / "a.jsonl")
    audit.record({"event": "sign-in", "ok": True, "endpoint": "s1", "ip": "x"})
    audit.record({"event": "sign-in", "ok": False, "endpoint": "s2", "reason": "r"})
    audit.record({"event": "scan", "ok": None, "endpoint": "s1"})
    audit.flush()
    assert audit.records()["total"] == 3
    assert [r["endpoint"] for r in audit.records("ok")["records"]] == ["s1"]
    assert [r["reason"] for r in audit.records("refused")["records"]] == ["r"]
    assert audit.records(endpoint="s1")["total"] == 2
    csv = audit.csv().decode().splitlines()
    assert csv[0].startswith("time,event,ok") and len(csv) == 4


def test_the_person_behind_an_address():
    states = [
        {
            "entity_id": "device_tracker.ann_phone",
            "attributes": {
                "friendly_name": "Ann's phone",
                "ip": "192.0.2.9",
                "mac": "m",
            },
        },
        {
            "entity_id": "person.ann",
            "attributes": {
                "friendly_name": "Ann",
                "device_trackers": ["device_tracker.ann_phone"],
            },
        },
    ]
    calls = []
    lookup = states_lookup(lambda: calls.append(1) or states)
    assert lookup("192.0.2.9") == {
        "tracker": "device_tracker.ann_phone",
        "tracker_name": "Ann's phone",
        "mac": "m",
        "person": "Ann",
    }
    assert lookup("192.0.2.10") is None
    assert len(calls) == 1  # HA's states are reused for a minute


def test_device_and_client_facts():
    assert device_of(IPHONE) == "iPhone, Safari"
    assert device_of("curl/8") == "unknown"
    assert clean_client({"tz": "Europe/London", "screen": 3, "evil": "x" * 9}) == {
        "tz": "Europe/London",
        "screen": 3,
    }
    assert clean_client("nope") == {}


def test_every_scan_and_sign_in_is_recorded(tmp_path, login_server):
    audit = Audit(tmp_path / "a.jsonl", lookup=lambda ip: {"person": "Ann"})
    gl = GuestLogin(
        [Endpoint("s", "Suite", "/g", slug="suite-slug-123", pin="2468")],
        {"house-guest": ("guest", 'p"w')},
        port=0,
        internal_url=login_server,
    )
    gl.on_audit = audit.record
    gl.start()
    try:
        base = f"http://127.0.0.1:{gl.port}"
        get(f"{base}/e/suite-slug-123")  # closed
        get(f"{base}/e/a-guessed-secret")  # unknown
        gl.control("s/enable")
        get(f"{base}/e/suite-slug-123")
        post_json(f"{base}/e/suite-slug-123/go", {"passcode": "1111"})
        post_json(
            f"{base}/e/suite-slug-123/go",
            {"passcode": "2468", "client": {"tz": "Europe/London"}},
        )
        audit.flush()
    finally:
        gl.stop()
    rows = list(reversed(audit.records()["records"]))
    assert [(r["event"], r["ok"], r["reason"]) for r in rows] == [
        ("refused", False, "endpoint closed"),
        ("refused", False, "unknown secret address"),
        ("scan", None, ""),
        ("sign-in", False, "bad passcode"),
        ("sign-in", True, ""),
    ]
    done = rows[-1]
    assert done["person"] == "Ann" and done["client"] == {"tz": "Europe/London"}
    assert done["passcode"] is True and done["via"] == "secret address"
    assert done["login"] == "house-guest" and done["ip"] == "127.0.0.1"
    stored = (tmp_path / "a.jsonl").read_text()
    for secret in ("suite-slug-123", "a-guessed-secret", "2468", "1111"):
        assert secret not in stored


def test_the_api_reads_the_log_and_sets_its_limits(api):
    assert call(api, "POST", "logins", GUEST)[0] == 201
    api.audit.record({"event": "scan", "ok": None})
    status, page = call(api, "GET", "audit")
    assert status == 200 and page["total"] == 1 and page["keep_days"] == 90
    status, view = call(api, "PUT", "settings", {"audit": {"days": 7, "max": 5}})
    assert status == 200 and api.audit.keep_max == 100  # at least 100
    assert api.audit.keep_days == 7
    assert call(api, "GET", "audit/audit.csv")[1].startswith(b"time,")
    assert call(api, "PUT", "settings", {"audit": {"days": "x"}})[0] == 400
