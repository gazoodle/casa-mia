"""Casa Mia: thin integration for the Casa Mia app."""

from __future__ import annotations

import logging
from pathlib import Path

import aiohttp
import voluptuous as vol
from homeassistant.components import frontend, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr

from .commanders import async_prune_commander_devices
from .const import CARDS_JS, DOMAIN, FONA_EVENT, SCRIPTS, SCRIPTS_URL
from .coordinator import CasaMiaCoordinator, async_post
from .guest import async_prune_endpoint_devices
from .motion import commanders, tracker
from .pictures import setup as setup_pictures
from .restart_notice import manifest_version
from .sensor import MODULE_DEVICES, device_name, modules_off

_LOGGER = logging.getLogger(__name__)

# The integration's layer of the FONA PING trace (see the app's modules/fona.py).
PING, PONG = "PING", "PONG from Integration"
SEND_SMS_SCHEMA = vol.Schema(
    {
        vol.Required("number"): cv.string,
        vol.Required("message"): vol.All(cv.string, vol.Length(min=1, max=160)),
    }
)

PLATFORMS = [
    Platform.ALARM_CONTROL_PANEL,
    Platform.BINARY_SENSOR,
    Platform.BUTTON,
    Platform.EVENT,
    Platform.SELECT,
    Platform.SENSOR,
    Platform.SWITCH,
]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # The version this code was loaded with; the app may since have installed a newer one.
    loaded_version = await hass.async_add_executor_job(manifest_version)
    coordinator = CasaMiaCoordinator(hass, entry, loaded_version)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    # Register the parent devices first, so child devices can name them in via_device.
    registry = dr.async_get(hass)
    app = (DOMAIN, entry.entry_id)
    registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={app},
        name="Casa Mia app",
        manufacturer="Casa Mia",
    )
    # A module switched off in the app has no device (removing it removes its entities);
    # switching one on or off reloads, so its device comes or goes at once.
    off = modules_off(coordinator)
    house = coordinator.data.get("house")
    for module in MODULE_DEVICES:
        name = device_name(coordinator, module)
        identifiers = {(DOMAIN, f"{entry.entry_id}_{module}")}
        if module not in off:
            registry.async_get_or_create(
                config_entry_id=entry.entry_id,
                identifiers=identifiers,
                name=name,
                manufacturer="Casa Mia",
                via_device=app,
            )
        elif device := registry.async_get_device(identifiers=identifiers):
            _LOGGER.info("%s is switched off in the app: removing its device", name)
            registry.async_remove_device(device.id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if "camera_dashboard" not in off:
        # Track motion, a tracker per commander, while Camera Dashboard is on in the app.

        @callback
        def follow_commanders() -> None:
            ids = {c["id"] for c in commanders(coordinator)}
            for cid in set(coordinator.motion) - ids:  # deleted on the page
                coordinator.motion.pop(cid).unload()
            for cid in ids:
                tracker(coordinator, cid).refresh()

        @callback
        def stop_tracking() -> None:
            for one in coordinator.motion.values():
                one.unload()
            coordinator.motion.clear()

        follow_commanders()
        entry.async_on_unload(coordinator.async_add_listener(follow_commanders))
        entry.async_on_unload(stop_tracking)
    await _load_scripts(hass, entry, loaded_version)
    # Saving the options (a script switched on or off) reloads, which applies it.
    entry.async_on_unload(entry.add_update_listener(_options_saved))

    @callback
    def reload_on_switch() -> None:
        if modules_off(coordinator) != off:
            _LOGGER.info("a module was switched on or off in the app: reloading")
            hass.config_entries.async_schedule_reload(entry.entry_id)
        elif coordinator.data.get("house") != house:
            _LOGGER.info("the app's house name changed: reloading to rename devices")
            hass.config_entries.async_schedule_reload(entry.entry_id)

    entry.async_on_unload(coordinator.async_add_listener(reload_on_switch))
    # Drop devices of endpoints that were renamed or deleted, now and on each update.
    prune = lambda: async_prune_endpoint_devices(hass, entry, coordinator)  # noqa: E731
    prune()
    entry.async_on_unload(coordinator.async_add_listener(prune))
    # And of commanders deleted on the Camera Dashboard page.
    prune_commanders = lambda: async_prune_commander_devices(hass, entry, coordinator)  # noqa: E731
    prune_commanders()
    entry.async_on_unload(coordinator.async_add_listener(prune_commanders))
    entry.async_on_unload(hass.bus.async_listen(FONA_EVENT, _pong(hass, coordinator)))

    async def send_sms(call: ServiceCall) -> None:
        await _send(hass, coordinator, call.data["number"], call.data["message"])

    hass.services.async_register(DOMAIN, "send_sms", send_sms, schema=SEND_SMS_SCHEMA)
    return True


def scripts_on(entry: ConfigEntry) -> list[str]:
    """The dashboard helper scripts switched on in the options (else their defaults)."""
    return [k for k, (_, default) in SCRIPTS.items() if entry.options.get(k, default)]


async def _load_scripts(
    hass: HomeAssistant, entry: ConfigEntry, version: str | None
) -> None:
    """Serve www/ at /casa_mia, the cards' settings command and the pictures through HA
    (once per HA run), and
    load the cards (always) and the scripts switched on into every HA page; each comes off
    again when the entry unloads. ?v= changes with each update, so browsers fetch the new
    copy."""
    if not hass.data.get(f"{DOMAIN}_www"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(SCRIPTS_URL, str(Path(__file__).parent / "www"), False)]
        )
        hass.data[f"{DOMAIN}_www"] = True
        websocket_api.async_register_command(hass, _ws_settings)
        setup_pictures(hass)  # the commanders' pictures, for viewers away from home
    for name in [CARDS_JS, *(SCRIPTS[k][0] for k in scripts_on(entry))]:
        url = f"{SCRIPTS_URL}/{name}?v={version}"
        frontend.add_extra_js_url(hass, url)
        entry.async_on_unload(lambda u=url: frontend.remove_extra_js_url(hass, u))
    _LOGGER.info(
        "dashboard cards loaded (%s); helpers: %s",
        CARDS_JS,
        ", ".join(SCRIPTS[k][0] for k in scripts_on(entry)) or "none",
    )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/settings"})
@callback
def _ws_settings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The app's settings for the cards (its Settings page), as last polled; any user."""
    entries = [
        e
        for e in hass.config_entries.async_entries(DOMAIN)
        if isinstance(getattr(e, "runtime_data", None), CasaMiaCoordinator)
    ]
    data = (entries[0].runtime_data.data or {}) if entries else {}
    connection.send_result(msg["id"], data.get("settings", {}))


async def _options_saved(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def _send(
    hass: HomeAssistant, coordinator: CasaMiaCoordinator, number: str, message: str
) -> None:
    """Queue a text on the FONA; the app checks the number."""
    try:
        await async_post(
            hass,
            coordinator.url,
            "/fona/send",
            {"number": number, "message": message},
        )
    except aiohttp.ClientResponseError as exc:
        reason = "bad number or message" if exc.status == 400 else exc.message
        raise HomeAssistantError(f"Text not sent: {reason}") from exc
    except aiohttp.ClientError as exc:
        raise HomeAssistantError(
            f"Text not sent (is Phone and SMS switched on in the app?): {exc}"
        ) from exc


def _pong(hass: HomeAssistant, coordinator: CasaMiaCoordinator):
    """Answer an authorised PING, proving the app reached Home Assistant."""

    @callback
    def fired(event: Event) -> None:
        data = event.data
        if data.get("kind") == "text" and data.get("authorised"):
            if data.get("message") == PING:
                hass.async_create_task(_pong_send(hass, coordinator, data["number"]))

    return fired


async def _pong_send(
    hass: HomeAssistant, coordinator: CasaMiaCoordinator, number: str
) -> None:
    try:
        await _send(hass, coordinator, number, PONG)
    except HomeAssistantError as exc:
        _LOGGER.warning("PING from %s not answered: %s", number, exc)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.services.async_remove(DOMAIN, "send_sms")
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
