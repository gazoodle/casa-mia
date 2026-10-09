"""The gatherer's state and its cache: each channel's latest picture (a camera's, or the screenshot swap's still), the channels' sizes kept across restarts, the paces and switches kept, and the whole system's tallies."""

from __future__ import annotations

import asyncio
import collections
import io
import json
import logging
import math
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

import aiohttp
from PIL import Image, ImageOps

from ... import swap
from .. import streams
from .common import (
    FLAGS,
    JPEG_QUALITY,
    MONITOR_KEEP,
    PACE_DEFAULTS,
    PACES,
    Config,
    channels,
)
from .drawing import (
    Picture,
    Use,
    _stand_in,
    as_image,
    cameras_of,
    encode,
    waiting_picture,
)

_LOGGER = logging.getLogger(__name__)


class Cache:
    """The gatherer's state, its cache of pictures and what is kept across restarts."""

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

    def _soon(self, fn: Callable[[], None]) -> None:
        """Run fn on its loop (at once while it is not running)."""
        if self.loop:
            self.loop.call_soon_threadsafe(fn)
        else:
            fn()

    def pace(self, which: str) -> float:
        """Seconds between: the gatherer's fetches of each channel ("gatherer"), or a
        generator's drawings ("live", "draft")."""
        return self.paces.get(which, PACE_DEFAULTS[which])

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
        if picture := self._swapped(entity):
            # The screenshot swap: its picture kept in place of the camera's, at the
            # camera's size, so all else (sizes, drawing, serving) runs as ever.
            try:
                image = _stand_in(picture, picture.stat().st_mtime_ns, size)
            except OSError:
                pass  # gone or unreadable: the camera's own picture
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

    def _channel(self, entity: str) -> tuple[str, str]:
        """The camera a channel belongs to, and its tier (low, medium, high)."""
        for camera in self.cfg.entities:
            for tier, e in channels(self.cfg, camera).items():
                if e == entity:
                    return camera, tier
        return entity, "low"

    # -- the channels' own streams (HA's go2rtc)

    def _cameras(self) -> list[str]:
        """Every camera of the config: in a commander, or chosen and not in one yet."""
        out = dict.fromkeys(cameras_of(self.cfg.commanders))
        return list(out | dict.fromkeys(self.cfg.entities))

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
