"""Sensors: the worst level now, and a count per level."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import CountSensor, StatusSensor
from .levels import LEVELS


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    watcher = entry.runtime_data
    async_add_entities(
        [
            StatusSensor(watcher, entry),
            *(CountSensor(watcher, entry, level) for level in LEVELS[1:]),
        ]
    )
