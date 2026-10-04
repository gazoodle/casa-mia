import io
import json
import urllib.error
import urllib.request

import pytest
from PIL import Image

from casa_mia.ha import HAError
from casa_mia.modules.camera_dashboard import (
    COMMANDER_SELECT,
    CameraDashboard,
    build_dashboard,
    commander_selects,
    ha_cameras,
    problems,
    warnings,
    with_defaults,
)
from casa_mia.modules.compositor import load_config

STORE = {
    "dashboard": "dashboard-cams",
    "wall_users": ["u1"],
    "live_card": "webrtc-camera",
    "hi_live_card": "advanced-camera-card",
    "cameras": {
        "camera.a_low": {
            "title": "Bay",
            "medium": "camera.a_med",
            "high": "camera.a_high",
            "ptz": {
                "action": "unifiprotect.ptz_goto_preset",
                "data": {"device_id": "d1"},
                "presets": ["Door", {"preset": "Home", "label": "Home view"}],
            },
            "controls": [{"entity": "button.gate"}],
        },
        "camera.b": {"title": "Tablet", "live": "picture-entity"},
    },
    "commander": {
        "width": 1000,
        "height": 500,
        "gap": 0,
        "main": "",
        "left": {"cameras": ["camera.a_low"], "size": 10, "fit": "cover"},
        "top": {"cameras": [], "size": 20, "fit": "cover"},
        "right": {"cameras": [], "size": 10, "fit": "cover"},
        "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
    },
}


def commander_store():
    return with_defaults(STORE)


def test_build():
    store = commander_store()
    assert problems(store) == []
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    # the commander, then each of its cameras
    assert [v["path"] for v in views] == ["cameras", "cam-bay", "cam-tablet"]
    bay_view, tablet_view = views[1], views[2]
    cards = bay_view["sections"][0]["cards"]
    assert [c["type"] for c in cards] == [
        "custom:webrtc-camera",
        "custom:advanced-camera-card",
    ]
    presets = bay_view["sections"][1]["cards"]
    assert [p["name"] for p in presets] == ["Door", "Home view"]
    assert presets[1]["tap_action"]["data"] == {"device_id": "d1", "preset": "Home"}
    assert tablet_view["sections"][0]["cards"][0]["type"] == "picture-entity"
    # settings since dropped (the groups) are left out of a store
    assert "groups" not in with_defaults({**store, "groups": {"Shed": {}}})


def test_problems_are_found():
    store = commander_store()
    store["dashboard"] = "Cameras"
    store["commanders"][0]["left"]["cameras"].append("camera.gone")
    store["cameras"]["camera.c"] = {"title": "Bay!"}
    store["commanders"][0]["top"]["cameras"].append("camera.c")
    found = " ".join(problems(store))
    assert "hyphen" in found
    assert "camera.gone is not one of the cameras" in found
    assert "'Bay' and 'Bay!' clash" in found
    for panel in ("left", "top", "bottom"):
        store["commanders"][0][panel]["cameras"] = []
    assert "The Cameras commander has no cameras" in " ".join(problems(store))


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


class FakeHA:
    """Just enough of HA's websocket for deploying: dashboards and their configs."""

    def __init__(self):
        self.boards: dict[str, dict | None] = {"dashboard-cams": {"views": ["old"]}}
        self.sent = []
        self.registry: list[dict] = []  # the entity registry: the commanders' entities

    def call(self, *commands):
        out = []
        for c in commands:
            self.sent.append(c)
            if c["type"] == "lovelace/dashboards/list":
                out.append([{"id": f"id-{u}", "url_path": u} for u in self.boards])
            elif c["type"] == "lovelace/dashboards/delete":
                del self.boards[c["dashboard_id"].removeprefix("id-")]
            elif c["type"] == "lovelace/dashboards/create":
                self.boards[c["url_path"]] = None
            elif c["type"] == "lovelace/config":
                if self.boards.get(c["url_path"]) is None:
                    raise HAError("config_not_found")
                out.append(self.boards[c["url_path"]])
            elif c["type"] == "config/entity_registry/list":
                out.append(self.registry)
            elif c["type"] == "get_states":
                out.append(
                    [
                        {
                            "entity_id": f"camera.{n}",
                            "attributes": {"access_token": f"t-{n}"},
                        }
                        for n in ("a_low", "a_med")
                    ]
                )
            elif c["type"] == "lovelace/config/save":
                self.boards[c["url_path"]] = c["config"]
                out.append(None)
        return out


def call(cd, method, path, body=None, query=None):
    status, _, data = cd.handle(
        method, path, query or {}, json.dumps(body).encode() if body else b""
    )
    return status, json.loads(data)


@pytest.fixture
def cd(tmp_path):
    for name in ("camera-dashboard.json", "camera-dashboard-live.json"):
        (tmp_path / name).write_text(json.dumps(STORE))
    cd = CameraDashboard(tmp_path, FakeHA(), lambda: "10.0.0.2")  # type: ignore[arg-type]
    cd.start()
    return cd


def test_edit_preview_then_deploy(cd, tmp_path):
    status, view = call(cd, "GET", "")
    store = view["store"]
    store["commanders"][0]["main"] = "camera.b"
    status, view = call(cd, "PUT", "", store)
    assert status == 200 and view["changed"] is True
    # the live compositor still draws what was deployed
    assert load_config(tmp_path).commanders[0]["main"] == ""

    status, out = call(cd, "POST", "deploy", {"target": "preview"})
    assert status == 200 and out["url_path"] == "dashboard-cams-preview"
    preview = cd.ha.boards["dashboard-cams-preview"]
    assert "http://10.0.0.2:8098/g/cameras.mjpg" in json.dumps(preview)
    assert "/dashboard-cams-preview/cam-bay" in json.dumps(preview)
    assert out["changed"] is True  # a preview changes nothing live
    assert out["previewed"]
    status, out = call(cd, "POST", "remove-preview")
    assert status == 200 and out["previewed"] is None
    assert "dashboard-cams-preview" not in cd.ha.boards
    assert "dashboard-cams" in cd.ha.boards  # live untouched
    assert call(cd, "POST", "remove-preview")[0] == 200  # nothing there: fine
    call(cd, "POST", "deploy", {"target": "preview"})

    status, out = call(cd, "POST", "deploy", {"target": "live"})
    assert status == 200 and out["changed"] is False and out["deployed"]
    assert "http://10.0.0.2:8099/g/cameras.mjpg" in json.dumps(
        cd.ha.boards["dashboard-cams"]
    )
    assert load_config(tmp_path).commanders[0]["main"] == "camera.b"
    # what it replaced was kept, and can be put back
    status, out = call(cd, "GET", "backups")
    (kept,) = [b for b in out["backups"] if b["url_path"] == "dashboard-cams"]
    assert kept["url_path"] == "dashboard-cams"
    call(cd, "POST", "restore", {"name": kept["name"]})
    assert cd.ha.boards["dashboard-cams"] == {"views": ["old"]}


def test_save_drops_page_controls_with_no_entity(cd):
    _, view = call(cd, "GET", "")
    store = view["store"]
    store["cameras"]["camera.b"]["controls"] = [{"entity": " "}]
    store["cameras"]["camera.a_low"]["controls"].append({"entity": "", "name": "x"})
    _, view = call(cd, "PUT", "", store)
    assert "controls" not in view["store"]["cameras"]["camera.b"]
    assert view["store"]["cameras"]["camera.a_low"]["controls"] == [
        {"entity": "button.gate"}
    ]


def test_refuses_to_deploy_a_broken_store(cd):
    _, view = call(cd, "GET", "")
    for panel in ("left", "bottom"):
        view["store"]["commanders"][0][panel]["cameras"] = []
    assert call(cd, "PUT", "", view["store"])[0] == 200  # a draft may be unfinished
    status, out = call(cd, "POST", "deploy", {"target": "live"})
    assert status == 400 and "no cameras" in out["error"]
    assert cd.ha.sent == []


def test_revert_throws_the_draft_away(cd):
    _, view = call(cd, "GET", "")
    view["store"]["title"] = "Other"
    call(cd, "PUT", "", view["store"])
    status, view = call(cd, "POST", "revert")
    assert view["store"]["title"] == "Cameras" and view["changed"] is False


def test_yaml_for_copy_and_paste(cd):
    status, ctype, body = cd.handle("GET", "yaml", {"target": ["live"]}, b"")
    assert status == 200 and ctype.startswith("text/yaml")
    assert b"http://10.0.0.2:8099/g/cameras.mjpg" in body


def test_starts_empty_without_old_files(tmp_path):
    cd = CameraDashboard(tmp_path, None, lambda: None)
    cd.start()
    assert (
        cd.health()["cameras"] == 0
        and not (tmp_path / "camera-dashboard.json").exists()
    )


def test_live_previews_and_thumbnails(tmp_path):
    import io
    import threading
    import time
    from http.server import ThreadingHTTPServer

    from PIL import Image

    from casa_mia.modules.compositor import DRAFT_STORE, Compositor
    from test_compositor import FakeHA as FakeCameras

    cameras = ThreadingHTTPServer(("127.0.0.1", 0), FakeCameras)
    threading.Thread(target=cameras.serve_forever, daemon=True).start()
    draft = Compositor(
        tmp_path,
        f"http://127.0.0.1:{cameras.server_port}",
        "token",
        port=0,
        store=DRAFT_STORE,
        prewarm=False,
    )
    cd = CameraDashboard(tmp_path, None, lambda: None, draft=draft)
    cd.start()  # empty: nothing saved
    draft.start()

    def render(store):
        return cd.handle("POST", "render", {}, json.dumps({"store": store}).encode())

    store = {
        "cameras": {"camera.a": {"title": "A"}, "camera.b": {"title": "B"}},
        "commanders": [
            {
                "width": 640,
                "height": 360,
                "gap": 0,
                "left": {"cameras": ["camera.a"], "size": 20, "fit": "cover"},
                "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
            }
        ],
    }
    try:
        status, ctype, body = render(store)
        assert (status, ctype) == (200, "image/jpeg")
        assert Image.open(io.BytesIO(body)).size == (640, 360)
        store["commanders"][0]["width"] = 800  # an edit, not saved
        assert Image.open(io.BytesIO(render(store)[2])).size == (800, 360)
        status, ctype, body = cd.handle("GET", "thumb/camera.a", {}, b"")
        assert (status, ctype) == (200, "image/jpeg") and body[:2] == b"\xff\xd8"
        assert cd.handle("GET", "thumb/..%2Fetc", {}, b"")[0] == 400
        store["commanders"][0]["left"]["cameras"] = store["commanders"][0]["bottom"][
            "cameras"
        ] = []
        status, _, body = render(store)
        assert status == 422 and b"no cameras" in body
    finally:
        draft.stop()
        time.sleep(0.2)
        cameras.shutdown()
        cameras.server_close()


def test_warns_about_what_ha_lacks():
    store = commander_store()
    have = {"camera.a_low", "camera.a_med", "camera.a_high", "camera.b"}
    found = warnings(store, have, ["/hacsfiles/webrtc/webrtc-camera.js"], {"u1"})
    assert "button.gate (on Bay's page) is not in Home Assistant." in found
    assert (
        "input_button.navigate_placeholder (on the tiles) is not in Home Assistant."
        in found
    )
    assert (
        "The advanced-camera-card card is not among the dashboard resources." in found
    )
    assert not any("webrtc-camera card" in w or "user" in w for w in found)
    assert any("needs a Back button helper" in w for w in found)
    ours = warnings(
        store, have, ["/hacsfiles/webrtc/webrtc-camera.js"], {"u1"}, {"cm-back.js"}
    )
    assert not any("Back" in w for w in ours)  # the integration's helper is on
    unknown = warnings(store, have, [], {"u1"}, None)  # not heard since the app started
    assert not any("Back" in w for w in unknown)
    both = warnings(
        store, have, ["/local/scripts/nav_back_helper.js"], {"u1"}, {"cm-back.js"}
    )
    assert any("Back goes back twice" in w for w in both)


def test_live_view_gives_each_channel_from_ha(cd):
    status, out = call(cd, "GET", "live/camera.a_low")
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
    assert call(cd, "GET", "live/camera.nope")[0] == 400


def test_commander_layout():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

    one = {"cameras": ["camera.x"], "size": 0, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 1000, "height": 500, "gap": 0}
    for panel, size in (("left", 10), ("right", 10), ("top", 20), ("bottom", 20)):
        cmd[panel] = {**one, "size": size}
    size, main, tiles = commander_layout(cmd)
    assert size == (1000, 500)
    assert tiles["bottom"] == [(0, 400, 1000, 100)]  # full width
    assert tiles["left"] == [(0, 0, 100, 400)] and tiles["right"] == [
        (900, 0, 100, 400)
    ]
    assert tiles["top"] == [(100, 0, 800, 100)]  # between left and right
    assert main == (100, 100, 800, 300)
    cmd["left"] = cmd["right"] = cmd["top"] = {**one, "cameras": []}  # empty: no room
    assert commander_layout(cmd)[1] == (0, 0, 1000, 400)


def test_commander_overview_taps_choose_and_open():
    store = commander_store()
    assert problems(store) == []
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    (landscape,) = views[0]["sections"][0]["cards"]  # one picture, for every screen
    assert landscape["image"] == "http://h:8099/g/cameras.mjpg"
    assert "visibility" not in landscape
    taps = [e for e in landscape["elements"] if e["type"] == "image"]
    assert [t["tap_action"]["data"]["option"] for t in taps] == ["Bay", "Tablet"]
    mains = [e for e in landscape["elements"] if e["type"] == "conditional"]
    assert [m["conditions"][0].get("state") for m in mains] == ["Bay", "Tablet", None]
    # the select holding none of its cameras (another commander's, or none yet): its own
    assert mains[2]["conditions"][0]["state_not"] == ["Bay", "Tablet"]
    assert mains[2]["elements"][1]["tap_action"]["navigation_path"].endswith("/cam-bay")
    lit, opens = mains[0]["elements"]
    assert opens["tap_action"]["navigation_path"] == "/dashboard-cams/cam-bay"
    # Bay's own tile is outlined (the browser draws it) while Bay is the main camera
    assert lit["image"].endswith("#cm-highlight")
    assert lit["style"]["pointer-events"] == "none"
    assert lit["style"]["border"] == "2px solid #7bd1a0"


def test_commander_problems():
    store = commander_store()
    store["commanders"][0]["left"]["cameras"].append("camera.gone")
    store["commanders"][0]["main"] = "camera.elsewhere"
    store["commanders"][0]["top"]["size"] = 80
    store["commanders"][0]["bottom"]["cameras"].append("camera.a_low")
    found = " ".join(problems(store))
    assert "shows Bay in both its left and bottom panels" in found
    assert "camera.gone is not one of the cameras" in found
    assert "main camera must be one of its cameras" in found
    assert "top panel: size must be 0-45%" in found


def test_integration_chooses_the_main_camera(tmp_path):
    import threading
    import time
    from http.server import ThreadingHTTPServer

    from casa_mia.modules.compositor import Compositor
    from test_compositor import FakeHA as FakeCameras

    (tmp_path / "camera-dashboard-live.json").write_text(json.dumps(commander_store()))
    cameras = ThreadingHTTPServer(("127.0.0.1", 0), FakeCameras)
    threading.Thread(target=cameras.serve_forever, daemon=True).start()
    live = Compositor(
        tmp_path, f"http://127.0.0.1:{cameras.server_port}", "token", port=0
    )
    state = tmp_path / "state.json"
    cd = CameraDashboard(tmp_path, None, lambda: None, live=live, state_path=state)
    cd.start()
    live.start()
    try:
        first = cd.health()["commanders"][0]
        assert (first["id"], first["options"], first["main"]) == (
            "",
            ["Bay", "Tablet"],
            "Bay",
        )
        assert cd.health()["commander"] == first  # as an older integration reads it
        assert cd.control("commander", b'{"main": "Tablet"}') == 200
        assert cd.health()["commander"]["main"] == "Tablet"
        assert json.loads(state.read_text()) == {"mains": {"": "camera.b"}}
        assert cd.control("commander", b'{"main": "Nope"}') == 400
        base = f"http://127.0.0.1:{live.port}/g/cameras"
        with urllib.request.urlopen(base + ".jpg") as r:
            assert Image.open(io.BytesIO(r.read())).size == (1000, 500)
        again = CameraDashboard(
            tmp_path, None, lambda: None, live=live, state_path=state
        )
        live.mains = {}
        again.start()  # the choice is kept over a restart
        assert live.mains == {"": "camera.b"}
        state.write_text('{"main": "camera.a_low"}')  # kept before there were several
        again.start()
        assert live.mains == {"": "camera.a_low"}
    finally:
        live.stop()
        time.sleep(0.2)
        cameras.shutdown()
        cameras.server_close()


def test_commander_anchors():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

    one = {"cameras": ["camera.x"], "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 1000, "height": 500, "gap": 0}
    cmd["left"] = {**one, "size": 10}
    cmd["right"] = {**one, "size": 10}
    cmd["top"] = {**one, "size": 20, "anchor_left": True, "anchor_right": False}
    cmd["bottom"] = {**one, "size": 20, "anchor_left": False, "anchor_right": True}
    _, main, tiles = commander_layout(cmd)
    assert tiles["top"] == [(0, 0, 900, 100)]  # to the left edge, stopping at Right
    assert tiles["bottom"] == [(100, 400, 900, 100)]  # from Left, to the right edge
    assert tiles["left"] == [
        (0, 100, 100, 400)
    ]  # under the top, down to the view's foot
    assert tiles["right"] == [
        (900, 0, 100, 400)
    ]  # from the view's top, onto the bottom
    assert main == (100, 100, 800, 300)  # the middle is the same whatever the anchors


def test_a_choice_moves_the_preview_too(tmp_path):
    from casa_mia.modules.compositor import DRAFT_STORE, Compositor

    (tmp_path / DRAFT_STORE).write_text(json.dumps(commander_store()))  # nothing live
    draft = Compositor(tmp_path, "http://127.0.0.1:1", "t", port=0, store=DRAFT_STORE)
    cd = CameraDashboard(tmp_path, None, lambda: None, draft=draft)
    cd.start()
    draft.start()
    try:
        first = cd.health()["commanders"][0]
        assert (first["id"], first["options"], first["main"]) == (
            "",
            ["Bay", "Tablet"],
            "Bay",
        )
        assert cd.health()["commander"] == first  # as an older integration reads it
        assert cd.control("commander", b'{"main": "Tablet"}') == 200
        assert draft.main_camera(draft.cfg.commanders[0]) == "camera.b"
    finally:
        draft.stop()


def test_shapes_are_numbers_or_ratios():
    from casa_mia.modules.compositor import ratio

    assert ratio("16:9") == pytest.approx(16 / 9)
    assert ratio("4/3") == pytest.approx(4 / 3)
    assert ratio(1.85) == ratio("1.85") == 1.85
    for bad in ("wide", "0:1", "-2"):
        with pytest.raises((ValueError, ZeroDivisionError)):
            ratio(bad)


def test_main_camera_at_its_own_shape():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

    one = {"cameras": ["camera.x"], "size": 10, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 1000, "height": 500, "gap": 0}
    cmd |= {
        "main_fit": "own",
        "main_width": 50,
        "aspects": {"camera.a": 4 / 3, "camera.t": 9 / 16},
    }
    for panel in ("left", "right", "top", "bottom"):
        cmd[panel] = {**one, "anchor_left": False, "anchor_right": False}
    _, main, tiles = commander_layout(cmd, "camera.a")
    assert main == (
        250,
        62,
        500,
        375,
    )  # half the width, at 4:3; the panels take the rest
    assert tiles["left"][0][2] == 250 and tiles["top"][0][3] == 62
    _, main, tiles = commander_layout(
        cmd, "camera.t"
    )  # a tall one: smaller, same shape
    assert main[3] == 500 - 2 * 40 and main[2] == round(420 * 9 / 16)
    assert tiles["top"][0][3] == 40  # top and bottom keep 8% of the height each
    cmd |= {"main_fit": "fixed", "main_ratio": "2:1"}
    assert commander_layout(cmd, "camera.t")[1] == (250, 125, 500, 250)  # the shape set


def test_own_shape_gives_a_tap_zone_set_per_main_camera():
    store = commander_store()
    store["commanders"][0] |= {
        "main_fit": "own",
        "main_width": 60,
        "aspects": {"camera.a_low": 16 / 9, "camera.b": 4 / 3},
    }
    assert problems(store) == []
    landscape = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"][0]
    sets = landscape["sections"][0]["cards"][0]["elements"]
    assert [s["conditions"][0].get("state") for s in sets] == ["Bay", "Tablet", None]
    bay, tablet, _ = (s["elements"] for s in sets)
    assert bay[-1]["tap_action"]["navigation_path"].endswith("/cam-bay")  # the main one
    assert bay[0]["style"] != tablet[0]["style"]  # the panels moved with the shape


def test_saving_records_each_commander_cameras_shape(tmp_path):
    import types

    from casa_mia.modules.compositor import Config

    draft = types.SimpleNamespace(
        aspect=lambda e: {"camera.a_low": 1.3333}.get(e),
        reload=lambda: None,
        health=lambda: {"state": "running"},
        cfg=Config(),
    )
    cd = CameraDashboard(tmp_path, None, lambda: None, draft=draft)  # type: ignore[arg-type]
    cd.start()
    status, view = call(cd, "PUT", "", commander_store())
    assert status == 200
    assert view["store"]["commanders"][0]["aspects"] == {"camera.a_low": 1.3333}


def test_security_look_is_a_css_filter_and_follows_the_saved_draft(cd):
    _, view = call(cd, "GET", "")
    store = view["store"]
    store["look"]["css"] = "grayscale(1); background: url(x)"
    call(cd, "PUT", "", store)
    assert "not a CSS filter" in " ".join(problems(cd.store))
    tinted = "grayscale(1) sepia(1) hue-rotate(184deg) saturate(3) brightness(0.80)"
    store["look"]["css"] = tinted
    call(cd, "PUT", "", store)
    assert problems(cd.store) == [] and cd.health()["look_css"] == tinted  # once saved
    store["look"]["css"] = ""  # saved before looks had a filter: the default's
    call(cd, "PUT", "", store)
    assert cd.health()["look_css"].startswith("grayscale(1) sepia(1)")


def test_motion_sensors_by_device_then_by_name():
    from casa_mia.modules.camera_dashboard import motion_sensors

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


def test_motion_marks_the_commanders_cameras(tmp_path):
    import types

    seen = []
    comp = types.SimpleNamespace(
        cfg=types.SimpleNamespace(commanders=[{"left": {}}]),
        set_motion=lambda cams, cid: seen.append((cams, cid)),
    )
    cd = CameraDashboard(tmp_path, None, lambda: None, live=comp)  # type: ignore[arg-type]
    assert cd.control("motion", b'{"cameras": ["camera.a_low"]}') == 200
    assert cd.control("motion", b'{"cameras": [], "commander": "p1"}') == 200
    # no commander: every one's (an integration from before there were several)
    assert seen == [(frozenset({"camera.a_low"}), None), (frozenset(), "p1")]
    assert cd.control("motion", b'{"cameras": "nope"}') == 400


def test_highlight_settings_are_checked():
    store = commander_store()
    store["commanders"][0]["highlight"] = {
        "colour": "green",
        "width": -1,
        "style": "wobble",
    }
    found = " ".join(problems(store))
    assert "highlight colour must be like #7bd1a0" in found
    assert "highlight width must be 0 or more" in found
    assert "must breathe or ripple" in found


def test_the_page_flips_only_the_commanders_switches(cd):
    entity = "switch.camera_commander_track_motion"
    status, out = call(cd, "POST", "switch", {"entity": entity, "on": True})
    assert status == 200 and out == {"entity": entity, "on": True}
    assert cd.ha.sent[-1] == {
        "type": "call_service",
        "domain": "switch",
        "service": "turn_on",
        "target": {"entity_id": entity},
    }
    assert (
        call(cd, "POST", "switch", {"entity": "switch.kitchen", "on": True})[0] == 400
    )


def test_panel_rows_share_its_cameras():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

    cmd = {**EMPTY_COMMANDER, "width": 1000, "height": 500, "gap": 0}
    cams = [f"camera.{n}" for n in "abcde"]
    cmd["bottom"] = {"cameras": cams, "size": 20, "fit": "cover", "lines": 2}
    _, _, tiles = commander_layout(cmd)
    # 5 cameras in 2 rows: 3 then 2, each row spread across the full width
    assert tiles["bottom"] == [
        (0, 400, 333, 50),
        (333, 400, 334, 50),
        (667, 400, 333, 50),
        (0, 450, 500, 50),
        (500, 450, 500, 50),
    ]
    cmd["left"] = {"cameras": cams[:3], "size": 20, "fit": "cover", "lines": 5}
    _, _, tiles = commander_layout(cmd)
    assert len(tiles["left"]) == 3 and {t[3] for t in tiles["left"]} == {
        400
    }  # 3 columns


def test_a_hidden_panel_is_off_the_view():
    store = commander_store()
    store["commanders"][0]["bottom"]["hidden"] = True
    assert problems(store) == []
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    assert [v["path"] for v in views] == ["cameras", "cam-bay"]  # no Tablet page
    (card,) = views[0]["sections"][0]["cards"]
    taps = [e for e in card["elements"] if e["type"] == "image"]
    assert [t["tap_action"]["data"]["option"] for t in taps] == ["Bay"]
    from casa_mia.modules.compositor import commander_layout, config_from_store

    cfg = config_from_store(store)
    assert commander_layout(cfg.commanders[0])[2]["bottom"] == []  # takes no room
    assert store["commanders"][0]["bottom"]["cameras"] == ["camera.b"]  # kept
    store["commanders"][0]["left"]["hidden"] = True
    assert "has no cameras" in " ".join(problems(store))
    store["commanders"][0]["left"]["lines"] = 0
    assert "rows or columns must be 1-10" in " ".join(problems(store))


def test_several_commanders():
    store = commander_store()  # saved before there were several: its one is Cameras
    assert [c["name"] for c in store["commanders"]] == ["Cameras"]
    phone = {**store["commanders"][0], "name": "Phone", "id": "p1"}
    phone["left"] = {**phone["left"], "cameras": []}  # Tablet only
    store["commanders"].insert(0, phone)  # moved in front of Cameras
    assert problems(store) == []
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    assert [v["path"] for v in views] == ["phone", "cameras", "cam-tablet", "cam-bay"]
    picture = views[0]["sections"][0]["cards"][0]
    assert picture["image"] == "http://h:8099/g/phone.mjpg"
    # the shared select holding Bay (not Phone's): Phone shows its own, Tablet
    own = [e for e in picture["elements"] if e["type"] == "conditional"][-1]
    assert own["conditions"][0]["state_not"] == ["Tablet"]
    phone["page"] = False  # drawn, for elsewhere: no page of its own
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    assert [v["path"] for v in views] == ["cameras", "cam-tablet", "cam-bay"]
    phone["page"] = True
    # each commander's taps set its own Main camera select, as HA's registry has it
    registry = [
        {
            "platform": "casa_mia",
            "entity_id": "select.phone_main",
            "unique_id": "01ABC_commander_p1_main",
        }
    ]
    selects = commander_selects(store, registry)
    assert selects == {"p1": "select.phone_main", "": COMMANDER_SELECT}
    picture = build_dashboard(store, "http://h:8099", "d-c", selects)["views"][0]
    taps = picture["sections"][0]["cards"][0]["elements"]
    assert {e["conditions"][0]["entity"] for e in taps if "conditions" in e} == {
        "select.phone_main"
    }
    # not registered yet: the entity id the integration will give it
    assert (
        commander_selects(store, [])["p1"]
        == "select.camera_commander_phone_main_camera"
    )
    phone["id"] = ""
    assert any("share an id" in p for p in problems(store))
    phone["id"] = "p1"
    phone["name"] = "cameras!"  # the same page as Cameras
    assert any("clash" in p for p in problems(store))
    phone["name"] = " "
    assert any("needs a name" in p for p in problems(store))
    store["commanders"] = []
    assert "There must be at least one commander." in problems(store)


def test_each_commander_has_its_own_main_camera(tmp_path):
    from casa_mia.modules.compositor import DRAFT_STORE, Compositor

    store = commander_store()
    store["commanders"].append({**store["commanders"][0], "name": "Phone", "id": "p1"})
    (tmp_path / DRAFT_STORE).write_text(json.dumps(store))
    draft = Compositor(tmp_path, "http://127.0.0.1:1", "t", port=0, store=DRAFT_STORE)
    cd = CameraDashboard(tmp_path, None, lambda: None, draft=draft)
    cd.start()
    draft.start()
    try:
        assert [c["id"] for c in cd.health()["commanders"]] == ["", "p1"]
        body = b'{"main": "Tablet", "commander": "p1"}'
        assert cd.control("commander", body) == 200
        first, phone = draft.cfg.commanders
        assert draft.main_camera(phone) == "camera.b"
        assert draft.main_camera(first) == "camera.a_low"  # untouched
        assert cd.control("commander", b'{"main": "Tablet", "commander": "x"}') == 400
    finally:
        draft.stop()


def test_stacked_panels_keep_each_cameras_shape():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

    cmd = {**EMPTY_COMMANDER, "width": 1000, "height": 500, "gap": 0}
    cmd["aspects"] = {"camera.a": 2.0, "camera.b": 1.0}
    cmd["left"] = {"cameras": ["camera.a", "camera.b"], "size": 20, "fit": "stack"}

    def left(fit: str) -> list:
        cmd["left"]["fit"] = fit
        return commander_layout(cmd)[2]["left"]

    # 200 wide: a 2:1 camera is 100 tall, a square one 200; 200 spare at the far end
    assert left("stack") == [(0, 0, 200, 100), (0, 100, 200, 200)]
    assert left("reverse") == [(0, 200, 200, 100), (0, 300, 200, 200)]  # same order
    assert left("centre") == [(0, 100, 200, 100), (0, 200, 200, 200)]
    # too tall for the panel: all shrink alike, centred across it, never overrunning
    cmd["aspects"] = {"camera.a": 0.5, "camera.b": 0.5}
    tiles = left("reverse")
    assert all(t[2] == tiles[0][2] < 200 for t in tiles)
    assert tiles[0][1] >= 0 and tiles[-1][1] + tiles[-1][3] <= 500
