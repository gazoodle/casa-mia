"""Numbers: the camera compositor's paces, seconds between: the gatherer's fetches of each
camera channel (0: continuous, as fast as each answers), and each generator's drawings
(down to 0.125 s, 8 a second). The app keeps them across restarts."""

from __future__ import annotations

import aiohttp
from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator, async_post
from .sensor import CasaMiaEntity, only_on

# Each pace: its name in the app, and its range (as the app's compositor.PACES).
PACES = {
    "gatherer_pace": ("gatherer", 0.0, 15.0),
    "live_generator_pace": ("live", 0.125, 15.0),
    "preview_generator_pace": ("draft", 0.125, 15.0),
}


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(coordinator, [PaceNumber(coordinator, entry, key) for key in PACES])
    )


class PaceNumber(CasaMiaEntity, NumberEntity):
    _module = "compositor"
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS
    _attr_native_step = 0.125
    _attr_mode = NumberMode.BOX

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, key: str
    ) -> None:
        super().__init__(coordinator, entry)
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._which, self._attr_native_min_value, self._attr_native_max_value = PACES[
            key
        ]

    def _paces(self) -> dict:
        health = self.coordinator.data.get("modules", {}).get("compositor", {})
        return health.get("paces") or {}

    @property
    def available(self) -> bool:
        return super().available and self._which in self._paces()

    @property
    def native_value(self) -> float | None:
        return self._paces().get(self._which)

    async def async_set_native_value(self, value: float) -> None:
        try:
            await async_post(
                self.hass,
                self.coordinator.url,
                "/compositor/pace",
                {"which": self._which, "seconds": value},
            )
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(f"Pace not set: {exc}") from exc
        await self.coordinator.async_request_refresh()
