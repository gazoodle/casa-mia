import asyncio
import io
import json
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from PIL import Image

from casa_mia.modules.compositor import LIVE_STORE, Compositor, Sending


async def gather_round(comp) -> None:
    """One round of a compositor's commanders: what it wants, fetched by its gatherer."""
    comp._want(comp.cfg.commanders)
    g = comp.gather
    g.uses = g._wants[comp.store][1]
    g._survey(list(g.uses))
    await asyncio.gather(*(g._once(e) for e in g.uses))


def jpeg(colour: str = "red") -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (160, 90), colour).save(out, "JPEG")
    return out.getvalue()


def write_config(directory):
    """A live store: the commander, Garage on the left and Pool along the bottom."""
    (directory / LIVE_STORE).write_text(
        json.dumps(
            {
                "cameras": {"camera.a": {"title": "A"}, "camera.b": {"title": "B"}},
                "commander": {
                    "width": 640,
                    "height": 360,
                    "gap": 0,
                    "left": {"cameras": ["camera.a"], "size": 20, "fit": "cover"},
                    "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
                },
            }
        )
    )


class FakeHA(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.end_headers()
        self.wfile.write(jpeg("blue"))

    def log_message(self, *args):
        pass


@pytest.fixture
def compositor(tmp_path):
    write_config(tmp_path)
    ha = ThreadingHTTPServer(("127.0.0.1", 0), FakeHA)
    threading.Thread(target=ha.serve_forever, daemon=True).start()
    comp = Compositor(tmp_path, f"http://127.0.0.1:{ha.server_port}", "token", port=0)
    comp.start()
    yield comp
    comp.stop()
    time.sleep(0.2)
    ha.shutdown()
    ha.server_close()


def test_serves_the_commander(compositor):
    assert compositor.health()["state"] == "running"
    assert compositor.health()["cameras"] == 2
    base = f"http://127.0.0.1:{compositor.port}"
    with urllib.request.urlopen(f"{base}/g/commander.jpg") as r:  # before several
        assert r.status == 200
    with urllib.request.urlopen(f"{base}/g/cameras.jpg") as r:
        assert r.headers["Content-Type"] == "image/webp"  # fit: clear borders possible
        assert Image.open(io.BytesIO(r.read())).size == (
            1920,
            1080,
        )  # its own size: always the default
    # a card asks for exactly its size (device pixels); out of bounds: its own size
    for asked, drawn in (
        ("w=800&h=1280&dpr=2", (800, 1280)),
        ("w=9&h=9", (1920, 1080)),
    ):
        with urllib.request.urlopen(f"{base}/g/cameras.jpg?{asked}") as r:
            assert Image.open(io.BytesIO(r.read())).size == drawn
    # the admin page's view: each picture drawn (own size, and the size a card asked)
    status = compositor.status()
    assert {(p["width"], p["height"], p["asked"]) for p in status["pictures"]} == {
        (1920, 1080, False),
        (800, 1280, True),
    }
    assert {s["title"] for s in compositor.gather.status()["channels"]} == {"A", "B"}
    with urllib.request.urlopen(f"{base}/size-test") as r:  # the end-to-end size page
        assert b"askFor" in r.read() and r.headers["Content-Type"].startswith(
            "text/html"
        )
    for gone in ("nope", "overview"):  # nothing else, groups and overviews are gone
        with pytest.raises(urllib.error.HTTPError) as err:
            urllib.request.urlopen(f"{base}/g/{gone}.jpg")
        assert err.value.code == 404


def test_no_config_is_unconfigured(tmp_path):
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0)
    comp.start()
    try:
        assert comp.health()["state"] == "unconfigured"
    finally:
        comp.stop()


def test_keeps_the_latest_still_of_every_camera(tmp_path):
    write_config(tmp_path)
    ha = ThreadingHTTPServer(("127.0.0.1", 0), FakeHA)
    threading.Thread(target=ha.serve_forever, daemon=True).start()
    comp = Compositor(
        tmp_path,
        f"http://127.0.0.1:{ha.server_port}",
        "token",
        port=0,
        prewarm=False,
        keep_stills=60,
    )
    comp.start()
    try:
        # "(Waiting …)" for each at once; the first kept stills come unasked
        assert set(comp.gather.shots) == {"camera.a", "camera.b"}
        for _ in range(50):
            if not comp.gather._waiting:
                break
            time.sleep(0.05)
        assert not comp.gather._waiting
        assert comp.gather.res["camera.a"] == (160, 90)  # its size, as it came
        thumb = comp.still("camera.a", 160)
        assert thumb and Image.open(io.BytesIO(thumb)).size == (160, 90)
        assert comp.still("camera.a", 160) is thumb  # resized once per still
    finally:
        comp.stop()
        time.sleep(0.2)
        ha.shutdown()
        ha.server_close()


def test_unconfigured_says_what_it_needs(tmp_path):
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0, needs="a deploy")
    comp.start()
    try:
        assert comp.health()["state"] == "unconfigured"
        assert comp.health()["needs"] == "a deploy"
    finally:
        comp.stop()


def alpha(img: Image.Image, xy: tuple[int, int]) -> int:
    """How opaque one pixel is: 0 clear, 255 solid."""
    value = img.getchannel("A").getpixel(xy)
    assert isinstance(value, int)
    return value


def test_gaps_are_transparent():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander, commander_layout

    one = {"cameras": ["camera.a"], "size": 20, "fit": "contain"}
    cmd = {**EMPTY_COMMANDER, "width": 400, "height": 200, "gap": 4, "bottom": one}
    _, (mx, my, mw, mh), _ = commander_layout(cmd)
    pic = Image.open(
        io.BytesIO(commander(cmd, {}, {"camera.a": jpeg()}, "camera.a", None))
    )
    rgba = pic.convert("RGBA")
    assert pic.format == "WEBP"
    assert alpha(rgba, (5, my + mh + 1)) == 0  # between the main area and the panel
    assert alpha(rgba, (mx + 2, my + 2)) == 255  # the main area stays black
    # a name bar shades the tile under it, never makes it see-through
    _, _, rects = commander_layout(cmd)
    x, y, w, h = rects["bottom"][0]
    assert alpha(rgba, (x + w // 2, y + h - 5)) == 255


def test_main_cameras_borders_are_transparent():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander, commander_layout

    # A 16:9 camera fitted whole into a wide main area: clear either side of it
    cmd = {**EMPTY_COMMANDER, "width": 800, "height": 200, "gap": 0}
    cmd["bottom"] = {"cameras": ["camera.a"], "size": 20, "fit": "cover"}
    _, (mx, my, mw, mh), _ = commander_layout(cmd)
    pic = Image.open(io.BytesIO(commander(cmd, {}, {}, "camera.a", jpeg())))
    assert pic.format == "WEBP"  # fit: always with clear parts, whichever camera
    rgba = pic.convert("RGBA")
    assert alpha(rgba, (mx + 2, my + mh // 2)) == 0  # the border beside the camera
    assert alpha(rgba, (mx + mw // 2, my + mh // 2)) == 255  # the camera itself
    # crop fills the area, and no gap: nothing clear, so JPEG
    pic = Image.open(
        io.BytesIO(commander({**cmd, "main_fit": "crop"}, {}, {}, "camera.a", jpeg()))
    )
    assert pic.format == "JPEG"


def test_stale_pictures_are_marked():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander

    one = {"cameras": ["camera.a"], "size": 20, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 640, "height": 360, "gap": 0, "bottom": one}
    still: dict[str, bytes | None] = {"camera.a": jpeg("red")}
    fresh = commander(cmd, {}, still, "camera.a", jpeg("blue"))
    old = commander(
        cmd, {}, still, "camera.a", jpeg("blue"), stale=frozenset({"camera.a"})
    )
    assert fresh != old


def test_a_camera_that_keeps_missing_sits_out(tmp_path):
    import asyncio

    from casa_mia.modules import compositor as mod

    write_config(tmp_path)
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0)
    comp.cfg = mod.load_config(tmp_path)
    comp.gather.configure(comp.store, comp.cfg)
    asked: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        return None if entity == "camera.b" else jpeg()

    comp.gather._fetch_now = fetch  # type: ignore[method-assign]

    async def rounds(n):
        for _ in range(n):
            await gather_round(comp)

    asyncio.run(rounds(mod.STRIKES))
    assert "camera.b" in comp.gather._benched and asked.count("camera.b") == mod.STRIKES
    asked.clear()
    asyncio.run(rounds(1))
    assert "camera.b" not in asked and "camera.a" in asked  # sitting out
    comp.gather._benched["camera.b"] = 0  # its time is up
    asyncio.run(rounds(1))
    assert "camera.b" in asked and "camera.b" not in comp.gather._benched
    # its picture never came, and camera.a's is cached
    assert "camera.a" in comp.gather.shots
    # Home Assistant down (no camera answers): nobody's fault, nobody sits out
    comp.gather._benched.clear()
    comp.gather._misses.clear()
    comp.gather._answered = 0.0  # the last answer long ago
    comp.gather._fetch_now = lambda entity: asyncio.sleep(0)  # type: ignore[method-assign,assignment]
    asyncio.run(rounds(mod.STRIKES + 1))
    assert not comp.gather._benched and not comp.gather._misses


def test_gathers_only_while_watched_and_serves_at_once_after(tmp_path, monkeypatch):
    from casa_mia.modules import compositor as mod

    monkeypatch.setattr(mod, "LINGER", 0.1)
    monkeypatch.setattr(mod, "INTERVAL", 0.1)
    write_config(tmp_path)
    ha = ThreadingHTTPServer(("127.0.0.1", 0), FakeHA)
    threading.Thread(target=ha.serve_forever, daemon=True).start()
    comp = Compositor(
        tmp_path, f"http://127.0.0.1:{ha.server_port}", "token", port=0, prewarm=False
    )
    comp.start()
    url = f"http://127.0.0.1:{comp.port}/g/cameras.jpg"
    try:
        assert comp.health()["gathering"] is False  # nobody watching: nothing fetched
        urllib.request.urlopen(url).close()
        assert comp.gather.shots  # the first round was awaited: the cache was empty
        for _ in range(200):
            if not comp.health()["gathering"] and comp._pictures:
                break
            time.sleep(0.02)
        assert comp.health()["gathering"] is False  # stopped once nobody watched
        start = time.monotonic()
        with urllib.request.urlopen(url) as r:  # after a quiet spell: from the cache
            assert Image.open(io.BytesIO(r.read())).size == (1920, 1080)
        assert time.monotonic() - start < 1
    finally:
        comp.stop()
        time.sleep(0.2)
        ha.shutdown()
        ha.server_close()


def test_changing_picture_is_drawn_from_what_is_to_hand():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander

    one = {"cameras": ["camera.a", "camera.b"], "size": 20, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 640, "height": 360, "gap": 0, "bottom": one}
    still: dict[str, bytes | None] = {"camera.a": jpeg("red"), "camera.b": jpeg("blue")}
    sharp = commander(cmd, {}, still, "camera.b", jpeg("blue"))
    quick = commander(cmd, {}, still, "camera.b", jpeg("blue"), changing=True)
    assert Image.open(io.BytesIO(quick)).size == (640, 360) and quick != sharp


def test_a_size_asked_for_grows_gap_and_text_by_the_screens_scale():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, asked_size, sized

    assert asked_size({"w": "1280", "h": "800", "dpr": "1.5"}) == (1280, 800, 1.5)
    for nonsense in (
        {},
        {"w": "x", "h": "1"},
        {"w": "50", "h": "800"},
        {"w": "9000", "h": "9000"},
    ):
        assert asked_size(nonsense) is None
    cmd = sized({**EMPTY_COMMANDER, "gap": 4}, (1280, 800, 1.5))
    assert (cmd["width"], cmd["height"], cmd["gap"], cmd["scale"]) == (
        1280,
        800,
        6,
        1.5,
    )
    assert cmd["view"] == "cameras@1280x800x1.5"


def test_a_kept_still_has_its_real_age(tmp_path):
    # The draft compositor's first picture may come from the kept stills (every 60 s):
    # their age is known, so a fresh one is not marked Stale.
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "t", port=0)
    comp.gather.shots["camera.a"] = (time.monotonic() - 10, jpeg())
    image, age = comp.gather.pick("camera.a")
    assert image and 9 < age < 11
    assert comp.gather.pick("camera.b") == (None, float("inf"))


def test_the_pages_controls_restart_flush_and_forget(compositor):
    from casa_mia.modules.compositor import admin_api, control

    api = admin_api(compositor, None, lambda: "10.0.0.2")
    base = f"http://127.0.0.1:{compositor.port}"
    urllib.request.urlopen(f"{base}/g/cameras.jpg").read()  # something cached
    both = json.loads(api("GET", "", {}, b"")[2])
    status = both["live"]
    assert both["gatherer"]["channels"] and status["pictures"]
    assert status["size_test"] == f"http://10.0.0.2:{compositor.port}/size-test"
    # a cached picture as a thumbnail, whole or cut to 16:9; the stages paused and run
    code, kind, thumb = api("GET", "thumb/camera.a", {"w": ["120"], "whole": ["1"]}, b"")
    assert (code, kind) == (200, "image/jpeg") and Image.open(io.BytesIO(thumb)).width == 120
    assert api("GET", "thumb/camera.none", {}, b"")[0] == 404
    paused = json.loads(api("POST", "live/server/pause", {}, b"")[2])
    assert paused["live"]["server_paused"] and not paused["live"]["generator_paused"]
    assert json.loads(api("POST", "gatherer/pause", {}, b"")[2])["gatherer"]["paused"]
    api("POST", "gatherer/run", {}, b"")
    api("POST", "live/server/run", {}, b"")
    assert api("POST", "draft/server/pause", {}, b"")[0] == 404  # no draft here
    # one channel's picture purged: "(Waiting …)" again (its size kept); the rest kept
    out = json.loads(api("POST", "live/forget", {}, b'{"camera": "camera.a"}')[2])
    waiting = {s["camera"] for s in out["gatherer"]["channels"] if s["waiting"]}
    assert "camera.a" in waiting
    assert api("POST", "live/forget", {}, b"{}")[0] == 400
    # flushed: every channel waiting again, nothing drawn kept; drawn afresh when asked
    out = json.loads(api("POST", "live/flush", {}, b"")[2])
    assert all(s["waiting"] for s in out["gatherer"]["channels"])
    assert not out["live"]["pictures"]
    assert api("POST", "draft/flush", {}, b"")[0] == 404  # no draft engine here
    # restarted (the integration's button): serving again, on the same port
    assert control(compositor, None)("restart", b"") == 200
    with urllib.request.urlopen(f"{base}/g/cameras.jpg") as r:
        assert r.status == 200
    assert control(compositor, None)("flush", b'{"which": "live"}') == 200


def rgb(img: Image.Image, at: tuple[int, int]) -> tuple[int, ...]:
    pixel = img.getpixel(at)
    assert isinstance(pixel, tuple)
    return pixel


def test_debug_overlay_dims_and_marks_the_true_edges():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander

    cmd = {**EMPTY_COMMANDER, "width": 400, "height": 200, "gap": 0, "main_fit": "crop"}
    cmd["bottom"] = {"cameras": ["camera.a"], "size": 20, "fit": "cover"}
    white = io.BytesIO()
    Image.new("RGB", (160, 90), "white").save(white, "JPEG")
    on = {"on": True, "dim": 20, "colour": "#ff0000", "width": 4, "corner": 40}
    pic = Image.open(
        io.BytesIO(
            commander({**cmd, "debug": on}, {}, {}, "camera.a", white.getvalue())
        )
    ).convert("RGB")
    r, g, b = rgb(pic, (20, 2))  # along the top-left L
    assert r > 200 and g < 60 and b < 60
    r, g, b = rgb(pic, (200, 20))  # the main camera, white dimmed to ~20%
    assert 30 < r < 80 and abs(r - g) < 10
    off = Image.open(
        io.BytesIO(commander(cmd, {}, {}, "camera.a", white.getvalue()))
    ).convert("RGB")
    assert rgb(off, (200, 20))[0] > 200  # off: as it was


def test_each_place_is_drawn_from_the_smallest_channel_big_enough():
    from casa_mia.modules.compositor import choose, enlarged

    ladder = ["low", "medium", "high"]
    sizes = {"low": (640, 360), "medium": (1280, 720), "high": (2560, 1440)}
    assert choose(ladder, sizes, (300, 200), False, "low") == "low"
    assert choose(ladder, sizes, (1000, 500), False, "low") == "medium"
    assert choose(ladder, sizes, (1770, 1080), True, "medium") == "high"
    assert (
        choose(ladder, sizes, (4000, 2000), True, "medium") == "high"
    )  # none: the largest
    # whole (fitted inside): one side reaching the place is enough; filling it: both
    assert choose(ladder, sizes, (700, 300), True, "low") == "low"
    assert choose(ladder, sizes, (700, 300), False, "low") == "medium"
    # sizes not known yet are passed over; none known: the default
    assert choose(ladder, {"high": (2560, 1440)}, (300, 200), False, "low") == "high"
    assert choose(ladder, {}, (300, 200), False, "medium") == "medium"
    assert enlarged((640, 360), (1280, 720), True) == 2.0


def test_a_round_fetches_the_channel_each_place_needs(tmp_path):
    # The main area (about 1530 x 860) is larger than the medium channel's still, so it is
    # drawn from high; the tiles from low. Each channel is fetched at its own size.
    import asyncio

    from casa_mia.modules import compositor as mod

    (tmp_path / LIVE_STORE).write_text(
        json.dumps(
            {
                "cameras": {
                    "camera.a": {
                        "title": "A",
                        "medium": "camera.a_m",
                        "high": "camera.a_h",
                    },
                    "camera.b": {"title": "B"},
                },
                "commander": {
                    "gap": 0,
                    "main": "camera.a",
                    # whole: a 384 x 1080 column needs only one side reached
                    "left": {"cameras": ["camera.a"], "size": 20, "fit": "contain"},
                    "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
                },
            }
        )
    )
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0)
    comp.cfg = mod.load_config(tmp_path)
    comp.gather.configure(comp.store, comp.cfg)
    comp.gather.res = {
        "camera.a": (640, 360),
        "camera.a_m": (1280, 720),
        "camera.a_h": (2560, 1440),
    }
    asked: list[str] = []

    async def fetch(entity):  # each channel's still at its own size
        asked.append(entity)
        out = io.BytesIO()
        Image.new("RGB", comp.gather.res.get(entity, (160, 90))).save(out, "JPEG")
        return out.getvalue()

    comp.gather._fetch_now = fetch  # type: ignore[method-assign]
    asyncio.run(gather_round(comp))
    assert sorted(asked) == ["camera.a", "camera.a_h", "camera.b"]
    status = comp.gather.status()
    high = next(s for s in status["channels"] if s["camera"] == "camera.a_h")
    assert high["channel"] == "high" and [u["place"] for u in high["uses"]] == ["main"]
    assert high["uses"][0]["enlarged"] < 1  # only ever made smaller


def test_viewer_is_the_one_home_assistant_names():
    from aiohttp.test_utils import make_mocked_request

    from casa_mia.modules.compositor import viewer

    direct = make_mocked_request("GET", "/g/x.mjpg")
    assert viewer(direct) == direct.remote
    via_ha = make_mocked_request(
        "GET", "/g/x.mjpg", headers={"X-Forwarded-For": "203.0.113.7, 10.0.0.1"}
    )
    assert viewer(via_ha) == "203.0.113.7"


def test_a_stream_measures_what_it_sent_and_how_long_it_waited():
    sending = Sending("cameras@800x600x1", "203.0.113.7", since=100.0)
    sending.frames, sending.sent, sending.waiting = 10, 1_000_000, 5.0
    f = sending.figures(110.0)
    assert (f["frames"], f["kb_frame"], f["kbit_s"], f["waiting_pct"]) == (
        10,
        100,
        800,
        50,
    )


def test_go2rtc_reachable_asks_for_rtsp(monkeypatch):
    import socket as sk

    from casa_mia.modules import compositor as mod

    with sk.socket() as srv:
        srv.bind(("127.0.0.1", 0))
        srv.listen()

        def answer():
            conn, _ = srv.accept()
            with conn:
                assert conn.recv(64).startswith(b"OPTIONS rtsp://")
                conn.sendall(b"RTSP/1.0 200 OK\r\nCSeq: 1\r\n\r\n")

        threading.Thread(target=answer, daemon=True).start()
        monkeypatch.setattr(mod, "GO2RTC_RTSP", srv.getsockname())
        assert mod.go2rtc_reachable()
    assert not mod.go2rtc_reachable(0.2)  # closed: not reachable


def test_two_compositors_share_one_gatherer(tmp_path):
    # The live and the draft compositor want the same camera: one gatherer fetches it
    # once a round, and both draw from its one cache.
    import asyncio

    from casa_mia.modules.compositor import DRAFT_STORE, Gatherer

    write_config(tmp_path)
    (tmp_path / DRAFT_STORE).write_text((tmp_path / LIVE_STORE).read_text())
    gather = Gatherer("http://127.0.0.1:1", "token")
    live = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0, gatherer=gather)
    draft = Compositor(
        tmp_path, "", "", port=0, store=DRAFT_STORE, prewarm=False, gatherer=gather
    )
    for comp in (live, draft):
        comp.cfg = mod_load(tmp_path, comp.store)
        gather.configure(comp.store, comp.cfg)
    asked: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        return jpeg()

    gather._fetch_now = fetch  # type: ignore[method-assign]

    async def both():
        live._want(live.cfg.commanders)
        draft._want(draft.cfg.commanders)
        gather.uses = {c: [] for at, w in gather._wants.values() for c in w}
        await asyncio.gather(*(gather._once(e) for e in gather.uses))

    asyncio.run(both())
    assert sorted(asked) == [
        "camera.a",
        "camera.b",
    ]  # each once, not once per compositor
    assert live.gather is draft.gather and live.gather.pick("camera.a")[0]


def mod_load(directory, store):
    from casa_mia.modules.compositor import load_config

    return load_config(directory, store)
