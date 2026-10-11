"""Sensors: the worst level now (with the culprits per level in its attributes, the
longest standing first) and a count per level."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import WatchEntity
from .levels import LEVELS
from .watch import Watcher


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    watcher: Watcher = entry.runtime_data
    async_add_entities(
        [
            StatusSensor(watcher, entry),
            *(CountSensor(watcher, entry, level) for level in LEVELS[1:]),
        ]
    )


class StatusSensor(WatchEntity, SensorEntity):
    """The worst level of all the watched sensors. Attributes: how many are watched,
    and per level its culprits (`warning_list`...: entity, name, value, message, since)."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(LEVELS)

    def __init__(self, watcher: Watcher, entry: ConfigEntry) -> None:
        super().__init__(watcher, entry, "status")

    @property
    def native_value(self) -> str:
        return self.watcher.summary()["worst"]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        s = self.watcher.summary()
        return {
            "watching": s["watching"],
            **{f"{lv}_list": s[f"{lv}_list"] for lv in LEVELS[1:]},
        }


class CountSensor(WatchEntity, SensorEntity):
    """How many watched sensors are at one level now."""

    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, watcher: Watcher, entry: ConfigEntry, level: str) -> None:
        super().__init__(watcher, entry, f"{level}_count")
        self.level = level

    @property
    def native_value(self) -> int:
        return self.watcher.summary()[self.level]
