"""auto_dashboards: Base: the module's files, paths and Home Assistant lookups."""

from __future__ import annotations

import json
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA
from ..cameras import Cameras
from ..commander import Commander, commander_selects
from ..compositor import (
    DRAFT_STORE,
    PORT,
    Compositor,
)
from .checks import warnings
from .common import DEPLOYED, DEPLOYS, BadRequest, Store, with_defaults


class Base:
    def __init__(
        self,
        config_dir: Path,
        ha: HA | None,
        lan_host: Callable[[], str | None],
        live: Compositor | None = None,
        helpers: Callable[[], set[str] | None] = set,
        cameras: Cameras | None = None,
        commander: Commander | None = None,
    ) -> None:
        self.dir = config_dir
        # The cameras (the Cameras page) and the commanders and their pictures' address
        # (the Camera Commander page): the draft takes a copy of each (Deploys._take).
        # None: the store's own (before those pages).
        self.cameras = cameras
        self.commander = commander
        # the integration's dashboard helper scripts, as it says (None: not said yet)
        self.helpers = helpers
        self.ha = ha
        self.lan_host = lan_host
        self.live = live
        self._lock = threading.Lock()
        self._error: str | None = None
        self.store: Store = with_defaults({})

    @property
    def draft_path(self) -> Path:
        return self.dir / DRAFT_STORE

    @property
    def live_path(self) -> Path:
        return self.dir / DEPLOYED

    def _write(self, path: Path, store: Store) -> None:
        """Save atomically."""
        tmp = path.with_name(path.name + ".tmp")
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(store, indent=1))
        tmp.replace(path)

    def _changed(self) -> bool:
        """Whether the draft differs from what is deployed live."""
        try:
            return with_defaults(json.loads(self.live_path.read_text())) != self.store
        except (OSError, ValueError):
            return True

    def deploys(self) -> dict[str, str]:
        """When the live and preview dashboards were last deployed from here."""
        try:
            return json.loads((self.dir / DEPLOYS).read_text())
        except (OSError, ValueError):
            return {}

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "offline" if self._error else "running",
                "error": self._error,
                "cameras": len(self.store["cameras"]),
                "deployed": self.deploys().get("live"),
                "changed": self._changed(),
            }

    def _selects(self, store: Store) -> dict[str, str]:
        """Each commander's Main camera select, from HA's entity registry."""
        if self.ha is None:
            return commander_selects(store, None)
        (registry,) = self.ha.call({"type": "config/entity_registry/list"})
        return commander_selects(store, registry)

    def from_ha(self) -> dict[str, Any]:
        """HA's users (for the wall tablets), entities (for the fields) and what the
        dashboard needs that HA seems to lack."""
        if self.ha is None:
            return {"error": "Home Assistant is not reachable."}
        registry, states, resources = self.ha.call(
            {"type": "config/entity_registry/list"},
            {"type": "get_states"},
            {"type": "lovelace/resources"},
        )
        users = self.ha.users()
        with self._lock:
            store = self.store
        selects = commander_selects(store, registry)
        return {
            "users": users,
            "warnings": warnings(
                store,
                {s["entity_id"] for s in states},
                [r.get("url", "") for r in resources or []],
                {u["id"] for u in users},
                self.helpers(),
                selects,
            ),
            "entities": sorted(
                (
                    {
                        "entity": s["entity_id"],
                        "name": s.get("attributes", {}).get("friendly_name")
                        or s["entity_id"],
                        "state": s.get("state"),
                    }
                    for s in states
                ),
                key=lambda e: e["entity"],
            ),
            "error": None,
        }

    def _target(self, store: Store, live: bool) -> tuple[str, str]:
        """The dashboard's url_path and the composites' address for a deploy."""
        host = store["compositor_host"] or self.lan_host()
        if not host:
            raise BadRequest(
                "This box's LAN address is not known; set the compositor host."
            )
        # the live compositor's pictures, for the preview dashboard too
        port = self.live.port if self.live else PORT
        url_path = store["dashboard"] + ("" if live else "-preview")
        return url_path, f"http://{host}:{port}"
