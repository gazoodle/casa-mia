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
    monkeypatch.setitem(mod.PACE_DEFAULTS, "gatherer", 0.05)
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
    monkeypatch.setitem(mod.PACE_DEFAULTS, "gatherer", 0.05)
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


def test_the_survey_reads_every_stream_and_pauses_with_the_gatherer(
    tmp_path, monkeypatch
):
    # From the start, a pass over every channel of every camera: its stream's first
    # frame kept as its picture, its size read; then a sleep (its pace) and again.
    # Paused with the gatherer: a purge then must not refill the cache.
    g = gatherer(tmp_path)
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
        lambda url: (probed.append(url) or Image.new("RGB", (1280, 720)), "", 0.01),
    )

    async def run():
        g._survey_now, g._repaced = asyncio.Event(), asyncio.Event()
        g.pause(True)
        loop = asyncio.ensure_future(g._survey_loop())
        g.clear()  # a purge while paused
        await asyncio.sleep(0.1)
        paused = (list(probed), list(asked), dict(g.survey))
        g.pause(False)
        g._survey_now.set()
        for _ in range(100):
            await asyncio.sleep(0.01)
            if g.survey.get("ended"):
                break
        loop.cancel()
        await asyncio.gather(loop, return_exceptions=True)
        return paused

    probed_paused, asked_paused, survey_paused = asyncio.run(run())
    assert not probed_paused and not asked_paused  # paused: nothing at all
    assert not survey_paused["running"]
    assert len(probed) == 2 and not asked  # every channel from its stream, no snapshot
    assert g._streamed == {"camera.a", "camera.b"} and not g._waiting
    assert isinstance(g.shots["camera.a"][1], Image.Image)  # the frame, as its picture
    status = g.status()["survey"]
    assert status["done"] == status["of"] == 2 and status["next_in"] is not None


def test_the_survey_takes_a_snapshot_where_there_is_no_stream(tmp_path, monkeypatch):
    g = gatherer(tmp_path)
    g.go2rtc = False  # HA's go2rtc out of reach: snapshots only
    asked: list[str] = []

    async def fetch(entity):
        asked.append(entity)
        return jpeg()

    g._fetch_now = fetch  # type: ignore[method-assign]
    got = asyncio.run(g._survey_one("camera.a"))
    assert got == "snapshot" and asked == ["camera.a"] and "camera.a" not in g._waiting


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


def test_paces_are_kept_checked_and_taken_up_at_once(tmp_path):
    paces = tmp_path / "pace.json"
    g = gatherer(tmp_path, pace_path=paces)
    assert g.pace("gatherer") == mod.INTERVAL and g.pace("live") == mod.INTERVAL
    g.set_pace("gatherer", 0)  # continuous
    g.set_pace("live", 0.125)  # 8 a second
    with pytest.raises(ValueError):
        g.set_pace("live", 0.1)  # faster than 8 a second
    with pytest.raises(ValueError):
        g.set_pace("gatherer", 16)
    again = gatherer(tmp_path, pace_path=paces)
    assert (again.pace("gatherer"), again.pace("live")) == (0, 0.125)

    async def taken_up():
        g._repaced = asyncio.Event()
        started = time.monotonic()
        waiting = asyncio.ensure_future(g.paced(15))  # a 15 s wait in progress
        await asyncio.sleep(0.05)
        g.set_pace("gatherer", 1)  # (not started: set on the spot)
        await waiting
        return time.monotonic() - started

    assert asyncio.run(taken_up()) < 1  # ended by the new pace, not after 15 s


def test_each_survey_is_recorded_with_why(tmp_path, monkeypatch):
    g = gatherer(tmp_path)
    g.go2rtc = True

    async def name(entity):
        return entity

    async def fetch(entity):
        return jpeg((640, 360))

    g._name = name  # type: ignore[method-assign]
    g._fetch_now = fetch  # type: ignore[method-assign]
    monkeypatch.setattr(
        mod.streams, "first_frame", lambda url: (None, "no video frame for 15 s", 0.01)
    )
    assert asyncio.run(g._survey_one("camera.a")) == "snapshot"
    record = g.status()["channels"][0]["surveys"][0]
    assert (
        record["outcome"] == "snapshot" and record["why"] == "no video frame for 15 s"
    )
    assert record["size"] == [640, 360] and record["took_s"] >= 0
    # not tried again for a while, and the record says so
    asyncio.run(g._survey_one("camera.a"))
    again = g.status()["channels"][0]["surveys"][0]
    assert again["why"].startswith("no video frame for 15 s (its stream tried again in")


def test_the_survey_reads_as_many_streams_at_once_as_set(tmp_path, monkeypatch):
    import threading

    g = gatherer(tmp_path, pace_path=tmp_path / "pace.json")
    assert g.pace("survey_at_once") == 4  # the default
    g.set_pace("survey_at_once", 2.4)
    assert g.pace("survey_at_once") == 2  # a count
    with pytest.raises(ValueError):
        g.set_pace("survey_at_once", 9)
    g.go2rtc = True
    g.cfg.entities.update({f"camera.c{i}": {} for i in range(6)})
    reading, most = [0], [0]
    lock = threading.Lock()

    def frame(url):
        with lock:
            reading[0] += 1
            most[0] = max(most[0], reading[0])
        time.sleep(0.05)
        with lock:
            reading[0] -= 1
        return Image.new("RGB", (64, 36)), "", 0.01

    async def name(entity):
        return entity

    g._name = name  # type: ignore[method-assign]
    monkeypatch.setattr(mod.streams, "first_frame", frame)

    async def one_pass():
        g._survey_now, g._repaced = asyncio.Event(), asyncio.Event()
        loop = asyncio.ensure_future(g._survey_loop())
        for _ in range(200):
            await asyncio.sleep(0.01)
            if g.survey.get("ended"):
                break
        loop.cancel()
        await asyncio.gather(loop, return_exceptions=True)

    asyncio.run(one_pass())
    assert most[0] == 2 and g.status()["survey"]["at_once"] == 2


def test_a_stream_is_decoded_only_as_much_as_its_pace_needs(tmp_path):
    # Keyframes only while pictures are taken no faster than keyframes come; every
    # frame when the pace asks for fresher (continuous, or faster than its keyframes).
    g = gatherer(tmp_path)
    from types import SimpleNamespace
    from typing import cast

    reader = cast(mod.streams.Reader, SimpleNamespace(gop_s=None, entity="camera.a"))
    g.paces["freshness"] = 0.0  # as fresh as the pace (the allowance below)
    assert g._keys_only(reader)  # its keyframe interval not known yet: keyframes
    reader.gop_s = 1.0
    g.paces["gatherer"] = 2.0
    assert g._keys_only(reader)  # every 2 s, a keyframe every 1 s
    g.paces["gatherer"] = 0.5
    assert not g._keys_only(reader)  # fresher than its keyframes: every frame
    g.paces["gatherer"] = 0.0
    assert not g._keys_only(reader)  # continuous: every frame
    # but no faster than its fastest user: a commander drawn every 2 s needs no more
    g.want("live", {"camera.a": []})
    g.paces["live"] = 2.0
    assert g._pace_of("camera.a") == 2.0 and g._keys_only(reader)
    g.paces["live"] = 0.5  # drawn every 0.5 s, keyframes every 1 s: every frame
    assert not g._keys_only(reader)
    g.paces["gatherer"] = 5.0  # the gatherer slower than any user: its pace
    assert g._pace_of("camera.a") == 5.0
    # the freshness allowance: a picture up to that old will do, so a stream whose
    # keyframes come within it decodes keyframes only, however often it is drawn
    g.paces["gatherer"], g.paces["live"] = 2.0, 2.0
    reader.gop_s = 4.8  # Protect's high channel, say
    assert not g._keys_only(reader)  # drawn every 2 s, keyframes every 4.8 s
    g.paces["freshness"] = 5.0  # the default
    assert g._keys_only(reader)
    reader.gop_s = 8.0  # keyframes rarer than allowed: every frame again
    assert not g._keys_only(reader)


def test_the_cache_is_counted(tmp_path):
    g = gatherer(tmp_path)
    drawn: dict = {}
    g.register_pictures("live", drawn)
    assert g.cache_stats()["pictures"] == 0 and g.cache_stats()["waiting"] == 2
    g.keep("camera.a", Image.new("RGB", (100, 50)))  # a frame: 100 x 50 x 3 bytes
    drawn["cameras"] = (time.monotonic(), b"x" * 1000)  # a composite
    stats = g.cache_stats()
    assert (stats["pictures"], stats["cameras"], stats["composites"]) == (2, 1, 1)
    assert stats["waiting"] == 1
    placeholder = waiting_picture(round(16 / 9, 2))
    expected = 100 * 50 * 3 + 1000 + placeholder.width * placeholder.height * 3
    assert stats["bytes"] == expected  # a shared waiting picture counted once


def test_the_whole_system_is_sampled(tmp_path, monkeypatch):
    # CPU gathering and composing, as shares of the whole box; bytes sent a second;
    # the app's memory and the cache's; a sample every MONITOR_EVERY seconds.
    monkeypatch.setattr(mod, "MONITOR_EVERY", 0.05)
    monkeypatch.setattr(mod.os, "cpu_count", lambda: 2)
    g = gatherer(tmp_path)

    async def run():
        task = asyncio.ensure_future(g._monitor())
        await asyncio.sleep(0.06)
        g.count("gather_cpu", 0.05)  # 0.05 s of CPU in 0.05 s, of 2 CPUs: 50%
        g.sent(40_000)
        # Two streams open; one's write held up across samples (booked as it passes,
        # never more than all the time); both compositors drawing all the time (the
        # busier one counts, not their sum).
        spent = [g.begin(t) for t in ("stream_s", "stream_s", "send_wait")]
        spent += [g.begin(t) for t in ("draw_s:live", "draw_s:draft")]
        await asyncio.sleep(0.25)
        for token in spent:
            g.end(token)
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    asyncio.run(run())
    sample = max(g.history, key=lambda s: s["gather"])
    assert 20 < sample["gather"] <= 60 and sample["out_bps"] > 0
    assert sample["rss"] and sample["cache"] >= 0
    # The bottleneck: where viewers wait.
    assert any(s["kb_picture"] == 40 for s in g.history)
    held = [s for s in g.history if s["streams"] == 2]
    assert held and all(40 <= s["waiting"] <= 60 for s in held)
    assert all(s["drawing"] <= 100 for s in g.history)
    assert any(s["drawing"] >= 80 for s in held)
    assert g.status()["monitor"]["cpus"] == 2


def test_go2rtc_refusing_is_no_streams_fault_and_it_is_found_again(
    tmp_path, monkeypatch
):
    # HA restarting: its go2rtc refuses every stream. No channel is marked "not its
    # stream" for it; go2rtc is marked down, looked at again, and back, every camera is
    # given to it afresh and a survey pass starts.
    monkeypatch.setattr(mod, "GO2RTC_CHECK", 0.01)
    g = gatherer(tmp_path)
    g.go2rtc = True

    async def name(entity):
        return entity

    async def fetch(entity):
        return jpeg()

    g._name = name  # type: ignore[method-assign]
    g._fetch_now = fetch  # type: ignore[method-assign]
    g._names["camera.a"] = "old"
    refusal = "[Errno 111] Connection refused: 'rtsp://127.0.0.1:18554/x'"
    monkeypatch.setattr(mod.streams, "first_frame", lambda url: (None, refusal, 0.0))
    assert asyncio.run(g._survey_one("camera.a")) == "snapshot"
    assert g.go2rtc is False and "camera.a" not in g._no_stream
    monkeypatch.setattr(mod, "go2rtc_reachable", lambda: True)

    async def back():
        g._survey_now = asyncio.Event()
        watch = asyncio.ensure_future(g._watch_go2rtc())
        for _ in range(100):
            await asyncio.sleep(0.01)
            if g.go2rtc:
                break
        watch.cancel()
        await asyncio.gather(watch, return_exceptions=True)
        return g._survey_now.is_set()

    assert asyncio.run(back())  # a survey pass at once
    assert g.go2rtc and not g._names  # back: every camera given afresh


def test_a_restart_or_purge_tries_every_failed_stream_again(tmp_path, monkeypatch):
    # Every stream failed at once (marked "not its stream" for BENCH): the verdict says
    # so and what to do; a restart of the gatherer forgets the marks and keeps the
    # pictures (no "(Waiting …)"), as does a purge, which drops the pictures too.
    g = gatherer(tmp_path)
    g.go2rtc = True
    g.keep("camera.a", jpeg())
    for e in ("camera.a", "camera.b"):
        g._no_stream[e] = (time.monotonic() + mod.BENCH, "the stream ended")
        g._names[e] = e
    v = g.verdict()
    assert v["state"] == "streams_failing" and "the stream ended" in v["headline"]
    assert "Restart the gatherer" in v["advice"]
    g.restart()
    assert not g._no_stream and not g._names and "camera.a" not in g._waiting
    g._no_stream["camera.a"] = (time.monotonic() + mod.BENCH, "the stream ended")
    g.clear()
    assert not g._no_stream


def test_home_assistant_out_of_reach_is_no_cameras_fault(tmp_path, monkeypatch):
    # HA restarting: a camera can't be put on go2rtc because HA can't be asked; asked
    # again in STREAM_RETRY, not BENCH (every camera sat out 10 minutes).
    import aiohttp

    g = gatherer(tmp_path)
    g.http = object()  # type: ignore[assignment]

    async def register(*args):
        raise aiohttp.ClientConnectionError("Cannot connect")

    monkeypatch.setattr(mod.streams, "register", register)
    assert asyncio.run(g._name("camera.a")) is None
    until, why = g._no_stream["camera.a"]
    assert until - time.monotonic() <= mod.STREAM_RETRY and "cannot ask" in why


def sample(**kw):
    base = dict(app=10, gather=5, compose=5, streams=1, waiting=0, drawing=10)
    return base | dict(sent_fps=2.0, skipped_fps=0.0) | kw


@pytest.mark.parametrize(
    ("given", "state"),
    [
        ({}, "fine"),
        ({"streams": 0}, "idle"),
        ({"app": 90, "gather": 70, "compose": 10}, "cpu_gathering"),
        ({"app": 90, "gather": 10, "compose": 70}, "cpu_drawing"),
        ({"drawing": 95}, "drawing_behind"),
        ({"waiting": 70, "sent_fps": 1.0, "skipped_fps": 1.0}, "network"),
        ({"waiting": 70}, "slow_link"),
    ],
)
def test_the_verdict_names_the_bottleneck(tmp_path, given, state):
    g = gatherer(tmp_path)
    g.history.extend([sample(**given)] * 15)
    v = g.verdict()
    assert v["state"] == state and v["state"] in mod.HEALTH_STATES
    assert v["headline"] and v["advice"]


def test_the_health_states_are_the_integrations_too():
    from pathlib import Path

    root = Path(__file__).parent.parent / "integration/custom_components/casa_mia"
    sensor = (root / "sensor.py").read_text()
    states = json.loads((root / "translations/en.json").read_text())["entity"][
        "sensor"
    ]["compositor_health"]["state"]
    assert list(states) == list(mod.HEALTH_STATES)
    assert all(f'"{s}",' in sensor for s in mod.HEALTH_STATES)


def test_a_stream_go2rtc_forgot_is_given_again_at_once(tmp_path, monkeypatch):
    # HA restarted, and its go2rtc with it: it answers 404 for a camera it was given
    # before. Not the stream's fault: given afresh and read again at once, not marked
    # "not its stream" for BENCH.
    g = gatherer(tmp_path)
    g.go2rtc = True
    g._names["camera.a"] = "before"
    asked = []

    async def name(entity):  # as _name: the one remembered, else given afresh
        if entity in g._names:
            return g._names[entity]
        asked.append(entity)
        g._names[entity] = "afresh"
        return "afresh"

    def first_frame(url):
        if url.endswith("/before"):
            return None, f"Server returned 404 Not Found: '{url}'", 0.0
        return Image.new("RGB", (320, 180)), "", 0.0

    g._name = name  # type: ignore[method-assign]
    monkeypatch.setattr(mod.streams, "first_frame", first_frame)
    assert asyncio.run(g._survey_one("camera.a")) == "stream"
    assert asked == ["camera.a"] and "camera.a" not in g._no_stream
