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

import base64
import json
import logging
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from ... import header, swap
from .page import header_jpeg, render_welcome  # noqa: E402
from .supervisor import _json_post

_LOGGER = logging.getLogger(__name__)

PORT = 8675
# Home Assistant, from the app: both on the host's network (the name `homeassistant` is
# the Supervisor network's, which the app is no longer on).
INTERNAL_URL = "http://127.0.0.1:8123"
RATE_LIMIT = 10  # login attempts per client address per RATE_WINDOW seconds
RATE_WINDOW = 60.0
EVENT = "casa_mia_guest_login"
HEADER_URL = "/welcome/header.jpg"
WELCOME_MESSAGE = "Signing you in…"
WELCOME_DELAY = 3  # seconds; the sign-in itself runs during this time
MAX_DELAY = 30  # the login code HA gives us is only good for a short while
TICK = 15.0  # seconds between looks for timed openings that have run out
MFA_TTL = 300.0  # seconds a visitor has to type a 2FA code
ENGINEER_TITLE = "Maintenance access"


def welcome_title() -> str:
    """The welcome page's title until one is set on the admin page."""
    return f"Welcome to {header.HOUSE}"


@dataclass
class Endpoint:
    id: str  # stable and public: used in HA entities
    label: str
    dashboard: str  # where the visitor lands, e.g. /guest-dashboards/<id>
    type: str = "guest"  # "guest" (welcome page) or "engineer"
    account: str | None = None  # None: the default account
    slug: str | None = None  # secret part of /e/<slug>
    legacy: bool = False  # also reachable at /?d=<dashboard> (existing QR codes)
    # Welcome page overrides; None uses the app-wide settings.
    title: str | None = None
    message: str | None = None
    delay: int | None = None  # seconds the welcome page is shown before redirecting
    info: bool = False  # show the house info (Wi-Fi, house rules) before signing in
    end_sessions: bool = False  # closing it signs out everyone its login let in
    rotate: bool = False  # closing it gives it a new secret address
    # Runtime state, kept in the state file; a new endpoint starts off.
    enabled: bool = False
    until: float | None = (
        None  # wall-clock expiry (epoch seconds) of a time-limited enable
    )
    last_login: str | None = None
    logins: int = 0


class LoginError(Exception):
    def __init__(self, status: int, code: str, why: str = "") -> None:
        super().__init__(code)
        self.status, self.code, self.why = status, code, why or code


class NeedsCode(Exception):
    """HA wants the login's two-factor code: the flow waits at its mfa step."""

    def __init__(self, flow_id: str) -> None:
        super().__init__("mfa")
        self.flow_id = flow_id


@dataclass
class Pending:
    """A sign-in waiting for the visitor's 2FA code."""

    endpoint: str
    flow_id: str
    ha_url: str
    expires: float


def _norm(path: str) -> str:
    return path.strip("/")


def _shown(ep: Endpoint) -> str:
    """The landing dashboard, safe to log: a printed QR code's dashboard path carries the
    code's secret id (/guest-dashboards/<16 hex>), so only its first part is shown."""
    if not ep.legacy:
        return ep.dashboard
    first = _norm(ep.dashboard).split("/")[0]
    return (
        f"/{first}/<printed QR id>" if "/" in _norm(ep.dashboard) else "<printed QR id>"
    )


UNAVAILABLE = (
    b"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
    b"<title>Not available</title><p style='font:18px system-ui;text-align:center;"
    b"margin-top:30vh'>Not available.</p>"
)


class GuestLogin:
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
        # Wi-Fi name and password, and the house rules, for endpoints that show them.
        self.house_info = house_info or {}
        # Called (on its own thread) with an endpoint that has just closed, by hand or when
        # its time ran out: GuestAPI ends its sessions and gives it a new address.
        self.on_closed: Callable[[Endpoint], None] | None = None
        self.welcome = (title or welcome_title(), welcome_message, welcome_delay)
        self.endpoints = {e.id: e for e in endpoints}
        self.accounts = accounts
        self.default_account = default_account
        self.port = port
        self.internal_url = internal_url.rstrip("/")
        self.ha_port = ha_port
        self.on_login = on_login
        # Names of this box that a sign-in may send the browser to (?ha_host=, Try it).
        self.ha_hosts = ha_hosts
        self._lock = threading.Lock()
        self._server: ThreadingHTTPServer | None = None
        self._error: str | None = None
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._pending: dict[str, Pending] = {}
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
                "endpoints": {
                    e.id: {
                        "label": e.label,
                        "type": e.type,
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

    def _login(self, ep: Endpoint, host_header: str, ha_host: str = "") -> str:
        """Run HA's login flow and return the URL that finishes the sign-in in the browser."""
        name = ep.account or self.default_account
        # The URL the visitor's browser uses for HA: the host they reached us on, HA's port.
        # Try it may name another of this box's names (so the admin's own login there is
        # left alone); anything else is ignored, or this would hand codes to any host.
        host = (
            urllib.parse.urlsplit(f"//{host_header}").hostname or "homeassistant.local"
        )
        if ha_host and ha_host in self.ha_hosts():
            host = ha_host
        port = self.ha_port()
        ha_url = f"http://{host}" + ("" if port == 80 else f":{port}")
        try:
            code = self._login_code(name, ha_url, f"endpoint {ep.id}")
        except NeedsCode as wait:
            token = secrets.token_urlsafe(18)
            with self._lock:
                now = time.time()
                self._pending = {
                    k: p for k, p in self._pending.items() if p.expires > now
                }
                self._pending[token] = Pending(
                    ep.id, wait.flow_id, ha_url, now + MFA_TTL
                )
            raise _AwaitingCode(token) from None
        return _landing(ep, ha_url, code)

    def _finish(self, ep: Endpoint, token: str, code: str) -> str:
        """Pass the visitor's 2FA code to the flow waiting for it; the landing URL."""
        with self._lock:
            pending = self._pending.get(token)
            if pending is None or pending.endpoint != ep.id:
                raise LoginError(401, "mfa_expired", "2FA: no sign-in is waiting")
            if pending.expires <= time.time():
                del self._pending[token]
                raise LoginError(401, "mfa_expired", "2FA: the code came too late")
        try:
            result = _json_post(
                f"{self.internal_url}/auth/login_flow/{pending.flow_id}",
                {"code": code.strip(), "client_id": pending.ha_url + "/"},
            )
        except urllib.error.HTTPError as exc:
            with self._lock:
                self._pending.pop(token, None)
            raise LoginError(
                401, "mfa_expired", f"2FA: Home Assistant answered {exc.code}"
            ) from exc
        except (OSError, ValueError) as exc:
            raise LoginError(502, "ha_unreachable", f"2FA: {exc}") from exc
        if result.get("type") == "create_entry" and result.get("result"):
            with self._lock:
                self._pending.pop(token, None)
            return _landing(ep, pending.ha_url, str(result["result"]))
        if result.get("type") == "form":  # wrong code: the flow waits for another
            raise LoginError(401, "bad_code", "2FA: wrong code")
        with self._lock:
            self._pending.pop(token, None)
        raise LoginError(
            401, "mfa_expired", f"2FA: Home Assistant ended the sign-in ({result})"
        )

    def test_login(self, name: str) -> str | None:
        """Try a login's credentials against HA. None if they work, else why not."""
        try:
            self._login_code(name, self.internal_url, f"login {name}")
        except LoginError as exc:
            return exc.why
        except NeedsCode:
            return (
                None  # the password is right; HA then asks the visitor for the 2FA code
            )
        return None

    def _login_code(self, name: str, ha_url: str, who: str) -> str:
        """HA's login flow for login `name`, as a client at `ha_url`: the one-time code."""
        if name not in self.accounts:
            have = ", ".join(sorted(self.accounts)) or "none"
            raise LoginError(
                500,
                "no_account",
                f"{who} uses login '{name}', which does not exist (have: {have}). "
                "Add it under Logins on the Guest login page.",
            )
        username, password = self.accounts[name]
        client_id = ha_url + "/"
        try:
            flow = _json_post(
                f"{self.internal_url}/auth/login_flow",
                {
                    "client_id": client_id,
                    "handler": ["homeassistant", None],
                    "redirect_uri": f"{ha_url}?auth_callback=1",
                },
            )
            result = _json_post(
                f"{self.internal_url}/auth/login_flow/{flow['flow_id']}",
                {"username": username, "password": password, "client_id": client_id},
            )
            # A user with more than one 2FA module is asked which: prefer an app's code.
            if result.get("step_id") == "select_mfa_module":
                options = [o[0] for o in _options(result, "multi_factor_auth_module")]
                choice = "totp" if "totp" in options else (options or ["totp"])[0]
                result = _json_post(
                    f"{self.internal_url}/auth/login_flow/{flow['flow_id']}",
                    {"multi_factor_auth_module": choice, "client_id": client_id},
                )
        except urllib.error.HTTPError as exc:
            raise LoginError(
                401,
                "login_failed",
                f"Home Assistant answered {exc.code} at {self.internal_url}/auth/login_flow "
                f"(user '{username}')",
            ) from exc
        except (OSError, ValueError, KeyError) as exc:
            raise LoginError(
                502,
                "ha_unreachable",
                f"cannot reach Home Assistant's login at {self.internal_url}: {exc}.",
            ) from exc
        if result.get("type") == "form" and result.get("step_id") == "mfa":
            raise NeedsCode(str(flow["flow_id"]))
        code = result.get("result")
        if result.get("type") != "create_entry" or not code:
            raise LoginError(
                401,
                "login_failed",
                f"Home Assistant rejected user '{username}': check the login's username and "
                "password on the Guest login page, and that the user exists and is active.",
            )
        return str(code)


class _AwaitingCode(Exception):
    """The sign-in waits for a 2FA code; `token` names it to the visitor's page."""

    def __init__(self, token: str) -> None:
        super().__init__("mfa")
        self.token = token


def _landing(ep: Endpoint, ha_url: str, code: str) -> str:
    """The URL that finishes the sign-in in the browser, at the endpoint's dashboard."""
    state = base64.b64encode(
        json.dumps({"hassUrl": ha_url, "clientId": ha_url + "/"}).encode()
    ).decode()
    query = urllib.parse.urlencode(
        {"auth_callback": 1, "code": code, "state": state, "storeToken": "true"}
    )
    return f"{ha_url}/{_norm(ep.dashboard)}?{query}"


def _read_json(h: BaseHTTPRequestHandler) -> dict[str, Any]:
    """A small JSON body, or {} (the first POST of a sign-in has none)."""
    length = min(int(h.headers.get("Content-Length") or 0), 4096)
    try:
        body = json.loads(h.rfile.read(length)) if length else {}
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}


def _options(result: dict[str, Any], name: str) -> list[list[str]]:
    """A login flow form's choices for field `name`: [[value, label], ...]."""
    for field in result.get("data_schema") or []:
        if isinstance(field, dict) and field.get("name") == name:
            return [list(o) for o in field.get("options") or [] if o]
    return []
