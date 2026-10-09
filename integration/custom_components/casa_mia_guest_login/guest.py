"""Shared pieces for the guest-login entities: the Guest login device, one child device
per endpoint, and the call that opens or closes an endpoint."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..casa_mia.const import DOMAIN as CASA_MIA
from ..casa_mia.coordinator import CasaMiaCoordinator, async_post
from .const import DOMAIN, MODULE


def guest_module(coordinator: CasaMiaCoordinator) -> dict[str, Any]:
    """The guest_login module's health from /health (empty if the app lacks it)."""
    return coordinator.data.get("modules", {}).get(MODULE, {})


def login_device(entry: ConfigEntry, coordinator: CasaMiaCoordinator) -> DeviceInfo:
    """The Guest login device, linked to the Casa Mia app device."""
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name="Guest login",
        manufacturer="Casa Mia",
        via_device=(CASA_MIA, coordinator.config_entry.entry_id),
    )


async def async_set_endpoint(
    coordinator: CasaMiaCoordinator,
    endpoint_id: str,
    on: bool,
    minutes: float | None = None,
) -> None:
    """Open or close a guest-login endpoint in the app (optionally for `minutes`)."""
    path = f"/guest-login/{endpoint_id}/{'enable' if on else 'disable'}"
    if on and minutes:
        path += f"?minutes={minutes}"
    try:
        await async_post(coordinator.hass, coordinator.url, path)
    except aiohttp.ClientError as exc:
        raise HomeAssistantError(f"Guest login endpoint not changed: {exc}") from exc
    await coordinator.async_request_refresh()


class GuestEndpointEntity(CoordinatorEntity[CasaMiaCoordinator]):
    """An entity of one endpoint (a guest suite, a KNX panel), on that endpoint's device."""

    _attr_has_entity_name = True

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator)
        self.endpoint_id = endpoint_id
        # Prefixed so the devices stand apart from the house's own: "Guest: Top bed".
        prefix = "Engineer" if self.endpoint.get("type") == "engineer" else "Guest"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{entry.entry_id}_guest_{endpoint_id}")},
            name=f"{prefix}: {self.endpoint.get('label', endpoint_id)}",
            manufacturer="Casa Mia",
            via_device=(DOMAIN, entry.entry_id),
        )

    @property
    def endpoint(self) -> dict[str, Any]:
        return (
            guest_module(self.coordinator)
            .get("endpoints", {})
            .get(self.endpoint_id, {})
        )


def add_endpoint_entities(
    coordinator: CasaMiaCoordinator,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    factory: Callable[[str], list[Entity]],
) -> None:
    """Add `factory(endpoint_id)` entities now and for any endpoint that appears later."""
    known: set[str] = set()

    def add() -> None:
        new = [
            i for i in guest_module(coordinator).get("endpoints", {}) if i not in known
        ]
        known.update(new)
        async_add_entities([e for i in new for e in factory(i)])

    add()
    entry.async_on_unload(coordinator.async_add_listener(add))


@callback
def async_prune_endpoint_devices(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: CasaMiaCoordinator
) -> None:
    """Remove the devices (and so their entities) of endpoints the app no longer has, for
    example after one was renamed or deleted in the app options, and all of them while guest
    login is switched off. Acts only on a definite `running` or `disabled`: an app that is
    starting, or too old to say, must never wipe the devices."""
    module = guest_module(coordinator)
    state = module.get("state")
    if state not in ("running", "disabled"):
        return
    prefix = f"{entry.entry_id}_guest_"
    keep = (
        {f"{prefix}{i}" for i in module.get("endpoints", {})}
        if state == "running"
        else set()
    )
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        stale = [
            ident
            for domain, ident in device.identifiers
            if domain == DOMAIN and ident.startswith(prefix) and ident not in keep
        ]
        if stale:
            registry.async_update_device(
                device.id, remove_config_entry_id=entry.entry_id
            )
