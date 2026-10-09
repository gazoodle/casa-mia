"""Casa Mia Camera Commander: the app's camera commanders in Home Assistant (a device
each, its Main camera and Track motion) and their pictures through Home Assistant for
the Camera Commander card, on Casa Mia's coordinator."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr

from ..casa_mia.children import follow_module, parent_coordinator
from .commanders import async_prune_commander_devices, commander_device
from .const import DOMAIN, MODULE
from .motion import commanders, tracker
from .pictures import setup as setup_pictures
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SELECT, Platform.SWITCH]
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    entry.runtime_data = coordinator
    if not hass.data.get(f"{DOMAIN}_pictures"):  # once per HA run
        setup_pictures(hass)  # the commanders' pictures, for viewers away from home
        hass.data[f"{DOMAIN}_pictures"] = True
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    # Switched off in the app: no device (removing it removes its entities).
    registry = dr.async_get(hass)
    device = commander_device(entry, coordinator)
    if not off:
        registry.async_get_or_create(config_entry_id=entry.entry_id, **device)
    elif found := registry.async_get_device(identifiers=device["identifiers"]):
        _LOGGER.info(
            "the commanders are switched off in the app: removing their device"
        )
        registry.async_remove_device(found.id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if not off:
        # Track motion, a tracker per commander, while the app has the commanders on.

        @callback
        def follow_commanders() -> None:
            ids = {c["id"] for c in commanders(coordinator)}
            for cid in set(coordinator.motion) - ids:  # deleted on the page
                coordinator.motion.pop(cid).unload()
            for cid in ids:
                tracker(coordinator, cid).refresh()

        @callback
        def stop_tracking() -> None:
            for one in coordinator.motion.values():
                one.unload()
            coordinator.motion.clear()

        follow_commanders()
        entry.async_on_unload(coordinator.async_add_listener(follow_commanders))
        entry.async_on_unload(stop_tracking)
    # Drop the devices of commanders deleted on the Camera Commander page.
    prune = lambda: async_prune_commander_devices(hass, entry, coordinator)  # noqa: E731
    prune()
    entry.async_on_unload(coordinator.async_add_listener(prune))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
