"""Switches: open or close a guest/engineer login endpoint (off by default); each
commander's Track motion; and the camera compositor's pipeline, each stage running (on) or paused (off): the gatherer,
and the live generator and server; and whether Camera Commander cards may
play the main camera as live video over the picture."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_platform
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .commanders import CommanderEntity, add_commander_entities, unique_id
from .coordinator import CasaMiaCoordinator, async_post
from .guest import GuestEndpointEntity, add_endpoint_entities
from .motion import tracker
from .sensor import CasaMiaEntity, only_on

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    # Each commander's Security look switch is gone (2026.10.3-b76: the look is the Camera
    # Commander card's own option); so are their registry entries, so none is left
    # unavailable.
    registry = er.async_get(hass)
    for old in er.async_entries_for_config_entry(registry, entry.entry_id):
        if old.domain == "switch" and old.unique_id.endswith("security_look"):
            _LOGGER.info(
                "%s removed: the Security look is the Camera Commander card's own now",
                old.entity_id,
            )
            registry.async_remove(old.entity_id)
    add_commander_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda cid: [TrackMotionSwitch(coordinator, entry, cid)],
    )
    add_endpoint_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda i: [AccessSwitch(coordinator, entry, i)],
    )
    async_add_entities(
        only_on(
            coordinator,
            [
                *(PipelineSwitch(coordinator, entry, stage) for stage in PIPELINE),
                LiveMainSwitch(coordinator, entry),
            ],
        )
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
