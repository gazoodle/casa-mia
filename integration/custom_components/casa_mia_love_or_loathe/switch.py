"""A switch per group: whether its songs are acted on. On when first made, and it comes
back from a restart as it was left. This is what an automation turns on and off."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN, GROUP
from .engine import Engine


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    for subentry in entry.subentries.values():
        if subentry.subentry_type == GROUP:
            async_add_entities(
                [GroupSwitch(entry.runtime_data, entry, subentry.subentry_id)],
                config_subentry_id=subentry.subentry_id,
            )


class GroupSwitch(SwitchEntity, RestoreEntity):
    """The group's own device and its one entity, both removed by Home Assistant when
    the group is deleted. (A device can't be shared between the entry and its
    subentries.)"""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_should_poll = False
    _attr_icon = "mdi:playlist-music"

    def __init__(self, engine: Engine, entry: ConfigEntry, group_id: str) -> None:
        self.engine = engine
        self.group_id = group_id
        self._attr_unique_id = group_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, group_id)},
            name=f"{entry.title}: {entry.subentries[group_id].title}",
            manufacturer="Casa Mia",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        last = await self.async_get_last_state()
        if last is not None and last.state == STATE_OFF:
            self.engine.off.add(self.group_id)

    @property
    def is_on(self) -> bool:
        return self.group_id not in self.engine.off

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.engine.off.discard(self.group_id)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.engine.off.add(self.group_id)
        self.async_write_ha_state()
