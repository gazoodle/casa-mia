"""guest-login: QR-code endpoints that log a visitor into Home Assistant.

Each endpoint (a guest suite, a KNX panel; configured on the admin page) is reached at
`/e/<slug>`, or, for the QR codes
already printed, at `/?d=<dashboard>`. A visitor's browser is sent to HA's own
`?auth_callback=1` URL carrying a login code obtained here from HA's login flow, so HA's
frontend completes the sign-in itself. Every endpoint is off until enabled (from the
integration, e.g. by an automation); its on/off state, and any timed opening, is kept in
a state file so it survives app restarts and updates. A disabled or unknown endpoint gets
the same blank "not available" page.

Rewrite of cnorick/ha-auto-guest-login's flow (described, not copied).
"""

from __future__ import annotations

import json
import logging
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from collections.abc import Callable
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from ... import swap
from .common import (
    ENGINEER_TITLE,
    GOODBYE_MESSAGE,
    GOODBYE_TITLE,
    GOODBYE_URL,
    HEADER_URL,
    INTERNAL_URL,
    PORT,
    RATE_LIMIT,
    RATE_WINDOW,
    TICK,
    WELCOME_DELAY,
    WELCOME_MESSAGE,
    Endpoint,
    LoginError,
    _norm,
    _shown,
    welcome_title,
)
from .page import header_jpeg, render_goodbye, render_welcome  # noqa: E402
from .signin import SignIn, _AwaitingCode

_LOGGER = logging.getLogger(__name__)


UNAVAILABLE = (
    b"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
    b"<title>Not available</title><p style='font:18px system-ui;text-align:center;"
    b"margin-top:30vh'>Not available.</p>"
)


class GuestLogin(SignIn):
    def __init__(
        self,
        endpoints: list[Endpoint],
        accounts: dict[str, tuple[str, str]],
        default_account: str = "house-guest",
        port: int = PORT,
        internal_url: str = INTERNAL_URL,
        ha_port: Callable[[], int] = lambda: 8123,
        on_login: Callable[[Endpoint, str], None] | None = None,
        ha_hosts: Callable[[], list[str]] = list,
        title: str | None = None,
        welcome_message: str = WELCOME_MESSAGE,
        welcome_delay: int = WELCOME_DELAY,
        state_path: Path | None = None,
        house_info: dict[str, str] | None = None,
    ) -> None:
        self.state_path = state_path
        # The house rules, for endpoints that show them.
        self.house_info = house_info or {}
        # Called (on its own thread) with an endpoint that has just closed, by hand or when
        # its time ran out: GuestAPI ends its sessions and gives it a new address.
        self.on_closed: Callable[[Endpoint], None] | None = None
        # The goodbye page's title and message, and an address to send visitors to instead.
        self.goodbye: dict[str, str] = {}
        # A login's HA user id, for the integration (GuestAPI knows them).
        self.user_of: Callable[[str], str | None] = lambda name: None
        super().__init__(accounts, default_account, internal_url, ha_port, ha_hosts)
        self.welcome = (title or welcome_title(), welcome_message, welcome_delay)
        self.endpoints = {e.id: e for e in endpoints}
        self.port = port
        self.on_login = on_login
        self._server: ThreadingHTTPServer | None = None
        self._error: str | None = None
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._stopping = threading.Event()
        self._load()

    # -- lifecycle

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                owner._get(self)

            def do_POST(self) -> None:
                owner._post(self)

            def log_message(self, format: str, *args: object) -> None:
                pass

        try:
            self._server = ThreadingHTTPServer(("0.0.0.0", self.port), Handler)
        except OSError as exc:
            self._error = f"cannot serve on :{self.port}: {exc}"
            _LOGGER.error(self._error)
            return
        self.port = self._server.server_port
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        self._stopping.clear()
        threading.Thread(target=self._ticker, name="guest-expiry", daemon=True).start()
        _LOGGER.info("guest login: %d endpoints on :%d", len(self.endpoints), self.port)
        self._report_config()

    def _report_config(self) -> None:
        """Say what is configured, and everything that stops an endpoint working."""
        if not self.endpoints:
            _LOGGER.warning(
                "guest login: no endpoints yet. Add them on the Guest login page "
                "(Casa Mia in the sidebar, or the app's Open web UI button)."
            )
        for ep in self.endpoints.values():
            account = ep.account or self.default_account
            problems = []
            if not (ep.legacy or ep.slug):
                problems.append("unreachable: give it a secret address or a printed QR")
            if account not in self.accounts:
                have = ", ".join(sorted(self.accounts)) or "none"
                problems.append(f"login '{account}' does not exist (have: {have})")
            ways = [
                w
                for w, on in (("legacy /?d=", ep.legacy), ("/e/<slug>", ep.slug))
                if on
            ]
            _LOGGER.log(
                logging.WARNING if problems else logging.INFO,
                "guest login endpoint %s (%s, %s) -> %s via %s%s",
                ep.id,
                ep.label,
                ep.type,
                _shown(ep),
                " and ".join(ways) or "nothing",
                "; PROBLEM: " + "; ".join(problems) if problems else "",
            )

    def stop(self) -> None:
        self._stopping.set()
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None

    def apply(
        self,
        endpoints: list[Endpoint],
        accounts: dict[str, tuple[str, str]],
        default_account: str,
        welcome: tuple[str, str, int] | None = None,
        house_info: dict[str, str] | None = None,
        goodbye: dict[str, str] | None = None,
    ) -> None:
        """Swap in new config without a restart. An endpoint keeps its on/off state and
        login count across the change as long as its id stays the same."""
        with self._lock:
            old = self.endpoints
            for ep in endpoints:
                if prev := old.get(ep.id):
                    ep.enabled, ep.until = prev.enabled, prev.until
                    ep.last_login, ep.logins = prev.last_login, prev.logins
            self.endpoints = {e.id: e for e in endpoints}
            self.accounts = accounts
            self.default_account = default_account
            if welcome:
                self.welcome = welcome
            if house_info is not None:
                self.house_info = house_info
            if goodbye is not None:
                self.goodbye = goodbye
            self._save()
        self._report_config()

    def rename_endpoint(self, old_id: str, new_id: str) -> None:
        """Carry an endpoint's on/off state and counts over to its new id (before apply)."""
        with self._lock:
            if ep := self.endpoints.pop(old_id, None):
                ep.id = new_id
                self.endpoints[new_id] = ep

    # -- state and control (the integration drives these)

    def _load(self) -> None:
        """Restore on/off state saved by _save; an expired timed opening stays closed."""
        if not self.state_path or not self.state_path.exists():
            return
        try:
            saved = json.loads(self.state_path.read_text())
        except (OSError, ValueError) as exc:
            _LOGGER.warning(
                "ignoring unreadable guest login state %s: %s", self.state_path, exc
            )
            return
        for ep_id, st in saved.items():
            ep = self.endpoints.get(ep_id)
            if ep is None or not isinstance(st, dict):
                continue
            ep.last_login, ep.logins = st.get("last_login"), int(st.get("logins") or 0)
            if not st.get("enabled"):
                continue
            # One that ran out while the app was down stays closed, and is closed properly
            # (its sessions ended, a new address) at the first tick.
            ep.enabled, ep.until = True, st.get("until")
            _LOGGER.info(
                "endpoint %s restored as %s",
                ep_id,
                "on"
                if self._is_on(ep)
                else "closed: its time ran out while the app was stopped",
            )

    def _save(self) -> None:
        """Write the on/off state (caller holds the lock). Never raises."""
        if not self.state_path:
            return
        state = {
            e.id: {
                "enabled": e.enabled,
                "until": e.until,
                "last_login": e.last_login,
                "logins": e.logins,
            }
            for e in self.endpoints.values()
            if e.enabled or e.logins
        }
        try:
            tmp = self.state_path.with_name(self.state_path.name + ".tmp")
            tmp.write_text(json.dumps(state))
            tmp.replace(self.state_path)
        except OSError as exc:
            _LOGGER.error(
                "could not save guest login state to %s: %s", self.state_path, exc
            )

    def _is_on(self, ep: Endpoint) -> bool:
        """Open now. A timed opening that has run out is closed for good by _expire."""
        return ep.enabled and (ep.until is None or time.time() < ep.until)

    def _ticker(self) -> None:
        while not self._stopping.wait(TICK):
            self._expire()

    def _expire(self) -> None:
        """Close the timed openings that have run out."""
        with self._lock:
            done = [
                e
                for e in self.endpoints.values()
                if e.enabled and e.until is not None and time.time() >= e.until
            ]
            for ep in done:
                ep.enabled, ep.until = False, None
            if done:
                self._save()
        for ep in done:
            _LOGGER.info("endpoint %s closed: its time ran out", ep.id)
            self._closed(ep)

    def _closed(self, ep: Endpoint) -> None:
        if self.on_closed and (ep.end_sessions or ep.rotate):
            on_closed = self.on_closed
            threading.Thread(
                target=on_closed, args=(ep,), name="guest-closed", daemon=True
            ).start()

    def others_open(self, ep: Endpoint) -> list[str]:
        """The other open endpoints that sign visitors in as the same login as `ep`."""
        name = ep.account or self.default_account
        with self._lock:
            return [
                e.id
                for e in self.endpoints.values()
                if e.id != ep.id
                and (e.account or self.default_account) == name
                and self._is_on(e)
            ]

    def set_enabled(
        self, endpoint_id: str, on: bool, minutes: float | None = None
    ) -> bool:
        with self._lock:
            ep = self.endpoints.get(endpoint_id)
            if ep is None:
                return False
            was_on = self._is_on(ep)
            ep.enabled = on
            ep.until = time.time() + minutes * 60 if on and minutes else None
            self._save()
        _LOGGER.info("endpoint %s %s", endpoint_id, "enabled" if on else "disabled")
        if was_on and not on:
            self._closed(ep)
        return True

    def control(self, rest: str, body: bytes = b"") -> int:
        """POST /guest-login/<id>/enable[?minutes=N] or /<id>/disable -> HTTP status."""
        parsed = urllib.parse.urlparse(rest)
        parts = parsed.path.strip("/").split("/")
        if len(parts) != 2 or parts[1] not in ("enable", "disable"):
            return 404
        minutes = None
        if parts[1] == "enable":
            try:
                raw = urllib.parse.parse_qs(parsed.query).get("minutes")
                minutes = float(raw[0]) if raw else None
            except ValueError:
                return 400
        return 204 if self.set_enabled(parts[0], parts[1] == "enable", minutes) else 404

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "running" if self._server else "offline",
                "port": self.port,
                "error": self._error,
                # Where a signed-out visitor's page goes (None: the goodbye page here).
                "goodbye_url": self.goodbye.get("url") or None,
                "endpoints": {
                    e.id: {
                        "label": e.label,
                        "type": e.type,
                        "end_sessions": e.end_sessions,
                        "user_id": self.user_of(e.account or self.default_account),
                        "enabled": self._is_on(e),
                        "until": e.until,
                        "last_login": e.last_login,
                        "logins": e.logins,
                    }
                    for e in self.endpoints.values()
                },
            }

    # -- HTTP

    def _resolve(
        self, path: str, query: dict[str, list[str]]
    ) -> tuple[Endpoint | None, str]:
        """The endpoint a request is for, and the base path of its pages ('' or /e/<slug>)."""
        parts = path.strip("/").split("/")
        if parts[0] == "e" and len(parts) >= 2:
            slug = parts[1]
            for ep in self.endpoints.values():
                if ep.slug and ep.slug == slug:
                    return ep, f"/e/{slug}"
            return None, ""
        d = query.get("d") or query.get("dashboard")
        if d:
            for ep in self.endpoints.values():
                if ep.legacy and _norm(ep.dashboard) == _norm(d[0]):
                    return ep, ""
        return None, ""

    def _reply(
        self, h: BaseHTTPRequestHandler, status: int, body: bytes, ctype: str
    ) -> None:
        h.send_response(status)
        h.send_header("Content-Type", ctype)
        h.send_header("Content-Length", str(len(body)))
        h.send_header("Cache-Control", "no-store")
        h.end_headers()
        h.wfile.write(body)

    def _json(self, h: BaseHTTPRequestHandler, status: int, data: dict) -> None:
        self._reply(h, status, json.dumps(data).encode(), "application/json")

    def _get(self, h: BaseHTTPRequestHandler) -> None:
        url = urllib.parse.urlparse(h.path)
        if url.path == HEADER_URL:  # the welcome page's photo: public, like the page
            image = header_jpeg()
            if image:
                self._reply(h, 200, image, "image/jpeg")
            else:
                self._reply(h, 404, b"", "text/plain")
            return
        if url.path == GOODBYE_URL:  # public: it says no more than the welcome page
            page = render_goodbye(
                self.goodbye.get("title") or GOODBYE_TITLE,
                self.goodbye.get("message") or GOODBYE_MESSAGE,
                HEADER_URL,
            )
            self._reply(h, 200, swap.out(page).encode(), "text/html; charset=utf-8")
            return
        ep, _ = self._resolve(url.path, urllib.parse.parse_qs(url.query))
        is_page = url.path.rstrip("/") in ("", f"/e/{ep.slug}" if ep else "")
        with self._lock:
            on = bool(ep and is_page and self._is_on(ep))
        if ep and on:
            self._reply(h, 200, self._page(ep).encode(), "text/html; charset=utf-8")
        else:  # unknown and disabled look identical to the visitor, but not to the log
            if url.path != "/favicon.ico":
                _LOGGER.warning(
                    "guest login refused %s: %s",
                    h.client_address[0],
                    self._why(url.path, url.query),
                )
            self._reply(h, 404, UNAVAILABLE, "text/html; charset=utf-8")

    def _page(self, ep: Endpoint) -> str:
        """The welcome page for an endpoint: its own settings, else the app-wide ones. An
        engineer's is the minimal one: no photo, no wait, unless the endpoint sets them."""
        title, message, delay = self.welcome
        if ep.type == "engineer":
            title, message, delay = ENGINEER_TITLE, WELCOME_MESSAGE, 0
        delay = ep.delay if ep.delay is not None else delay
        info = self.house_info if ep.info and ep.type == "guest" else None
        return swap.out(
            render_welcome(
                ep.title or title,
                ep.message or message,
                delay,
                HEADER_URL if ep.type == "guest" else None,
                info=info,
            )
        )

    def _why(self, path: str, raw_query: str) -> str:
        """Why a request was refused, and what to change to allow it (log only)."""
        query = urllib.parse.parse_qs(raw_query)
        ep, _ = self._resolve(path, query)
        if ep is not None:
            return (
                f"endpoint {ep.id} is switched off. Open it on the Guest login page, turn "
                "on its Access switch, or call the casa_mia_guest_login.enable_for service."
            )
        d = (query.get("d") or query.get("dashboard") or [""])[0][:200]
        parts = path.strip("/").split("/")
        if d:
            known = [
                e for e in self.endpoints.values() if _norm(e.dashboard) == _norm(d)
            ]
            if known:  # d is then that endpoint's dashboard: never repeat it
                return (
                    f"endpoint {known[0].id} has that dashboard but does not answer legacy "
                    "QR codes. Turn on 'Legacy QR code' for it on the Guest login page."
                )
            return (
                f"unknown endpoint for dashboard {d}. To allow it, add an endpoint on the "
                f"Guest login page with landing dashboard {d} and 'Legacy QR code' on."
            )
        if parts[0] == "e" and len(parts) > 1:
            return (
                f"unknown endpoint address '{parts[1][:60]}'. To allow it, add an endpoint on "
                f"the Guest login page with secret address {parts[1][:60]}."
            )
        return (
            f"{path[:100]} names no endpoint. A QR code must point at /?d=<dashboard> "
            "or /e/<slug>."
        )

    def _post(self, h: BaseHTTPRequestHandler) -> None:
        url = urllib.parse.urlparse(h.path)
        path = url.path.rstrip("/")
        if not path.endswith("/go"):
            self._json(h, 404, {"error": "unavailable"})
            return
        ep, _ = self._resolve(
            path[: -len("/go")] or "/", urllib.parse.parse_qs(url.query)
        )
        ip = h.client_address[0]
        try:
            with self._lock:
                if ep is None or not self._is_on(ep):
                    raise LoginError(
                        404,
                        "unavailable",
                        self._why(path[: -len("/go")] or "/", url.query),
                    )
                self._rate_limit(ip)
            body = _read_json(h)
            if body.get(
                "pending"
            ):  # the visitor's 2FA code, for a sign-in begun earlier
                target = self._finish(
                    ep, str(body["pending"]), str(body.get("code", ""))
                )
            else:
                ha_host = urllib.parse.parse_qs(url.query).get("ha_host", [""])[0]
                try:
                    target = self._login(ep, h.headers.get("Host", ""), ha_host)
                except _AwaitingCode as wait:
                    _LOGGER.info(
                        "guest login %s from %s: asked for a 2FA code", ep.id, ip
                    )
                    self._json(h, 200, {"mfa": wait.token})
                    return
        except LoginError as exc:
            _LOGGER.warning(
                "guest login %s from %s: %s", ep.id if ep else "?", ip, exc.why
            )
            self._json(h, exc.status, {"error": exc.code})
            return
        with self._lock:
            ep.logins += 1
            ep.last_login = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self._save()
        _LOGGER.info("guest login: %s from %s", ep.id, ip)
        if self.on_login:
            self.on_login(ep, ip)
        self._json(h, 200, {"url": target})

    def _rate_limit(self, ip: str) -> None:
        now = time.monotonic()
        q = self._attempts[ip]
        while q and now - q[0] > RATE_WINDOW:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            raise LoginError(429, "rate_limited")
        q.append(now)


def _read_json(h: BaseHTTPRequestHandler) -> dict[str, Any]:
    """A small JSON body, or {} (the first POST of a sign-in has none)."""
    length = min(int(h.headers.get("Content-Length") or 0), 4096)
    try:
        body = json.loads(h.rfile.read(length)) if length else {}
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}
