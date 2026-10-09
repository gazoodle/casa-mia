"""Binary sensors: is the tablet firmware server downloading a release right now? And,
only where the screenshot swap's swap.json is beside this file, is the swap on?"""

from __future__ import annotations

import json
import logging
from datetime import timedelta
from pathlib import Path

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator
from .sensor import CasaMiaEntity, only_on

_LOGGER = logging.getLogger(__name__)

# The screenshot swap's file (the app's swap.py reads the same one). Only on a box
# set up for screenshots: never shipped, so the Swap sensor never shows elsewhere.
SWAP = Path(__file__).parent / "swap.json"
# Polled: the Swap sensor (the others follow the app's /health).
SCAN_INTERVAL = timedelta(seconds=5)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(coordinator, [GitProxyDownloadingSensor(coordinator, entry)])
    )
    if await hass.async_add_executor_job(SWAP.exists):
        async_add_entities([SwapSensor(coordinator, entry)], update_before_add=True)


class GitProxyDownloadingSensor(CasaMiaEntity, BinarySensorEntity):
    _module = "gitproxy"
    _attr_translation_key = "gitproxy_downloading"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_downloading"

    @property
    def is_on(self) -> bool | None:
        return self.gitproxy.get("downloading")


def swap_on() -> bool:
    """swap.json says `"swap": true` (off when it is gone or unreadable)."""
    try:
        return json.loads(SWAP.read_text()).get("swap") is True
    except (OSError, ValueError, AttributeError):
        return False


class SwapSensor(CasaMiaEntity, BinarySensorEntity):
    """The screenshot swap, on the app device: for conditional cards in screenshot
    layouts. Reads swap.json every SCAN_INTERVAL, as the app sees it within 5 s."""

    _attr_translation_key = "swap"
    _attr_should_poll = True

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_swap"
        self._attr_is_on = None

    async def async_update(self) -> None:
        # Its own file, not the app's /health (CoordinatorEntity would refresh that).
        on = await self.hass.async_add_executor_job(swap_on)
        if on != self._attr_is_on:
            _LOGGER.info("screenshot swap %s", "on" if on else "off")
        self._attr_is_on = on
