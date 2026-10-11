"""Casa Mia Sensor Watch: the sensors given bands on the app's Sensor Watch page,
watched here (watch.py) and told to Home Assistant: a status, a count per level, a
problem sensor, an event on each change and a `list` service, on Casa Mia's coordinator."""

from __future__ import annotations

import logging
from datetime import timedelta

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    EVENT_SERVICE_REGISTERED,
    EVENT_SERVICE_REMOVED,
    Platform,
)
from homeassistant.core import (
    Event,
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import async_track_time_interval

from ..casa_mia.children import add_module_device, follow_module, parent_coordinator
from . import blueprint, swap
from .const import DOMAIN, MODULE
from .entity import watch_device
from .levels import LEVELS, listing, summary
from .restart_notice import async_check_restart, manifest_version
from .swap import shown
from .system import start_checks
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]
SWAP_EVERY = timedelta(seconds=5)  # the screenshot swap's file, looked at (as the app)
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()
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
    watcher = Watcher(hass, coordinator)
    entry.runtime_data = watcher
    watcher.refresh()
    entry.async_on_unload(coordinator.async_add_listener(watcher.refresh))
    entry.async_on_unload(watcher.unload)
    entry.async_on_unload(start_checks(hass, watcher))  # Home Assistant's own health
    await follow_blueprint(hass, entry, watcher)

    async def look_at_swap(_now: object = None) -> None:
        watcher.swapped(await hass.async_add_executor_job(swap.current))

    await look_at_swap()
    entry.async_on_unload(async_track_time_interval(hass, look_at_swap, SWAP_EVERY))

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
        rows = [shown(watcher.swap, r) for r in listing(now, call.data.get("levels"))]
        _LOGGER.debug(
            "list (%s%s): %d sensors",
            ",".join(call.data.get("levels") or []) or "not nominal",
            f", group {group}" if group else "",
            len(rows),
        )
        worst = summary(now)["worst"] if group else watcher.summary()["worst"]
        # Every group's name, for the card's editor to offer.
        groups = sorted(
            {r["group"] for r in watcher.records.values() if r.get("group")}
        )
        return {"worst": worst, "sensors": rows, "groups": groups}

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


async def follow_blueprint(
    hass: HomeAssistant, entry: ConfigEntry, watcher: Watcher
) -> None:
    """Install the blueprint, and write it again when its choices change: a group made
    or renamed on the app's page, a notify action added (a phone's mobile app)."""
    template = await hass.async_add_executor_job(blueprint.SOURCE.read_text, "utf-8")
    target = hass.config.path(*blueprint.AT)
    shown: list[tuple[list[str], list[str]] | None] = [None]

    @callback
    def choices(*_: object) -> None:
        groups = sorted(
            {r["group"] for r in watcher.records.values() if r.get("group")}
        )
        notifies = sorted(
            f"notify.{name}"
            for name in hass.services.async_services_for_domain("notify")
            if name != "send_message"  # takes a notify entity, not a message alone
        )
        if (groups, notifies) == shown[0]:
            return
        shown[0] = (groups, notifies)
        hass.async_add_executor_job(
            blueprint.install, target, blueprint.filled(template, groups, notifies)
        )

    @callback
    def service(event: Event) -> None:
        if event.data.get("domain") == "notify":
            choices()

    # ponytail: asked at every write of the entities (a set over the records, compared);
    # a records-changed hook if that ever shows in a storm.
    entry.async_on_unload(watcher.listen(choices))
    entry.async_on_unload(hass.bus.async_listen(EVENT_SERVICE_REGISTERED, service))
    entry.async_on_unload(hass.bus.async_listen(EVENT_SERVICE_REMOVED, service))
    choices()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not isinstance(getattr(entry, "runtime_data", None), Watcher):
        return True  # switched off: no platforms were set up
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
