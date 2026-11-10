"""Casa Mia Intercom: each doorbell's call (ringing, answered, complete) shared by every
screen in the house, so only one person talks to the door at a time, and an answered call
ends by itself when the answering device goes quiet.

A device per doorbell with a Call sensor and an End call button, the call websocket
command the Camera Commander card and the Talk tile keep the call alive with, and the
patches that make a WebRTC microphone the answer. A child of Casa Mia: it follows the
app's intercom module, on Casa Mia's coordinator.
"""

from __future__ import annotations

import logging

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from ..casa_mia.children import follow_module, parent_coordinator
from ..casa_mia.patching import PatchError, refuse_beside_old
from . import call, patches
from .const import DOMAIN, MODULE
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.BUTTON, Platform.SENSOR]
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    websocket_api.async_register_command(hass, call.ws_call)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    entry.runtime_data = []
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    if off:
        _LOGGER.info("Switched off in the app: no calls")
    else:
        refuse_beside_old(hass)
        try:
            patches.install(hass)
        except PatchError as exc:
            # Stay loaded so the Repair is shown, with no calls: nothing could enforce them.
            patches.PATCHES.fail(hass, str(exc))
        else:
            found = call.doorbell_devices(hass)
            entry.runtime_data = [
                call.Doorbell(hass, d, e).start() for d, e in found.items()
            ]
            for doorbell in entry.runtime_data:
                entry.async_on_unload(doorbell.stop)
            _LOGGER.info(
                "Calls for %s",
                ", ".join(d.name for d in entry.runtime_data) or "no doorbells",
            )
            _follow_doorbells(hass, entry, set(found))

    _prune_devices(hass, entry, {d.device_id for d in entry.runtime_data})
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    patches.PATCHES.remove()
    return unloaded


@callback
def _follow_doorbells(hass: HomeAssistant, entry: ConfigEntry, known: set[str]) -> None:
    """Reload when a doorbell comes or goes: an event or camera entity added, removed,
    enabled or disabled (Protect adopting a new doorbell, say)."""

    @callback
    def changed(event: Event[er.EventEntityRegistryUpdatedData]) -> None:
        if set(call.doorbell_devices(hass)) != known:
            _LOGGER.info("The doorbells changed: reloading")
            hass.config_entries.async_schedule_reload(entry.entry_id)

    @callback
    def relevant(data: er.EventEntityRegistryUpdatedData) -> bool:
        return data["entity_id"].split(".")[0] in ("event", "camera")

    entry.async_on_unload(
        hass.bus.async_listen(
            er.EVENT_ENTITY_REGISTRY_UPDATED, changed, event_filter=relevant
        )
    )


@callback
def _prune_devices(hass: HomeAssistant, entry: ConfigEntry, keep: set[str]) -> None:
    """Drop the devices of doorbells that are gone, or all of them while switched off
    (removing a device removes its entities)."""
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if not any(
            domain == DOMAIN and ident in keep for domain, ident in device.identifiers
        ):
            _LOGGER.info(
                "Removing %s's device: no longer a doorbell with a call", device.name
            )
            registry.async_remove_device(device.id)
