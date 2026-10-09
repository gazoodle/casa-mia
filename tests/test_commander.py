"""Camera Commander: the commanders, saved straight to the live compositor."""

import io
import json
import threading
import types
import urllib.request
from http.server import ThreadingHTTPServer

from PIL import Image

from casa_mia import swap
from casa_mia.modules.cameras import Cameras
from casa_mia.modules.commander import Commander
from casa_mia.modules.compositor import LIVE_STORE, Compositor, Config
from conftest import stop_compositor
from test_camera_dashboard import FakeHA, call, commander_store
from test_compositor import FakeHA as FakeCameras


def make(tmp_path, store=None, ha=None, **kw) -> Commander:
    """A Commander as on a box that had only the Camera Dashboard: its cameras and
    commanders moved from camera-dashboard.json."""
    (tmp_path / "camera-dashboard.json").write_text(
        json.dumps(store or commander_store())
    )
    cams = Cameras(tmp_path, ha)
    cams.start()
    cmd = Commander(tmp_path, ha, cams, kw.pop("lan", lambda: None), **kw)
    cmd.start()
    return cmd


def serve_cameras():
    cameras = ThreadingHTTPServer(("127.0.0.1", 0), FakeCameras)
    threading.Thread(target=cameras.serve_forever, daemon=True).start()
    return cameras


def stop(comp, cameras=None):
    stop_compositor(comp)
    if cameras:
        cameras.shutdown()
        cameras.server_close()


def test_the_first_start_moves_what_was_live(tmp_path):
    live = commander_store()
    draft = {**live, "commanders": [{**live["commanders"][0], "name": "Unfinished"}]}
    (tmp_path / "camera-dashboard-live.json").write_text(json.dumps(live))
    cmd = make(tmp_path, draft)  # the draft's experiments stay off the walls
    assert [c["name"] for c in cmd.store["commanders"]] == ["Cameras"]
    assert json.loads((tmp_path / "commanders.json").read_text()) == cmd.store
    # the live compositor's config: the commanders with the cameras they show
    written = json.loads((tmp_path / LIVE_STORE).read_text())
    assert set(written) == {"cameras", "commanders", "compositor_host"}
    assert written["cameras"] == cmd.cameras.cameras()


def test_save_shows_the_commanders_live_at_once(tmp_path):
    told = []
    reloads = []
    live = types.SimpleNamespace(
        aspect=lambda e: {"camera.a_low": 1.3333}.get(e),
        reload=lambda: reloads.append(1),
        health=lambda: {"state": "running"},
        gather=types.SimpleNamespace(flags={"live_main": False}),
        cfg=Config(),
        port=8099,
    )
    cmd = make(tmp_path, live=live)  # type: ignore[arg-type]
    cmd.listeners.append(lambda: told.append(1))
    store = cmd.view()["store"]
    store["commanders"][0]["name"] = "Hall"
    status, view = call(cmd, "PUT", "", store)
    assert status == 200 and view["store"]["commanders"][0]["name"] == "Hall"
    # each camera's natural shape, recorded from the compositor's stills
    assert view["store"]["commanders"][0]["aspects"] == {"camera.a_low": 1.3333}
    written = json.loads((tmp_path / LIVE_STORE).read_text())
    assert written["commanders"][0]["name"] == "Hall" and told and reloads
    store["commanders"][0]["left"]["cameras"] = []
    store["commanders"][0]["bottom"]["cameras"] = []
    status, out = call(cmd, "PUT", "", store)  # never a broken commander on the walls
    assert status == 400 and "no cameras" in out["error"]
    assert cmd.store["commanders"][0]["bottom"]["cameras"] == ["camera.b"]


def test_a_removed_camera_leaves_the_commanders(tmp_path):
    cmd = make(tmp_path)
    cameras = cmd.cameras.cameras()
    del cameras["camera.b"]
    cmd.cameras.save(cameras)
    assert cmd.store["commanders"][0]["bottom"]["cameras"] == []
    written = json.loads((tmp_path / LIVE_STORE).read_text())
    assert "camera.b" not in written["cameras"]


def test_live_previews(tmp_path):
    cameras = serve_cameras()
    live = Compositor(
        tmp_path, f"http://127.0.0.1:{cameras.server_port}", "token", port=0
    )
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
    cmd = make(tmp_path, store, live=live)
    live.start()

    def render(edits):
        body = json.dumps({"store": {"commanders": edits}}).encode()
        return cmd.handle("POST", "render", {}, body)

    edits = store["commanders"]
    try:
        status, ctype, body = render(edits)
        assert (status, ctype) == (200, "image/webp")  # fit: clear borders possible
        # its own size: always the default
        assert Image.open(io.BytesIO(body)).size == (1920, 1080)
        edits[0]["width"] = 800  # a size from before: no longer set here
        assert Image.open(io.BytesIO(render(edits)[2])).size == (1920, 1080)
        edits[0]["left"]["cameras"] = edits[0]["bottom"]["cameras"] = []
        status, _, body = render(edits)
        assert status == 422 and b"no cameras" in body
    finally:
        stop(live, cameras)


def test_integration_chooses_the_main_camera(tmp_path):
    cameras = serve_cameras()
    live = Compositor(
        tmp_path, f"http://127.0.0.1:{cameras.server_port}", "token", port=0
    )
    state = tmp_path / "state.json"
    cmd = make(tmp_path, live=live, state_path=state)
    live.start()
    try:
        # One reading: the live compositor runs, so a second may differ.
        health = cmd.health()
        first = health["commanders"][0]
        assert (first["id"], first["options"], first["main"]) == (
            "",
            ["Bay", "Tablet"],
            "Bay",
        )
        assert health["commander"] == first  # as an older integration reads it
        assert cmd.control("main", b'{"main": "Tablet"}') == 200
        assert cmd.health()["commander"]["main"] == "Tablet"
        assert json.loads(state.read_text()) == {"mains": {"": "camera.b"}}
        assert cmd.control("main", b'{"main": "Nope"}') == 400
        # an integration from before posts to /camera-dashboard/commander
        assert cmd.control("commander", b'{"main": "Bay"}') == 200
        assert cmd.control("main", b'{"main": "Tablet"}') == 200
        base = f"http://127.0.0.1:{live.port}/g/cameras"
        with urllib.request.urlopen(base + ".jpg") as r:
            # its own size: always the default
            assert Image.open(io.BytesIO(r.read())).size == (1920, 1080)
        again = Commander(
            tmp_path, None, cmd.cameras, lambda: None, live=live, state_path=state
        )
        live.mains = {}
        again.start()  # the choice is kept over a restart
        assert live.mains == {"": "camera.b"}
        state.write_text('{"main": "camera.a_low"}')  # kept before there were several
        again.start()
        assert live.mains == {"": "camera.a_low"}
    finally:
        stop(live, cameras)


def test_motion_is_the_cards_now(tmp_path):
    """The card marks motion from the sensors; an older integration still posting it is
    told all is well, and nothing is drawn."""
    cmd = make(tmp_path)
    assert cmd.control("motion", b'{"cameras": ["camera.a_low"]}') == 204


def test_the_page_flips_only_the_commanders_switches(tmp_path):
    cmd = make(tmp_path, ha=FakeHA())
    entity = "switch.camera_commander_track_motion"
    status, out = call(cmd, "POST", "switch", {"entity": entity, "on": True})
    assert status == 200 and out == {"entity": entity, "on": True}
    assert cmd.ha.sent[-1] == {  # type: ignore[union-attr]
        "type": "call_service",
        "domain": "switch",
        "service": "turn_on",
        "target": {"entity_id": entity},
    }
    assert (
        call(cmd, "POST", "switch", {"entity": "switch.kitchen", "on": True})[0] == 400
    )


def test_each_commander_has_its_own_main_camera(tmp_path, monkeypatch):
    store = commander_store()
    store["commanders"].append({**store["commanders"][0], "name": "Phone", "id": "p1"})
    live = Compositor(tmp_path, "http://127.0.0.1:1", "t", port=0)
    cmd = make(
        tmp_path,
        store,
        live=live,
        lan=lambda: "10.0.0.2",
        dashboard=lambda: "dashboard-cams",
    )
    live.start()
    try:
        assert [c["id"] for c in cmd.health()["commanders"]] == ["", "p1"]
        # what the Camera Commander card draws it from (its select's `card` attribute)
        card = cmd.health()["commanders"][1]["card"]
        assert card["picture"] == f"http://10.0.0.2:{live.port}/g/phone.mjpg"
        assert card["live_main"] is True  # the compositor's switch, on by default
        monkeypatch.setattr(swap, "stamp", lambda: "1")  # the screenshot swap on: off
        assert cmd.health()["commanders"][1]["card"]["live_main"] is False
        monkeypatch.undo()
        assert card["cameras"]["camera.b"] == {
            "title": "Tablet",
            "live": "/dashboard-cams/cam-tablet",
            "channels": [["camera.b", 0, 0]],  # each channel, its size not known yet
        }
        assert card["layout"]["main_fit"] == "fit" and "left" in card["layout"]
        body = b'{"main": "Tablet", "commander": "p1"}'
        assert cmd.control("main", body) == 200
        first, phone = live.cfg.commanders
        assert live.main_camera(phone) == "camera.b"
        assert live.main_camera(first) == "camera.a_low"  # untouched
        assert cmd.control("main", b'{"main": "Tablet", "commander": "x"}') == 400
        # with no camera dashboard, no camera has a live page to open
        cmd.dashboard = lambda: None
        card = cmd.health()["commanders"][1]["card"]
        assert card["cameras"]["camera.b"]["live"] == ""
    finally:
        stop(live)


def test_a_change_to_live_main_tells_the_integration_at_once(tmp_path, monkeypatch):
    from casa_mia.modules import guest_login

    fired: list[str] = []
    monkeypatch.setenv("SUPERVISOR_TOKEN", "t")
    monkeypatch.setattr(
        guest_login, "fire_event", lambda t, name, d: fired.append(name)
    )
    live = types.SimpleNamespace(
        gather=types.SimpleNamespace(flags={"live_main": True}), reload=lambda: None
    )
    cams = Cameras(tmp_path, None)
    cmd = Commander(tmp_path, None, cams, lambda: "10.0.0.2", live=live)  # type: ignore[arg-type]
    assert cmd.check_live_main() and not fired  # the first look: nothing to tell
    assert not cmd.check_live_main()
    monkeypatch.setattr(swap, "stamp", lambda: "1")  # the swap on: off
    assert cmd.check_live_main() and fired == ["casa_mia_settings_changed"]
    monkeypatch.setattr(swap, "stamp", lambda: "")
    live.gather.flags["live_main"] = False  # the swap off, the switch off: still off
    assert not cmd.check_live_main() and len(fired) == 1
    live.gather.flags["live_main"] = True
    assert cmd.check_live_main() and len(fired) == 2
