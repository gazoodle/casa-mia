"""Casa Mia Guest Login: the app's guest login endpoints in Home Assistant (an Access
switch, logins and a login event per endpoint), on Casa Mia's coordinator."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr

from ..casa_mia.children import add_module_device, follow_module, parent_coordinator
from .const import MODULE
from .guest import async_prune_endpoint_devices, login_device
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.EVENT, Platform.SENSOR, Platform.SWITCH]
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    entry.runtime_data = coordinator
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    # Switched off in the app: no device (removing it removes its entities).
    registry = dr.async_get(hass)
    device = login_device(entry, coordinator)
    if not off:
        add_module_device(hass, entry, device)
    elif found := registry.async_get_device(identifiers=device["identifiers"]):
        _LOGGER.info("guest login is switched off in the app: removing its device")
        registry.async_remove_device(found.id)
    # Drop devices of endpoints that were renamed or deleted, now and on each update.
    prune = lambda: async_prune_endpoint_devices(hass, entry, coordinator)  # noqa: E731
    prune()
    entry.async_on_unload(coordinator.async_add_listener(prune))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
