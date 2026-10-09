"""camera_dashboard: one source for the Camera Commander and its HA dashboard.

The store describes everything: the cameras (chosen from HA, each with its channels,
zoom entity, PTZ presets and page controls), the commanders (each a main camera framed
by panels of cameras, drawn as one picture by the compositor; one or more, in order, each
a page of the dashboard), and the dashboard's settings
(url, Back / Home / Help, wall tablet users, phones, live cards). From it come:

  * the compositor's config: the draft compositor (DRAFT_PORT) draws the draft for
    previews; the live one (compositor.PORT) draws only what was last deployed, so
    editing never disturbs the wall tablets;
  * the dashboard: the commanders -> live camera pages, in ONE dashboard that adapts to
    whoever is looking with card visibility conditions (wall tablet users and phones get
    the medium channel, everyone else the high one). Tap zones come from the
    compositor's own layout function, so they always line up.

Deploying saves the dashboard into HA over the websocket (a storage-mode dashboard: no
configuration.yaml change, no restart), after keeping a copy of what it replaces. A
preview deploy goes to `<dashboard>-preview` and shows the draft commander; a live one
goes to the dashboard itself and makes the draft the live compositor's config.

Files in the app's config folder: camera-dashboard.json (the draft, edited on the admin
page), camera-dashboard-live.json (what was last deployed live) and
camera-dashboard-backups/ (the live dashboard's last few configs before each deploy, as
many as camera-dashboard-settings.json says to keep; the preview keeps just one).

The parts:

  common.py      Shared constants, the store's defaults and small helpers.
  commanders.py  The integration's entities for each commander, by unique id.
  checks.py      What is wrong with a store (problems) and what HA seems to lack (warnings).
  dashboard.py   The generated dashboard: the commanders' pages, then each camera's.
  store.py       Base: the module's files, paths and Home Assistant lookups.
  live.py        Commanders: the compositors drawing them, the card's view, the main camera.
  backups.py     Backups: the dashboards' configs kept before each deploy.
  deploys.py     Deploys: start, the page's view, saving the draft and deploying it.
  api.py         CameraDashboard: the admin page's API and the previews.
"""

from __future__ import annotations

from .api import CameraDashboard
from .checks import problems, warnings
from .commanders import (
    COMMANDER_SELECT,
    UNIQUE_IDS,
    commander_entities,
    commander_selects,
)
from .common import (
    BACKUPS,
    BLANK,
    CARDS,
    DEFAULT_KEEP,
    DEFAULTS,
    DEPLOYS,
    DRAFT_PORT,
    FITS,
    HIGHLIGHT,
    MAX_KEEP,
    PREVIEW,
    SETTINGS,
    URL_PATH,
    BadRequest,
    Response,
    Store,
    with_defaults,
)
from .dashboard import (
    Plain,
    build_dashboard,
    menu_cameras,
    navigate,
    preset_action,
    preset_entries,
    to_yaml,
)

__all__ = [
    "BACKUPS",
    "BLANK",
    "BadRequest",
    "CARDS",
    "COMMANDER_SELECT",
    "CameraDashboard",
    "DEFAULTS",
    "DEFAULT_KEEP",
    "DEPLOYS",
    "DRAFT_PORT",
    "FITS",
    "HIGHLIGHT",
    "MAX_KEEP",
    "PREVIEW",
    "Plain",
    "Response",
    "SETTINGS",
    "Store",
    "UNIQUE_IDS",
    "URL_PATH",
    "build_dashboard",
    "commander_entities",
    "commander_selects",
    "menu_cameras",
    "navigate",
    "preset_action",
    "preset_entries",
    "problems",
    "to_yaml",
    "warnings",
    "with_defaults",
]
