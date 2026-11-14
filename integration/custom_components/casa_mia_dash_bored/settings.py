"""The house's settings, which every Dash-Bored page and card reads the house by: for
now, the order of its floors and of its rooms. They are the config entry's options, set
in the Configure dialog (config_flow.py), and are fed to the pages whole: as they stand
when a page subscribes, and again each time they are saved.

They are about the house, so every family of dashboard obeys them. A setting that
belongs to one family (a newspaper's name) is not one of these."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import CONF_FLOOR_ORDER, CONF_ROOM_ORDER, DOMAIN, SETTINGS
from .feed import Send, follow

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_settings"


class Settings:
    def __init__(self) -> None:
        self.now: dict[str, Any] = {CONF_FLOOR_ORDER: [], CONF_ROOM_ORDER: []}
        self.feeds: list[Send] = []

    @callback
    def tell(self, options: Mapping[str, Any]) -> None:
        """The entry's options, as loaded or as just saved."""
        self.now = {
            CONF_FLOOR_ORDER: list(options.get(CONF_FLOOR_ORDER) or []),
            CONF_ROOM_ORDER: list(options.get(CONF_ROOM_ORDER) or []),
        }
        _LOGGER.info(
            "Dash-Bored's settings: %d floor(s) and %d room(s) put in order",
            len(self.now[CONF_FLOOR_ORDER]),
            len(self.now[CONF_ROOM_ORDER]),
        )
        for feed in list(self.feeds):
            feed(self.now)


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    hass.data[KEY] = Settings()
    websocket_api.async_register_command(hass, _ws_settings)


@websocket_api.websocket_command({vol.Required("type"): SETTINGS})
@callback
def _ws_settings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The settings as they stand, then again each time they are saved."""
    settings: Settings = hass.data[KEY]
    follow(connection, msg, settings.feeds, [settings.now])
