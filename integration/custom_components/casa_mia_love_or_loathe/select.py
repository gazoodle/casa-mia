"""A select per group: Love, Loathe or Ignore, its feeling now, which chooses between the
group's two actions. This is what an automation sets (Christmas songs loathed in
November, loved in December, ignored from January).

The feeling is kept on the group itself, so the form and this select show the one thing;
choosing here saves the group, which starts the watching again and so acts at once on
whatever is playing."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import trail
from .const import CONF_FEELING, DOMAIN, GROUP, IGNORE, LOATHE, LOVE
from .pure import felt


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    for subentry in entry.subentries.values():
        if subentry.subentry_type == GROUP:
            async_add_entities(
                [Feeling(entry, subentry.subentry_id)],
                config_subentry_id=subentry.subentry_id,
            )


class Feeling(SelectEntity):
    """The group's own device and its one entity, both removed by Home Assistant when
    the group is deleted. (A device can't be shared between the entry and its
    subentries.)"""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_should_poll = False
    _attr_translation_key = "feeling"
    _attr_options = [LOVE, LOATHE, IGNORE]

    def __init__(self, entry: ConfigEntry, group_id: str) -> None:
        self.entry = entry
        self.group_id = group_id
        self._attr_unique_id = group_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, group_id)},
            name=f"{entry.title}: {entry.subentries[group_id].title}",
            manufacturer="Casa Mia",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def current_option(self) -> str:
        return self.entry.subentries[self.group_id].data[CONF_FEELING]

    @property
    def icon(self) -> str:
        return {LOVE: "mdi:heart", LOATHE: "mdi:emoticon-sick"}.get(
            self.current_option, "mdi:heart-off-outline"
        )

    async def async_select_option(self, option: str) -> None:
        group = self.entry.subentries[self.group_id]
        data = felt(group.data, {**group.data, CONF_FEELING: option})
        trail.note(self.hass, self.entry, trail.EDIT, f"{group.title} set to {option}")
        self.hass.config_entries.async_update_subentry(self.entry, group, data=data)
