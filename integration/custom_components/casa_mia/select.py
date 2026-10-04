"""Select: the Camera Commander's main camera. Taps on the commander's other cameras
set it, and so can automations (select.select_option, select.select_next)."""

from __future__ import annotations

import aiohttp
from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator, async_post
from .sensor import CasaMiaEntity, only_on


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(only_on(coordinator, [CommanderMainSelect(coordinator, entry)]))


class CommanderMainSelect(CasaMiaEntity, SelectEntity):
    _module = "camera_dashboard"
    _attr_translation_key = "commander_main"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_commander_main"
        self._chosen: str | None = None  # shown until the app's next report

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self.coordinator.motion:  # Track motion's switches show at once

            @callback
            def show(option: str) -> None:
                self._chosen = option
                self.async_write_ha_state()

            self.coordinator.motion.shown.append(show)
            self.async_on_remove(lambda: self.coordinator.motion.shown.remove(show))

    @property
    def commander(self) -> dict:
        module = self.coordinator.data.get("modules", {}).get("camera_dashboard", {})
        return module.get("commander") or {}

    @property
    def available(self) -> bool:
        return super().available and bool(self.commander.get("options"))

    @property
    def options(self) -> list[str]:
        return self.commander.get("options") or []

    @property
    def current_option(self) -> str | None:
        return self._chosen or self.commander.get("main")

    @callback
    def _handle_coordinator_update(self) -> None:
        self._chosen = None
        super()._handle_coordinator_update()

    async def async_select_option(self, option: str) -> None:
        try:
            await async_post(
                self.hass,
                self.coordinator.url,
                "/camera-dashboard/commander",
                {"main": option},
            )
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(f"Main camera not changed: {exc}") from exc
        self._chosen = option
        self.async_write_ha_state()
        if self.coordinator.motion:  # a choice by hand: Track motion pauses
            self.coordinator.motion.chosen_by_hand(option)
        await self.coordinator.async_request_refresh()
