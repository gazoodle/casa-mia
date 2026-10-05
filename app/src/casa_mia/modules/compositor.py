"""compositor: on-demand camera compositor: the Camera Commander's picture.

Three parts, all on one asyncio loop in the compositor's own thread:

  * the gather loop: while someone is watching (a stream open, or a picture asked for in
    the last LINGER seconds), every INTERVAL it fetches each camera's still from Home
    Assistant, all at once, each with its own timeout, into a cache that is never
    emptied. A camera that misses STRIKES rounds in a row sits out (its picture goes
    stale) and is tried again after BENCH seconds. Nobody watching: nothing is fetched.
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
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import aiohttp
from aiohttp import web
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from .. import swap

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
LATEST_SIZE = (640, 360)  # the kept still of each camera (keep_stills)
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
    # The layout, shared with the Tablet layout card (casa_mia/layout.json, defaults and
    # labels): gap; main_fit: fit (whole, black borders), fill (stretched), crop
    # (filled), or the main camera sized by main_width (% of the picture's width) with
    # the panels sharing the room around it: own (its own shape, from `aspects`, so the
    # panels move with the camera shown) or fixed (the main_ratio shape; the camera
    # fitted whole within it); panel_min: own, fixed: the % a panel with cameras keeps
    # beside the main one.
    **{k: o["default"] for k, o in LAYOUT["main"].items()},
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


def load_config(directory: Path, store: str = LIVE_STORE) -> Config:
    """The store (see `config_from_store`); an empty config until there is one."""
    if (directory / store).exists():
        return config_from_store(json.loads((directory / store).read_text()))
    return Config()


# --- drawing: pure functions of the config and the images -----------------------------

FONT = ImageFont.load_default(size=20)


@functools.lru_cache(maxsize=64)
def _stand_in(path: Path, _mtime: int, size: tuple[int, int]) -> bytes:
    """A screenshot swap picture as a camera still: scaled down to fit `size` in its own
    shape, as HA scales a still."""
    img = Image.open(path).convert("RGB")
    img.thumbnail(size)
    return encode(img, JPEG_QUALITY)


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
    Shared with the dashboard generator, so its tap zones line up."""
    w, h, gap = cmd["width"], cmd["height"], cmd["gap"]
    shape = main_shape(cmd, main)

    def size(panel: str, of: int) -> int:
        return round(of * cmd[panel]["size"] / 100) if cmd[panel]["cameras"] else 0

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
    return bool(cmd["gap"]) or cmd.get("main_fit", "fit") in ("fit", "fixed", "own")


def commander(
    cmd: dict,
    titles: dict[str, str],
    tiles: dict[str, bytes | None],
    main: str,
    main_image: bytes | None,
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
                    src = Image.open(io.BytesIO(raw)).convert("RGB")
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
                src = Image.open(io.BytesIO(main_image)).convert("RGB")
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


class Compositor:
    """Runs its own asyncio loop in a thread; start()/stop()/health() are thread-safe."""

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
    ) -> None:
        self.config_dir = config_dir
        self.store = store  # which Camera Dashboard store it serves (live or draft)
        self.prewarm = prewarm  # gather for LINGER from the start (not for previews)
        # Keep the latest still of every camera, refreshed this often (seconds), so the
        # Camera Dashboard's thumbnails and previews are ready at once.
        self.keep_stills = keep_stills
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
        self._stills: dict[
            tuple, tuple[float, asyncio.Future]
        ] = {}  # previews' fetches
        # The gathered stills, never emptied: (camera, size) -> (when, picture).
        self._shots: dict[tuple[str, tuple[int, int]], tuple[float, bytes]] = {}
        self._misses: dict[str, int] = {}  # camera -> rounds missed in a row
        self._benched: dict[str, float] = {}  # camera -> when it is tried again
        # Each commander (by its slug): its latest picture, and an event set (and
        # replaced) at each new one.
        self._pictures: dict[str, tuple[float, bytes]] = {}
        self._fresh: dict[str, asyncio.Event] = {}
        self._watching: asyncio.Event | None = None  # someone asked: gather
        self._next_round: asyncio.Event | None = None  # gather now, don't wait
        self._draw_lock: asyncio.Lock | None = None
        self._gathering = False
        self._warmed: dict[str, float] = {}
        self._bg: set[asyncio.Task] = set()
        self._streams: dict[str | None, list[asyncio.Event]] = {}
        self._open: dict[str, int] = {}  # commander -> streams open
        self._asked: dict[str, float] = {}  # commander -> its last request
        # Commander (slug) -> the sizes its picture is asked for (None: its own size).
        self._sizes: dict[str, dict[Size | None, None]] = {}
        self._warm_until = -LINGER  # prewarm: every commander gathered until then
        self._http: aiohttp.ClientSession | None = None
        # Camera -> its latest still (keep_stills) and when it was fetched.
        self._latest: dict[str, tuple[float, bytes]] = {}
        self._thumbs: dict[
            tuple[str, int], tuple[bytes, bytes]
        ] = {}  # -> (source, thumb)
        self._round_now: asyncio.Event | None = None
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
        threading.Thread(target=lambda: asyncio.run(self._serve()), daemon=True).start()
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

        def apply() -> None:
            self.cfg, self._error = cfg, None
            self._pictures.clear()
            if self._next_round:
                self._next_round.set()
            if self._round_now:
                self._round_now.set()  # fetch any camera just added

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
        """A camera's natural shape (width / height), from the stills already to hand
        (HA keeps a camera's shape when it scales a still); None until one is."""
        raw = self._last_still(entity)
        if not raw:
            return None
        try:
            w, h = Image.open(io.BytesIO(raw)).size
        except OSError:
            return None
        return round(w / h, 4) if h else None

    def _last_still(self, entity: str) -> bytes | None:
        """The newest still already to hand for a camera (the largest), without asking HA."""
        if entity in self._latest:
            return self._latest[entity][1]
        shots = [(size[0], v[1]) for (e, size), v in self._shots.items() if e == entity]
        done = [
            (size[0], hit[1].result())
            for (e, size), hit in self._stills.items()
            if e == entity and hit[1].done() and not hit[1].cancelled()
        ]
        found = [d for d in shots + done if d[1]]
        return max(found, key=lambda d: d[0])[1] if found else None

    async def _switch(self, commander: str) -> None:
        """A commander's main camera changed: at once, while it is watched, a picture
        from the stills already to hand (the new camera blurred, "Changing to ..."), then
        a round for the sharp one. Not watched: its picture is dropped (it is redrawn
        when next asked for)."""
        watched = self._watched()
        for cmd in self.cfg.commanders:
            if cmd["id"] != commander:
                continue
            name = slug(cmd["name"])
            views = {key_of(v): v for v in watched if slug(v["name"]) == name}
            for key in [k for k in self._pictures if k.split("@")[0] == name]:
                if key not in views:
                    self._pictures.pop(key, None)
            for key, view in views.items():
                try:
                    await self._draw(view, changing=True)
                except (OSError, ValueError) as exc:
                    _LOGGER.debug("%s: no quick picture: %s", cmd["name"], exc)
                    self._pictures.pop(key, None)
        if self._next_round:
            self._next_round.set()

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
        future = asyncio.run_coroutine_threadsafe(self._ready_still(entity), self._loop)
        source = future.result(FETCH_TIMEOUT * 2)
        if source is None:
            return None
        hit = self._thumbs.get((entity, width))
        if hit and hit[0] is source:
            return hit[1]
        try:
            img = ImageOps.fit(
                Image.open(io.BytesIO(source)).convert("RGB"), (width, width * 9 // 16)
            )
        except OSError:
            return None
        thumb = encode(img, JPEG_QUALITY)
        self._thumbs[(entity, width)] = (source, thumb)
        return thumb

    def stop(self) -> None:
        if self._loop and self._stop:
            self._loop.call_soon_threadsafe(self._stop.set)

    # -- controls (the Camera compositor page, the integration's buttons)

    def _clear(self, entity: str | None = None) -> None:
        """Forget every still and picture, or one camera's stills (on its loop); they
        are fetched and drawn afresh, only as they are asked for. A camera sitting out
        is tried again."""
        if entity is None:
            for cache in (self._stills, self._shots, self._pictures, self._latest):
                cache.clear()
            self._thumbs.clear()
            self._misses.clear()
            self._benched.clear()
        else:
            for key in [k for k in self._shots if k[0] == entity]:
                del self._shots[key]
            for key in [k for k in self._stills if k[0] == entity]:
                del self._stills[key]
            for d in (self._latest, self._misses, self._benched):
                d.pop(entity, None)
        for event in (self._next_round, self._round_now):
            if event:
                event.set()

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

    def forget(self, entity: str) -> None:
        """Drop one camera's stills (fetched again next round)."""
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
            "sitting_out": sorted(self._benched),
            "needs": self.needs if state == "unconfigured" else None,
            "error": self._error,
        }

    async def _serve(self) -> None:
        self._loop, self._stop = asyncio.get_running_loop(), asyncio.Event()
        runner = None
        try:
            self._http = aiohttp.ClientSession(
                headers={"Authorization": f"Bearer {self.token}"}
            )
            self._draw_lock = asyncio.Lock()
            self._watching, self._next_round = asyncio.Event(), asyncio.Event()
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
            if self.keep_stills:
                self._round_now = asyncio.Event()
                tasks.append(asyncio.create_task(self._keep_stills(self.keep_stills)))
            self._ready.set()
            await self._stop.wait()
            for task in tasks:
                task.cancel()
        except OSError as exc:
            self._error = f"cannot serve on :{self.port}: {exc}"
            _LOGGER.error(self._error)
        finally:
            self._running = False
            self._ready.set()
            if runner:
                await runner.cleanup()
            if self._http:
                await self._http.close()

    # -- fetching and caching

    def _fetch(self, entity: str, size: tuple[int, int]) -> asyncio.Future:
        """A camera still, shared: pictures built together (the live one and a preview)
        fetch it once."""
        key, now = (entity, size), time.monotonic()
        hit = self._stills.get(key)
        if hit is None or now - hit[0] > STILL_TTL:
            hit = self._stills[key] = (
                now,
                asyncio.ensure_future(self._fetch_now(entity, size)),
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

    async def _fetch_now(self, entity: str, size: tuple[int, int]) -> bytes | None:
        assert self._http
        picture = self._swapped(entity)
        if picture:
            try:
                return _stand_in(picture, picture.stat().st_mtime_ns, size)
            except OSError:
                pass  # gone or unreadable: the camera's own picture
        url = (
            f"{self.ha_url}/api/camera_proxy/{entity}?width={size[0]}&height={size[1]}"
        )
        try:
            async with self._http.get(
                url, timeout=aiohttp.ClientTimeout(total=FETCH_TIMEOUT)
            ) as r:
                return await r.read() if r.status == 200 else None
        except (aiohttp.ClientError, TimeoutError):
            return None

    def _cameras(self) -> list[str]:
        """Every camera of the config: in a commander, or chosen and not in one yet."""
        out = dict.fromkeys(cameras_of(self.cfg.commanders))
        return list(out | dict.fromkeys(self.cfg.entities))

    async def _keep_stills(self, every: float) -> None:
        """Fetch the latest still of every camera, every `every` seconds (or at once after
        a reload), a few at a time; what is kept is served while the next is fetched."""
        assert self._round_now
        _LOGGER.info(
            "compositor (%s): keeping the latest still of each camera, every %.0f s",
            self.store,
            every,
        )
        limit = asyncio.Semaphore(LATEST_AT_ONCE)

        async def one(entity: str) -> bool:
            async with limit:
                image = await self._fetch_now(entity, LATEST_SIZE)
            if image is not None:
                self._latest[entity] = (time.monotonic(), image)
            return image is not None

        while True:
            self._round_now.clear()
            cams, start = self._cameras(), time.monotonic()
            got = await asyncio.gather(*(one(e) for e in cams))
            _LOGGER.debug(
                "compositor (%s): %d of %d stills fetched in %.1f s",
                self.store,
                sum(got),
                len(cams),
                time.monotonic() - start,
            )
            try:
                await asyncio.wait_for(self._round_now.wait(), every)
            except TimeoutError:
                pass

    async def _ready_still(self, entity: str) -> bytes | None:
        """The kept still of a camera, at once; one never seen is fetched now, and kept."""
        if entity not in self._latest:
            image = await self._fetch(entity, LATEST_SIZE)
            if image is None:
                return None
            self._latest[entity] = (time.monotonic(), image)
        return self._latest[entity][1]

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

    def _wants(
        self, cfg: Config, cmd: dict, main: str
    ) -> tuple[dict[str, tuple[int, int]], tuple[str, tuple[int, int]]]:
        """What to fetch for a commander: each tile's camera at its widest tile (16:9,
        HA keeps the camera's shape), and the main camera from its medium channel
        (sharper at that size) at the main area's size."""
        _, (_, _, mw, mh), rects = commander_layout(cmd, main)
        widest: dict[str, int] = {}
        for panel in PANELS:
            for e, (_, _, w, _) in zip(
                cmd[panel]["cameras"], rects[panel], strict=True
            ):
                widest[e] = max(widest.get(e, 0), w, 16)
        channel = cfg.entities.get(main, {}).get("medium") or main
        return (
            {e: (w, w * 9 // 16) for e, w in widest.items()},
            (channel, (max(mw, 16), max(mh, 9))),
        )

    async def _round(self, cmds: list[dict]) -> None:
        """Fetch every camera of these commanders at once, each within FETCH_TIMEOUT. A
        miss keeps the picture already cached (it goes stale); STRIKES in a row and the
        camera sits out until BENCH seconds have passed."""
        # Each camera once, at the largest size any picture wants it (pictures of one
        # commander at several sizes share the fetch, and scale it to their tiles).
        largest: dict[str, tuple[int, int]] = {}
        for cmd in cmds:
            tiles, main = self._wants(self.cfg, cmd, self.main_camera(cmd) or "")
            for e, size in [*tiles.items(), main]:
                if size[0] > largest.get(e, (0, 0))[0]:
                    largest[e] = size
        wanted = dict.fromkeys(largest.items())
        now = started = time.monotonic()
        jobs = []
        for e, size in wanted:
            if e in self._benched:
                if now < self._benched[e]:
                    continue
                del self._benched[e]
                _LOGGER.info("compositor (%s): trying %s again", self.store, e)
            jobs.append((e, size))
        got = await asyncio.gather(*(self._fetch_now(e, size) for e, size in jobs))
        now = time.monotonic()
        for (e, size), image in zip(jobs, got, strict=True):
            if image:
                self._shots[(e, size)] = (now, image)
        hit = {e for (e, _), image in zip(jobs, got, strict=True) if image}
        if jobs and not hit:
            # Not one camera answered: Home Assistant (or the way to it) is down, a
            # restart say; that is no camera's fault, so none is counted a miss (or all
            # would sit out together, and the picture stay empty for BENCH seconds).
            _LOGGER.warning(
                "compositor (%s): no camera answered (%d asked); Home Assistant "
                "unreachable? Trying again next round",
                self.store,
                len(jobs),
            )
            return
        for e in dict.fromkeys(e for e, _ in jobs):  # a camera fetched at two sizes
            if e in hit:
                self._misses.pop(e, None)
                continue
            self._misses[e] = self._misses.get(e, 0) + 1
            if self._misses[e] >= STRIKES:
                del self._misses[e]
                self._benched[e] = now + BENCH
                _LOGGER.warning(
                    "compositor (%s): %s missed %d rounds in a row; it sits out "
                    "(its picture goes stale) and is tried again in %.0f min",
                    self.store,
                    e,
                    STRIKES,
                    BENCH / 60,
                )
        _LOGGER.debug(
            "compositor (%s): %d of %d stills in %.1f s",
            self.store,
            sum(1 for g in got if g),
            len(jobs),
            time.monotonic() - started,
        )

    def _pick(
        self, entity: str, size: tuple[int, int] | None
    ) -> tuple[bytes | None, float]:
        """A camera's cached still at that size, else its largest at any size: the
        picture and its age in seconds (inf when its age is unknown)."""
        hit = self._shots.get((entity, size)) if size else None
        if hit is None:
            others = [v for (e, _), v in self._shots.items() if e == entity]
            hit = max(others, key=lambda v: v[0]) if others else None
        if hit is not None:
            return hit[1], time.monotonic() - hit[0]
        if kept := self._latest.get(entity):  # a kept still: its real age
            return kept[1], time.monotonic() - kept[0]
        return None, math.inf

    async def _draw(self, cmd: dict, changing: bool = False) -> bytes:
        """Draw a commander from the cache (in a worker thread), keep it as its latest
        picture and tell its open streams."""
        assert self._draw_lock
        cfg = self.cfg
        main = self.main_camera(cmd) or ""
        tiles, (channel, size) = self._wants(cfg, cmd, main)
        limit = float(cmd.get("stale", EMPTY_COMMANDER["stale"]))
        images, stale = {}, set()
        for e, tile_size in tiles.items():
            images[e], age = self._pick(e, tile_size)
            if age > limit:
                stale.add(e)
        main_image, age = self._pick(channel, size)
        if main_image is None:  # the main channel not fetched yet: its tile's still
            main_image, age = self._pick(main, tiles.get(main))
        async with self._draw_lock:
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
        self._pictures[name] = (time.monotonic(), picture)
        fresh, self._fresh[name] = self._fresh_of(name), asyncio.Event()
        fresh.set()
        return picture

    async def _gather(self) -> None:
        """While someone is watching: a round, a picture of each commander watched, every
        INTERVAL (or at once when the main camera changes). Nobody watching: it waits,
        fetching nothing."""
        assert self._watching and self._next_round
        while True:
            watched = self._watched()
            if not watched:
                if self._gathering:
                    self._gathering = False
                    _LOGGER.info(
                        "compositor (%s): nobody watching; fetching stopped", self.store
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
                    "compositor (%s): someone is watching; fetching every %.0f s",
                    self.store,
                    INTERVAL,
                )
            start = time.monotonic()
            self._next_round.clear()
            await self._round(watched)
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
                    self._next_round.wait(),
                    max(0.0, INTERVAL - (time.monotonic() - start)),
                )
            except TimeoutError:
                pass

    async def _preview(self, cfg: Config, cmd: dict) -> bytes:
        """A commander for a preview: from the kept stills, drawn in a worker thread."""
        main = self.main_camera(cmd, chosen=False) or ""
        cams = commander_cameras(cmd)
        images = await asyncio.gather(*(self._ready_still(e) for e in [main, *cams]))
        return await asyncio.to_thread(
            commander,
            cmd,
            cfg.titles,
            dict(zip(cams, images[1:], strict=True)),
            main,
            images[0],
        )

    async def _frame(self, cmd: dict, size: Size | None = None) -> bytes:
        """A commander's latest picture (at a size asked for), at once. After a quiet
        spell (none, or older than the stale limit) it is drawn now from the cache, Stale
        marks and all, while the gather loop starts up; with nothing cached at all, the
        first round is awaited."""
        self._touch(slug(cmd["name"]), size)
        cmd = sized(cmd, size)
        name = key_of(cmd)
        limit = float(cmd.get("stale", EMPTY_COMMANDER["stale"]))
        picture = self._pictures.get(name)
        if picture and time.monotonic() - picture[0] < min(limit, LINGER):
            return picture[1]
        if not self._shots and not self._latest:
            try:
                await asyncio.wait_for(
                    self._fresh_of(name).wait(), FETCH_TIMEOUT + INTERVAL
                )
            except TimeoutError:
                pass
            if picture := self._pictures.get(name):
                return picture[1]
        return await self._draw(cmd)

    # -- keeping HA's live streams warm

    async def _warm_streams(self, name: str) -> None:
        """Start HA's HLS streams for a commander's cameras, so a tap into a live page
        finds them already running. A cold HLS stream takes 7-9 s to become playable; a
        running one ~10 ms. Rate-limited; cameras without channels are skipped."""
        assert self._http
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
            async with self._http.ws_connect(self.ws_url, max_msg_size=0) as ws:
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
        assert self._http
        try:
            t = aiohttp.ClientTimeout(total=30)
            async with self._http.get(master_url, timeout=t) as r:
                text = await r.text()
            variant = next(
                ln for ln in text.splitlines() if ln and not ln.startswith("#")
            )
            async with self._http.get(
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
        self._warm_in_background(name)
        data = await self._frame(cmd, asked_size(request.query))
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
        stop, streams = asyncio.Event(), self._streams.setdefault(request.remote, [])
        streams.append(stop)
        while len(streams) > MAX_STREAMS:
            streams.pop(0).set()
        # Drawn at the size its address asks for (a card's exact size), else its own.
        size = asked_size(request.query)
        key = view_key(name, size)
        self._open[key] = self._open.get(key, 0) + 1
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
            kind = mime(data)
            part = f"--frame\r\nContent-Type: {kind}\r\n\r\n".encode()
            await resp.write(part)
            while not stop.is_set():
                if mime(data) != kind:
                    break
                await resp.write(data + b"\r\n" + part)
                # The next picture as soon as one is drawn (or the same again after
                # KEEPALIVE, should drawing stop).
                waits = [
                    asyncio.ensure_future(stop.wait()),
                    asyncio.ensure_future(self._fresh_of(key).wait()),
                ]
                await asyncio.wait(
                    waits, timeout=KEEPALIVE, return_when=asyncio.FIRST_COMPLETED
                )
                for w in waits:
                    w.cancel()
                if stop.is_set():
                    break
                self._warm_in_background(name)
                cmd = self._known(name)  # a reload may have changed it, or removed it
                if not cmd:
                    break
                data = await self._frame(cmd, size)
        except (ConnectionResetError, asyncio.CancelledError):
            pass
        finally:
            if stop in streams:
                streams.remove(stop)
            self._open[key] -= 1
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

    def _title(self, entity: str) -> str:
        """A camera's title, for any of its channels too."""
        for e, chans in self.cfg.entities.items():
            if entity == e or entity in chans.values():
                return self.cfg.titles.get(e, e)
        return self.cfg.titles.get(entity, entity)

    def _status_now(self) -> dict[str, Any]:
        """Its health, and: each picture drawn (a commander at a size: its own, or one
        a card asked for), its age and the streams open on it; the streams open per
        device; each camera still kept (its size, age, rounds missed in a row, and
        when one sitting out is tried again)."""
        now = time.monotonic()

        def picture(key: str, at: float) -> dict[str, Any]:
            name, _, size = key.partition("@")
            cmd = self.cfg.named(name) or {}
            w, h, scale = (
                size.split("x") if size else (cmd.get("width"), cmd.get("height"), 1)
            )
            return {
                "commander": cmd.get("name", name),
                "width": int(w or 0),
                "height": int(h or 0),
                "scale": float(scale),
                "asked": bool(size),  # a card's own size, not the commander's
                "age_s": round(now - at, 1),
                "streams": self._open.get(key, 0),
            }

        return {
            **self.health(),
            "stale_s": min(
                (float(c.get("stale", 30)) for c in self.cfg.commanders), default=30
            ),
            "pictures": [picture(k, t) for k, (t, _) in sorted(self._pictures.items())],
            "devices": {ip: len(v) for ip, v in self._streams.items() if v},
            "stills": [
                {
                    "camera": e,
                    "title": self._title(e),
                    "width": w,
                    "height": h,
                    "age_s": round(now - t, 1),
                    "missed": self._misses.get(e, 0),
                    "back_in_s": round(self._benched[e] - now)
                    if e in self._benched
                    else None,
                }
                for (e, (w, h)), (t, _) in sorted(self._shots.items())
            ],
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
    and <live|draft>/forget {"camera": <entity>} answer with it afresh."""
    engines = {"live": live, "draft": draft}

    def one(engine: Compositor) -> dict[str, Any]:
        at = host()
        test = f"http://{at}:{engine.port}/size-test" if at else None
        return {**engine.status(), "size_test": test}

    def status() -> tuple[int, str, bytes]:
        data = {"live": one(live), "draft": one(draft) if draft else None}
        return 200, "application/json", json.dumps(data).encode()

    def fail(code: int, error: str) -> tuple[int, str, bytes]:
        return code, "application/json", json.dumps({"error": error}).encode()

    def handle(
        method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> tuple[int, str, bytes]:
        parts = [p for p in path.split("/") if p]
        if method == "GET" and not parts:
            return status()
        if method != "POST":
            return fail(404, "not found")
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
