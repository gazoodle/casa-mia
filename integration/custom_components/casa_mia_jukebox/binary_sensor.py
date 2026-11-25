"""The Party binary sensor: on while the party lock is on for any group of rooms
(party.py). It is what an automation follows to turn on a disco ball and the lights."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .number import device
from .page import FEED
from .party import Parties


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([Party(entry, hass.data[FEED].parties)])


class Party(BinarySensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "party"
    _attr_icon = "mdi:party-popper"

    def __init__(self, entry: ConfigEntry, parties: Parties) -> None:
        self.parties = parties
        self._attr_unique_id = f"{entry.entry_id}_party"
        self._attr_device_info = device(entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.parties.listen(self.async_write_ha_state))

    @property
    def is_on(self) -> bool:
        return bool(self.parties.rooms)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        # Each party's rooms, so an automation can act for one room and not another.
        return {"rooms": self.parties.rooms}
