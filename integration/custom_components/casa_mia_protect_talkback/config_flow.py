"""Add a Protect console (its address and an API key of its own), then choose which of its
cameras get talkback. Only the doorbells are ticked by default: some cameras with a
speaker are indoors, and talking through those must be a deliberate choice.

Only beside Casa Mia, which offers the first console under Discovered while the app's
protect_talkback module is on."""

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.const import CONF_API_KEY, CONF_HOST
from homeassistant.core import callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..casa_mia.const import DOMAIN as CASA_MIA
from .const import CONF_CAMERAS, DOMAIN
from .protect import CannotConnect, InvalidAuth, SpeakerCamera, speaker_cameras


def _cameras_schema(cameras: list[SpeakerCamera], chosen: list[str]) -> vol.Schema:
    names = {c.id: c.name for c in cameras}
    return vol.Schema(
        {
            vol.Optional(
                CONF_CAMERAS, default=[c for c in chosen if c in names]
            ): cv.multi_select(names)
        }
    )


class ProtectTalkbackConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._cameras: list[SpeakerCamera] = []

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if not self.hass.config_entries.async_entries(CASA_MIA):
            return self.async_abort(reason="no_casa_mia")
        errors: dict[str, str] = {}
        if user_input is not None:
            await self.async_set_unique_id(user_input[CONF_HOST])
            self._abort_if_unique_id_configured()
            try:
                self._cameras = await speaker_cameras(
                    async_get_clientsession(self.hass),
                    user_input[CONF_HOST],
                    user_input[CONF_API_KEY],
                )
            except InvalidAuth:
                errors["base"] = "invalid_auth"
            except CannotConnect:
                errors["base"] = "cannot_connect"
            else:
                self._data = user_input
                return await self.async_step_cameras()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {vol.Required(CONF_HOST): str, vol.Required(CONF_API_KEY): str}
            ),
            errors=errors,
        )

    async def async_step_integration_discovery(
        self, discovery_info: dict[str, Any]
    ) -> ConfigFlowResult:
        return await self.async_step_user()

    async def async_step_cameras(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(
                title=f"UniFi Protect at {self._data[CONF_HOST]}",
                data=self._data,
                options=user_input,
            )
        doorbells = [c.id for c in self._cameras if c.doorbell]
        return self.async_show_form(
            step_id="cameras", data_schema=_cameras_schema(self._cameras, doorbells)
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return ProtectTalkbackOptionsFlow()


class ProtectTalkbackOptionsFlow(OptionsFlow):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        entry = self.config_entry
        try:
            cameras = await speaker_cameras(
                async_get_clientsession(self.hass),
                entry.data[CONF_HOST],
                entry.data[CONF_API_KEY],
            )
        except (InvalidAuth, CannotConnect):
            return self.async_abort(reason="cannot_connect")
        return self.async_show_form(
            step_id="init",
            data_schema=_cameras_schema(cameras, entry.options.get(CONF_CAMERAS, [])),
        )
