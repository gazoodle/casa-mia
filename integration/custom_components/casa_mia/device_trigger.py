"""Sensor Watch's device triggers under their old domain. An automation made to
2026.11.3-b1 names this domain with Sensor Watch's device, which is now its own
integration's (casa_mia_sensor_watch): such a trigger is passed on to that one's, so the
automation keeps firing. New ones are offered there, none here.

Only a schema, and no async_validate_trigger_config: with one, Home Assistant refuses a
trigger whose device has no config entry of this domain, as none of these has."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.device_automation import (
    DEVICE_TRIGGER_BASE_SCHEMA,
    DeviceAutomationType,
    async_get_device_automation_platform,
)
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers.trigger import TriggerActionType, TriggerInfo
from homeassistant.helpers.typing import ConfigType

from .sensor_watch import THEIRS

# Sensor Watch's own schema checks the rest, when the trigger is attached.
TRIGGER_SCHEMA = DEVICE_TRIGGER_BASE_SCHEMA.extend({}, extra=vol.ALLOW_EXTRA)


async def _theirs(hass: HomeAssistant) -> Any:
    """Sensor Watch's triggers; InvalidDeviceAutomationConfig if it isn't installed,
    which the automation then shows."""
    return await async_get_device_automation_platform(
        hass, THEIRS, DeviceAutomationType.TRIGGER
    )


async def async_get_triggers(
    hass: HomeAssistant, device_id: str
) -> list[dict[str, Any]]:
    return []


async def async_get_trigger_capabilities(
    hass: HomeAssistant, config: ConfigType
) -> dict[str, vol.Schema]:
    return await (await _theirs(hass)).async_get_trigger_capabilities(hass, config)


async def async_attach_trigger(
    hass: HomeAssistant,
    config: ConfigType,
    action: TriggerActionType,
    trigger_info: TriggerInfo,
) -> CALLBACK_TYPE:
    theirs = await _theirs(hass)
    return await theirs.async_attach_trigger(
        hass, theirs.TRIGGER_SCHEMA(config), action, trigger_info
    )
