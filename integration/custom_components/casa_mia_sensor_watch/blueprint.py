"""The "Notify on Sensor Watch" blueprint (blueprints/notify.yaml), put where Home
Assistant looks for them, with the groups and notify actions of the day as its
dropdowns' choices (typing another still works). No Home Assistant imports, so the
tests load it by path."""

from __future__ import annotations

import json
import logging
import threading
from collections.abc import Callable
from pathlib import Path

_LOGGER = logging.getLogger(__name__)
_WRITING = threading.Lock()
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


def install(target: str, text: Callable[[], str]) -> None:
    """Put the blueprint in place, or bring it up to date (it says to copy it before
    changing it). Best effort: a failure only means no blueprint.

    Runs in the executor, one job per change, and several can be in flight at once (the
    notify services register one by one at start). So the writes take turns, each takes
    the newest text only once it has its turn (an older job finishing last can't leave a
    stale one), and the file is replaced whole: written in place by two jobs, a longer
    text's tail survived a shorter one's end, and Home Assistant refused the file."""
    path = Path(target)
    try:
        with _WRITING:
            body = text()
            if path.exists() and path.read_text("utf-8") == body:
                return
            path.parent.mkdir(parents=True, exist_ok=True)
            part = path.with_name(path.name + ".tmp")  # not *.yaml: never loaded
            part.write_text(body, "utf-8")
            part.replace(path)
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Sensor Watch written at %s", path)
