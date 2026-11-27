"""What the Camera Commander card reports: its live main camera, written to Home
Assistant's log (a wall tablet's own console is seen by nobody, so a video that fails
there would otherwise leave no record anywhere: CLAUDE.md RULE TWO); and, while a
commander's debug is on, the sizes the card was tuned to on one device, passed to the
app for its log."""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.parse import urlsplit

import aiohttp
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from ..casa_mia.coordinator import async_post, running_coordinator
from .const import DOMAIN
from .motion import commanders

_LOGGER = logging.getLogger(__name__)
# From a browser, so bounded, and logged on one line.
TEXT = vol.All(str, vol.Length(max=400))
# A tuning record: its reference (T-MMDD-HHMMSS-ABC, the card's) and what it holds,
# bounded as a whole.
REF = re.compile(r"T-\d{4}-\d{6}-[A-Z]{3}")
MOST = 8000


def setup(hass: HomeAssistant) -> None:
    """Once per HA run."""
    websocket_api.async_register_command(hass, _ws_live_report)
    websocket_api.async_register_command(hass, _ws_tuning)


def _debugging(hass: HomeAssistant, picture: str) -> dict[str, Any] | None:
    """The commander whose picture is /g/<picture>.mjpg, while its debug is on."""
    coordinator = running_coordinator(hass)
    for cmd in commanders(coordinator) if coordinator and coordinator.data else []:
        card = cmd.get("card") or {}
        if urlsplit(card.get("picture") or "").path == f"/g/{picture}.mjpg":
            on = ((card.get("layout") or {}).get("debug") or {}).get("on")
            return cmd if on else None
    return None


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/tuning",
        vol.Required("picture"): TEXT,
        vol.Required("entry"): dict,
    }
)
@websocket_api.async_response
async def _ws_tuning(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """A card's tuning record (its Record button, debug on): refused unless that
    commander's debug is on, so nothing but a debugging card can write to the app's
    log; then passed to the app with who sent it."""
    entry = msg["entry"]
    ref = str(entry.get("ref", ""))
    if not REF.fullmatch(ref) or len(json.dumps(entry)) > MOST:
        connection.send_error(msg["id"], "invalid", "Not a tuning record.")
        return
    if _debugging(hass, msg["picture"]) is None:
        _LOGGER.warning("tuning %s refused: that commander's debug is off", ref)
        connection.send_error(msg["id"], "debug_off", "The commander's debug is off.")
        return
    coordinator = running_coordinator(hass)
    if coordinator is None:
        connection.send_error(msg["id"], "no_app", "Casa Mia is not running.")
        return
    entry = {**entry, "user": connection.user.name or connection.user.id}
    try:
        await async_post(hass, coordinator.url, "/commander/tuning", entry)
    except (aiohttp.ClientError, TimeoutError) as exc:
        _LOGGER.warning("tuning %s not passed to the app: %s", ref, exc)
        connection.send_error(msg["id"], "app", f"The app didn't take it: {exc}")
        return
    _LOGGER.info("tuning %s from %s: passed to the app's log", ref, entry["user"])
    connection.send_result(msg["id"], {"ref": ref})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/live_report",
        vol.Required("commander"): TEXT,
        vol.Required("channel"): TEXT,
        vol.Required("what"): vol.In(["started", "lost", "back"]),
        vol.Required("why"): TEXT,
        vol.Required("fails"): vol.All(int, vol.Range(min=0)),  # 0: started
    }
)
@callback
def _ws_live_report(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """A channel's live video started on a card (with how long its first frame took),
    was lost, or came back. The first loss is a warning; the tries that fail after it
    are the same fault, so they are info."""
    first = msg["what"] == "lost" and msg["fails"] == 1
    _LOGGER.log(
        logging.WARNING if first else logging.INFO,
        "Live video %s on %s's page (%s, channel %s): %s",
        msg["what"],
        connection.user.name or connection.user.id,
        *(" ".join(msg[key].split()) for key in ("commander", "channel", "why")),
    )
    connection.send_result(msg["id"])
