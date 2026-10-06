"""streams: each camera channel's own video, read from Home Assistant's go2rtc.

HA's go2rtc restreams a camera over RTSP on the host's localhost, without a login, once HA
has been asked for that camera by WebRTC. `register` asks (a WebRTC offer through HA's
websocket, which is never answered: asking is enough) and gives the camera's name there; a
`Reader` keeps the newest frame of one channel's stream in a thread of its own (PyAV, whose
decoding runs outside Python's lock), until stopped. `first_frame` reads one frame and
stops: a channel's true size. The compositor draws from these frames, the camera's own
stream at its own size, instead of HA's snapshots where it can.
"""

from __future__ import annotations

import asyncio
import logging
import string
import threading
import time
from collections.abc import Callable, Iterator
from urllib.parse import quote

import aiohttp
import av
from av.container import InputContainer
from av.error import FFmpegError
from PIL import Image

_LOGGER = logging.getLogger(__name__)

OPEN_TIMEOUT = 10.0  # seconds to connect and get the first frame
READ_TIMEOUT = 5.0  # seconds without any data before a stream counts as lost
# Seconds without a video frame (while other data, such as audio, still comes) before a
# stream counts as lost: the timeouts above see only data, not frames.
FRAME_TIMEOUT = 15.0
REGISTER_WAIT = 2.0  # seconds HA has to say it cannot stream a camera
_SAFE = string.ascii_letters + string.digits + "._-"  # as HA's go2rtc names cameras
# A WebRTC offer for video only, never meant to connect: HA puts the camera on its go2rtc
# before passing the offer on, and the session ends when the websocket closes.
OFFER = (
    "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"
    "m=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=recvonly\r\n"
    "a=rtpmap:96 H264/90000\r\na=setup:actpass\r\na=ice-ufrag:casa\r\n"
    "a=ice-pwd:casamiacasamiacasamiacasa\r\na=fingerprint:sha-256 "
    + ":".join(["00"] * 32)
    + "\r\n"
)


# What HA's go2rtc says when it cannot take a camera at all (an error about the throwaway
# offer itself is no reason).
NOT_ON_GO2RTC = ("no stream source", "not supported")


def go2rtc_name(registry: dict) -> str:
    """A camera's name on HA's go2rtc, from its entity registry entry."""
    if registry.get("unique_id") is None:
        attr = registry["entity_id"]
    else:
        attr = f"{registry['platform']}_{registry['unique_id']}"
    return quote(attr, safe=_SAFE)


async def register(
    http: aiohttp.ClientSession, ws_url: str, token: str, entity: str
) -> tuple[str | None, str]:
    """Ask HA to put a camera channel on its go2rtc: its name there, or None and why not
    (no WebRTC: an MJPEG camera; a camera with WebRTC of its own; no stream source, or
    one go2rtc cannot take). HA puts the camera on go2rtc before passing the offer on,
    so the offer's own failure (it offers H.264 only: an H.265 camera turns it down)
    says nothing of the restream: only those reasons count; the RTSP read decides."""
    async with http.ws_connect(ws_url, max_msg_size=0) as ws:
        await ws.receive_json()  # auth_required
        await ws.send_json({"type": "auth", "access_token": token})
        if (await ws.receive_json()).get("type") != "auth_ok":
            return None, "Home Assistant refused the app's token"
        await ws.send_json(
            {"id": 1, "type": "config/entity_registry/get", "entity_id": entity}
        )
        await ws.send_json(
            {
                "id": 2,
                "type": "camera/webrtc/offer",
                "entity_id": entity,
                "offer": OFFER,
            }
        )
        name, deadline = None, None
        while deadline is None or time.monotonic() < deadline:
            wait = READ_TIMEOUT if deadline is None else deadline - time.monotonic()
            try:
                msg = await asyncio.wait_for(ws.receive_json(), max(wait, 0.01))
            except TimeoutError:
                break
            if msg.get("id") == 1 and msg.get("type") == "result":
                # Not in the registry (a camera set up in YAML): named by its entity.
                found = msg.get("result") if msg.get("success") else None
                name = go2rtc_name(found or {"entity_id": entity})
            elif msg.get("type") == "result" and not msg.get("success"):
                error = msg.get("error") or {}
                return None, str(error.get("message", error))
            elif msg.get("id") == 2 and msg.get("type") == "event":
                event = msg.get("event") or {}
                if event.get("type") == "error":
                    message = str(event.get("message", "error"))
                    if any(n in message.lower() for n in NOT_ON_GO2RTC):
                        return None, message
                    deadline = deadline or time.monotonic()  # the offer's: no matter
                if event.get("type") == "session":
                    # Put on go2rtc now; an error (no stream source, not supported)
                    # follows at once if there is one.
                    deadline = time.monotonic() + REGISTER_WAIT
        return (name, "") if name else (None, "no answer from Home Assistant")


def _open(url: str) -> InputContainer:
    return av.open(
        url,
        options={"rtsp_transport": "tcp"},
        timeout=(OPEN_TIMEOUT, READ_TIMEOUT),
    )


def _frames(
    c: InputContainer,
    stop: threading.Event | None = None,
    keys_only: Callable[[], bool] = lambda: True,
    seen: Callable[[av.Packet], None] | None = None,
) -> Iterator[av.VideoFrame]:
    """A stream's video frames as they come: its keyframes only while `keys_only` says
    so (each one whole on its own: a fraction of the decoding), else every frame (each
    builds on those before it). An error when none has come for FRAME_TIMEOUT seconds
    (every packet is looked at, video or not, so a stream that sends audio but no
    picture is noticed too); ends when `stop` is set. `seen` hears each video packet.
    Decoded in the caller's thread alone, so the CPU it takes is that thread's."""
    video = c.streams.video[0]
    video.thread_count = 1
    codec = video.codec_context
    last = time.monotonic()
    for packet in c.demux():
        if stop and stop.is_set():
            return
        if packet.stream is video:
            if seen:
                seen(packet)
            skip = "NONKEY" if keys_only() else "DEFAULT"
            if codec.skip_frame != skip:
                codec.skip_frame = skip
            for frame in packet.decode():
                if isinstance(frame, av.VideoFrame):
                    last = time.monotonic()
                    yield frame
        if time.monotonic() - last > FRAME_TIMEOUT:
            raise TimeoutError(f"no video frame for {FRAME_TIMEOUT:.0f} s")


def first_frame(url: str) -> tuple[Image.Image | None, str, float]:
    """One frame of a stream (its first keyframe), at its own size, or None and why
    not; and the CPU it took (s). Blocking, for at most about OPEN_TIMEOUT +
    FRAME_TIMEOUT seconds."""
    started = time.thread_time()
    try:
        with _open(url) as c:
            for frame in _frames(c):
                return frame.to_image(), "", time.thread_time() - started
    except (FFmpegError, OSError, IndexError, TimeoutError) as exc:
        return None, str(exc) or type(exc).__name__, time.thread_time() - started
    return None, "the stream ended before a frame", time.thread_time() - started


class Reader:
    """One channel's stream, its newest frame kept, read in a thread of its own until
    stopped or lost (`error` then says why). It decodes keyframes only while
    `keys_only(reader)` says so (see Gatherer: when its pace is no faster than the
    stream's keyframe interval, `gop_s`, measured here), else every frame. The CPU it
    takes (decoding, and turning frames into pictures) is counted."""

    def __init__(
        self,
        entity: str,
        url: str,
        keys_only: Callable[["Reader"], bool] = lambda reader: True,
    ) -> None:
        self.entity = entity
        self.url = url
        self.started = time.monotonic()
        self.frame: av.VideoFrame | None = None
        self.at = 0.0  # when the newest frame came
        self.frames = 0
        self.error: str | None = None
        self.keyframes_only = True  # as last decided
        self.gop_s: float | None = None  # its keyframe interval, s (smoothed)
        self.cpu_s = 0.0  # its thread's CPU: reading and decoding
        self.convert_s = 0.0  # CPU turning frames into pictures (other threads)
        self._keys_only = keys_only
        self._last_key: float | None = None
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _keys(self) -> bool:
        self.keyframes_only = self._keys_only(self)
        return self.keyframes_only

    def _seen(self, packet: av.Packet) -> None:
        self.cpu_s = time.thread_time()  # this thread's CPU so far
        if packet.is_keyframe:
            now = time.monotonic()
            if self._last_key is not None:
                gap = now - self._last_key
                self.gop_s = gap if self.gop_s is None else 0.8 * self.gop_s + 0.2 * gap
            self._last_key = now

    def _run(self) -> None:
        try:
            with _open(self.url) as c:
                for frame in _frames(c, self._stop, self._keys, self._seen):
                    self.frame, self.at = frame, time.monotonic()
                    self.frames += 1
            if not self._stop.is_set():
                self.error = "the stream ended"
        except (FFmpegError, OSError, IndexError, TimeoutError) as exc:
            self.error = str(exc) or type(exc).__name__

    @property
    def alive(self) -> bool:
        return self._thread.is_alive()

    def stop(self) -> None:
        """Stops at its next packet (a lost stream at its read timeout)."""
        self._stop.set()

    def image(self) -> tuple[Image.Image, float] | None:
        """The newest frame as a picture, and when it came; None before the first.
        Converting takes a few ms (counted): call it off the event loop."""
        frame, at = self.frame, self.at
        if frame is None:
            return None
        started = time.thread_time()
        image = frame.to_image()
        self.convert_s += time.thread_time() - started
        return image, at

    def fps(self) -> float:
        """Frames decoded a second, since it started."""
        took = time.monotonic() - self.started
        return round(self.frames / took, 1) if took > 0 else 0.0
