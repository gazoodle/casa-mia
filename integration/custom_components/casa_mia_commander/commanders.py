"""The Camera Commanders: a device each, with its Main camera select and Track motion
switch. The first commander there was (id "") lives on the Camera Commander device
itself, so its entities keep their ids; each other one on its own device, "Camera
Commander <name>", linked to it. Commanders come and go with the app's reports."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..casa_mia.const import DOMAIN as CASA_MIA
from ..casa_mia.coordinator import CasaMiaCoordinator
from .const import DOMAIN, MODULE
from .motion import commander, commanders


def commander_device(entry: ConfigEntry, coordinator: CasaMiaCoordinator) -> DeviceInfo:
    """The Camera Commander device, linked to the Casa Mia app device."""
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name="Camera Commander",
        manufacturer="Casa Mia",
        via_device=(CASA_MIA, coordinator.config_entry.entry_id),
    )


def commanders_off(coordinator: CasaMiaCoordinator) -> bool:
    return (
        coordinator.data.get("modules", {}).get(MODULE, {}).get("state") == "disabled"
    )


def unique_id(entry: ConfigEntry, cid: str, first: str, other: str) -> str:
    """An entity's unique id: the first commander's as it always was, others' by id."""
    return (
        f"{entry.entry_id}_{first}"
        if not cid
        else f"{entry.entry_id}_commander_{cid}_{other}"
    )


class CommanderEntity(CoordinatorEntity[CasaMiaCoordinator]):
    """An entity of one commander (by id), on its device."""

    _attr_has_entity_name = True

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, cid: str
    ) -> None:
        super().__init__(coordinator)
        self.cid = cid
        self._attr_device_info = (
            DeviceInfo(
                identifiers={(DOMAIN, f"{entry.entry_id}_commander_{cid}")},
                name=f"Camera Commander {self.commander.get('name') or cid}",
                manufacturer="Casa Mia",
                via_device=(DOMAIN, entry.entry_id),
            )
            if cid
            else commander_device(entry, coordinator)
        )

    @property
    def commander(self) -> dict[str, Any]:
        return commander(self.coordinator, self.cid)


def add_commander_entities(
    coordinator: CasaMiaCoordinator,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    factory: Callable[[str], list[Entity]],
) -> None:
    """Add `factory(commander id)` entities now and for any commander that appears later
    (none while the commanders are off in the app)."""
    if commanders_off(coordinator):
        return
    known: set[str] = set()

    def add() -> None:
        ids = [c["id"] for c in commanders(coordinator)]
        if ids:  # one deleted and back again (a reverted draft) is added again
            known.intersection_update(ids)
        new = [cid for cid in ids if cid not in known]
        known.update(new)
        async_add_entities([e for cid in new for e in factory(cid)])

    add()
    entry.async_on_unload(coordinator.async_add_listener(add))


@callback
def async_prune_commander_devices(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: CasaMiaCoordinator
) -> None:
    """Remove the devices (and so their entities) of commanders the app no longer has
    (deleted on the Camera Commander page), and all of them while the commanders are
    switched off. Acts only on a definite answer: an app that is starting, or too old
    to say, must never wipe the devices."""
    module = coordinator.data.get("modules", {}).get("commander", {})
    prefix = f"{entry.entry_id}_commander_"
    if module.get("state") == "disabled":
        keep: set[str] = set()
    elif module.get("state") == "running" and "commanders" in module:
        keep = {f"{prefix}{c['id']}" for c in module["commanders"]}
    else:
        return
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if any(
            domain == DOMAIN and ident.startswith(prefix) and ident not in keep
            for domain, ident in device.identifiers
        ):
            registry.async_update_device(
                device.id, remove_config_entry_id=entry.entry_id
            )
