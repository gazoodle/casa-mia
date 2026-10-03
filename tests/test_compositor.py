import io
import json
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from PIL import Image

from casa_mia.modules.compositor import (
    Compositor,
    load_config,
    overview,
    overview_layout,
    tile,
    tile_grid,
)


def jpeg(colour: str = "red") -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (160, 90), colour).save(out, "JPEG")
    return out.getvalue()


def test_tile_grid():
    assert tile_grid(1) == (1, 1)
    assert tile_grid(4) == (2, 2)
    assert tile_grid(5) == (3, 2)


def test_tile_size_and_missing_camera():
    cams = [{"title": "A"}, {"title": "B"}]
    img = Image.open(io.BytesIO(tile(cams, [jpeg(), None], (200, 120))))
    assert img.size == (
        400,
        120,
    )  # two cameras, two columns; the failed one is "no signal"


def write_config(directory):
    (directory / "groups.json").write_text(
        json.dumps(
            {
                "Garage": [{"entity": "camera.a", "title": "A"}],
                "Pool": {
                    "cameras": [{"entity": "camera.b", "title": "B"}],
                    "tile": [320, 180],
                },
                "_overview": {
                    "width": 640,
                    "gap": 8,
                    "cell_aspect": 1.7,
                    "strip_aspect": 1.5,
                    "rows": [{"groups": ["Garage", "Pool"]}],
                },
            }
        )
    )


def test_config_and_overview(tmp_path):
    write_config(tmp_path)
    cfg = load_config(tmp_path)
    assert cfg.groups["Garage"]["tile"] == (640, 340) and cfg.groups["Pool"][
        "tile"
    ] == (320, 180)
    size, items = overview_layout(cfg.overview, cfg.groups)
    assert [i["group"] for i in items] == ["Garage", "Pool"]
    frames = {n: tile(g["cameras"], [jpeg()], g["tile"]) for n, g in cfg.groups.items()}
    assert (
        Image.open(io.BytesIO(overview(frames, cfg.overview, cfg.groups))).size == size
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


def test_serves_group_and_overview(compositor):
    assert compositor.health()["state"] == "running"
    base = f"http://127.0.0.1:{compositor.port}"
    with urllib.request.urlopen(f"{base}/g/Garage.jpg") as r:
        assert r.headers["Content-Type"] == "image/jpeg"
        assert Image.open(io.BytesIO(r.read())).size == (640, 340)
    with urllib.request.urlopen(f"{base}/g/overview.jpg") as r:
        # its groups have an 8 px gap, kept transparent: so WebP, labelled as such
        assert r.headers["Content-Type"] == "image/webp"
        assert Image.open(io.BytesIO(r.read())).format == "WEBP"
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(f"{base}/g/nope.jpg")
    assert err.value.code == 404


def test_no_config_is_unconfigured(tmp_path):
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0)
    comp.start()
    try:
        assert comp.health()["state"] == "unconfigured"
    finally:
        comp.stop()


def test_seed_config_never_overwrites(tmp_path):
    from casa_mia.seed import seed_config

    seed, live = tmp_path / "seed", tmp_path / "live"
    seed.mkdir()
    (seed / "groups.json").write_text("{}")
    (seed / "entities.json").write_text("{}")
    live.mkdir()
    (live / "groups.json").write_text('{"edited": []}')
    seed_config(seed, live)
    assert (live / "groups.json").read_text() == '{"edited": []}'
    assert (live / "entities.json").exists()


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

    cams = [{"title": "A"}, {"title": "B"}]
    plain = Image.open(io.BytesIO(tile(cams, [jpeg(), jpeg()], (200, 120))))
    assert plain.format == "JPEG"  # no gap: as before
    gapped = Image.open(io.BytesIO(tile(cams, [jpeg(), jpeg()], (200, 120), gap=6)))
    assert gapped.format == "WEBP" and gapped.size == (406, 120)
    rgba = gapped.convert("RGBA")
    assert alpha(rgba, (202, 60)) == 0  # the gap: clear
    assert alpha(rgba, (100, 60)) == 255 and alpha(rgba, (300, 60)) == 255

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


def test_changing_picture_is_drawn_from_what_is_to_hand():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, commander

    one = {"cameras": ["camera.a", "camera.b"], "size": 20, "fit": "cover"}
    cmd = {**EMPTY_COMMANDER, "width": 640, "height": 360, "gap": 0, "bottom": one}
    still: dict[str, bytes | None] = {"camera.a": jpeg("red"), "camera.b": jpeg("blue")}
    sharp = commander(cmd, {}, still, "camera.b", jpeg("blue"))
    quick = commander(cmd, {}, still, "camera.b", jpeg("blue"), changing=True)
    assert Image.open(io.BytesIO(quick)).size == (640, 360) and quick != sharp
