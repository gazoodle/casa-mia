"""The QR code card's codes: websocket casa_mia_guest_login/qr (any signed-in user) asks the
app for an endpoint's code (named by its Access switch), a page's, and the Wi-Fi's beside
either. The app gives an endpoint's code only while it is open."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..casa_mia.coordinator import running_coordinator
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def setup(hass: HomeAssistant) -> None:
    """Once per HA run."""
    websocket_api.async_register_command(hass, _ws_qr)


def endpoint_of(hass: HomeAssistant, entity_id: str) -> str | None:
    """The endpoint id behind an Access switch (its unique id: <entry>_guest_<id>_access)."""
    entry = er.async_get(hass).async_get(entity_id)
    if entry is None or entry.platform != DOMAIN or not entry.unique_id:
        return None
    prefix, suffix = f"{entry.config_entry_id}_guest_", "_access"
    uid = entry.unique_id
    if not (uid.startswith(prefix) and uid.endswith(suffix)):
        return None
    return uid[len(prefix) : -len(suffix)]


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/qr",
        vol.Optional("entity_id"): str,
        vol.Optional("path"): str,
        vol.Optional("wifi", default=False): bool,
    }
)
@websocket_api.async_response
async def _ws_qr(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    coordinator = running_coordinator(hass)
    if coordinator is None:
        connection.send_error(msg["id"], "not_ready", "Casa Mia is not set up.")
        return
    query: dict[str, Any] = {}
    if entity_id := msg.get("entity_id"):
        if not (endpoint := endpoint_of(hass, entity_id)):
            connection.send_error(
                msg["id"],
                "not_found",
                f"{entity_id} is not a guest login endpoint's Access switch.",
            )
            return
        query["endpoint"] = endpoint
    elif msg.get("path"):
        query["path"] = msg["path"]
    if msg["wifi"]:
        query["wifi"] = "1"
    try:
        async with async_get_clientsession(hass).get(
            f"{coordinator.url}/guest-login/qr",
            params=query,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as response:
            response.raise_for_status()
            found = await response.json()
    except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
        _LOGGER.warning("QR code card: the app did not answer: %s", exc)
        connection.send_error(msg["id"], "unavailable", f"Casa Mia app: {exc}")
        return
    _LOGGER.debug(
        "QR code card: %s for %s",
        query,
        connection.user.name if connection.user else "?",
    )
    connection.send_result(msg["id"], found)
