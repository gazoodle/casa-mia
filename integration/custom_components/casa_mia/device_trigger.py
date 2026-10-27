"""Device triggers on the Sensor Watch device, so an automation can be built on it by
pointing and clicking: a watched sensor reached a level (or worse), escalated, or is back
to nominal, optionally in one group. Each rides on the casa_mia_sensor_watch event, as
Core's own event trigger (sensor_watch/levels.trigger_matches says which events)."""

from __future__ import annotations

from contextlib import ExitStack
from typing import Any

import voluptuous as vol
from homeassistant.components.device_automation import (
    DEVICE_TRIGGER_BASE_SCHEMA,
    DeviceNotFound,
)
from homeassistant.components.homeassistant.triggers import event as event_trigger
from homeassistant.const import (
    CONF_DEVICE_ID,
    CONF_DOMAIN,
    CONF_PLATFORM,
    CONF_TYPE,
)
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.trigger import TriggerActionType, TriggerInfo
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .coordinator import running_coordinator
from .sensor_watch.const import EVENT, MODULE
from .sensor_watch.levels import LEVELS, TRIGGERS, trigger_matches

LEVEL = "level"
GROUP = "group"
CHOOSABLE = list(LEVELS[1:])  # a level to reach: task to critical

TRIGGER_SCHEMA = DEVICE_TRIGGER_BASE_SCHEMA.extend(
    {
        vol.Required(CONF_TYPE): vol.In(TRIGGERS),
        vol.Optional(LEVEL): vol.In(CHOOSABLE),
        vol.Optional(GROUP): str,
    }
)


def _sensor_watch(hass: HomeAssistant, device_id: str) -> bool:
    """Is this the Sensor Watch device (its module's, under Casa Mia's entry)?"""
    device = dr.async_get(hass).async_get(device_id)
    if device is None:
        raise DeviceNotFound(f"Device ID {device_id} is not valid")
    return any(d == DOMAIN and i.endswith(f"_{MODULE}") for d, i in device.identifiers)


async def async_get_triggers(
    hass: HomeAssistant, device_id: str
) -> list[dict[str, Any]]:
    """Sensor Watch's triggers, on its device only."""
    if not _sensor_watch(hass, device_id):
        return []
    return [
        {
            CONF_PLATFORM: "device",
            CONF_DOMAIN: DOMAIN,
            CONF_DEVICE_ID: device_id,
            CONF_TYPE: kind,
        }
        for kind in TRIGGERS
    ]


async def async_get_trigger_capabilities(
    hass: HomeAssistant, config: ConfigType
) -> dict[str, vol.Schema]:
    """The trigger's choices: the level to reach (or worse), and a group, from the
    groups on the Sensor Watch page now (empty: every watched sensor)."""
    coordinator = running_coordinator(hass)
    watcher = coordinator.sensor_watch if coordinator else None
    groups = sorted(
        {
            r["group"]
            for r in (watcher.records if watcher else {}).values()
            if r.get("group")
        }
    )
    fields: dict[Any, Any] = {}
    if config[CONF_TYPE] == "reached":
        fields[vol.Required(LEVEL, default="warning")] = vol.In(CHOOSABLE)
    if groups:
        fields[vol.Optional(GROUP)] = vol.In(groups)
    return {"extra_fields": vol.Schema(fields)}


async def async_attach_trigger(
    hass: HomeAssistant,
    config: ConfigType,
    action: TriggerActionType,
    trigger_info: TriggerInfo,
) -> CALLBACK_TYPE:
    """Core's event trigger for each event that counts (several for "or worse"). Held
    together: if one fails to attach, those already attached come off with it."""
    with ExitStack() as attached:
        for data in trigger_matches(
            config[CONF_TYPE], config.get(LEVEL), config.get(GROUP)
        ):
            event_config = event_trigger.TRIGGER_SCHEMA(
                {
                    event_trigger.CONF_PLATFORM: "event",
                    event_trigger.CONF_EVENT_TYPE: EVENT,
                    event_trigger.CONF_EVENT_DATA: data,
                }
            )
            attached.callback(
                await event_trigger.async_attach_trigger(
                    hass, event_config, action, trigger_info, platform_type="device"
                )
            )
        return attached.pop_all().close
