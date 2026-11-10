"""Take over from Casa Mia. To 2026.11.3-b1 Sensor Watch was part of the Casa Mia
integration, its device and entities under Casa Mia's config entry. They move here with
the same device id, entity ids and registry ids, so history, dashboards and automations
carry on. Casa Mia's side (its sensor_watch.py) makes this integration's entry;
this side knows Casa Mia only by its name, and imports nothing from it.

Run at every setup, before the platforms; once moved there is nothing left to find."""

from __future__ import annotations

import inspect
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .entity import device_identifier, unique_id

_LOGGER = logging.getLogger(__name__)
OLD = "casa_mia"
WAS = "sensor_watch"  # its module's name there: in the device's and entities' old ids


def _old_device(
    devices: dr.DeviceRegistry, identifier: tuple[str, str], entry_id: str
) -> dr.DeviceEntry | None:
    """Home Assistant's newer call, where it has it: the older one is deprecated there
    (it stops working in 2027.8), and is all that 2026.3 has."""
    if hasattr(devices, "async_get_device_by_identifier"):
        return devices.async_get_device_by_identifier(identifier, entry_id)
    return devices.async_get_device(identifiers={identifier})


@callback
def take_over(hass: HomeAssistant, entry: ConfigEntry) -> None:
    devices, entities = dr.async_get(hass), er.async_get(hass)
    for old in hass.config_entries.async_entries(OLD):
        device = _old_device(devices, (OLD, f"{old.entry_id}_{WAS}"), old.entry_id)
        if device is None:
            continue

        # The entities first: newer Home Assistants delete what is still the old
        # entry's on a device as it changes entry.
        prefix = f"{old.entry_id}_{WAS}_"
        moved = []
        for entity in er.async_entries_for_device(
            entities, device.id, include_disabled_entities=True
        ):
            if entity.platform != OLD or not entity.unique_id.startswith(prefix):
                continue
            new_id = unique_id(entry, entity.unique_id.removeprefix(prefix))
            if entities.async_get_entity_id(entity.domain, entry.domain, new_id):
                _LOGGER.warning(
                    "%s not taken over from Casa Mia: this integration already has "
                    "that entity under another id. Delete whichever you don't want.",
                    entity.entity_id,
                )
                continue
            # Home Assistant shows an unloaded entity as unavailable (restored); that
            # state must go before the entity can change hands.
            hass.states.async_remove(entity.entity_id)
            entities.async_update_entity_platform(
                entity.entity_id,
                entry.domain,
                new_config_entry_id=entry.entry_id,
                new_unique_id=new_id,
                new_device_id=device.id,
            )
            moved.append(entity.entity_id)

        ours = {device_identifier(entry)}
        if (
            "new_config_entry_id"
            in inspect.signature(devices.async_update_device).parameters
        ):
            devices.async_update_device(
                device.id,
                new_config_entry_id=entry.entry_id,
                new_identifiers=ours,
                via_device_id=None,
            )
        else:
            # Older Home Assistants: joined before left, since a device with no entry
            # is deleted.
            devices.async_update_device(
                device.id,
                add_config_entry_id=entry.entry_id,
                new_identifiers=ours,
                via_device_id=None,
            )
            devices.async_update_device(device.id, remove_config_entry_id=old.entry_id)
        _LOGGER.info(
            "Sensor Watch taken over from the Casa Mia integration: its device and %d "
            "entities (%s) keep their ids and history",
            len(moved),
            ", ".join(moved) or "none",
        )
