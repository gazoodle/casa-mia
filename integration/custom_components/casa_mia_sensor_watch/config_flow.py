"""Config flow: one entry, no fields. The import step is Casa Mia's, for a user who had
Sensor Watch when it was part of Casa Mia (to 2026.11.3-b1): it makes the entry without
asking, and hands over the records the Casa Mia app kept before 2026.11.3."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
TITLE = "Sensor Watch"


class SensorWatchConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={})
        return self.async_show_form(step_id="user")

    async def async_step_import(self, import_data: dict[str, Any]) -> ConfigFlowResult:
        """`records`: the app's old file as it was ({}: it kept none). Saved only when
        there are none here yet, so records already in Home Assistant are never
        replaced."""
        records = import_data.get("records")
        store: Store[dict[str, Any]] = Store(hass=self.hass, version=1, key=DOMAIN)
        if records and await store.async_load() is None:
            await store.async_save(records)
            _LOGGER.info(
                "Records taken from the Casa Mia app into Home Assistant's storage: "
                "%d records, %d profiles, %d groups (the app keeps its file)",
                len(records.get("records") or []),
                len(records.get("profiles") or {}),
                len(records.get("groups") or {}),
            )
        return self.async_create_entry(title=TITLE, data={})
