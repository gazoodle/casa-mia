"""Problem: on while any watched sensor is at warning or worse (a task alone isn't one)."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import WatchEntity
from .levels import rank
from .watch import Watcher


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([ProblemSensor(entry.runtime_data, entry)])


class ProblemSensor(WatchEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, watcher: Watcher, entry: ConfigEntry) -> None:
        super().__init__(watcher, entry, "problem")

    @property
    def is_on(self) -> bool:
        return rank(self.watcher.summary()["worst"]) >= rank("warning")
