"""Device triggers on the Sensor Watch device, so an automation can be built on it by
pointing and clicking: a watched sensor reached a level (or worse), escalated, or is back
to nominal, optionally in one group. Each rides on the casa_mia_sensor_watch event, as
Core's own event trigger (levels.trigger_matches says which events)."""

from __future__ import annotations

from contextlib import ExitStack
from typing import Any

import voluptuous as vol
from homeassistant.components.device_automation import DEVICE_TRIGGER_BASE_SCHEMA
from homeassistant.components.homeassistant.triggers import event as event_trigger
from homeassistant.const import (
    CONF_DEVICE_ID,
    CONF_DOMAIN,
    CONF_PLATFORM,
    CONF_TYPE,
)
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers.trigger import TriggerActionType, TriggerInfo
from homeassistant.helpers.typing import ConfigType

from . import admin
from .const import DOMAIN, EVENT
from .levels import LEVELS, TRIGGERS, trigger_matches

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


async def async_get_triggers(
    hass: HomeAssistant, device_id: str
) -> list[dict[str, Any]]:
    """Asked only for this integration's device, and it has the one."""
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
    found = admin.running(hass)
    records = found.watcher.records if found else {}
    groups = sorted({r["group"] for r in records.values() if r.get("group")})
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
