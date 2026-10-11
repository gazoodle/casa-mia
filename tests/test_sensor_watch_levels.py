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
