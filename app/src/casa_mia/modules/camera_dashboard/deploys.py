"""camera_dashboard: Deploys: start, the page's view, saving the draft and deploying it."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from ..compositor import (
    Compositor,
)
from .backups import Backups
from .checks import problems
from .common import (
    DEFAULTS,
    DEPLOYS,
    MAX_KEEP,
    SETTINGS,
    BadRequest,
    Response,
    Store,
    _json,
    with_defaults,
)
from .dashboard import build_dashboard, menu_cameras

_LOGGER = logging.getLogger(__name__)


class Deploys(Backups):
    def start(self) -> None:
        """Load the draft, with the cameras and commanders as their pages have them."""
        if self.commander:  # it tells of the cameras' changes too
            self.commander.listeners.append(self._take)
        elif self.cameras:
            self.cameras.listeners.append(lambda _: self._take())
        self._prune()  # to what is kept now (it used to be 20 each)
        try:
            if self.draft_path.exists():
                self.store = with_defaults(json.loads(self.draft_path.read_text()))
            else:
                _LOGGER.info("camera dashboard: starting empty")
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
            # Never overwrite a store we could not read.
            self._error = f"cannot read {self.draft_path.name}: {exc}"
            _LOGGER.error("camera dashboard: %s", self._error)
            return
        self._take()
        _LOGGER.info(
            "camera dashboard: %d cameras, %d commanders (%d cameras in them), "
            "dashboard /%s",
            len(self.store["cameras"]),
            len(self.store["commanders"]),
            len(menu_cameras(self.store)),
            self.store["dashboard"],
        )

    def view(self) -> dict[str, Any]:
        def up(comp: Compositor | None) -> bool:
            return bool(comp and comp.health()["state"] != "offline")

        health = self.health()
        with self._lock:
            store = self.store
        return {
            **health,
            "store": store,
            "problems": problems(store),
            "preview_dashboard": store["dashboard"] + "-preview",
            "previewed": self.deploys().get("preview"),
            "preview_backup": next(
                (b["saved"] for b in self._kept(preview=True)), None
            ),
            "keep": self.keep(),
            "max_keep": MAX_KEEP,
            "compositor": {
                "live": up(self.live),
                "host": store["compositor_host"] or self.lan_host(),
            },
        }

    def _save(self, body: Store) -> Response:
        store = with_defaults(body)  # only known settings: the page sends back all
        store.update(self._theirs())  # theirs, whatever the page sent
        if not isinstance(store["cameras"], dict):
            raise BadRequest("cameras must be an object.")
        try:
            found = problems(store)
        except (AttributeError, KeyError, TypeError) as exc:
            raise BadRequest(f"Not a camera dashboard: {exc}") from exc
        with self._lock:
            if self._error:
                raise BadRequest(
                    f"{self.draft_path.name} could not be read; fix it first."
                )
            before = self.store
            self.store = store
            self._write(self.draft_path, store)
        _LOGGER.info(
            "camera dashboard: draft saved (%d cameras; changed: %s)%s",
            len(store["cameras"]),
            ", ".join(k for k in DEFAULTS if before.get(k) != store.get(k))
            or "nothing",
            f"; {len(found)} problems" if found else "",
        )
        return _json(200, self.view())

    def _revert(self) -> Response:
        """Throw the draft away: back to what is deployed live."""
        if not self.live_path.exists():
            raise BadRequest("Nothing has been deployed yet.")
        store = with_defaults(json.loads(self.live_path.read_text()))
        store.update(self._theirs())  # theirs, not what was deployed
        with self._lock:
            self.store = store
            self._write(self.draft_path, store)
        _LOGGER.info("camera dashboard: draft reverted to the live config")
        return _json(200, self.view())

    def _theirs(self) -> dict[str, Any]:
        """What the draft takes from the other pages: the cameras (Cameras), the
        commanders and their pictures' address (Camera Commander)."""
        if self.commander:
            full = self.commander.full()
            return {k: full[k] for k in ("cameras", "commanders", "compositor_host")}
        return {"cameras": self.cameras.cameras()} if self.cameras else {}

    def _take(self) -> None:
        """The Cameras or Camera Commander page changed: the draft takes theirs. The
        dashboards show the commanders' new pictures at once (the live compositor's), and
        take the rest (tap zones, camera pages) at their next deploy."""
        theirs = self._theirs()
        with self._lock:
            if self._error or all(self.store.get(k) == v for k, v in theirs.items()):
                return
            self.store = {**self.store, **theirs}
            self._write(self.draft_path, self.store)
        _LOGGER.info(
            "camera dashboard: the draft took the changes to %s",
            ", ".join(sorted(theirs)),
        )

    def deploy(self, live: bool) -> dict[str, Any]:
        """Save the dashboard into HA (creating it if missing, keeping a copy of what it
        replaces). Live also keeps the draft as what is deployed (the commanders' live
        pictures are Camera Commander's, shown as soon as they are saved there)."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            store = self.store
        if found := problems(store):
            raise BadRequest("Fix these first: " + " ".join(found))
        url_path, base = self._target(store, live)
        target = "live" if live else "preview"
        config = build_dashboard(store, base, url_path, self._selects(store))
        (boards,) = self.ha.call({"type": "lovelace/dashboards/list"})
        if url_path not in [b.get("url_path") for b in boards]:
            self.ha.call(
                {
                    "type": "lovelace/dashboards/create",
                    "url_path": url_path,
                    "title": store["title"] + ("" if live else " (preview)"),
                    "icon": "mdi:cctv",
                    "show_in_sidebar": True,
                    "require_admin": not live,
                }
            )
            _LOGGER.info("camera dashboard: created dashboard /%s", url_path)
        else:
            self._backup(url_path)
        self.ha.call(
            {"type": "lovelace/config/save", "url_path": url_path, "config": config}
        )
        _LOGGER.info(
            "camera dashboard: deployed /%s (%d views, composites from %s)",
            url_path,
            len(config["views"]),
            base,
        )
        with self._lock:
            stamp = datetime.now().isoformat(timespec="seconds")
            self._write(self.dir / DEPLOYS, self.deploys() | {target: stamp})
            if live:
                self._write(self.live_path, store)
        return {"url_path": url_path, "views": len(config["views"]), **self.view()}

    def remove_preview(self) -> dict[str, Any]:
        """Delete the preview dashboard from HA, and the backup of it (there would be
        nothing to put it back on). The live dashboard and the draft are untouched."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            url_path = self.store["dashboard"] + "-preview"
        (boards,) = self.ha.call({"type": "lovelace/dashboards/list"})
        board = next((b for b in boards if b.get("url_path") == url_path), None)
        if board is not None:
            self.ha.call(
                {"type": "lovelace/dashboards/delete", "dashboard_id": board["id"]}
            )
            _LOGGER.info(
                "camera dashboard: removed the preview dashboard /%s", url_path
            )
        else:
            _LOGGER.info(
                "camera dashboard: no preview dashboard /%s to remove", url_path
            )
        with self._lock:
            deploys = self.deploys()
            deploys.pop("preview", None)
            self._write(self.dir / DEPLOYS, deploys)
        for p in self._files(url_path):
            p.unlink()
        return self.view()

    def set_keep(self, keep: Any) -> dict[str, Any]:
        if (
            not isinstance(keep, int)
            or isinstance(keep, bool)
            or not 0 <= keep <= MAX_KEEP
        ):
            raise BadRequest(f"keep must be a whole number from 0 to {MAX_KEEP}.")
        self._write(self.dir / SETTINGS, {"keep": keep})
        _LOGGER.info("camera dashboard: keeping %d older live versions", keep)
        self._prune()
        return self.view()

    def revert_preview(self) -> dict[str, Any]:
        """Put the preview dashboard back as it was before its last deploy. Doing it
        again puts it forward, as the config it replaces is kept."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        if not (kept := self._kept(preview=True)):
            raise BadRequest("The preview has no earlier version.")
        self._put_back(kept[0]["name"])
        return self.view()
