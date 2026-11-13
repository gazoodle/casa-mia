"""A switch per entry: whether it is watching its players at all. Off, nothing is
matched and nothing is done; a player away on another station still comes back. The
same switch is on the entry's part of the page in Casa Mia.

(A group has no switch of its own: its select's Ignore is that.)"""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import CONF_ENABLED, DOMAIN


def enabled_id(entry: ConfigEntry) -> str:
    return f"{entry.entry_id}_enabled"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([Watching(entry)])


class Watching(SwitchEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "watching"
    # A setting, not something in a room: automatic dashboards leave configuration out.
    _attr_entity_category = EntityCategory.CONFIG
    _attr_icon = "mdi:radio"

    def __init__(self, entry: ConfigEntry) -> None:
        self.entry = entry
        self._attr_unique_id = enabled_id(entry)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="Casa Mia",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def is_on(self) -> bool:
        return self.entry.options.get(CONF_ENABLED, True)

    def _set(self, on: bool) -> None:
        # Saving the entry starts it again (the update listener), on or off.
        self.hass.config_entries.async_update_entry(
            self.entry, options={**self.entry.options, CONF_ENABLED: on}
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)
