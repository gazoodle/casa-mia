"""The gatherer: every camera picture the compositors draw from, fetched once, each
channel on its own; "(Waiting …)" until a channel's first picture; sizes kept across
restarts; and each stage of the pipeline paused and run on its own."""

import asyncio
import io
import json
import time
import urllib.error
import urllib.request

import pytest
from PIL import Image

from casa_mia.modules import compositor as mod
from casa_mia.modules.compositor import Gatherer, waiting_picture
from test_compositor import write_config


def jpeg(size=(160, 90)) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", size, "red").save(out, "JPEG")
    return out.getvalue()


def gatherer(tmp_path, **kw) -> Gatherer:
    write_config(tmp_path)
    g = Gatherer("http://127.0.0.1:1", "token", **kw)
    g.configure("live", mod.load_config(tmp_path))
    return g


def test_every_channel_waits_until_its_first_picture(tmp_path):
    g = gatherer(tmp_path)
    assert g._waiting == {"camera.a", "camera.b"}
    picture, _ = g.pick("camera.a")
    assert picture is waiting_picture(round(16 / 9, 2))  # shared, not made per channel
    assert "camera.a" not in g.res  # a placeholder is never a channel's size
    g.keep("camera.a", jpeg())
    assert g.pick("camera.a")[0] == jpeg() and "camera.a" not in g._waiting


def test_sizes_are_kept_across_restarts(tmp_path):
    sizes = tmp_path / "sizes.json"
    g = gatherer(tmp_path, sizes_path=sizes)
    g.keep("camera.a", Image.new("RGB", (2688, 1512)), streamed=True)
    g.keep("camera.b", jpeg((640, 360)))
    again = gatherer(tmp_path, sizes_path=sizes)
    assert again.res == {"camera.a": (2688, 1512), "camera.b": (640, 360)}
    assert again._streamed == {"camera.a"}  # a stream's size: no need to read it again
    assert again.aspect("camera.a") == round(2688 / 1512, 4)
    assert json.loads(sizes.read_text())["camera.b"] == {
        "size": [640, 360],
        "from": "still",
    }


def test_a_stalled_camera_holds_up_only_itself(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "INTERVAL", 0.05)
    g = gatherer(tmp_path)
    asked: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        if entity == "camera.b":
            await asyncio.sleep(10)  # never answers in time
        return jpeg()

    g._fetch_now = fetch  # type: ignore[method-assign]

    async def run():
        feeds = [asyncio.ensure_future(g._feed(e)) for e in ("camera.a", "camera.b")]
        await asyncio.sleep(0.4)
        for f in feeds:
            f.cancel()
        await asyncio.gather(*feeds, return_exceptions=True)

    asyncio.run(run())
    assert asked.count("camera.a") >= 4 and asked.count("camera.b") == 1
    assert "camera.a" not in g._waiting and "camera.b" in g._waiting


def test_a_paused_gatherer_fetches_nothing(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "INTERVAL", 0.05)
    g = gatherer(tmp_path)
    g._fetch_now = lambda entity: asyncio.sleep(0, jpeg())  # type: ignore[method-assign,assignment]
    g.pause(True)

    async def run():
        g._wake = asyncio.Event()
        runner = asyncio.ensure_future(g._run())
        g.want("live", {"camera.a": []})
        await asyncio.sleep(0.2)
        paused = (dict(g._feeds), set(g._waiting))
        g.pause(False)
        g._wake.set()
        await asyncio.sleep(0.2)
        runner.cancel()
        g._stop_feeds()
        await asyncio.gather(runner, return_exceptions=True)
        return paused

    feeds, waiting = asyncio.run(run())
    assert not feeds and "camera.a" in waiting  # paused: nothing fetched
    assert "camera.a" not in g._waiting  # running again: fetched


@pytest.fixture
def served(tmp_path):
    import threading
    from http.server import ThreadingHTTPServer

    from test_compositor import FakeHA

    write_config(tmp_path)
    ha = ThreadingHTTPServer(("127.0.0.1", 0), FakeHA)
    threading.Thread(target=ha.serve_forever, daemon=True).start()
    comp = mod.Compositor(tmp_path, f"http://127.0.0.1:{ha.server_port}", "t", port=0)
    comp.start()
    yield comp
    comp.stop()
    ha.shutdown()
    ha.server_close()


def test_generator_and_server_pause_on_their_own(served):
    url = f"http://127.0.0.1:{served.port}/g/cameras.jpg"
    first = urllib.request.urlopen(url).read()
    served.pause("generator", True)
    time.sleep(0.05)
    assert urllib.request.urlopen(url).read() == first  # the last picture, not redrawn
    served.pause("server", True)
    time.sleep(0.05)
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(url)
    assert err.value.code == 503
    served.pause("server", False)
    served.pause("generator", False)
    time.sleep(0.05)
    assert urllib.request.urlopen(url).status == 200
    status = served.status()
    assert not (status["generator_paused"] or status["server_paused"])


def test_a_paused_gatherer_keeps_no_stills_and_sizes_every_camera(
    tmp_path, monkeypatch
):
    # Paused, the kept stills fetch nothing (a purge wakes them, and must not refill the
    # cache); running, every camera's channels are sized from their streams, in use or
    # not.
    g = gatherer(tmp_path, keep_stills=60)
    g.go2rtc = True
    asked: list[str] = []
    probed: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        return jpeg()

    async def name(entity):
        return entity

    g._fetch_now = fetch  # type: ignore[method-assign]
    g._name = name  # type: ignore[method-assign]
    monkeypatch.setattr(
        mod.streams,
        "first_frame",
        lambda url: probed.append(url) or Image.new("RGB", (1280, 720)),
    )

    async def run():
        g._round_now = asyncio.Event()
        g.pause(True)
        kept = asyncio.ensure_future(g._keep_stills(60))
        g.clear()  # a purge while paused
        await asyncio.sleep(0.1)
        paused_asked = list(asked)
        g.pause(False)
        g._round_now.set()
        await asyncio.sleep(0.1)
        g._survey()
        await asyncio.gather(*g._bg)
        kept.cancel()
        await asyncio.gather(kept, return_exceptions=True)
        return paused_asked

    assert asyncio.run(run()) == []  # nothing fetched while paused
    assert set(asked) == {"camera.a", "camera.b"}  # running again: the kept stills
    assert g._streamed == {"camera.a", "camera.b"}  # every camera sized by its stream


def test_a_snapshot_not_its_channels_size_is_never_its_picture(tmp_path):
    # A channel sized by its stream (UniFi Protect: high is 2688 x 1512) is not shown
    # Protect's one 640 x 360 snapshot as itself; its snapshots are not asked for again.
    g = gatherer(tmp_path)
    g.res["camera.a"] = (2688, 1512)
    g._streamed.add("camera.a")
    g.keep("camera.a", jpeg((640, 360)))
    assert "camera.a" in g._waiting and "camera.a" in g._snap_wrong
    asked: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        return jpeg((640, 360))

    g._fetch_now = fetch  # type: ignore[method-assign]
    assert asyncio.run(g._get("camera.a")) == () and not asked
    g.keep(
        "camera.a", Image.new("RGB", (2688, 1512)), streamed=True
    )  # its stream's frame
    assert "camera.a" not in g._waiting
    assert g.status()["channels"][0]["picture"] == [2688, 1512]


def test_a_paused_generator_draws_nothing_even_when_asked(served):
    # The server never draws: purged while the generator is paused, a commander's
    # picture is not drawn again until the generator runs.
    url = f"http://127.0.0.1:{served.port}/g/cameras.jpg"
    urllib.request.urlopen(url).read()
    served.pause("generator", True)
    served.flush()
    time.sleep(0.1)
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(url)
    assert err.value.code == 503 and not served._pictures
    served.pause("generator", False)
    assert urllib.request.urlopen(url).status == 200  # asked of the generator, at once
