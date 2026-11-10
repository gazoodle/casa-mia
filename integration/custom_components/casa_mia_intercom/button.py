"""End call: hangs up whichever device answered, from anywhere."""

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .call import DoorbellEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities(
        EndCallButton(doorbell, "end_call") for doorbell in entry.runtime_data
    )


class EndCallButton(DoorbellEntity, ButtonEntity):
    async def async_press(self) -> None:
        self.doorbell.end()
