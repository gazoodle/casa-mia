"""Casa Mia Sensor Watch: the sensors given bands on the app's Sensor Watch page,
watched here (watch.py) and told to Home Assistant: a status, a count per level, a
problem sensor, an event on each change and a `list` service, on Casa Mia's coordinator."""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.helpers import device_registry as dr

from ..casa_mia.children import add_module_device, follow_module, parent_coordinator
from .const import DOMAIN, MODULE
from .entity import watch_device
from .levels import LEVELS, listing
from .restart_notice import async_check_restart, manifest_version
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()
LIST_SCHEMA = vol.Schema({vol.Optional("levels"): [vol.In(LEVELS)]})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    # Switched off in the app: no device (removing it removes its entities), nothing watched.
    registry = dr.async_get(hass)
    device = watch_device(entry, coordinator)
    if off:
        if found := registry.async_get_device(identifiers=device["identifiers"]):
            _LOGGER.info("Sensor Watch is switched off in the app: removing its device")
            registry.async_remove_device(found.id)
        return True
    add_module_device(hass, entry, device)
    watcher = Watcher(hass, coordinator)
    entry.runtime_data = watcher
    watcher.refresh()
    entry.async_on_unload(coordinator.async_add_listener(watcher.refresh))
    entry.async_on_unload(watcher.unload)

    async def list_sensors(call: ServiceCall) -> ServiceResponse:
        rows = listing(watcher.now, call.data.get("levels"))
        _LOGGER.debug(
            "list (%s): %d sensors",
            ",".join(call.data.get("levels") or []) or "not nominal",
            len(rows),
        )
        return {"worst": watcher.summary()["worst"], "sensors": rows}

    hass.services.async_register(
        DOMAIN,
        "list",
        list_sensors,
        schema=LIST_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, "list"))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not isinstance(getattr(entry, "runtime_data", None), Watcher):
        return True  # switched off: no platforms were set up
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
