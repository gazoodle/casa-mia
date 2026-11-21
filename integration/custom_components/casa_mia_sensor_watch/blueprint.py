"""The "Notify on Sensor Watch" blueprint (blueprints/notify.yaml), put where Home
Assistant looks for them, with the groups and notify actions of the day as its
dropdowns' choices (typing another still works). No Home Assistant imports, so the
tests load it by path."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from collections.abc import Callable
from pathlib import Path

_LOGGER = logging.getLogger(__name__)
_WRITING = threading.Lock()
_LEFT: set[Path] = set()  # copies found changed this run, already said
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


def _sum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def install(target: str, text: Callable[[], str]) -> None:
    """Put the blueprint in place, or bring it up to date while nobody has changed it.
    Best effort: a failure only means no blueprint.

    A copy someone has edited is left as it is, and so no longer gets new groups and
    notify actions in its dropdowns (typing one still works). Frenck, reviewing the same
    in Love it or Loathe it (hacs/default#14085, 2026-11-20): it used to be replaced
    whenever it differed. What was last written is kept beside it as a sum
    (.<name>.written, which Home Assistant never loads), and a copy that no longer
    matches it is theirs. A copy with no sum was written by a build that replaced it at
    every change, so no edit of it can have lasted: it is still ours.

    Runs in the executor, one job per change, and several can be in flight at once (the
    notify services register one by one at start). So the writes take turns, each takes
    the newest text only once it has its turn (an older job finishing last can't leave a
    stale one), and the file is replaced whole: written in place by two jobs, a longer
    text's tail survived a shorter one's end, and Home Assistant refused the file."""
    path = Path(target)
    mark = path.with_name(f".{path.name}.written")
    try:
        with _WRITING:
            body = text()
            if path.exists():
                now = path.read_text("utf-8")
                if mark.exists() and mark.read_text("utf-8").strip() != _sum(now):
                    # Said once a run: it is asked again at every change of groups.
                    _LOGGER.log(
                        logging.DEBUG if path in _LEFT else logging.INFO,
                        "blueprint at %s left as it is: it has been changed since it was"
                        " written, so its dropdowns no longer follow the groups and notify"
                        " actions (delete it to have the current one)",
                        path,
                    )
                    _LEFT.add(path)
                    return
                if now == body:
                    if not mark.exists():  # from now on an edit to it is seen
                        mark.write_text(_sum(body), "utf-8")
                    return
            path.parent.mkdir(parents=True, exist_ok=True)
            part = path.with_name(path.name + ".tmp")  # not *.yaml: never loaded
            part.write_text(body, "utf-8")
            part.replace(path)
            mark.write_text(_sum(body), "utf-8")
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Sensor Watch written at %s", path)
