"""Sensor Watch's groups: saved filters and a profile, kept up to date by themselves."""

from sensor_watch_fakes import ENTITIES, STATES, FakeHA, _state, call, make
from test_sensor_watch_profiles import MAINS


def _group(tmp_path):
    ha = FakeHA(list(STATES), ENTITIES)
    watch = make(tmp_path / "sw.json", ha)
    _, view = call(watch, "POST", "profiles", body=MAINS)
    pid = view["created"]
    body = {"name": "Temperatures", "filters": {"q": "temp"}, "profile": pid}
    status, view = call(watch, "POST", "groups", body=body)
    assert status == 201
    return watch, ha, pid, view


def test_a_group_watches_what_matches_with_its_profile(tmp_path):
    watch, _, pid, view = _group(tmp_path)
    assert view["joined"] == 5
    assert view["groups"][0]["members"] == 5
    temps = [r for r in view["records"] if r["entity_id"].startswith("sensor.temp_")]
    assert len(temps) == 5 and all(r["profile"] == pid for r in temps)
    sent = watch.for_integration()["records"]
    assert {r["group"] for r in sent} == {
        "Temperatures"
    }  # the list service filters by it


def test_new_arrivals_join_and_those_stopped_stay_out(tmp_path):
    watch, ha, _, _ = _group(tmp_path)
    call(watch, "DELETE", "sensor.temp_02")  # stopped by hand: remembered
    assert watch.groups[next(iter(watch.groups))]["left"] == ["sensor.temp_02"]
    ha.states.append(_state("sensor.temp_09", "20", state_class="measurement"))
    assert watch.reader
    watch.reader._at = 0  # HA read again, as each minute
    assert watch.sync() == 1  # the new plug, not the one stopped
    assert "sensor.temp_09" in watch.records and "sensor.temp_02" not in watch.records
    gid = next(iter(watch.groups))
    _, view = call(watch, "POST", f"groups/{gid}/readmit")
    assert view["joined"] == 1 and "sensor.temp_02" in watch.records


def test_a_group_needs_filters_and_a_profile_and_keeps_its_profile(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    assert (
        call(
            watch, "POST", "groups", body={"name": "All", "filters": {}, "profile": pid}
        )[0]
        == 400
    )
    assert (
        call(
            watch,
            "POST",
            "groups",
            body={"name": "X", "filters": {"q": "a"}, "profile": "no"},
        )[0]
        == 400
    )
    status, got = call(watch, "DELETE", f"profiles/{pid}")
    assert status == 400 and "Temperatures" in got["error"]


def test_deleting_a_group_keeps_its_members(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    gid = next(iter(watch.groups))
    _, view = call(watch, "DELETE", f"groups/{gid}")
    assert view["groups"] == []
    temps = [r for r in view["records"] if r["entity_id"].startswith("sensor.temp_")]
    assert len(temps) == 5 and all(
        "group" not in r and r["profile"] == pid for r in temps
    )


def test_an_edited_member_stays_in_its_group(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    call(watch, "PUT", "sensor.temp_00", body={"profile": pid, "name": "Hall"})
    assert watch.records["sensor.temp_00"]["group"] == next(iter(watch.groups))
