"""What Love it or Loathe it is doing to the players, where it is installed.

The two integrations share no code. Love it or Loathe it's Last match sensors carry a
`players` attribute: for each player, what was last done to it, why, and whether that
is still in force (`now`). Jukebox reads it for two things: the players show the reason
for a mute, a volume or a station that nobody at the page chose, and the party lock
leaves those changes alone, which it would otherwise take for a guest's and put back.

The sensors are found in the entity registry and followed by their state events (RULE
FOUR). A sensor that goes unavailable says nothing, so nothing is taken to be in force.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID, EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

LOVE = "casa_mia_love_or_loathe"


class Love:
    def __init__(self, hass: HomeAssistant, changed: Callable[[], None]) -> None:
        self.hass = hass
        self._changed = changed
        self._sensors: frozenset[str] | None = None
        # For as long as Home Assistant runs, as the feed is: a party needs it with no
        # page open.
        hass.bus.async_listen(EVENT_STATE_CHANGED, self._heard, event_filter=self._ours)
        hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed)

    @property
    def sensors(self) -> frozenset[str]:
        if self._sensors is None:
            self._sensors = frozenset(
                entry.entity_id
                for entry in er.async_get(self.hass).entities.values()
                if entry.platform == LOVE and entry.domain == "sensor"
            )
        return self._sensors

    def of(self, room: str) -> dict[str, Any] | None:
        """What was last done to this room's player, or None."""
        for sensor in self.sensors:
            state = self.hass.states.get(sensor)
            said = state.attributes.get("players") if state else None
            if isinstance(said, Mapping) and isinstance(said.get(room), Mapping):
                return dict(said[room])
        return None

    def acting(self, room: str) -> bool:
        """Whether something Love it or Loathe it did to this room is in force now."""
        said = self.of(room)
        return bool(said and said.get("now"))

    @callback
    def _ours(self, data: Mapping[str, Any]) -> bool:
        return data[ATTR_ENTITY_ID] in self.sensors

    @callback
    def _heard(self, _event: Event) -> None:
        self._changed()

    @callback
    def _registry_changed(self, _event: Event) -> None:
        self._sensors = None
        self._changed()
