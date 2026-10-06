"""compositor: on-demand camera compositor: the Camera Commander's picture.

Three parts, all on one asyncio loop in the compositor's own thread:

  * the gather loop: while someone is watching (a stream open, or a picture asked for in
    the last LINGER seconds), every INTERVAL it fetches from Home Assistant the still of
    each channel the watched pictures are drawn from, all at once, each with its own
    timeout, into a cache that is never emptied. Stills come at the channel's own size;
    each place (a tile, the main area) is drawn from the first of its camera's channels,
    low, medium, high, whose still is at least its size, so it is only made smaller
    (`choose`). The channels' sizes are learned as their stills come (the kept stills
    fetch every channel not yet sized). A channel that misses STRIKES rounds in a row
    sits out (its picture goes stale) and is tried again after BENCH seconds. Nobody
    watching: nothing is fetched.
  * the drawing: after each round each commander being watched is drawn from the
    cache, in a worker thread (the loop keeps serving meanwhile); a camera picture older
    than the commander's `stale` seconds is marked Stale. Open streams are told a new
    picture is ready. Only the cameras of the commanders being watched are fetched.
  * the HTTP server: serves the latest picture, to any number of viewers.

Ported from tablet-provision/composite-test/server.py.

  GET /g/<name>.jpg       a commander's latest picture (poll it, or view it once); its
                          name as a slug: /g/cameras.jpg for the commander Cameras
  GET /g/<name>.mjpg      self-updating multipart stream, one frame per interval
  GET /                   links; GET /status  cache ages and open streams
  GET /size-test          a commander at exactly the window's size, with the figures

Config is the Camera Dashboard's store in the app's config folder:
camera-dashboard-live.json (what was last deployed); the draft compositor reads the draft,
camera-dashboard.json.
"""

from __future__ import annotations

import asyncio
import functools
import html
import io
import json
import logging
import math
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
INTERVAL = 2.0  # seconds between gather rounds while someone is watching
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
STREAM_RETRY = 30.0  # seconds before a lost stream is read again (snapshots meanwhile)
PROBES_AT_ONCE = 2  # channels read at once for their size
LATEST_AT_ONCE = 4  # cameras fetched together in a round


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


def view_key(name: str, size: Size | None) -> str:
    """A commander's picture at a size: its own key (its slug alone at its set size)."""
    return name if size is None else f"{name}@{size[0]}x{size[1]}x{size[2]:g}"


def sized(cmd: dict, size: Size | None) -> dict:
    """The commander drawn at a size asked for: that canvas, its gap, text and bars grown
    by the scale, so they look the same in CSS pixels on any screen."""
    if size is None:
        return cmd
    w, h, dpr = size
    return {
        **cmd,
        "width": w,
        "height": h,
        "gap": round(cmd["gap"] * dpr),
        "margin": round(cmd.get("margin", 0) * dpr),
        "scale": dpr,
        "view": view_key(slug(cmd["name"]), size),
    }


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

    async def write(self, resp: web.StreamResponse, data: bytes) -> None:
        began = time.monotonic()
        await resp.write(data)
        self.waiting += time.monotonic() - began
        self.frames += 1
        self.sent += len(data)

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
        if main_image and main_stale:
            _stale_mark(draw, (px + pw - u(10), py + u(22)), font, scale)
        foot = py + ph - u(18)
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
    (`want`). Each channel wanted is then fetched by a loop of its own, every INTERVAL:
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
        keep_stills: float | None = None,
        sizes_path: Path | None = None,
    ) -> None:
        self.ha_url = ha_url.rstrip("/")  # the Supervisor proxy, or http://host:8123
        self.ws_url = self.ha_url.replace("http", "ws", 1) + ws_path
        self.token = token
        # Keep the latest still of every camera, refreshed this often (seconds), so the
        # Camera Dashboard's thumbnails and previews are ready at once.
        self.keep_stills = keep_stills
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
        self._probing: set[str] = set()
        self._probe_limit: asyncio.Semaphore | None = None  # probes at once, shared
        self._misses: dict[str, int] = {}  # channel -> fetches missed in a row
        self._benched: dict[str, float] = {}  # channel -> when it is tried again
        self._answered = 0.0  # when any channel last answered (HA up)
        self._ha_down = False
        self._wake: asyncio.Event | None = None  # look at the wants now
        self._round_now: asyncio.Event | None = None  # the kept stills now
        self._bg: set[asyncio.Task] = set()
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
        self._wake = asyncio.Event()
        self._placehold()
        tasks = [self._run()]
        if self.keep_stills:
            self._round_now = asyncio.Event()
            tasks.append(self._keep_stills(self.keep_stills))
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
            if self._round_now:
                self._round_now.set()  # any camera just added

        self._soon(apply)

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
            for event in (self._wake, self._round_now):
                if event:
                    event.set()

        self._soon(wake)

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
            await asyncio.wait_for(event.wait(), timeout)
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
                        "compositor (cameras): wanted; each channel fetched every %.0f s",
                        INTERVAL,
                    )
                for c in live - set(self._feeds):
                    task = asyncio.ensure_future(self._feed(c))
                    self._feeds[c] = task
            elif self.gathering:
                self.gathering = False
                _LOGGER.info("compositor (cameras): nothing wanted; fetching stopped")
            if not self.paused:
                self._survey()
            self._wake.clear()
            try:
                await asyncio.wait_for(self._wake.wait(), 1.0)
            except TimeoutError:
                pass

    def _stop_feeds(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop every channel's fetching loop and stream but those in keep."""
        for c in [c for c in self._feeds if c not in keep]:
            self._feeds.pop(c).cancel()
        self._stop_readers(set(keep))

    async def _feed(self, entity: str) -> None:
        """One channel, fetched every INTERVAL on its own until stopped (see _once)."""
        while True:
            started = time.monotonic()
            await self._once(entity)
            await asyncio.sleep(max(0.0, INTERVAL - (time.monotonic() - started)))

    async def _once(self, entity: str) -> None:
        """Fetch a channel once. A miss keeps the picture already cached (it goes
        stale); it counts against the channel only while others answer (one did in
        the INTERVAL before it was asked, or since): when none do, Home Assistant (or
        the way to it) is down, a restart say, which is no camera's fault, and an outage
        costs each channel one miss at most. STRIKES in a row and it sits out for BENCH
        seconds, skipped until then."""
        started = time.monotonic()
        if entity in self._benched:
            if started < self._benched[entity]:
                return
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
        elif self._answered > started - INTERVAL:
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
        elif not self._ha_down and now - self._answered > INTERVAL * 2:
            self._ha_down = True
            _LOGGER.warning(
                "compositor (cameras): no camera answers; Home Assistant unreachable? "
                "Trying on"
            )

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
        until fetched afresh; a channel sitting out is tried again. Their sizes are
        kept."""
        if entity is None:
            for cache in (self._stills, self.shots, self._taken, self._shot_size):
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
            ):
                d.pop(entity, None)
            self._waiting.discard(entity)
        self._placehold()
        for event in (self._wake, self._round_now):
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
        if reader or entity in self._probing:
            return "starting"
        return "snapshots" if entity in self._feeds else "stopped"

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
            "paused": self.paused,
            "gathering": self.gathering,
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
            name, why = None, f"cannot ask Home Assistant: {exc}"
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
        restarted, its go2rtc no longer has it: it is put there again)."""
        reader = self._readers.get(entity)
        if reader and reader.alive:
            return reader
        if reader:
            del self._readers[entity]
            self._names.pop(entity, None)
            why = reader.error or "stopped"
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
        reader = self._readers[entity] = streams.Reader(entity, self._rtsp(name))
        _LOGGER.info(
            "compositor (%s): %s, %s channel: reading its stream",
            "cameras",
            self._title(entity),
            self._channel(entity)[1],
        )
        return reader

    def _stop_readers(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop reading every stream but those in keep."""
        for entity in [e for e in self._readers if e not in keep]:
            self._readers.pop(entity).stop()
            _LOGGER.info(
                "compositor (%s): %s, %s channel: stream no longer read",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
            )

    async def _probe(self, entity: str, limit: asyncio.Semaphore) -> None:
        """Read one frame of a channel's stream: its true size (HA's snapshot may be
        another; every channel of some cameras gives the same one)."""
        try:
            async with limit:
                name = await self._name(entity)
                if not name:
                    return
                image = await asyncio.to_thread(streams.first_frame, self._rtsp(name))
            if image is not None:
                self.keep(entity, image, streamed=True)
        finally:
            self._probing.discard(entity)

    def _survey(self) -> None:
        """Size, from its stream, each channel of every camera not sized so yet (once:
        the sizes are kept across restarts), in the background, a few at a time."""
        if self._probe_limit is None:
            self._probe_limit = asyncio.Semaphore(PROBES_AT_ONCE)
        limit = self._probe_limit
        for camera in self._cameras():
            for entity in channels(self.cfg, camera).values():
                if (
                    entity in self._streamed
                    or entity in self._probing
                    or entity in self._readers
                    or not self._streamable(entity)
                ):
                    continue
                self._probing.add(entity)
                task = asyncio.ensure_future(self._probe(entity, limit))
                self._bg.add(task)
                task.add_done_callback(self._bg.discard)

    def _cameras(self) -> list[str]:
        """Every camera of the config: in a commander, or chosen and not in one yet."""
        out = dict.fromkeys(cameras_of(self.cfg.commanders))
        return list(out | dict.fromkeys(self.cfg.entities))

    async def _keep_stills(self, every: float) -> None:
        """Fetch the latest still of every camera (its low channel), and of each of its
        channels whose size is not known yet (so the first round sizes them all), every
        `every` seconds (or at once after a reload), a few at a time; what is kept is
        served while the next is fetched."""
        assert self._round_now
        _LOGGER.info(
            "compositor (%s): keeping the latest still of each camera, every %.0f s, "
            "and the size of each of its channels",
            "cameras",
            every,
        )
        limit = asyncio.Semaphore(LATEST_AT_ONCE)

        async def one(entity: str) -> bool:
            async with limit:
                image = await self._fetch_now(entity)
            if image is not None:
                self.keep(entity, image)
            return image is not None

        while True:
            self._round_now.clear()
            if self.paused:  # nothing fetched; woken when run again
                await self._round_now.wait()
                continue
            start = time.monotonic()
            cams = [
                e
                for camera in self._cameras()
                for tier, e in channels(self.cfg, camera).items()
                if (tier == "low" or e not in self.res)
                and e not in self._readers
                and e not in self._snap_wrong
            ]
            got = await asyncio.gather(*(one(e) for e in cams))
            _LOGGER.debug(
                "compositor (%s): %d of %d kept stills fetched in %.1f s",
                "cameras",
                sum(got),
                len(cams),
                time.monotonic() - start,
            )
            try:
                await asyncio.wait_for(self._round_now.wait(), every)
            except TimeoutError:
                pass

    async def ready_still(self, entity: str) -> Picture | None:
        """The kept still of a camera, at once; one never seen is fetched now, and kept."""
        if entity not in self.shots:
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
        keep_stills: float | None = None,
        needs: str = "a Deploy live from the Camera Dashboard page",
        gatherer: Gatherer | None = None,
    ) -> None:
        self.config_dir = config_dir
        self.store = store  # which Camera Dashboard store it serves (live or draft)
        self.prewarm = prewarm  # gather for LINGER from the start (not for previews)
        # The cameras' pictures: shared with the other compositor, or its own (keeping
        # the latest still of every camera every keep_stills seconds, if set).
        self.gather = gatherer or Gatherer(ha_url, token, ws_path, keep_stills)
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
        self._open: dict[str, int] = {}  # commander -> streams open
        # Where the time goes, for /status and the log: each picture's size (bytes) and
        # how long it took to draw (s); each open stream.
        self._drawn: dict[str, tuple[int, float]] = {}
        self._sending: list[Sending] = []
        self._asked: dict[str, float] = {}  # commander -> its last request
        # Commander (slug) -> the sizes its picture is asked for (None: its own size).
        self._sizes: dict[str, dict[Size | None, None]] = {}
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
                    *(self.gather.updated(ch, FETCH_TIMEOUT + INTERVAL) for ch in chans)
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
        stream open, or a picture asked for in the last LINGER seconds. A size nobody
        watches any more is forgotten, its picture too."""
        now = time.monotonic()
        out = []
        for c in self.cfg.commanders:
            if not commander_cameras(c):
                continue
            name = slug(c["name"])
            sizes = self._sizes.setdefault(name, {None: None})
            for size in list(sizes):
                key = view_key(name, size)
                if (
                    self._open.get(key)
                    or now - self._asked.get(key, -LINGER) < LINGER
                    or (size is None and now < self._warm_until)
                ):
                    out.append(sized(c, size))
                elif size is not None:
                    del sizes[size]
                    self._pictures.pop(key, None)
                    self._asked.pop(key, None)
        return out

    def _touch(self, name: str, size: Size | None = None) -> None:
        """Someone asked for a commander's picture (at a size): gather (from now, for
        LINGER at least)."""
        self._sizes.setdefault(name, {None: None})[size] = None
        self._asked[view_key(name, size)] = time.monotonic()
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
        self.gather.want(self.store, uses)

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
            picture = await asyncio.to_thread(
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
        name = key_of(cmd)
        self._drawn[name] = (len(picture), time.monotonic() - began)
        if self.drawing_paused:  # paused while it drew: nothing new appears
            return picture
        self._pictures[name] = (time.monotonic(), picture)
        fresh, self._fresh[name] = self._fresh_of(name), asyncio.Event()
        fresh.set()
        return picture

    async def _gather(self) -> None:
        """The generator: while someone is watching, every INTERVAL (or at once when
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
                    await asyncio.wait_for(self._watching.wait(), LINGER)
                except TimeoutError:
                    pass
                continue
            if not self._gathering:
                self._gathering = True
                _LOGGER.info(
                    "compositor (%s): someone is watching; drawing every %.0f s",
                    self.store,
                    INTERVAL,
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
                await asyncio.wait_for(
                    self._tick.wait(), max(0.0, INTERVAL - (time.monotonic() - started))
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

    async def _frame(self, cmd: dict, size: Size | None = None) -> bytes | None:
        """A commander's latest picture (at a size asked for), for the server, which
        never draws: one missing or old (after a quiet spell) is asked of the generator
        and waited for (FETCH_TIMEOUT at most; the generator draws at once from the
        cache, "(Waiting …)" and all). While drawing is paused, the last one drawn, or
        None when there is none (a purge)."""
        self._touch(slug(cmd["name"]), size)
        cmd = sized(cmd, size)
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
            await asyncio.wait_for(fresh.wait(), FETCH_TIMEOUT)
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
        await asyncio.wait(
            waits, timeout=KEEPALIVE, return_when=asyncio.FIRST_COMPLETED
        )
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
                    m = await asyncio.wait_for(ws.receive_json(), FETCH_TIMEOUT)
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

    def _known(self, name: str) -> dict | None:
        """The commander served as /g/<name>, when it has cameras."""
        cmd = self.cfg.named(name)
        return cmd if cmd and commander_cameras(cmd) else None

    async def _jpg(self, request: web.Request) -> web.Response:
        name = request.match_info["name"]
        if not (cmd := self._known(name)):
            raise web.HTTPNotFound()
        if self.serving_paused:
            raise web.HTTPServiceUnavailable(text="paused")
        self._warm_in_background(name)
        data = await self._frame(cmd, asked_size(request.query))
        if data is None:
            raise web.HTTPServiceUnavailable(text="no picture drawn (drawing paused?)")
        return web.Response(
            body=data, content_type=mime(data), headers={"Cache-Control": "no-store"}
        )

    async def _mjpg(self, request: web.Request) -> web.StreamResponse:
        name = request.match_info["name"]
        if not (cmd := self._known(name)):
            raise web.HTTPNotFound()
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
        size = asked_size(request.query)
        key = view_key(name, size)
        self._open[key] = self._open.get(key, 0) + 1
        sending = Sending(key, viewer(request) or "", time.monotonic())
        self._sending.append(sending)
        _LOGGER.debug(
            "compositor (%s): stream %s to %s opened", self.store, key, sending.viewer
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
            data = await self._frame(cmd, size)
            while data is None and not stop.is_set():  # none drawn yet: wait for one
                await self._next_picture(key, stop)
                if not (cmd := self._known(name)):
                    return resp
                data = await self._frame(cmd, size)
            if data is None:
                return resp
            kind = mime(data)
            part = f"--frame\r\nContent-Type: {kind}\r\n\r\n".encode()
            await resp.write(part)
            while not stop.is_set():
                if mime(data) != kind:
                    break
                if self._serving and not self._serving.is_set():
                    await self._serving.wait()  # paused: nothing sent until it runs
                await sending.write(resp, data + b"\r\n" + part)
                # The next picture as soon as one is drawn (or the same again after
                # KEEPALIVE, should drawing stop).
                await self._next_picture(key, stop)
                if stop.is_set():
                    break
                self._warm_in_background(name)
                cmd = self._known(name)  # a reload may have changed it, or removed it
                if not cmd:
                    break
                data = await self._frame(cmd, size) or data  # none: the same again
        except (ConnectionResetError, asyncio.CancelledError):
            pass
        finally:
            if stop in streams:
                streams.remove(stop)
            self._open[key] -= 1
            self._sending.remove(sending)
            f = sending.figures(time.monotonic())
            _LOGGER.debug(
                "compositor (%s): stream %s to %s ended after %.0f s: %d frames, "
                "%.0f kB a frame, %.0f kbit/s, %.0f%% of the time waiting to send",
                self.store,
                key,
                sending.viewer,
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
            name, _, size = key.partition("@")
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
        if (
            len(parts) == 3
            and parts[0] in engines
            and engines[parts[0]]
            and parts[1] in ("generator", "server")
            and parts[2] in ("pause", "run")
        ):
            engines[parts[0]].pause(parts[1], parts[2] == "pause")  # type: ignore[union-attr]
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
