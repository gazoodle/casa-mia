"""Events for automations: a call or text reached the FONA, authorised or an
intrusion."""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import FONA_EVENT
from .coordinator import CasaMiaCoordinator
from .sensor import CasaMiaEntity, only_on


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(
            coordinator,
            [
                FonaEvent(coordinator, entry, "call"),
                FonaEvent(coordinator, entry, "text"),
            ],
        )
    )


class FonaEvent(CasaMiaEntity, EventEntity):
    """A call or a text: type `authorised` (with who) or `intrusion` (with why).
    Attributes: number (+44...), who, message (texts), reason (intrusions)."""

    _module = "fona"
    _attr_event_types = ["authorised", "intrusion"]

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, kind: str
    ) -> None:
        super().__init__(coordinator, entry)
        self.kind = kind
        self._attr_translation_key = f"fona_{kind}"
        self._attr_unique_id = f"{entry.entry_id}_fona_{kind}"

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()

        @callback
        def fired(event: Event) -> None:
            data = event.data
            if data.get("kind") != self.kind:
                return
            self._trigger_event(
                "authorised" if data.get("authorised") else "intrusion",
                {k: data.get(k) for k in ("number", "who", "message", "reason")},
            )
            self.async_write_ha_state()

        self.async_on_remove(self.hass.bus.async_listen(FONA_EVENT, fired))
