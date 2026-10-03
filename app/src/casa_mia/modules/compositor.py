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

Group = dict[str, Any]
Build = Callable[[], Awaitable[bytes]]


@dataclass
class Config:
    groups: dict[str, Group] = field(default_factory=dict)
    overview: dict = field(default_factory=dict)
    overview_portrait: dict = field(default_factory=dict)
    entities: dict[str, dict[str, str]] = field(default_factory=dict)

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
    ) -> None:
        self.config_dir = config_dir
        self.store = store  # which Camera Dashboard store it serves (live or draft)
        self.prewarm = prewarm  # build every composite at start (not for previews)
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
                "no groups.json in %s; nothing to composite", self.config_dir
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

        if self._loop and self._running:
            self._loop.call_soon_threadsafe(apply)
        else:
            self.cfg = cfg
        _LOGGER.info("compositor (%s) reloaded: %d groups", self.store, len(cfg.groups))

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

    async def _render(self, cfg: Config, name: str, portrait: bool) -> bytes:
        if name != "overview":
            if not cfg.groups[name]["cameras"]:
                raise ValueError(f"{name} has no cameras")
            return await self._compose(cfg.groups[name], portrait)
        layout = cfg.overview_for(portrait)
        names = overview_groups(layout)
        if not names:
            raise ValueError("the overview has no rows")
        for n in names:
            if not cfg.groups[n]["cameras"]:
                raise ValueError(f"{n} has no cameras")
        frames = await asyncio.gather(*(self._compose(cfg.groups[n]) for n in names))
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
            warm = asyncio.create_task(self._keep_warm())
            self._ready.set()
            await self._stop.wait()
            warm.cancel()
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

    def _refresh(self, key: str, build: Build) -> asyncio.Task:
        """Start (or join) the one rebuild in flight for `key`; the result lands in the cache."""
        task = self._inflight.get(key)
        if task is None or task.done():

            async def run() -> None:
                self._cache[key] = (time.monotonic(), await build())

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

    async def _compose(self, group: Group, portrait: bool = False) -> bytes:
        cams, size = group["cameras"], group["tile"]
        still = (
            size[0],
            size[0] * 9 // 16,
        )  # a true 16:9 still from HA, cropped to the tile
        images = await asyncio.gather(*(self._fetch(c["entity"], still) for c in cams))
        if portrait:  # one column of whole 16:9 tiles, for a phone held upright
            return tile(cams, images, still, "cover", cols=1)
        return tile(cams, images, size, group["fit"])

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
                try:
                    wait = OVERVIEW_INTERVAL if name == "overview" else INTERVAL
                    await asyncio.wait_for(stop.wait(), wait)
                except TimeoutError:
                    pass
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
