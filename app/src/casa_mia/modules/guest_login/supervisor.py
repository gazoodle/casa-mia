"""guest-login's calls out: Home Assistant's login API, and the Supervisor's facts about
the box (HA's port, its names and address) and its event bus."""

from __future__ import annotations

import json
import logging
import urllib.request

_LOGGER = logging.getLogger(__name__)

TIMEOUT = 10


def _json_post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.load(resp)


def fire_event(token: str, name: str, data: dict) -> None:
    """Fire an HA bus event through the Supervisor proxy (best effort)."""
    req = urllib.request.Request(
        f"http://supervisor/core/api/events/{name}",
        data=json.dumps(data).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=TIMEOUT).close()
    except OSError as exc:
        _LOGGER.warning("could not fire %s: %s", name, exc)


def supervisor_ha_port(token: str) -> int:
    """HA's port, from the Supervisor (8123 if it can't be asked)."""
    req = urllib.request.Request(
        "http://supervisor/core/info", headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return int(json.load(resp)["data"]["port"])
    except (OSError, ValueError, KeyError, TypeError):
        return 8123


def supervisor_mdns_name(token: str) -> str | None:
    """The box's .local name (from the Supervisor's host info), e.g. homeassistant.local."""
    req = urllib.request.Request(
        "http://supervisor/host/info", headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            hostname = json.load(resp)["data"]["hostname"]
        return f"{hostname}.local" if hostname else None
    except (OSError, ValueError, KeyError, TypeError):
        return None


def supervisor_lan_ip(token: str) -> str | None:
    """The box's address on the LAN (primary interface), for QR codes. None if unknown."""
    req = urllib.request.Request(
        "http://supervisor/network/info", headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            interfaces = json.load(resp)["data"]["interfaces"]
        primary = next(i for i in interfaces if i.get("primary"))
        return str(primary["ipv4"]["address"][0]).split("/")[0]
    except (OSError, ValueError, KeyError, TypeError, IndexError, StopIteration):
        return None
