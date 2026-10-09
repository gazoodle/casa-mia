"""auto_dashboards: the camera dashboard, generated and deployed into Home Assistant.

It shows the cameras (the Cameras page) and the commanders (the Camera Commander page):
the commanders' pages, then a live page per camera, in ONE dashboard that adapts to
whoever is looking with card visibility conditions (wall tablet users and phones get the
medium channel, everyone else the high one). Tap zones come from the compositor's own
layout function, so they always line up. Its own settings: url, Back / Home / Help, wall
tablet users, phones, live cards.

Its draft takes a copy of the cameras and the commanders whenever their pages change
them. Both dashboards show the live compositor's pictures. Deploying
saves the dashboard into HA over the websocket (a storage-mode dashboard: no
configuration.yaml change, no restart), after keeping a copy of what it replaces: a
preview deploy to `<dashboard>-preview`, a live one to the dashboard itself.

Files in the app's config folder: camera-dashboard.json (the draft, edited on the admin
page), camera-dashboard-live.json (what was last deployed live) and
camera-dashboard-backups/ (the live dashboard's last few configs before each deploy, as
many as camera-dashboard-settings.json says to keep; the preview keeps just one).

The parts:

  common.py      Shared constants, the store's defaults and small helpers.
  checks.py      What is wrong with a store (problems) and what HA seems to lack (warnings).
  dashboard.py   The generated dashboard: the commanders' pages, then each camera's.
  store.py       Base: the module's files, paths and Home Assistant lookups.
  backups.py     Backups: the dashboards' configs kept before each deploy.
  deploys.py     Deploys: start, the page's view, saving the draft and deploying it.
  api.py         AutoDashboards: the admin page's API.
"""

from __future__ import annotations

from .api import AutoDashboards
from .checks import problems, warnings
from .common import (
    BACKUPS,
    BLANK,
    CARDS,
    DEFAULT_KEEP,
    DEFAULTS,
    DEPLOYS,
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
    "AutoDashboards",
    "DEFAULTS",
    "DEFAULT_KEEP",
    "DEPLOYS",
    "HIGHLIGHT",
    "MAX_KEEP",
    "PREVIEW",
    "Plain",
    "Response",
    "SETTINGS",
    "Store",
    "URL_PATH",
    "build_dashboard",
    "menu_cameras",
    "navigate",
    "preset_action",
    "preset_entries",
    "problems",
    "to_yaml",
    "warnings",
    "with_defaults",
]
