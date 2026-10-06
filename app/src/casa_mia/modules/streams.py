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
from urllib.parse import quote

import aiohttp
import av
from av.container import InputContainer
from av.error import FFmpegError
from PIL import Image

_LOGGER = logging.getLogger(__name__)

OPEN_TIMEOUT = 10.0  # seconds to connect and get the first frame
READ_TIMEOUT = 5.0  # seconds without a frame before a stream counts as lost
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
    (no WebRTC: an MJPEG camera; a camera with WebRTC of its own; no stream source)."""
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
                    return None, str(event.get("message", "error"))
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


def first_frame(url: str) -> Image.Image | None:
    """One frame of a stream, at its own size; None if it gives none. Blocking."""
    try:
        with _open(url) as c:
            for frame in c.decode(c.streams.video[0]):
                return frame.to_image()
    except (FFmpegError, OSError, IndexError):
        return None
    return None


class Reader:
    """One channel's stream, its newest frame kept, read in a thread of its own until
    stopped or lost (`error` then says why)."""

    def __init__(self, entity: str, url: str) -> None:
        self.entity = entity
        self.url = url
        self.started = time.monotonic()
        self.frame: av.VideoFrame | None = None
        self.at = 0.0  # when the newest frame came
        self.frames = 0
        self.error: str | None = None
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        try:
            with _open(self.url) as c:
                video = c.streams.video[0]
                video.thread_type = "AUTO"  # decoded on several cores
                for frame in c.decode(video):
                    if self._stop.is_set():
                        return
                    self.frame, self.at = frame, time.monotonic()
                    self.frames += 1
            self.error = "the stream ended"
        except (FFmpegError, OSError, IndexError) as exc:
            self.error = str(exc)

    @property
    def alive(self) -> bool:
        return self._thread.is_alive()

    def stop(self) -> None:
        """Stops at its next frame (a lost stream at its read timeout)."""
        self._stop.set()

    def image(self) -> tuple[Image.Image, float] | None:
        """The newest frame as a picture, and when it came; None before the first.
        Converting takes a few ms: call it off the event loop."""
        frame, at = self.frame, self.at
        return (frame.to_image(), at) if frame is not None else None

    def fps(self) -> float:
        took = time.monotonic() - self.started
        return round(self.frames / took, 1) if took > 0 else 0.0
