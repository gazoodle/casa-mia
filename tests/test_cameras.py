"""Cameras: the house's cameras, the source the commanders and the dashboard read."""

import json

import pytest

from casa_mia.modules.cameras import Cameras, ha_cameras, motion_sensors
from test_camera_dashboard import STORE, FakeHA, call


@pytest.fixture
def cams(tmp_path):
    (tmp_path / "camera-dashboard.json").write_text(json.dumps(STORE))
    cams = Cameras(
        tmp_path,
        FakeHA(),  # type: ignore[arg-type]
        still=lambda e, w: b"\xff\xd8" if e == "camera.a_low" else None,
    )
    cams.start()
    return cams


def test_the_first_start_moves_the_cameras_from_the_camera_dashboard(cams, tmp_path):
    assert cams.cameras() == STORE["cameras"]
    assert json.loads((tmp_path / "cameras.json").read_text()) == STORE["cameras"]
    # the old file is left as it was, and the next start reads cameras.json
    assert json.loads((tmp_path / "camera-dashboard.json").read_text()) == STORE
    (tmp_path / "camera-dashboard.json").unlink()
    again = Cameras(tmp_path, None)
    again.start()
    assert again.cameras() == STORE["cameras"]


def test_starts_empty_without_old_files(tmp_path):
    cams = Cameras(tmp_path, None)
    cams.start()
    assert cams.health() == {"state": "running", "error": None, "cameras": 0}
    assert not (tmp_path / "cameras.json").exists()


def test_save_checks_and_tells_the_listeners(cams):
    told = []
    cams.listeners.append(told.append)
    cameras = cams.cameras()
    cameras["camera.b"]["controls"] = [{"entity": " "}]
    cameras["camera.a_low"]["controls"].append({"entity": "", "name": "x"})
    status, out = call(cams, "PUT", "", {"cameras": cameras})
    assert status == 200 and "controls" not in out["cameras"]["camera.b"]
    assert out["cameras"]["camera.a_low"]["controls"] == [{"entity": "button.gate"}]
    assert told == [out["cameras"]]
    assert call(cams, "PUT", "", {"cameras": {"camera.x": {"title": " "}}})[0] == 400
    assert call(cams, "PUT", "", {"cameras": {"switch.x": {"title": "X"}}})[0] == 400
    assert told == [out["cameras"]]  # a refused save tells nobody


def test_thumbnails(cams):
    status, ctype, body = cams.handle("GET", "thumb/camera.a_low", {}, b"")
    assert (status, ctype, body) == (200, "image/jpeg", b"\xff\xd8")
    assert cams.handle("GET", "thumb/camera.b", {}, b"")[0] == 404
    assert cams.handle("GET", "thumb/..%2Fetc", {}, b"")[0] == 400


def test_ha_cameras_matches_channels_by_device():
    registry = [
        {"entity_id": "camera.porch_low_resolution_channel", "device_id": "d"},
        {"entity_id": "camera.hall_porch_medium_resolution_channel", "device_id": "d"},
        {"entity_id": "camera.porch_high_resolution_channel", "device_id": "d"},
        {"entity_id": "number.porch_zoom_level", "device_id": "d"},
        {"entity_id": "camera.tablet", "device_id": "t"},
        {"entity_id": "camera.off", "device_id": "o", "disabled_by": "user"},
    ]
    states = [
        {
            "entity_id": "camera.porch_low_resolution_channel",
            "attributes": {"friendly_name": "Porch Low resolution channel"},
        }
    ]
    tablet, porch = ha_cameras(registry, states)  # sorted by name
    assert tablet == {
        "entity": "camera.tablet",
        "device_id": "t",
        "name": "camera.tablet",
    }
    assert porch == {
        "entity": "camera.porch_low_resolution_channel",
        "device_id": "d",
        "medium": "camera.hall_porch_medium_resolution_channel",
        "high": "camera.porch_high_resolution_channel",
        "zoom": "number.porch_zoom_level",
        "name": "Porch",
    }


def test_live_view_gives_each_channel_from_ha(cams):
    status, out = call(cams, "GET", "live/camera.a_low")
    assert status == 200
    assert out["channels"] == [
        {
            "channel": "camera",
            "entity": "camera.a_low",
            "url": "/api/camera_proxy_stream/camera.a_low?token=t-a_low",
        },
        {
            "channel": "medium",
            "entity": "camera.a_med",
            "url": "/api/camera_proxy_stream/camera.a_med?token=t-a_med",
        },
    ]  # camera.a_high has no state in HA, so it is left out
    assert out["motion"] is None  # no motion sensor for it in HA
    assert call(cams, "GET", "live/camera.nope")[0] == 400


def test_motion_sensors_by_device_then_by_name():
    registry = [
        {"entity_id": "camera.drive_low_resolution_channel", "device_id": "d"},
        {
            "entity_id": "binary_sensor.drive_motion",
            "device_id": "d",
            "original_device_class": "motion",
        },
        {
            "entity_id": "binary_sensor.drive_doorbell",
            "device_id": "d",
            "original_device_class": "occupancy",
        },
        {"entity_id": "camera.pool", "device_id": None},
    ]
    states = [
        {
            "entity_id": "binary_sensor.pool_motion",
            "attributes": {"device_class": "motion"},
        },
        {
            "entity_id": "binary_sensor.shed_motion",
            "attributes": {"device_class": "motion"},
        },
    ]
    cams = ["camera.drive_low_resolution_channel", "camera.pool", "camera.shed_cam"]
    assert (
        motion_sensors(registry, states, cams)
        == {
            "camera.drive_low_resolution_channel": "binary_sensor.drive_motion",  # its device
            "camera.pool": "binary_sensor.pool_motion",  # by name
        }
    )
