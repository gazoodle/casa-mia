"""Jukebox's sensors. The Last announcement sensor: whether the last one played in every room it was meant
for, in some, or in none, with each room's result. It is where a speaker that didn't
play shows on a dashboard, and what Sensor Watch or an automation can watch."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import last_id, pure
from .announce import Jukebox, room_name
from .number import device
from .page import FEED
from .party import Parties


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities(
        [LastAnnouncement(entry), PutBack(entry, hass.data[FEED].parties)]
    )


class LastAnnouncement(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "last"
    _attr_icon = "mdi:bullhorn-outline"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [pure.ALL, pure.PARTLY, pure.NOTHING]

    def __init__(self, entry: ConfigEntry) -> None:
        self.jukebox: Jukebox = entry.runtime_data
        self._attr_unique_id = last_id(entry)
        self._attr_device_info = device(entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.jukebox.listen(self.async_write_ha_state))

    @property
    def native_value(self) -> str | None:
        return self.jukebox.last["result"] if self.jukebox.last else None

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        last = self.jukebox.last
        if last is None:
            return None
        return {
            "said": last["said"],
            "at": last["at"],
            "rooms": {
                room_name(self.hass, player): room["result"]
                for player, room in last["rooms"].items()
            },
        }


class PutBack(SensorEntity):
    """How many changes the party lock has put back since Home Assistant started, with
    the last one. A number that climbs during a party says someone keeps trying."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "put_back"
    _attr_icon = "mdi:undo-variant"

    def __init__(self, entry: ConfigEntry, parties: Parties) -> None:
        self.parties = parties
        self._attr_unique_id = f"{entry.entry_id}_put_back"
        self._attr_device_info = device(entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.parties.listen(self.async_write_ha_state))

    @property
    def native_value(self) -> int:
        return self.parties.put_back

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        return self.parties.last
