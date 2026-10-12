"""Sensor Watch's entities, on its module device: the worst level now (with the
culprits per level in its attributes, the longest standing first), a count per level,
and Problem (on at warning or worse; a task alone isn't one). Updated by the watcher,
not polled."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.components.button import ButtonEntity
from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from ..const import DOMAIN
from .const import MODULE
from .levels import LEVELS, rank
from .watch import Watcher


def unique_id(entry: ConfigEntry, key: str) -> str:
    return f"{entry.entry_id}_{MODULE}_{key}"


class WatchEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, watcher: Watcher, entry: ConfigEntry, key: str) -> None:
        self.watcher = watcher
        self._attr_translation_key = f"{MODULE}_{key}"
        self._attr_unique_id = unique_id(entry, key)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{entry.entry_id}_{MODULE}")}
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.watcher.listen(self.async_write_ha_state))


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


class ProblemSensor(WatchEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, watcher: Watcher, entry: ConfigEntry) -> None:
        super().__init__(watcher, entry, "problem")

    @property
    def is_on(self) -> bool:
        return rank(self.watcher.summary()["worst"]) >= rank("warning")


class RefreshButton(WatchEntity, ButtonEntity):
    """Refresh state: the watches fetched again and judged afresh (Watcher.afresh)."""

    def __init__(self, watcher: Watcher, entry: ConfigEntry) -> None:
        super().__init__(watcher, entry, "refresh")

    async def async_press(self) -> None:
        await self.watcher.afresh()


def sensors(watcher: Watcher, entry: ConfigEntry) -> list[SensorEntity]:
    return [
        StatusSensor(watcher, entry),
        *(CountSensor(watcher, entry, level) for level in LEVELS[1:]),
    ]


# The keys Sensor Watch's own integration used (its unique ids: <its entry id>_<key>).
KEYS = ("status", "problem", *(f"{lv}_count" for lv in LEVELS[1:]))
