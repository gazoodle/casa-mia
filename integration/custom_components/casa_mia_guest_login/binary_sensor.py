"""Each endpoint's Waiting for first login: on while it's open and no one has signed in
since it opened, for an Over layer or a card's visibility (the code on the tablets until
the guest's first scan) without a test on the Logins count."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..casa_mia.coordinator import CasaMiaCoordinator
from .guest import GuestEndpointEntity, add_endpoint_entities


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    add_endpoint_entities(
        entry.runtime_data,
        entry,
        async_add_entities,
        lambda i: [GuestWaitingSensor(entry.runtime_data, entry, i)],
    )


class GuestWaitingSensor(GuestEndpointEntity, BinarySensorEntity):
    _attr_translation_key = "waiting"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_waiting"

    @property
    def is_on(self) -> bool | None:
        ep = self.endpoint
        if ep.get("enabled") is None or ep.get("logins") is None:
            return None
        return bool(ep["enabled"]) and ep["logins"] == 0
