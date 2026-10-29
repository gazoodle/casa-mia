"""Sensor Watch's records checked before saving, the suggestions from history, and the
defaults by what a sensor is."""

import pytest

from casa_mia.modules.sensor_watch import suggest
from casa_mia.modules.sensor_watch.common import BadRequest, clean
from casa_mia.modules.sensor_watch.history import from_history, thin
from sensor_watch_fakes import ALARM, SALT, _cand, levels


def test_clean_sorts_bands_and_refuses_overlaps():
    record = clean("sensor.salt", SALT | {"bands": list(reversed(SALT["bands"]))})
    assert [b["from"] for b in record["bands"]] == [None, 10, 25]
    assert record["hold_off"] == 60
    overlap = SALT | {
        "bands": [
            {"from": None, "to": 10, "level": "nominal"},
            {"from": 5, "to": None, "level": "task"},
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
    assert clean("sensor.salt", SALT)["unavailable_hold"] == levels.UNAVAILABLE_HOLD
    assert (
        clean("sensor.car", SALT | {"unavailable_hold": 900})["unavailable_hold"] == 900
    )
    with pytest.raises(BadRequest, match="Unavailable for"):
        clean("sensor.salt", SALT | {"unavailable_hold": -1})
    with pytest.raises(BadRequest, match="entity"):
        clean("salt", SALT)
    with pytest.raises(BadRequest, match="number"):
        clean("sensor.salt", SALT | {"bands": [{"from": "7,2", "level": "task"}]})


def _bands(*edges_and_levels):
    """Bands from levels and the edges between them: "error", 10, "nominal", 20, "task"."""
    levels, edges = edges_and_levels[::2], [None, *edges_and_levels[1::2], None]
    return [
        {"from": low, "to": high, "level": level}
        for low, high, level in zip(edges, edges[1:], levels)
    ]


def test_only_a_ladder_out_from_one_nominal_band_is_saved():
    record = clean(
        "sensor.t",
        SALT | {"bands": _bands("error", 10, "nominal", 20, "task", 30, "critical")},
    )
    assert [b["level"] for b in record["bands"]] == [
        "error",
        "nominal",
        "task",
        "critical",
    ]

    refused = {
        "open at both ends": _bands("error", 10, "nominal", 20, "task")[1:],
        "No band covers 20–25": _bands("nominal", 20, "task")[:1]
        + [{"from": 25, "to": None, "level": "task"}],
        "Exactly one band must be nominal": _bands(
            "nominal", 10, "task", 20, "nominal"
        ),
        "worse than the one inside": _bands("nominal", 10, "error", 20, "warning"),
    }
    for reason, bands in refused.items():
        with pytest.raises(BadRequest, match=reason):
            clean("sensor.t", SALT | {"bands": bands})
    with pytest.raises(BadRequest, match="Exactly one band must be nominal"):
        clean("sensor.t", SALT | {"bands": _bands("task")})


def test_messages_may_be_long_names_may_not():
    long = "x" * 255
    band = {"from": None, "to": None, "level": "nominal", "message": long}
    assert clean("sensor.salt", SALT | {"bands": [band]})["bands"][0]["message"] == long
    with pytest.raises(BadRequest, match="255"):
        clean("sensor.salt", SALT | {"bands": [band | {"message": long + "x"}]})
    with pytest.raises(BadRequest, match="80"):
        clean("sensor.salt", SALT | {"name": "x" * 81})


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
        "unavailable_hold": 300,
        "unavailable": "ignore",
        "off": {"level": "nominal", "message": ""},  # the old form, turned into today's
        "on": {"level": "error", "message": ""},
    }
    sides = {"off": {"level": "task", "message": "Idle"}, "on": {"level": "error"}}
    record = clean("binary_sensor.pump", {"kind": "binary", **sides})
    assert record["off"] == {"level": "task", "message": "Idle"}
    assert record["on"] == {"level": "error", "message": ""}
    with pytest.raises(BadRequest, match="When on"):
        clean("binary_sensor.pump", {"kind": "binary", "on": {"level": "fine"}})


def test_binary_records_read_and_send_both_forms():
    from casa_mia.modules.sensor_watch.common import normal, with_legacy

    old = {"kind": "binary", "nominal": "on", "other": "warning", "message": "Down"}
    new = normal(old)
    assert new == {
        "kind": "binary",
        "on": {"level": "nominal", "message": ""},
        "off": {"level": "warning", "message": "Down"},
    }
    sent = with_legacy(new)  # for an integration not restarted yet
    assert (sent["nominal"], sent["other"], sent["message"]) == (
        "on",
        "warning",
        "Down",
    )
    assert levels.level_of(sent, "off") == ("warning", "Down")


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


def test_outliers_are_counted_each_side():
    # A steady supply with a few dips and one spike: the page says how many each side.
    samples = [240.0 + (n % 3) * 0.1 for n in range(600)] + [216.1, 218.0, 225.5, 270.2]
    s = suggest.numeric(samples)
    assert s is not None
    assert s["outlier_count"] == 4 and s["outliers_below"] == 3
    assert (s["min"], s["max"]) == (216.1, 270.2)  # the extremes the page quotes


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


def test_clean_exact_states():
    record = clean("sensor.alarm_number", ALARM | {"states": [" 0 ", "0", ""]})
    assert record["states"] == ["0"] and record["other"] == "error"
    with pytest.raises(BadRequest, match="Nominal states"):
        clean("sensor.alarm_number", ALARM | {"states": []})


def test_defaults_by_what_a_sensor_is():
    from casa_mia.modules.sensor_watch.defaults import default_record

    leak = default_record(_cand("binary_sensor.sink_leak", "moisture"))
    assert leak and leak["kind"] == "binary" and leak["on"]["level"] == "critical"
    online = default_record(_cand("binary_sensor.hub", "connectivity"))
    assert online and online["on"]["level"] == "nominal"  # connected is the good state
    window = default_record(_cand("cover.landing_window", "window"))
    assert window and window["states"] == ["closed"] and window["other"] == "task"
    lock = default_record(_cand("lock.back_door"))
    assert lock and lock["exceptions"][0]["state"] == "jammed"
    update = default_record(_cand("update.core"))
    assert (
        update
        and update["on"]["level"] == "task"
        and update["on"]["message"] == "Update available"
    )
    battery = default_record(_cand("sensor.remote_battery", "battery", "%"))
    assert (
        battery
        and levels.level_of(battery, "12")[0] == "task"
        and levels.level_of(battery, "3")[0] == "warning"
    )
    assert (
        default_record(_cand("sensor.kitchen_temperature", "temperature", "°C")) is None
    )
    for record in (leak, online, window, lock, update, battery):
        clean("x.y", record)  # each saves as it is


def test_what_cannot_wait_has_no_hold_off():
    from casa_mia.modules.sensor_watch.defaults import default_record

    leak = default_record(_cand("binary_sensor.leak", "moisture"))
    door = default_record(_cand("binary_sensor.door", "door"))
    alarm = default_record(_cand("alarm_control_panel.house"))
    assert leak and door and alarm
    assert (leak["hold_off"], door["hold_off"], alarm["hold_off"]) == (0, 60, 0)
    assert levels.level_of(alarm | {"entity_id": "x"}, "triggered")[0] == "critical"
    assert levels.level_of(alarm | {"entity_id": "x"}, "armed_away")[0] == "nominal"
