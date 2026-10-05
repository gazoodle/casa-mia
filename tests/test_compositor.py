import io
import json
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from PIL import Image

from casa_mia.modules.compositor import LIVE_STORE, Compositor


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
    assert {s["title"] for s in status["stills"]} == {"A", "B"}
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
        for _ in range(50):  # the first round runs at start, unasked
            if set(comp._latest) == {"camera.a", "camera.b"}:
                break
            time.sleep(0.05)
        assert set(comp._latest) == {"camera.a", "camera.b"}
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
    asked: list[str] = []

    async def fetch(entity, size):
        asked.append(entity)
        return None if entity == "camera.b" else jpeg()

    comp._fetch_now = fetch  # type: ignore[method-assign]

    async def rounds(n):
        for _ in range(n):
            await comp._round(comp.cfg.commanders)

    asyncio.run(rounds(mod.STRIKES))
    assert "camera.b" in comp._benched and asked.count("camera.b") == mod.STRIKES
    asked.clear()
    asyncio.run(rounds(1))
    assert "camera.b" not in asked and "camera.a" in asked  # sitting out
    comp._benched["camera.b"] = 0  # its time is up
    asyncio.run(rounds(1))
    assert "camera.b" in asked and "camera.b" not in comp._benched
    # its picture never came, and camera.a's is cached
    assert any(e == "camera.a" for e, _ in comp._shots)
    # Home Assistant down (no camera answers): nobody's fault, nobody sits out
    comp._benched.clear()
    comp._misses.clear()
    comp._fetch_now = lambda entity, size: asyncio.sleep(0)  # type: ignore[method-assign,assignment]
    asyncio.run(rounds(mod.STRIKES + 1))
    assert not comp._benched and not comp._misses


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
        assert comp._shots  # the first round was awaited: the cache was empty
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
    comp._latest["camera.a"] = (time.monotonic() - 10, jpeg())
    image, age = comp._pick("camera.a", (160, 90))
    assert image and 9 < age < 11
    assert comp._pick("camera.b", None) == (None, float("inf"))
