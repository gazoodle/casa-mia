"""camera_dashboard: CameraDashboard: the admin page's API and the previews."""

from __future__ import annotations

import json
import logging
from typing import Any

from ...ha import HAError
from ..compositor import (
    config_from_store,
    mime,
)
from .checks import problems
from .commanders import commander_entities
from .common import (
    BadRequest,
    Response,
    Store,
    _json,
    with_defaults,
)
from .dashboard import build_dashboard, to_yaml
from .deploys import Deploys

_LOGGER = logging.getLogger(__name__)


class CameraDashboard(Deploys):
    # -- the admin page's API

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            parts = [p for p in path.strip("/").split("/") if p]
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            return self._route(method, parts, query, payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            _LOGGER.warning("camera dashboard: %s", exc)
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})

    def _route(
        self, method: str, parts: list[str], query: dict[str, list[str]], body: Store
    ) -> Response:
        if method == "GET" and parts == []:
            return _json(200, self.view())
        if method == "PUT" and parts == []:
            return self._save(body)
        if method == "GET" and parts == ["ha"]:
            return _json(200, self.from_ha())
        if method == "GET" and parts == ["yaml"]:
            live = (query.get("target") or ["live"])[0] == "live"
            with self._lock:
                store = self.store
            if found := problems(store):
                raise BadRequest("Fix these first: " + " ".join(found))
            url_path, base = self._target(store, live)
            text = to_yaml(build_dashboard(store, base, url_path, self._selects(store)))
            return 200, "text/yaml; charset=utf-8", text.encode()
        if method == "POST" and parts == ["switch"]:
            return _json(200, self._flip(body))
        if method == "POST" and parts == ["render"]:
            return self._render(body)
        if method == "POST" and parts == ["deploy"]:
            target = body.get("target")
            if target not in ("preview", "live"):
                raise BadRequest("target must be preview or live.")
            return _json(200, self.deploy(target == "live"))
        if method == "POST" and parts == ["remove-preview"]:
            return _json(200, self.remove_preview())
        if method == "GET" and parts == ["backups"]:
            return _json(200, {"backups": self.backups()})
        if method == "POST" and parts == ["restore"]:
            return _json(200, self.restore(str(body.get("name") or "")))
        if method == "POST" and parts == ["revert-preview"]:
            return _json(200, self.revert_preview())
        if method == "PUT" and parts == ["keep"]:
            return _json(200, self.set_keep(body.get("keep")))
        if method == "POST" and parts == ["revert"]:
            return self._revert()
        return _json(404, {"error": "Not found."})

    # -- previews

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
        _LOGGER.info("camera dashboard: %s switched %s", entity, "on" if on else "off")
        return {"entity": entity, "on": on}

    def _render(self, body: dict[str, Any]) -> Response:
        """A live preview: one commander (`index`, its place) drawn by the draft
        compositor from the page's unsaved edits ({"store", "index"})."""
        if not self.draft:
            return _json(404, {"error": "No previews: the draft compositor is off."})
        try:
            store = with_defaults(body.get("store") or {})
            self._record_shapes(store)
            index = body.get("index", 0)
            if not isinstance(index, int):
                raise ValueError("index must be a number")
            image = self.draft.render(config_from_store(store), index)
        except (ValueError, TypeError, AttributeError, KeyError) as exc:
            return _json(422, {"error": str(exc)})
        except (RuntimeError, TimeoutError) as exc:
            return _json(502, {"error": f"The draft compositor: {exc}"})
        return 200, mime(image), image  # WebP when it has transparent gaps
