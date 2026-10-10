"""The guest-login admin API's bottom layer: the QR codes it draws (each endpoint's, the
Wi-Fi's, any Home Assistant page's) and the printable guest card. GuestAPI extends it."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ... import qr, swap
from .common import PORT, BadRequest, _norm, welcome_title
from .login import GuestLogin
from .printing import card_page, card_svg, wifi_text

_LOGGER = logging.getLogger(__name__)

Response = tuple[int, str, bytes]


class Codes:
    def __init__(
        self,
        guest: GuestLogin,
        data: dict[str, Any],
        media_dir: Path,
        lan_host: Callable[[], str | None],
    ) -> None:
        self.guest = guest
        self.data = data
        self.media_dir = media_dir
        self.lan_host = lan_host

    def qr_host(self) -> str:
        return self.data.get("qr_host") or self.lan_host() or "homeassistant.local"

    def qr_text(self, ep: dict[str, Any]) -> str:
        """The address a QR code carries. A printed-QR endpoint keeps the exact old form."""
        base = f"http://{self.qr_host()}:{PORT}"
        if ep.get("legacy"):
            return f"{base}/?d=/{_norm(ep['dashboard'])}"
        return f"{base}/e/{ep['slug']}"

    def wifi_qr(self, name: str) -> Response:
        """The saved Wi-Fi network's QR code: a phone's camera offers to join it."""
        if not self.data["wifi"].get("ssid"):
            return _json(404, {"error": "No Wi-Fi network saved yet."})
        text = swap.out(wifi_text(self.data["wifi"]))
        if name.endswith(".svg"):
            return 200, "image/svg+xml", qr.svg(text)
        return 200, "image/png", qr.png(text)

    def card(self, name: str) -> Response:
        """The guest card for an endpoint: card/<id>.svg, or card/<id> to print."""
        ep_id = name.removesuffix(".svg")
        ep = next((e for e in self.data["endpoints"] if e["id"] == ep_id), None)
        if ep is None:
            return _json(404, {"error": "No such endpoint."})
        title = ep.get("title") or self.data["welcome"].get("title") or welcome_title()
        svg = swap.out(
            card_svg(title, self.data["wifi"], self.qr_text(ep), ep["label"]).decode()
        ).encode()
        if name.endswith(".svg"):
            return 200, "image/svg+xml", svg
        return 200, "text/html; charset=utf-8", card_page(svg, f"{ep['label']} card")

    def page_qr(self, method: str, name: str, query: dict[str, list[str]]) -> Response:
        """A QR code for any page of Home Assistant (a dashboard, a view), at the QR host:
        GET page-qr/code.svg|png?path=..., or POST page-qr/media?path=... to save it."""
        path = "/" + _norm((query.get("path") or [""])[0])
        if not re.match(r"^/[A-Za-z0-9._~/?=&%-]*$", path):
            raise BadRequest("A path inside Home Assistant, such as /lovelace/hall.")
        port = self.guest.ha_port()
        text = f"http://{self.qr_host()}" + ("" if port == 80 else f":{port}") + path
        if method == "GET" and name in ("code.svg", "code.png"):
            shown = swap.out(text)
            if name == "code.svg":
                return 200, "image/svg+xml", qr.svg(shown)
            return 200, "image/png", qr.png(shown)
        if method == "POST" and name == "media":
            file = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-") or "home"
            rel = f"casa-mia/page-qr/{file}.png"
            try:
                (self.media_dir / rel).parent.mkdir(parents=True, exist_ok=True)
                (self.media_dir / rel).write_bytes(qr.png(text))
            except OSError as exc:
                return _json(
                    500, {"error": f"Could not write to the media folder: {exc}"}
                )
            _LOGGER.info("guest login: QR code for %s saved to /media/%s", path, rel)
            return _json(
                200,
                {
                    "file": f"/media/{rel}",
                    "media_source": f"media-source://media_source/local/{rel}",
                    "url": text,
                },
            )
        return _json(404, {"error": "not found"})

    def qr(self, method: str, rest: list[str]) -> Response:
        name = rest[0]
        ep_id, _, kind = name.rpartition(".")
        if method == "POST" and rest[1:] == ["media"]:
            ep_id, kind = name, "png"
        ep = next((e for e in self.data["endpoints"] if e["id"] == ep_id), None)
        if ep is None or kind not in ("png", "svg"):
            return _json(404, {"error": "No such endpoint."})
        text = self.qr_text(ep)
        if method == "GET":
            shown = swap.out(text)  # a screenshot's code must not scan to the real one
            return (
                (200, "image/svg+xml", qr.svg(shown))
                if kind == "svg"
                else (200, "image/png", qr.png(shown))
            )
        if method == "POST" and rest[1:] == ["media"]:
            folder = self.media_dir / "casa-mia" / "guest-qr"
            try:
                folder.mkdir(parents=True, exist_ok=True)
                (folder / f"{ep_id}.png").write_bytes(qr.png(text))
            except OSError as exc:
                return _json(
                    500, {"error": f"Could not write to the media folder: {exc}"}
                )
            rel = f"casa-mia/guest-qr/{ep_id}.png"
            return _json(
                200,
                {
                    "file": f"/media/{rel}",
                    "media_source": f"media-source://media_source/local/{rel}",
                },
            )
        return _json(404, {"error": "not found"})


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
