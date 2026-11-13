"""Dash-Bored's config flow: one entry, with nothing to fill in. The manifest's
`single_config_entry` refuses a second."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, TITLE


class DashBoredFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title=TITLE, data={})
