"""Commands sent to a kiosk: install an update, use the firmware server."""

from __future__ import annotations

import json
import logging
from typing import Any

from .backups import Backups
from .common import (
    Response,
    _json,
)

_LOGGER = logging.getLogger(__name__)


class Commands(Backups):
    def update(self, kid: str) -> Response:
        """Ask the kiosk to check its update source (the firmware server) and install
        what it finds, as its own Updates button does."""
        k, token = self.kiosks.get(kid), self.tokens.get(kid)
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})

        def command(name: str) -> dict[str, Any]:
            try:
                status, data = self._request(
                    k["address"], f"/api/commands/{name}", "POST", b"{}", token, 30
                )
                answer = json.loads(data or b"{}")
            except (OSError, ValueError) as exc:
                return {"ok": False, "error": str(exc)}
            _LOGGER.debug("kiosk %s: %s -> %d %s", k["name"], name, status, answer)
            if status != 200:
                return {
                    "ok": False,
                    "error": answer.get("error") or f"answered {status}",
                }
            return answer

        checked = command("checkUpdateNow")
        if checked.get("ok") is False:
            _LOGGER.warning(
                "kiosk %s: update check failed: %s", k["name"], checked.get("error")
            )
            return _json(502, {"error": f"Update check failed: {checked.get('error')}"})
        started = command("installUpdate")
        error = str(started.get("error") or "")
        if started.get("ok") is False and "already running" not in error:
            _LOGGER.warning("kiosk %s: update not started: %s", k["name"], error)
            return _json(502, {"error": f"The update did not start: {error}"})
        available = (checked.get("data") or {}).get("availableVersion")
        _LOGGER.info(
            "kiosk %s: updating from %s to %s",
            k["name"],
            k.get("version"),
            available or "the latest",
        )
        return _json(200, {"started": True, "version": available})

    def use_firmware_server(self, kid: str) -> Response:
        """Point a fleet leader's updates at the firmware server (Update source: Custom
        repository, at the server's address). Its followers take both settings from it."""
        k, token, url = self.kiosks.get(kid), self.tokens.get(kid), self.firmware_url()
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})
        if not k.get("leader"):
            return _json(409, {"error": f"{k['name']} does not lead a fleet."})
        if not url:
            return _json(409, {"error": "The firmware server is off."})
        body = {"update.source": "custom", "update.source_url": url}
        try:
            status, data = self._request(
                k["address"], "/api/settings", "PATCH", json.dumps(body).encode(), token
            )
        except OSError as exc:
            status, data = 0, str(exc).encode()
        if status != 200:
            _LOGGER.warning(
                "kiosk %s: updates not pointed at %s: %s %r",
                k["name"],
                url,
                status or "no answer",
                data[:200],
            )
            return _json(502, {"error": f"The kiosk answered {status or 'nothing'}."})
        _LOGGER.info(
            "kiosk %s: updates now from the firmware server at %s (its fleet follows)",
            k["name"],
            url,
        )
        return _json(200, {"url": url})
