"""Binary sensor: is the tablet firmware server downloading a release right now?"""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import CasaMiaCoordinator
from .sensor import CasaMiaEntity, only_on


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(coordinator, [GitProxyDownloadingSensor(coordinator, entry)])
    )


class GitProxyDownloadingSensor(CasaMiaEntity, BinarySensorEntity):
    _module = "gitproxy"
    _attr_translation_key = "gitproxy_downloading"

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_downloading"

    @property
    def is_on(self) -> bool | None:
        return self.gitproxy.get("downloading")
