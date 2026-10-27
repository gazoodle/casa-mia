"""Sensor Watch's admin API in the app, against a stand-in Home Assistant."""

from pathlib import Path

import pytest

from casa_mia.modules.sensor_watch import scans as watch_scans
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
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    status, view = call(watch, "PUT", "sensor.salt", body=SALT)
    assert status == 200 and view["records"][0]["label"] == "Salt"
    # Pushed to the integration (live.py, once connected): the record changed.
    assert watch.live and watch.live._pending == {"sensor.salt"}
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


def test_its_own_entities_are_refused_however_they_come(tmp_path):
    """Watching its own status would judge itself, each change feeding the next. The page
    never offers them; a save by hand or a suggestion accepted could still name one."""
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    status, got = call(watch, "PUT", "sensor.status", body=SALT)
    assert status == 400 and "Sensor Watch's own" in got["error"]
    records = [
        SALT | {"entity_id": "sensor.salt"},
        SALT | {"entity_id": "sensor.status"},
    ]
    assert call(watch, "POST", "accept", body={"records": records})[0] == 400
    assert watch.records == {}  # nothing saved, not even the good one
    # Home Assistant out of reach: saved unchecked (and logged), as before.
    assert (
        call(make(tmp_path / "sw2.json", None), "PUT", "sensor.status", body=SALT)[0]
        == 200
    )


def test_suggest_one_sensor(watch):
    status, got = call(
        watch, "GET", "suggest", {"entity": ["sensor.salt"], "days": ["30"]}
    )
    assert status == 200 and got["source"] == "statistics"
    assert got["record"]["kind"] == "numeric" and got["suggestion"]["count"] == 3
    clean("sensor.salt", got["record"])  # the proposal saves as it is
    _, leak = call(watch, "GET", "suggest", {"entity": ["binary_sensor.leak"]})
    assert leak["source"] == "history" and leak["record"]["off"]["level"] == "nominal"
    assert call(watch, "GET", "suggest", {"entity": ["light.nowhere"]})[0] == 400
    assert (
        call(watch, "GET", "suggest", {"entity": ["sensor.salt"], "days": ["0"]})[0]
        == 400
    )


def test_the_whole_house_scans_in_rounds(watch, monkeypatch):
    monkeypatch.setattr(watch_scans, "MAX_SCAN", 3)
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
    live = watch.live
    assert live is not None
    live._refresh()  # as on connecting, or when the integration's entities write
    got = call(watch, "GET", "levels")[1]
    assert got["levels"] == {"sensor.salt": rows[0]} and got["error"] is None
    # A value pushed by subscribe_entities moves the revision the page waits on.
    live._own = {"sensor.status": "sensor_watch_status"}
    live._heard({"c": {"sensor.salt": {"+": {"s": "19"}}}})
    now = live.wait(got["rev"], 0.01)
    assert now["rev"] != got["rev"] and now["levels"]["sensor.salt"]["value"] == "19"
    assert (
        live.wait(now["rev"], 0.01)["rev"] == now["rev"]
    )  # nothing new: held, then as is
    # The integration's status, as pushed: the Home tile's health.
    live._heard({"a": {"sensor.status": {"s": "task", "a": {}}}})
    assert watch.health()["health"] == "task"
    # A change of level, as the integration fires it: that row at once, no asking.
    before = live.snapshot()["rev"]
    data = {
        "entity_id": "sensor.salt",
        "level": "critical",
        "value": "5",
        "message": "Out",
    }
    live._moved({"data": data, "time_fired": "2026-10-11T12:00:00+00:00"})
    row = live.wait(before, 0.01)["levels"]["sensor.salt"]
    assert (row["level"], row["message"], row["since"]) == (
        "critical",
        "Out",
        "2026-10-11T12:00:00+00:00",
    )
    absent = make(tmp_path / "sw2.json", FakeHA(STATES, ENTITIES))
    assert absent.live is not None
    absent.live._refresh()
    assert "Restart Home Assistant" in call(absent, "GET", "levels")[1]["error"]


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
    assert watch_scans.matches(c, {"q": "tank top"})
    assert not watch_scans.matches(c, {"q": "tank bottom"})


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
    # From the integration's own entities as pushed (their translation keys): the
    # status's level and the first of its culprits (longest standing), the counts.
    from casa_mia.modules.sensor_watch.status import MISSING, summarise

    culprits = [
        {"entity_id": "homeassistant.recorder", "name": "Recorder", "value": "x"},
        {"entity_id": "sensor.salt", "name": "Salt", "message": "not running"},
    ]
    own = {
        "sensor_watch_status": {"s": "critical", "a": {"critical_list": culprits}},
        "sensor_watch_critical_count": {"s": "1"},
        "sensor_watch_task_count": {"s": "2"},
        "sensor_watch_error_count": {"s": "0"},
        "sensor_watch_warning_count": {"s": "unavailable"},
    }
    assert summarise(own) == {
        "health": "critical",
        "counts": {"critical": 1, "task": 2},
        "worst": "Recorder: x",
        "problem": None,
    }
    assert summarise({"sensor_watch_status": {"s": "nominal", "a": {}}}) == {
        "health": "nominal",
        "counts": {},
        "worst": None,
        "problem": None,
    }
    # No status entity: Sensor Watch isn't running in the integration.
    assert summarise({})["problem"] == MISSING
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    watch.status.heard(own)
    assert watch.health()["health"] == "critical"
    assert watch.health()["worst"] == "Recorder: x"
    watch.status.poll()  # no list service: says why
    assert watch.health()["problem"] == MISSING and watch.health()["health"] is None


def test_floor_manufacturer_model_and_category_filter():
    watch = make(Path("/nonexistent/sw.json"), FakeHA(STATES, ENTITIES))
    _, got = call(watch, "GET", "candidates")
    o = got["options"]
    assert o["floors"] == [{"id": "ground", "name": "Ground floor"}]
    assert (o["manufacturers"], o["models"]) == (["Acme"], ["Soft 2"])
    assert "diagnostic" in o["categories"] and "primary" in o["categories"]
    for f in ({"floor": ["ground"]}, {"manufacturer": ["Acme"]}, {"model": ["Soft 2"]}):
        _, on = call(watch, "GET", "candidates", f)
        assert [s["entity_id"] for s in on["sensors"]] == ["sensor.salt"]
    _, diag = call(watch, "GET", "candidates", {"category": ["diagnostic"]})
    assert [s["entity_id"] for s in diag["sensors"]] == ["sensor.weather_text"]
    _, primary = call(watch, "GET", "candidates", {"category": ["primary"]})
    assert "sensor.weather_text" not in [s["entity_id"] for s in primary["sensors"]]


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


class ClimateHA(FakeHA):
    """A thermostat whose room sat at 20 to 22 degrees, read with its attributes."""

    def call(self, *commands):
        out = []
        for c in commands:
            if c["type"] == "history/history_during_period":
                assert c["no_attributes"] is False
                rows = [
                    {"s": "heat", "a": {"current_temperature": t}, "lu": n * 3600.0}
                    for n, t in enumerate([20, 21, 22, 21, 20.5, 21.5] * 4)
                ]
                rows.append({"s": "unavailable", "lu": 99999.0})
                out.append({i: rows for i in c["entity_ids"]})
            else:
                out.extend(super().call(c))
        return out


def test_an_attribute_is_watched_by_its_own_history(tmp_path):
    climate = _state(
        "climate.lounge",
        "heat",
        current_temperature=21,
        hvac_action="heating",
        friendly_name="Lounge",
        min_temp=7,
    )
    watch = make(tmp_path / "sw.json", ClimateHA([*STATES, climate], ENTITIES))
    _, got = call(watch, "GET", "candidates", {"q": ["lounge"]})
    (c,) = got["sensors"]
    assert c["kind"] == "state"  # its state is a mode
    assert c["attributes"] == {"current_temperature": "21", "hvac_action": "heating"}
    _, s = call(
        watch,
        "GET",
        "suggest",
        {"entity": ["climate.lounge"], "attribute": ["current_temperature"]},
    )
    assert s["sensor"]["kind"] == "numeric" and s["sensor"]["state"] == "21"
    assert s["record"]["attribute"] == "current_temperature"
    nominal = [b for b in s["record"]["bands"] if b["level"] == "nominal"]
    assert nominal and nominal[0]["from"] <= 20 and nominal[0]["to"] >= 22
    status, _ = call(watch, "PUT", "climate.lounge", body=s["record"])
    assert status == 200
    _, view = call(watch, "GET", "")
    (r,) = [r for r in view["records"] if r["entity_id"] == "climate.lounge"]
    assert r["attribute"] == "current_temperature" and r["meta"]["kind"] == "numeric"
    status, err = call(
        watch,
        "GET",
        "suggest",
        {"entity": ["climate.lounge"], "attribute": ["min_temp"]},
    )
    assert status == 400 and "no attribute" in err["error"]


def test_the_live_feed_takes_the_watched_attribute():
    from casa_mia.modules.sensor_watch.live import _value

    assert _value({"s": "heat", "a": {"current_temperature": 21.5}}, None) == "heat"
    assert (
        _value({"s": "heat", "a": {"current_temperature": 21.5}}, "current_temperature")
        == "21.5"
    )
    assert _value({"a": {"hvac_action": "idle"}}, "current_temperature") is None
    assert _value({"s": "unavailable"}, "current_temperature") == "unavailable"


def test_the_levels_are_asked_again_once_the_integration_takes_the_records(watch):
    assert watch.live and watch.live._due is None
    watch.for_integration()  # its start (after HA's restart), or a change
    assert watch.live._due is not None


def test_a_machine_just_booted_still_reads_the_candidates(monkeypatch):
    # time.monotonic() counts from boot: a minute in, a cache stamped 0 looked fresh
    # (the 2026.10.8 release run failed on a runner booted moments before).
    from casa_mia.modules.sensor_watch import history

    monkeypatch.setattr(history.time, "monotonic", lambda: 5.0)
    watch = make(Path("/nonexistent/sw.json"), FakeHA(STATES, ENTITIES))
    _, got = call(watch, "GET", "candidates")
    assert got["total"] > 0


def test_refresh_state_asks_the_integration_and_the_levels_again(tmp_path):
    ha = FakeHA(STATES, ENTITIES, {})  # its services answer
    watch = make(tmp_path / "sw.json", ha)
    status, _ = call(watch, "POST", "refresh")
    assert status == 200
    asked = [c for c in ha.asked if c["type"] == "call_service"]
    assert (asked[-1]["domain"], asked[-1]["service"]) == (
        "casa_mia",
        "sensor_watch_refresh",
    )
    assert watch.live and watch.live._due is not None  # the levels asked again soon
    absent = make(tmp_path / "sw2.json", FakeHA(STATES, ENTITIES))  # no service yet
    status, err = call(absent, "POST", "refresh")
    assert status == 400 and "restart" in err["error"]
