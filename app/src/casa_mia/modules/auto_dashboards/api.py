"""auto_dashboards: AutoDashboards: the admin page's API and the previews."""

from __future__ import annotations

import json
import logging

from ...ha import HAError
from .checks import problems
from .common import (
    BadRequest,
    Response,
    Store,
    _json,
)
from .dashboard import build_dashboard, to_yaml
from .deploys import Deploys

_LOGGER = logging.getLogger(__name__)


class AutoDashboards(Deploys):
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
            _LOGGER.warning("auto dashboards: %s", exc)
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
