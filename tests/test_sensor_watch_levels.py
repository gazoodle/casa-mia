"""Sensor Watch's levels, as the integration works them out (levels.py, loaded by path):
bands, on/off, exact states, the summary, and Home Assistant's own health."""

import pytest

from casa_mia.modules.sensor_watch import LEVELS
from casa_mia.modules.sensor_watch.common import BadRequest, clean
from sensor_watch_fakes import ALARM, SALT, _entry, _now, levels


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
    assert levels.level_of(door, "off") == ("nominal", None)  # the form before b20
    assert levels.level_of(door, "on") == ("warning", "Door open")
    # Today's: each state its own level and message, so neither need be nominal.
    pump = {
        "kind": "binary",
        "off": {"level": "task", "message": "Pump idle"},
        "on": {"level": "error", "message": "Pump running dry"},
    }
    assert levels.level_of(pump, "off") == ("task", "Pump idle")
    assert levels.level_of(pump, "on") == ("error", "Pump running dry")


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


def test_home_assistants_own_health():
    first_bad: dict[str, float] = {}
    rows = levels.system_rows(
        {"recorder", "history"}, [_entry("a", "loaded")], first_bad, 0.0
    )
    assert {k: r["level"] for k, r in rows.items()} == {
        "homeassistant.recorder": "nominal",
        "homeassistant.history": "nominal",
    }
    # The Recorder down (its database unreachable) takes History with it: both critical.
    rows = levels.system_rows(set(), [], first_bad, 0.0)
    assert (
        rows["homeassistant.recorder"]["level"]
        == rows["homeassistant.history"]["level"]
        == "critical"
    )
    assert "no history" in rows["homeassistant.recorder"]["message"]


def test_a_failing_integration_counts_after_it_has_had_time_to_set_up():
    first_bad: dict[str, float] = {}
    on = {"recorder", "history"}
    broken = [
        _entry("a", "setup_retry", reason="Cannot connect"),
        _entry("b", "setup_error", disabled=True),
    ]
    assert "integration.a" not in levels.system_rows(
        on, broken, first_bad, 0.0
    )  # still settling
    row = levels.system_rows(on, broken, first_bad, levels.SETTLE)["integration.a"]
    assert row == {
        "name": "Barn blinds (acme_hub)",
        "level": "error",
        "value": "setup_retry",
        "message": "setup retry: Cannot connect",
    }
    assert "integration.b" not in levels.system_rows(
        on, broken, first_bad, levels.SETTLE
    )  # disabled: not a fault
    # Recovered: gone, and its clock starts again if it fails later.
    assert "integration.a" not in levels.system_rows(
        on, [_entry("a", "loaded")], first_bad, levels.SETTLE + 1
    )
    assert first_bad == {}


@pytest.mark.parametrize(
    ("state", "level"),
    [
        ("0", "nominal"),
        ("0.0", "nominal"),
        ("3", "error"),
        ("idle", "error"),
        ("unavailable", "error"),
    ],
)
def test_exact_states(state, level):
    assert levels.level_of(ALARM, state)[0] == level
    washer = {"kind": "state", "states": ["idle", "standby"], "other": "warning"}
    assert levels.level_of(washer, "standby") == ("nominal", None)
    assert levels.level_of(washer, "spin")[0] == "warning"


def test_ignored_discoveries_and_the_pages_settings():
    on = {"recorder", "history"}
    late = levels.SETTLE
    ignored_discovery = _entry("d", "not_loaded") | {"source": "ignore"}
    really_broken = _entry("e", "not_loaded") | {"source": "user"}
    first_bad: dict[str, float] = {}
    levels.system_rows(on, [ignored_discovery, really_broken], first_bad, 0.0)
    rows = levels.system_rows(on, [ignored_discovery, really_broken], first_bad, late)
    assert (
        "integration.d" not in rows and "integration.e" in rows
    )  # Ignore pressed: never a fault
    # The page's settings: one integration left out, then all of them, then the Recorder too.
    assert "integration.e" not in levels.system_rows(
        on, [really_broken], first_bad, late, {"ignore": ["e"]}
    )
    assert "integration.e" not in levels.system_rows(
        on, [really_broken], first_bad, late, {"integrations": False}
    )
    assert (
        levels.system_rows(set(), [], {}, 0.0, {"core": False, "integrations": False})
        == {}
    )


def test_a_state_with_its_own_level():
    lock = {
        "kind": "state",
        "states": ["locked"],
        "other": "task",
        "message": "Unlocked",
        "exceptions": [{"state": "jammed", "level": "error", "message": "Jammed"}],
    }
    assert levels.level_of(lock, "locked") == ("nominal", None)
    assert levels.level_of(lock, "jammed") == ("error", "Jammed")
    assert levels.level_of(lock, "unlocked") == ("task", "Unlocked")
    record = clean("lock.back_door", lock)
    assert record["exceptions"] == lock["exceptions"]
    with pytest.raises(BadRequest, match="which state"):
        clean(
            "lock.back_door", lock | {"exceptions": [{"state": "", "level": "error"}]}
        )


def test_an_attribute_is_read_instead_of_the_state():
    from types import SimpleNamespace

    rec = {"attribute": "current_temperature"}
    on = SimpleNamespace(state="heat", attributes={"current_temperature": 21.5})
    assert levels.reading(rec, on) == "21.5"
    assert levels.reading({}, on) == "heat"
    gone = SimpleNamespace(state="unavailable", attributes={})
    assert levels.reading(rec, gone) == "unavailable"
    assert levels.reading(rec, SimpleNamespace(state="off", attributes={})) is None
    assert levels.reading(rec, None) is None


def test_available_watches_only_whether_it_is_there():
    rec = clean(
        "light.bulb",
        {
            "kind": "available",
            "unavailable": "warning",
            "message": "Bulb gone",
            "available": {"level": "nominal"},
        },
    )
    assert levels.level_of(rec, "on") == ("nominal", None)
    assert levels.level_of(rec, "unknown") == ("nominal", None)  # there, no value yet
    assert levels.level_of(rec, "unavailable") == ("warning", "Bulb gone")
    assert levels.level_of(rec, None) == ("warning", "Bulb gone")  # renamed, removed
    # The other way round: something that should stay gone has come back.
    gone = clean(
        "switch.old_relay",
        {
            "kind": "available",
            "unavailable": "nominal",
            "available": {"level": "error", "message": "The old relay is back"},
        },
    )
    assert levels.level_of(gone, "off") == ("error", "The old relay is back")
    assert levels.level_of(gone, "unavailable") == ("nominal", "unavailable")


def test_a_date_is_read_as_the_days_until_it():
    from datetime import UTC, datetime
    from types import SimpleNamespace

    now = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
    rec = clean(
        "date.rinse_filter_due",
        {
            "kind": "numeric",
            "days_until": True,
            "bands": [
                {"from": None, "to": 0, "level": "warning", "message": "Overdue"},
                {"from": 0, "to": 3, "level": "task", "message": "Due soon"},
                {"from": 3, "to": None, "level": "nominal", "message": ""},
            ],
        },
    )
    assert rec["days_until"] is True

    def at(state):
        value = levels.reading(rec, SimpleNamespace(state=state, attributes={}), now)
        return value, levels.level_of(rec, value)

    assert at("2026-10-25") == ("12.5", ("nominal", None))  # a date: its midnight
    assert at("2026-10-14T00:00:00+00:00") == ("1.5", ("task", "Due soon"))
    assert at("2026-10-12T00:00:00+00:00") == ("-0.5", ("warning", "Overdue"))
    assert at("unavailable") == ("unavailable", ("error", "unavailable"))
    assert at("soon")[1] == ("error", "not a number: soon")


UK_MAINS = {
    "kind": "numeric",
    "bands": [
        {"from": None, "to": 207, "level": "critical", "message": "Very low"},
        {"from": 207, "to": 216.2, "level": "warning", "message": "Low"},
        {"from": 216.2, "to": 253, "level": "nominal", "message": ""},
        {"from": 253, "to": 262, "level": "warning", "message": "High"},
        {"from": 262, "to": None, "level": "critical", "message": "Very high"},
    ],
    "otherwise": "error",
    "accuracy": {"amount": 1, "percent": True},  # ±2.53 V at 253 V, ±2.62 V at 262 V
}


@pytest.mark.parametrize(
    ("current", "state", "level"),
    [
        (None, "254", "nominal"),  # the start: the doubt goes the better way
        ("nominal", "254", "nominal"),  # within the accuracy: holds
        ("nominal", "255.6", "warning"),  # surely past 253
        ("warning", "254", "warning"),  # holds on the way back too
        ("warning", "252.9", "nominal"),  # back inside the real edge: at once
        ("nominal", "263", "warning"),  # past 253 surely, 262 not yet
        ("nominal", "265", "critical"),
        ("critical", "261", "warning"),
        ("nominal", "215", "nominal"),  # the low edge: ±2.16 V at 216.2 V
        ("nominal", "214", "warning"),
        (None, "205.5", "warning"),  # critical only once surely below 207
        ("error", "240", "nominal"),  # back from unavailable
    ],
)
def test_accuracy_holds_a_level_near_an_edge(current, state, level):
    assert levels.level_of(UK_MAINS, state, current)[0] == level


def test_accuracy_as_an_amount_and_none_at_all():
    fixed = UK_MAINS | {"accuracy": {"amount": 0.5, "percent": False}}
    assert levels.level_of(fixed, "253.4", "nominal")[0] == "nominal"
    assert levels.level_of(fixed, "253.6", "nominal") == ("warning", "High")
    plain = {k: v for k, v in UK_MAINS.items() if k != "accuracy"}
    assert levels.level_of(plain, "253.4", "nominal")[0] == "warning"


def test_accuracy_is_checked_and_kept_for_numbers_only():
    rec = clean("sensor.volts", UK_MAINS)
    assert rec["accuracy"] == {"amount": 1.0, "percent": True}
    assert "accuracy" not in clean(
        "sensor.volts", UK_MAINS | {"accuracy": {"amount": 0}}
    )
    for bad in ({"amount": -1}, {"amount": 60, "percent": True}, "1%"):
        with pytest.raises(BadRequest):
            clean("sensor.volts", UK_MAINS | {"accuracy": bad})


def test_a_band_narrower_than_the_accuracy_is_stepped_through_not_skipped():
    from casa_mia.modules.sensor_watch import profiles

    us = next(p for p in profiles.library() if p["name"].startswith("US mains"))
    assert us["accuracy"] == {"amount": 1, "percent": True}
    # 126-127 V is the warning; 127.5 V is surely past 126 V, not surely past 127 V.
    assert levels.level_of(us, "127.5", "nominal")[0] == "warning"
    assert levels.level_of(us, "128.5", "warning")[0] == "error"


DAY = 86400
LADDER = {"escalate": {"task": 7 * DAY, "warning": 7 * DAY}}


@pytest.mark.parametrize(
    ("real", "days", "shown", "next_in"),
    [
        ("task", 0, "task", 7),
        ("task", 6.5, "task", 0.5),
        ("task", 7, "warning", 7),  # each rung timed from reaching it
        ("task", 13, "warning", 1),
        ("task", 14, "error", None),  # no rung from error: it stops there
        ("task", 400, "error", None),
        ("warning", 7, "error", None),  # worse on its own: its own rung
        ("error", 30, "error", None),
        ("nominal", 30, "nominal", None),  # never from nominal
    ],
)
def test_escalation_climbs_the_ladder_by_how_long_a_level_has_stood(
    real, days, shown, next_in
):
    level, wait = levels.escalation(LADDER, real, days * DAY)
    assert level == shown
    assert wait == (None if next_in is None else pytest.approx(next_in * DAY))


def test_escalation_stops_at_critical_and_needs_a_ladder():
    assert levels.escalation({"escalate": {"error": 60}}, "error", 600) == (
        "critical",
        None,
    )
    assert levels.escalation({}, "task", 10 * DAY) == ("task", None)


def test_escalate_is_checked_and_kept_for_any_kind():
    rec = clean(
        "binary_sensor.leak",
        {"kind": "binary", "escalate": {"task": 3600, "warning": 0}},
    )
    assert rec["escalate"] == {"task": 3600}
    assert "escalate" not in clean("sensor.salt", SALT | {"escalate": {}})
    for bad in ({"nominal": 3600}, {"critical": 3600}, {"task": 5}, ["task"]):
        with pytest.raises(BadRequest):
            clean("sensor.salt", SALT | {"escalate": bad})
