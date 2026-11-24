"""Jukebox's config flow: one entry, with nothing to fill in (the manifest's
`single_config_entry` refuses a second). Its options are the rooms, the voice, the chime
and quiet hours, changed in the Configure dialog."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector

from .const import (
    CHIME,
    CONF_CHIME,
    CONF_HOSTS,
    CONF_PLAYERS,
    CONF_QUIET,
    CONF_SCREENS,
    CONF_SIDEBAR,
    CONF_TTS,
    DOMAIN,
    TITLE,
)

OPTIONS = vol.Schema(
    {
        vol.Optional(CONF_PLAYERS): selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain="media_player", integration="sonos", multiple=True
            )
        ),
        vol.Optional(CONF_TTS): selector.EntitySelector(
            selector.EntitySelectorConfig(domain="tts")
        ),
        vol.Optional(CONF_CHIME): selector.TextSelector(),
        vol.Optional(CONF_QUIET): selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain=["schedule", "input_boolean", "binary_sensor"]
            )
        ),
        vol.Optional(CONF_SIDEBAR, default=True): selector.BooleanSelector(),
    }
)


async def _logins(hass: HomeAssistant) -> dict[Any, Any]:
    """The two lists for a party (may.py), of Home Assistant's own logins by name."""
    users = [
        selector.SelectOptionDict(value=user.id, label=user.name or user.id)
        for user in await hass.auth.async_get_users()
        if not user.system_generated and user.is_active
    ]
    several = selector.SelectSelector(
        selector.SelectSelectorConfig(options=users, multiple=True)
    )
    return {vol.Optional(CONF_HOSTS): several, vol.Optional(CONF_SCREENS): several}


class JukeboxFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return JukeboxOptions()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title=TITLE, data={})


class JukeboxOptions(OptionsFlow):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(
                step_id="init",
                data_schema=self.add_suggested_values_to_schema(
                    OPTIONS.extend(await _logins(self.hass)),
                    {CONF_CHIME: CHIME, **self.config_entry.options},
                ),
            )
        # A box emptied in the dialog comes back missing. For the chime that must be
        # kept as "none", or Jukebox's own chime would come back.
        return self.async_create_entry(data={CONF_CHIME: "", **user_input})
