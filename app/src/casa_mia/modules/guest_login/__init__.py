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

The parts:

  common.py the constants, Endpoint and LoginError
  signin.py SignIn: HA's login flow for a visitor, with its 2FA step
  login.py  GuestLogin(SignIn): the endpoints, their opening and closing, the pages served
  codes.py  Codes: the QR codes (endpoints', the Wi-Fi's, any page's) and the guest card
  api.py    GuestAPI(Codes): the admin page's API and the config store
  printing.py  the Wi-Fi's code and the guest card, drawn
  page.py   the welcome page, rendered
  supervisor.py  calls to HA's login API and the Supervisor
  reach.py  what each login's HA user can get to, and what is left open
"""

from __future__ import annotations

from .api import (
    NAME,
    SLUG,
    STORED,
    TYPES,
    BadRequest,
    GuestAPI,
    Response,
    empty_store,
    load_store,
    remember,
    runtime,
)
from .common import (
    EVENT,
    HEADER_URL,
    INTERNAL_URL,
    MAX_DELAY,
    PORT,
    RATE_LIMIT,
    RATE_WINDOW,
    WELCOME_DELAY,
    WELCOME_MESSAGE,
    Endpoint,
    LoginError,
    welcome_title,
)
from .login import UNAVAILABLE, GuestLogin
from .page import (
    PAGE,
    header_jpeg,
    render_welcome,
)
from .supervisor import (
    TIMEOUT,
    fire_event,
    supervisor_ha_port,
    supervisor_lan_ip,
    supervisor_mdns_name,
)

__all__ = [
    "PORT",
    "INTERNAL_URL",
    "TIMEOUT",
    "RATE_LIMIT",
    "RATE_WINDOW",
    "EVENT",
    "HEADER_URL",
    "WELCOME_MESSAGE",
    "WELCOME_DELAY",
    "MAX_DELAY",
    "welcome_title",
    "Endpoint",
    "LoginError",
    "fire_event",
    "supervisor_ha_port",
    "supervisor_mdns_name",
    "supervisor_lan_ip",
    "UNAVAILABLE",
    "GuestLogin",
    "NAME",
    "SLUG",
    "TYPES",
    "STORED",
    "Response",
    "empty_store",
    "load_store",
    "runtime",
    "BadRequest",
    "GuestAPI",
    "remember",
    "PAGE",
    "render_welcome",
    "header_jpeg",
]
