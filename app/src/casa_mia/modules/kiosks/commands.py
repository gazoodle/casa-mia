"""Commands sent to a kiosk: install an update, use the firmware server, reload the page."""

from __future__ import annotations

import json
import logging
import threading
from datetime import UTC, datetime
from typing import Any

from .backups import Backups
from .common import (
    EVERYWHERE,
    Response,
    _json,
)

_LOGGER = logging.getLogger(__name__)


class Commands(Backups):
    def _command(self, k: dict[str, Any], token: str, name: str) -> dict[str, Any]:
        """Run one of the kiosk's remote commands (POST /api/commands/<name>): its
        answer, or {ok: False, error} when it fails or doesn't answer."""
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

    def update(self, kid: str) -> Response:
        """Ask the kiosk to check its update source (the firmware server) and install
        what it finds, as its own Updates button does."""
        k, token = self.kiosks.get(kid), self.tokens.get(kid)
        if not k or not token:
            return _json(409, {"error": "Not logged in to that kiosk."})

        checked = self._command(k, token, "checkUpdateNow")
        if checked.get("ok") is False:
            _LOGGER.warning(
                "kiosk %s: update check failed: %s", k["name"], checked.get("error")
            )
            return _json(502, {"error": f"Update check failed: {checked.get('error')}"})
        started = self._command(k, token, "installUpdate")
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

    def run_everywhere(self, name: str) -> Response:
        """Run one of the Quick controls (EVERYWHERE) on every kiosk logged in, one after
        the other, in the background; the page follows it in the view's `everywhere`."""
        if name not in EVERYWHERE:
            return _json(400, {"error": f"{name!r} is not one of the commands."})
        with self._lock:
            if self.everywhere and self.everywhere.get("running"):
                return _json(
                    409, {"error": "A run is still going: wait for it to end."}
                )
            known = [
                (k, self.tokens[kid])
                for kid, k in sorted(self.kiosks.items(), key=lambda i: i[1]["name"])
                if kid in self.tokens
            ]
            run: dict[str, Any] = {
                "command": name,
                "started": datetime.now(UTC).isoformat(timespec="seconds"),
                "running": True,
                "total": len(known),
                "results": [],  # {name, ok, error}, in the order they ran
            }
            self.everywhere = run
        _LOGGER.info("run everywhere: %s on %d kiosk(s)", name, len(known))

        def go() -> None:
            for k, token in known:
                answer = self._command(k, token, name)
                ok = answer.get("ok") is not False
                error = None if ok else str(answer.get("error") or "no answer")
                (_LOGGER.info if ok else _LOGGER.warning)(
                    "kiosk %s: %s %s",
                    k["name"],
                    name,
                    "done" if ok else f"failed: {error}",
                )
                with self._lock:
                    run["results"].append({"name": k["name"], "ok": ok, "error": error})
            with self._lock:
                run["running"] = False
            _LOGGER.info(
                "run everywhere: %s done (%d of %d answered)",
                name,
                sum(r["ok"] for r in run["results"]),
                len(known),
            )

        threading.Thread(target=go, name="kiosks-everywhere", daemon=True).start()
        return _json(202, self.view())

    def reload_all(self, why: str) -> None:
        """Ask every kiosk logged in to reload its page (its `reload` command), in the
        background: e.g. after an update, when Home Assistant serves new cards, so a wall
        tablet nobody touches runs them, not the old ones it loaded."""
        known = [
            (k, self.tokens[kid])
            for kid, k in self.kiosks.items()
            if kid in self.tokens
        ]
        _LOGGER.info("reloading %d kiosk(s): %s", len(known), why)

        def reload() -> None:
            for k, token in known:
                answer = self._command(k, token, "reload")
                if answer.get("ok") is False:
                    _LOGGER.warning(
                        "kiosk %s: not reloaded: %s", k["name"], answer.get("error")
                    )
                else:
                    _LOGGER.info("kiosk %s: reloaded (%s)", k["name"], why)

        threading.Thread(target=reload, name="kiosks-reload", daemon=True).start()
