"""Sensors: is the guest login server serving? And each endpoint's last login and count."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from ..casa_mia.coordinator import CasaMiaCoordinator
from .guest import (
    GuestEndpointEntity,
    add_endpoint_entities,
    guest_module,
    login_device,
)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    if guest_module(coordinator).get("state") != "disabled":
        async_add_entities([GuestStateSensor(coordinator, entry)])
    add_endpoint_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda i: [
            GuestLastLoginSensor(coordinator, entry, i),
            GuestLoginsSensor(coordinator, entry, i),
        ],
    )


class GuestStateSensor(CoordinatorEntity[CasaMiaCoordinator], SensorEntity):
    """Is the guest login server serving? Attribute `error` carries any problem."""

    _attr_has_entity_name = True
    _attr_translation_key = "guest_state"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["running", "offline", "disabled"]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_guest_state"
        self._attr_device_info = login_device(entry, coordinator)

    @property
    def native_value(self) -> str | None:
        return guest_module(self.coordinator).get("state")

    @property
    def extra_state_attributes(self) -> dict:
        g = guest_module(self.coordinator)
        return {"port": g.get("port"), "error": g.get("error")}


class GuestLastLoginSensor(GuestEndpointEntity, SensorEntity):
    _attr_translation_key = "last_login"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_last_login"

    @property
    def native_value(self) -> datetime | None:
        return dt_util.parse_datetime(self.endpoint.get("last_login") or "")


class GuestLoginsSensor(GuestEndpointEntity, SensorEntity):
    _attr_translation_key = "logins"
    _attr_state_class = SensorStateClass.TOTAL_INCREASING

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_logins"

    @property
    def native_value(self) -> int | None:
        return self.endpoint.get("logins")
