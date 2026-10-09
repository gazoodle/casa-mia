"""The channels' own streams, read from Home Assistant's go2rtc (modules/streams.py), and
the compositor drawing from them."""

import asyncio
import io
import json
import time

import av
from aiohttp import web
from PIL import Image

from casa_mia.modules import compositor as comp_mod
from casa_mia.modules import streams
from casa_mia.modules.compositor import LIVE_STORE, Compositor
from casa_mia.modules.compositor import channels as mod_channels


def test_names_as_has_go2rtc_does():
    reg = {"entity_id": "camera.a", "platform": "unifiprotect", "unique_id": "ab:cd_0"}
    assert streams.go2rtc_name(reg) == "unifiprotect_ab%3Acd_0"
    assert (
        streams.go2rtc_name({"entity_id": "camera.a", "unique_id": None}) == "camera.a"
    )


def h264_file(path, size=(64, 48), frames=5) -> str:
    """A tiny H.264 stream in a file, standing in for an RTSP address."""
    with av.open(str(path), "w", format="mpegts") as out:
        video = out.add_stream("libx264", rate=10)
        video.width, video.height, video.pix_fmt = *size, "yuv420p"
        for _ in range(frames):
            frame = av.VideoFrame.from_image(Image.new("RGB", size, "green"))
            out.mux(video.encode(frame))
        out.mux(video.encode())
    return str(path)


def test_reads_a_stream_at_its_own_size(tmp_path):
    url = h264_file(tmp_path / "s.ts")
    first, _, cpu = streams.first_frame(url)
    assert first is not None and first.size == (64, 48)
    none, why, _ = streams.first_frame(str(tmp_path / "none.ts"))
    assert none is None and why
    assert cpu > 0  # the CPU it took, measured
    # keyframes only (the gatherer's pace no faster than its keyframes): 1 of 5 decoded
    keys = streams.Reader("camera.a", url)
    every = streams.Reader("camera.a", url, keys_only=lambda reader: False)
    for _ in range(100):
        if not (keys.alive or every.alive):
            break
        time.sleep(0.01)
    got = keys.image()
    assert got and got[0].size == (64, 48) and keys.frames == 1 and keys.keyframes_only
    assert every.frames == 5 and not every.keyframes_only
    assert keys.error == "the stream ended" and keys.cpu_s > 0 and keys.convert_s > 0


def fake_ha(events: list[dict], registry: dict | None):
    """HA's websocket: the registry entry (or none), then the offer's result and events."""

    async def ws(request):
        sock = web.WebSocketResponse()
        await sock.prepare(request)
        await sock.send_json({"type": "auth_required"})
        await sock.receive_json()
        await sock.send_json({"type": "auth_ok"})
        for _ in range(2):
            msg = await sock.receive_json()
            if msg["type"] == "config/entity_registry/get":
                ok = registry is not None
                await sock.send_json(
                    {
                        "id": msg["id"],
                        "type": "result",
                        "success": ok,
                        "result": registry,
                    }
                )
            else:
                await sock.send_json(
                    {"id": msg["id"], "type": "result", "success": True}
                )
                for event in events:
                    await sock.send_json(
                        {"id": msg["id"], "type": "event", "event": event}
                    )
        await asyncio.sleep(0.15)  # held open while the app reads
        return sock

    app = web.Application()
    app.router.add_get("/websocket", ws)
    return app


def register(events, registry, monkeypatch):
    import aiohttp

    monkeypatch.setattr(streams, "REGISTER_WAIT", 0.1)

    async def run():
        runner = web.AppRunner(fake_ha(events, registry))
        await runner.setup()
        site = web.TCPSite(runner, "127.0.0.1", 0)
        await site.start()
        port = site._server.sockets[0].getsockname()[1]  # type: ignore[union-attr]
        try:
            async with aiohttp.ClientSession() as http:
                return await streams.register(
                    http, f"ws://127.0.0.1:{port}/websocket", "t", "camera.a"
                )
        finally:
            await runner.cleanup()

    return asyncio.run(run())


def test_register_puts_a_camera_on_go2rtc(monkeypatch):
    reg = {"entity_id": "camera.a", "platform": "generic", "unique_id": "x1"}
    assert register([{"type": "session"}], reg, monkeypatch) == ("generic_x1", "")
    # set up in YAML: no registry entry, named by its entity
    assert register([{"type": "session"}], None, monkeypatch)[0] == "camera.a"
    # HA cannot: no stream source, an MJPEG camera
    name, why = register(
        [{"type": "session"}, {"type": "error", "message": "no stream source"}],
        reg,
        monkeypatch,
    )
    assert name is None and why == "no stream source"
    # the throwaway offer turned down (it offers H.264 only; an H.265 camera): no
    # matter, HA put the camera on go2rtc before passing the offer on
    codecs = [{"type": "session"}, {"type": "error", "message": "codecs not matched"}]
    assert register(codecs, reg, monkeypatch) == ("generic_x1", "")


class StubReader:
    """A stream reader whose newest frame is a picture of a set size."""

    def __init__(self, entity, url, size=(2560, 1440)):
        self.entity, self.url, self.alive, self.error = entity, url, True, None
        self.frame = Image.new("RGB", size, "green")
        self.at = time.monotonic()
        self.cpu_s = self.convert_s = 0.0
        self.keyframes_only, self.gop_s = True, 1.0

    def image(self):
        return self.frame, time.monotonic()

    def fps(self):
        return 15.0

    def stop(self):
        self.alive = False


def test_a_round_draws_from_the_channels_streams(tmp_path, monkeypatch):
    # The main camera is read from its high channel's stream, not snapshots; its other
    # channels are sized from their streams too, which a snapshot never changes.
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
                    "left": {"cameras": ["camera.a"], "size": 20, "fit": "contain"},
                    "bottom": {"cameras": ["camera.b"], "size": 20, "fit": "cover"},
                },
            }
        )
    )
    comp = Compositor(tmp_path, "http://127.0.0.1:1", "token", port=0)
    comp.cfg = comp_mod.load_config(tmp_path)
    comp.gather.configure(comp.store, comp.cfg)
    comp.gather.go2rtc = True
    comp.gather.res = {
        "camera.a": (640, 360),
        "camera.a_m": (1280, 720),
        "camera.a_h": (2560, 1440),
    }
    sizes = {
        "camera.a": (640, 360),
        "camera.a_m": (1280, 720),
        "camera.a_h": (2560, 1440),
    }

    async def name(entity):
        return None if entity == "camera.b" else entity.replace("camera.", "cam_")

    snapshots: list[str] = []

    async def fetch(entity):
        snapshots.append(entity)
        out = io.BytesIO()
        Image.new("RGB", (320, 180)).save(out, "JPEG")
        return out.getvalue()

    comp.gather._name = name  # type: ignore[method-assign]
    comp.gather._fetch_now = fetch  # type: ignore[method-assign]
    monkeypatch.setattr(
        streams, "Reader", lambda e, url, **kw: StubReader(e, url, sizes[e])
    )
    monkeypatch.setattr(
        streams,
        "first_frame",
        lambda url: (
            Image.new("RGB", sizes["camera." + url.rsplit("cam_", 1)[1]]),
            "",
            0.01,
        ),
    )

    async def round_and_survey():
        comp.gather._bg = set()
        comp._want(comp.cfg.commanders)
        g = comp.gather
        g.uses = g._wants[comp.role][1]
        await asyncio.gather(*(g._once(e) for e in g.uses))
        # a survey pass: every channel of every camera
        everything = [e for c in g._cameras() for e in mod_channels(g.cfg, c).values()]
        await asyncio.gather(*(g._survey_one(e) for e in everything))

    asyncio.run(round_and_survey())
    assert set(snapshots) == {"camera.b"}  # camera.b has no stream: its snapshots
    assert set(comp.gather._readers) == {"camera.a", "camera.a_h"}
    assert isinstance(comp.gather.shots["camera.a_h"][1], Image.Image)
    assert comp.gather._streamed == {
        "camera.a",
        "camera.a_m",
        "camera.a_h",
    }  # all sized
    status = comp.gather.status()
    high = next(s for s in status["channels"] if s["camera"] == "camera.a_h")
    assert (high["source"], high["fps"], high["width"]) == ("stream", 15.0, 2560)
    # a snapshot never shrinks a size its stream gave
    comp.gather.keep("camera.a_m", (lambda b: b)(asyncio.run(fetch("camera.a_m"))))
    assert comp.gather.res["camera.a_m"] == (1280, 720)
    # the screenshot swap: its picture is kept in place of a frame, at the frame's size
    pic = tmp_path / "yard.png"
    Image.new("RGB", (100, 50), "red").save(pic)
    comp.gather._swapped = lambda e: pic if e == "camera.a_h" else None  # type: ignore[method-assign]
    comp.gather.keep("camera.a_h", Image.new("RGB", (2560, 1440)), streamed=True)
    shot = comp.gather.shots["camera.a_h"][1]
    assert isinstance(shot, Image.Image) and shot.size == (2560, 1440)
    assert shot.getpixel((0, 0)) == (255, 0, 0)
    assert "camera.a_h" not in comp.gather._snap_wrong
    # a still that never changes: fetched at the slowest pace
    assert comp.gather._pace_of("camera.a_h") == comp_mod.PACES["gatherer"][1]
    assert comp.gather._pace_of("camera.a") < comp_mod.PACES["gatherer"][1]
    # and drawn at the generator's slowest while the swap is on
    assert comp.pace() == comp.gather.pace(comp.role)
    monkeypatch.setattr(comp_mod.swap, "stamp", lambda: "1")
    assert comp.pace() == comp_mod.PACES[comp.role][1]
    assert comp.gather.status()["pace"] == comp_mod.PACES["gatherer"][1]  # as shown
    comp.gather._stop_readers()
    assert not comp.gather._readers


class Chatty:
    """A stream that sends packets for ever (audio, say) but never a video frame."""

    def __init__(self):
        codec = type("Codec", (), {"skip_frame": "DEFAULT"})()
        self.video = type("Video", (), {"thread_count": 0, "codec_context": codec})()
        self.streams = type("Streams", (), {"video": [self.video]})()

    def demux(self):
        other = object()
        while True:
            time.sleep(0.01)
            yield type("Packet", (), {"stream": other})()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_a_stream_with_no_picture_is_given_up(monkeypatch):
    # The probes were waiting for ever on such a stream, two at a time: the survey
    # stopped for good. Now a probe gives up, and a reader counts the stream lost.
    monkeypatch.setattr(streams, "FRAME_TIMEOUT", 0.2)
    monkeypatch.setattr(streams, "_open", lambda url: Chatty())
    started = time.monotonic()
    image, why, _ = streams.first_frame("rtsp://x")
    assert image is None and "no video frame" in why
    assert time.monotonic() - started < 2
    reader = streams.Reader("camera.a", "rtsp://x")
    for _ in range(200):
        if not reader.alive:
            break
        time.sleep(0.01)
    assert not reader.alive and "no video frame" in (reader.error or "")


def test_within_keeps_a_cancellation_that_comes_as_the_wait_ends():
    # asyncio.wait_for (Python 3.11) loses a cancellation that comes as the awaited
    # thing finishes, so a compositor's generator ran on and its stop hung for 5 s.
    async def race(wait):
        event = asyncio.Event()
        task = asyncio.ensure_future(wait(event.wait(), 10))
        await asyncio.sleep(0)
        event.set()  # it finishes ...
        task.cancel()  # ... as it is cancelled
        try:
            await task
        except asyncio.CancelledError:
            return "cancelled"
        return "ran on"

    assert asyncio.run(race(streams.within)) == "cancelled"
