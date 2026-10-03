import io
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from PIL import Image

from casa_mia.ha import HAError
from casa_mia.modules.camera_dashboard import (
    CameraDashboard,
    build_dashboard,
    ha_cameras,
    import_legacy,
    problems,
    to_yaml,
    warnings,
)
from casa_mia.modules.compositor import load_config

# tablet-provision's generator and the dashboard it made, the one live today. Only on
# the author's machine (it names the house's cameras and users), so skipped elsewhere.
LEGACY = Path(__file__).parents[2] / "tablet-provision" / "composite-test"

GROUPS = {
    "Shed": [
        {"entity": "camera.a_low", "title": "Bay"},
        {"entity": "camera.b", "title": "Tablet", "live": "picture-entity"},
    ],
    "Wall": {
        "cameras": [{"entity": "camera.a_low", "title": "Bay"}],
        "tile": [320, 180],
    },
    "_overview": {
        "width": 640,
        "gap": 8,
        "cell_aspect": 1.7,
        "strip_aspect": 1.5,
        "rows": [{"groups": ["Shed"]}],
    },
}
ENTITIES = {"camera.a_low": {"medium": "camera.a_med", "high": "camera.a_high"}}
DASH = {
    "dash": "dashboard-cams",
    "wall_users": ["u1"],
    "live_card": "webrtc-camera",
    "hi_live_card": "advanced-camera-card",
    "ptz": {
        "Bay": {
            "device_id": "d1",
            "presets": ["Door", {"preset": "Home", "label": "Home view"}],
        }
    },
    "gates": {
        "cameras": ["Bay"],
        "groups": ["Shed"],
        "controls": [{"entity": "button.gate"}],
    },
    "lights": {
        "controls": {"l": {"entity": "light.bay", "name": "Bay"}},
        "pages": {"Shed": ["l"]},
    },
}


@pytest.mark.skipif(not LEGACY.is_dir(), reason="tablet-provision is not alongside")
def test_rebuilds_the_live_dashboard_exactly():
    def read(name):
        return json.loads((LEGACY / name).read_text())

    store = import_legacy(
        read("groups.json"), read("entities.json"), read("dashboard_config.json")
    )
    assert problems(store) == []
    live = (LEGACY / "dashboard.yaml").read_text()
    host = re.search(r"image: (http://[^/]+)/g/", live)
    assert host, "no composite address in dashboard.yaml"
    built = build_dashboard(store, host[1], "dashboard-cameras")
    assert to_yaml(built) == live


def test_import_and_build():
    store = import_legacy(GROUPS, ENTITIES, DASH)
    assert problems(store) == []
    assert store["groups"]["Wall"]["menu"] is False
    bay = store["cameras"]["camera.a_low"]
    assert bay["ptz"]["data"] == {"device_id": "d1"}
    assert bay["controls"] == [{"entity": "button.gate"}]
    assert store["groups"]["Shed"]["controls"] == [
        {"entity": "button.gate"},
        {"entity": "light.bay", "name": "Bay"},
    ]
    views = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"]
    # overview, the one menu group (not the wall), then each of its cameras
    assert [v["path"] for v in views] == [
        "cameras",
        "cameras-shed",
        "cam-bay",
        "cam-tablet",
    ]
    zones = views[1]["sections"][0]["cards"][0]["elements"]
    assert [z["tap_action"]["navigation_path"] for z in zones] == [
        "/dashboard-cams/cam-bay",
        "/dashboard-cams/cam-tablet",
    ]
    bay_view, tablet_view = views[2], views[3]
    cards = bay_view["sections"][0]["cards"]
    assert [c["type"] for c in cards] == [
        "custom:webrtc-camera",
        "custom:advanced-camera-card",
    ]
    presets = bay_view["sections"][1]["cards"]
    assert [p["name"] for p in presets] == ["Door", "Home view"]
    assert presets[1]["tap_action"]["data"] == {"device_id": "d1", "preset": "Home"}
    assert tablet_view["sections"][0]["cards"][0]["type"] == "picture-entity"


def test_problems_are_found():
    store = import_legacy(GROUPS, ENTITIES, DASH)
    store["dashboard"] = "Cameras"
    store["groups"]["Shed"]["cameras"].append("camera.gone")
    store["groups"]["Shed!"] = {"cameras": ["camera.b"]}
    store["overview"]["rows"].append({"strip": ["Nope"]})
    found = " ".join(problems(store))
    assert "hyphen" in found
    assert "camera.gone is not one of the cameras" in found
    assert "'Shed' and 'Shed!' clash" in found
    assert "missing 'Nope'" in found


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

    def call(self, *commands):
        out = []
        for c in commands:
            self.sent.append(c)
            if c["type"] == "lovelace/dashboards/list":
                out.append([{"url_path": u} for u in self.boards])
            elif c["type"] == "lovelace/dashboards/create":
                self.boards[c["url_path"]] = None
            elif c["type"] == "lovelace/config":
                if self.boards.get(c["url_path"]) is None:
                    raise HAError("config_not_found")
                out.append(self.boards[c["url_path"]])
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
    (tmp_path / "groups.json").write_text(json.dumps(GROUPS))
    (tmp_path / "entities.json").write_text(json.dumps(ENTITIES))
    (tmp_path / "dashboard_config.json").write_text(json.dumps(DASH))
    cd = CameraDashboard(tmp_path, FakeHA(), lambda: "10.0.0.2")  # type: ignore[arg-type]
    cd.start()
    return cd


def test_first_start_imports_into_draft_and_live(cd, tmp_path):
    assert (tmp_path / "camera-dashboard.json").exists()
    assert load_config(tmp_path).groups["Shed"]["menu"] is True  # the live store
    assert cd.health()["changed"] is False
    assert cd.health()["deployed"] is None  # imported, not deployed


def test_edit_preview_then_deploy(cd, tmp_path):
    status, view = call(cd, "GET", "")
    store = view["store"]
    store["groups"]["Shed"]["cameras"].reverse()
    status, view = call(cd, "PUT", "", store)
    assert status == 200 and view["changed"] is True
    # the live compositor still draws what was deployed
    assert (
        load_config(tmp_path).groups["Shed"]["cameras"][0]["entity"] == "camera.a_low"
    )

    status, out = call(cd, "POST", "deploy", {"target": "preview"})
    assert status == 200 and out["url_path"] == "dashboard-cams-preview"
    preview = cd.ha.boards["dashboard-cams-preview"]
    assert "http://10.0.0.2:8098/g/overview.mjpg" in json.dumps(preview)
    assert "/dashboard-cams-preview/cameras-shed" in json.dumps(preview)
    assert out["changed"] is True  # a preview changes nothing live

    status, out = call(cd, "POST", "deploy", {"target": "live"})
    assert status == 200 and out["changed"] is False and out["deployed"]
    assert "http://10.0.0.2:8099/g/overview.mjpg" in json.dumps(
        cd.ha.boards["dashboard-cams"]
    )
    assert load_config(tmp_path).groups["Shed"]["cameras"][0]["entity"] == "camera.b"
    # what it replaced was kept, and can be put back
    status, out = call(cd, "GET", "backups")
    (kept,) = out["backups"]
    assert kept["url_path"] == "dashboard-cams"
    call(cd, "POST", "restore", {"name": kept["name"]})
    assert cd.ha.boards["dashboard-cams"] == {"views": ["old"]}


def test_save_drops_page_controls_with_no_entity(cd):
    _, view = call(cd, "GET", "")
    store = view["store"]
    store["groups"]["Shed"]["controls"] = [{"entity": " "}]
    store["cameras"]["camera.a_low"]["controls"].append({"entity": "", "name": "x"})
    _, view = call(cd, "PUT", "", store)
    assert "controls" not in view["store"]["groups"]["Shed"]
    assert view["store"]["cameras"]["camera.a_low"]["controls"] == [
        {"entity": "button.gate"}
    ]


def test_refuses_to_deploy_a_broken_store(cd):
    _, view = call(cd, "GET", "")
    view["store"]["groups"]["Shed"]["cameras"] = []
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
    assert b"http://10.0.0.2:8099/g/Shed.mjpg" in body


def test_starts_empty_without_old_files(tmp_path):
    cd = CameraDashboard(tmp_path, None, lambda: None)
    cd.start()
    assert (
        cd.health()["groups"] == 0 and not (tmp_path / "camera-dashboard.json").exists()
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

    def render(store, name, portrait=False):
        body = json.dumps({"store": store, "name": name, "portrait": portrait})
        return cd.handle("POST", "render", {}, body.encode())

    store = {
        "cameras": {"camera.a": {"title": "A"}, "camera.b": {"title": "B"}},
        "groups": {"Orchard Walk": {"cameras": ["camera.a", "camera.b"]}},
        "overview": {**GROUPS["_overview"], "rows": [{"groups": ["Orchard Walk"]}]},
    }
    try:
        status, ctype, body = render(store, "Orchard Walk")
        assert (status, ctype) == (200, "image/jpeg")
        assert Image.open(io.BytesIO(body)).size == (
            1280,
            340,
        )  # two tiles side by side
        store["groups"]["Orchard Walk"]["tile"] = [320, 180]  # an edit, not saved
        assert Image.open(io.BytesIO(render(store, "Orchard Walk")[2])).size == (
            640,
            180,
        )
        assert render(store, "overview")[0] == 200
        assert render(store, "Nope")[0] == 404
        status, ctype, body = cd.handle("GET", "thumb/camera.a", {}, b"")
        assert (status, ctype) == (200, "image/jpeg") and body[:2] == b"\xff\xd8"
        assert cd.handle("GET", "thumb/..%2Fetc", {}, b"")[0] == 400
        store["groups"]["Orchard Walk"]["cameras"] = []
        status, _, body = render(store, "Orchard Walk")
        assert status == 422 and b"no cameras" in body
    finally:
        draft.stop()
        time.sleep(0.2)
        cameras.shutdown()
        cameras.server_close()


def test_warns_about_what_ha_lacks():
    store = import_legacy(GROUPS, ENTITIES, DASH)
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
    assert any("nav_back_helper.js" in w for w in found)


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


def commander_store():
    store = import_legacy(GROUPS, ENTITIES, DASH)
    store["overview_mode"] = "commander"
    store["commander"] = {
        "width": 1000,
        "height": 500,
        "gap": 0,
        "main": "",
        "left": {"cameras": ["camera.a_low"], "size": 10, "fit": "cover"},
        "top": {"cameras": [], "size": 20, "fit": "cover"},
        "right": {"cameras": [], "size": 10, "fit": "cover"},
        "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
    }
    return store


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
    landscape, portrait = views[0]["sections"][0]["cards"]
    assert landscape["image"] == "http://h:8099/g/commander.mjpg"
    assert portrait["image"] == "http://h:8099/g/overview.mjpg?layout=portrait"
    taps = [e for e in landscape["elements"] if e["type"] == "image"]
    assert [t["tap_action"]["data"]["option"] for t in taps] == ["Bay", "Tablet"]
    mains = [e for e in landscape["elements"] if e["type"] == "conditional"]
    assert [m["conditions"][0]["state"] for m in mains] == ["Bay", "Tablet"]
    assert (
        mains[0]["elements"][0]["tap_action"]["navigation_path"]
        == "/dashboard-cams/cam-bay"
    )


def test_commander_problems():
    store = commander_store()
    store["commander"]["left"]["cameras"].append("camera.gone")
    store["commander"]["main"] = "camera.elsewhere"
    store["commander"]["top"]["size"] = 80
    store["commander"]["bottom"]["cameras"].append("camera.a_low")
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
        assert cd.health()["commander"] == {"options": ["Bay", "Tablet"], "main": "Bay"}
        assert cd.control("commander", b'{"main": "Tablet"}') == 200
        assert cd.health()["commander"]["main"] == "Tablet"
        assert json.loads(state.read_text()) == {"main": "camera.b"}
        assert cd.control("commander", b'{"main": "Nope"}') == 400
        base = f"http://127.0.0.1:{live.port}/g/commander"
        with urllib.request.urlopen(base + ".jpg") as r:
            assert Image.open(io.BytesIO(r.read())).size == (1000, 500)
        with pytest.raises(urllib.error.HTTPError):
            urllib.request.urlopen(base + ".jpg?layout=portrait")  # landscape only
        again = CameraDashboard(
            tmp_path, None, lambda: None, live=live, state_path=state
        )
        live.main = None
        again.start()  # the choice is kept over a restart
        assert live.main == "camera.b"
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
        assert cd.health()["commander"] == {"options": ["Bay", "Tablet"], "main": "Bay"}
        assert cd.control("commander", b'{"main": "Tablet"}') == 200
        assert draft.main_camera() == "camera.b"
    finally:
        draft.stop()
