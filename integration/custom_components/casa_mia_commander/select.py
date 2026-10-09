"""Select: each Camera Commander's main camera. Taps on the commander's other cameras
set it, and so can automations (select.select_option, select.select_next)."""

from __future__ import annotations

from typing import Any

import aiohttp
from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..casa_mia.coordinator import CasaMiaCoordinator, async_post
from .commanders import CommanderEntity, add_commander_entities, unique_id
from .motion import tracker


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    add_commander_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda cid: [CommanderMainSelect(coordinator, entry, cid)],
    )


class CommanderMainSelect(CommanderEntity, SelectEntity):
    """A commander's main camera. Its `card` attribute is what the Camera Commander card
    (Casa Mia's www/cm-cards.js) draws the commander from: layout, picture, cameras (see the app's
    commander.Live._card); `motion` each camera's motion sensor, which the card watches to
    mark its tile. Kept out of the recorder: they only matter now."""

    _attr_translation_key = "commander_main"
    _unrecorded_attributes = frozenset({"card", "motion"})

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, cid: str
    ) -> None:
        super().__init__(coordinator, entry, cid)
        self._attr_unique_id = unique_id(entry, cid, "commander_main", "main")
        self._chosen: str | None = None  # shown until the app's next report

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()

        @callback  # Track motion's switches show at once
        def show(option: str) -> None:
            self._chosen = option
            self.async_write_ha_state()

        shown = tracker(self.coordinator, self.cid).shown
        shown.append(show)
        self.async_on_remove(lambda: shown.remove(show))

    @property
    def available(self) -> bool:
        return super().available and bool(self.commander.get("options"))

    @property
    def options(self) -> list[str]:
        return self.commander.get("options") or []

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        sensors = tracker(self.coordinator, self.cid).sensors  # sensor -> camera
        return {
            "card": self.commander.get("card"),
            "motion": {camera: sensor for sensor, camera in sensors.items()},
        }

    @property
    def current_option(self) -> str | None:
        return self._chosen or self.commander.get("main")

    @callback
    def _handle_coordinator_update(self) -> None:
        self._chosen = None
        super()._handle_coordinator_update()

    async def async_select_option(self, option: str) -> None:
        try:
            await async_post(
                self.hass,
                self.coordinator.url,
                "/commander/main",
                {"main": option, "commander": self.cid},
            )
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(f"Main camera not changed: {exc}") from exc
        self._chosen = option
        self.async_write_ha_state()
        tracker(self.coordinator, self.cid).chosen_by_hand(
            option
        )  # Track motion pauses
        await self.coordinator.async_request_refresh()
