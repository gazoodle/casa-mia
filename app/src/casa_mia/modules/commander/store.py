"""commander: Base: the commanders' store, saving them, and the live compositor's config."""

from __future__ import annotations

import copy
import json
import logging
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA
from ..cameras import Cameras
from ..compositor import (
    EMPTY_COMMANDER,
    LIVE_STORE,
    PANELS,
    PORT,
    Compositor,
    commander_cameras,
    commanders_of,
)
from .checks import problems
from .common import OLD_STORES, STORE, BadRequest

_LOGGER = logging.getLogger(__name__)

DEFAULTS: dict[str, Any] = {
    "commanders": [EMPTY_COMMANDER],  # in order: the dashboard's first pages
    "compositor_host": "",  # the pictures' address; blank: this box's LAN address
}


class Base:
    def __init__(
        self,
        config_dir: Path,
        ha: HA | None,
        cameras: Cameras,
        lan_host: Callable[[], str | None],
        live: Compositor | None = None,
        state_path: Path | None = None,
        dashboard: Callable[[], str | None] = lambda: None,
    ) -> None:
        self.dir = config_dir
        self.ha = ha
        self.cameras = cameras  # the cameras the commanders show (the Cameras page)
        self.lan_host = lan_host
        self.live = live  # the compositor drawing them for the cards and the dashboard
        self.state_path = state_path  # each commander's main camera, kept over restarts
        # The camera dashboard's address, for each camera's live page (None: no dashboard).
        self.dashboard = dashboard
        self.listeners: list[Callable[[], None]] = []  # told after every change
        self._lock = threading.Lock()
        self._error: str | None = None
        self._mains: dict[str, str] = {}  # commander id -> main camera, as chosen
        self._live_was: bool | None = None  # live_main as last looked
        self.store: dict[str, Any] = copy.deepcopy(DEFAULTS)

    @property
    def path(self) -> Path:
        return self.dir / STORE

    def load(self) -> None:
        """The commanders; the first time, moved from what the Camera Dashboard deployed
        live (else its draft), so what is on the walls stays as it is."""
        try:
            if self.path.exists():
                self.store = {**DEFAULTS, **json.loads(self.path.read_text())}
                return
            for name in OLD_STORES:
                if (self.dir / name).exists():
                    old = json.loads((self.dir / name).read_text())
                    self.store = {
                        # each with every setting; one from before there were several
                        "commanders": commanders_of(old),
                        "compositor_host": old.get("compositor_host", ""),
                    }
                    self._write(self.path, self.store)
                    _LOGGER.info(
                        "commander: moved %d commanders from %s to %s (that file is left "
                        "as it was)",
                        len(self.store["commanders"]),
                        name,
                        STORE,
                    )
                    return
        except (OSError, ValueError, AttributeError) as exc:
            # Never overwrite a store we could not read.
            self._error = f"cannot read the commanders: {exc}"
            _LOGGER.error("commander: %s", self._error)

    def full(self) -> dict[str, Any]:
        """The commanders with the cameras they show: what the compositor draws from."""
        with self._lock:
            store = copy.deepcopy(self.store)
        return {"cameras": self.cameras.cameras(), **store}

    def _target(self) -> tuple[str, str]:
        """The camera dashboard's url_path ("" with no dashboard) and the pictures'
        address (BadRequest while the box's address is not known)."""
        url_path = self.dashboard() or ""
        host = self.store["compositor_host"] or self.lan_host()
        if not host:
            raise BadRequest(
                "This box's LAN address is not known; set the compositor host."
            )
        return url_path, f"http://{host}:{self.live.port if self.live else PORT}"

    def save(self, body: dict[str, Any]) -> dict[str, Any]:
        """Save the commanders (the page sends them all) and show them live at once."""
        store = {k: body.get(k, v) for k, v in DEFAULTS.items()}
        if not isinstance(store["commanders"], list):
            raise BadRequest("commanders must be a list.")
        self._record_shapes(store)
        found = problems({"cameras": self.cameras.cameras(), **store})
        if found:
            raise BadRequest("Fix these first: " + " ".join(found))
        with self._lock:
            if self._error:
                raise BadRequest(f"{STORE} could not be read; fix it first.")
            before, self.store = self.store, store
            self._write(self.path, store)
        _LOGGER.info(
            "commander: saved %d commanders (changed: %s)",
            len(store["commanders"]),
            ", ".join(k for k in DEFAULTS if before.get(k) != store.get(k))
            or "nothing",
        )
        self.publish()
        return store

    def take_cameras(self, cameras: dict[str, Any]) -> None:
        """The Cameras page changed them: a removed camera leaves the commanders, and the
        live compositor draws the cameras as they are now."""
        with self._lock:
            gone = {
                e
                for cmd in self.store["commanders"]
                for e in commander_cameras({**EMPTY_COMMANDER, **cmd})
            } - set(cameras)
            if gone and not self._error:
                for cmd in self.store["commanders"]:
                    for panel in PANELS:
                        if panel in cmd:
                            cmd[panel]["cameras"] = [
                                e for e in cmd[panel]["cameras"] if e not in gone
                            ]
                    if cmd.get("main") in gone:
                        cmd["main"] = ""
                self._write(self.path, self.store)
                _LOGGER.info(
                    "commander: removed from the commanders: %s",
                    ", ".join(sorted(gone)),
                )
        self.publish()

    def publish(self) -> None:
        """Write the live compositor's config (the commanders and the cameras), have it
        redraw, and tell the listeners."""
        if self._error:
            return
        try:
            self._write(self.dir / LIVE_STORE, self.full())
        except OSError as exc:
            _LOGGER.error("commander: cannot write %s: %s", LIVE_STORE, exc)
            return
        if self.live:
            self.live.reload()
        for tell in self.listeners:
            tell()

    def _record_shapes(self, store: dict[str, Any]) -> None:
        """Note each commander camera's natural shape in the store (from the stills the
        compositor keeps), so the picture and the dashboard's tap zones lay out the same
        way when the main camera sets its own size. A shape not known yet keeps the one
        recorded before (16:9 until there is one)."""
        comp = self.live
        cmds = store.get("commanders")
        if not isinstance(cmds, list) or not comp:
            return
        for cmd in cmds:
            if not isinstance(cmd, dict):
                continue
            shapes = dict(cmd.get("aspects") or {})
            for e in commander_cameras({**EMPTY_COMMANDER, **cmd}):
                if (shape := comp.aspect(e)) is not None:
                    shapes[e] = shape
            cmd["aspects"] = shapes

    def _write(self, path: Path, data: Any) -> None:
        """Save atomically."""
        tmp = path.with_name(path.name + ".tmp")
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(data, indent=1))
        tmp.replace(path)
