"""Switches: open or close a guest/engineer login endpoint (off by default); the camera
dashboards' Security look and Track motion, each commander's own (the look is applied
in the browser by the Keep camera pictures live helper, which reads these switches)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_platform
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .commanders import CommanderEntity, add_commander_entities, unique_id
from .const import DOMAIN
from .coordinator import CasaMiaCoordinator
from .guest import GuestEndpointEntity, add_endpoint_entities
from .motion import commanders, tracker


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    add_commander_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda cid: [
            SecurityLookSwitch(coordinator, entry, cid),
            TrackMotionSwitch(coordinator, entry, cid),
        ],
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


class SecurityLookSwitch(CommanderEntity, SwitchEntity, RestoreEntity):
    """A commander's Security look, on or off (by hand, or an automation at night). Kept
    by Home Assistant over restarts; the look itself (css_filter) is the one saved on
    the Camera Dashboard page, the same for every commander.

    Its attributes tell the Keep camera pictures live helper what to do: `pictures`, the
    addresses of this commander's picture (the first in the list also answers to the
    address from before there were several); `main_select`, its Main camera select (a
    new main camera is a new highlight, whose pulse the helper starts); and `looks`,
    every commander's Security look switch, so the helper finds them all from the first
    (switch.camera_commander_security_look)."""

    _attr_translation_key = "security_look"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, cid: str
    ) -> None:
        super().__init__(coordinator, entry, cid)
        self._attr_unique_id = unique_id(entry, cid, "security_look", "security_look")
        self._attr_is_on = False
        self._entry_id = entry.entry_id

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._attr_is_on = last.state == "on"

    def _entity_id(self, domain: str, cid: str, first: str, other: str) -> str | None:
        return er.async_get(self.hass).async_get_entity_id(
            domain,
            DOMAIN,
            f"{self._entry_id}_commander_{cid}_{other}"
            if cid
            else f"{self._entry_id}_{first}",
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        module = self.coordinator.data.get("modules", {}).get("camera_dashboard", {})
        every = commanders(self.coordinator)
        pictures = [self.commander.get("picture") or ""]
        if every and every[0].get("id") == self.cid:
            pictures.append("/g/commander.mjpg")
        looks = [
            self._entity_id("switch", c["id"], "security_look", "security_look")
            for c in every
        ]
        return {
            "css_filter": module.get("look_css") or "",
            "pictures": [p for p in pictures if p],
            "main_select": self._entity_id(
                "select", self.cid, "commander_main", "main"
            ),
            "looks": [e for e in looks if e],
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._attr_is_on = False
        self.async_write_ha_state()


class TrackMotionSwitch(CommanderEntity, SwitchEntity, RestoreEntity):
    """A commander's Track motion, on or off (by hand, or an automation: at night,
    while the alarm is set). Kept by Home Assistant over restarts; see motion.py."""

    _attr_translation_key = "track_motion"

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, cid: str
    ) -> None:
        super().__init__(coordinator, entry, cid)
        self._attr_unique_id = unique_id(entry, cid, "track_motion", "track_motion")
        self._attr_is_on = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._set(last.state == "on")

    def _set(self, on: bool) -> None:
        self._attr_is_on = on
        tracker(self.coordinator, self.cid).enabled = on

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)
        self.async_write_ha_state()
