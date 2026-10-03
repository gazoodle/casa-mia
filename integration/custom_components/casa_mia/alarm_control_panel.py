"""The intruder alarm panel: arm (away) and disarm with a code, state from the panel's
sensors. The logic is in alarm.py; this is the Home Assistant glue. It does not use the
app, so it stays up while the app restarts."""

from __future__ import annotations

import logging

from homeassistant.components.alarm_control_panel import (
    AlarmControlPanelEntity,
    AlarmControlPanelEntityFeature,
    AlarmControlPanelState,
    CodeFormat,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from . import alarm
from .const import CONF_ALARM_CODE, DOMAIN
from .sensor import device_name, modules_off

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    if "alarm" in modules_off(entry.runtime_data):
        _LOGGER.info("alarm panel is switched off in the app: not set up")
        return
    _LOGGER.info("alarm panel is switched on in the app: set up")
    async_add_entities([CasaMiaAlarm(entry)])


class CasaMiaAlarm(AlarmControlPanelEntity):
    # Named after its device, so the house name: alarm_control_panel.villa_rosa_alarm.
    _attr_has_entity_name = True
    _attr_name = None
    _attr_code_format = CodeFormat.NUMBER
    _attr_supported_features = AlarmControlPanelEntityFeature.ARM_AWAY

    def __init__(self, entry: ConfigEntry) -> None:
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_alarm"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{entry.entry_id}_alarm")},
            name=device_name(entry.runtime_data, "alarm"),
            manufacturer="Casa Mia",
            via_device=(DOMAIN, entry.entry_id),
        )
        self._attr_alarm_state = AlarmControlPanelState.DISARMED

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_track_state_change_event(self.hass, alarm.SENSORS, self._sensors)
        )
        self._read_sensors()

    @callback
    def _sensors(self, event: Event[EventStateChangedData]) -> None:
        self._read_sensors()
        self.async_write_ha_state()

    def _read_sensors(self) -> None:
        armed, triggered = (self.hass.states.get(e) for e in alarm.SENSORS)
        self._attr_alarm_state = AlarmControlPanelState(
            alarm.panel_state(
                armed.state if armed else None, triggered.state if triggered else None
            )
        )

    async def async_alarm_arm_away(self, code: str | None = None) -> None:
        await self._go(code, alarm.ARMED_AWAY, AlarmControlPanelState.ARMING)

    async def async_alarm_disarm(self, code: str | None = None) -> None:
        await self._go(code, alarm.DISARMED, AlarmControlPanelState.DISARMING)

    async def _go(
        self, code: str | None, target: str, pending: AlarmControlPanelState
    ) -> None:
        configured = self._entry.options.get(CONF_ALARM_CODE)
        if not configured:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="alarm_no_code"
            )
        if not alarm.code_ok(code, configured):
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="alarm_wrong_code"
            )
        if not alarm.needs_press(self._attr_alarm_state or alarm.DISARMED, target):
            return
        # Shown until the sensors report the panel's new state.
        self._attr_alarm_state = pending
        self.async_write_ha_state()
        await alarm.press(
            lambda domain, service, entity_id: self.hass.services.async_call(
                domain, service, {"entity_id": entity_id}, blocking=True
            )
        )
