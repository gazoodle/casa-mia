"""commander: Commander: start, and the admin page's API (the commanders, their preview,
their Track motion switches)."""

from __future__ import annotations

import json
import logging
import threading
from typing import Any

from ...ha import HAError
from ..compositor import EMPTY_COMMANDER, Compositor, config_from_store, mime
from .checks import problems
from .common import BadRequest, Response, _json, commander_entities
from .live import Live

_LOGGER = logging.getLogger(__name__)


class Commander(Live):
    def start(self) -> None:
        """Load the commanders, and each one's main camera as it was; watch live_main;
        and give the live compositor its config."""
        self.cameras.listeners.append(self.take_cameras)
        if self.live:
            threading.Thread(
                target=self._watch_live_main, name="live main", daemon=True
            ).start()
        self.load()
        if self.live and self.state_path and self.state_path.exists():
            try:
                kept = json.loads(self.state_path.read_text())
                # {"main": camera}: kept before there were several (the first one's)
                mains = kept.get("mains") or (
                    {"": kept["main"]} if kept.get("main") else {}
                )
            except (OSError, ValueError, AttributeError):
                mains = {}
            self._mains = {str(k): str(v) for k, v in mains.items()}
            for cid, main in self._mains.items():
                for comp in (self.live, self.draft):
                    if comp:
                        comp.set_main(main, cid)
                _LOGGER.info("commander %r: main camera %s (as it was)", cid, main)
        self.publish()
        _LOGGER.info("commander: %d commanders", len(self.store["commanders"]))

    def view(self) -> dict[str, Any]:
        def up(comp: Compositor | None) -> bool:
            return bool(comp and comp.health()["state"] != "offline")

        full = self.full()
        return {
            "store": {k: full[k] for k in ("commanders", "compositor_host")},
            "cameras": full["cameras"],
            "problems": problems(full),
            "error": self._error,
            "empty_commander": EMPTY_COMMANDER,  # what a blank new one starts as
            "host": full["compositor_host"] or self.lan_host(),
            "compositor": up(self.live),
        }

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            parts = [p for p in path.strip("/").split("/") if p]
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            if method == "GET" and parts == []:
                return _json(200, self.view())
            if method == "PUT" and parts == []:
                self.save(payload)
                return _json(200, self.view())
            if method == "GET" and parts == ["ha"]:
                return _json(200, self.from_ha())
            if method == "POST" and parts == ["switch"]:
                return _json(200, self._flip(payload))
            if method == "POST" and parts == ["render"]:
                return self._render(payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            _LOGGER.warning("commander: %s", exc)
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})
        return _json(404, {"error": "Not found."})

    def from_ha(self) -> dict[str, Any]:
        """Each commander's Main camera select and Track motion switch, and their states
        as HA has them now."""
        if self.ha is None:
            return {"error": "Home Assistant is not reachable."}
        registry, states = self.ha.call(
            {"type": "config/entity_registry/list"}, {"type": "get_states"}
        )
        with self._lock:
            store = self.store
        selects = commander_entities(store, registry, "main")
        switches = commander_entities(store, registry, "track_motion")
        mine = {*selects.values(), *switches.values()}
        return {
            "commander_selects": selects,
            "commander_switches": switches,
            "entities": [
                {"entity": s["entity_id"], "state": s.get("state")}
                for s in states
                if s["entity_id"] in mine
            ],
            "error": None,
        }

    def _flip(self, body: dict[str, Any]) -> dict[str, Any]:
        """Turn one of the integration's commander switches (Track motion) on or off,
        through Home Assistant, which keeps its state."""
        entity, on = body.get("entity"), body.get("on")
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            store = self.store
        (registry,) = self.ha.call({"type": "config/entity_registry/list"})
        switches = set(commander_entities(store, registry, "track_motion").values())
        if entity not in switches or not isinstance(on, bool):
            raise BadRequest("Not one of the commanders' switches.")
        self.ha.call(
            {
                "type": "call_service",
                "domain": "switch",
                "service": "turn_on" if on else "turn_off",
                "target": {"entity_id": entity},
            }
        )
        _LOGGER.info("commander: %s switched %s", entity, "on" if on else "off")
        return {"entity": entity, "on": on}

    def _render(self, body: dict[str, Any]) -> Response:
        """A live preview: one commander (`index`, its place) drawn from the page's
        unsaved edits ({"store": {"commanders": [...]}, "index"}), with the cameras."""
        comp = self.live or self.draft
        if not comp:
            return _json(404, {"error": "No previews: the compositor is off."})
        try:
            edits = body.get("store") or {}
            store = {
                "cameras": self.cameras.cameras(),
                "commanders": edits.get("commanders") or [],
            }
            self._record_shapes(store)
            index = body.get("index", 0)
            if not isinstance(index, int):
                raise ValueError("index must be a number")
            image = comp.render(config_from_store(store), index)
        except (ValueError, TypeError, AttributeError, KeyError) as exc:
            return _json(422, {"error": str(exc)})
        except (RuntimeError, TimeoutError) as exc:
            return _json(502, {"error": f"The compositor: {exc}"})
        return 200, mime(image), image  # WebP when it has transparent gaps
