"""The generator: a compositor's state, and its commanders drawn from the gatherer's cache at its pace while someone watches."""

from __future__ import annotations

import asyncio
import collections
import logging
import math
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ... import swap
from .. import streams
from .common import (
    EMPTY_COMMANDER,
    FETCH_TIMEOUT,
    KEEPALIVE,
    LINGER,
    LIVE_MAIN,
    LIVE_STORE,
    PACES,
    PANELS,
    PORT,
    Config,
    Size,
    channels,
    choose,
    key_of,
    load_config,
    measured,
    sized,
    slug,
    view_key,
)
from .drawing import (
    cameras_of,
    commander,
    commander_cameras,
    commander_layout,
)
from .gatherer import (
    Gatherer,
)

if TYPE_CHECKING:
    from .server import Sending

_LOGGER = logging.getLogger(__name__)


class Generator:
    """A compositor's state and its generator: its store's commanders, drawn from the
    gatherer's cache while someone watches (see the package's docstring)."""

    def __init__(
        self,
        config_dir: Path,
        ha_url: str,
        token: str,
        port: int = PORT,
        ws_path: str = "/websocket",
        store: str = LIVE_STORE,
        prewarm: bool = True,
        needs: str = "a commander with cameras, on the Camera Commander page",
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
        # Per commander (by id): its main camera as last chosen.
        self.mains: dict[str, str] = {}

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
                if live_main and not self.gather.flags["live_main"]:
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

    def pace(self) -> float:
        """Seconds between drawings: its generator's pace, or its slowest while the
        screenshot swap is on (its pictures are stills; a change of main camera still
        draws at once)."""
        return PACES[self.role][1] if swap.stamp() else self.gather.pace(self.role)

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
                    self.pace(),
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
                    max(0.0, self.pace() - (time.monotonic() - started)),
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
            "pace": self.pace(),
            "server_paused": self.serving_paused,
            "gatherer_paused": self.gather.paused,
            "sending": [s.figures(now) for s in self._sending],
            "drawing": self._gathering,
        }
