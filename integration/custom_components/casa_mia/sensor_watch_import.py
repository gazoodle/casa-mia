"""Sensor Watch's records, brought over from the app once. Until 2026.11.3 the app kept
them (its sensor-watch.json) and this integration watched a copy; now Sensor Watch keeps
them in Home Assistant's own storage. The first start that finds none there takes the
app's file as it is. The app never deletes its file, so the old records stay as they were
if the new ones are ever in doubt."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

KEY = "casa_mia_sensor_watch"  # Sensor Watch's storage key (its admin.DATA)
EXPORT = "/sensor-watch/export"  # the app's file, as it is ({} when it has none)
ISSUE = "sensor_watch_import"  # the Repair shown while they can't be brought over


async def bring(hass: HomeAssistant, url: str) -> bool:
    """Take the app's records into Home Assistant's storage, unless it has some already.
    False when the app can't give them: Sensor Watch must not then start, watching
    nothing while the records sit in the app. Said in a Repair and the log, and tried
    again when Casa Mia next sets up; the rest of Casa Mia carries on."""
    store: Store[dict[str, Any]] = Store(hass, 1, KEY)
    if await store.async_load() is not None:
        return True

    try:
        async with async_get_clientsession(hass).get(
            f"{url}{EXPORT}", timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            response.raise_for_status()
            data = await response.json()
        if not isinstance(data, dict):
            raise ValueError("not a JSON object")
    except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
        _LOGGER.error(
            "Sensor Watch is not started: its records could not be brought over from "
            "the app (%s). Reload Casa Mia to try again",
            exc,
        )
        ir.async_create_issue(
            hass,
            DOMAIN,
            ISSUE,
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key=ISSUE,
            translation_placeholders={"reason": str(exc)},
        )
        return False

    await store.async_save(data)
    ir.async_delete_issue(hass, DOMAIN, ISSUE)
    if not data:
        _LOGGER.info("Sensor Watch: the app had no records to bring over")
        return True
    _LOGGER.info(
        "Sensor Watch: brought over from the app, into Home Assistant's storage: "
        "%d records, %d profiles, %d groups (the app keeps its file)",
        len(data.get("records") or []),
        len(data.get("profiles") or {}),
        len(data.get("groups") or {}),
    )
    return True
