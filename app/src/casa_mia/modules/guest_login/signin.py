"""The sign-in itself: HA's login flow run for a visitor, with its two-factor step.

`SignIn` is the bottom layer of GuestLogin: it holds the logins and HA's address, runs the
flow and returns the URL that finishes the sign-in in the visitor's browser. When HA asks
for a 2FA code, the flow waits (`Pending`) for the visitor's page to send it.
"""

from __future__ import annotations

import base64
import json
import secrets
import threading
import time
import urllib.error
import urllib.parse
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .common import MFA_TTL, Endpoint, LoginError, _norm
from .supervisor import _json_post


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


class SignIn:
    def __init__(
        self,
        accounts: dict[str, tuple[str, str]],
        default_account: str,
        internal_url: str,
        ha_port: Callable[[], int],
        ha_hosts: Callable[[], list[str]],
    ) -> None:
        self.accounts = accounts
        self.default_account = default_account
        self.internal_url = internal_url.rstrip("/")
        self.ha_port = ha_port
        # Names of this box that a sign-in may send the browser to (?ha_host=, Try it).
        self.ha_hosts = ha_hosts
        self._lock = threading.Lock()
        self._pending: dict[str, Pending] = {}

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


def _options(result: dict[str, Any], name: str) -> list[list[str]]:
    """A login flow form's choices for field `name`: [[value, label], ...]."""
    for field in result.get("data_schema") or []:
        if isinstance(field, dict) and field.get("name") == name:
            return [list(o) for o in field.get("options") or [] if o]
    return []
