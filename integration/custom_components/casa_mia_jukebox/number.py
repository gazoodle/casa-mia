"""A number for each room: the volume its announcements play at, which is not the
volume of its music. A clip carries its own volume, and the speaker's is left alone."""

from __future__ import annotations

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import volume_id
from .announce import Jukebox, room_name
from .const import CONF_PLAYERS, DEFAULT_VOLUME, DOMAIN


def device(entry: ConfigEntry) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer="Casa Mia",
        entry_type=DeviceEntryType.SERVICE,
    )


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities(
        AnnouncementVolume(hass, entry, player)
        for player in entry.options.get(CONF_PLAYERS, [])
    )


class AnnouncementVolume(RestoreNumber):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "volume"
    _attr_icon = "mdi:bullhorn"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_mode = NumberMode.SLIDER
    _attr_native_min_value = 1
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = PERCENTAGE

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, player: str) -> None:
        self.jukebox: Jukebox = entry.runtime_data
        self.player = player
        self._attr_unique_id = volume_id(entry, player)
        self._attr_translation_placeholders = {"room": room_name(hass, player)}
        self._attr_device_info = device(entry)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        kept = await self.async_get_last_number_data()
        value = kept.native_value if kept and kept.native_value else DEFAULT_VOLUME
        self.jukebox.volumes[self.player] = round(value)

    @property
    def native_value(self) -> float:
        return self.jukebox.volumes.get(self.player, DEFAULT_VOLUME)

    async def async_set_native_value(self, value: float) -> None:
        self.jukebox.volumes[self.player] = round(value)
        self.async_write_ha_state()
