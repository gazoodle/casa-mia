"""Dash-Bored: dashboards that write themselves from the house Home Assistant already
knows, in a style worth looking at. The first is the Gazette: the house as a newspaper,
with what matters most as the headline, and a Sensor Watch alert as breaking news.

The page is one custom element (www/cards.js, built from integration/cards/src/dash-bored
by tools/build_cards). It is the Dash-Bored entry in the sidebar, and the same element is
a dashboard card. It reads areas, entities and states from the connection every Home
Assistant page already has; all this side does is serve it, feed it Sensor Watch's
alerts (alerts.py), the songs people rate (personal.py) and what the players have
played (playing.py), and take the photographs of what the cameras see (image.py).

An integration of its own, wholly in Home Assistant: it imports nothing from Casa Mia
and works with no app, and with or without Sensor Watch.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.typing import ConfigType

from . import alerts, personal, playing, settings, sightings
from .const import (
    CARDS_VERSION,
    DOMAIN,
    ELEMENT,
    HIDE_LABEL,
    INSTALLED_EVENT,
    PANEL,
    TITLE,
    URL,
)
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# Read once, at import: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()
PLATFORMS = [Platform.IMAGE]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Once per Home Assistant run: serve www/ and put the card into every page. ?v=
    changes with each update, so browsers fetch the new copy."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL, str(Path(__file__).parent / "www"), False)]
    )
    frontend.add_extra_js_url(hass, f"{URL}/cards.js?v={LOADED_VERSION}")
    websocket_api.async_register_command(hass, _ws_cards)
    alerts.setup(hass)
    sightings.setup(hass)
    personal.setup(hass)
    playing.setup(hass)
    settings.setup(hass)
    return True


@websocket_api.websocket_command({vol.Required("type"): CARDS_VERSION})
@callback
def _ws_cards(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The version of the cards served now. A page open since before an update still
    runs the old ones (a browser loads each script once), so they ask at each reconnect
    and offer a reload when this is newer."""
    connection.send_result(msg["id"], {"version": LOADED_VERSION})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Newer files than this code, written by the Casa Mia app: ask for the restart. Now,
    # and when the app says it has written some.
    await async_check_restart(hass, LOADED_VERSION)

    async def installed(_event: Event) -> None:
        await async_check_restart(hass, LOADED_VERSION)

    entry.async_on_unload(hass.bus.async_listen(INSTALLED_EVENT, installed))

    # The house's settings: as they stand now, and each time the Configure dialog saves.
    house: settings.Settings = hass.data[settings.KEY]
    house.tell(entry.options)

    async def saved(hass: HomeAssistant, entry: ConfigEntry) -> None:
        house.tell(entry.options)

    entry.async_on_unload(entry.add_update_listener(saved))

    labels = lr.async_get(hass)
    if not labels.async_get_label_by_name(HIDE_LABEL):
        labels.async_create(
            HIDE_LABEL,
            icon="mdi:newspaper-remove",
            description="Kept off Dash-Bored's pages. Put it on an entity, a device or an area.",
        )
        _LOGGER.info("Dash-Bored made the label %r", HIDE_LABEL)

    # The sidebar entry stays through a reload, and goes only when the integration is
    # deleted: taking a panel out from under an open page broke Home Assistant's own
    # (Sensor Watch, 2026.11.3-b1).
    if PANEL not in hass.data.get(frontend.DATA_PANELS, {}):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL,
            webcomponent_name=ELEMENT,
            sidebar_title=TITLE,
            sidebar_icon="mdi:newspaper-variant-outline",
            module_url=f"{URL}/cards.js?v={LOADED_VERSION}",
            # Not in a frame: the element keeps its styles in its own shadow root, and
            # needs the page's connection.
            embed_iframe=False,
            require_admin=False,
        )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _LOGGER.info("Dash-Bored %s started", LOADED_VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    frontend.async_remove_panel(hass, PANEL, warn_if_unknown=False)
    _LOGGER.info("Dash-Bored removed: its page is out of the sidebar")
