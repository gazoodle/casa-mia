"""Casa Mia Sensor Watch: the sensors given bands on the app's Sensor Watch page,
watched here (watch.py) and told to Home Assistant: a status, a count per level, a
problem sensor, an event on each change and a `list` service, on Casa Mia's coordinator."""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.helpers import device_registry as dr

from ..casa_mia.children import add_module_device, follow_module, parent_coordinator
from .const import DOMAIN, MODULE
from .entity import watch_device
from .levels import LEVELS, listing, summary
from .restart_notice import async_check_restart, manifest_version
from .system import start_checks
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()
# The "Notify on Sensor Watch" blueprint, put where Home Assistant looks for them.
BLUEPRINT = Path(__file__).with_name("blueprints") / "notify.yaml"
BLUEPRINT_AT = ("blueprints", "automation", "casa_mia", "sensor_watch_notify.yaml")
LIST_SCHEMA = vol.Schema(
    {vol.Optional("levels"): [vol.In(LEVELS)], vol.Optional("group"): str}
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    # Switched off in the app: no device (removing it removes its entities), nothing watched.
    registry = dr.async_get(hass)
    device = watch_device(entry, coordinator)
    if off:
        if found := registry.async_get_device(identifiers=device["identifiers"]):
            _LOGGER.info("Sensor Watch is switched off in the app: removing its device")
            registry.async_remove_device(found.id)
        return True
    add_module_device(hass, entry, device)
    await hass.async_add_executor_job(
        install_blueprint, hass.config.path(*BLUEPRINT_AT)
    )
    watcher = Watcher(hass, coordinator)
    entry.runtime_data = watcher
    watcher.refresh()
    entry.async_on_unload(coordinator.async_add_listener(watcher.refresh))
    entry.async_on_unload(watcher.unload)
    entry.async_on_unload(start_checks(hass, watcher))  # Home Assistant's own health

    async def list_sensors(call: ServiceCall) -> ServiceResponse:
        # A group (named on the app's page): only its members, and its own worst.
        group = call.data.get("group")
        now = watcher.now
        if group:
            now = {
                e: n
                for e, n in now.items()
                if (watcher.records.get(e) or {}).get("group") == group
            }
        rows = listing(now, call.data.get("levels"))
        _LOGGER.debug(
            "list (%s%s): %d sensors",
            ",".join(call.data.get("levels") or []) or "not nominal",
            f", group {group}" if group else "",
            len(rows),
        )
        worst = summary(now)["worst"] if group else watcher.summary()["worst"]
        return {"worst": worst, "sensors": rows}

    hass.services.async_register(
        DOMAIN,
        "list",
        list_sensors,
        schema=LIST_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, "list"))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


def install_blueprint(target: str) -> None:
    """Put the blueprint in place, or bring it up to date (it says to copy it before
    changing it). Best effort: a failure only means no blueprint."""
    text = BLUEPRINT.read_text("utf-8")
    path = Path(target)
    try:
        if path.exists() and path.read_text("utf-8") == text:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, "utf-8")
    except OSError as exc:
        _LOGGER.warning("could not install the blueprint at %s: %s", path, exc)
        return
    _LOGGER.info("blueprint Notify on Sensor Watch installed at %s", path)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not isinstance(getattr(entry, "runtime_data", None), Watcher):
        return True  # switched off: no platforms were set up
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
