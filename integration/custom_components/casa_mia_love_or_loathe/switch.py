"""Two switches per entry, each an option of it:

- Watching: whether it watches its players at all. Off, nothing is matched and nothing
  is done; a player away on another station still comes back. The same switch is on the
  entry's part of the page in Casa Mia.
- Repeats: whether its strike, a song played too often, is in force (CONF_REPEATS), so
  an automation can turn it off for an evening without losing its numbers.

(A group has no switch of its own: its select's Ignore is that.)"""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import CONF_ENABLED, CONF_REPEATS_ON, DOMAIN

# Each switch: its option, its name's translation key and its icon. The option's name is
# in its unique id, so Watching's is the one it always had.
SWITCHES = {
    CONF_ENABLED: ("watching", "mdi:radio"),
    CONF_REPEATS_ON: ("repeats", "mdi:repeat-off"),
}


def switch_ids(entry: ConfigEntry) -> set[str]:
    return {f"{entry.entry_id}_{option}" for option in SWITCHES}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities(OptionSwitch(entry, option) for option in SWITCHES)


class OptionSwitch(SwitchEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    # A setting, not something in a room: automatic dashboards leave configuration out.
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, entry: ConfigEntry, option: str) -> None:
        self.entry, self.option = entry, option
        self._attr_translation_key, self._attr_icon = SWITCHES[option]
        self._attr_unique_id = f"{entry.entry_id}_{option}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="Casa Mia",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def is_on(self) -> bool:
        return self.entry.options.get(self.option, True)

    def _set(self, on: bool) -> None:
        # Saving the entry starts it again (the update listener), on or off.
        self.hass.config_entries.async_update_entry(
            self.entry, options={**self.entry.options, self.option: on}
        )

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)
