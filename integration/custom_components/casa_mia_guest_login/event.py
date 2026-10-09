"""Events for automations: a visitor logged in through an endpoint."""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..casa_mia.coordinator import CasaMiaCoordinator
from .const import GUEST_LOGIN_EVENT
from .guest import GuestEndpointEntity, add_endpoint_entities


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    add_endpoint_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda i: [LoginEvent(coordinator, entry, i)],
    )


class LoginEvent(GuestEndpointEntity, EventEntity):
    _attr_translation_key = "login"
    _attr_event_types = ["login"]

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_login"

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()

        @callback
        def fired(event: Event) -> None:
            if event.data.get("endpoint") == self.endpoint_id:
                self._trigger_event("login", {"ip": event.data.get("ip")})
                self.async_write_ha_state()

        self.async_on_remove(self.hass.bus.async_listen(GUEST_LOGIN_EVENT, fired))
