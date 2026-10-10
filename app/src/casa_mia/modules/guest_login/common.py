"""guest-login's shared pieces: its constants, the endpoint, and its errors."""

from __future__ import annotations

from dataclasses import dataclass

from ... import header

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
GOODBYE_URL = "/bye"  # on the guest port: where a signed-out visitor's page is sent
GOODBYE_TITLE = "Thank you for visiting"
GOODBYE_MESSAGE = "You're signed out now. We hope to see you again soon."
# ponytail: the integration polls the app every 30 s, so a close made outside HA reaches the
# visitor's page that late; sign-out waits this long so the page goes to the goodbye first.
# A push from the app on close would let this shrink to a few seconds.
GOODBYE_GRACE = 40.0


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
    info: bool = False  # show the house rules before signing in
    end_sessions: bool = False  # closing it signs out everyone its login let in
    rotate: bool = False  # closing it gives it a new secret address
    # Runtime state, kept in the state file; a new endpoint starts off.
    enabled: bool = False
    until: float | None = (
        None  # wall-clock expiry (epoch seconds) of a time-limited enable
    )
    last_login: str | None = None
    logins: int = 0


class BadRequest(Exception):
    """A change the admin page asked for that can't be made; the message says why."""


class LoginError(Exception):
    def __init__(self, status: int, code: str, why: str = "") -> None:
        super().__init__(code)
        self.status, self.code, self.why = status, code, why or code


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
