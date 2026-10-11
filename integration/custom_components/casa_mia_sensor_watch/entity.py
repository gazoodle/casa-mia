"""The Sensor Watch device and its entities' common base: updated by the watcher, not
polled."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from ..casa_mia.const import DOMAIN as CASA_MIA
from ..casa_mia.coordinator import CasaMiaCoordinator
from .const import DOMAIN
from .watch import Watcher


def watch_device(entry: ConfigEntry, coordinator: CasaMiaCoordinator) -> DeviceInfo:
    """The Sensor Watch device, linked to the Casa Mia app device."""
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name="Sensor Watch",
        manufacturer="Casa Mia",
        via_device=(CASA_MIA, coordinator.config_entry.entry_id),
    )


class WatchEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, watcher: Watcher, entry: ConfigEntry, key: str) -> None:
        self.watcher = watcher
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_device_info = watch_device(entry, watcher.coordinator)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.watcher.listen(self.async_write_ha_state))
