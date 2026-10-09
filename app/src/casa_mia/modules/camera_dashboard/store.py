"""camera_dashboard: Base: the module's files, paths and Home Assistant lookups."""

from __future__ import annotations

import json
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA
from ..compositor import (
    DRAFT_STORE,
    LIVE_STORE,
    PORT,
    Compositor,
)
from .cameras import ha_cameras, motion_sensors
from .checks import warnings
from .commanders import commander_entities, commander_selects
from .common import DEPLOYS, DRAFT_PORT, BadRequest, Store, with_defaults


class Base:
    def __init__(
        self,
        config_dir: Path,
        ha: HA | None,
        lan_host: Callable[[], str | None],
        live: Compositor | None = None,
        draft: Compositor | None = None,
        state_path: Path | None = None,
        helpers: Callable[[], set[str] | None] = set,
    ) -> None:
        self.dir = config_dir
        # the integration's dashboard helper scripts, as it says (None: not said yet)
        self.helpers = helpers
        self.state_path = state_path  # the commander's main camera, kept over restarts
        self.ha = ha
        self.lan_host = lan_host
        self.live = live
        self.draft = draft
        self._lock = threading.Lock()
        self._error: str | None = None
        self._mains: dict[str, str] = {}  # commander id -> main camera, as chosen
        # live_main as last looked (see check_live_main)
        self._live_was: bool | None = None
        self.store: Store = with_defaults({})

    @property
    def draft_path(self) -> Path:
        return self.dir / DRAFT_STORE

    @property
    def live_path(self) -> Path:
        return self.dir / LIVE_STORE

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

    def _selects(self, store: Store) -> dict[str, str]:
        """Each commander's Main camera select, from HA's entity registry."""
        if self.ha is None:
            return commander_selects(store, None)
        (registry,) = self.ha.call({"type": "config/entity_registry/list"})
        return commander_selects(store, registry)

    def from_ha(self) -> dict[str, Any]:
        """HA's cameras, users (for the wall tablets) and entities (for page controls)."""
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
            "cameras": ha_cameras(registry, states),
            "motion": motion_sensors(registry, states, list(store["cameras"])),
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
            "commander_selects": selects,
            "commander_switches": commander_entities(store, registry, "track_motion"),
            "error": None,
        }

    def _target(self, store: Store, live: bool) -> tuple[str, str]:
        """The dashboard's url_path and the composites' address for a deploy."""
        host = store["compositor_host"] or self.lan_host()
        if not host:
            raise BadRequest(
                "This box's LAN address is not known; set the compositor host."
            )
        comp, default = (self.live, PORT) if live else (self.draft, DRAFT_PORT)
        port = comp.port if comp else default
        url_path = store["dashboard"] + ("" if live else "-preview")
        return url_path, f"http://{host}:{port}"
