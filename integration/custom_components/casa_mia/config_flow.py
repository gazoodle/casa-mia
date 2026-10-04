"""Config flow: ask for the app's URL (pre-filled when the app is found, and left empty
means that one) and check it answers. Options: the alarm code, and which dashboard helper scripts are loaded."""

from __future__ import annotations

from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .const import CONF_ALARM_CODE, DOMAIN, SCRIPTS
from .coordinator import async_fetch_health

APP_PORT = 8780  # the app's local API (app/src/casa_mia/server.py)


def app_url(hass: HomeAssistant) -> str | None:
    """The installed Casa Mia app's address on the Supervisor network, if there is one.
    The app's slug carries its repository's hash (a6aa04a6_casa_mia); its hostname is
    the slug with dashes."""
    try:  # is_hassio moved to helpers; importing it from hassio failed silently
        from homeassistant.components.hassio import get_addons_info
        from homeassistant.helpers.hassio import is_hassio
    except ImportError:
        return None
    if not is_hassio(hass):
        return None
    try:
        apps = get_addons_info(hass) or {}
    except Exception:  # noqa: BLE001 (2026.9 raises HassioNotReadyError until loaded)
        return None  # not known yet: the address is typed instead
    for slug in apps:
        if slug == "casa_mia" or slug.endswith("_casa_mia"):
            return f"http://{slug.replace('_', '-')}:{APP_PORT}"
    return None


class CasaMiaConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CasaMiaOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        found = app_url(self.hass)
        if user_input is not None:
            # empty: the app found on the Supervisor network
            url = (user_input.get(CONF_URL) or "").strip().rstrip("/") or found
            if not url:
                errors["base"] = "not_found"
            else:
                try:
                    await async_fetch_health(self.hass, url)
                except (aiohttp.ClientError, TimeoutError, ValueError):
                    errors["base"] = "cannot_connect"
                else:
                    await self.async_set_unique_id(DOMAIN)
                    self._abort_if_unique_id_configured()
                    return self.async_create_entry(
                        title="Casa Mia", data={CONF_URL: url}
                    )
        typed = (user_input or {}).get(CONF_URL) or found
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {vol.Optional(CONF_URL, description={"suggested_value": typed}): str}
            ),
            description_placeholders={"found": found or "not found"},
            errors=errors,
        )


class CasaMiaOptionsFlow(OptionsFlow):
    """The alarm code, typed hidden (read at each arm/disarm), and the dashboard helper
    scripts to load. Saving reloads the integration, which applies the scripts."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(
                data={**self.config_entry.options, **user_input}
            )
        schema = vol.Schema(
            {
                vol.Optional(CONF_ALARM_CODE): TextSelector(
                    TextSelectorConfig(type=TextSelectorType.PASSWORD)
                ),
                **{
                    vol.Required(
                        key, default=self.config_entry.options.get(key, default)
                    ): BooleanSelector()
                    for key, (_, default) in SCRIPTS.items()
                },
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                schema, self.config_entry.options
            ),
        )
