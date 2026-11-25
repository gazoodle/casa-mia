"""Jukebox's config flow: one entry, with nothing to fill in (the manifest's
`single_config_entry` refuses a second). Its options are the rooms, the voice, the chime
and quiet hours, changed in the Configure dialog.

Reconfigure signs Jukebox in to Spotify, for listening on a phone (phone.py). It is a
sign-in of Jukebox's own, with Home Assistant's OAuth helper: Spotify's player in a
page needs leave to play, which Home Assistant's Spotify integration doesn't ask for.
The sign-in is kept in the entry's data, where the helper renews it."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    SOURCE_REAUTH,
    ConfigEntry,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_entry_oauth2_flow, selector

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
from .phone import SCOPES

_LOGGER = logging.getLogger(__name__)

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


class JukeboxFlow(config_entry_oauth2_flow.AbstractOAuth2FlowHandler, domain=DOMAIN):
    DOMAIN = DOMAIN
    VERSION = 1

    @property
    def logger(self) -> logging.Logger:
        return _LOGGER

    @property
    def extra_authorize_data(self) -> dict[str, Any]:
        # Asked every time, so the account can be seen and changed.
        return {"scope": SCOPES, "show_dialog": "true"}

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

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Sign in to Spotify: Home Assistant's own steps, from choosing the
        application credentials on."""
        return await self.async_step_pick_implementation()

    async def async_step_reauth(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Spotify refused to renew the sign-in, and Home Assistant asks for it
        again."""
        return await self.async_step_pick_implementation()

    async def async_oauth_create_entry(self, data: dict[str, Any]) -> ConfigFlowResult:
        """Signed in: kept in the entry there is, never a second one."""
        again = self.source == SOURCE_REAUTH
        entry = self._get_reauth_entry() if again else self._get_reconfigure_entry()
        _LOGGER.info("Jukebox is signed in to Spotify")
        # No reload: the sign-in is read where it is used (phone.py), and Home Assistant
        # refuses a reload from here, from 2026.12, while the entry has a listener of
        # its own for changes (__init__.py).
        return self.async_update_and_abort(entry, data_updates=data)


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
