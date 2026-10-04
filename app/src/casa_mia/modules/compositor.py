"""compositor: on-demand camera compositor: the Camera Commander's picture.

Fetches low-res stills from Home Assistant, draws the commander (a main camera framed by
panels of cameras) and serves it over HTTP. Nothing is fetched while nobody is asking, and
any number of viewers share one fetch per INTERVAL. Ported from
tablet-provision/composite-test/server.py.

  GET /g/commander.jpg    latest picture (poll it, or view it once)
  GET /g/commander.mjpg   self-updating multipart stream, one frame per interval
  GET /                   links; GET /status  cache ages and open streams

Config is the Camera Dashboard's store in the app's config folder:
camera-dashboard-live.json (what was last deployed); the draft compositor reads the draft,
camera-dashboard.json.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import threading
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import aiohttp
from aiohttp import web
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

_LOGGER = logging.getLogger(__name__)

PORT = 8099
INTERVAL = 2.0  # seconds a picture is reused before it is rebuilt
MAX_STALE = 30.0  # older than this, the caller waits for a fresh one
WARM_EVERY = 10.0  # while someone looked in the last WARM_WINDOW, rebuild this often
WARM_WINDOW = 300.0
MAX_STREAMS = 3  # per client address: older ones are images the browser abandoned
WARM_STREAM_EVERY = (
    90.0  # re-start the viewed cameras' live streams (HA drops idle ones)
)
WARM_STREAM_TIER = "medium"  # the channel the wall tablets play
STILL_TTL = 1.5  # a fetched still is shared by every composite built within this time
FETCH_TIMEOUT = 5
JPEG_QUALITY = 70
LATEST_SIZE = (640, 360)  # the kept still of each camera (keep_stills)
LATEST_AT_ONCE = 4  # cameras fetched together in a round

Build = Callable[[], Awaitable[bytes]]


@dataclass
class Config:
    entities: dict[str, dict[str, str]] = field(default_factory=dict)
    commander: dict = field(default_factory=dict)
    titles: dict[str, str] = field(default_factory=dict)  # camera -> its title


# The Camera Dashboard's stores (see camera_dashboard.py): what is deployed, and the draft.
LIVE_STORE = "camera-dashboard-live.json"
DRAFT_STORE = "camera-dashboard.json"
# The commander: one landscape picture, a main camera framed by four panels of cameras.
# Left and right sizes are % of the width, top and bottom % of the height.
PANELS = ("left", "top", "right", "bottom")
EMPTY_COMMANDER = {
    "width": 1920,
    "height": 1080,
    "gap": 4,
    "main": "",  # the main camera at start; blank: the first of the panels
    # fit (whole, black borders), fill (stretched), crop (filled), or the main camera
    # sized by main_width (% of the picture's width) with the panels sharing the room
    # around it: own (its own shape, from `aspects`, so the panels move with the camera
    # shown) or fixed (the main_ratio shape; the camera fitted whole within it)
    "main_fit": "fit",
    "main_width": 70,
    "main_ratio": "16:9",
    "panel_min": 8,  # own, fixed: the % a panel with cameras keeps beside the main one
    # Track motion (done by the integration), seconds: how long a switch holds before
    # another, how long after the last motion it goes back to the camera chosen by hand
    # (0: it stays), and how long a choice by hand pauses tracking.
    "motion": {"hold": 10, "back": 30, "pause": 120},
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
    "left": {"cameras": [], "size": 15, "fit": "cover"},
    # Top and bottom: an anchored end runs to the view's edge, and the side panel stops
    # at it; an end not anchored stops at the side panel, which runs to the view's edge.
    "top": {
        "cameras": [],
        "size": 18,
        "fit": "cover",
        "anchor_left": False,
        "anchor_right": False,
    },
    "right": {"cameras": [], "size": 15, "fit": "cover"},
    "bottom": {
        "cameras": [],
        "size": 20,
        "fit": "cover",
        "anchor_left": True,
        "anchor_right": True,
    },
}


def config_from_store(store: dict) -> Config:
    """The compositor's view of a Camera Dashboard store: the commander names its cameras
    by entity, and each camera's title and channels live once, under "cameras"."""
    cams = store.get("cameras", {})
    cfg = Config()
    cfg.entities = {
        e: {k: c[k] for k in ("medium", "high", "zoom") if c.get(k)}
        for e, c in cams.items()
    }
    cfg.commander = {**EMPTY_COMMANDER, **(store.get("commander") or {})}
    cfg.titles = {e: c.get("title", e) for e, c in cams.items()}
    return cfg


def load_config(directory: Path, store: str = LIVE_STORE) -> Config:
    """The store (see `config_from_store`); an empty config until there is one."""
    if (directory / store).exists():
        return config_from_store(json.loads((directory / store).read_text()))
    return Config()


# --- drawing: pure functions of the config and the images -----------------------------

FONT = ImageFont.load_default(size=20)


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


def commander_cameras(cmd: dict) -> list[str]:
    """The commander's cameras, each once, panel by panel (left, top, right, bottom)."""
    return list(
        dict.fromkeys(e for p in PANELS for e in cmd.get(p, {}).get("cameras", []))
    )


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
    tiles = {
        p: _line(areas[p], len(cmd[p]["cameras"]), p in ("left", "right"), gap)
        if cmd[p]["cameras"]
        else []
        for p in PANELS
    }
    main_area = (x0, y0, x1 - x0, y1 - y0)
    if shape is not None:  # exactly its size, centred where the panels left room
        mw, mh = min(mw, x1 - x0), min(mh, y1 - y0)
        main_area = (x0 + (x1 - x0 - mw) // 2, y0 + (y1 - y0 - mh) // 2, mw, mh)
    return (w, h), main_area, tiles


SMALL_FONT = ImageFont.load_default(size=16)
BIG_FONT = ImageFont.load_default(size=40)
SMALL_BAR = 22
MOTION_DOT = (235, 50, 40)  # the accent green: the tile shown as the main camera


def commander(
    cmd: dict,
    titles: dict[str, str],
    tiles: dict[str, bytes | None],
    main: str,
    main_image: bytes | None,
    changing: bool = False,
    motion: frozenset[str] = frozenset(),
) -> bytes:
    """Draw the commander: each panel's cameras (the main one framed), and the main camera
    in its natural shape, as large as fits its area, centred. `changing`: the picture
    shown the moment the main camera is switched, from stills already to hand: blurred,
    with "Changing to <camera>" over it, until the sharp one is ready."""
    size, main_rect, rects = commander_layout(cmd, main)
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
                    font=SMALL_FONT,
                    anchor="mm",
                )
            draw.rectangle((x, y + h - SMALL_BAR, x + w, y + h), fill=(0, 0, 0, 140))
            draw.text(
                (x + 6, y + h - SMALL_BAR // 2),
                str(titles.get(entity) or entity),
                fill="white",
                font=SMALL_FONT,
                anchor="lm",
            )
            if entity in motion:  # a red dot: this camera sees motion now
                r = max(5, min(w, h) // 18)
                cx, cy = x + w - r - 6, y + r + 6
                draw.ellipse(
                    (cx - r, cy - r, cx + r, cy + r), fill=MOTION_DOT, outline="white"
                )
    x, y, w, h = main_rect
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
            except OSError:
                main_image = None
        if not main_image:
            draw.text(
                (x + w // 2, y + h // 2),
                "no signal",
                fill="white",
                font=FONT,
                anchor="mm",
            )
        label = titles.get(main, main)
        if changing:
            area = (px, py, px + pw, py + ph)
            canvas.paste(
                canvas.crop(area).filter(ImageFilter.GaussianBlur(14)), area[:2]
            )
            text = f"Changing to {label}…"
            box = draw.textbbox(
                (px + pw // 2, py + ph // 2), text, font=BIG_FONT, anchor="mm"
            )
            draw.rounded_rectangle(
                (box[0] - 18, box[1] - 12, box[2] + 18, box[3] + 12),
                radius=12,
                fill=(0, 0, 0, 170),
            )
            draw.text(
                (px + pw // 2, py + ph // 2),
                text,
                fill="white",
                font=BIG_FONT,
                anchor="mm",
            )
        foot = py + ph - 18
        pill = draw.textbbox((px + 10, foot), label, font=FONT, anchor="lm")
        draw.rectangle(
            (pill[0] - 6, pill[1] - 4, pill[2] + 6, pill[3] + 4), fill=(0, 0, 0, 160)
        )
        draw.text((px + 10, foot), label, fill="white", font=FONT, anchor="lm")
        draw.text(
            (px + pw - 10, foot),
            datetime.now().strftime("%H:%M:%S"),
            fill="white",
            font=FONT,
            anchor="rm",
        )
    if cmd["gap"]:  # every tile and the main area solid; only the gaps are clear
        mask = Image.new("L", size, 0)
        solid = ImageDraw.Draw(mask)
        for x, y, w, h in [main_rect, *(r for p in PANELS for r in rects[p])]:
            if w > 0 and h > 0:
                solid.rectangle((x, y, x + w - 1, y + h - 1), fill=255)
        canvas.putalpha(mask)
    return encode(canvas, JPEG_QUALITY)


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
        self.prewarm = prewarm  # build every composite at start (not for previews)
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
        self._cache: dict[str, tuple[float, bytes]] = {}
        self._inflight: dict[str, asyncio.Task] = {}
        self._stills: dict[tuple, tuple[float, asyncio.Future]] = {}
        self._warmed: dict[str, float] = {}
        self._bg: set[asyncio.Task] = set()
        self._streams: dict[str | None, list[asyncio.Event]] = {}
        self._last_request = time.monotonic()
        self._seen: set[str] = set()
        self._http: aiohttp.ClientSession | None = None
        self._latest: dict[str, bytes] = {}  # camera -> its latest still (keep_stills)
        self._thumbs: dict[
            tuple[str, int], tuple[bytes, bytes]
        ] = {}  # -> (source, thumb)
        self._round_now: asyncio.Event | None = None
        self.main: str | None = None  # the commander's main camera, as last chosen
        self.motion: frozenset[str] = frozenset()  # cameras seeing motion (red dots)
        self._wake: dict[str, asyncio.Event] = {}  # a stream's picture changed: send it

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        try:
            self.cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return
        if not self._known("commander"):
            _LOGGER.warning(
                "compositor (%s): no cameras yet; it needs %s", self.store, self.needs
            )
        threading.Thread(target=lambda: asyncio.run(self._serve()), daemon=True).start()
        self._ready.wait(10)

    def reload(self) -> None:
        """Re-read the config (after the Camera Dashboard saved it); composites already
        built are dropped, so the next request draws the new layout."""
        try:
            cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return

        def apply() -> None:
            self.cfg, self._error = cfg, None
            self._cache.clear()
            self._seen = {n for n in self._seen if self._known(n)}
            if self._round_now:
                self._round_now.set()  # fetch any camera just added

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)
        else:
            self.cfg = cfg
        _LOGGER.info(
            "compositor (%s) reloaded: %d commander cameras",
            self.store,
            len(commander_cameras(cfg.commander)),
        )

    def main_camera(self, cfg: Config | None = None) -> str | None:
        """The commander's main camera: the one last chosen if it is still in a panel,
        else the configured one, else the first of the panels."""
        cfg = cfg or self.cfg
        cams = commander_cameras(cfg.commander) if cfg.commander else []
        for choice in (
            self.main if cfg is self.cfg else None,
            cfg.commander.get("main"),
        ):
            if choice in cams:
                return choice
        return cams[0] if cams else None

    def set_motion(self, cameras: frozenset[str]) -> None:
        """The cameras seeing motion now: their tiles get a red dot from the next
        picture on. Thread-safe."""
        self.motion = cameras

    def set_main(self, entity: str) -> None:
        """Show this camera as the commander's main one: the picture is redrawn and sent to
        open streams at once. Thread-safe."""
        self.main = entity

        def apply() -> None:
            self._inflight.pop("commander", None)  # a drawing of the old one: not used
            task = asyncio.ensure_future(self._switch(entity))
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

    def _wake_streams(self, name: str) -> None:
        """Send `name`'s picture to its open streams now, not at their next interval."""
        if wake := self._wake.pop(name, None):
            wake.set()

    def _last_still(self, entity: str) -> bytes | None:
        """The newest still already to hand for a camera (any size), without asking HA."""
        if entity in self._latest:
            return self._latest[entity]
        done = [
            (size[0], hit[1].result())
            for (e, size), hit in self._stills.items()
            if e == entity and hit[1].done() and not hit[1].cancelled()
        ]
        done = [d for d in done if d[1]]
        return max(done, key=lambda d: d[0])[1] if done else None

    async def _switch(self, entity: str) -> None:
        """The main camera changed: at once, a picture from the stills already to hand
        (the new camera blurred, "Changing to ..."), then the sharp one when it's drawn."""
        cfg = self.cfg
        if not cfg.commander:
            return
        cams = commander_cameras(cfg.commander)
        try:
            quick = await asyncio.to_thread(
                commander,
                cfg.commander,
                cfg.titles,
                {e: self._last_still(e) for e in cams},
                entity,
                self._last_still(entity),
                True,
                self.motion,
            )
            self._cache["commander"] = (time.monotonic(), quick)
            self._wake_streams("commander")
        except (OSError, ValueError) as exc:
            _LOGGER.debug("commander: no quick picture: %s", exc)
            self._cache.pop("commander", None)
        await self._refresh("commander", self._build_commander)
        self._wake_streams("commander")

    def render(self, cfg: Config) -> bytes:
        """Draw the commander from a config that is not the one being served: the Camera
        Dashboard's unsaved edits, for its live preview. Stills are shared with the
        picture being served. Thread-safe; ValueError when it has no cameras."""
        if not (self._loop and self._running):
            raise RuntimeError("the compositor is not running")
        if not commander_cameras(cfg.commander):
            raise ValueError("the commander has no cameras")
        future = asyncio.run_coroutine_threadsafe(
            self._build_commander(cfg, ready=True), self._loop
        )
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

    def health(self) -> dict[str, Any]:
        if self._running:
            state = "running" if self._known("commander") else "unconfigured"
        else:
            state = "offline"
        return {
            "state": state,
            "port": self.port,
            "cameras": len(commander_cameras(self.cfg.commander)),
            "streams": sum(len(v) for v in self._streams.values()),
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
            # the first WARM_WINDOW is pre-warmed
            self._last_request = time.monotonic() if self.prewarm else -WARM_WINDOW
            self._seen = (
                {"commander"} if self.prewarm and self._known("commander") else set()
            )
            app = web.Application()
            app.add_routes(
                [
                    web.get("/", self._index),
                    web.get("/status", self._status),
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
            tasks = [asyncio.create_task(self._keep_warm())]
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

    async def _fetch_now(self, entity: str, size: tuple[int, int]) -> bytes | None:
        assert self._http
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
        """Every camera of the config: in the commander, or chosen and not in it yet."""
        out = dict.fromkeys(commander_cameras(self.cfg.commander))
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
                self._latest[entity] = image
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
            self._latest[entity] = image
        return self._latest[entity]

    def _refresh(self, key: str, build: Build) -> asyncio.Task:
        """Start (or join) the one rebuild in flight for `key`; the result lands in the cache."""
        task = self._inflight.get(key)
        if task is None or task.done():

            async def run() -> None:
                frame = await build()
                # Dropped while drawing (the commander's main camera switched): not kept.
                if self._inflight.get(key) is task:
                    self._cache[key] = (time.monotonic(), frame)

            task = self._inflight[key] = asyncio.create_task(run())
            task.add_done_callback(
                lambda t: t.cancelled() or t.exception()
            )  # mark seen
        return task

    async def _cached(
        self, key: str, interval: float, build: Build, fresh: bool = False
    ) -> bytes:
        """Serve what we already have, at once. Once older than `interval` it is rebuilt
        in the background; the caller only waits when nothing usable exists (never built,
        or older than MAX_STALE) or fresh=True."""
        entry = self._cache.get(key)
        age = time.monotonic() - entry[0] if entry else None
        if entry and age is not None and age < interval:
            return entry[1]
        task = self._refresh(key, build)
        if entry and age is not None and age < MAX_STALE and not fresh:
            return entry[1]
        await task
        return self._cache[key][1]

    async def _build_commander(
        self, cfg: Config | None = None, ready: bool = False
    ) -> bytes:
        """The commander: tiles from each camera's composite still, the main camera from
        its medium channel (sharper at that size) in its natural shape. `ready`: from the
        kept stills, for previews."""
        cfg = cfg or self.cfg
        cmd, main = cfg.commander, self.main_camera(cfg) or ""
        _, (_, _, mw, mh), rects = commander_layout(cmd, main)
        wanted: dict[str, int] = {}  # camera -> the widest tile it has
        for panel in PANELS:
            for e, (_, _, w, _) in zip(
                cmd[panel]["cameras"], rects[panel], strict=True
            ):
                wanted[e] = max(wanted.get(e, 0), w, 16)

        async def tile_still(e: str, w: int) -> bytes | None:
            return await (
                self._ready_still(e) if ready else self._fetch(e, (w, w * 9 // 16))
            )

        async def main_still() -> bytes | None:
            if ready:
                return await self._ready_still(main)
            channel = cfg.entities.get(main, {}).get("medium") or main
            # HA keeps the camera's own shape
            return await self._fetch(channel, (max(mw, 16), max(mh, 9)))

        names = list(wanted)
        images = await asyncio.gather(
            main_still(), *(tile_still(e, wanted[e]) for e in names)
        )
        return commander(
            cmd,
            cfg.titles,
            dict(zip(names, images[1:], strict=True)),
            main,
            images[0],
            motion=self.motion if cfg is self.cfg else frozenset(),
        )

    async def _frame(self, name: str, fresh: bool = False) -> bytes:
        self._last_request = time.monotonic()
        self._seen.add(name)  # what has been asked for is what gets kept warm
        return await self._cached(name, INTERVAL, self._build_commander, fresh)

    # -- keeping HA's live streams warm

    async def _warm_streams(self, name: str) -> None:
        """Start HA's HLS streams for the commander's cameras, so a tap into a live page
        finds them already running. A cold HLS stream takes 7-9 s to become playable; a
        running one ~10 ms. Rate-limited; cameras without channels are skipped."""
        assert self._http
        now = time.monotonic()
        if now - self._warmed.get(name, -1e9) < WARM_STREAM_EVERY:
            return
        self._warmed[name] = now
        ents = [
            "camera." + self.cfg.entities[e][WARM_STREAM_TIER].replace("camera.", "")
            for e in commander_cameras(self.cfg.commander)
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

    async def _keep_warm(self) -> None:
        """While someone has looked recently, keep what has been asked for fresh so every
        page snaps into view."""
        while True:
            if time.monotonic() - self._last_request < WARM_WINDOW:
                for name in list(self._seen):
                    self._refresh(name, self._build_commander)
            await asyncio.sleep(WARM_EVERY)

    # -- HTTP handlers

    def _known(self, name: str) -> bool:
        return name == "commander" and bool(commander_cameras(self.cfg.commander))

    async def _jpg(self, request: web.Request) -> web.Response:
        name = request.match_info["name"]
        if not self._known(name):
            raise web.HTTPNotFound()
        self._warm_in_background(name)
        data = await self._frame(name)
        return web.Response(
            body=data, content_type=mime(data), headers={"Cache-Control": "no-store"}
        )

    async def _mjpg(self, request: web.Request) -> web.StreamResponse:
        name = request.match_info["name"]
        if not self._known(name):
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
        await resp.prepare(request)
        try:
            # Chrome draws a multipart frame only when it sees the *next* part begin, so a
            # lone frame would sit unseen for a whole interval. So every write ends by
            # opening the following part (boundary + header, no body yet): the frame just
            # sent is drawn at once, and the next one fills the part already open.
            # The parts' type (JPEG, or WebP with transparent gaps) is set by the first
            # picture; a deploy that changes it ends the stream (the dashboard reloads).
            self._warm_in_background(name)
            data = await self._frame(name)
            kind = mime(data)
            part = f"--frame\r\nContent-Type: {kind}\r\n\r\n".encode()
            await resp.write(part)
            while not stop.is_set():
                if mime(data) != kind:
                    break
                await resp.write(data + b"\r\n" + part)
                # The next frame after the interval, or at once when the picture changes
                # (the commander's main camera was switched).
                wait = INTERVAL
                wake = self._wake.setdefault(name, asyncio.Event())
                waits = [
                    asyncio.ensure_future(stop.wait()),
                    asyncio.ensure_future(wake.wait()),
                ]
                done, _ = await asyncio.wait(
                    waits, timeout=wait, return_when=asyncio.FIRST_COMPLETED
                )
                for w in waits:
                    w.cancel()
                if stop.is_set():
                    break
                self._warm_in_background(name)
                # Woken (a new picture is ready): send it as it is, without a rebuild.
                woken = waits[1] in done
                data = await self._frame(name, fresh=not woken)
        except (ConnectionResetError, asyncio.CancelledError):
            pass
        finally:
            if stop in streams:
                streams.remove(stop)
        return resp

    async def _status(self, request: web.Request) -> web.Response:
        now = time.monotonic()
        return web.json_response(
            {
                "streams": {ip: len(v) for ip, v in self._streams.items() if v},
                "cache_age_s": {
                    k: round(now - t, 1) for k, (t, _) in sorted(self._cache.items())
                },
            }
        )

    async def _index(self, request: web.Request) -> web.Response:
        links = (
            '<li>commander: <a href="/g/commander.jpg">jpg</a> '
            '<a href="/g/commander.mjpg">mjpg</a></li>'
            if self._known("commander")
            else ""
        )
        return web.Response(text=f"<ul>{links}</ul>", content_type="text/html")
