"""Sensor Watch, in Casa Mia's integration: the entities given levels on the app's
Sensor Watch page, watched here (watch.py) and told to Home Assistant: a status, a count
per level and a problem sensor on its module device, an event on each change, and the
`casa_mia.sensor_watch_list` service. Started by Casa Mia's setup while the module is on.

Until 2026.10.10-b3 it was its own integration (casa_mia_sensor_watch); migrate() moves
that one's entities onto Casa Mia, keeping their entity ids and history, and removes it."""

from __future__ import annotations

import logging
from datetime import timedelta

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import EVENT_SERVICE_REGISTERED, EVENT_SERVICE_REMOVED
from homeassistant.core import (
    Event,
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_track_time_interval

from ..const import DOMAIN
from ..coordinator import CasaMiaCoordinator
from . import blueprint, swap
from .const import OLD_DOMAIN, REFRESH, SERVICE
from .entity import KEYS, unique_id
from .levels import LEVELS, listing, summary
from .swap import shown
from .system import start_checks
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)
SWAP_EVERY = timedelta(seconds=5)  # the screenshot swap's file, looked at (as the app)
# Date watches judged again as time passes (a reminder comes due without its state
# changing). ponytail: every ten minutes; at the hour a band ends, if that's ever wanted.
DAYS_EVERY = timedelta(minutes=10)
LIST_SCHEMA = vol.Schema(
    {vol.Optional("levels"): [vol.In(LEVELS)], vol.Optional("group"): str}
)


async def start(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: CasaMiaCoordinator
) -> Watcher:
    """Watch, check Home Assistant's own health, keep the blueprint, follow the swap,
    and offer the list service; all undone when Casa Mia's entry unloads."""
    watcher = Watcher(hass, coordinator)
    watcher.refresh()
    entry.async_on_unload(coordinator.async_add_listener(watcher.refresh))
    entry.async_on_unload(watcher.unload)
    entry.async_on_unload(start_checks(hass, watcher))
    await follow_blueprint(hass, entry, watcher)

    async def look_at_swap(_now: object = None) -> None:
        watcher.swapped(await hass.async_add_executor_job(swap.current))

    await look_at_swap()
    entry.async_on_unload(async_track_time_interval(hass, look_at_swap, SWAP_EVERY))
    entry.async_on_unload(async_track_time_interval(hass, watcher.tick, DAYS_EVERY))

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
        SERVICE,
        list_sensors,
        schema=LIST_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE))

    async def refresh(_call: ServiceCall) -> None:
        await watcher.afresh()

    hass.services.async_register(DOMAIN, REFRESH, refresh)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, REFRESH))
    return watcher


async def migrate(hass: HomeAssistant, entry: ConfigEntry, device_id: str) -> None:
    """Sensor Watch's own integration, from before it joined Casa Mia: its entities move
    onto Casa Mia's Sensor Watch device (same entity ids, so history and automations
    carry on), then its entry goes. Once; nothing to do after."""
    for old in hass.config_entries.async_entries(OLD_DOMAIN):
        if old.state is ConfigEntryState.LOADED:
            await hass.config_entries.async_unload(old.entry_id)
        registry = er.async_get(hass)
        moved = []
        for key in KEYS:
            for domain in ("sensor", "binary_sensor"):
                eid = registry.async_get_entity_id(
                    domain, OLD_DOMAIN, f"{old.entry_id}_{key}"
                )
                if eid is None:
                    continue
                # Home Assistant shows an unloaded entity as unavailable (restored);
                # that state must go before the entity can change hands.
                hass.states.async_remove(eid)
                registry.async_update_entity_platform(
                    eid,
                    DOMAIN,
                    new_config_entry_id=entry.entry_id,
                    new_unique_id=unique_id(entry, key),
                    new_device_id=device_id,
                )
                moved.append(eid)
        await hass.config_entries.async_remove(old.entry_id)
        # Its "restart to finish updating" Repair, if it had one, has nothing left to do.
        ir.async_delete_issue(hass, OLD_DOMAIN, "restart_required")
        _LOGGER.info(
            "Sensor Watch joined Casa Mia: %d entities moved over (%s); its own "
            "integration's entry removed",
            len(moved),
            ", ".join(moved) or "none",
        )


async def follow_blueprint(
    hass: HomeAssistant, entry: ConfigEntry, watcher: Watcher
) -> None:
    """Install the blueprint, and write it again when its choices change: a group made
    or renamed on the app's page, a notify action added (a phone's mobile app)."""
    template = await hass.async_add_executor_job(blueprint.SOURCE.read_text, "utf-8")
    target = hass.config.path(*blueprint.AT)
    shown_now: list[tuple[list[str], list[str]] | None] = [None]

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
        if (groups, notifies) == shown_now[0]:
            return
        shown_now[0] = (groups, notifies)
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
