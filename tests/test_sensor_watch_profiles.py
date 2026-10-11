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


def test_apply_watches_new_sensors_and_skips_those_it_doesnt_fit(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    ids = ["sensor.salt", "binary_sensor.leak", "sensor.nope"]
    status, view = call(
        watch, "POST", f"profiles/{pid}/apply", body={"entity_ids": ids}
    )
    assert status == 200 and (view["followed"], view["skipped"]) == (1, 1)
    assert watch.records["sensor.salt"]["profile"] == pid  # watched now
    assert (
        "binary_sensor.leak" not in watch.records and "sensor.nope" not in watch.records
    )


def test_the_library_is_sound():
    from casa_mia.modules.sensor_watch.defaults import default_record
    from casa_mia.modules.sensor_watch.profiles import clean_profile, library

    shipped = library()
    assert len({p["name"] for p in shipped}) == len(shipped)
    for p in shipped:
        cleaned = clean_profile(p)  # checks it as a save would
        assert p["about"] and p["category"], p["name"]
        if p["kind"] == "numeric":
            bands = cleaned["bands"]  # edge to edge, open at both ends: no gaps
            assert all(a["to"] == b["from"] for a, b in zip(bands, bands[1:])), p[
                "name"
            ]
            assert bands[0]["from"] is None and bands[-1]["to"] is None, p["name"]
        if (
            "default_for" in p
        ):  # the defaults as a profile: kept the same as defaults.py
            domain, dc = p["default_for"].split(":")
            c = {"entity_id": f"{domain}.x", "device_class": dc, "unit": ""}
            mine = {k: v for k, v in cleaned.items() if k != "name"}
            theirs = clean_profile((default_record(c) or {}) | {"name": "x"})
            assert mine == {k: v for k, v in theirs.items() if k != "name"}, p["name"]


def test_export_and_import_round_trip(tmp_path):
    watch, pid = _two_plugs(tmp_path)
    call(
        watch, "POST", f"profiles/{pid}/apply", body={"entity_ids": ["sensor.temp_00"]}
    )
    _, shared = call(watch, "GET", "profiles/export")
    assert shared["format"] == "casa_mia.sensor_watch.profiles"
    assert [p["name"] for p in shared["profiles"]] == ["Mains voltage"]
    other = make(tmp_path / "other.json", FakeHA(STATES, ENTITIES))
    status, view = call(other, "POST", "profiles/import", body=shared)
    assert status == 200 and view["added"] == ["Mains voltage"]
    # The same name again replaces it in place: same id, so its followers follow.
    edited = shared | {"profiles": [shared["profiles"][0] | {"hold_off": 5}]}
    _, view = call(watch, "POST", "profiles/import", body=edited)
    assert view["replaced"] == ["Mains voltage"] and list(watch.profiles) == [pid]
    assert watch.for_integration()["records"][0]["hold_off"] == 5
    bad = {"profiles": [MAINS, MAINS | {"name": "Broken", "bands": []}]}
    status, got = call(other, "POST", "profiles/import", body=bad)
    assert status == 400 and "Broken" in got["error"]
    assert len(other.profiles) == 1  # nothing taken


def test_the_library_is_served(tmp_path):
    watch = make(tmp_path / "sw.json", FakeHA(STATES, ENTITIES))
    _, got = call(watch, "GET", "profiles/library")
    assert any(p["name"].startswith("UK mains voltage") for p in got["profiles"])
    status, view = call(watch, "POST", "profiles/import", body=got)
    assert status == 200 and len(view["added"]) == len(got["profiles"])
