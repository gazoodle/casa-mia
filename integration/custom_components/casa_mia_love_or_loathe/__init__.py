"""Love it or Loathe it: watches chosen media players' title and artist against groups
of songs, and acts when one comes on. A loved song can be turned up; a loathed one turned
down, muted, or left for another station for a few minutes. Every match fires the
`casa_mia_love_or_loathe` event, so an automation can do anything else.

Each group is a subentry with a switch of its own, so an automation can turn a group on
and off (the shipped Christmas songs, from December). Each station to switch to is a
subentry too. engine.py does the watching and acting, pure.py the matching.

An integration of its own, wholly in Home Assistant: it imports nothing from Casa Mia
and works with no app.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN, INSTALLED_EVENT
from .engine import Engine
from .pure import libraries
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR, Platform.SWITCH]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# Read once, at import: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Newer files than this code, written by the Casa Mia app: ask for the restart. Now,
    # and when the app says it has written some.
    await async_check_restart(hass, LOADED_VERSION)

    async def installed(_event: Event) -> None:
        await async_check_restart(hass, LOADED_VERSION)

    entry.async_on_unload(hass.bus.async_listen(INSTALLED_EVENT, installed))

    engine = Engine(hass, entry, await hass.async_add_executor_job(libraries))
    entry.runtime_data = engine
    # The switches first: each tells the engine whether its group was left off.
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await engine.start()

    # A group or station added or changed, or the players: start again with them.
    entry.async_on_unload(entry.add_update_listener(_reload))
    _LOGGER.info("Love it or Loathe it %s started", LOADED_VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.stop()
    return unloaded


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
