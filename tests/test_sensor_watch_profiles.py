"""Sensor Watch's band profiles: a range said once for many sensors."""

from sensor_watch_fakes import ENTITIES, SALT, STATES, FakeHA, call, levels, make

MAINS = {
    "name": "Mains voltage",
    "kind": "numeric",
    "bands": [
        {"from": None, "to": 207, "level": "critical", "message": "Mains very low"},
        {"from": 207, "to": 216, "level": "warning", "message": "Mains low"},
        {"from": 216, "to": 253, "level": "nominal", "message": ""},
    ],
    "otherwise": "error",
}


def _two_plugs(tmp_path):
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    status, view = call(watch, "POST", "profiles", body=MAINS)
    assert status == 201
    pid = view["created"]
    for eid in ("sensor.temp_00", "sensor.temp_01"):
        call(watch, "PUT", eid, body=SALT)  # watched with their own bands first
    return watch, pid


def test_sensors_follow_a_profile_and_the_integration_sees_it_resolved(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    status, view = call(
        watch,
        "POST",
        f"profiles/{pid}/apply",
        body={"entity_ids": ["sensor.temp_00", "sensor.temp_01", "sensor.nope"]},
    )
    assert status == 200
    assert next(p for p in view["profiles"] if p["id"] == pid)["followers"] == 2
    sent = {r["entity_id"]: r for r in watch.for_integration()["records"]}
    assert (
        sent["sensor.temp_00"]["bands"] == MAINS["bands"]
        and sent["sensor.temp_00"]["profile"] == pid
    )
    assert levels.level_of(sent["sensor.temp_01"], "210") == ("warning", "Mains low")
    assert watch.records["sensor.temp_00"] == {
        "entity_id": "sensor.temp_00",
        "name": "",
        "profile": pid,
    }  # stored as a pointer


def test_editing_the_profile_moves_every_follower_and_the_revision(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    call(
        watch,
        "POST",
        f"profiles/{pid}/apply",
        body={"entity_ids": ["sensor.temp_00", "sensor.temp_01"]},
    )
    before = watch.health()["revision"]
    stricter = MAINS | {
        "bands": [
            {"from": None, "to": 220, "level": "critical"},
            {"from": 220, "to": None, "level": "nominal"},
        ]
    }
    assert call(watch, "PUT", f"profiles/{pid}", body=stricter)[0] == 200
    assert watch.health()["revision"] != before  # so the integration fetches it
    sent = watch.for_integration()["records"]
    assert all(levels.level_of(r, "218")[0] == "critical" for r in sent)


def test_a_profile_must_fit_its_sensor(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    status, got = call(watch, "PUT", "binary_sensor.leak", body={"profile": pid})
    assert status == 400 and "can't follow" in got["error"]
    door = {"name": "Doors", "kind": "binary", "nominal": "off", "other": "task"}
    _, view = call(watch, "POST", "profiles", body=door)
    assert (
        call(watch, "PUT", "binary_sensor.leak", body={"profile": view["created"]})[0]
        == 200
    )
    assert call(watch, "PUT", "sensor.salt", body={"profile": "nope"})[0] == 400
    assert call(watch, "POST", "profiles", body=MAINS | {"name": ""})[0] == 400


def test_deleting_a_profile_leaves_each_follower_a_copy(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    call(
        watch, "POST", f"profiles/{pid}/apply", body={"entity_ids": ["sensor.temp_00"]}
    )
    status, view = call(watch, "DELETE", f"profiles/{pid}")
    assert status == 200 and view["profiles"] == []
    kept = watch.records["sensor.temp_00"]
    assert "profile" not in kept and kept["bands"] == MAINS["bands"]  # its own now
    assert (
        make(tmp_path / "sw.json", None).records["sensor.temp_00"]["bands"]
        == MAINS["bands"]
    )  # and saved
