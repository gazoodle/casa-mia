"""Switches: the camera compositor's pipeline, each stage running (on) or paused (off): the gatherer,
and the live generator and server; and whether Camera Commander cards may
play the main camera as live video over the picture."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator, async_post
from .sensor import CasaMiaEntity, only_on

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(
            coordinator,
            [
                *(PipelineSwitch(coordinator, entry, stage) for stage in PIPELINE),
                LiveMainSwitch(coordinator, entry),
            ],
        )
    )


# Each stage of the camera compositor's pipeline: its app path, and where its paused flag
# is in the compositor's health.
PIPELINE = {
    "gatherer": ("gatherer", (None, "gatherer_paused")),
    "live_generator": ("live/generator", (None, "generator_paused")),
    "live_server": ("live/server", (None, "server_paused")),
}


class PipelineSwitch(CasaMiaEntity, SwitchEntity):
    """A stage of the camera compositor's pipeline: on, running; off, paused (the
    gatherer fetches nothing, a generator draws nothing, a server sends nothing new)."""

    _module = "compositor"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, stage: str
    ) -> None:
        super().__init__(coordinator, entry)
        self._attr_translation_key = f"pipeline_{stage}"
        self._attr_unique_id = f"{entry.entry_id}_pipeline_{stage}"
        self._path, (self._part, self._flag) = PIPELINE[stage]

    def _health(self) -> dict:
        health = self.coordinator.data.get("modules", {}).get("compositor", {})
        return (health.get(self._part) or {}) if self._part else health

    @property
    def available(self) -> bool:
        return super().available and self._flag in self._health()

    @property
    def is_on(self) -> bool:
        return not self._health().get(self._flag, False)

    async def _set(self, running: bool) -> None:
        path = f"/compositor/{self._path}/{'run' if running else 'pause'}"
        try:
            await async_post(self.hass, self.coordinator.url, path)
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(
                f"Not done (is the camera compositor switched on in the app?): {exc}"
            ) from exc
        await self.coordinator.async_request_refresh()

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._set(False)


class LiveMainSwitch(CasaMiaEntity, SwitchEntity):
    """On: Camera Commander cards may play the main camera as live video over the
    picture (through Home Assistant's WebRTC; the compositor then leaves it out). Off:
    every card shows the drawn picture, main camera and all."""

    _module = "compositor"
    _attr_translation_key = "live_main"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_live_main"

    def _flags(self) -> dict:
        health = self.coordinator.data.get("modules", {}).get("compositor", {})
        return health.get("flags") or {}

    @property
    def available(self) -> bool:
        return super().available and "live_main" in self._flags()

    @property
    def is_on(self) -> bool:
        return bool(self._flags().get("live_main"))

    async def _set(self, on: bool) -> None:
        try:
            await async_post(
                self.hass,
                self.coordinator.url,
                "/compositor/flag",
                {"which": "live_main", "on": on},
            )
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(f"Not done: {exc}") from exc
        await self.coordinator.async_request_refresh()

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._set(False)
