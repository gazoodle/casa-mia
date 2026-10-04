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
    with urllib.request.urlopen(f"{base}/g/commander.jpg") as r:
        assert r.headers["Content-Type"] == "image/jpeg"  # no gaps: JPEG
        assert Image.open(io.BytesIO(r.read())).size == (640, 360)
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


def test_changing_picture_is_drawn_from_what_is_to_hand():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander

    one = {"cameras": ["camera.a", "camera.b"], "size": 20, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 640, "height": 360, "gap": 0, "bottom": one}
    still: dict[str, bytes | None] = {"camera.a": jpeg("red"), "camera.b": jpeg("blue")}
    sharp = commander(cmd, {}, still, "camera.b", jpeg("blue"))
    quick = commander(cmd, {}, still, "camera.b", jpeg("blue"), changing=True)
    assert Image.open(io.BytesIO(quick)).size == (640, 360) and quick != sharp
