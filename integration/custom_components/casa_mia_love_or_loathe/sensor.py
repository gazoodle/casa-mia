"""The Last match sensor: the song last acted on, with what was done about it (`result`,
which says so when it failed), the players away on another station and when each goes
back, and the players that are playing but report no title, which can't be matched.
Updated by the engine, not polled."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN, TITLE
from .engine import Engine


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([LastMatch(entry.runtime_data, entry)])


class LastMatch(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "last_match"
    _attr_icon = "mdi:heart-half-full"

    def __init__(self, engine: Engine, entry: ConfigEntry) -> None:
        self.engine = engine
        self._attr_unique_id = f"{entry.entry_id}_last_match"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=TITLE,
            manufacturer="Casa Mia",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.engine.listen(self.async_write_ha_state))

    @property
    def native_value(self) -> str | None:
        last = self.engine.last
        if last is None:
            return None
        by = f" by {last['artist']}" if last["artist"] else ""
        return f"{last['title']}{by}"[:255]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            **(self.engine.last or {}),
            "away": self.engine.away,
            "no_titles": sorted(self.engine.silent),
        }
