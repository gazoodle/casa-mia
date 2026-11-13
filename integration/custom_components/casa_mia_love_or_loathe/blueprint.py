"""The "Notify on Love it or Loathe it" blueprint (blueprints/notify.yaml), put where
Home Assistant looks for them. No Home Assistant imports, so the tests load it by path."""

from __future__ import annotations

import logging
from pathlib import Path

_LOGGER = logging.getLogger(__name__)
SOURCE = Path(__file__).with_name("blueprints") / "notify.yaml"
AT = ("blueprints", "automation", "casa_mia", "love_or_loathe_notify.yaml")


def install(target: str) -> None:
    """Put the blueprint in place, or bring it up to date (it says to copy it before
    changing it). Best effort: a failure only means no blueprint, and is logged. Runs in
    the executor, once at each start of Home Assistant."""
    path = Path(target)
    try:
        body = SOURCE.read_text("utf-8")
        if path.exists() and path.read_text("utf-8") == body:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        # Replaced whole: Home Assistant never reads half a file. Not *.yaml until then.
        part = path.with_name(path.name + ".tmp")
        part.write_text(body, "utf-8")
        part.replace(path)
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Love it or Loathe it written at %s", path)
