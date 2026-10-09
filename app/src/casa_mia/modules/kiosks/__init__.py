"""Kiosk Satellites: finds the wall tablets running Kiosk Satellite on the LAN, keeps a login
to each, backs up their settings or full config, and opens each one's own admin page
through ingress so it works from outside the home.

Finding them (at start and on Look now): Home Assistant's device registry (the tablets join HA
through ESPHome, manufacturer `kiosk_satellite`, with their admin page as the device's
configuration URL), addresses added on the admin page, and each kiosk's own list of the
kiosks it has heard on the network (its `fleet` command). Each address is asked for
`/api/fleet/identity` (no login), whose id is the kiosk's key here; it also says whether
the kiosk leads a fleet or follows one. Known kiosks are asked how they are every minute.

Logging in: one shared remote-admin password, entered on the admin page and never kept.
The app asks each kiosk for a 10-year token and keeps those (`/config/kiosks.json`).

Backups: every logged-in kiosk's settings or full config (chosen on the admin page) is
exported on a timer (daily by default) and on Get latest, and kept in the app's data
(`/data/kiosks/<id>/`, so in HA backups) only when it differs materially from the newest
kept one; the last few are kept per kiosk and each can be restored to it.

The admin page proxy (/kiosk/<id>/...): passes everything to the kiosk with the app's
token. Their page loads its files relatively but calls its API at absolute /api/...
paths, which under ingress would reach Home Assistant; a small script added to the page
(PAGE_SHIM) sends those under the page's path, and the proxy tunnels the websocket.
Kiosk Satellite 2026.10.8 and later do this themselves, so the script is added only for
older ones.

The parts, each a layer on the one before: store (Store: the saved kiosks, requests
to them, how each is shown), finder (Finder: finding and logging in), backups
(Backups), commands (Commands: update, firmware server), kiosks (Kiosks: the timer, the
admin API, the proxy); shared constants and helpers in common.
"""

from .common import PAGE_SHIM, PAGE_TOKEN, page_head
from .kiosks import Kiosks

__all__ = ["PAGE_SHIM", "PAGE_TOKEN", "Kiosks", "page_head"]
