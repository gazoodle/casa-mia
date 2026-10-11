"""Sensor Watch's admin API in the app, against a stand-in Home Assistant."""

import threading
from pathlib import Path

import pytest

from casa_mia.modules.sensor_watch import api as watch_api
from casa_mia.modules.sensor_watch import suggest
from casa_mia.modules.sensor_watch.common import clean
from sensor_watch_fakes import (
    ENTITIES,
    SALT,
    STATES,
    FakeHA,
    NoHistoryHA,
    _state,
    call,
    make,
)


@pytest.fixture
def watch(tmp_path):
    return make(tmp_path / "sensor-watch.json", FakeHA(STATES, ENTITIES))


def test_candidates_and_their_filters(watch):
    status, got = call(watch, "GET", "candidates")
    ids = [s["entity_id"] for s in got["sensors"]]
    assert status == 200 and got["total"] == 9  # any entity, not Sensor Watch's own
    assert "sensor.status" not in ids and "light.lamp" in ids
    text = next(s for s in got["sensors"] if s["entity_id"] == "sensor.weather_text")
    assert text["kind"] == "state"  # text sensors: exact states
    salt = next(s for s in got["sensors"] if s["entity_id"] == "sensor.salt")
    assert (
        salt["area"] == "Kitchen" and salt["labels"] == ["water"] and salt["statistics"]
    )
    assert got["options"]["areas"] == [{"id": "kitchen", "name": "Kitchen"}]
    assert got["options"]["labels"] == [{"id": "water", "name": "Water"}]
    for query, expect in [
        ({"q": ["SALT"]}, ["sensor.salt"]),
        ({"area": ["kitchen"]}, ["sensor.salt"]),
        ({"label": ["water"]}, ["sensor.salt"]),
        ({"kind": ["binary"]}, ["light.lamp", "binary_sensor.leak"]),  # Lamp, Leak
    ]:
        assert [
            s["entity_id"]
            for s in call(watch, "GET", "candidates", query)[1]["sensors"]
        ] == expect


def test_save_view_delete_and_tell_the_integration(tmp_path):
    told = threading.Event()
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES), on_change=told.set)
    status, view = call(watch, "PUT", "sensor.salt", body=SALT)
    assert status == 200 and view["records"][0]["label"] == "Salt"
    assert told.wait(2)
    assert watch.for_integration()["records"][0]["entity_id"] == "sensor.salt"
    # /health stays small at any size: a revision the integration fetches the records by
    assert "records" not in watch.health()
    assert watch.health()["revision"] == watch.for_integration()["revision"]
    before = watch.health()["revision"]
    again = make(tmp_path / "sw.json", None)
    assert list(again.records) == ["sensor.salt"]
    assert call(watch, "PUT", "sensor.salt", body=SALT | {"bands": []})[0] == 400
    assert call(watch, "DELETE", "sensor.salt")[1]["records"] == []
    assert watch.health()["revision"] != before
    assert call(watch, "DELETE", "sensor.salt")[0] == 404


def test_suggest_one_sensor(watch):
    status, got = call(
        watch, "GET", "suggest", {"entity": ["sensor.salt"], "days": ["30"]}
    )
    assert status == 200 and got["source"] == "statistics"
    assert got["record"]["kind"] == "numeric" and got["suggestion"]["count"] == 3
    clean("sensor.salt", got["record"])  # the proposal saves as it is
    _, leak = call(watch, "GET", "suggest", {"entity": ["binary_sensor.leak"]})
    assert leak["source"] == "history" and leak["record"]["nominal"] == "off"
    assert call(watch, "GET", "suggest", {"entity": ["light.nowhere"]})[0] == 400
    assert (
        call(watch, "GET", "suggest", {"entity": ["sensor.salt"], "days": ["0"]})[0]
        == 400
    )


def test_the_whole_house_scans_in_rounds(watch, monkeypatch):
    monkeypatch.setattr(watch_api, "MAX_SCAN", 3)
    call(watch, "PUT", "sensor.salt", body=SALT)  # already watched: not offered
    _, first = call(watch, "POST", "scan", body={})
    names = [f["sensor"]["entity_id"] for f in first["found"]]
    assert first["matched"] == 7 and len(names) == 3 and first["remaining"] == 4
    _, second = call(watch, "POST", "scan", body={"start": first["next"]})
    _, third = call(watch, "POST", "scan", body={"start": second["next"]})
    more = [f["sensor"]["entity_id"] for f in second["found"] + third["found"]]
    assert (
        len(set(names + more)) == 7 and third["next"] is None
    )  # 3 + 3 + 1, none twice
    assert "sensor.salt" not in names + more
    status, view = call(
        watch,
        "POST",
        "accept",
        body={
            "records": [
                f["record"] | {"entity_id": f["sensor"]["entity_id"]}
                for f in first["found"]
            ]
        },
    )
    assert status == 200 and len(view["records"]) == 4


def test_levels_come_from_the_integrations_service(tmp_path):
    rows = [{"entity_id": "sensor.salt", "level": "task", "value": "20"}]
    watch = make(
        tmp_path / "sw.json",
        FakeHA(STATES, ENTITIES, {"worst": "task", "sensors": rows}),
    )
    assert call(watch, "GET", "levels")[1] == {
        "levels": {"sensor.salt": rows[0]},
        "error": None,
    }
    absent = make(tmp_path / "sw2.json", FakeHA(STATES, ENTITIES))
    assert "Sensor Watch integration" in call(absent, "GET", "levels")[1]["error"]


def test_without_history_the_editor_still_gets_a_record_and_scans_go_on(tmp_path):
    watch = make(tmp_path / "sw.json", NoHistoryHA(STATES, ENTITIES))
    status, leak = call(watch, "GET", "suggest", {"entity": ["binary_sensor.leak"]})
    assert status == 200 and leak["suggestion"] is None
    assert leak["record"]["kind"] == "binary" and "Unknown command" in leak["problem"]
    clean("binary_sensor.leak", leak["record"])  # saves as it is
    _, salt = call(watch, "GET", "suggest", {"entity": ["sensor.salt"]})
    assert (
        salt["source"] == "statistics" and salt["problem"] is None
    )  # statistics still work
    status, scan = call(watch, "POST", "scan", body={})
    assert status == 200 and "Unknown command" in scan["problem"]
    assert any(f["sensor"]["entity_id"] == "sensor.salt" for f in scan["found"])


def test_check_shouts_when_recorder_or_history_is_not_running(tmp_path):
    ha = FakeHA(STATES, ENTITIES)
    watch = make(tmp_path / "sw.json", ha)
    assert call(watch, "GET", "check")[1] == {"missing": [], "error": None}
    ha.components = ["sensor"]
    assert call(watch, "GET", "check")[1]["missing"] == ["Recorder", "History"]


@pytest.mark.parametrize("name", ["Tank - Top", "Top of tank", "Topup Tank"])
def test_the_search_matches_every_word_in_any_order(name):
    c = {
        "name": name,
        "entity_id": "sensor.x",
        "area_id": None,
        "labels": [],
        "platform": "",
        "device_class": "",
        "kind": "numeric",
    }
    assert watch_api.matches(c, {"q": "tank top"})
    assert not watch_api.matches(c, {"q": "tank bottom"})


def test_states_suggestion_and_a_number_watched_as_exact_states(watch):
    s = suggest.states({"0": 900.0, "3": 100.0, "unavailable": 5000.0})
    assert s is not None and s["states"] == ["0"] and s["share"] == pytest.approx(0.9)
    status, got = call(
        watch, "GET", "suggest", {"entity": ["sensor.salt"], "kind": ["state"]}
    )
    assert (
        status == 200
        and got["source"] == "history"
        and got["record"]["kind"] == "state"
    )
    assert (
        call(
            watch,
            "GET",
            "suggest",
            {"entity": ["binary_sensor.leak"], "kind": ["numeric"]},
        )[0]
        == 400
    )


def test_overall_health_for_the_home_tile(tmp_path):
    from casa_mia.modules.sensor_watch.status import MISSING, summarise

    rows = [
        {
            "entity_id": "homeassistant.recorder",
            "name": "Recorder",
            "level": "critical",
            "message": "not running",
            "value": "x",
        },
        {
            "entity_id": "sensor.salt",
            "name": "Salt",
            "level": "task",
            "message": "Top up the salt",
            "value": "20",
        },
        {
            "entity_id": "sensor.ph",
            "name": "Ph",
            "level": "task",
            "message": None,
            "value": "9",
        },
    ]
    assert summarise({"worst": "critical", "sensors": rows}) == {
        "health": "critical",
        "counts": {"critical": 1, "task": 2},
        "worst": "Recorder: not running",
    }
    assert summarise({"worst": "nominal", "sensors": []}) == {
        "health": "nominal",
        "counts": {},
        "worst": None,
    }
    watch = make(
        tmp_path / "sw.json",
        FakeHA(STATES, ENTITIES, {"worst": "task", "sensors": rows[1:]}),
    )
    watch.status.poll()
    assert (
        watch.health()["health"] == "task"
        and watch.health()["worst"] == "Salt: Top up the salt"
    )
    absent = make(tmp_path / "sw2.json", FakeHA(STATES, ENTITIES))
    absent.status.poll()
    assert absent.health()["problem"] == MISSING and absent.health()["health"] is None


def test_the_device_filter_narrows_with_the_others():
    ha = FakeHA(STATES, ENTITIES)
    watch = make(Path("/nonexistent/sw.json"), ha)
    _, got = call(watch, "GET", "candidates")
    assert got["options"]["devices"] == [{"id": "dev1", "name": "Softener"}]
    _, on_device = call(watch, "GET", "candidates", {"device": ["dev1"]})
    assert [s["entity_id"] for s in on_device["sensors"]] == ["sensor.salt"]
    _, by_name = call(
        watch, "GET", "candidates", {"q": ["softener"]}
    )  # the device's name
    assert [s["entity_id"] for s in by_name["sensors"]] == ["sensor.salt"]
    _, binary = call(watch, "GET", "candidates", {"kind": ["binary"]})
    assert binary["options"]["devices"] == []  # no binary sensor on a device


def test_settings_for_home_assistants_own_health_reach_the_integration(tmp_path):
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    before = watch.health()["revision"]
    status, view = call(
        watch,
        "POST",
        "system/ignore",
        body={"entry_id": "abc123", "name": "Barn blinds (acme_hub)"},
    )
    assert status == 200 and view["system"]["ignore"] == {
        "abc123": "Barn blinds (acme_hub)"
    }
    assert watch.for_integration()["system"]["ignore"] == ["abc123"]
    assert watch.health()["revision"] != before  # so the integration fetches it
    assert (
        call(watch, "PUT", "system", body={"integrations": False})[1]["system"][
            "integrations"
        ]
        is False
    )
    assert call(watch, "PUT", "system", body={"core": "yes"})[0] == 400
    assert call(watch, "POST", "system/ignore", body={"entry_id": "../x"})[0] == 400
    again = make(tmp_path / "sw.json", None)  # kept with the records
    assert (
        again.system["ignore"] == {"abc123": "Barn blinds (acme_hub)"}
        and again.system["integrations"] is False
    )
    assert call(watch, "DELETE", "system/ignore/abc123")[1]["system"]["ignore"] == {}
    assert call(watch, "DELETE", "system/ignore/abc123")[0] == 404


def test_a_scan_takes_covers_by_what_they_are_without_history(tmp_path):
    states = STATES + [_state("cover.landing_window", "open", device_class="window")]
    watch = make(tmp_path / "sw.json", NoHistoryHA(states, ENTITIES))
    _, got = call(watch, "POST", "scan", body={"kind": "state"})
    window = next(
        f for f in got["found"] if f["sensor"]["entity_id"] == "cover.landing_window"
    )
    assert window["source"] == "default" and window["record"]["states"] == ["closed"]


def test_the_list_carries_what_the_page_filters_by(watch):
    call(watch, "PUT", "sensor.salt", body=SALT)
    _, view = call(watch, "GET", "")
    meta = view["records"][0]["meta"]
    assert (
        meta["area"] == "Kitchen"
        and meta["device"] == "Softener"
        and meta["platform"] == "esphome"
    )
    assert meta["labels"] == ["water"] and view["labels"] == {"water": "Water"}


def test_stop_watching_many_at_once(watch):
    for eid in ("sensor.salt", "sensor.temp_00", "sensor.temp_01"):
        call(watch, "PUT", eid, body=SALT)
    status, view = call(
        watch,
        "POST",
        "forget",
        body={"entity_ids": ["sensor.temp_00", "sensor.temp_01", "sensor.nope"]},
    )
    assert status == 200 and [r["entity_id"] for r in view["records"]] == [
        "sensor.salt"
    ]
    assert call(watch, "POST", "forget", body={"entity_ids": "sensor.salt"})[0] == 400


def test_any_entity_can_be_watched_but_a_scan_keeps_to_the_usual_domains(tmp_path):
    states = STATES + [
        _state("input_number.spa_ph", "7.4"),
        _state("switch.pump", "on"),
        _state("select.mode", "eco"),
    ]
    watch = make(tmp_path / "sw.json", FakeHA(states, ENTITIES))
    _, got = call(watch, "GET", "candidates", {"q": ["spa ph"]})
    assert [(s["entity_id"], s["kind"], s["domain"]) for s in got["sensors"]] == [
        ("input_number.spa_ph", "numeric", "input_number")
    ]
    kinds = {
        s["entity_id"]: s["kind"]
        for s in call(watch, "GET", "candidates")[1]["sensors"]
    }
    assert kinds["switch.pump"] == "binary" and kinds["select.mode"] == "state"
    assert "input_number" in got["options"]["domains"]
    _, usual = call(watch, "POST", "scan", body={})
    assert not any(
        f["sensor"]["domain"] in ("switch", "light", "input_number", "select")
        for f in usual["found"]
    )
    _, numbers = call(watch, "POST", "scan", body={"domain": "input_number"})
    assert (
        numbers["matched"] == 1
    )  # (the stand-in has no numeric history to suggest from)
