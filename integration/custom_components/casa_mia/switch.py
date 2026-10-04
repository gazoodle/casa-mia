"""Switches: open or close a guest/engineer login endpoint (off by default); the camera
dashboards' Security look (applied in the browser by the Keep camera pictures live
helper, which reads this switch and its css_filter)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .coordinator import CasaMiaCoordinator
from .guest import GuestEndpointEntity, add_endpoint_entities
from .sensor import CasaMiaEntity, only_on


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(
            coordinator,
            [
                SecurityLookSwitch(coordinator, entry),
                TrackMotionSwitch(coordinator, entry),
            ],
        )
    )
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


class SecurityLookSwitch(CasaMiaEntity, SwitchEntity, RestoreEntity):
    """The camera dashboards' Security look, on or off (by hand, or an automation at
    night). Kept by Home Assistant over restarts; the look itself (css_filter) is the
    one deployed live from the Camera Dashboard page."""

    _module = "camera_dashboard"
    _attr_translation_key = "security_look"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_security_look"
        self._attr_is_on = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._attr_is_on = last.state == "on"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        module = self.coordinator.data.get("modules", {}).get("camera_dashboard", {})
        return {"css_filter": module.get("look_css") or ""}

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._attr_is_on = False
        self.async_write_ha_state()


class TrackMotionSwitch(CasaMiaEntity, SwitchEntity, RestoreEntity):
    """The commander's Track motion, on or off (by hand, or an automation: at night,
    while the alarm is set). Kept by Home Assistant over restarts; see motion.py."""

    _module = "camera_dashboard"
    _attr_translation_key = "track_motion"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_track_motion"
        self._attr_is_on = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._set(last.state == "on")

    def _set(self, on: bool) -> None:
        self._attr_is_on = on
        if self.coordinator.motion:
            self.coordinator.motion.enabled = on

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)
        self.async_write_ha_state()
