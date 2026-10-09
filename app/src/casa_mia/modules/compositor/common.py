"""The compositor's settings, its store's commanders and the names and sizes of its pictures, shared by its parts."""

from __future__ import annotations

import json
import logging
import math
import os
import re
import socket
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from aiohttp import web

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


# What the live compositor draws: the commanders and the cameras they show, written by
# Camera Commander. DRAFT_STORE: the Auto Dashboards draft, for a second compositor (none now).
LIVE_STORE = "compositor.json"
DRAFT_STORE = "camera-dashboard.json"
# A commander: one landscape picture, a main camera framed by four panels of cameras.
# Left and right sizes are % of the width, top and bottom % of the height. There are one
# or more, each a page of the dashboard named after it.
PANELS = ("left", "top", "right", "bottom")
LAYOUT = json.loads((Path(__file__).parents[2] / "layout.json").read_text())
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
    """The compositor's view of a store (compositor.json): the commanders name their
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
    one), then its medium and high as set on the Cameras page. Not its zoom:
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
