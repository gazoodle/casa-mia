"""What the Camera Commander card reports about its live main camera, written to Home
Assistant's log. A wall tablet's own console is seen by nobody, so a video that fails
there would otherwise leave no record anywhere (CLAUDE.md RULE TWO)."""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
# From a browser, so bounded, and logged on one line.
TEXT = vol.All(str, vol.Length(max=400))


def setup(hass: HomeAssistant) -> None:
    """Once per HA run."""
    websocket_api.async_register_command(hass, _ws_live_report)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/live_report",
        vol.Required("commander"): TEXT,
        vol.Required("channel"): TEXT,
        vol.Required("what"): vol.In(["lost", "back"]),
        vol.Required("why"): TEXT,
        vol.Required("fails"): vol.All(int, vol.Range(min=1)),
    }
)
@callback
def _ws_live_report(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """A channel's live video was lost on a card, or came back. The first loss is a
    warning; the tries that fail after it are the same fault, so they are info."""
    first = msg["what"] == "lost" and msg["fails"] == 1
    _LOGGER.log(
        logging.WARNING if first else logging.INFO,
        "Live video %s on %s's page (%s, channel %s): %s",
        msg["what"],
        connection.user.name or connection.user.id,
        *(" ".join(msg[key].split()) for key in ("commander", "channel", "why")),
    )
    connection.send_result(msg["id"])
