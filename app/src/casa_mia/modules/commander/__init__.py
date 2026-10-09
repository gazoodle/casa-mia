"""commander: Camera Commander, the commanders that show the cameras.

A commander is a main camera framed by panels of cameras (the Cameras page's), drawn as
one picture by the compositor for the Camera Commander card and the camera dashboard.
Saving the commanders shows them live at once: there is no draft. The live compositor
draws from compositor.json, the commanders with the cameras they show, written here on
every change (theirs, or the Cameras page's).

The integration gets a device per commander (its Main camera select, its Track motion
switch) from health(), and posts choices of main camera and motion to control().

Files in the app's config folder: commanders.json (the commanders, and the address their
pictures are served on). The first start moves them from what the Camera Dashboard last
deployed live (else its draft), leaving those files as they were.

The parts:

  common.py  Shared constants and helpers; the integration's entities, by unique id.
  checks.py  What is wrong with the commanders.
  store.py   Base: the store, saving, and the live compositor's config.
  live.py    Live: the compositors drawing them, the card's view, main camera, motion.
  api.py     Commander: start, and the admin page's API.
"""

from __future__ import annotations

from .api import Commander
from .checks import FITS, problems
from .common import (
    COMMANDER_SELECT,
    STORE,
    UNIQUE_IDS,
    commander_entities,
    commander_selects,
)

__all__ = [
    "COMMANDER_SELECT",
    "Commander",
    "FITS",
    "STORE",
    "UNIQUE_IDS",
    "commander_entities",
    "commander_selects",
    "problems",
]
