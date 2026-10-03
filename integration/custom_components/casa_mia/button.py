"""Buttons: force a firmware check now; reset the FONA's Arduino."""

from __future__ import annotations

import aiohttp
from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator, async_post
from .sensor import CasaMiaEntity, only_on


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(
            coordinator,
            [
                GitProxyCheckButton(coordinator, entry),
                FonaResetButton(coordinator, entry),
            ],
        )
    )


class GitProxyCheckButton(CasaMiaEntity, ButtonEntity):
    _module = "gitproxy"
    _attr_translation_key = "gitproxy_check"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_check"

    async def async_press(self) -> None:
        try:
            await async_post(self.hass, self.coordinator.url, "/gitproxy/check")
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(
                f"Check not started (is the firmware server enabled?): {exc}"
            ) from exc


class FonaResetButton(CasaMiaEntity, ButtonEntity):
    _module = "fona"
    _attr_translation_key = "fona_reset"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fona_reset"

    async def async_press(self) -> None:
        try:
            await async_post(self.hass, self.coordinator.url, "/fona/reset")
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(
                f"Not reset (is Phone and SMS switched on in the app?): {exc}"
            ) from exc
