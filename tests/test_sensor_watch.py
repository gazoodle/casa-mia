import importlib.util
import json
import threading
from pathlib import Path
from typing import Any

import pytest

from casa_mia.ha import HAError
from casa_mia.modules.sensor_watch import LEVELS, SensorWatch, suggest
from casa_mia.modules.sensor_watch import api as watch_api
from casa_mia.modules.sensor_watch.common import BadRequest, clean
from casa_mia.modules.sensor_watch.history import from_history, thin

# Loaded by path: the package __init__ needs Home Assistant, levels.py does not.
FILE = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia_sensor_watch/levels.py"
)
spec = importlib.util.spec_from_file_location("sw_levels", FILE)
assert spec and spec.loader
levels = importlib.util.module_from_spec(spec)
spec.loader.exec_module(levels)

SALT = {
    "kind": "numeric",
    "bands": [
        {"from": None, "to": 10, "level": "critical", "message": "Out of salt"},
        {"from": 10, "to": 25, "level": "task", "message": "Top up the salt"},
        {"from": 25, "to": None, "level": "nominal", "message": ""},
    ],
    "otherwise": "error",
    "unavailable": "error",
}


def test_app_and_integration_agree_on_the_levels():
    assert LEVELS == levels.LEVELS


@pytest.mark.parametrize(
    ("state", "level", "message"),
    [
        ("40", "nominal", None),
        ("25", "nominal", None),  # from is inclusive
        ("24.9", "task", "Top up the salt"),
        ("10", "task", "Top up the salt"),
        ("9", "critical", "Out of salt"),
        ("unavailable", "error", "unavailable"),
        (None, "error", "unavailable"),  # gone from HA altogether
        ("lots", "error", "not a number: lots"),
    ],
)
def test_a_numeric_state_lands_in_its_band(state, level, message):
    assert levels.level_of(SALT, state) == (level, message)


def test_a_value_in_no_band_takes_otherwise_and_unavailable_can_be_ignored():
    gappy = {
        "kind": "numeric",
        "bands": [{"from": 0, "to": 1, "level": "nominal"}],
        "otherwise": "warning",
    }
    assert levels.level_of(gappy, "5") == ("warning", "outside every band")
    assert levels.level_of(gappy | {"unavailable": "ignore"}, "unknown") == (None, None)


def test_binary():
    door = {
        "kind": "binary",
        "nominal": "off",
        "other": "warning",
        "message": "Door open",
    }
    assert levels.level_of(door, "off") == ("nominal", None)
    assert levels.level_of(door, "on") == ("warning", "Door open")


def _now(**levels_by_entity):
    return {
        e: {
            "level": lv,
            "since": f"2026-10-11T0{n}:00:00",
            "name": e,
            "value": "1",
            "message": None,
        }
        for n, (e, lv) in enumerate(levels_by_entity.items())
    }


def test_summary_counts_lists_and_caps():
    now = _now(
        **{f"s{n}": "warning" for n in range(levels.MAX_LISTED + 3)},
        a="nominal",
        b="critical",
    )
    s = levels.summary(now)
    assert s["worst"] == "critical"
    assert s["warning"] == levels.MAX_LISTED + 3
    assert len(s["warning_list"]) == levels.MAX_LISTED
    assert s["warning_list"][0]["entity_id"] == "s0"  # longest standing first
    assert s["watching"] == len(now)
    assert levels.summary({})["worst"] == "nominal"


def test_listing_is_worst_first_and_skips_nominal_unless_asked():
    now = _now(a="warning", b="nominal", c="critical", d="task")
    assert [r["entity_id"] for r in levels.listing(now)] == ["c", "a", "d"]
    assert [r["entity_id"] for r in levels.listing(now, ["nominal"])] == ["b"]


# -- records checked before saving


def test_clean_sorts_bands_and_refuses_overlaps():
    record = clean("sensor.salt", SALT | {"bands": list(reversed(SALT["bands"]))})
    assert [b["from"] for b in record["bands"]] == [None, 10, 25]
    assert record["hold_off"] == 60
    overlap = SALT | {
        "bands": [
            {"from": 0, "to": 10, "level": "nominal"},
            {"from": 5, "to": 20, "level": "task"},
        ]
    }
    with pytest.raises(BadRequest, match="overlap"):
        clean("sensor.salt", overlap)
    with pytest.raises(BadRequest, match="below"):
        clean("sensor.salt", SALT | {"bands": [{"from": 5, "to": 5, "level": "task"}]})
    with pytest.raises(BadRequest, match="level"):
        clean("sensor.salt", SALT | {"bands": [{"from": 5, "to": 6, "level": "fine"}]})
    with pytest.raises(BadRequest, match="Hold-off"):
        clean("sensor.salt", SALT | {"hold_off": -1})
    with pytest.raises(BadRequest, match="entity"):
        clean("salt", SALT)


def test_clean_binary():
    record = clean(
        "binary_sensor.door",
        {"kind": "binary", "nominal": "off", "other": "error", "unavailable": "ignore"},
    )
    assert record == {
        "entity_id": "binary_sensor.door",
        "kind": "binary",
        "name": "",
        "hold_off": 60,
        "unavailable": "ignore",
        "nominal": "off",
        "other": "error",
        "message": "",
    }


# -- suggestions


def test_numeric_suggestion_sets_outliers_aside():
    samples = [20 + (n % 7) * 0.5 for n in range(500)] + [95.0]  # 20..23, and one spike
    s = suggest.numeric(samples)
    assert s is not None
    assert s["outliers"] == [95.0] and s["outlier_count"] == 1
    nominal = next(b for b in s["bands"] if b["level"] == "nominal")
    assert nominal["from"] <= 20 and 23 < nominal["to"] < 95
    assert (
        levels.level_of({"kind": "numeric", "bands": s["bands"]}, "23")[0] == "nominal"
    )
    assert levels.level_of({"kind": "numeric", "bands": s["bands"]}, "95")[0] == "error"
    assert suggest.numeric([]) is None


def test_a_flat_sensor_still_gets_a_band_round_it():
    s = suggest.numeric([5.0] * 50)
    assert s is not None
    assert (
        levels.level_of({"kind": "numeric", "bands": s["bands"]}, "5")[0] == "nominal"
    )


def test_binary_suggestion_and_history_durations():
    rows = [
        {"s": "off", "lu": 0.0},
        {"s": "on", "lu": 900.0},
        {"s": "off", "lu": 1000.0},
    ]
    data = from_history(rows, now=2000.0)
    assert data["seconds"] == {"off": 1900.0, "on": 100.0}
    s = suggest.binary(data["seconds"])
    assert s is not None and s["nominal"] == "off" and s["share"] == pytest.approx(0.95)
    assert suggest.binary({}) is None


def test_thin_keeps_the_chart_small():
    points = [[n, float(n)] for n in range(1000)]
    assert len(thin(points)) <= 300
    assert thin(points[:10]) == points[:10]


# -- the admin API, against a stand-in Home Assistant


class FakeHA:
    def __init__(self, states, entities=(), service=None):
        self.states = states
        self.entities = list(entities)
        self.service = service
        self.asked: list[dict] = []

    def call(self, *commands):
        out = []
        for c in commands:
            self.asked.append(c)
            kind = c["type"]
            if kind == "get_states":
                out.append(self.states)
            elif kind == "config/entity_registry/list":
                out.append(self.entities)
            elif kind == "config/device_registry/list":
                out.append([{"id": "dev1", "area_id": "kitchen"}])
            elif kind == "config/area_registry/list":
                out.append([{"area_id": "kitchen", "name": "Kitchen"}])
            elif kind == "config/label_registry/list":
                out.append([{"label_id": "water", "name": "Water"}])
            elif kind == "recorder/statistics_during_period":
                out.append(
                    {
                        i: [{"start": 0, "mean": 20.0, "min": 19.0, "max": 21.0}]
                        for i in c["statistic_ids"]
                    }
                )
            elif kind == "history/history_during_period":
                out.append({i: [{"s": "off", "lu": 0.0}] for i in c["entity_ids"]})
            elif kind == "call_service":
                if self.service is None:
                    raise HAError("call_service: Service not found")
                out.append({"response": self.service})
            else:
                raise AssertionError(kind)
        return out


def _state(eid, state, **attrs):
    return {
        "entity_id": eid,
        "state": state,
        "attributes": {"friendly_name": eid.split(".")[1].title(), **attrs},
    }


STATES = [
    _state("sensor.salt", "40", state_class="measurement", unit_of_measurement="%"),
    _state("sensor.weather_text", "sunny"),  # text: nothing to range
    _state("binary_sensor.leak", "off", device_class="moisture"),
    _state("sensor.status", "nominal"),  # Sensor Watch's own
    _state("light.lamp", "on"),
] + [_state(f"sensor.temp_{n:02}", "21", state_class="measurement") for n in range(5)]
ENTITIES = [
    {
        "entity_id": "sensor.salt",
        "platform": "esphome",
        "device_id": "dev1",
        "labels": ["water"],
    },
    {"entity_id": "sensor.status", "platform": "casa_mia_sensor_watch"},
]


def make(path, ha, **kw) -> SensorWatch:
    ha_: Any = ha  # a stand-in for HA
    return SensorWatch(path, ha_, **kw)


def call(watch, method, path, query=None, body=None):
    status, _, data = watch.handle(
        method,
        path,
        query or {},
        json.dumps(body).encode() if body is not None else b"",
    )
    return status, json.loads(data)


@pytest.fixture
def watch(tmp_path):
    return make(tmp_path / "sensor-watch.json", FakeHA(STATES, ENTITIES))


def test_candidates_and_their_filters(watch):
    status, got = call(watch, "GET", "candidates")
    ids = [s["entity_id"] for s in got["sensors"]]
    assert status == 200 and got["total"] == 7
    assert (
        "sensor.weather_text" not in ids
        and "sensor.status" not in ids
        and "light.lamp" not in ids
    )
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
        ({"kind": ["binary"]}, ["binary_sensor.leak"]),
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
    assert call(watch, "GET", "suggest", {"entity": ["light.lamp"]})[0] == 400
    assert (
        call(watch, "GET", "suggest", {"entity": ["sensor.salt"], "days": ["0"]})[0]
        == 400
    )


def test_the_whole_house_scans_in_rounds(watch, monkeypatch):
    monkeypatch.setattr(watch_api, "MAX_SCAN", 3)
    call(watch, "PUT", "sensor.salt", body=SALT)  # already watched: not offered
    _, first = call(watch, "POST", "scan", body={})
    names = [f["sensor"]["entity_id"] for f in first["found"]]
    assert first["matched"] == 6 and len(names) == 3 and first["remaining"] == 3
    _, second = call(watch, "POST", "scan", body={"start": first["next"]})
    more = [f["sensor"]["entity_id"] for f in second["found"]]
    assert not set(names) & set(more) and second["next"] is None
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
