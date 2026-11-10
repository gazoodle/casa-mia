"""What is left of Sensor Watch in Casa Mia. To 2026.11.3-b1 it was part of this
integration; it is now one of its own (casa_mia_sensor_watch), which this one neither
imports nor needs.

A user who had it switched on is handed over (hand_over): Sensor Watch's entry is made
for them, with the records the app kept until 2026.11.3, and Sensor Watch then takes its
device and entities from here itself (its migrate.py). And the two services keep their
old names for now (old_services), passed on to Sensor Watch's own."""

from __future__ import annotations

import logging

import aiohttp
from homeassistant.config_entries import SOURCE_IMPORT, ConfigEntry
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.data_entry_flow import FlowResultType, UnknownHandler
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

THEIRS = "casa_mia_sensor_watch"  # Sensor Watch's own domain
EXPORT = "/sensor-watch/export"  # the app's old file, as it is ({} when it has none)
ISSUE = "sensor_watch_import"  # the Repair shown while it can't be handed over
# Each service's old name here -> its name in Sensor Watch's domain.
OLD_SERVICES = {"sensor_watch_list": "list", "sensor_watch_refresh": "refresh"}


def _device(hass: HomeAssistant, entry: ConfigEntry) -> dr.DeviceEntry | None:
    """Sensor Watch's device while it is still Casa Mia's: there only if its module was
    switched on, and until Sensor Watch has taken it. Home Assistant's newer call,
    where it has it (the older one stops working in 2027.8)."""
    devices = dr.async_get(hass)
    identifier = (DOMAIN, f"{entry.entry_id}_sensor_watch")
    if hasattr(devices, "async_get_device_by_identifier"):
        return devices.async_get_device_by_identifier(identifier, entry.entry_id)
    return devices.async_get_device(identifiers={identifier})


async def hand_over(hass: HomeAssistant, entry: ConfigEntry, url: str) -> None:
    """Make Sensor Watch's entry for a user who had it here, giving it the app's
    records. Its setup runs inside this call and takes the device, so this is asked
    once. If it can't be done it is said in a Repair and the log, and tried again when
    Casa Mia next sets up; the rest of Casa Mia carries on."""
    if _device(hass, entry) is None:
        return

    try:
        async with async_get_clientsession(hass).get(
            f"{url}{EXPORT}", timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            response.raise_for_status()
            records = await response.json()
        if not isinstance(records, dict):
            raise ValueError("not a JSON object")
        result = await hass.config_entries.flow.async_init(
            THEIRS, context={"source": SOURCE_IMPORT}, data={"records": records}
        )
        if result["type"] is not FlowResultType.CREATE_ENTRY:
            # An entry of its own that hasn't taken the device: disabled, or failing.
            raise ValueError(
                "the Sensor Watch integration is set up but not running "
                f"({result.get('reason')})"
            )
    except UnknownHandler:
        _failed(hass, "the Sensor Watch integration is not installed")
    except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
        _failed(hass, str(exc))
    else:
        ir.async_delete_issue(hass, DOMAIN, ISSUE)
        _LOGGER.info("Sensor Watch handed over to its own integration (%s)", THEIRS)


def _failed(hass: HomeAssistant, reason: str) -> None:
    _LOGGER.error(
        "Sensor Watch is not running: it could not be handed over to its own "
        "integration (%s). Reload Casa Mia to try again",
        reason,
    )
    ir.async_create_issue(
        hass,
        DOMAIN,
        ISSUE,
        is_fixable=False,
        severity=ir.IssueSeverity.ERROR,
        translation_key=ISSUE,
        translation_placeholders={"reason": reason},
    )


def old_services(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """casa_mia.sensor_watch_list and casa_mia.sensor_watch_refresh, for the automations
    and templates that call them: passed on, and the log says once which to change."""
    warned: set[str] = set()

    async def pass_on(call: ServiceCall) -> ServiceResponse:
        new = OLD_SERVICES[call.service]
        if call.service not in warned:
            warned.add(call.service)
            _LOGGER.warning(
                "The service %s.%s is now %s.%s: change it where it is called. The "
                "old name is passed on for now, and will be removed",
                DOMAIN,
                call.service,
                THEIRS,
                new,
            )
        return await hass.services.async_call(
            THEIRS,
            new,
            dict(call.data),
            blocking=True,
            context=call.context,
            return_response=call.return_response,
        )

    for old, new in OLD_SERVICES.items():
        hass.services.async_register(
            DOMAIN,
            old,
            pass_on,
            supports_response=SupportsResponse.ONLY
            if new == "list"
            else SupportsResponse.NONE,
        )
        entry.async_on_unload(lambda o=old: hass.services.async_remove(DOMAIN, o))
