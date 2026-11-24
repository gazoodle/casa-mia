"""Jukebox: the house's music in one place. Built so far: announcements, and a page of
its own with a small card for a dashboard.

The page (page.py, /jukebox in the sidebar) shows what every Sonos room is playing, with
a big player for each: play, pause and skip, each room's volume, rooms joined and taken
out, and the Sonos favourites. Everything it does goes through feed.py.

The `announce` action plays a chime, a sound, some words, or all three in that order, in
the rooms asked for, each at its own announcement volume (number.py). It respects quiet
hours unless told the announcement has priority, lines announcements up on each speaker
(announce.py), and answers with each room's result. The same goes out as the
`casa_mia_jukebox_announced` event and shows on the Last announcement sensor
(sensor.py), so a speaker that didn't play is seen.

It adds no media players: each room stays the one entity Home Assistant's Sonos
integration makes. For Sonos S2 speakers, which can play a clip over their music; any
other player is refused with a result that says why.

An integration of its own, wholly in Home Assistant: it imports nothing from Casa Mia
and works with no app.
"""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import (
    Event,
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from . import feed, may, page, pure
from .announce import Jukebox
from .const import (
    ANNOUNCE,
    CHIME,
    CONF_CHIME,
    CONF_PLAYERS,
    CONF_SIDEBAR,
    CONF_TTS,
    DOMAIN,
    INSTALLED_EVENT,
    PLAY,
    URL,
)
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
# The `play` action: a favourite by name, in rooms, and where in the queue (none: now).
PLAY_SCHEMA = vol.Schema(
    {
        vol.Required("rooms"): vol.All(cv.entity_ids, vol.Length(min=1)),
        vol.Required("favourite"): vol.All(cv.string, vol.Length(min=1)),
        vol.Optional("enqueue"): vol.In(feed.LINED_UP),
    }
)

PLATFORMS = [Platform.BINARY_SENSOR, Platform.NUMBER, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# Read once, at import: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()

SCHEMA = vol.Schema(
    {
        vol.Optional("message", default=""): cv.string,
        vol.Optional("media", default=""): cv.string,
        vol.Optional("players"): cv.entity_ids,
        vol.Optional("chime", default=True): cv.boolean,
        vol.Optional("volume"): vol.All(vol.Coerce(int), vol.Range(1, 100)),
        vol.Optional("priority", default=False): cv.boolean,
    }
)


def last_id(entry: ConfigEntry) -> str:
    return f"{entry.entry_id}_last"


def volume_id(entry: ConfigEntry, player: str) -> str:
    return f"{entry.entry_id}_{player}"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async def announce(call: ServiceCall) -> ServiceResponse:
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="not_set_up"
            )
        jukebox: Jukebox = entries[0].runtime_data
        options = entries[0].options

        message, media = call.data["message"].strip(), call.data["media"].strip()
        if not message and not media:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="nothing_to_play"
            )
        engine = options.get(CONF_TTS, "")
        if message and not engine:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="no_voice"
            )
        players = call.data.get("players") or options.get(CONF_PLAYERS, [])
        if not players:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="no_players"
            )

        chime = options.get(CONF_CHIME, CHIME) if call.data["chime"] else ""
        return await jukebox.announce(
            players,
            pure.clips(chime, media, message, engine),
            said=message or media,
            volume=call.data.get("volume"),
            priority=call.data["priority"],
        )

    hass.services.async_register(
        DOMAIN,
        ANNOUNCE,
        announce,
        schema=SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )

    async def play(call: ServiceCall) -> None:
        # Who asked, for the log: the person who pressed a button, or nobody's hand.
        asker = call.context.user_id
        user = await hass.auth.async_get_user(asker) if asker else None
        await feed.play(
            hass.data[page.FEED],
            may.who(hass, user),
            call.data["rooms"],
            call.data["favourite"],
            call.data.get("enqueue"),
        )

    hass.services.async_register(DOMAIN, PLAY, play, schema=PLAY_SCHEMA)
    # The chime that comes with Jukebox, where a speaker can fetch it, and the page's
    # bundle. Not cached by the path: the bundle's address changes with each version.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL, str(Path(__file__).parent / "www"), False)]
    )
    page.setup(hass, LOADED_VERSION)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Newer files than this code, written by the Casa Mia app: ask for the restart. Now,
    # and when the app says it has written some.
    await async_check_restart(hass, LOADED_VERSION)

    async def installed(_event: Event) -> None:
        await async_check_restart(hass, LOADED_VERSION)

    entry.async_on_unload(hass.bus.async_listen(INSTALLED_EVENT, installed))

    # A room taken out of the options takes its volume with it.
    registry = er.async_get(hass)
    wanted = {volume_id(entry, p) for p in entry.options.get(CONF_PLAYERS, [])}
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if entity.unique_id not in wanted | {last_id(entry)}:
            registry.async_remove(entity.entity_id)

    entry.runtime_data = Jukebox(hass, entry)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await page.show(hass, entry.options.get(CONF_SIDEBAR, True))
    entry.async_on_unload(entry.add_update_listener(_reload))
    _LOGGER.info("Jukebox %s started", LOADED_VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    page.hide(hass)


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
