"""Switches: open or close a guest/engineer login endpoint (off by default); and the
enable_for service, which opens one for a time."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..casa_mia.coordinator import CasaMiaCoordinator
from .guest import (
    GuestEndpointEntity,
    add_endpoint_entities,
    async_set_endpoint,
    guest_module,
)


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

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """For the cards' script in a visitor's browser: when the endpoint its user came
        through closes and signs visitors out, it sends the page to the goodbye first."""
        module = guest_module(self.coordinator)
        return {
            "guest_user_id": self.endpoint.get("user_id"),
            "signs_out": bool(self.endpoint.get("end_sessions")),
            "goodbye_url": module.get("goodbye_url"),
            "guest_port": module.get("port"),
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        await async_set_endpoint(self.coordinator, self.endpoint_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await async_set_endpoint(self.coordinator, self.endpoint_id, False)

    async def async_enable_for(self, minutes: float) -> None:
        """Service casa_mia_guest_login.enable_for: open the endpoint, then close it
        again."""
        await async_set_endpoint(self.coordinator, self.endpoint_id, True, minutes)
