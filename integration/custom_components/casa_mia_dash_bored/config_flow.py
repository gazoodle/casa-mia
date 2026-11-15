"""Dash-Bored's config flow: one entry, with nothing to fill in. The manifest's
`single_config_entry` refuses a second. Its options are the house's settings
(settings.py), changed in the Configure dialog."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_FLOOR_ORDER, CONF_ROOM_ORDER, DOMAIN, TITLE

# Both are orders, so each is a list that keeps the order it was chosen in. Floors
# can't be dragged (Home Assistant's selector has no reorder): take one out and add it again.
OPTIONS = vol.Schema(
    {
        vol.Optional(CONF_FLOOR_ORDER): selector.FloorSelector(
            selector.FloorSelectorConfig(multiple=True)
        ),
        vol.Optional(CONF_ROOM_ORDER): selector.AreaSelector(
            selector.AreaSelectorConfig(multiple=True, reorder=True)
        ),
    }
)


class DashBoredFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return DashBoredOptions()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title=TITLE, data={})


class DashBoredOptions(OptionsFlow):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(
                step_id="init",
                data_schema=self.add_suggested_values_to_schema(
                    OPTIONS, self.config_entry.options
                ),
            )
        # A list emptied in the dialog comes back missing: saved as it is, it is no order.
        return self.async_create_entry(data=user_input)
