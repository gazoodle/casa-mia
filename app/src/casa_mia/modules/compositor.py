"""compositor: on-demand camera compositor: the Camera Commander's picture.

A pipeline of stages that never wait on each other, all on one asyncio loop (the
gatherer's, shared by the live and the draft compositor), each paused and run on its own
and each at its own pace, settable on the Camera compositor page and by the integration
(PACES; INTERVAL until set):

  * the gatherer (Gatherer, one for both compositors): each camera channel wanted is
    fetched by a loop of its own at the gatherer's pace (0: continuous), from its stream
    where Home Assistant's go2rtc carries it, else as snapshots, into a cache that is
    never emptied ("(Waiting …)" until a channel's first picture). Each place (a tile,
    the main area) is drawn from the first of its camera's channels, low, medium, high,
    whose picture is at least its size, so it is only made smaller (`choose`); the
    channels' sizes are read once from their streams and kept across restarts. A channel
    that misses STRIKES times in a row (while others answer) sits out for BENCH seconds.
    A channel nobody wants is not fetched.
  * the generator (each compositor): while someone is watching (a stream open, or a
    picture asked for in the last LINGER seconds), each commander watched is drawn from
    the cache at the generator's pace, in a worker thread; a camera picture older than
    the commander's `stale` seconds is marked Stale. Open streams are told a new picture
    is ready.
  * the server (each compositor): sends the latest picture to any number of viewers; it
    never draws, it asks the generator.

Ported from tablet-provision/composite-test/server.py.

  GET /g/<name>.jpg       a commander's latest picture (poll it, or view it once); its
                          name as a slug: /g/cameras.jpg for the commander Cameras
  GET /g/<name>.mjpg      self-updating multipart stream, a frame per drawing
  GET /                   links; GET /status  cache ages and open streams
  GET /size-test          a commander at exactly the window's size, with the figures

Config is the Camera Dashboard's store in the app's config folder:
camera-dashboard-live.json (what was last deployed); the draft compositor reads the draft,
camera-dashboard.json.
"""

from __future__ import annotations

import asyncio
import collections
import functools
import html
import io
import json
import logging
import math
import os
import re
import socket
import threading
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import aiohttp
from aiohttp import web
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from .. import swap
from . import streams

_LOGGER = logging.getLogger(__name__)

PORT = 8099
INTERVAL = 2.0  # the paces until set (see PACES): seconds between fetches, drawings
LINGER = (
    30.0  # gathering goes on this long after the last request: a quick return is fresh
)
STRIKES = 3  # rounds a camera may miss in a row before it sits out
BENCH = 600.0  # seconds a camera sits out before it is tried again
KEEPALIVE = 10.0  # a stream is sent its picture again this often, even unchanged
MAX_STREAMS = 3  # per client address: older ones are images the browser abandoned
WARM_STREAM_EVERY = (
    90.0  # re-start the viewed cameras' live streams (HA drops idle ones)
)
WARM_STREAM_TIER = "medium"  # the channel the wall tablets play
STILL_TTL = 1.5  # a fetched still is shared by every preview drawn within this time
FETCH_TIMEOUT = 5  # seconds one camera's still may take
JPEG_QUALITY = 70
# Home Assistant's go2rtc restreams each camera it plays by WebRTC over RTSP, on localhost
# only and without a login (named by the camera's platform and unique id); the app reaches
# it on the host network.
GO2RTC_RTSP = ("127.0.0.1", 18554)
# The paces, settable on the Camera compositor page (seconds between): the gatherer's
# fetches of each channel (0: continuous, as fast as each one answers), and each
# generator's drawings; INTERVAL until set.
PACES = {
    "gatherer": (0.0, 15.0),
    "live": (0.125, 15.0),
    "draft": (0.125, 15.0),
    "survey": (10.0, 3600.0),  # the sleep between survey passes
    "survey_at_once": (1.0, 8.0),  # streams the survey reads at once (a count)
    # The oldest a picture may be for its stream to be decoded keyframes only, however
    # often it is drawn (s; 0: as fresh as its pace).
    "freshness": (0.0, 10.0),
}
FLAGS = {"live_main": True}  # the whole system's switches, and their defaults
PACE_DEFAULTS = {
    "gatherer": INTERVAL,
    "live": INTERVAL,
    "draft": INTERVAL,
    "survey": 60.0,
    "survey_at_once": 4.0,
    "freshness": 5.0,
}
IDLE = 0.02  # continuous: a stream with no new frame yet is looked at again this soon
GO2RTC_CHECK = 10.0  # seconds between looks at HA's go2rtc while it is out of reach
HA_WATCH_RETRY = 2.0  # seconds between tries to reach HA's websocket (_watch_ha_start)
STREAM_RETRY = 30.0  # seconds before a lost stream is read again (snapshots meanwhile)


@dataclass
class Config:
    entities: dict[str, dict[str, str]] = field(default_factory=dict)
    # The commanders, in order, each with every setting, as shown (see `visible`).
    commanders: list[dict] = field(default_factory=list)
    titles: dict[str, str] = field(default_factory=dict)  # camera -> its title

    def named(self, name: str) -> dict | None:
        """The commander served as /g/<name>: its name as a slug. /g/commander, the
        address before there were several (a dashboard deployed then), is the first."""
        if name == "commander" and self.commanders:
            return self.commanders[0]
        return next((c for c in self.commanders if slug(c["name"]) == name), None)


# The Camera Dashboard's stores (see camera_dashboard.py): what is deployed, and the draft.
LIVE_STORE = "camera-dashboard-live.json"
DRAFT_STORE = "camera-dashboard.json"
# A commander: one landscape picture, a main camera framed by four panels of cameras.
# Left and right sizes are % of the width, top and bottom % of the height. There are one
# or more, each a page of the dashboard named after it.
PANELS = ("left", "top", "right", "bottom")
LAYOUT = json.loads((Path(__file__).parents[1] / "layout.json").read_text())
EMPTY_COMMANDER = {
    "name": "Cameras",  # its page's title; as a slug, its page's path and picture's
    # Never changes: its device in the integration (Main camera, Track motion). "": the
    # first commander there was, on the integration's Camera Commander device itself.
    "id": "",
    # A page of its own on the dashboard; off: only drawn (and its device kept), for a
    # place other than the dashboard, such as a card to come.
    "page": True,
    "width": 1920,
    "height": 1080,
    "main": "",  # the main camera at start; blank: the first of the panels
    # The layout, shared with the Tablet Layout (casa_mia/layout.json, defaults and
    # labels): gap; margin (clear all round); main_fit: fit (whole, black borders),
    # fill (stretched), crop (filled), or the main camera sized by main_width (% of the
    # picture's width) with the panels sharing the room around it: own (its own shape, from `aspects`, so the
    # panels move with the camera shown) or fixed (the main_ratio shape; the camera
    # fitted whole within it); panel_min: own, fixed: the % a panel with cameras keeps
    # beside the main one.
    **{k: o["default"] for k, o in LAYOUT["main"].items() if o.get("for") != "view"},
    "stale": 30,  # seconds: a camera picture older than this is marked Stale
    # Track motion (done by the integration), seconds: how long a switch holds before
    # another, how long after the last motion it goes back to the camera chosen by hand
    # (0: it stays), and how long a choice by hand pauses tracking.
    "motion": {"hold": 10, "back": 30, "pause": 120},
    # Debug options: the whole picture dimmed to `dim` %, an L in each corner (`corner`
    # px long) and both diagonals, `width` px wide in `colour`, and over it the picture's
    # ID (name, size, scale) and when it was drawn. The Camera Commander card adds its
    # own numbers while it is on. px are CSS px (grown by the scale, as the text is).
    "debug": {"on": False, "dim": 20, "corner": 40, "width": 2, "colour": "#ffd60a"},
    # The outline the dashboard lays over the main camera's tile (the browser draws it):
    # colour, width and blur (glow) in px, and a pulse every `pulse` seconds (0: steady)
    # in a style: breathe (the glow swells and fades) or ripple (a ring spreads out).
    "highlight": {
        "colour": "#7bd1a0",
        "width": 2,
        "blur": 13,
        "pulse": 1.8,
        "style": "breathe",
    },
    "aspects": {},  # camera -> its natural shape (width / height), recorded when saved
    # Each panel: its cameras, size, fit (cover: filling equal tiles, cropped; contain:
    # whole in equal tiles; stack: whole at its own shape, edge to edge from the top or
    # left, spare room at the far end; reverse: the same, against the bottom or right;
    # centre: the same, in the middle, the spare room shared at both ends);
    # `lines`, the rows (top, bottom) or columns
    # (left, right) its cameras are shared between; `hidden`, off the view entirely
    # (no room, no tiles; its cameras kept for when it is shown again). Top and bottom:
    # an anchored end runs to the view's edge, and the side panel stops at it; an end
    # not anchored stops at the side panel, which runs to the view's edge.
    **{p: {"cameras": [], **d} for p, d in LAYOUT["panels"].items()},
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")


# A picture asked for at a size (a card drawing it exactly the size it is shown): no more
# pixels than this, and no side under MIN_SIDE. The card caps and rounds the size itself
# (see integration/cards/src/commander.ts), so it lays its taps out for the same canvas.
MAX_PIXELS = 2560 * 1600
MIN_SIDE = 64
Size = tuple[int, int, float]  # width and height in device pixels, and the scale (dpr)


def asked_size(query: Any) -> Size | None:
    """The size in a picture's address (?w=&h= in device pixels, dpr: the screen's
    pixels per CSS pixel); None when there is none, or it is out of bounds."""
    try:
        w, h = int(query["w"]), int(query["h"])
        dpr = float(query.get("dpr", 1))
    except (KeyError, ValueError, TypeError):
        return None
    ok = MIN_SIDE <= min(w, h) and w * h <= MAX_PIXELS * 1.1 and 0.5 <= dpr <= 4
    return (w, h, dpr) if ok else None


def viewer(request: web.BaseRequest) -> str | None:
    """The device a picture is for: the client, or the viewer Home Assistant names when it
    passes a picture on (the integration's pictures.py, for a viewer away from home), so
    MAX_STREAMS counts each viewer rather than Home Assistant.
    ponytail: the header is taken from anyone; it only steers that courtesy limit."""
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or request.remote


LIVE_MAIN = "~live"  # a picture's key: its main camera left to the card's live video


def view_key(name: str, size: Size | None, live_main: bool = False) -> str:
    """A commander's picture at a size: its own key (its slug alone at its set size),
    marked when its main camera is the card's live video (see `sized`)."""
    key = name if size is None else f"{name}@{size[0]}x{size[1]}x{size[2]:g}"
    return key + LIVE_MAIN if live_main else key


def sized(cmd: dict, size: Size | None, live_main: bool = False) -> dict:
    """The commander drawn at a size asked for: that canvas, its gap, text and bars grown
    by the scale, so they look the same in CSS pixels on any screen. `live_main`: its
    main camera is played by the card as live video over the picture, so its main area
    is drawn from whatever the cache holds (its channel is not fetched for it) and
    without its caption (the card draws it)."""
    if size is None and not live_main:
        return cmd
    out = dict(cmd)
    if size is not None:
        w, h, dpr = size
        out |= {
            "width": w,
            "height": h,
            "gap": round(cmd["gap"] * dpr),
            "margin": round(cmd.get("margin", 0) * dpr),
            "scale": dpr,
        }
    out["main_video"] = live_main
    out["view"] = view_key(slug(cmd["name"]), size, live_main)
    return out


def key_of(cmd: dict) -> str:
    """The key a commander's picture is kept under: its view's, or its slug's."""
    return cmd.get("view") or slug(cmd["name"])


def commanders_of(store: dict) -> list[dict]:
    """A store's commanders, in order, each with every setting. A store saved before
    there were several has its one commander (named Cameras). Its own size is always
    the default: a card asks for the size it is shown, and the page no longer sets one
    (a size saved before then is ignored)."""
    found = store.get("commanders")
    if not isinstance(found, list):
        found = [store.get("commander") or {}]
    own = {k: EMPTY_COMMANDER[k] for k in ("width", "height")}
    return [{**EMPTY_COMMANDER, **c, **own} for c in found if isinstance(c, dict)]


def config_from_store(store: dict) -> Config:
    """The compositor's view of a Camera Dashboard store: the commanders name their
    cameras by entity, and each camera's title and channels live once, under "cameras"."""
    cams = store.get("cameras", {})
    cfg = Config()
    cfg.entities = {
        e: {k: c[k] for k in ("medium", "high", "zoom") if c.get(k)}
        for e, c in cams.items()
    }
    cfg.commanders = [visible(c) for c in commanders_of(store)]
    cfg.titles = {e: c.get("title", e) for e, c in cams.items()}
    return cfg


def refused(why: str) -> bool:
    """Whether a stream failed because HA's go2rtc itself refused it (down)."""
    return "Connection refused" in why or "Errno 111" in why


def forgotten(why: str) -> bool:
    """Whether HA's go2rtc no longer has a stream it was given (it restarted with HA)."""
    return "404 Not Found" in why


def measured(fn: Callable[..., Any], *args: Any) -> tuple[Any, float]:
    """fn(*args), and the CPU it took (s): for a call in a worker thread."""
    started = time.thread_time()
    result = fn(*args)
    return result, time.thread_time() - started


def memory() -> dict[str, int | None]:
    """The app's memory (resident) and the box's (total, available), bytes; None where
    the system does not say (not Linux)."""
    out: dict[str, int | None] = {"rss": None, "total": None, "free": None}
    try:
        for line in Path("/proc/self/status").read_text().splitlines():
            if line.startswith("VmRSS:"):
                out["rss"] = int(line.split()[1]) * 1024
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, value = line.split(":", 1)
            if key in ("MemTotal", "MemAvailable"):
                out["total" if key == "MemTotal" else "free"] = (
                    int(value.split()[0]) * 1024
                )
    except (OSError, ValueError, IndexError):
        import resource

        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        out["rss"] = rss if os.uname().sysname == "Darwin" else rss * 1024
    return out


MONITOR_EVERY = 2.0  # seconds between the whole system's samples
MONITOR_KEEP = 90  # samples kept: 3 minutes
HEALTH_S = 30.0  # seconds of samples the health verdict is judged on
LAG_WAITING = 10.0  # % of the streams' time sends wait, lasting, that means lag
# The health verdict's states, worst first (see Gatherer.verdict); the integration's
# sensor has the same.
HEALTH_STATES = (
    "go2rtc_down",
    "streams_failing",
    "paused",
    "cpu_gathering",
    "cpu_drawing",
    "drawing_behind",
    "network",
    "idle",
    "fine",
)


def go2rtc_reachable(timeout: float = 1.0) -> bool:
    """Whether Home Assistant's go2rtc answers RTSP here."""
    host, port = GO2RTC_RTSP
    try:
        with socket.create_connection((host, port), timeout) as s:
            s.settimeout(timeout)
            s.sendall(
                f"OPTIONS rtsp://{host}:{port}/ RTSP/1.0\r\nCSeq: 1\r\n\r\n".encode()
            )
            return s.recv(64).startswith(b"RTSP/1.0 200")
    except OSError:
        return False


def channels(cfg: Config, camera: str) -> dict[str, str]:
    """A camera's channels by tier, smallest first: its own entity (low, or its only
    one), then its medium and high as set on the Camera Dashboard page. Not its zoom:
    that is another view, not a larger one."""
    out = {"low": camera}
    for tier in ("medium", "high"):
        entity = cfg.entities.get(camera, {}).get(tier)
        if entity and entity not in out.values():
            out[tier] = entity
    return out


def enlarged(native: tuple[int, int], place: tuple[int, int], whole: bool) -> float:
    """How much a still that size is enlarged to be drawn in the place (above 1: made
    larger, so softer): whole, fitted inside it; else filling it."""
    (w, h), (pw, ph) = native, place
    return (min if whole else max)(pw / w, ph / h) if w and h else math.inf


def choose(
    ladder: list[str],
    sizes: dict[str, tuple[int, int]],
    place: tuple[int, int],
    whole: bool,
    default: str,
) -> str:
    """The channel a place is drawn from: going up the ladder (low, medium, high), the
    first whose still is at least the place's size, so it is only made smaller (the
    sharpest for the bytes); none is: the largest. Channels of unknown size (not yet
    fetched) are passed over; none known: the default."""
    known = [c for c in ladder if c in sizes]
    for c in known:
        if enlarged(sizes[c], place, whole) <= 1:
            return c
    return known[-1] if known else default


def load_config(directory: Path, store: str = LIVE_STORE) -> Config:
    """The store (see `config_from_store`); an empty config until there is one."""
    if (directory / store).exists():
        return config_from_store(json.loads((directory / store).read_text()))
    return Config()


@dataclass
class Sending:
    """An open stream, measured: what it sent, and how long writes waited for the
    network to take it (a slow link shows as waiting; a busy box as slow drawing)."""

    picture: str
    viewer: str
    since: float
    frames: int = 0
    sent: int = 0
    waiting: float = 0.0
    skipped: int = 0  # pictures drawn for it that it never sent (it was still sending)
    sid: str = ""  # the card's name for it (one showing of its picture), if it gave one
    card: str = ""  # the card's version, if it gave one (an older card gives none)
    ended: str = ""  # why it ended, when something ended it (else: the viewer left)
    gather: "Gatherer | None" = None  # the whole system's tally, kept too

    async def write(self, resp: web.StreamResponse, data: bytes) -> None:
        began = time.monotonic()
        token = self.gather.begin("send_wait") if self.gather else None
        try:
            await resp.write(data)
        finally:
            if self.gather:
                self.gather.end(token)
        self.waiting += time.monotonic() - began
        self.frames += 1
        self.sent += len(data)
        if self.gather:
            self.gather.sent(len(data))

    def figures(self, now: float) -> dict[str, Any]:
        open_s = max(now - self.since, 0.001)
        return {
            "picture": self.picture,
            "viewer": self.viewer,
            "open_s": round(open_s),
            "frames": self.frames,
            "kb_frame": round(self.sent / max(self.frames, 1) / 1000),
            "kbit_s": round(self.sent * 8 / 1000 / open_s),
            "waiting_pct": round(100 * self.waiting / open_s),
            # Pictures a second it sent (what its viewer saw), and that were drawn for
            # it (what there was to send).
            "sid": self.sid,
            "card": self.card,
            "fps": round(self.frames / open_s, 1),
            "drawn_fps": round((self.frames + self.skipped) / open_s, 1),
        }


# --- drawing: pure functions of the config and the images -----------------------------

FONT = ImageFont.load_default(size=20)


@functools.lru_cache(maxsize=64)
def _stand_in(path: Path, _mtime: int) -> bytes:
    """A screenshot swap picture as a camera still, at its own size."""
    return encode(Image.open(path).convert("RGB"), JPEG_QUALITY)


def encode(img: Image.Image, quality: int) -> bytes:
    """JPEG; or WebP when the picture has transparent gaps (RGBA), so a dashboard's own
    background shows through them. Both play in an <img>, single or streamed."""
    out = io.BytesIO()
    if img.mode == "RGBA":
        img.save(out, "WEBP", quality=quality, method=0)  # method 0: the fastest
    else:
        img.save(out, "JPEG", quality=quality)
    return out.getvalue()


def mime(data: bytes) -> str:
    return "image/webp" if data[:4] == b"RIFF" else "image/jpeg"


# --- the commander -------------------------------------------------------------------

Rect = tuple[int, int, int, int]
# A camera picture: a snapshot (JPEG, as HA gives it) or a frame of its stream.
Picture = bytes | Image.Image
# A place drawn from a channel: (picture, where, size, whole).
Use = tuple[str, str, tuple[int, int], bool]


def as_image(raw: Picture, size: tuple[int, int]) -> Image.Image:
    """A picture to draw at about that size: a JPEG decoded smaller where it is much
    larger (cheaply, by draft); a stream frame as it is."""
    if isinstance(raw, Image.Image):
        return raw
    src = Image.open(io.BytesIO(raw))
    src.draft("RGB", size)
    return src.convert("RGB")


def visible(cmd: dict) -> dict:
    """The commander as it is shown: a hidden panel's cameras left out (it takes no
    room, has no tiles, and its cameras are not the commander's until it is shown)."""
    return {
        **cmd,
        **{
            p: {**cmd[p], "cameras": []}
            for p in PANELS
            if p in cmd and cmd[p].get("hidden")
        },
    }


def commander_cameras(cmd: dict) -> list[str]:
    """The commander's cameras, each once, panel by panel (left, top, right, bottom)."""
    return list(
        dict.fromkeys(e for p in PANELS for e in cmd.get(p, {}).get("cameras", []))
    )


def cameras_of(commanders: list[dict]) -> list[str]:
    """Every commander's cameras, each once, commander by commander."""
    return list(dict.fromkeys(e for c in commanders for e in commander_cameras(c)))


def _line(rect: Rect, n: int, down: bool, gap: int) -> list[Rect]:
    """n tiles in a line filling rect: down a column, or across a row."""
    x, y, w, h = rect
    span = h if down else w
    edges = [round(i * (span - (n - 1) * gap) / n + i * gap) for i in range(n + 1)]
    cells = [
        (edges[i], edges[i + 1] - edges[i] - (gap if i < n - 1 else 0))
        for i in range(n)
    ]
    cells[-1] = (cells[-1][0], span - cells[-1][0])
    return [(x, y + a, w, b) if down else (x + a, y, b, h) for a, b in cells]


def _stack(
    rect: Rect, shapes: list[float], down: bool, gap: int, place: str
) -> list[Rect]:
    """Tiles at their own shapes (width / height) in a line, edge to edge (`gap`
    apart): as wide as rect when they run down, as tall when across. `place`: they
    start at the top or left (stack), end at the bottom or right (reverse), or sit in
    the middle (centre). Too long for rect: all shrink by the same factor, centred
    across it."""
    x, y, w, h = rect
    across, span = (w, h) if down else (h, w)
    lengths = [across / a if down else across * a for a in shapes]
    room = span - gap * (len(shapes) - 1)
    scale = min(1.0, room / sum(lengths)) if sum(lengths) > 0 and room > 0 else 0.0
    side = int(across * scale)
    lengths = [int(n * scale) for n in lengths]  # down, so they never overrun
    total = sum(lengths) + gap * (len(shapes) - 1)
    at = {"reverse": span - total, "centre": (span - total) // 2}.get(place, 0)
    off = (across - side) // 2
    out = []
    for n in lengths:
        out.append((x + off, y + at, side, n) if down else (x + at, y + off, n, side))
        at += n + gap
    return out


def _lines(
    rect: Rect,
    n: int,
    lines: int,
    down: bool,
    gap: int,
    shapes: list[float] | None = None,
    place: str = "stack",
) -> list[Rect]:
    """n tiles in `lines` lines filling rect: columns side by side when the tiles run
    down (left, right), rows one above another when they run across (top, bottom). The
    cameras fill the lines in turn, the first lines taking one more when they don't
    share evenly; each line spreads its own across its length, or, given each camera's
    shape, stacks them (see `_stack`)."""
    lines = max(1, min(lines, n))
    strips = _line(rect, lines, not down, gap)
    out: list[Rect] = []
    first = 0
    for i, strip in enumerate(strips):
        count = n // lines + (1 if i < n % lines else 0)
        if shapes is None:
            out += _line(strip, count, down, gap)
        else:
            out += _stack(strip, shapes[first : first + count], down, gap, place)
        first += count
    return out


STACKS = ("stack", "reverse", "centre")  # panel fits: each camera at its own shape
SIZED = ("own", "fixed")  # main camera fits that set its size, and the panels' sizes


def ratio(value: object) -> float:
    """A shape as a number: 1.78, "1.78", "16:9" or "16/9" (width over height)."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
    else:
        text = str(value).strip().replace("/", ":")
        a, _, b = text.partition(":")
        number = float(a) / float(b) if b else float(a)
    if not number > 0:
        raise ValueError(f"not a shape: {value!r}")
    return number


def main_shape(cmd: dict, main: str | None) -> float | None:
    """The main camera's shape when it sets its own size (own, fixed), else None."""
    fit = cmd.get("main_fit", "fit")
    if fit == "fixed":
        return ratio(cmd.get("main_ratio", "16:9"))
    if fit == "own":
        return float((cmd.get("aspects") or {}).get(main or "") or 16 / 9)
    return None


def commander_layout(
    cmd: dict, main: str | None = None
) -> tuple[tuple[int, int], Rect, dict[str, list[Rect]]]:
    """Canvas size, the main camera's area, and each panel's tile rects. Top and bottom
    run to the view's edge at an anchored end (the side panel stops at them there), else
    stop at the side panel; the main camera fills what is left. An empty panel takes no
    room. With a sized main camera (own, fixed) it is main_width wide at its shape, and
    the panels share the room around it (so with own, the layout follows `main`).
    Shared with the dashboard generator, so its tap zones line up. A margin leaves that
    much clear all round: the layout is made inside it."""
    w, h, gap = cmd["width"], cmd["height"], cmd["gap"]
    m = max(0, min(int(cmd.get("margin", 0)), (min(w, h) - 1) // 2))
    if m:
        inside = {**cmd, "width": w - 2 * m, "height": h - 2 * m, "margin": 0}
        _, area, tiles = commander_layout(inside, main)

        def moved(r: Rect) -> Rect:
            return (r[0] + m, r[1] + m, r[2], r[3])

        return (
            (w, h),
            moved(area),
            {p: [moved(r) for r in rs] for p, rs in tiles.items()},
        )
    shape = main_shape(cmd, main)

    def size(panel: str, of: int) -> int:
        """Its width or height: % of the view's, or px (CSS px, grown by the scale, as
        the gap is) up to 45% of it, so a small screen still has a main camera."""
        pane = cmd[panel]
        if not pane["cameras"]:
            return 0
        if pane.get("unit") == "px":
            return min(round(pane["size"] * cmd.get("scale", 1)), of * 45 // 100)
        return round(of * pane["size"] / 100)

    def anchored(panel: str, end: str) -> bool:
        key = f"anchor_{end}"
        return bool(cmd[panel].get(key, EMPTY_COMMANDER[panel][key]))

    if shape is None:
        left, right, top, bottom = (
            size("left", w),
            size("right", w),
            size("top", h),
            size("bottom", h),
        )
    else:
        smallest = cmd.get("panel_min", 8)  # % a panel with cameras always keeps

        def kept(of: int, a: str, b: str) -> int:
            """The room the panels either side of the main camera keep, at the least."""
            n = bool(cmd[a]["cameras"]) + bool(cmd[b]["cameras"])
            return n * (round(of * smallest / 100) + gap)

        most_w, most_h = w - kept(w, "left", "right"), h - kept(h, "top", "bottom")
        mw = min(round(w * cmd.get("main_width", 70) / 100), most_w)
        mh = round(mw / shape)
        if mh > most_h:  # a tall camera (or a wide main width): smaller, same shape
            mh, mw = most_h, round(most_h * shape)

        def share(space: int, a: str, b: str) -> tuple[int, int]:
            """The room beside the main camera, to the panels either side of it."""
            ha, hb = bool(cmd[a]["cameras"]), bool(cmd[b]["cameras"])
            room = max(space - gap * (ha + hb), 0)
            if ha and hb:
                return room // 2, room - room // 2
            return (room, 0) if ha else (0, room) if hb else (0, 0)

        left, right = share(w - mw, "left", "right")
        top, bottom = share(h - mh, "top", "bottom")
    x0 = left + (gap if left else 0)  # the main camera's columns
    x1 = w - right - (gap if right else 0)
    y0 = top + (gap if top else 0)  # and rows
    y1 = h - bottom - (gap if bottom else 0)

    def across(panel: str, y: int, height: int) -> Rect:
        a = 0 if anchored(panel, "left") else x0
        b = w if anchored(panel, "right") else x1
        return (a, y, b - a, height)

    def down(x: int, width: int, end: str) -> Rect:
        a = y0 if top and anchored("top", end) else 0
        b = y1 if bottom and anchored("bottom", end) else h
        return (x, a, width, b - a)

    areas = {
        "top": across("top", 0, top),
        "bottom": across("bottom", h - bottom, bottom),
        "left": down(0, left, "left"),
        "right": down(w - right, right, "right"),
    }

    def shapes(panel: str) -> list[float] | None:
        """Each camera's own shape, for a panel that stacks them."""
        if cmd[panel].get("fit") not in STACKS:
            return None
        known = cmd.get("aspects") or {}
        return [float(known.get(e) or 16 / 9) for e in cmd[panel]["cameras"]]

    tiles = {
        p: _lines(
            areas[p],
            len(cmd[p]["cameras"]),
            int(cmd[p].get("lines", 1)),
            p in ("left", "right"),
            gap,
            shapes(p),
            cmd[p].get("fit", "cover"),
        )
        if cmd[p]["cameras"]
        else []
        for p in PANELS
    }
    main_area = (x0, y0, x1 - x0, y1 - y0)
    if shape is not None:  # exactly its size, centred where the panels left room
        mw, mh = min(mw, x1 - x0), min(mh, y1 - y0)
        main_area = (x0 + (x1 - x0 - mw) // 2, y0 + (y1 - y0 - mh) // 2, mw, mh)
    return (w, h), main_area, tiles


STALE = (245, 166, 35)  # the Stale mark: amber


def _stale_mark(
    draw: ImageDraw.ImageDraw, at: tuple[int, int], font: Any, scale: float = 1
) -> None:
    """ "Stale" in an amber pill, its right end at `at` (vertically centred there)."""
    box = draw.textbbox(at, "Stale", font=font, anchor="rm")
    x, y = round(6 * scale), round(3 * scale)
    draw.rounded_rectangle(
        (box[0] - x, box[1] - y, box[2] + x, box[3] + y), radius=x, fill=STALE
    )
    draw.text(at, "Stale", fill="black", font=font, anchor="rm")


SMALL_BAR = 22


@functools.lru_cache(maxsize=16)
def _fonts(scale: float) -> tuple[Any, Any, Any]:
    """The small, normal and big fonts, grown by `scale` (a screen's pixels per CSS
    pixel, for a picture drawn at a size asked for)."""
    return tuple(ImageFont.load_default(size=round(n * scale)) for n in (16, 20, 40))  # type: ignore[return-value]


MOTION_DOT = (235, 50, 40)  # the accent green: the tile shown as the main camera


def see_through(cmd: dict) -> bool:
    """Whether a commander's picture has clear parts, where the dashboard's background
    shows: its gaps, and the borders beside a main camera kept whole (fit, fixed, own).
    Decided by its settings, not each picture, so its stream keeps one format (WebP
    with clear parts, else JPEG) whichever camera is the main one."""
    return bool(cmd["gap"] or cmd.get("margin")) or cmd.get("main_fit", "fit") in (
        "fit",
        "fixed",
        "own",
    )


def commander(
    cmd: dict,
    titles: dict[str, str],
    tiles: Mapping[str, Picture | None],
    main: str,
    main_image: Picture | None,
    changing: bool = False,
    motion: frozenset[str] = frozenset(),
    stale: frozenset[str] = frozenset(),
    main_stale: bool = False,
) -> bytes:
    """Draw the commander: each panel's cameras (the main one framed), and the main camera
    in its natural shape, as large as fits its area, centred. `changing`: the picture
    shown the moment the main camera is switched, from stills already to hand: blurred,
    with "Changing to <camera>" over it, until the sharp one is ready. `stale`: the
    cameras whose tile picture is old (marked Stale); `main_stale`: the main picture is."""
    size, main_rect, rects = commander_layout(cmd, main)
    # Drawn at a size asked for (see `sized`), text, bars and margins grow by its scale.
    scale = float(cmd.get("scale", 1))
    small, font, big = _fonts(scale)

    def u(n: float) -> int:
        return round(n * scale)

    bar = u(SMALL_BAR)
    # Drawn solid, so the name bars and labels shade the picture under them; the gaps
    # are cut out at the end. (Drawn on a transparent canvas, a see-through bar would
    # replace the picture under it, and the dashboard's background would show through.)
    canvas = Image.new("RGB", size, "black")
    draw = ImageDraw.Draw(canvas, "RGBA")
    for panel in PANELS:
        fit = cmd[panel].get("fit", "cover")
        for entity, (x, y, w, h) in zip(
            cmd[panel]["cameras"], rects[panel], strict=True
        ):
            if w <= 0 or h <= 0:  # no room left beside a large main camera
                continue
            raw = tiles.get(entity)
            if raw:
                try:
                    src = as_image(raw, (w, h))
                    img = (
                        ImageOps.fit(src, (w, h))
                        if fit == "cover"
                        else ImageOps.contain(src, (w, h))
                    )
                    canvas.paste(
                        img, (x + (w - img.width) // 2, y + (h - img.height) // 2)
                    )
                except OSError:
                    raw = None
            if not raw:
                draw.text(
                    (x + w // 2, y + h // 2),
                    "no signal",
                    fill="white",
                    font=small,
                    anchor="mm",
                )
            draw.rectangle((x, y + h - bar, x + w, y + h), fill=(0, 0, 0, 140))
            draw.text(
                (x + u(6), y + h - bar // 2),
                swap.out(str(titles.get(entity) or entity)),
                fill="white",
                font=small,
                anchor="lm",
            )
            if raw and entity in stale:
                _stale_mark(draw, (x + w - u(6), y + h - bar // 2), small, scale)
            if entity in motion:  # a red dot: this camera sees motion now
                r = max(u(5), min(w, h) // 18)
                cx, cy = x + w - r - u(6), y + r + u(6)
                draw.ellipse(
                    (cx - r, cy - r, cx + r, cy + r), fill=MOTION_DOT, outline="white"
                )
    x, y, w, h = main_rect
    shown = main_rect  # the main area that is solid: the camera's picture, once drawn
    if w > 0 and h > 0:
        # Fit: whole, as large as fits, centred (black borders); fill: stretched to the
        # area; crop: filling it, the overflow cut off. Its name and the time go along
        # the foot of the picture, clear of the camera's own caption at the top.
        px, py, pw, ph = x, y, w, h
        if main_image:
            try:
                src = as_image(main_image, (w, h))
                fit = cmd.get("main_fit", "fit")
                if fit == "fill":
                    img = src.resize((w, h))
                elif fit == "crop":
                    img = ImageOps.fit(src, (w, h))
                else:
                    img = ImageOps.contain(src, (w, h))
                px, py, pw, ph = (
                    x + (w - img.width) // 2,
                    y + (h - img.height) // 2,
                    img.width,
                    img.height,
                )
                canvas.paste(img, (px, py))
                shown = (px, py, pw, ph)
            except OSError:
                main_image = None
        if not main_image:
            draw.text(
                (x + w // 2, y + h // 2),
                "no signal",
                fill="white",
                font=font,
                anchor="mm",
            )
        label = swap.out(titles.get(main, main))
        if changing:
            area = (px, py, px + pw, py + ph)
            canvas.paste(
                canvas.crop(area).filter(ImageFilter.GaussianBlur(u(14))), area[:2]
            )
            text = f"Changing to {label}…"
            box = draw.textbbox(
                (px + pw // 2, py + ph // 2), text, font=big, anchor="mm"
            )
            draw.rounded_rectangle(
                (box[0] - u(18), box[1] - u(12), box[2] + u(18), box[3] + u(12)),
                radius=u(12),
                fill=(0, 0, 0, 170),
            )
            draw.text(
                (px + pw // 2, py + ph // 2),
                text,
                fill="white",
                font=big,
                anchor="mm",
            )
        live = bool(cmd.get("main_video"))  # the card's live video plays over it
        if main_image and main_stale and not live:
            _stale_mark(draw, (px + pw - u(10), py + u(22)), font, scale)
        foot = py + ph - u(18)
        if not live:  # (the card draws a live main camera's caption)
            pill = draw.textbbox((px + u(10), foot), label, font=font, anchor="lm")
            draw.rectangle(
                (pill[0] - u(6), pill[1] - u(4), pill[2] + u(6), pill[3] + u(4)),
                fill=(0, 0, 0, 160),
            )
            draw.text((px + u(10), foot), label, fill="white", font=font, anchor="lm")
            draw.text(
                (px + pw - u(10), foot),
                datetime.now().strftime("%H:%M:%S"),
                fill="white",
                font=font,
                anchor="rm",
            )
    if see_through(cmd):  # every tile and the main picture solid; the rest is clear
        mask = Image.new("L", size, 0)
        solid = ImageDraw.Draw(mask)
        for x, y, w, h in [shown, *(r for p in PANELS for r in rects[p])]:
            if w > 0 and h > 0:
                solid.rectangle((x, y, x + w - 1, y + h - 1), fill=255)
        canvas.putalpha(mask)
    debug = {**EMPTY_COMMANDER["debug"], **(cmd.get("debug") or {})}
    if debug["on"]:
        canvas = _debug(canvas, cmd, debug, scale)
    return encode(canvas, JPEG_QUALITY)


def _debug(canvas: Image.Image, cmd: dict, debug: dict, scale: float) -> Image.Image:
    """The debug overlay (see EMPTY_COMMANDER["debug"]): everything dimmed (the clear
    parts stay clear), corner Ls and diagonals to show the picture's true edges, and
    its ID and draw time 30% down the middle, clear of the corners and the crossing."""
    w, h = canvas.size
    rgb = canvas.convert("RGB").point(lambda v: v * float(debug["dim"]) / 100)
    if canvas.mode == "RGBA":
        rgb.putalpha(canvas.getchannel("A"))
    canvas = rgb
    draw = ImageDraw.Draw(canvas)
    colour, lw = debug["colour"], max(1, round(float(debug["width"]) * scale))
    arm, edge = round(float(debug["corner"]) * scale), lw // 2
    for x, y, dx, dy in (
        (0, 0, 1, 1),
        (w - 1, 0, -1, 1),
        (0, h - 1, 1, -1),
        (w - 1, h - 1, -1, -1),
    ):
        cx, cy = x + dx * edge, y + dy * edge
        draw.line((cx, cy, cx + dx * arm, cy), fill=colour, width=lw)
        draw.line((cx, cy, cx, cy + dy * arm), fill=colour, width=lw)
    draw.line((0, 0, w - 1, h - 1), fill=colour, width=lw)
    draw.line((w - 1, 0, 0, h - 1), fill=colour, width=lw)
    font = _fonts(scale)[1]
    text = (
        f"{cmd['name']}  {w} x {h}  @{scale:g}x\n"
        f"drawn {datetime.now().strftime('%H:%M:%S.%f')[:-3]}"
    )
    at = (w // 2, round(h * 0.3))
    box = draw.multiline_textbbox(at, text, font=font, anchor="mm", align="center")
    pad = round(10 * scale)
    draw.rectangle(
        (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad), fill=(0, 0, 0)
    )
    draw.multiline_text(at, text, fill=colour, font=font, anchor="mm", align="center")
    return canvas


# --- the service ----------------------------------------------------------------------


@functools.lru_cache(maxsize=16)
def waiting_picture(shape: float) -> Image.Image:
    """A channel's picture before its first comes: white, "(Waiting …)", at its shape
    (small: it is only ever drawn smaller or a little larger, and it is never its size)."""
    w = 640
    h = max(90, round(w / shape)) if shape > 0 else 360
    img = Image.new("RGB", (w, h), "white")
    ImageDraw.Draw(img).text(
        (w // 2, h // 2),
        "(Waiting …)",
        fill=(110, 110, 110),
        font=_fonts(2)[1],
        anchor="mm",
    )
    return img


class Gatherer:
    """Every camera picture the compositors draw from, fetched once for all of them (the
    live one and the preview's), into one cache. It runs the asyncio loop the
    compositors share, in a thread of its own.

    Each compositor says, as it draws, which channel each of its places is drawn from
    (`want`). Each channel wanted is then fetched by a loop of its own, at its pace:
    a frame of its stream where Home Assistant's go2rtc carries it (converted once, when
    a new one has come), else a snapshot. A slow or dead camera holds up only itself; a
    channel that misses STRIKES times in a row (while others answer) sits out for BENCH
    seconds. A channel nobody has wanted for LINGER seconds is no longer fetched, nor its
    stream read; nobody wanting anything: nothing is fetched. Paused: nothing is fetched
    either, and the cache keeps what it has.

    Every channel has a picture from the start: "(Waiting …)" until its first comes, so
    the compositors draw at once. Each channel's size (its stream's, else its
    snapshot's) is kept in `sizes_path` across restarts, updated when it changes, and
    chooses which channel a place is drawn from before any picture has come."""

    def __init__(
        self,
        ha_url: str,
        token: str,
        ws_path: str = "/websocket",
        sizes_path: Path | None = None,
        pace_path: Path | None = None,
    ) -> None:
        self.ha_url = ha_url.rstrip("/")  # the Supervisor proxy, or http://host:8123
        self.ws_url = self.ha_url.replace("http", "ws", 1) + ws_path
        self.token = token
        self.sizes_path = sizes_path
        self.cfg = Config()  # every compositor's cameras: their channels and titles
        self._cfgs: dict[str, Config] = {}
        self.go2rtc: bool | None = None  # HA's go2rtc reachable, as found at start
        self.loop: asyncio.AbstractEventLoop | None = None
        self.http: aiohttp.ClientSession | None = None
        self.paused = False
        self.gathering = False
        self._lock = threading.Lock()
        self._stills: dict[str, tuple[float, asyncio.Future]] = {}  # shared fetches
        # The pictures, never emptied: channel (a camera entity) -> (when, picture), each
        # at the channel's own size (or "(Waiting …)", the channels in _waiting); each
        # channel's size, kept across restarts (the channels whose size is their
        # stream's in _streamed); and how long its last snapshot took (s).
        self.shots: dict[str, tuple[float, Picture]] = {}
        self._waiting: set[str] = set()
        self.res: dict[str, tuple[int, int]] = {}
        self._streamed: set[str] = set()
        self._took: dict[str, float] = {}
        # The paces (seconds between): the gatherer's and each generator's (see PACES),
        # kept in pace_path; an event set (and replaced) when one changes, so a wait in
        # progress takes up a new one at once.
        self.pace_path = pace_path
        self.paces: dict[str, float] = {}
        # Switches for the whole system (kept with the paces): live_main, cards may play
        # their main camera as live video over the picture (see `sized`).
        self.flags: dict[str, bool] = dict(FLAGS)
        self._repaced: asyncio.Event | None = None
        self._load_paces()
        self._shot_size: dict[str, tuple[int, int]] = {}  # each picture's own size
        # Channels whose snapshot is not their stream's size: their snapshots unwanted.
        self._snap_wrong: set[str] = set()
        self._load_sizes()
        # Each compositor (by its store) -> when it last said what it wants, and that:
        # each channel -> its places (picture, where, size, whole); all of them now.
        self._wants: dict[str, tuple[float, dict[str, list[Use]]]] = {}
        self.uses: dict[str, list[Use]] = {}
        self._wanted: dict[str, float] = {}  # channel -> when last wanted
        self._feeds: dict[str, asyncio.Task] = {}  # channel -> its fetching loop
        self._fresh: dict[str, asyncio.Event] = {}  # channel -> set at its next picture
        # Each channel read from its stream (HA's go2rtc): its reader and the frame last
        # taken from it; its name there; when one HA cannot stream (or whose stream was
        # lost) is tried again, and why; those being read once for their size.
        self._readers: dict[str, streams.Reader] = {}
        self._taken: dict[str, float] = {}
        self._names: dict[str, str] = {}
        self._no_stream: dict[str, tuple[float, str]] = {}
        # The survey (see _survey_loop): the channels it is reading now, and its pass.
        self._surveying: set[str] = set()
        # Each channel's last few surveys (newest last): when, what came of it, why
        # not its stream, how long it took, and the size it gave.
        self._surveyed: dict[str, collections.deque[dict[str, Any]]] = {}
        self.survey: dict[str, Any] = {"running": False, "done": 0, "of": 0}
        self._pass: asyncio.Future | None = None  # the survey pass under way
        self._misses: dict[str, int] = {}  # channel -> fetches missed in a row
        self._benched: dict[str, float] = {}  # channel -> when it is tried again
        self._answered = 0.0  # when any channel last answered (HA up)
        self._ha_down = False
        self._wake: asyncio.Event | None = None  # look at the wants now
        self._survey_now: asyncio.Event | None = None  # a survey pass now
        self._bg: set[asyncio.Task] = set()
        # The whole compositor system's running totals: CPU (s) gathering (decoding and
        # converting streams, surveying; readers still running are added when sampled)
        # and composing (drawing and encoding), and what was sent to viewers (bytes,
        # pictures); and time spent (s): streams open, writes waiting for the network,
        # each compositor drawing ("draw_s:<role>"), counted as it passes (see begin);
        # and its history, a sample every MONITOR_EVERY seconds (see _monitor).
        self._totals: collections.defaultdict[str, float] = collections.defaultdict(
            float
        )
        self._totals_lock = threading.Lock()
        self._spending: dict[object, tuple[str, float]] = {}  # begun, not yet ended
        self.history: collections.deque[dict[str, Any]] = collections.deque(
            maxlen=MONITOR_KEEP
        )
        # The compositors' drawn pictures (each one's own store, by its role), so the
        # cache's size counts them too.
        self._drawers: dict[str, dict[str, tuple[float, bytes]]] = {}
        # The CPU seen at the last status (when, how much), for each reader's share and
        # the whole app's since then.
        self._cpu_seen: dict[str, tuple[float, float]] = {}
        # Thumbnails, made once per picture and size and kept until the picture changes
        # (the Camera Dashboard's, the cache viewer's): (entity, width, whole) ->
        # (the picture, the thumbnail).
        self._thumbs: dict[tuple[str, int, bool], tuple[Picture, bytes]] = {}

    # -- its loop, shared by the compositors

    def start(self) -> None:
        """Start its loop in a thread of its own; once (a running one is left be)."""
        with self._lock:
            if self.loop:
                return
            self.go2rtc = go2rtc_reachable()
            _LOGGER.info(
                "compositor (cameras): Home Assistant's go2rtc (RTSP, %s:%d): %s",
                *GO2RTC_RTSP,
                "reachable" if self.go2rtc else "not reachable",
            )
            ready = threading.Event()

            def run() -> None:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self.loop = loop
                loop.run_until_complete(self._setup())
                ready.set()
                loop.run_forever()

            threading.Thread(target=run, daemon=True).start()
            ready.wait(10)

    async def _setup(self) -> None:
        self.http = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self._wake, self._repaced = asyncio.Event(), asyncio.Event()
        self._placehold()
        self._survey_now = asyncio.Event()
        tasks = [
            self._run(),
            self._survey_loop(),
            self._monitor(),
            self._watch_go2rtc(),
            self._watch_ha_start(),
        ]
        for coro in tasks:
            self._bg.add(asyncio.ensure_future(coro))

    def stop(self) -> None:
        """Stop its loop (a compositor's own gatherer, when it stops): streams no
        longer read, the cache kept."""
        loop = self.loop
        if not loop:
            return

        async def end() -> None:
            self._stop_feeds()
            tasks = list(self._bg)
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            if self.http:
                await self.http.close()
            loop.stop()

        asyncio.run_coroutine_threadsafe(end(), loop)
        self.loop = None

    def _soon(self, fn: Callable[[], None]) -> None:
        """Run fn on its loop (at once while it is not running)."""
        if self.loop:
            self.loop.call_soon_threadsafe(fn)
        else:
            fn()

    def configure(self, owner: str, cfg: Config) -> None:
        """A compositor's cameras (its config, at start and each reload): the gatherer
        knows every compositor's. Thread-safe."""
        self._cfgs[owner] = cfg
        merged = Config()
        for c in self._cfgs.values():
            merged.entities |= c.entities
            merged.titles |= c.titles
            merged.commanders += c.commanders
        self.cfg = merged

        def apply() -> None:
            self._placehold()
            if self._survey_now:
                self._survey_now.set()  # a pass now: any camera just added

        self._soon(apply)

    def restart(self) -> None:
        """Start afresh, the pictures kept (no "(Waiting …)"): every stream stopped and
        read again, every mark forgotten (a channel sitting out, "not its stream", its
        name on go2rtc, given afresh), and a survey pass at once. What a restart of the app did, for streams that all failed at once.
        Thread-safe."""
        _LOGGER.info("compositor (cameras): gatherer restarting, its pictures kept")

        def afresh() -> None:
            self._stop_readers()
            for marks in (
                self._no_stream,
                self._names,
                self._benched,
                self._misses,
            ):
                marks.clear()
            for event in (self._wake, self._survey_now):
                if event:
                    event.set()

        self._soon(afresh)

    def ha_started(self, why: str) -> None:
        """Home Assistant has started: its cameras are all there now. A survey pass under
        way is cut short, and the gatherer starts afresh (restart), with a new pass at
        once: while HA started up it answered before its camera integrations had loaded,
        and each camera that failed then was benched for BENCH seconds. On the loop."""
        _LOGGER.info(
            "compositor (cameras): Home Assistant has started (%s): the gatherer starts "
            "afresh, with a new survey",
            why,
        )
        if self._pass and not self._pass.done():
            self._pass.cancel()
        self.restart()

    def pause(self, paused: bool) -> None:
        """Pause fetching (every loop and stream stopped, the cache kept) or run it
        again. Thread-safe."""
        if paused == self.paused:
            return
        self.paused = paused
        _LOGGER.info(
            "compositor (cameras): %s", "paused" if paused else "running again"
        )

        def wake() -> None:
            for event in (self._wake, self._survey_now):
                if event:
                    event.set()

        self._soon(wake)

    def pace(self, which: str) -> float:
        """Seconds between: the gatherer's fetches of each channel ("gatherer"), or a
        generator's drawings ("live", "draft")."""
        return self.paces.get(which, PACE_DEFAULTS[which])

    def set_pace(self, which: str, seconds: float) -> None:
        """Set a pace (within PACES), kept across restarts, taken up at once.
        Thread-safe; ValueError out of range."""
        low, high = PACES[which]
        if not low <= seconds <= high:
            raise ValueError(f"{which}: {low:g}-{high:g}")
        if which == "survey_at_once":
            seconds = float(round(seconds))  # a count
        self.paces[which] = seconds
        _LOGGER.info(
            "compositor (cameras): %s: %s",
            which,
            f"{seconds:g} at once"
            if which == "survey_at_once"
            else f"pictures up to {seconds:g} s old"
            if which == "freshness"
            else "continuous"
            if seconds == 0
            else f"every {seconds:g} s",
        )
        self._save_paces()

        def repace() -> None:
            if self._repaced:
                done, self._repaced = self._repaced, asyncio.Event()
                done.set()

        self._soon(repace)

    def set_flag(self, which: str, on: bool) -> None:
        """Turn one of the whole system's switches on or off, kept across restarts.
        Thread-safe; KeyError for none such."""
        if which not in FLAGS:
            raise KeyError(which)
        self.flags[which] = on
        _LOGGER.info("compositor (cameras): %s %s", which, "on" if on else "off")
        self._save_paces()

    def flag(self, which: str) -> bool:
        """A switch as it acts now: live_main is off while the screenshot swap is on (a
        live video is the camera's own, never swapped); the kept setting is left as set."""
        return self.flags[which] and not (which == "live_main" and swap.stamp())

    def _save_paces(self) -> None:
        if self.pace_path:
            try:
                self.pace_path.write_text(
                    json.dumps({**self.paces, "flags": self.flags})
                )
            except OSError as exc:
                _LOGGER.warning("compositor (cameras): settings not kept: %s", exc)

    def _load_paces(self) -> None:
        if not self.pace_path:
            return
        try:
            kept = json.loads(self.pace_path.read_text())
        except (OSError, ValueError):
            return
        for which, (low, high) in PACES.items():
            value = kept.get(which) if isinstance(kept, dict) else None
            if isinstance(value, (int, float)) and low <= value <= high:
                self.paces[which] = float(value)
        flags = kept.get("flags") if isinstance(kept, dict) else None
        for which in FLAGS:
            if isinstance(flags, dict) and isinstance(flags.get(which), bool):
                self.flags[which] = flags[which]

    async def paced(self, seconds: float) -> None:
        """Wait that long, or less when a pace changes meanwhile (on its loop)."""
        if seconds <= 0 or self._repaced is None:  # (not started: a plain wait)
            await asyncio.sleep(max(seconds, 0))
            return
        try:
            await streams.within(self._repaced.wait(), seconds)
        except TimeoutError:
            pass

    def want(self, owner: str, uses: dict[str, list[Use]]) -> None:
        """What a compositor draws from, as of now: each channel and its places. A
        channel not fetched yet starts at once. On its loop."""
        now = time.monotonic()
        self._wants[owner] = (now, uses)
        new = [c for c in uses if c not in self._feeds]
        for c in uses:
            self._wanted[c] = now
        if new and self._wake:
            self._wake.set()

    async def updated(self, entity: str, timeout: float) -> bool:
        """Wait for a channel's next picture (at most timeout seconds): whether it came."""
        event = self._fresh.setdefault(entity, asyncio.Event())
        try:
            await streams.within(event.wait(), timeout)
            return True
        except TimeoutError:
            return False

    async def _run(self) -> None:
        """Watch the wants: start a fetching loop for each channel wanted, stop each one
        (and its stream) LINGER seconds after it was last wanted, or all of them while
        paused; and size, from their streams, the channels of the cameras in use."""
        assert self._wake
        while True:
            now = time.monotonic()
            uses: dict[str, list[Use]] = {}
            for at, mine in list(self._wants.values()):
                if now - at < LINGER:
                    for c, places in mine.items():
                        uses.setdefault(c, []).extend(places)
            self.uses = uses
            live = set() if self.paused else set(uses)
            self._stop_feeds(live)
            if live:
                if not self.gathering:
                    self.gathering = True
                    _LOGGER.info(
                        "compositor (cameras): wanted; each channel fetched every %g s",
                        self.pace("gatherer"),
                    )
                for c in live - set(self._feeds):
                    task = asyncio.ensure_future(self._feed(c))
                    self._feeds[c] = task
            elif self.gathering:
                self.gathering = False
                _LOGGER.info("compositor (cameras): nothing wanted; fetching stopped")
            self._wake.clear()
            try:
                await streams.within(self._wake.wait(), 1.0)
            except TimeoutError:
                pass

    def _stop_feeds(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop every channel's fetching loop and stream but those in keep."""
        for c in [c for c in self._feeds if c not in keep]:
            self._feeds.pop(c).cancel()
        self._stop_readers(set(keep))

    async def _feed(self, entity: str) -> None:
        """One channel, fetched at the gatherer's pace on its own until stopped (see
        _once); continuous (0): again as soon as it answers."""
        while True:
            started = time.monotonic()
            new = await self._once(entity)
            wait = self._pace_of(entity) - (time.monotonic() - started)
            # ponytail: continuous polls a stream for its next frame every IDLE s; a
            # frame event from the reader would wake it exactly, if this ever matters.
            await self.paced(wait if new else max(wait, IDLE))

    async def _once(self, entity: str) -> bool:
        """Fetch a channel once. A miss keeps the picture already cached (it goes
        stale); it counts against the channel only while others answer (one did in
        the INTERVAL before it was asked, or since): when none do, Home Assistant (or
        the way to it) is down, a restart say, which is no camera's fault, and an outage
        costs each channel one miss at most. STRIKES in a row and it sits out for BENCH
        seconds, skipped until then. Whether a new picture came."""
        started = time.monotonic()
        window = max(self.pace("gatherer"), INTERVAL)  # "others answered lately"
        if entity in self._benched:
            if started < self._benched[entity]:
                return False
            del self._benched[entity]
            _LOGGER.info("compositor (cameras): trying %s again", entity)
        got = await self._get(entity)
        now = time.monotonic()
        if got is not None:
            self._answered = now
            self._misses.pop(entity, None)
            if self._ha_down:
                self._ha_down = False
                _LOGGER.info("compositor (cameras): cameras answer again")
            if got:
                self.keep(entity, got[0], got[1], streamed=got[2])
                return True
        elif self._answered > started - window:
            self._misses[entity] = self._misses.get(entity, 0) + 1
            if self._misses[entity] >= STRIKES:
                del self._misses[entity]
                self._benched[entity] = now + BENCH
                _LOGGER.warning(
                    "compositor (cameras): %s missed %d times in a row; it sits out "
                    "(its picture goes stale) and is tried again in %.0f min",
                    entity,
                    STRIKES,
                    BENCH / 60,
                )
        elif not self._ha_down and now - self._answered > window * 2:
            self._ha_down = True
            _LOGGER.warning(
                "compositor (cameras): no camera answers; Home Assistant unreachable? "
                "Trying on"
            )
        return False

    async def _get(self, entity: str) -> tuple[Picture, float, bool] | tuple[()] | None:
        """A channel's newest picture, when it came, and whether from its stream: its
        stream's newest frame where it is read (an empty answer when no new frame has
        come since the last: nothing to convert), a snapshot until the first frame
        comes and where it is not streamed; None when it gives nothing."""
        reader = await self._reader(entity)
        if reader and reader.frame is not None:
            if reader.at == self._taken.get(entity):
                return ()
            got = await asyncio.to_thread(reader.image)
            if got:
                self._taken[entity] = got[1]
                return got[0], got[1], True
        if entity in self._snap_wrong:
            return ()  # its snapshot would not be it: its stream's frames only
        image = await self._fetch_now(entity)
        return (image, time.monotonic(), False) if image else None

    def keep(
        self,
        entity: str,
        image: Picture,
        at: float | None = None,
        streamed: bool = False,
    ) -> None:
        """A channel's new picture, and its size: logged and kept when first known or
        changed. A snapshot gives way to the channel's stream: it is not kept while a
        frame is to hand, and never changes a size its stream gave."""
        if self.paused:  # fetched before the pause, come after it: nothing new appears
            return
        reader = self._readers.get(entity)
        if not streamed and reader and reader.frame is not None:
            return
        if isinstance(image, Image.Image):
            size = image.size
        else:
            try:
                size = Image.open(io.BytesIO(image)).size  # the header only
            except OSError:
                return
        if not streamed and entity in self._streamed and size != self.res.get(entity):
            # Not this channel's picture at its size (UniFi Protect gives every
            # channel one 640 x 360 snapshot): never kept as it, nor asked for again.
            if entity not in self._snap_wrong:
                self._snap_wrong.add(entity)
                _LOGGER.info(
                    "compositor (cameras): %s, %s channel: its snapshot (%d x %d) is "
                    "not its stream's size; only its stream's frames are kept",
                    self._title(entity),
                    self._channel(entity)[1],
                    *size,
                )
            return
        self.shots[entity] = (time.monotonic() if at is None else at, image)
        self._shot_size[entity] = size
        self._waiting.discard(entity)
        if fresh := self._fresh.pop(entity, None):
            fresh.set()
        if not streamed and entity in self._streamed:
            return
        if self.res.get(entity) != size or (streamed and entity not in self._streamed):
            self.res[entity] = size
            if streamed:
                self._streamed.add(entity)
            _LOGGER.info(
                "compositor (cameras): %s, %s channel: its %s is %d x %d",
                self._title(entity),
                self._channel(entity)[1],
                "stream" if streamed else "still",
                *size,
            )
            self._save_sizes()

    def _placehold(self) -> None:
        """ "(Waiting …)" for each channel of every camera with no picture yet."""
        now = time.monotonic()
        for camera in self._cameras():
            for entity in channels(self.cfg, camera).values():
                if entity not in self.shots:
                    shape = self.aspect(entity) or 16 / 9
                    self.shots[entity] = (now, waiting_picture(round(shape, 2)))
                    self._waiting.add(entity)

    def _load_sizes(self) -> None:
        """The channels' sizes kept by an earlier run."""
        if not self.sizes_path:
            return
        try:
            kept = json.loads(self.sizes_path.read_text())
        except (OSError, ValueError):
            return
        for entity, one in kept.items() if isinstance(kept, dict) else []:
            try:
                (w, h), source = one["size"], one["from"]
                self.res[entity] = (int(w), int(h))
            except (KeyError, TypeError, ValueError):
                continue
            if source == "stream":
                self._streamed.add(entity)
        _LOGGER.info(
            "compositor (cameras): %d channels' sizes known from before", len(self.res)
        )

    def _save_sizes(self) -> None:
        if not self.sizes_path:
            return
        out = {
            e: {
                "size": list(size),
                "from": "stream" if e in self._streamed else "still",
            }
            for e, size in sorted(self.res.items())
        }
        try:
            tmp = self.sizes_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(out, indent=1))
            tmp.replace(self.sizes_path)
        except OSError as exc:
            _LOGGER.warning("compositor (cameras): sizes not kept: %s", exc)

    def aspect(self, entity: str) -> float | None:
        """A camera's natural shape (width / height), from its size; None until known."""
        w, h = self.res.get(entity, (0, 0))
        return round(w / h, 4) if h else None

    def clear(self, entity: str | None = None) -> None:
        """Purge every picture, or one channel's (on its loop): "(Waiting …)" again
        until fetched afresh; a channel sitting out is tried again, and so is a stream
        marked "not its stream" (put on go2rtc afresh). Their sizes are kept."""
        if entity is None:
            for cache in (
                self._stills,
                self.shots,
                self._taken,
                self._shot_size,
                self._no_stream,
                self._names,
            ):
                cache.clear()
            self._waiting.clear()
            self._misses.clear()
            self._benched.clear()
        else:
            for d in (
                self.shots,
                self._stills,
                self._taken,
                self._shot_size,
                self._misses,
                self._benched,
                self._no_stream,
                self._names,
            ):
                d.pop(entity, None)
            self._waiting.discard(entity)
        self._placehold()
        for event in (self._wake, self._survey_now):
            if event:
                event.set()

    def _title(self, entity: str) -> str:
        """A camera's title, for any of its channels too."""
        for e, chans in self.cfg.entities.items():
            if entity == e or entity in chans.values():
                return self.cfg.titles.get(e, e)
        return self.cfg.titles.get(entity, entity)

    def state(self, entity: str) -> str:
        """A channel's state: sitting out; live (its stream read); starting (its stream
        being read or sized, no frame yet); snapshots (fetched, not streamed); stopped
        (not wanted, or paused)."""
        if entity in self._benched:
            return "sitting out"
        reader = self._readers.get(entity)
        if reader and reader.frame is not None:
            return "live"
        if reader or entity in self._surveying:
            return "starting"
        return "snapshots" if entity in self._feeds else "stopped"

    def count(self, total: str, amount: float) -> None:
        """Add to one of the whole system's totals. Thread-safe."""
        with self._totals_lock:
            self._totals[total] += amount

    def sent(self, size: int) -> None:
        """A picture sent to a viewer. Thread-safe."""
        with self._totals_lock:
            self._totals["out_bytes"] += size
            self._totals["out_pictures"] += 1

    def begin(self, total: str) -> object:
        """Time spent from now (a stream open, a write waiting, a drawing) until `end`,
        added to a total. A sample counts the time gone so far of what has not ended,
        so each sample has the time within it: booked at the end, a write held up
        for 6 s would land in one 2 s sample as 300%. Thread-safe."""
        token = object()
        with self._totals_lock:
            self._spending[token] = (total, time.monotonic())
        return token

    def end(self, token: object) -> None:
        with self._totals_lock:
            total, began = self._spending.pop(token)
            self._totals[total] += time.monotonic() - began

    async def _monitor(self) -> None:
        """Sample the whole compositor system every MONITOR_EVERY seconds: CPU as a
        share of the whole box (gathering, composing, the app in all), memory (the
        app's, the cache's, the box's), bytes sent a second, and where viewers wait (the
        bottleneck): the share of the streams' time their writes waited for the
        network, the share of the time the busier compositor spent drawing, pictures
        a second sent and skipped (drawn for a stream still sending the one before),
        and the average picture sent."""
        cpus = os.cpu_count() or 1
        then = None
        while True:
            now = time.monotonic()
            with self._totals_lock:
                totals = dict(self._totals)
                for total, began in self._spending.values():
                    totals[total] = totals.get(total, 0.0) + now - began
            totals["gather_cpu"] = totals.get("gather_cpu", 0.0) + sum(
                r.cpu_s + r.convert_s for r in list(self._readers.values())
            )
            totals["app_cpu"] = time.process_time()
            if then is not None:
                took = max(now - then[0], 0.001)

                def gone(key: str, then_totals: dict = then[1]) -> float:
                    return max(totals.get(key, 0.0) - then_totals.get(key, 0.0), 0.0)

                def pct(key: str, took: float = took) -> float:
                    return round(100 * gone(key) / took / cpus, 1)

                stream_s = gone("stream_s")  # streams open, by the time each was
                pictures = gone("out_pictures")
                drawing = max(
                    (gone(k) for k in totals if k.startswith("draw_s:")), default=0.0
                )
                mem = memory()
                self.history.append(
                    {
                        "t": round(time.time(), 1),
                        "gather": pct("gather_cpu"),
                        "compose": pct("compose_cpu"),
                        "app": pct("app_cpu"),
                        "out_bps": round(8 * gone("out_bytes") / took),
                        "streams": round(stream_s / took),
                        "waiting": round(100 * gone("send_wait") / stream_s, 1)
                        if stream_s
                        else 0.0,
                        "drawing": round(100 * drawing / took, 1),
                        "sent_fps": round(pictures / took, 1),
                        "skipped_fps": round(gone("out_skipped") / took, 1),
                        "kb_picture": round(gone("out_bytes") / pictures / 1000)
                        if pictures
                        else None,
                        "cache": self.cache_stats()["bytes"],
                        **mem,
                    }
                )
            then = (now, totals)
            await asyncio.sleep(MONITOR_EVERY)

    def verdict(self) -> dict[str, str]:
        """How the panels are doing, and what to do about it: the first that holds of
        HA's go2rtc out of reach, most streams failed, the gatherer paused, the CPU the
        limit (gathering's or drawing's), a generator unable to keep up with its pace,
        the network the limit (pictures queue on the way: panels lag), nothing
        watching, or all well. Judged on the last
        HEALTH_S seconds' samples, so one odd sample doesn't flip it. Its state (one of
        HEALTH_STATES), tone (good, warn, bad), headline and advice."""

        def said(state: str, tone: str, headline: str, advice: str) -> dict[str, str]:
            return {
                "state": state,
                "tone": tone,
                "headline": headline,
                "advice": advice,
            }

        channels = set(self.shots) | set(self.res)
        failing = [e for e in channels if e in self._no_stream]
        if channels and self.go2rtc is False:
            return said(
                "go2rtc_down",
                "bad",
                "Home Assistant's go2rtc is out of reach: every camera is on snapshots",
                f"It is looked at every {GO2RTC_CHECK:.0f} s and comes back by itself "
                "(after Home Assistant restarts, say). If it doesn't within a minute, "
                "restart the Casa Mia app.",
            )
        if len(failing) >= 2 and 2 * len(failing) >= len(channels):
            why = collections.Counter(self._no_stream[e][1] for e in failing)
            return said(
                "streams_failing",
                "bad",
                f"{len(failing)} of {len(channels)} camera streams have failed "
                f"({why.most_common(1)[0][0]})",
                "Restart the gatherer (here, or the integration's Restart gatherer "
                "button): every stream is tried again at once, the pictures kept. If "
                "they fail again, the reason says why.",
            )
        if self.paused:
            return said(
                "paused",
                "warn",
                "The gatherer is paused: the cameras' pictures don't change",
                "Run it again.",
            )
        h = list(self.history)[-max(1, math.ceil(HEALTH_S / MONITOR_EVERY)) :]
        open_ = [x for x in h if x["streams"] > 0]

        def mean(key: str, of: list[dict] = h) -> float:
            return sum(x[key] for x in of) / len(of) if of else 0.0

        app, gather, compose = mean("app"), mean("gather"), mean("compose")
        sent, skipped = mean("sent_fps", open_), mean("skipped_fps", open_)
        waiting = mean("waiting", open_)
        got = f"{sent:.1f} of {sent + skipped:.1f} pictures a second"
        if not open_:
            return said(
                "idle",
                "good",
                "Nothing is watching right now",
                "No panel has a stream open, so there is nothing to judge. Open a "
                "dashboard and look again.",
            )
        if app > 80 and gather >= compose:
            return said(
                "cpu_gathering",
                "bad",
                "The CPU is the bottleneck: gathering takes most of it "
                f"({gather:.0f}% of the box)",
                "Slow the Gatherer's pace, or raise Picture age allowed so more "
                "streams decode keyframes only.",
            )
        if app > 80:
            return said(
                "cpu_drawing",
                "bad",
                "The CPU is the bottleneck: drawing takes most of it "
                f"({compose:.0f}% of the box)",
                "Slow the Live generator's pace.",
            )
        if mean("drawing") > 80:
            return said(
                "drawing_behind",
                "warn",
                "A generator can't keep up with its pace: drawing "
                f"{mean('drawing'):.0f}% of the time",
                "Slow the Live generator's pace: pictures can't be drawn faster than "
                "this box draws them.",
            )
        # A send waits only once every buffer on the way (the network's, a VPN's,
        # Home Assistant's proxy's) is full: pictures queue there, and the panel
        # shows them late. So any waiting that lasts means lag, even with none
        # skipped.
        if waiting > LAG_WAITING:
            sizes = [x["kb_picture"] for x in open_ if x.get("kb_picture")]
            kb = f", {sum(sizes) / len(sizes):.0f} kB a picture" if sizes else ""
            return said(
                "network",
                "warn",
                "Panels lag: the network can't take pictures as fast as they're "
                f"drawn, so they queue on the way (sends wait {waiting:.0f}% of the "
                f"time; viewers get {got}{kb})",
                "Send less: a slower Live generator pace, or smaller pictures (a "
                "card's Away sharpness, which applies when it goes through Home "
                "Assistant: on a VPN to the LAN address it counts as at home and "
                "asks for its screen's full sharpness). A panel on the LAN keeps up.",
            )
        return said(
            "fine",
            "good",
            "Your panels are working fine",
            f"Viewers get every picture drawn ({sent:.1f} a second), and the box has "
            f"room to spare (CPU {app:.0f}%).",
        )

    def register_pictures(self, owner: str, pictures: dict) -> None:
        """A compositor's drawn pictures, counted in the cache's size."""
        self._drawers[owner] = pictures

    def cache_stats(self) -> dict[str, int]:
        """The cache, counted: the pictures in it (the cameras' and the composites'),
        the camera channels still waiting for their first, the thumbnails made from
        them, and the memory it all takes (bytes; a shared waiting picture once)."""

        def size(picture: Any) -> int:
            if isinstance(picture, (bytes, bytearray)):
                return len(picture)
            return picture.width * picture.height * len(picture.getbands())

        shots = list(self.shots.items())
        cameras = [pic for e, (_, pic) in shots if e not in self._waiting]
        waiting = {id(pic): pic for e, (_, pic) in shots if e in self._waiting}
        composites = [
            pic
            for drawn in list(self._drawers.values())
            for _, pic in list(drawn.values())
        ]
        thumbs = [made for _, made in list(self._thumbs.values())]
        return {
            "pictures": len(cameras) + len(composites),
            "cameras": len(cameras),
            "waiting": len(shots) - len(cameras),
            "composites": len(composites),
            "thumbnails": len(thumbs),
            "bytes": sum(map(size, [*cameras, *waiting.values(), *composites]))
            + sum(map(len, thumbs)),
        }

    def _cpu_pct(self, key: str, cpu_s: float, now: float) -> float:
        """The share of one CPU used since the last status (%)."""
        then = self._cpu_seen.get(key)
        self._cpu_seen[key] = (now, cpu_s)
        if then is None or now <= then[0]:
            return 0.0
        return round(100 * max(cpu_s - then[1], 0.0) / (now - then[0]), 1)

    def status(self) -> dict[str, Any]:
        """Its state, and each channel's picture: its camera and tier, its state, its
        size (and whether its stream's), whether still waiting for its first, where it
        comes from (and why not its stream), age and fetch time, misses in a row, when
        one sitting out is tried again, who wants it, and the places drawn from it, each
        with how much it is enlarged."""
        now = time.monotonic()
        owners = {
            c: sorted(
                o for o, (at, w) in self._wants.items() if c in w and now - at < LINGER
            )
            for c in self.uses
        }

        def row(e: str) -> dict[str, Any]:
            camera, tier = self._channel(e)
            reading = self._readers.get(e)
            cpu = (
                self._cpu_pct(e, reading.cpu_s + reading.convert_s, now)
                if reading and reading.alive
                else None
            )
            w, h = self.res.get(e, (0, 0))
            at = self.shots.get(e, (None, b""))[0]
            reader = self._readers.get(e)
            return {
                "camera": e,
                "of": camera,  # the camera it is a channel of
                "title": self.cfg.titles.get(camera, camera),
                "channel": tier,
                "state": self.state(e),
                "waiting": e in self._waiting,
                "source": "stream"
                if reader and reader.frame is not None
                else "snapshot",
                "fps": reader.fps() if reader else None,
                # its stream's decoding: its share of a CPU, keyframes only or every
                # frame, and its keyframe interval
                "cpu_pct": cpu,
                "decoding": None
                if not reading
                else "keyframes"
                if reading.keyframes_only
                else "every frame",
                "gop_s": round(reading.gop_s, 2) if reading and reading.gop_s else None,
                "no_stream": self._no_stream[e][1] if e in self._no_stream else None,
                "width": w,
                "height": h,
                "size_from": "stream"
                if e in self._streamed
                else "still"
                if w
                else None,
                "age_s": None
                if at is None or e in self._waiting
                else round(now - at, 1),
                # the picture held now (a frame, a snapshot): its own size
                "picture": list(self._shot_size[e]) if e in self._shot_size else None,
                "fetch_ms": round(self._took[e] * 1000) if e in self._took else None,
                "missed": self._misses.get(e, 0),
                "back_in_s": round(self._benched[e] - now)
                if e in self._benched
                else None,
                "wanted_by": owners.get(e, []),
                "pace_s": self._pace_of(e) if e in self._feeds else None,
                "surveys": list(reversed(self._surveyed.get(e, []))),
                "uses": [
                    {
                        "picture": picture,
                        "place": where,
                        "width": pw,
                        "height": ph,
                        "enlarged": round(enlarged((w, h), (pw, ph), whole), 2)
                        if w
                        else None,
                    }
                    for picture, where, (pw, ph), whole in self.uses.get(e, [])
                ],
            }

        return {
            # the whole app's share of a CPU since the last status (%)
            "cpu_pct": self._cpu_pct("app", time.process_time(), now),
            "cache": self.cache_stats(),
            "health": self.verdict(),
            "monitor": {
                "cpus": os.cpu_count() or 1,
                "every_s": MONITOR_EVERY,
                "history": list(self.history),
            },
            "paused": self.paused,
            "gathering": self.gathering,
            "pace": self.pace("gatherer"),
            "freshness": self.pace("freshness"),
            "flags": dict(self.flags),
            "survey": {
                **{k: v for k, v in self.survey.items() if k not in ("at", "ended")},
                "pace": self.pace("survey"),
                "at_once": int(self.pace("survey_at_once")),
                "next_in": round(
                    max(0.0, self.survey["ended"] + self.pace("survey") - now)
                )
                if "ended" in self.survey and not self.paused
                else None,
            },
            "go2rtc": self.go2rtc,
            "streams_read": sum(1 for r in self._readers.values() if r.alive),
            "channels": [row(e) for e in sorted(set(self.shots) | set(self.res))],
        }

    def status_rows(self) -> list[dict[str, Any]]:
        return self.status()["channels"]

    def thumb(
        self,
        entity: str,
        width: int,
        whole: bool = False,
        source: Picture | None = None,
    ) -> bytes | None:
        """A channel's picture (the one cached, or `source`) width wide: whole, at its
        shape, or cut to 16:9; made once per picture and size, in the caller's thread.
        None when it has none."""
        if source is None:
            source = self.shots.get(entity, (0.0, None))[1]
        if source is None:
            return None
        key = (entity, width, whole)
        hit = self._thumbs.get(key)
        if hit and hit[0] is source:
            return hit[1]
        try:
            box = (width, width * 9 // 16)
            img = as_image(source, box)
            img = (
                ImageOps.contain(img, (width, width * 4))
                if whole
                else ImageOps.fit(img, box)
            )
        except OSError:
            return None
        made = encode(img, JPEG_QUALITY)
        self._thumbs[key] = (source, made)
        return made

    def _fetch(self, entity: str) -> asyncio.Future:
        """A channel's still, shared: pictures built together (the live one and a
        preview) fetch it once."""
        now = time.monotonic()
        hit = self._stills.get(entity)
        if hit is None or now - hit[0] > STILL_TTL:
            hit = self._stills[entity] = (
                now,
                asyncio.ensure_future(self._fetch_now(entity)),
            )
        return hit[1]

    def _swapped(self, entity: str) -> Path | None:
        """The screenshot swap's picture for a camera (any of its channels), if any."""
        title = self.cfg.titles.get(entity) or next(
            (
                self.cfg.titles.get(e)
                for e, chans in self.cfg.entities.items()
                if entity in chans.values()
            ),
            None,
        )
        return swap.camera_image(title) if title else None

    async def _fetch_now(self, entity: str) -> bytes | None:
        """A channel's still at its own size: HA passes the camera's JPEG on as it is
        (asked for a size, it decodes and shrinks it); the compositor shrinks it once,
        to exactly the place it is drawn in."""
        assert self.http
        picture = self._swapped(entity)
        if picture:
            try:
                return _stand_in(picture, picture.stat().st_mtime_ns)
            except OSError:
                pass  # gone or unreadable: the camera's own picture
        started = time.monotonic()
        try:
            async with self.http.get(
                f"{self.ha_url}/api/camera_proxy/{entity}",
                timeout=aiohttp.ClientTimeout(total=FETCH_TIMEOUT),
            ) as r:
                if r.status != 200:
                    return None
                image = await r.read()
        except (aiohttp.ClientError, TimeoutError):
            return None
        self._took[entity] = time.monotonic() - started
        return image

    def _channel(self, entity: str) -> tuple[str, str]:
        """The camera a channel belongs to, and its tier (low, medium, high)."""
        for camera in self.cfg.entities:
            for tier, e in channels(self.cfg, camera).items():
                if e == entity:
                    return camera, tier
        return entity, "low"

    # -- the channels' own streams (HA's go2rtc)

    def _rtsp(self, name: str) -> str:
        return "rtsp://{}:{}/{}".format(*GO2RTC_RTSP, name)

    def _streamable(self, entity: str) -> bool:
        return (
            bool(self.go2rtc)
            and time.monotonic() >= self._no_stream.get(entity, (0.0, ""))[0]
            and not self._swapped(entity)  # the swap's picture is its snapshot
        )

    async def _name(self, entity: str) -> str | None:
        """A channel's name on HA's go2rtc, putting it there; None (and not asked again
        for BENCH seconds) if HA cannot stream it."""
        if entity in self._names:
            return self._names[entity]
        assert self.http
        try:
            name, why = await streams.register(
                self.http, self.ws_url, self.token, entity
            )
        except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
            # HA itself out of reach (restarting): no fault of the camera's, so asked
            # again soon, not after BENCH (every camera sat out 10 min after a restart).
            why = f"cannot ask Home Assistant: {exc or type(exc).__name__}"
            self._no_stream[entity] = (time.monotonic() + STREAM_RETRY, why)
            _LOGGER.warning(
                "compositor (cameras): %s, %s channel: %s; its snapshots, asked again "
                "in %.0f s",
                self._title(entity),
                self._channel(entity)[1],
                why,
                STREAM_RETRY,
            )
            return None
        if name is None:
            self._no_stream[entity] = (time.monotonic() + BENCH, why)
            _LOGGER.info(
                "compositor (%s): %s, %s channel: no stream to read (%s); its snapshots "
                "instead, asked again in %.0f min",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
                why,
                BENCH / 60,
            )
            return None
        self._names[entity] = name
        return name

    async def _reader(self, entity: str) -> streams.Reader | None:
        """A channel's stream reader, started if need be; None when it is not streamed.
        A lost stream is logged, and read again after STREAM_RETRY seconds (when HA has
        restarted, its go2rtc no longer has it: it is put there again). A camera the
        screenshot swap has a picture for is not streamed: its snapshot is that picture."""
        if self._swapped(entity):
            if entity in self._readers:
                self._stop_readers(set(self._readers) - {entity})
            return None
        reader = self._readers.get(entity)
        if reader and reader.alive:
            return reader
        if reader:
            del self._readers[entity]
            self.count("gather_cpu", reader.cpu_s + reader.convert_s)
            self._names.pop(entity, None)
            why = reader.error or "stopped"
            if refused(why):  # HA's go2rtc down (a restart): no fault of the stream
                self._go2rtc_down(why)
                return None
            self._no_stream[entity] = (time.monotonic() + STREAM_RETRY, why)
            _LOGGER.warning(
                "compositor (%s): %s, %s channel: stream lost (%s); snapshots for %.0f s",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
                why,
                STREAM_RETRY,
            )
            return None
        if not self._streamable(entity):
            return None
        name = await self._name(entity)
        if not name:
            return None
        reader = self._readers[entity] = streams.Reader(
            entity, self._rtsp(name), keys_only=self._keys_only
        )
        _LOGGER.info(
            "compositor (%s): %s, %s channel: reading its stream",
            "cameras",
            self._title(entity),
            self._channel(entity)[1],
        )
        return reader

    def _pace_of(self, entity: str) -> float:
        """A channel's own pace (seconds between its pictures): the slower of the
        gatherer's and its fastest user's, the generator drawing most often from it (a
        picture taken more often than any drawing uses one is wasted)."""
        now = time.monotonic()
        users = [
            self.pace(owner)
            for owner, (at, uses) in list(self._wants.items())
            if owner in PACES and entity in uses and now - at < LINGER
        ]
        gatherer = self.pace("gatherer")
        return max(gatherer, min(users)) if users else gatherer

    def _go2rtc_down(self, why: str) -> None:
        """HA's go2rtc refused a stream: it is down (HA restarting, say), no stream's
        fault; every channel has its snapshots until _watch_go2rtc finds it back."""
        if self.go2rtc:
            self.go2rtc = False
            _LOGGER.warning(
                "compositor (cameras): Home Assistant's go2rtc is out of reach (%s); "
                "snapshots until it is back (looked at every %.0f s)",
                why,
                GO2RTC_CHECK,
            )

    async def _watch_go2rtc(self) -> None:
        """While HA's go2rtc is out of reach (found so at start, before HA was up, or
        refusing a stream since), look every GO2RTC_CHECK seconds; back, it has forgotten
        the cameras it was given, so each is given again (names dropped), the channels
        marked "not its stream" for its absence are cleared, and a survey pass starts."""
        while True:
            await asyncio.sleep(GO2RTC_CHECK)
            if self.go2rtc or not await asyncio.to_thread(go2rtc_reachable):
                continue
            self.go2rtc = True
            self._names.clear()
            for e in [e for e, (_, why) in self._no_stream.items() if refused(why)]:
                del self._no_stream[e]
            _LOGGER.info(
                "compositor (cameras): Home Assistant's go2rtc is back; its streams "
                "read again"
            )
            for event in (self._survey_now, self._wake):
                if event:
                    event.set()

    async def _watch_ha_start(self) -> None:
        """Hear Home Assistant say it has started (its homeassistant_started event), and
        call ha_started. Connected through its restarts: the connection drops while it
        is down and is made again every HA_WATCH_RETRY seconds; one made again finds it
        already running if the event came first, and that counts as started too."""
        assert self.http
        again = False  # a connection after the first: HA may have restarted meanwhile
        while True:
            try:
                async with self.http.ws_connect(self.ws_url, heartbeat=30) as ws:
                    await ws.receive_json()  # auth_required
                    await ws.send_json({"type": "auth", "access_token": self.token})
                    if (await ws.receive_json()).get("type") != "auth_ok":
                        _LOGGER.warning(
                            "compositor (cameras): Home Assistant refused the token; "
                            "its start is not heard (asked again in a minute)"
                        )
                        await asyncio.sleep(60)
                        continue
                    await ws.send_json(
                        {
                            "id": 1,
                            "type": "subscribe_events",
                            "event_type": "homeassistant_started",
                        }
                    )
                    await ws.send_json({"id": 2, "type": "get_config"})
                    async for msg in ws:
                        if msg.type != aiohttp.WSMsgType.TEXT:
                            break
                        m = msg.json()
                        if m.get("type") == "event":
                            self.ha_started("its homeassistant_started event")
                        elif m.get("id") == 2 and again:
                            if (m.get("result") or {}).get("state") == "RUNNING":
                                self.ha_started("found running on reconnecting")
            except (aiohttp.ClientError, TimeoutError, ValueError, TypeError):
                pass  # down, or restarting: tried again
            again = True
            await asyncio.sleep(HA_WATCH_RETRY)

    def _keys_only(self, reader: streams.Reader) -> bool:
        """Whether a stream's keyframes are enough: its pictures are taken (at its own
        pace, see _pace_of) no faster than its keyframes come (rule 0: a frame decoded
        is one used), or they come at least as often as the "freshness" allowance (a
        picture up to that old will do). Else every frame: a picture fresher than its
        keyframes needs every frame since the last one decoded."""
        pace, gop = self._pace_of(reader.entity), reader.gop_s
        if gop is None:
            return pace > 0
        return (pace > 0 and pace >= gop) or gop <= self.pace("freshness")

    def _stop_readers(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop reading every stream but those in keep."""
        for entity in [e for e in self._readers if e not in keep]:
            gone = self._readers.pop(entity)
            gone.stop()
            self.count("gather_cpu", gone.cpu_s + gone.convert_s)
            _LOGGER.info(
                "compositor (%s): %s, %s channel: stream no longer read",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
            )

    async def _survey_loop(self) -> None:
        """The survey: from the start, a pass over each channel of every camera, a few
        at a time (the "survey_at_once" setting, each read in a thread of its own); each
        one's stream is opened for its first frame (FRAME_TIMEOUT at
        most), kept as its picture, and its size (kept across restarts); a camera HA
        cannot stream gives a snapshot instead. Then it sleeps (the "survey" pace) and
        passes again. A channel being read anyway is passed over (its frames are
        fresher). Paused with the gatherer; a purge or a new camera, a pass at once."""
        assert self._survey_now
        while True:
            if self.paused:
                self._survey_now.clear()
                await self._survey_now.wait()  # woken when run again
                continue
            self._survey_now.clear()
            limit = asyncio.Semaphore(int(self.pace("survey_at_once")))  # this pass's
            todo = [
                e
                for camera in self._cameras()
                for e in channels(self.cfg, camera).values()
            ]
            started = time.monotonic()
            self.survey = {"running": True, "done": 0, "of": len(todo), "at": started}
            got: list[str] = []

            async def one(entity: str) -> None:
                async with limit:
                    if not self.paused:
                        self._surveying.add(entity)
                        try:
                            got.append(await self._survey_one(entity))
                        finally:
                            self._surveying.discard(entity)
                self.survey["done"] += 1

            # A task, so Home Assistant starting can cut it short (ha_started).
            self._pass = asyncio.ensure_future(asyncio.gather(*(one(e) for e in todo)))
            try:
                await self._pass
            except asyncio.CancelledError:
                if (me := asyncio.current_task()) and me.cancelling():
                    raise  # the gatherer itself stopping
                _LOGGER.info(
                    "compositor (cameras): survey cut short after %d of %d channels",
                    self.survey["done"],
                    len(todo),
                )
                continue  # a new pass, at once
            took = time.monotonic() - started
            self.survey = {
                "running": False,
                "done": len(todo),
                "of": len(todo),
                "took_s": round(took, 1),
                "cpu_s": round(self.survey.get("cpu_s", 0.0), 1),  # this pass's
                "ended": time.monotonic(),
            }
            _LOGGER.info(
                "compositor (cameras): survey of %d channels in %.0f s (%.1f s of "
                "CPU): %d from their streams, %d snapshots, %d read anyway, %d "
                "nothing; again in %g s",
                len(todo),
                took,
                self.survey["cpu_s"],
                got.count("stream"),
                got.count("snapshot"),
                got.count("read"),
                got.count("nothing"),
                self.pace("survey"),
            )
            await self._sleep_or(self._survey_now, self.pace("survey"))

    async def _survey_one(self, entity: str) -> str:
        """Survey a channel and record it (see _surveyed): what it gave ("stream",
        "snapshot", "read" anyway, or "nothing")."""
        started = time.monotonic()
        outcome, why, size, cpu = await self._survey_try(entity)
        self.survey["cpu_s"] = self.survey.get("cpu_s", 0.0) + cpu
        self.count("gather_cpu", cpu)
        self._surveyed.setdefault(entity, collections.deque(maxlen=5)).append(
            {
                "at": time.time(),
                "outcome": outcome,
                "why": why,
                "took_s": round(time.monotonic() - started, 1),
                "cpu_ms": round(cpu * 1000),
                "size": list(size) if size else None,
            }
        )
        return outcome

    async def _survey_try(
        self, entity: str
    ) -> tuple[str, str, tuple[int, int] | None, float]:
        """Survey a channel: what came of it, why not its stream (if it was not), the
        size it gave, and the CPU its stream's read took (s). A stream that gives no frame is logged and not tried again for
        BENCH seconds (its snapshot meanwhile)."""
        reader = self._readers.get(entity)
        if reader and reader.alive and reader.frame is not None:
            return "read", "", (reader.frame.width, reader.frame.height), 0.0
        why, cpu = "", 0.0
        known = entity in self._names  # given to go2rtc before: it may have forgotten
        if not self.go2rtc:
            why = "Home Assistant's go2rtc is out of reach"
        elif not self._streamable(entity):
            until, reason = self._no_stream[entity]
            why = f"{reason} (its stream tried again in {max(0, until - time.monotonic()) / 60:.0f} min)"
        elif not (name := await self._name(entity)):
            why = self._no_stream.get(entity, (0.0, "Home Assistant cannot stream it"))[
                1
            ]
        else:
            image, failed, cpu = await asyncio.to_thread(
                streams.first_frame, self._rtsp(name)
            )
            if image is None and known and forgotten(failed):
                # go2rtc restarted (with HA) and forgot it: no fault of the stream's,
                # so given to it afresh and read again at once.
                self._names.pop(entity, None)
                if name := await self._name(entity):
                    image, failed, again = await asyncio.to_thread(
                        streams.first_frame, self._rtsp(name)
                    )
                    cpu += again
            if image is not None:
                self.keep(entity, image, streamed=True)
                return "stream", "", image.size, cpu
            why = failed
            if refused(failed):  # HA's go2rtc down (a restart): no fault of the stream
                self._go2rtc_down(failed)
            elif not name:  # not given afresh: _name has marked it, and why
                why = self._no_stream.get(entity, (0.0, failed))[1]
            else:
                self._no_stream[entity] = (time.monotonic() + BENCH, failed)
                self._names.pop(entity, None)  # put on go2rtc afresh next time
                _LOGGER.info(
                    "compositor (cameras): %s, %s channel: its stream gave no frame "
                    "(%s); its snapshot instead, its stream tried again in %.0f min",
                    self._title(entity),
                    self._channel(entity)[1],
                    failed,
                    BENCH / 60,
                )
        if entity in self._snap_wrong:
            return "nothing", f"{why}; its snapshot is not its size", None, cpu
        image = await self._fetch_now(entity)
        if image is None:
            return "nothing", f"{why}; no snapshot either", None, cpu
        self.keep(entity, image)
        try:
            size = Image.open(io.BytesIO(image)).size
        except OSError:
            size = None
        return "snapshot", why, size, cpu

    async def _sleep_or(self, event: asyncio.Event, seconds: float) -> None:
        """Sleep that long, or less when the event is set or a pace changes."""
        waits = [asyncio.ensure_future(event.wait())]
        if self._repaced:
            waits.append(asyncio.ensure_future(self._repaced.wait()))
        try:
            await asyncio.wait(
                waits, timeout=seconds, return_when=asyncio.FIRST_COMPLETED
            )
        finally:  # cancelled too (its loop stopping): no wait left behind
            for w in waits:
                w.cancel()

    def _cameras(self) -> list[str]:
        """Every camera of the config: in a commander, or chosen and not in one yet."""
        out = dict.fromkeys(cameras_of(self.cfg.commanders))
        return list(out | dict.fromkeys(self.cfg.entities))

    async def ready_still(self, entity: str) -> Picture | None:
        """The kept still of a camera, at once; one never seen is fetched now, and kept
        (not while paused: none then)."""
        if entity not in self.shots:
            if self.paused:
                return None
            image = await self._fetch(entity)
            if image is None:
                return None
            self.keep(entity, image)
        return self.shots[entity][1]

    def pick(
        self, camera: str, channel: str | None = None
    ) -> tuple[Picture | None, float]:
        """A camera's picture from that channel; one still waiting for its first gives
        way to the newest of the camera's others that has come. The picture and its age
        in seconds (inf when there is none)."""
        hit = self.shots.get(channel or camera)
        if hit is None or (channel or camera) in self._waiting:
            come = [
                self.shots[c]
                for c in channels(self.cfg, camera).values()
                if c in self.shots and c not in self._waiting
            ]
            if come:
                hit = max(come, key=lambda v: v[0])
        if hit is None:
            return None, math.inf
        return hit[1], time.monotonic() - hit[0]


class Compositor:
    """Draws and serves the commanders of one Camera Dashboard store (live, or the
    draft's for previews), from the pictures of a Gatherer it may share with another
    compositor, on the gatherer's loop; start()/stop()/health() are thread-safe."""

    def __init__(
        self,
        config_dir: Path,
        ha_url: str,
        token: str,
        port: int = PORT,
        ws_path: str = "/websocket",
        store: str = LIVE_STORE,
        prewarm: bool = True,
        needs: str = "a Deploy live from the Camera Dashboard page",
        gatherer: Gatherer | None = None,
    ) -> None:
        self.config_dir = config_dir
        self.store = store  # which Camera Dashboard store it serves (live or draft)
        self.role = "live" if store == LIVE_STORE else "draft"  # its pace's name
        self.prewarm = prewarm  # gather for LINGER from the start (not for previews)
        # The cameras' pictures: shared with the other compositor, or its own.
        self.gather = gatherer or Gatherer(ha_url, token, ws_path)
        self._own_gather = gatherer is None
        self.needs = needs  # what to set up when it has no cameras (shown on the tile)
        self.ha_url = ha_url.rstrip("/")  # the Supervisor proxy, or http://host:8123
        self.ws_url = self.ha_url.replace("http", "ws", 1) + ws_path
        self.token = token
        self.port = port
        self.cfg = Config()
        self._error: str | None = None
        self._running = False
        self._ready = threading.Event()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._stop: asyncio.Event | None = None
        # Per-run state, touched only on the loop thread.
        self._chosen: dict[tuple[str, str, str], str] = {}  # (picture, where, camera)
        # Each commander (by its slug): its latest picture, and an event set (and
        # replaced) at each new one.
        self._pictures: dict[str, tuple[float, bytes]] = {}
        self._fresh: dict[str, asyncio.Event] = {}
        self.gather.register_pictures(self.role, self._pictures)
        self._watching: asyncio.Event | None = None  # someone asked: gather
        # Its two stages, each paused and run on its own: drawing (the generator) and
        # serving (the server); and a redraw now (a reload, a sharp main camera).
        self.drawing_paused = False
        self.serving_paused = False
        self._tick: asyncio.Event | None = None
        self._serving: asyncio.Event | None = None  # set while serving runs
        self._draw_lock: asyncio.Lock | None = None
        self._gathering = False
        self._warmed: dict[str, float] = {}
        self._bg: set[asyncio.Task] = set()
        self._streams: dict[str | None, list[asyncio.Event]] = {}
        # The streams a card named (?sid=, one a showing of its picture), so it can say
        # when it is done with one (POST /g/<name>/done?sid=): no guessing from a
        # connection a browser or a proxy may hold open.
        self._named: dict[str, tuple[asyncio.Task, Sending]] = {}
        self._open: dict[str, int] = {}  # commander -> streams open
        # Where the time goes, for /status and the log: each picture's size (bytes) and
        # how long it took to draw (s); each open stream.
        self._drawn: dict[str, tuple[int, float]] = {}
        self._draws: collections.Counter[str] = collections.Counter()  # kept, by key
        self._sending: list[Sending] = []
        self._asked: dict[str, float] = {}  # commander -> its last request
        # Commander (slug) -> the sizes its picture is asked for (None: its own size).
        self._sizes: dict[str, dict[tuple[Size | None, bool], None]] = {}
        self._warm_until = -LINGER  # prewarm: every commander gathered until then
        # Per commander (by id): its main camera as last chosen, and its cameras seeing
        # motion (red dots).
        self.mains: dict[str, str] = {}
        self.motion: dict[str, frozenset[str]] = {}

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        try:
            self.cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return
        if not cameras_of(self.cfg.commanders):
            _LOGGER.warning(
                "compositor (%s): no cameras yet; it needs %s", self.store, self.needs
            )
        self.gather.configure(self.store, self.cfg)
        self.gather.start()
        if self.gather.loop:
            asyncio.run_coroutine_threadsafe(self._serve(), self.gather.loop)
            self._ready.wait(10)

    def reload(self) -> None:
        """Re-read the config (after the Camera Dashboard saved it); the picture already
        drawn is dropped, so the next request draws the new layout."""
        try:
            cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return

        self.gather.configure(self.store, cfg)

        def apply() -> None:
            self.cfg, self._error = cfg, None
            self._pictures.clear()
            if self._tick:
                self._tick.set()

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)
        else:
            self.cfg = cfg
        _LOGGER.info(
            "compositor (%s) reloaded: %d commanders (%s), %d cameras",
            self.store,
            len(cfg.commanders),
            ", ".join(c["name"] for c in cfg.commanders),
            len(cameras_of(cfg.commanders)),
        )

    def main_camera(self, cmd: dict, chosen: bool = True) -> str | None:
        """A commander's main camera: the one last chosen for it if it is in its panels
        (`chosen` False: not that), else its configured one, else the first of them."""
        cams = commander_cameras(cmd)
        for choice in (self.mains.get(cmd["id"]) if chosen else None, cmd.get("main")):
            if choice in cams:
                return choice
        return cams[0] if cams else None

    def set_motion(self, cameras: frozenset[str], commander: str | None) -> None:
        """A commander's cameras seeing motion now (None: every commander's): their
        tiles get a red dot from the next picture on. Thread-safe."""
        for cmd in self.cfg.commanders:
            if commander in (None, cmd["id"]):
                self.motion = {**self.motion, cmd["id"]: cameras}

    def set_main(self, entity: str, commander: str) -> None:
        """Show this camera as a commander's (by id) main one: its picture is redrawn
        and sent to open streams at once. Thread-safe."""
        self.mains = {**self.mains, commander: entity}

        def apply() -> None:
            task = asyncio.ensure_future(self._switch(commander))
            self._bg.add(task)
            task.add_done_callback(self._bg.discard)

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)

    def aspect(self, entity: str) -> float | None:
        """A camera's natural shape (width / height); None until a picture is fetched."""
        return self.gather.aspect(entity)

    async def _switch(self, commander: str) -> None:
        """A commander's main camera changed: at once, while it is watched, a picture
        from the stills already to hand (the new camera blurred, "Changing to ..."), then
        the sharp one as soon as its channel's next picture comes. Not watched: its
        picture is dropped (it is redrawn when next asked for)."""
        watched = self._watched()
        for cmd in self.cfg.commanders:
            if cmd["id"] != commander:
                continue
            name = slug(cmd["name"])
            views = {key_of(v): v for v in watched if slug(v["name"]) == name}
            for key in [k for k in self._pictures if k.split("@")[0] == name]:
                if key not in views:
                    self._pictures.pop(key, None)
            for key, view in views.items() if not self.drawing_paused else []:
                try:
                    await self._draw(view, changing=True)
                except (OSError, ValueError) as exc:
                    _LOGGER.debug("%s: no quick picture: %s", cmd["name"], exc)
                    self._pictures.pop(key, None)
            if views and not self.drawing_paused:
                self._want(watched)  # its new main camera's channel fetched at once
                main = self.main_camera(cmd) or ""
                chans = {
                    chan
                    for view in views.values()
                    for where, _, chan, _, _ in self._places(view, main)
                    if where == "main"
                }
                await asyncio.gather(
                    *(
                        self.gather.updated(
                            ch, FETCH_TIMEOUT + self.gather.pace("gatherer")
                        )
                        for ch in chans
                    )
                )
                if self._tick:
                    self._tick.set()

    def render(self, cfg: Config, index: int = 0) -> bytes:
        """Draw one commander (by its place) from a config that is not the one being
        served: the Camera Dashboard's unsaved edits, for its live preview. Stills are
        shared with the pictures being served. Thread-safe; ValueError when it has no
        cameras."""
        if not (self._loop and self._running):
            raise RuntimeError("the compositor is not running")
        if not 0 <= index < len(cfg.commanders):
            raise ValueError("no such commander")
        cmd = cfg.commanders[index]
        if not commander_cameras(cmd):
            raise ValueError(
                f"{cmd['name']} has no cameras yet: put some in its panels"
            )
        future = asyncio.run_coroutine_threadsafe(self._preview(cfg, cmd), self._loop)
        return future.result(FETCH_TIMEOUT * 4)

    def still(self, entity: str, width: int) -> bytes | None:
        """One camera's latest still, width wide (16:9), for the Camera Dashboard's
        thumbnails; None if HA has none. Served from the kept stills at once (only a
        camera never seen waits for HA); resized here, off the compositor's loop, and
        kept until the still changes. Thread-safe."""
        if not (self._loop and self._running):
            raise RuntimeError("the compositor is not running")
        future = asyncio.run_coroutine_threadsafe(
            self.gather.ready_still(entity), self._loop
        )
        source = future.result(FETCH_TIMEOUT * 2)
        return (
            None if source is None else self.gather.thumb(entity, width, False, source)
        )

    def stop(self) -> None:
        if self._loop and self._stop:
            self._loop.call_soon_threadsafe(self._stop.set)
        if self._own_gather:
            deadline = time.monotonic() + 5
            while self._running and time.monotonic() < deadline:
                time.sleep(0.01)
            self.gather.stop()

    # -- controls (the Camera compositor page, the integration's buttons)

    def _clear(self, entity: str | None = None) -> None:
        """Forget every picture (its own drawn ones and the cameras', which it shares),
        or one channel's; fetched and drawn afresh, only as they are asked for."""
        if entity is None:
            self._pictures.clear()
        self.gather.clear(entity)

    def _on_loop(self, fn: Callable[[], None]) -> None:
        """Run fn on its loop and wait for it (directly while it is not running)."""
        if not (self._loop and self._running):
            fn()
            return

        async def run() -> None:
            fn()

        asyncio.run_coroutine_threadsafe(run(), self._loop).result(2)

    def flush(self) -> None:
        """Empty the cache: every still and picture fetched and drawn afresh."""
        _LOGGER.info(
            "compositor (%s): cache flushed; stills and pictures fetched afresh as "
            "they are asked for",
            self.store,
        )
        self._on_loop(self._clear)

    def forget_picture(self, key: str) -> None:
        """Drop one picture it drew (a commander at a size): drawn afresh at its next
        turn."""
        _LOGGER.info("compositor (%s): purged the picture %s", self.store, key)
        self._on_loop(lambda: self._pictures.pop(key, None) and None)

    def forget(self, entity: str) -> None:
        """Purge one channel's picture (fetched afresh; its size is kept)."""
        _LOGGER.info("compositor (%s): forgot the stills of %s", self.store, entity)
        self._on_loop(lambda: self._clear(entity))

    def restart(self) -> None:
        """Stop the whole engine and start it again: config re-read, every cache and
        stream gone, the server bound afresh."""
        _LOGGER.info("compositor (%s): restarting", self.store)
        self.stop()
        deadline = time.monotonic() + 10
        while self._running and time.monotonic() < deadline:
            time.sleep(0.05)
        self._loop = None
        if self.gather.loop:
            self._on_loop(self._clear)
        else:
            self._clear()
        for state in (self._streams, self._open, self._asked, self._sizes):
            state.clear()
        self._ready.clear()
        self.start()

    def health(self) -> dict[str, Any]:
        if self._running:
            state = "running" if cameras_of(self.cfg.commanders) else "unconfigured"
        else:
            state = "offline"
        return {
            "state": state,
            "port": self.port,
            "commanders": len(self.cfg.commanders),
            "cameras": len(cameras_of(self.cfg.commanders)),
            "streams": self._stream_count(),
            "gathering": self._gathering,
            "sitting_out": sorted(self.gather._benched),
            "go2rtc": self.gather.go2rtc,
            # The pipeline's controls, for the integration's entities: the gatherer
            # (shared) and this engine's generator and server, paused or running, and
            # the paces (seconds between).
            "gatherer_paused": self.gather.paused,
            "generator_paused": self.drawing_paused,
            "server_paused": self.serving_paused,
            "paces": {w: self.gather.pace(w) for w in PACES},
            "flags": dict(self.gather.flags),
            "cache": self.gather.cache_stats(),  # (shared: the whole cache)
            "health": self.gather.verdict(),  # (shared: the whole system's)
            "streams_read": sum(1 for r in self.gather._readers.values() if r.alive),
            "needs": self.needs if state == "unconfigured" else None,
            "error": self._error,
        }

    async def _serve(self) -> None:
        self._loop, self._stop = asyncio.get_running_loop(), asyncio.Event()
        runner = None
        try:
            self._draw_lock = asyncio.Lock()
            self._watching, self._tick = asyncio.Event(), asyncio.Event()
            self._serving = asyncio.Event()
            if not self.serving_paused:
                self._serving.set()
            if self.prewarm:  # the first LINGER gathers, so the first viewer waits less
                self._warm_until = time.monotonic() + LINGER
                self._watching.set()
            app = web.Application()
            app.add_routes(
                [
                    web.get("/", self._index),
                    web.get("/status", self._status),
                    web.get("/size-test", self._size_test),
                    web.get("/g/{name}.jpg", self._jpg),
                    web.get("/g/{name}.mjpg", self._mjpg),
                    web.post("/g/{name}/done", self._done),
                ]
            )
            runner = web.AppRunner(app, access_log=None)
            await runner.setup()
            site = web.TCPSite(runner, "0.0.0.0", self.port)
            await site.start()
            if self.port == 0:
                self.port = site._server.sockets[0].getsockname()[1]  # type: ignore[union-attr]
            self._running = True
            _LOGGER.info("compositor (%s) serving on :%d", self.store, self.port)
            tasks = [asyncio.create_task(self._gather())]
            self._ready.set()
            await self._stop.wait()
            # The loop is the gatherer's, shared: its own tasks end with it, not the loop.
            ending = [*tasks, *self._bg]
            for task in ending:
                task.cancel()
            await asyncio.gather(*ending, return_exceptions=True)
        except OSError as exc:
            self._error = f"cannot serve on :{self.port}: {exc}"
            _LOGGER.error(self._error)
        finally:
            self._running = False
            self._ready.set()
            if runner:
                await runner.cleanup()

    # -- gathering and drawing

    def _stream_count(self) -> int:
        return sum(len(v) for v in self._streams.values())

    def _watched(self) -> list[dict]:
        """The commanders with cameras someone is watching, at each size watched: a
        stream open, or a picture asked for in the last LINGER seconds. A picture nobody
        watches any more is dropped (stale, and listed as if drawn), and a card's size
        forgotten."""
        now = time.monotonic()
        out = []
        for c in self.cfg.commanders:
            if not commander_cameras(c):
                continue
            name = slug(c["name"])
            sizes = self._sizes.setdefault(name, {(None, False): None})
            for size, live_main in list(sizes):
                key = view_key(name, size, live_main)
                if live_main and not self.gather.flag("live_main"):
                    pass  # switched off: no more of them (a card asks again without)
                elif (
                    self._open.get(key)
                    or now - self._asked.get(key, -LINGER) < LINGER
                    or (size is None and not live_main and now < self._warm_until)
                ):
                    out.append(sized(c, size, live_main))
                else:  # its picture too: one nobody watches is not drawn, nor shown
                    if size is not None or live_main:
                        del sizes[(size, live_main)]
                    self._pictures.pop(key, None)
                    self._asked.pop(key, None)
        return out

    def _touch(
        self, name: str, size: Size | None = None, live_main: bool = False
    ) -> None:
        """Someone asked for a commander's picture (at a size, its main camera live or
        not): gather (from now, for LINGER at least)."""
        self._sizes.setdefault(name, {(None, False): None})[(size, live_main)] = None
        self._asked[view_key(name, size, live_main)] = time.monotonic()
        if self._watching:
            self._watching.set()

    def _fresh_of(self, name: str) -> asyncio.Event:
        return self._fresh.setdefault(name, asyncio.Event())

    def _places(
        self, cmd: dict, main: str
    ) -> list[tuple[str, str, str, tuple[int, int], bool]]:
        """Each place in a commander's picture: (where, camera, channel, size, whole),
        each tile (where: its panel) and the main area. The channel is the one to draw it
        from (see `choose`); until the channels' sizes are known, a tile's low channel
        and the main camera's medium."""
        _, (_, _, mw, mh), rects = commander_layout(cmd, main)
        out = []

        def place(where: str, camera: str, size: tuple[int, int], whole: bool) -> None:
            ladder = channels(self.cfg, camera)
            default = ladder.get("medium", camera) if where == "main" else camera
            chan = choose(list(ladder.values()), self.gather.res, size, whole, default)
            out.append((where, camera, chan, size, whole))

        for panel in PANELS:
            whole = cmd[panel].get("fit", "cover") != "cover"
            for e, (_, _, w, h) in zip(
                cmd[panel]["cameras"], rects[panel], strict=True
            ):
                place(panel, e, (max(w, 16), max(h, 9)), whole)
        if main:
            whole = cmd.get("main_fit", "fit") not in ("fill", "crop")
            place("main", main, (max(mw, 16), max(mh, 9)), whole)
        return out

    def _want(self, cmds: list[dict]) -> None:
        """Tell the gatherer which channel each place of these commanders is drawn from
        (each channel once, whatever the pictures and places that use it)."""
        uses: dict[str, list[tuple[str, str, tuple[int, int], bool]]] = {}
        for cmd in cmds:
            picture = key_of(cmd)
            for where, camera, chan, size, whole in self._places(
                cmd, self.main_camera(cmd) or ""
            ):
                if where == "main" and cmd.get("main_video"):
                    continue  # the card plays it: drawn from the cache as it is
                uses.setdefault(chan, []).append((picture, where, size, whole))
                if self._chosen.get((picture, where, camera)) != chan:
                    self._chosen[(picture, where, camera)] = chan
                    _LOGGER.info(
                        "compositor (%s): %s, %s (%d x %d): from %s's %s channel%s",
                        self.store,
                        picture,
                        where,
                        *size,
                        self.cfg.titles.get(camera, camera),
                        self.gather._channel(chan)[1],
                        f" ({self.gather.res[chan][0]} x {self.gather.res[chan][1]})"
                        if chan in self.gather.res
                        else "",
                    )
        self.gather.want(self.role, uses)

    async def _draw(self, cmd: dict, changing: bool = False) -> bytes:
        """Draw a commander from the cache (in a worker thread), keep it as its latest
        picture and tell its open streams."""
        assert self._draw_lock
        cfg = self.cfg
        main = self.main_camera(cmd) or ""
        limit = float(cmd.get("stale", EMPTY_COMMANDER["stale"]))
        images, stale = {}, set()
        main_image, age = None, math.inf
        for where, camera, chan, _, _ in self._places(cmd, main):
            if where == "main":
                main_image, age = self.gather.pick(camera, chan)
                continue
            images[camera], tile_age = self.gather.pick(camera, chan)
            if tile_age > limit:
                stale.add(camera)
        async with self._draw_lock:
            began = time.monotonic()
            token = self.gather.begin(f"draw_s:{self.role}")
            try:
                picture, cpu = await asyncio.to_thread(
                    measured,
                    commander,
                    cmd,
                    cfg.titles,
                    images,
                    main,
                    main_image,
                    changing,
                    self.motion.get(cmd["id"], frozenset()),
                    frozenset(stale),
                    age > limit,
                )
            finally:
                self.gather.end(token)
        self.gather.count("compose_cpu", cpu)
        name = key_of(cmd)
        self._drawn[name] = (len(picture), time.monotonic() - began)
        if self.drawing_paused:  # paused while it drew: nothing new appears
            return picture
        self._pictures[name] = (time.monotonic(), picture)
        self._draws[name] += 1
        fresh, self._fresh[name] = self._fresh_of(name), asyncio.Event()
        fresh.set()
        return picture

    async def _gather(self) -> None:
        """The generator: while someone is watching, at its pace (or at once when
        asked, `_tick`), a picture of each commander watched, from whatever the cache
        holds now (it never waits for the gatherer), having told the gatherer what they
        are drawn from. Nobody watching, or paused: it waits, drawing nothing (and
        wanting nothing)."""
        assert self._watching and self._tick
        while True:
            watched = [] if self.drawing_paused else self._watched()
            if not watched:
                if self._gathering:
                    self._gathering = False
                    _LOGGER.info(
                        "compositor (%s): nobody watching; drawing stopped", self.store
                    )
                self._watching.clear()
                try:  # a request sets it; the timeout notices a stream just closed
                    await streams.within(self._watching.wait(), LINGER)
                except TimeoutError:
                    pass
                continue
            if not self._gathering:
                self._gathering = True
                _LOGGER.info(
                    "compositor (%s): someone is watching; drawing every %g s",
                    self.store,
                    self.gather.pace(self.role),
                )
            started = time.monotonic()
            self._tick.clear()
            self._want(watched)
            for cmd in watched:
                try:
                    await self._draw(cmd)
                except (OSError, ValueError) as exc:
                    _LOGGER.warning(
                        "compositor (%s): cannot draw %s: %s",
                        self.store,
                        cmd["name"],
                        exc,
                    )
            try:
                await streams.within(
                    self._tick.wait(),
                    max(
                        0.0, self.gather.pace(self.role) - (time.monotonic() - started)
                    ),
                )
            except TimeoutError:
                pass

    async def _preview(self, cfg: Config, cmd: dict) -> bytes:
        """A commander for a preview: from the kept stills, drawn in a worker thread."""
        main = self.main_camera(cmd, chosen=False) or ""
        cams = commander_cameras(cmd)
        images = await asyncio.gather(
            *(self.gather.ready_still(e) for e in [main, *cams])
        )
        return await asyncio.to_thread(
            commander,
            cmd,
            cfg.titles,
            dict(zip(cams, images[1:], strict=True)),
            main,
            images[0],
        )

    async def _frame(
        self, cmd: dict, size: Size | None = None, live_main: bool = False
    ) -> bytes | None:
        """A commander's latest picture (at a size asked for), for the server, which
        never draws: one missing or old (after a quiet spell) is asked of the generator
        and waited for (FETCH_TIMEOUT at most; the generator draws at once from the
        cache, "(Waiting …)" and all). While drawing is paused, the last one drawn, or
        None when there is none (a purge)."""
        self._touch(slug(cmd["name"]), size, live_main)
        cmd = sized(cmd, size, live_main)
        name = key_of(cmd)
        limit = float(cmd.get("stale", EMPTY_COMMANDER["stale"]))
        picture = self._pictures.get(name)
        if picture and (
            self.drawing_paused or time.monotonic() - picture[0] < min(limit, LINGER)
        ):
            return picture[1]
        if self.drawing_paused:
            return None
        fresh = self._fresh_of(name)
        if self._tick:
            self._tick.set()
        try:
            await streams.within(fresh.wait(), FETCH_TIMEOUT)
        except TimeoutError:
            pass
        drawn = self._pictures.get(name)
        return drawn[1] if drawn else None

    async def _next_picture(self, key: str, stop: asyncio.Event) -> None:
        """Wait for a picture's next drawing, a stream's end, or KEEPALIVE seconds."""
        waits = [
            asyncio.ensure_future(stop.wait()),
            asyncio.ensure_future(self._fresh_of(key).wait()),
        ]
        try:
            await asyncio.wait(
                waits, timeout=KEEPALIVE, return_when=asyncio.FIRST_COMPLETED
            )
        finally:  # cancelled too (the stream ending): no wait left behind
            for w in waits:
                w.cancel()

    def pause(self, stage: str, paused: bool) -> None:
        """Pause a stage, or run it again: "generator" (no drawing; the last pictures
        are served on) or "server" (streams send nothing new; single pictures are
        refused). Thread-safe."""
        if stage not in ("generator", "server"):
            raise ValueError(stage)
        attr = "drawing_paused" if stage == "generator" else "serving_paused"
        if getattr(self, attr) == paused:
            return
        setattr(self, attr, paused)
        _LOGGER.info(
            "compositor (%s): %s %s",
            self.store,
            stage,
            "paused" if paused else "running again",
        )

        def apply() -> None:
            if self._serving:
                (self._serving.clear if self.serving_paused else self._serving.set)()
            for event in (self._watching, self._tick):
                if event:
                    event.set()

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)

    # -- keeping HA's live streams warm

    async def _warm_streams(self, name: str) -> None:
        """Start HA's HLS streams for a commander's cameras, so a tap into a live page
        finds them already running. A cold HLS stream takes 7-9 s to become playable; a
        running one ~10 ms. Rate-limited; cameras without channels are skipped."""
        assert self.gather.http
        now = time.monotonic()
        if now - self._warmed.get(name, -1e9) < WARM_STREAM_EVERY:
            return
        self._warmed[name] = now
        ents = [
            "camera." + self.cfg.entities[e][WARM_STREAM_TIER].replace("camera.", "")
            for e in commander_cameras(self.cfg.named(name) or {})
            if WARM_STREAM_TIER in self.cfg.entities.get(e, {})
        ]
        if not ents:
            return
        try:
            async with self.gather.http.ws_connect(self.ws_url, max_msg_size=0) as ws:
                await ws.receive_json()
                await ws.send_json({"type": "auth", "access_token": self.token})
                await ws.receive_json()
                for i, e in enumerate(ents, 1):
                    await ws.send_json(
                        {
                            "id": i,
                            "type": "camera/stream",
                            "entity_id": e,
                            "format": "hls",
                        }
                    )
                urls = []
                while len(urls) < len(ents):
                    m = await streams.within(ws.receive_json(), FETCH_TIMEOUT)
                    if m.get("type") == "result" and m.get("success"):
                        urls.append(self.ha_url + m["result"]["url"])
                    elif m.get("type") == "result":
                        ents.pop()  # a camera with no HLS stream: don't wait for it
            await asyncio.gather(*(self._hit_hls(u) for u in urls))
        except (aiohttp.ClientError, TimeoutError):
            pass

    async def _hit_hls(self, master_url: str) -> None:
        """Fetch the master then the variant playlist: HA holds the variant until the
        stream is up, so this returns when the stream is running (and keeps it running
        for HA's idle timeout)."""
        assert self.gather.http
        try:
            t = aiohttp.ClientTimeout(total=30)
            async with self.gather.http.get(master_url, timeout=t) as r:
                text = await r.text()
            variant = next(
                ln for ln in text.splitlines() if ln and not ln.startswith("#")
            )
            async with self.gather.http.get(
                master_url.rsplit("/", 1)[0] + "/" + variant, timeout=t
            ) as r:
                await r.read()
        except (aiohttp.ClientError, TimeoutError, StopIteration):
            pass

    def _warm_in_background(self, name: str) -> None:
        task = asyncio.ensure_future(self._warm_streams(name))
        self._bg.add(task)
        task.add_done_callback(self._bg.discard)

    # -- HTTP handlers

    def _live_main(self, request: web.Request) -> bool:
        """Whether a picture's main camera is left to the card's live video: asked for
        (?main=video) and allowed (the whole system's live_main switch)."""
        return request.query.get("main") == "video" and self.gather.flag("live_main")

    def _known(self, name: str) -> dict | None:
        """The commander served as /g/<name>, when it has cameras."""
        cmd = self.cfg.named(name)
        return cmd if cmd and commander_cameras(cmd) else None

    async def _jpg(self, request: web.Request) -> web.Response:
        if not (cmd := self._known(request.match_info["name"])):
            raise web.HTTPNotFound()
        name = slug(cmd["name"])  # /g/commander is the first's: its pictures' key
        if self.serving_paused:
            raise web.HTTPServiceUnavailable(text="paused")
        self._warm_in_background(name)
        data = await self._frame(
            cmd, asked_size(request.query), self._live_main(request)
        )
        if data is None:
            raise web.HTTPServiceUnavailable(text="no picture drawn (drawing paused?)")
        self.gather.sent(len(data))
        return web.Response(
            body=data, content_type=mime(data), headers={"Cache-Control": "no-store"}
        )

    async def _done(self, request: web.Request) -> web.Response:
        """A card done with a stream it named (out of sight, or gone): ended now, even
        mid-send (a write the network isn't taking would hold a stop till it did).
        Logged whether or not that stream is open, with the card's reason."""
        sid = request.query.get("sid", "")
        why = "".join(c for c in request.query.get("why", "")[:40] if c.isprintable())
        found = self._named.pop(sid, None)
        if found:
            task, sending = found
            sending.ended = f"the card is done with it ({why or 'no reason given'})"
            task.cancel()
        else:
            _LOGGER.info(
                "compositor (%s): %s told by %s that the card is done with stream %s "
                "(%s), which is not open",
                self.store,
                request.match_info["name"],
                viewer(request),
                sid or "(no name)",
                why or "no reason given",
            )
        return web.Response(status=204)

    async def _mjpg(self, request: web.Request) -> web.StreamResponse:
        if not (cmd := self._known(request.match_info["name"])):
            raise web.HTTPNotFound()
        name = slug(cmd["name"])  # /g/commander is the first's: its pictures' key
        resp = web.StreamResponse(
            headers={
                "Content-Type": "multipart/x-mixed-replace; boundary=frame",
                "Cache-Control": "no-store",
            }
        )
        resp.force_close()  # when this stream ends, drop the connection rather than idle
        # A browser doesn't close an <img> stream when the page that had it is left, so
        # they pile up until the client's connection limit is hit and the next page's
        # image waits. So a client's oldest streams are ended when it opens more.
        stop, streams = asyncio.Event(), self._streams.setdefault(viewer(request), [])
        streams.append(stop)
        while len(streams) > MAX_STREAMS:
            streams.pop(0).set()
        # Drawn at the size its address asks for (a card's exact size), else its own.
        size, live_main = asked_size(request.query), self._live_main(request)
        key = view_key(name, size, live_main)
        self._open[key] = self._open.get(key, 0) + 1
        sid = request.query.get("sid", "")[:40]
        sending = Sending(
            key,
            viewer(request) or "",
            time.monotonic(),
            sid=sid,
            card=request.query.get("v", "")[:40],
            gather=self.gather,
        )
        if sid:
            # The card's showing asked again (at a new size, say): its stream before is
            # done with, whether or not the browser let it go.
            if old := self._named.get(sid):
                old[1].ended = "the card asked again (a new size)"
                old[0].cancel()
            self._named[sid] = (asyncio.current_task(), sending)  # type: ignore[assignment]
        self._sending.append(sending)
        open_token = self.gather.begin("stream_s")
        _LOGGER.info(
            "compositor (%s): stream %s to %s opened (%s)",
            self.store,
            key,
            sending.viewer,
            f"card {sending.card or '?'}, stream {sid}"
            if sid
            else "no stream name: not a Camera Commander card of 2026.10.3-b70 or later",
        )
        await resp.prepare(request)
        try:
            # Chrome draws a multipart frame only when it sees the *next* part begin, so a
            # lone frame would sit unseen for a whole interval. So every write ends by
            # opening the following part (boundary + header, no body yet): the frame just
            # sent is drawn at once, and the next one fills the part already open.
            # The parts' type (JPEG, or WebP with transparent gaps) is set by the first
            # picture; a deploy that changes it ends the stream (the dashboard reloads).
            self._warm_in_background(name)
            data = await self._frame(cmd, size, live_main)
            while data is None and not stop.is_set():  # none drawn yet: wait for one
                await self._next_picture(key, stop)
                if not (cmd := self._known(name)):
                    sending.ended = "its commander is gone"
                    return resp
                data = await self._frame(cmd, size, live_main)
            if data is None:
                sending.ended = sending.ended or "no picture to send"
                return resp
            seen = self._draws[key]  # the drawing sent
            kind = mime(data)
            part = f"--frame\r\nContent-Type: {kind}\r\n\r\n".encode()
            await resp.write(part)
            while not stop.is_set():
                if mime(data) != kind:
                    sending.ended = "its picture's type changed (a deploy)"
                    break
                if self._serving and not self._serving.is_set():
                    await self._serving.wait()  # paused: nothing sent until it runs
                await sending.write(resp, data + b"\r\n" + part)
                # The next picture as soon as one is drawn (or the same again after
                # KEEPALIVE, should drawing stop); at once if one was drawn while this
                # one was sending (waiting for the one after halved a slow link's rate).
                if self._draws[key] == seen:
                    await self._next_picture(key, stop)
                if stop.is_set():
                    break
                self._warm_in_background(name)
                cmd = self._known(name)  # a reload may have changed it, or removed it
                if not cmd:
                    sending.ended = "its commander is gone"
                    break
                live_main = self._live_main(request)  # the switch may have changed
                data = (
                    await self._frame(cmd, size, live_main) or data
                )  # none: as before
                skipped = max(self._draws[key] - seen - 1, 0)  # drawn while sending
                sending.skipped += skipped
                self.gather.count("out_skipped", skipped)
                seen = self._draws[key]
        except (ConnectionResetError, asyncio.CancelledError):
            pass  # the viewer went away, or a reason is set (see ended)
        finally:
            if stop.is_set() and not sending.ended:
                sending.ended = "ended by the server (too many from this viewer)"
            if stop in streams:
                streams.remove(stop)
            if sid and (self._named.get(sid) or (None,))[0] is asyncio.current_task():
                del self._named[sid]
            self._open[key] -= 1
            self._sending.remove(sending)
            self.gather.end(open_token)
            f = sending.figures(time.monotonic())
            _LOGGER.info(
                "compositor (%s): stream %s to %s ended, %s, after %.0f s: %d frames, "
                "%.0f kB a frame, %.0f kbit/s, %.0f%% of the time waiting to send",
                self.store,
                key,
                sending.viewer,
                sending.ended or "the viewer went away",
                f["open_s"],
                f["frames"],
                f["kb_frame"],
                f["kbit_s"],
                f["waiting_pct"],
            )
        return resp

    async def _size_test(self, request: web.Request) -> web.Response:
        """A page asking for a commander at exactly the window's size, as a card does,
        showing what it asked for and what came back (resize it to test end to end)."""
        page = Path(__file__).with_name("size-test.html").read_text()
        return web.Response(text=page, content_type="text/html")

    async def _status(self, request: web.Request) -> web.Response:
        return web.json_response(self._status_now())

    def status(self) -> dict[str, Any]:
        """What it serves now (see _status_now), for the admin page's Camera compositor
        page. Thread-safe: read on its own loop."""
        if not (self._loop and self._running):
            return self.health()

        async def read() -> dict[str, Any]:
            return self._status_now()

        return asyncio.run_coroutine_threadsafe(read(), self._loop).result(2)

    def _status_now(self) -> dict[str, Any]:
        """Its health, and: each picture drawn (a commander at a size: its own, or one
        a card asked for), its age and the streams open on it; the streams open per
        device; each channel's still (its camera and tier, its size, age and fetch time,
        rounds missed in a row, when one sitting out is tried again, and the places
        drawn from it while gathering, each with how much it is enlarged)."""
        now = time.monotonic()

        def picture(key: str, at: float) -> dict[str, Any]:
            live_main = key.endswith(LIVE_MAIN)
            name, _, size = key.removesuffix(LIVE_MAIN).partition("@")
            cmd = self.cfg.named(name) or {}
            w, h, scale = (
                size.split("x") if size else (cmd.get("width"), cmd.get("height"), 1)
            )
            return {
                "key": key,
                "commander": cmd.get("name", name),
                "width": int(w or 0),
                "height": int(h or 0),
                "scale": float(scale),
                "asked": bool(size),  # a card's own size, not the commander's
                "live_main": live_main,  # its main camera the card's live video
                "age_s": round(now - at, 1),
                "streams": self._open.get(key, 0),
                "kb": round(self._drawn.get(key, (0, 0))[0] / 1000),
                "draw_ms": round(self._drawn.get(key, (0, 0))[1] * 1000),
            }

        return {
            **self.health(),
            "stale_s": min(
                (float(c.get("stale", 30)) for c in self.cfg.commanders), default=30
            ),
            "pictures": [picture(k, t) for k, (t, _) in sorted(self._pictures.items())],
            "devices": {ip: len(v) for ip, v in self._streams.items() if v},
            "generator_paused": self.drawing_paused,
            "pace": self.gather.pace(self.role),
            "server_paused": self.serving_paused,
            "gatherer_paused": self.gather.paused,
            "sending": [s.figures(now) for s in self._sending],
            "drawing": self._gathering,
        }

    async def _index(self, request: web.Request) -> web.Response:
        links = "".join(
            f'<li>{html.escape(c["name"])}: <a href="/g/{slug(c["name"])}.jpg">jpg</a> '
            f'<a href="/g/{slug(c["name"])}.mjpg">mjpg</a></li>'
            for c in self.cfg.commanders
            if commander_cameras(c)
        )
        return web.Response(text=f"<ul>{links}</ul>", content_type="text/html")


# --- the Camera compositor page and the integration's buttons ------------------------


def admin_api(
    live: Compositor,
    draft: Compositor | None,
    host: Callable[[], str | None] = lambda: None,
):
    """The Camera compositor page's API (/api/compositor/): GET / is what the live
    compositor (dashboards, wall tablets) and the draft one (previews, Show the draft
    cards) serve now, each with its size test page's address on the LAN (`host`: this
    box's LAN address, when known); POST restart (both engines), <live|draft>/flush,
    <live|draft>/forget {"camera": <entity>} (the cache, shared: whole or one
    channel), cache/purge, cache/forget {"camera": <entity>}, gatherer/<pause|run>
    and <live|draft>/<generator|server>/<pause|run> answer with it afresh; GET
    thumb/<entity>?w=<px>[&whole=1] is a cached picture as a thumbnail."""
    engines = {"live": live, "draft": draft}

    def one(engine: Compositor) -> dict[str, Any]:
        at = host()
        test = f"http://{at}:{engine.port}/size-test" if at else None
        return {**engine.status(), "size_test": test}

    def status() -> tuple[int, str, bytes]:
        data = {
            "gatherer": live.gather.status(),
            "live": one(live),
            "draft": one(draft) if draft else None,
        }
        return 200, "application/json", json.dumps(data).encode()

    def fail(code: int, error: str) -> tuple[int, str, bytes]:
        return code, "application/json", json.dumps({"error": error}).encode()

    def handle(
        method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> tuple[int, str, bytes]:
        parts = [p for p in path.split("/") if p]
        if method == "GET" and not parts:
            return status()
        if method == "GET" and len(parts) == 2 and parts[0] == "thumb":
            parts[1] = unquote(parts[1])  # a composite's key has an @ in it
            # A cached picture, width wide (whole: at its shape, else cut to 16:9).
            try:
                width = max(32, min(int((query.get("w") or ["320"])[0]), 1920))
            except ValueError:
                return fail(400, "w: a width in px")
            whole = (query.get("whole") or ["0"])[0] == "1"
            which = (query.get("engine") or [""])[0]
            if which:  # a composite: a picture a compositor drew
                drawer = engines.get(which)
                drawn = drawer._pictures.get(parts[1]) if drawer else None
                if not drawn:
                    return fail(404, "no such picture")
                made = live.gather.thumb(f"{which}/{parts[1]}", width, whole, drawn[1])
            else:
                made = live.gather.thumb(parts[1], width, whole)
            return (200, mime(made), made) if made else fail(404, "no such picture")
        if method != "POST":
            return fail(404, "not found")
        if parts[:1] == ["gatherer"] and parts[1:] in (["pause"], ["run"]):
            live.gather.pause(parts[1] == "pause")
            return status()
        if parts == ["gatherer", "restart"]:
            live.gather.restart()
            return status()
        if (
            len(parts) == 3
            and parts[0] in engines
            and engines[parts[0]]
            and parts[1] in ("generator", "server")
            and parts[2] in ("pause", "run")
        ):
            engines[parts[0]].pause(parts[1], parts[2] == "pause")  # type: ignore[union-attr]
            return status()
        if parts == ["pace"]:
            try:
                asked = json.loads(body or b"{}")
                which, seconds = str(asked["which"]), float(asked["seconds"])
                if which not in PACES:
                    return fail(404, f"no such setting: {which}")
                engine = engines.get(which)  # a generator's pace: that engine's
                if which in engines and not engine:
                    return fail(404, "no such engine")
                live.gather.set_pace(which, seconds)
                if engine:  # its next drawing at the new pace, now
                    tick = engine._tick
                    engine._on_loop(lambda: tick.set() if tick else None)
            except (ValueError, KeyError, TypeError) as exc:
                return fail(400, f"pace: {exc}")
            return status()
        if parts == ["flag"]:
            try:
                asked = json.loads(body or b"{}")
                live.gather.set_flag(str(asked["which"]), bool(asked["on"]))
            except (ValueError, KeyError, TypeError) as exc:
                return fail(400, f"flag: {exc}")
            return status()
        if parts == ["cache", "purge"]:
            for engine in (live, draft):
                if engine:
                    engine.flush()
            return status()
        if parts == ["cache", "forget"]:
            try:
                asked = json.loads(body or b"{}")
                if "picture" in asked:  # a composite: redrawn at its next turn
                    drawer = engines[str(asked["engine"])]
                    if not drawer:
                        return fail(404, "no such engine")
                    drawer.forget_picture(str(asked["picture"]))
                    return status()
                camera = str(asked["camera"])
            except (ValueError, KeyError, TypeError):
                return fail(400, "which picture?")
            live.forget(camera)
            return status()
        if parts == ["restart"]:
            for engine in (live, draft):
                if engine:
                    engine.restart()
            return status()
        engine = engines.get(parts[0]) if parts else None
        if not engine or len(parts) != 2:
            return fail(404, "not found")
        if parts[1] == "flush":
            engine.flush()
            return status()
        if parts[1] == "forget":
            try:
                camera = str(json.loads(body or b"{}")["camera"])
            except (ValueError, KeyError, TypeError):
                return fail(400, "which camera?")
            engine.forget(camera)
            return status()
        return fail(404, "not found")

    return handle


def control(live: Compositor, draft: Compositor | None) -> Callable[[str, bytes], int]:
    """The integration's buttons: POST /compositor/restart (both engines), and
    /compositor/flush {"which": "live" | "draft"}."""
    api = admin_api(live, draft)

    def handle(path: str, body: bytes) -> int:
        if path.strip("/") == "flush":
            try:
                which = str(json.loads(body or b"{}").get("which") or "live")
            except (ValueError, AttributeError):
                return 400
            return api("POST", f"{which}/flush", {}, b"")[0]
        return api("POST", path, {}, body)[0]

    return handle
