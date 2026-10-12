"""The "Notify on Sensor Watch" blueprint (blueprints/notify.yaml), put where Home
Assistant looks for them, with the groups and notify actions of the day as its
dropdowns' choices (typing another still works). No Home Assistant imports, so the
tests load it by path."""

from __future__ import annotations

import json
import logging
from pathlib import Path

_LOGGER = logging.getLogger(__name__)
SOURCE = Path(__file__).with_name("blueprints") / "notify.yaml"
AT = ("blueprints", "automation", "casa_mia", "sensor_watch_notify.yaml")
# The lines the choices replace (YAML takes a JSON list as it is).
GROUPS = "options: []  # the groups, filled in by the integration"
NOTIFIES = "options: []  # the notify actions, filled in by the integration"


def filled(template: str, groups: list[str], notifies: list[str]) -> str:
    """The blueprint with these groups and notify actions to choose from."""
    return template.replace(GROUPS, f"options: {json.dumps(groups)}").replace(
        NOTIFIES, f"options: {json.dumps(notifies)}"
    )


def install(target: str, text: str) -> None:
    """Put the blueprint in place, or bring it up to date (it says to copy it before
    changing it). Best effort: a failure only means no blueprint."""
    path = Path(target)
    try:
        if path.exists() and path.read_text("utf-8") == text:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, "utf-8")
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Sensor Watch written at %s", path)
