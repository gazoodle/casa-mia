"""Switch: open or close a guest/engineer login endpoint (off by default)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator
from .guest import GuestEndpointEntity, add_endpoint_entities


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    add_endpoint_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda i: [AccessSwitch(coordinator, entry, i)],
    )
    entity_platform.async_get_current_platform().async_register_entity_service(
        "enable_for",
        {
            vol.Required("minutes"): vol.All(
                vol.Coerce(float), vol.Range(min=1, max=1440)
            )
        },
        "async_enable_for",
    )


class AccessSwitch(GuestEndpointEntity, SwitchEntity):
    _attr_translation_key = "access"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_access"

    @property
    def is_on(self) -> bool | None:
        return self.endpoint.get("enabled")

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_guest_endpoint(self.endpoint_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_guest_endpoint(self.endpoint_id, False)

    async def async_enable_for(self, minutes: float) -> None:
        """Service casa_mia.enable_for: open the endpoint, then close it again."""
        await self.coordinator.async_set_guest_endpoint(self.endpoint_id, True, minutes)
