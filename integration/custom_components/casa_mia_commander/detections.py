"""A commander camera's event entities, from whatever integration made them (UniFi
Protect's smart detections, doorbell, sounds). The Main camera select gives them to the
Camera Commander card as its `detections` attribute, for the detection chips; the
tracker (motion.py) keeps them current, as it does the motion sensors.

Only the entity registry is read: nothing here knows one camera system from another."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er


def on_device(registry: er.EntityRegistry, entity_id: str) -> list[er.RegistryEntry]:
    """The enabled entities on the same device as `entity_id` (none without one)."""
    entry = registry.async_get(entity_id)
    if not (entry and entry.device_id):
        return []
    return er.async_entries_for_device(registry, entry.device_id)


def event_entities(
    hass: HomeAssistant, cameras: list[str]
) -> dict[str, dict[str, str]]:
    """camera -> {event entity: its translation key, or ""}, for the cameras that have
    any. The key tells a Protect `vehicle` or `package` event from another `detected`."""
    registry = er.async_get(hass)
    out: dict[str, dict[str, str]] = {}
    for cam in cameras:
        found = {
            e.entity_id: e.translation_key or ""
            for e in on_device(registry, cam)
            if e.domain == "event"
        }
        if found:
            out[cam] = found
    return out
