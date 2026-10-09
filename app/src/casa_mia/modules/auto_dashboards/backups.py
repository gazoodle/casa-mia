"""auto_dashboards: Backups: the dashboards' configs kept before each deploy."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from ...ha import HAError
from .common import BACKUPS, DEFAULT_KEEP, MAX_KEEP, PREVIEW, SETTINGS, BadRequest
from .store import Base

_LOGGER = logging.getLogger(__name__)


class Backups(Base):
    # -- the dashboards' configs before each deploy

    def keep(self) -> int:
        """How many older versions of the live dashboard are kept (0 to MAX_KEEP)."""
        try:
            keep = int(json.loads((self.dir / SETTINGS).read_text())["keep"])
        except (OSError, ValueError, KeyError, TypeError):
            return DEFAULT_KEEP
        return min(max(keep, 0), MAX_KEEP)

    def _files(self, url_path: str) -> list[Path]:
        folder = self.dir / BACKUPS
        return sorted(folder.glob(f"{url_path}-[0-9]*.json")) if folder.is_dir() else []

    def _prune(self) -> None:
        """Drop the backups beyond what is kept: one per preview, `keep` per live."""
        folder = self.dir / BACKUPS
        found: dict[str, list[Path]] = {}
        for p in sorted(folder.glob("*.json")) if folder.is_dir() else []:
            found.setdefault(p.name[: -len("-YYYYmmdd-HHMMSS.json")], []).append(p)
        for url_path, files in found.items():
            keep = 1 if url_path.endswith(PREVIEW) else self.keep()
            for p in files[: -keep or None]:
                p.unlink()
                _LOGGER.info("auto dashboards: pruned %s", p.name)

    def _backup(self, url_path: str) -> None:
        assert self.ha
        preview = url_path.endswith(PREVIEW)
        if not preview and self.keep() == 0:
            return
        try:
            (config,) = self.ha.call({"type": "lovelace/config", "url_path": url_path})
        except HAError as exc:  # an empty dashboard has no config yet
            _LOGGER.info("auto dashboards: nothing to keep of /%s (%s)", url_path, exc)
            return
        folder = self.dir / BACKUPS
        folder.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = folder / f"{url_path}-{stamp}.json"
        path.write_text(json.dumps({"url_path": url_path, "config": config}))
        _LOGGER.info("auto dashboards: kept /%s's config as %s", url_path, path.name)
        self._prune()

    def _kept(self, preview: bool) -> list[dict[str, Any]]:
        """The kept configs, newest first: the preview's, or the live dashboard's."""
        folder = self.dir / BACKUPS
        return (
            [
                {
                    "name": p.name,
                    "url_path": p.name[: -len("-YYYYmmdd-HHMMSS.json")],
                    "saved": datetime.fromtimestamp(p.stat().st_mtime).isoformat(
                        timespec="seconds"
                    ),
                }
                for p in sorted(folder.glob("*.json"), reverse=True)
                if p.name[: -len("-YYYYmmdd-HHMMSS.json")].endswith(PREVIEW) == preview
            ]
            if folder.is_dir()
            else []
        )

    def backups(self) -> list[dict[str, Any]]:
        """The live dashboard's kept configs (the preview's one is revert_preview's)."""
        return self._kept(preview=False)

    def _put_back(self, name: str) -> None:
        assert self.ha
        kept = json.loads((self.dir / BACKUPS / name).read_text())
        self._backup(kept["url_path"])
        self.ha.call(
            {
                "type": "lovelace/config/save",
                "url_path": kept["url_path"],
                "config": kept["config"],
            }
        )
        _LOGGER.info("auto dashboards: restored /%s from %s", kept["url_path"], name)

    def restore(self, name: str) -> dict[str, Any]:
        """Put a kept live dashboard config back (keeping the current one first, if
        any are kept). The compositor's config is not changed: revert the draft and
        deploy for that."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        if name not in [b["name"] for b in self.backups()]:
            raise BadRequest("No such backup.")
        self._put_back(name)
        return {"backups": self.backups()}
