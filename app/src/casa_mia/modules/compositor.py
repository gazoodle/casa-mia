"""compositor: on-demand camera-group compositor.

Fetches low-res stills from Home Assistant, tiles each group into one JPEG and serves
it over HTTP. Nothing is fetched while nobody is asking, and any number of viewers
share one fetch per INTERVAL. Ported from tablet-provision/composite-test/server.py.

  GET /g/<group>.jpg    latest composite (poll it, or view it once)
  GET /g/<group>.mjpg   self-updating multipart stream, one frame per interval
  GET /g/overview.*     the same, for the composite of composites (slower refresh)
                        (add ?layout=portrait for the phone layout)
  GET /                 list of groups; GET /status  cache ages and open streams

Config lives in the app's config folder: the Camera Dashboard's store when there is one
(camera-dashboard-live.json, what was last deployed; the draft compositor reads the draft,
camera-dashboard.json), else the older groups.json (see `load_config`) and entities.json
(low entity -> {medium, high, zoom}).
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import math
import threading
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import aiohttp
from aiohttp import web
from PIL import Image, ImageDraw, ImageFont, ImageOps

_LOGGER = logging.getLogger(__name__)

PORT = 8099
INTERVAL = 2.0  # seconds a group composite is reused before it is rebuilt
OVERVIEW_INTERVAL = 5.0
MAX_STALE = 30.0  # older than this, the caller waits for a fresh one
WARM_EVERY = 10.0  # while someone looked in the last WARM_WINDOW, rebuild this often
WARM_WINDOW = 300.0
MAX_STREAMS = 3  # per client address: older ones are images the browser abandoned
WARM_STREAM_EVERY = 90.0  # re-start a viewed group's live streams (HA drops idle ones)
WARM_STREAM_TIER = "medium"  # the channel the wall tablets play
STILL_TTL = 1.5  # a fetched still is shared by every composite built within this time
DEFAULT_TILE = (640, 340)  # a shade shorter than 16:9 so a group page fits a tablet
FETCH_TIMEOUT = 5
JPEG_QUALITY = 70
JPEG_QUALITY_OVERVIEW = 65
BAR = 30  # height of the name bar at the foot of each tile
LATEST_SIZE = (640, 360)  # the kept still of each camera (keep_stills), a tile's size
LATEST_AT_ONCE = 4  # cameras fetched together in a round

Group = dict[str, Any]
Build = Callable[[], Awaitable[bytes]]


@dataclass
class Config:
    groups: dict[str, Group] = field(default_factory=dict)
    overview: dict = field(default_factory=dict)
    overview_portrait: dict = field(default_factory=dict)
    entities: dict[str, dict[str, str]] = field(default_factory=dict)
    commander: dict = field(default_factory=dict)
    titles: dict[str, str] = field(default_factory=dict)  # camera -> its title

    def overview_for(self, portrait: bool) -> dict:
        return self.overview_portrait if portrait else self.overview


# The Camera Dashboard's stores (see camera_dashboard.py): what is deployed, and the draft.
LIVE_STORE = "camera-dashboard-live.json"
DRAFT_STORE = "camera-dashboard.json"
EMPTY_OVERVIEW = {
    "width": 1280,
    "gap": 8,
    "cell_aspect": 1.7,
    "strip_aspect": 1.5,
    "rows": [],
}
# The commander: one landscape picture, a main camera framed by four panels of cameras.
# Left and right sizes are % of the width, top and bottom % of the height.
PANELS = ("left", "top", "right", "bottom")
EMPTY_COMMANDER = {
    "width": 1920,
    "height": 1080,
    "gap": 4,
    "main": "",  # the main camera at start; blank: the first of the panels
    "left": {"cameras": [], "size": 15, "fit": "cover"},
    "top": {"cameras": [], "size": 18, "fit": "cover"},
    "right": {"cameras": [], "size": 15, "fit": "cover"},
    "bottom": {"cameras": [], "size": 20, "fit": "cover"},
}


def config_from_store(store: dict) -> Config:
    """The compositor's view of a Camera Dashboard store: groups name their cameras by
    entity, and each camera's title and channels live once, under "cameras"."""
    cams = store.get("cameras", {})
    cfg = Config(
        overview=store.get("overview") or EMPTY_OVERVIEW,
        overview_portrait=store.get("overview_portrait") or EMPTY_OVERVIEW,
    )
    for name, g in store.get("groups", {}).items():
        cfg.groups[name] = {
            "cameras": [
                {"entity": e, "title": cams.get(e, {}).get("title", e)}
                for e in g["cameras"]
            ],
            "tile": tuple(g.get("tile", DEFAULT_TILE)),
            "fit": g.get("fit", "cover"),
            "menu": g.get("menu", True),
        }
    cfg.entities = {
        e: {k: c[k] for k in ("medium", "high", "zoom") if c.get(k)}
        for e, c in cams.items()
    }
    cfg.commander = {**EMPTY_COMMANDER, **(store.get("commander") or {})}
    cfg.titles = {e: c.get("title", e) for e, c in cams.items()}
    return cfg


def load_config(directory: Path, store: str = LIVE_STORE) -> Config:
    """The store when there is one (see `config_from_store`), else groups.json: group -> camera list, or {"cameras": [...], "tile": [w, h],
    "fit": "contain" | "cover"}. The reserved "_overview" (landscape) and
    "_overview_portrait" (phones) keys are {"width": w, "gap": n, "cell_aspect": r,
    "strip_aspect": r, "rows": [...]}, each row {"groups": [...]} (each group's
    composite as one cell) or {"strip": [...]} (those groups' cameras in one line).
    Groups named "Wall..." are viewed directly, not part of the menu tree."""
    if (directory / store).exists():
        return config_from_store(json.loads((directory / store).read_text()))
    empty = EMPTY_OVERVIEW
    cfg = Config(overview=empty, overview_portrait=empty)
    path = directory / "groups.json"
    if not path.exists():
        return cfg
    raw = json.loads(path.read_text())
    cfg.overview = raw.pop("_overview", empty)
    cfg.overview_portrait = raw.pop("_overview_portrait", empty)
    for name, v in raw.items():
        v = {"cameras": v} if isinstance(v, list) else v
        cfg.groups[name] = {
            "cameras": v["cameras"],
            "tile": tuple(v.get("tile", DEFAULT_TILE)),
            "fit": v.get("fit", "cover"),
            "menu": not name.startswith("Wall"),
        }
    entities = directory / "entities.json"
    if entities.exists():
        cfg.entities = json.loads(entities.read_text())
    return cfg


# --- drawing: pure functions of the config and the images -----------------------------

FONT = ImageFont.load_default(size=20)


def tile_grid(n: int) -> tuple[int, int]:
    cols = math.ceil(math.sqrt(n))
    return cols, math.ceil(n / cols)


def to_jpeg(img: Image.Image, quality: int) -> bytes:
    out = io.BytesIO()
    img.save(out, "JPEG", quality=quality)
    return out.getvalue()


def tile(
    cams: list[dict],
    images: list[bytes | None],
    size: tuple[int, int] = DEFAULT_TILE,
    fit: str = "contain",
    cols: int | None = None,
) -> bytes:
    """Compose one JPEG from the cameras' still images (None = camera failed)."""
    tw, th = size
    cols = cols or tile_grid(len(cams))[0]
    rows = math.ceil(len(cams) / cols)
    canvas = Image.new("RGB", (cols * tw, rows * th), "black")
    draw = ImageDraw.Draw(canvas, "RGBA")
    for i, (cam, raw) in enumerate(zip(cams, images, strict=False)):
        x, y = (i % cols) * tw, (i // cols) * th
        if raw:
            try:
                src = Image.open(io.BytesIO(raw)).convert("RGB")
                img = (
                    ImageOps.fit(src, size)
                    if fit == "cover"
                    else ImageOps.contain(src, size)
                )
                canvas.paste(
                    img, (x + (tw - img.width) // 2, y + (th - img.height) // 2)
                )
            except OSError:
                raw = None
        if not raw:
            draw.text(
                (x + tw // 2, y + th // 2),
                "no signal",
                fill="white",
                font=FONT,
                anchor="mm",
            )
        draw.rectangle((x, y + th - BAR, x + tw, y + th), fill=(0, 0, 0, 140))
        draw.text(
            (x + 10, y + th - 15), cam["title"], fill="white", font=FONT, anchor="lm"
        )
    draw.text(
        (canvas.width - 10, canvas.height - 15),
        datetime.now().strftime("%H:%M:%S"),
        fill="white",
        font=FONT,
        anchor="rm",
    )
    return to_jpeg(canvas, JPEG_QUALITY)


def overview_groups(cfg: dict) -> list[str]:
    return [n for row in cfg["rows"] for n in row.get("groups") or row["strip"]]


def subtiles(
    rect: tuple[int, int, int, int], n: int
) -> list[tuple[int, int, int, int]]:
    """The n camera tiles of a group, on the same grid as its composite, filling rect."""
    x, y, w, h = rect
    cols, rows = tile_grid(n)

    def edge(i: int, span: int, k: int) -> int:
        return round(i * span / k)

    return [
        (
            x + edge(c, w, cols),
            y + edge(r, h, rows),
            edge(c + 1, w, cols) - edge(c, w, cols),
            edge(r + 1, h, rows) - edge(r, h, rows),
        )
        for r, c in (divmod(i, cols) for i in range(n))
    ]


def overview_layout(
    cfg: dict, groups: dict[str, Group]
) -> tuple[tuple[int, int], list[dict]]:
    """Canvas size and, per group, its rect (x, y, w, h) and each camera's tile rect.
    No outer margin; only `gap` between neighbouring groups. `cell_aspect` shapes a
    group cell, `strip_aspect` a strip tile. Shared with the dashboard generator so
    tap zones line up."""
    width, gap, items, y = cfg["width"], cfg["gap"], [], 0
    for row in cfg["rows"]:
        if "groups" in row:
            n = len(row["groups"])
            w = (width - (n - 1) * gap) // n
            h = round(w / cfg["cell_aspect"])
            for i, g in enumerate(row["groups"]):
                rect = (i * (w + gap), y, w, h)
                tiles = subtiles(rect, len(groups[g]["cameras"]))
                items.append({"group": g, "rect": rect, "tiles": tiles})
        else:
            counts = [len(groups[g]["cameras"]) for g in row["strip"]]
            w = (width - (len(counts) - 1) * gap) // sum(counts)
            h, x = round(w / cfg["strip_aspect"]), 0
            for g, c in zip(row["strip"], counts, strict=True):
                tiles = [(x + j * w, y, w, h) for j in range(c)]
                items.append({"group": g, "rect": (x, y, w * c, h), "tiles": tiles})
                x += w * c + gap
        y += h + gap
    return (max(i["rect"][0] + i["rect"][2] for i in items), y - gap), items


def overview(frames: dict[str, bytes], cfg: dict, groups: dict[str, Group]) -> bytes:
    """Compose the group composites into one image: each camera's picture is cropped out
    of its group composite (name bar left off) and cropped again to fill its place.
    White gaps between groups, no outer margin."""
    size, items = overview_layout(cfg, groups)
    canvas = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(canvas, "RGBA")
    for it in items:
        x, y = it["rect"][:2]
        comp = Image.open(io.BytesIO(frames[it["group"]])).convert("RGB")
        group = groups[it["group"]]
        (tw, th), cols = group["tile"], tile_grid(len(group["cameras"]))[0]
        for j, (tx, ty, w2, h2) in enumerate(it["tiles"]):
            box = (
                (j % cols) * tw,
                (j // cols) * th,
                (j % cols + 1) * tw,
                (j // cols + 1) * th - BAR,
            )
            canvas.paste(ImageOps.fit(comp.crop(box), (w2, h2)), (tx, ty))
        label = it["group"]
        pill = draw.textbbox((x + 6, y + 6), label, font=FONT)
        draw.rectangle(
            (pill[0] - 5, pill[1] - 3, pill[2] + 5, pill[3] + 3), fill=(0, 0, 0, 160)
        )
        draw.text((x + 6, y + 6), label, fill="white", font=FONT)
    return to_jpeg(canvas, JPEG_QUALITY_OVERVIEW)


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


def commander_layout(cmd: dict) -> tuple[tuple[int, int], Rect, dict[str, list[Rect]]]:
    """Canvas size, the main camera's area, and each panel's tile rects. The bottom panel
    is full width; left and right stand on it; the top fits between them; the main camera
    fills what is left. An empty panel takes no room. Shared with the dashboard generator,
    so its tap zones line up."""
    w, h, gap = cmd["width"], cmd["height"], cmd["gap"]

    def size(panel: str, of: int) -> int:
        return round(of * cmd[panel]["size"] / 100) if cmd[panel]["cameras"] else 0

    bottom, left, right, top = (
        size("bottom", h),
        size("left", w),
        size("right", w),
        size("top", h),
    )
    above = h - bottom - (gap if bottom else 0)
    x0 = left + (gap if left else 0)
    x1 = w - right - (gap if right else 0)
    y0 = top + (gap if top else 0)
    areas = {
        "left": (0, 0, left, above),
        "right": (w - right, 0, right, above),
        "top": (x0, 0, x1 - x0, top),
        "bottom": (0, h - bottom, w, bottom),
    }
    tiles = {
        p: _line(areas[p], len(cmd[p]["cameras"]), p in ("left", "right"), gap)
        if cmd[p]["cameras"]
        else []
        for p in PANELS
    }
    return (w, h), (x0, y0, x1 - x0, above - y0), tiles


SMALL_FONT = ImageFont.load_default(size=16)
SMALL_BAR = 22
MAIN_FRAME = (123, 209, 160)  # the accent green: the tile shown as the main camera


def commander(
    cmd: dict,
    titles: dict[str, str],
    tiles: dict[str, bytes | None],
    main: str,
    main_image: bytes | None,
) -> bytes:
    """Draw the commander: each panel's cameras (the main one framed), and the main camera
    in its natural shape, as large as fits its area, centred."""
    size, main_rect, rects = commander_layout(cmd)
    canvas = Image.new("RGB", size, "black")
    draw = ImageDraw.Draw(canvas, "RGBA")
    for panel in PANELS:
        fit = cmd[panel].get("fit", "cover")
        for entity, (x, y, w, h) in zip(
            cmd[panel]["cameras"], rects[panel], strict=True
        ):
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
            if entity == main:
                draw.rectangle(
                    (x + 1, y + 1, x + w - 2, y + h - 2), outline=MAIN_FRAME, width=4
                )
    x, y, w, h = main_rect
    if w > 0 and h > 0:
        # The picture as large as fits, centred; its label and time go on the picture.
        px, py, pw, ph = x, y, w, h
        if main_image:
            try:
                img = ImageOps.contain(
                    Image.open(io.BytesIO(main_image)).convert("RGB"), (w, h)
                )
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
        pill = draw.textbbox((px + 10, py + 10), label, font=FONT)
        draw.rectangle(
            (pill[0] - 6, pill[1] - 4, pill[2] + 6, pill[3] + 4), fill=(0, 0, 0, 160)
        )
        draw.text((px + 10, py + 10), label, fill="white", font=FONT)
        draw.text(
            (px + pw - 10, py + ph - 15),
            datetime.now().strftime("%H:%M:%S"),
            fill="white",
            font=FONT,
            anchor="rm",
        )
    return to_jpeg(canvas, JPEG_QUALITY)


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
        needs: str = "groups.json in the app's config folder",
    ) -> None:
        self.config_dir = config_dir
        self.store = store  # which Camera Dashboard store it serves (live or draft)
        self.prewarm = prewarm  # build every composite at start (not for previews)
        # Keep the latest still of every camera, refreshed this often (seconds), so the
        # Camera Dashboard's thumbnails and previews are ready at once.
        self.keep_stills = keep_stills
        self.needs = (
            needs  # what to set up when there are no groups (shown on the tile)
        )
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
        self._seen: set[tuple[str, bool]] = set()
        self._http: aiohttp.ClientSession | None = None
        self._latest: dict[str, bytes] = {}  # camera -> its latest still (keep_stills)
        self._thumbs: dict[
            tuple[str, int], tuple[bytes, bytes]
        ] = {}  # -> (source, thumb)
        self._round_now: asyncio.Event | None = None
        self.main: str | None = None  # the commander's main camera, as last chosen
        self._wake: dict[str, asyncio.Event] = {}  # a stream's picture changed: send it

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        try:
            self.cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return
        if not self.cfg.groups:
            _LOGGER.warning(
                "compositor (%s): no groups yet; it needs %s", self.store, self.needs
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
            self._seen = {(n, p) for n, p in self._seen if self._known(n, p)}
            if self._round_now:
                self._round_now.set()  # fetch any camera just added

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)
        else:
            self.cfg = cfg
        _LOGGER.info("compositor (%s) reloaded: %d groups", self.store, len(cfg.groups))

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

    def set_main(self, entity: str) -> None:
        """Show this camera as the commander's main one: the picture is redrawn and sent to
        open streams at once. Thread-safe."""
        self.main = entity

        def apply() -> None:
            self._cache.pop("commander", None)
            self._inflight.pop("commander", None)  # a drawing of the old one: not used
            if wake := self._wake.pop("commander", None):
                wake.set()

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)

    def render(self, cfg: Config, name: str, portrait: bool = False) -> bytes:
        """Draw one composite (a group, or "overview") from a config that is not the one
        being served: the Camera Dashboard's unsaved edits, for its live previews. Stills
        are shared with the composites being served. Thread-safe; KeyError for a group
        that isn't there, ValueError for one that can't be drawn."""
        if not (self._loop and self._running):
            raise RuntimeError("the compositor is not running")
        future = asyncio.run_coroutine_threadsafe(
            self._render(cfg, name, portrait), self._loop
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
        thumb = to_jpeg(img, JPEG_QUALITY)
        self._thumbs[(entity, width)] = (source, thumb)
        return thumb

    async def _render(self, cfg: Config, name: str, portrait: bool) -> bytes:
        if name == "commander":
            if not commander_cameras(cfg.commander):
                raise ValueError("the commander has no cameras")
            return await self._build_commander(cfg, ready=True)
        if name != "overview":
            if not cfg.groups[name]["cameras"]:
                raise ValueError(f"{name} has no cameras")
            return await self._compose(cfg.groups[name], portrait, ready=True)
        layout = cfg.overview_for(portrait)
        names = overview_groups(layout)
        if not names:
            raise ValueError("the overview has no rows")
        for n in names:
            if not cfg.groups[n]["cameras"]:
                raise ValueError(f"{n} has no cameras")
        frames = await asyncio.gather(
            *(self._compose(cfg.groups[n], ready=True) for n in names)
        )
        return overview(dict(zip(names, frames, strict=True)), layout, cfg.groups)

    def stop(self) -> None:
        if self._loop and self._stop:
            self._loop.call_soon_threadsafe(self._stop.set)

    def health(self) -> dict[str, Any]:
        if self._running:
            state = "running" if self.cfg.groups else "unconfigured"
        else:
            state = "offline"
        return {
            "state": state,
            "port": self.port,
            "groups": len(self.cfg.groups),
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
                {(n, p) for n in self._menu_groups() for p in (False, True)}
                | {
                    ("overview", p)
                    for p in (False, True)
                    if self.cfg.overview_for(p)["rows"]
                }
                | ({("commander", False)} if self._known("commander") else set())
                if self.prewarm
                else set()
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
            _LOGGER.info(
                "compositing %d groups on :%d", len(self.cfg.groups), self.port
            )
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
        """A camera still, shared: composites built together (landscape and portrait of
        one group) fetch it once."""
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
        """Every camera of the config: in a group, or chosen and in no group yet."""
        out = dict.fromkeys(
            c["entity"] for g in self.cfg.groups.values() for c in g["cameras"]
        )
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

    async def _build_group(self, name: str, portrait: bool = False) -> bytes:
        return await self._compose(self.cfg.groups[name], portrait)

    async def _compose(
        self, group: Group, portrait: bool = False, ready: bool = False
    ) -> bytes:
        """A group's composite. `ready`: from the kept stills (the Camera Dashboard's
        previews, at once) rather than fresh ones (what the wall tablets see)."""
        cams, size = group["cameras"], group["tile"]
        still = (
            size[0],
            size[0] * 9 // 16,
        )  # a true 16:9 still from HA, cropped to the tile
        images = await asyncio.gather(
            *(
                self._ready_still(c["entity"])
                if ready
                else self._fetch(c["entity"], still)
                for c in cams
            )
        )
        if portrait:  # one column of whole 16:9 tiles, for a phone held upright
            return tile(cams, images, still, "cover", cols=1)
        return tile(cams, images, size, group["fit"])

    async def _build_commander(
        self, cfg: Config | None = None, ready: bool = False
    ) -> bytes:
        """The commander: tiles from each camera's composite still, the main camera from
        its medium channel (sharper at that size) in its natural shape. `ready`: from the
        kept stills, for previews."""
        cfg = cfg or self.cfg
        cmd, main = cfg.commander, self.main_camera(cfg) or ""
        _, (_, _, mw, mh), rects = commander_layout(cmd)
        wanted: dict[str, int] = {}  # camera -> the widest tile it has
        for panel in PANELS:
            for e, (_, _, w, _) in zip(
                cmd[panel]["cameras"], rects[panel], strict=True
            ):
                wanted[e] = max(wanted.get(e, 0), w)

        async def tile_still(e: str, w: int) -> bytes | None:
            return await (
                self._ready_still(e) if ready else self._fetch(e, (w, w * 9 // 16))
            )

        async def main_still() -> bytes | None:
            if ready:
                return await self._ready_still(main)
            channel = cfg.entities.get(main, {}).get("medium") or main
            return await self._fetch(
                channel, (mw, mh)
            )  # HA keeps the camera's own shape

        names = list(wanted)
        images = await asyncio.gather(
            main_still(), *(tile_still(e, wanted[e]) for e in names)
        )
        return commander(
            cmd, cfg.titles, dict(zip(names, images[1:], strict=True)), main, images[0]
        )

    async def _build_overview(self, portrait: bool = False) -> bytes:
        """Compose from the group composites we have (each carries its own timestamp);
        groups are served from cache, so this only waits for a group never built."""
        cfg = self.cfg.overview_for(portrait)
        names = overview_groups(cfg)
        frames = await asyncio.gather(*(self._frame(n) for n in names))
        return overview(dict(zip(names, frames, strict=True)), cfg, self.cfg.groups)

    @staticmethod
    def _key(name: str, portrait: bool) -> str:
        return name + (":p" if portrait else "")

    def _builder(self, name: str, portrait: bool) -> Build:
        if name == "commander":
            return lambda: self._build_commander()
        if name == "overview":
            return lambda: self._build_overview(portrait)
        return lambda: self._build_group(name, portrait)

    async def _frame(
        self, name: str, fresh: bool = False, portrait: bool = False
    ) -> bytes:
        self._last_request = time.monotonic()
        self._seen.add(
            (name, portrait)
        )  # what has been asked for is what gets kept warm
        interval = OVERVIEW_INTERVAL if name == "overview" else INTERVAL
        return await self._cached(
            self._key(name, portrait), interval, self._builder(name, portrait), fresh
        )

    # -- keeping HA's live streams warm

    async def _warm_streams(self, name: str) -> None:
        """Start HA's HLS streams for a group's cameras, so a tap into a live page finds
        them already running. A cold HLS stream takes 7-9 s to become playable; a running
        one ~10 ms. Rate-limited per group; cameras without channels are skipped."""
        assert self._http
        now = time.monotonic()
        if now - self._warmed.get(name, -1e9) < WARM_STREAM_EVERY:
            return
        self._warmed[name] = now
        ents = [
            "camera."
            + self.cfg.entities[c["entity"]][WARM_STREAM_TIER].replace("camera.", "")
            for c in self.cfg.groups[name]["cameras"]
            if WARM_STREAM_TIER in self.cfg.entities.get(c["entity"], {})
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
        if name in self.cfg.groups and self.cfg.groups[name].get("menu", True):
            task = asyncio.ensure_future(self._warm_streams(name))
            self._bg.add(task)
            task.add_done_callback(self._bg.discard)

    def _menu_groups(self) -> list[str]:
        # The walls are viewed directly, not part of the menu tree.
        return [n for n, g in self.cfg.groups.items() if g.get("menu", True)]

    async def _keep_warm(self) -> None:
        """While someone has looked recently, keep what has been asked for fresh so every
        page snaps into view."""
        while True:
            if time.monotonic() - self._last_request < WARM_WINDOW:
                for name, portrait in list(self._seen):
                    self._refresh(
                        self._key(name, portrait), self._builder(name, portrait)
                    )
            await asyncio.sleep(WARM_EVERY)

    # -- HTTP handlers

    def _known(self, name: str, portrait: bool = False) -> bool:
        if name == "commander":  # landscape only
            return not portrait and bool(commander_cameras(self.cfg.commander))
        return name in self.cfg.groups or (
            name == "overview" and bool(self.cfg.overview_for(portrait)["rows"])
        )

    async def _jpg(self, request: web.Request) -> web.Response:
        name, portrait = (
            request.match_info["name"],
            request.query.get("layout") == "portrait",
        )
        if not self._known(name, portrait):
            raise web.HTTPNotFound()
        self._warm_in_background(name)
        return web.Response(
            body=await self._frame(name, portrait=portrait),
            content_type="image/jpeg",
            headers={"Cache-Control": "no-store"},
        )

    async def _mjpg(self, request: web.Request) -> web.StreamResponse:
        name, portrait = (
            request.match_info["name"],
            request.query.get("layout") == "portrait",
        )
        if not self._known(name, portrait):
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
            part = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
            await resp.write(part)
            first = True
            while not stop.is_set():
                self._warm_in_background(name)
                data = await self._frame(name, fresh=not first, portrait=portrait)
                first = False
                await resp.write(data + b"\r\n" + part)
                # The next frame after the interval, or at once when the picture changes
                # (the commander's main camera was switched).
                wait = OVERVIEW_INTERVAL if name == "overview" else INTERVAL
                wake = self._wake.setdefault(name, asyncio.Event())
                waits = [
                    asyncio.ensure_future(stop.wait()),
                    asyncio.ensure_future(wake.wait()),
                ]
                await asyncio.wait(
                    waits, timeout=wait, return_when=asyncio.FIRST_COMPLETED
                )
                for w in waits:
                    w.cancel()
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
        names = (["overview"] if self.cfg.overview["rows"] else []) + list(
            self.cfg.groups
        )
        links = "".join(
            f'<li>{n}: <a href="/g/{n}.jpg">jpg</a> <a href="/g/{n}.mjpg">mjpg</a> '
            f'<a href="/g/{n}.jpg?layout=portrait">portrait jpg</a> '
            f'<a href="/g/{n}.mjpg?layout=portrait">portrait mjpg</a></li>'
            for n in names
        )
        return web.Response(text=f"<ul>{links}</ul>", content_type="text/html")
