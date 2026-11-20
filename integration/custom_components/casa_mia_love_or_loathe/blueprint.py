"""The "Notify on Love it or Loathe it" blueprint (blueprints/notify.yaml), put where
Home Assistant looks for them. No Home Assistant imports, so the tests load it by path."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

_LOGGER = logging.getLogger(__name__)
SOURCE = Path(__file__).with_name("blueprints") / "notify.yaml"
AT = ("blueprints", "automation", "casa_mia", "love_or_loathe_notify.yaml")


def _sum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def install(target: str) -> None:
    """Put the blueprint in place, or bring it up to date while nobody has changed it.
    Best effort: a failure only means no blueprint, and is logged. Runs in the executor,
    once at each start of Home Assistant.

    A copy someone has edited is left as it is (Frenck, reviewing hacs/default#14085,
    2026-11-20: every start used to replace it). What was last written is kept beside it
    as a sum (.<name>.written, which Home Assistant never loads), and a copy that no
    longer matches it is theirs. A copy with no sum was written by a build that replaced
    it at every start, so no edit of it can have lasted: it is still ours."""
    path = Path(target)
    mark = path.with_name(f".{path.name}.written")
    try:
        body = SOURCE.read_text("utf-8")
        if path.exists():
            now = path.read_text("utf-8")
            if mark.exists() and mark.read_text("utf-8").strip() != _sum(now):
                _LOGGER.info(
                    "blueprint at %s left as it is: it has been changed since it was"
                    " written (delete it to have the current one)",
                    path,
                )
                return
            if now == body:
                if not mark.exists():  # from now on an edit to it is seen
                    mark.write_text(_sum(body), "utf-8")
                return
        path.parent.mkdir(parents=True, exist_ok=True)
        # Replaced whole: Home Assistant never reads half a file. Not *.yaml until then.
        part = path.with_name(path.name + ".tmp")
        part.write_text(body, "utf-8")
        part.replace(path)
        mark.write_text(_sum(body), "utf-8")
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Love it or Loathe it written at %s", path)
