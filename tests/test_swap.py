import json
import os
from pathlib import Path

import pytest

from casa_mia import settings, swap
from casa_mia.ha import HA, HAError
from casa_mia.swap import api

ROOT = Path(__file__).resolve().parents[1]


def rule(match, replace, mode="exact", **more):
    return {"id": match, "match": match, "replace": replace, "mode": mode, **more}


@pytest.fixture
def path(tmp_path, monkeypatch):
    """swap.json in a temporary folder, in developer mode; the old file beside it."""
    monkeypatch.setattr(swap, "PATH", tmp_path / "swap.json")
    monkeypatch.setattr(swap, "OLD", tmp_path / "old" / "swap.json")
    monkeypatch.setattr(settings, "DEVELOPER", True)
    return tmp_path / "swap.json"


def write(path, mtime=None, **doc):
    path.write_text(json.dumps(doc))
    if mtime is not None:  # a new mtime even within the filesystem's resolution
        os.utime(path, ns=(mtime, mtime))


def test_rules_swap_out_while_on(path):
    assert swap.out("07700 900123") == "07700 900123" and swap.stamp() == ""

    rules = [
        rule("07700 900123", "07700 900456"),
        rule("Jo", "X"),
        rule("oak tree", "barn", "case"),
        rule(r"07700 9(\d{5})", "07700 0$1", "regex"),
        rule("Ann", "Bea", enabled=False),
    ]
    write(path, on=True, rules=rules)
    assert (
        swap.out("Joe, +4407700 900123, cam_Jo_1, OAK TREE, 07700 900789, Ann")
        == "Joe, +4407700 900456, cam_X_1, BARN, 07700 000789, Ann"
    )
    assert swap.stamp() and not swap.original_photo()

    write(path, 2, on=True, rules=[], original_photo=True)
    assert swap.original_photo() and swap.stamp() and swap.out("Jo") == "Jo"

    write(path, 1, on=False, rules=[rule("Jo", "X")], original_photo=True)
    assert swap.out("Jo") == "Jo" and swap.stamp() == "" and not swap.original_photo()


def test_off_out_of_developer_mode(path, monkeypatch):
    write(path, on=True, rules=[rule("Jo", "X")])
    monkeypatch.setattr(settings, "DEVELOPER", False)
    assert swap.out("Jo") == "Jo" and swap.stamp() == ""


def test_the_integration_fetches_the_enabled_rules_while_on(path):
    rules = [rule("Jo", "X"), rule("Ann", "Bea", enabled=False)]
    write(path, 1, on=False, rules=rules)
    assert swap.for_integration() == {"stamp": "", "rules": []}
    write(path, 2, on=True, rules=rules)
    assert swap.for_integration() == {"stamp": swap.stamp(), "rules": rules[:1]}


def test_camera_images(path):
    folder = swap.OLD.parent  # beside the old file, until the Swap page holds them
    (folder / "swap").mkdir(parents=True)
    (folder / "swap" / "yard.jpg").write_bytes(b"jpeg")
    images = {
        "Oak Tree": "swap/yard.jpg",
        "Shed": "swap/none.jpg",
        "Barn": "../x.jpg",
    }
    write(path, on=True, rules=[], camera_images=images)
    # Kept only when the picture is there and inside the folder.
    assert swap.camera_image("Oak Tree") == (folder / "swap" / "yard.jpg").resolve()
    assert swap.camera_image("Shed") is None and swap.camera_image("Barn") is None
    assert swap.stamp()
    # A picture added after the rules were saved is used too.
    (folder / "swap" / "none.jpg").write_bytes(b"jpeg")
    assert swap.camera_image("Shed") == (folder / "swap" / "none.jpg").resolve()


def test_the_old_file_is_converted_once_and_left_alone(path):
    swap.OLD.parent.mkdir()
    old = {"swap": True, "Ann": "Bea", "original_photo": True, "camera_images": {}}
    swap.OLD.write_text(json.dumps(old))
    swap.adopt()
    doc = json.loads(path.read_text())
    assert doc["on"] and doc["original_photo"]
    assert [(r["match"], r["replace"], r["mode"]) for r in doc["rules"]] == [
        ("Ann", "Bea", "exact")
    ]
    assert json.loads(swap.OLD.read_text()) == old
    # Once: the new file wins from then on.
    swap.OLD.write_text(json.dumps({"swap": True, "Cy": "Di"}))
    swap.adopt()
    assert json.loads(path.read_text()) == doc


class FakeHA(HA):
    def __init__(self, fail=False):
        self.calls, self.fail = [], fail

    def call(self, *commands):
        if self.fail:
            raise HAError("cannot talk to Home Assistant: down")
        self.calls += commands
        return [None]


def ask(handler, method, rest="", body=None):
    status, _, data = handler(
        method, rest, {}, json.dumps(body).encode() if body else b""
    )
    return status, json.loads(data)


def test_the_api_saves_whole_rules_and_refuses_a_bad_one(path):
    handle = api.SwapApi(FakeHA()).handle
    assert ask(handle, "GET") == (200, {"on": False, "rules": []})

    status, saved = ask(handle, "PUT", body={"on": True, "rules": [{"match": "Ann"}]})
    assert status == 200 and saved["on"]
    (r,) = saved["rules"]
    assert r["id"] and (r["replace"], r["mode"], r["enabled"]) == ("", "exact", True)
    assert ask(handle, "GET")[1] == saved

    for bad in (
        [{"match": "(", "mode": "regex"}],
        [{"match": "Ann", "mode": "fuzzy"}],
        [{"match": ""}],
        [{"match": "Ann", "replace": 3}],
        ["Ann"],
    ):
        status, answer = ask(handle, "PUT", body={"rules": bad})
        assert status == 400 and answer["error"].startswith("Rule 1"), bad
    assert ask(handle, "GET")[1] == saved  # nothing saved
    assert ask(handle, "PUT", body={"on": "yes"})[0] == 400


def test_a_draft_goes_straight_to_home_assistant(path):
    ha = FakeHA()
    handle = api.SwapApi(ha).handle
    draft = {"match": "Ann", "replace": "B", "mode": "exact"}
    assert ask(handle, "PUT", "draft", {"draft": draft}) == (200, {})
    assert ask(handle, "PUT", "draft", {"draft": None}) == (200, {})
    assert ha.calls == [
        {"type": api.DRAFT, "draft": draft},
        {"type": api.DRAFT, "draft": None},
    ]
    assert not path.exists()  # never saved

    status, answer = ask(
        api.SwapApi(FakeHA(fail=True)).handle, "PUT", "draft", {"draft": draft}
    )
    assert status == 502 and "didn't reach Home Assistant" in answer["error"]


def test_the_api_is_developer_mode_only(path, monkeypatch):
    monkeypatch.setattr(settings, "DEVELOPER", False)
    assert ask(api.SwapApi(FakeHA()).handle, "GET")[0] == 404


def test_the_integration_runs_the_apps_own_engine():
    app = ROOT / "app/src/casa_mia/swap/engine.py"
    copy = ROOT / "integration/custom_components/casa_mia/swap_rules/engine.py"
    assert copy.read_text() == app.read_text(), "copy the app's engine.py over"
