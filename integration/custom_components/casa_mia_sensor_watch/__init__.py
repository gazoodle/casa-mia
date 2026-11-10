"""Sensor Watch: an integration of its own, wholly in Home Assistant. The entities given
levels on its page (panel.py, in the sidebar), their records kept in Home Assistant's
storage (records/, admin.py), watched here (watch.py) and told to Home Assistant: a
status, a count per level and a problem sensor on its device, an event on each change,
the `casa_mia_sensor_watch.list` service, device triggers and its dashboard card
(www/cards.js).

It needs nothing of Casa Mia's and imports nothing from it. To 2026.11.3-b1 it was part
of the Casa Mia integration: migrate.py takes its device and entities over from there,
keeping their ids and history."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import timedelta

import voluptuous as vol
from homeassistant.components import frontend
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
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from homeassistant.helpers.event import async_track_time_interval

from . import admin, blueprint, panel
from .const import DOMAIN, INSTALLED_EVENT, LIST, REFRESH, SWAP, SWAP_ASK
from .levels import LEVELS, listing, summary
from .migrate import take_over
from .restart_notice import async_check_restart, manifest_version
from .swap import same, shown
from .system import start_checks
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.BINARY_SENSOR, Platform.BUTTON, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# The version this code was loaded with, read once, at import: a reload of the entry runs
# setup again with this same code, so reading the manifest then would take a newer
# version installed since as loaded, and drop its restart Repair.
LOADED_VERSION = manifest_version()
CARDS = "cards.js"  # the dashboard card, its editor and the eye, in www/
# Date watches judged again as time passes (a reminder comes due without its state
# changing). ponytail: every ten minutes; at the hour a band ends, if that's ever wanted.
DAYS_EVERY = timedelta(minutes=10)
LIST_SCHEMA = vol.Schema(
    {vol.Optional("levels"): [vol.In(LEVELS)], vol.Optional("group"): str}
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Watch the saved records, serve the page and the card, check Home Assistant's own
    health, keep the blueprint, follow the swap, and offer the services; all undone when
    the entry unloads, but the page, which stays in the sidebar and says Sensor Watch
    isn't running."""
    # Newer files than this code, written by the Casa Mia app: ask for the restart. Now,
    # and when the app says it has written some.
    await async_check_restart(hass, LOADED_VERSION)

    async def installed(_event: Event) -> None:
        await async_check_restart(hass, LOADED_VERSION)

    entry.async_on_unload(hass.bus.async_listen(INSTALLED_EVENT, installed))

    # Before the platforms: its entities can change hands only while not loaded.
    take_over(hass, entry)
    watcher = Watcher(hass)
    entry.runtime_data = watcher
    entry.async_on_unload(watcher.unload)
    entry.async_on_unload(await admin.start(hass, watcher))
    await panel.show(hass, LOADED_VERSION)
    entry.async_on_unload(start_checks(hass, watcher))
    await follow_blueprint(hass, entry, watcher)
    entry.async_on_unload(async_track_time_interval(hass, watcher.tick, DAYS_EVERY))

    # The screenshot swap, if Casa Mia is here to give its rule (const.SWAP); it is
    # asked, in case it started first. Without it nothing answers and nothing is swapped.
    @callback
    def swapped(rule: Callable[[str], str] | None) -> None:
        watcher.swapped(rule or same)

    entry.async_on_unload(async_dispatcher_connect(hass, SWAP, swapped))
    async_dispatcher_send(hass, SWAP_ASK)

    async def list_sensors(call: ServiceCall) -> ServiceResponse:
        # A group (named on the page): only its members, and its own worst.
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
        LIST,
        list_sensors,
        schema=LIST_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, LIST))

    async def refresh(_call: ServiceCall) -> None:
        watcher.afresh()

    hass.services.async_register(DOMAIN, REFRESH, refresh)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, REFRESH))

    # The card, into every Home Assistant page (www/ is served by the panel). ?v=
    # changes with each update, so browsers fetch the new copy.
    cards = f"{panel.URL}/{CARDS}?v={LOADED_VERSION}"
    frontend.add_extra_js_url(hass, cards)
    entry.async_on_unload(lambda: frontend.remove_extra_js_url(hass, cards))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _LOGGER.info("Sensor Watch %s started", LOADED_VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Deleted: its page leaves the sidebar. The records stay in Home Assistant's
    storage, for the day it is added again."""
    panel.hide(hass)
    _LOGGER.info("Sensor Watch removed; its records are kept")


async def follow_blueprint(
    hass: HomeAssistant, entry: ConfigEntry, watcher: Watcher
) -> None:
    """Install the blueprint, and write it again when its choices change: a group made
    or renamed on the page, a notify action added (a phone's mobile app)."""
    template = await hass.async_add_executor_job(blueprint.SOURCE.read_text, "utf-8")
    target = hass.config.path(*blueprint.AT)
    shown_now: list[tuple[list[str], list[str]] | None] = [None]

    def newest() -> str:
        groups, notifies = shown_now[0] or ([], [])
        return blueprint.filled(template, groups, notifies)

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
        hass.async_add_executor_job(blueprint.install, target, newest)

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
