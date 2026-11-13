"""Love it or Loathe it: watches chosen media players' title and artist against groups
of songs, and acts when one comes on. A loved song can be turned up; a loathed one turned
down, muted, or left for another station for a few minutes. Every match fires the
`casa_mia_love_or_loathe` event, so an automation can do anything else.

Each group is a subentry with a select of its own, Love, Loathe or Ignore, and an action
for each of the first two, so an automation can change how a group is treated (the
shipped Christmas songs: loathed in November, loved in December). A group can belong to
a person, and the `rate` action (rating.py) adds the song playing to that person's loved
or loathed group. Each station to switch to is a subentry too. engine.py does the
watching and acting, pure.py the matching.

Several entries can be added, each with its own players, groups and stations, for rooms
that want different treatment; one entry watches as many players as it is given.

An integration of its own, wholly in Home Assistant: it imports nothing from Casa Mia
and works with no app.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from . import rating
from .const import (
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_FEELING,
    CONF_LIBRARY,
    CONF_MINUTES,
    CONF_PATTERNS,
    DEFAULT_ACTS,
    DOMAIN,
    GROUP,
    INSTALLED_EVENT,
    LOATHE,
    LOVE,
    RATE,
)
from .engine import Engine, store_key
from .pure import libraries
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SELECT, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# Read once, at import: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async def rate(call: ServiceCall) -> None:
        await rating.rate(hass, call)

    hass.services.async_register(DOMAIN, RATE, rate, schema=rating.SCHEMA)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Newer files than this code, written by the Casa Mia app: ask for the restart. Now,
    # and when the app says it has written some.
    await async_check_restart(hass, LOADED_VERSION)

    async def installed(_event: Event) -> None:
        await async_check_restart(hass, LOADED_VERSION)

    entry.async_on_unload(hass.bus.async_listen(INSTALLED_EVENT, installed))

    await _convert(hass, entry)
    engine = Engine(hass, entry)
    entry.runtime_data = engine
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await engine.start()

    # A group or station added or changed, or the players: start again with them.
    entry.async_on_unload(entry.add_update_listener(_reload))
    _LOGGER.info("Love it or Loathe it %s started", LOADED_VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.stop()
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await Store(hass, 1, store_key(entry)).async_remove()


async def _convert(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Groups as 2026.11.7-b2 to b4 kept them, into today's shape. Those builds were
    never released; this can go once the boxes that ran them have started a later one.

    - b2 named a shipped list on the group instead of holding its songs.
    - To b4 a group had a fixed kind, one action and an on/off switch. The kind becomes
      its feeling and the action that feeling's; the other feeling gets the usual one."""
    for group in list(entry.subentries.values()):
        data = dict(group.data)
        if group.subentry_type != GROUP or CONF_FEELING in data:
            continue

        shipped = (await hass.async_add_executor_job(libraries)).get(
            data.pop(CONF_LIBRARY, ""), {}
        )
        songs = [*shipped.get("patterns", []), data.get(CONF_PATTERNS, "")]
        data[CONF_PATTERNS] = "\n".join(songs).strip()

        kind = data.pop("kind")
        acts = {side: dict(act) for side, act in DEFAULT_ACTS.items()}
        acts[kind] = {
            key: data.pop(key) for key in (CONF_ACTION, CONF_AMOUNT, CONF_MINUTES)
        }
        data |= {CONF_FEELING: kind, LOVE: acts[LOVE], LOATHE: acts[LOATHE]}
        hass.config_entries.async_update_subentry(entry, group, data=data)
        _LOGGER.info("%s converted: its feeling is %s", group.title, kind)

    # The switch each group had; its select takes the switch's place.
    registry = er.async_get(hass)
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if entity.domain == "switch":
            registry.async_remove(entity.entity_id)


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
