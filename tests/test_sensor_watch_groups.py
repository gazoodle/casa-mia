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
    watch.reader.forget()  # HA read again, as when its registry changes
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


def test_unticked_or_no_longer_matching_members_leave(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    gid = next(iter(watch.groups))
    body = {"name": "Temperatures", "filters": {"q": "temp"}, "profile": pid}
    _, view = call(
        watch, "PUT", f"groups/{gid}", body=body | {"left": ["sensor.temp_01"]}
    )
    assert "sensor.temp_01" not in watch.records and view["groups"][0]["members"] == 4
    narrower = body | {"filters": {"q": "temp_0"}, "left": []}  # still all five
    call(watch, "PUT", f"groups/{gid}", body=narrower)
    assert view and len([e for e in watch.records if e.startswith("sensor.temp_")]) == 5
    call(watch, "PUT", f"groups/{gid}", body=body | {"filters": {"q": "temp_03"}})
    assert [e for e in watch.records if e.startswith("sensor.temp_")] == [
        "sensor.temp_03"
    ]


def test_a_new_group_can_leave_some_out(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    body = {
        "name": "Salt",
        "filters": {"q": "salt"},
        "profile": pid,
        "left": ["sensor.salt"],
    }
    _, view = call(watch, "POST", "groups", body=body)
    assert view["joined"] == 0 and "sensor.salt" not in watch.records


def test_a_minus_word_keeps_them_out_now_and_later(tmp_path):
    watch, ha, pid, _ = _group(tmp_path)
    gid = next(iter(watch.groups))
    body = {"name": "Temperatures", "filters": {"q": "temp -temp_02"}, "profile": pid}
    call(watch, "PUT", f"groups/{gid}", body=body)
    assert "sensor.temp_02" not in watch.records and "sensor.temp_01" in watch.records
    ha.states.append(_state("sensor.temp_02b", "20", state_class="measurement"))
    assert watch.reader
    watch.reader.forget()
    assert watch.sync() == 0  # a new one with the unwanted word never joins


def test_a_group_can_follow_the_defaults(tmp_path):
    ha = FakeHA(list(STATES), ENTITIES)
    watch = make(tmp_path / "sw.json", ha)
    body = {"name": "Everything", "filters": {"kind": "binary"}, "profile": "defaults"}
    status, view = call(watch, "POST", "groups", body=body)
    assert status == 201 and view["joined"] == 1  # the leak; the lamp has no default
    leak = watch.records["binary_sensor.leak"]
    assert (
        leak["on"]["level"] == "critical"
        and leak["hold_off"] == 0
        and "profile" not in leak
    )
    _, got = call(watch, "GET", "candidates", {"kind": ["binary"]})
    has = {c["entity_id"]: c["has_default"] for c in got["sensors"]}
    assert has["binary_sensor.leak"] and not has["light.lamp"]


def test_a_group_moves_from_the_defaults_to_a_profile(tmp_path):
    ha = FakeHA(list(STATES), ENTITIES)
    watch = make(tmp_path / "sw.json", ha)
    door = {"name": "Doors", "kind": "binary", "nominal": "off", "other": "task"}
    _, view = call(watch, "POST", "profiles", body=door)
    body = {"name": "Leaks", "filters": {"q": "leak"}, "profile": "defaults"}
    call(watch, "POST", "groups", body=body)
    gid = next(iter(watch.groups))
    call(watch, "PUT", f"groups/{gid}", body=body | {"profile": view["created"]})
    assert watch.records["binary_sensor.leak"]["profile"] == view["created"]


def test_a_disabled_member_is_kept_but_not_watched(tmp_path):
    watch, _, pid, _ = _group(tmp_path)
    body = {"profile": pid, "name": "", "disabled": True}
    assert call(watch, "PUT", "sensor.temp_02", body=body)[0] == 200
    _, view = call(watch, "GET", "")
    r = next(r for r in view["records"] if r["entity_id"] == "sensor.temp_02")
    assert r["disabled"] and r["group"] and r["profile"] == pid  # kept, with its group
    assert view["groups"][0]["members"] == 4  # not counted
    sent = {r["entity_id"] for r in watch.for_integration()["records"]}
    assert "sensor.temp_02" not in sent and len(sent) == 4  # not watched
    assert watch.sync() == 0  # nor pulled back in by the group
    call(watch, "PUT", "sensor.temp_02", body=body | {"disabled": False})
    assert "sensor.temp_02" in {
        r["entity_id"] for r in watch.for_integration()["records"]
    }
