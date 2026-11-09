"""The call sensor: idle, ringing, answered or complete, on each doorbell's device."""

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import pure
from .call import DoorbellEntity, iso


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities(CallSensor(doorbell, "call") for doorbell in entry.runtime_data)


class CallSensor(DoorbellEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = pure.CALL_STATES

    @property
    def native_value(self) -> str:
        return self.doorbell.call.state

    @property
    def extra_state_attributes(self) -> dict:
        call = self.doorbell.call
        return {
            "answered_by": call.answered_by,
            # How a UI finds the call for the camera it shows (the Camera Commander card and the Talk tile).
            "camera_entities": self.doorbell.camera_entities,
            "outcome": call.outcome,
            "since": iso(call.since),
            "duplex": call.duplex,
            "held": call.held,
            # Every device counts down from this on its own clock: nothing sent each second.
            "ends_at": iso(call.ends_at),
        }
