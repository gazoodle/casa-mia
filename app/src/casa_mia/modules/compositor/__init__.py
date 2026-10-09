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

The parts (each class builds on the one before it):

  common.py      settings, store helpers, picture names and sizes (shared, defined once)
  drawing.py     the commander's layout and picture: pure functions
  cache.py       Cache: the gatherer's state, its pictures, what is kept across restarts
  fetch.py       Fetcher: each wanted channel fetched at its pace
  survey.py      Survey: every channel's size and whether it streams
  monitor.py     Monitor: the whole system sampled, judged and reported
  gatherer.py    Gatherer: started, stopped and configured
  generator.py   Generator: a compositor's state, its commanders drawn at its pace
  server.py      PictureServer: its pictures over HTTP; Sending, each open stream
  compositor.py  Compositor: the generator and server as one, started and stopped
  api.py         the Camera compositor page's API and the integration's buttons
"""

from __future__ import annotations

from ... import swap
from .. import streams
from .api import (
    admin_api,
    control,
)
from .common import (
    BENCH,
    DRAFT_STORE,
    EMPTY_COMMANDER,
    FETCH_TIMEOUT,
    FLAGS,
    GO2RTC_CHECK,
    GO2RTC_RTSP,
    HA_WATCH_RETRY,
    HEALTH_S,
    HEALTH_STATES,
    IDLE,
    INTERVAL,
    JPEG_QUALITY,
    KEEPALIVE,
    LAG_WAITING,
    LAYOUT,
    LINGER,
    LIVE_MAIN,
    LIVE_STORE,
    MAX_PIXELS,
    MAX_STREAMS,
    MIN_SIDE,
    MONITOR_EVERY,
    MONITOR_KEEP,
    PACE_DEFAULTS,
    PACES,
    PANELS,
    PORT,
    STILL_TTL,
    STREAM_RETRY,
    STRIKES,
    WARM_STREAM_EVERY,
    WARM_STREAM_TIER,
    Config,
    Size,
    asked_size,
    channels,
    choose,
    commanders_of,
    config_from_store,
    enlarged,
    forgotten,
    go2rtc_reachable,
    key_of,
    load_config,
    measured,
    memory,
    refused,
    sized,
    slug,
    view_key,
    viewer,
    visible,
)
from .compositor import (
    Compositor,
)
from .drawing import (
    FONT,
    SIZED,
    SMALL_BAR,
    STACKS,
    STALE,
    Picture,
    Rect,
    Use,
    as_image,
    cameras_of,
    commander,
    commander_cameras,
    commander_layout,
    encode,
    main_shape,
    mime,
    ratio,
    see_through,
    waiting_picture,
)
from .gatherer import (
    Gatherer,
)
from .generator import Generator
from .server import (
    PictureServer,
    Sending,
)

__all__ = [
    "PORT",
    "INTERVAL",
    "LINGER",
    "STRIKES",
    "BENCH",
    "KEEPALIVE",
    "MAX_STREAMS",
    "WARM_STREAM_EVERY",
    "WARM_STREAM_TIER",
    "STILL_TTL",
    "FETCH_TIMEOUT",
    "JPEG_QUALITY",
    "GO2RTC_RTSP",
    "PACES",
    "FLAGS",
    "PACE_DEFAULTS",
    "IDLE",
    "GO2RTC_CHECK",
    "HA_WATCH_RETRY",
    "STREAM_RETRY",
    "Config",
    "LIVE_STORE",
    "DRAFT_STORE",
    "PANELS",
    "LAYOUT",
    "EMPTY_COMMANDER",
    "slug",
    "MAX_PIXELS",
    "MIN_SIDE",
    "Size",
    "asked_size",
    "viewer",
    "LIVE_MAIN",
    "view_key",
    "sized",
    "key_of",
    "commanders_of",
    "config_from_store",
    "refused",
    "forgotten",
    "measured",
    "memory",
    "MONITOR_EVERY",
    "MONITOR_KEEP",
    "HEALTH_S",
    "LAG_WAITING",
    "HEALTH_STATES",
    "go2rtc_reachable",
    "channels",
    "enlarged",
    "choose",
    "load_config",
    "visible",
    "FONT",
    "encode",
    "mime",
    "Rect",
    "Picture",
    "Use",
    "as_image",
    "commander_cameras",
    "cameras_of",
    "STACKS",
    "SIZED",
    "ratio",
    "main_shape",
    "commander_layout",
    "STALE",
    "SMALL_BAR",
    "see_through",
    "commander",
    "waiting_picture",
    "Gatherer",
    "PictureServer",
    "Sending",
    "Compositor",
    "Generator",
    "admin_api",
    "control",
    "streams",
    "swap",
]
