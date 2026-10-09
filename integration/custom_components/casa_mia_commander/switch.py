"""Switches: each commander's Track motion."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from ..casa_mia.coordinator import CasaMiaCoordinator
from .commanders import CommanderEntity, add_commander_entities, unique_id
from .motion import tracker


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    add_commander_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda cid: [TrackMotionSwitch(coordinator, entry, cid)],
    )


class TrackMotionSwitch(CommanderEntity, SwitchEntity, RestoreEntity):
    """A commander's Track motion, on or off (by hand, or an automation: at night,
    while the alarm is set). Kept by Home Assistant over restarts; see motion.py."""

    _attr_translation_key = "track_motion"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, cid: str
    ) -> None:
        super().__init__(coordinator, entry, cid)
        self._attr_unique_id = unique_id(entry, cid, "track_motion", "track_motion")
        self._attr_is_on = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._set(last.state == "on")

    def _set(self, on: bool) -> None:
        self._attr_is_on = on
        tracker(self.coordinator, self.cid).enabled = on

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)
        self.async_write_ha_state()
