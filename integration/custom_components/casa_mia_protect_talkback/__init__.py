"""Casa Mia Protect Talkback: talk through UniFi Protect cameras from HA's own camera views.

A patch into HA's go2rtc (patches.py), kept until HA and go2rtc can do it themselves
(go2rtc PR #2340, HA's UniFi Protect declaring two-way audio); then this child goes.

Each config entry is one Protect console, with its own API key and a choice of cameras.
The patches are installed by the first entry and removed with the last. talk.py, run by
go2rtc, reads the console's address and key from a file only HA can read, so the key
never appears in go2rtc's stream list. A child of Casa Mia: it follows the app's
protect_talkback module, on Casa Mia's coordinator.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_API_KEY, CONF_HOST
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.start import async_at_started

from ..casa_mia.children import follow_module, parent_coordinator
from ..casa_mia.patching import PatchError, refuse_beside_old
from . import patches
from .const import CONF_CAMERAS, DOMAIN, MODULE
from .protect import CannotConnect, InvalidAuth, speaker_cameras
from .restart_notice import async_check_restart, manifest_version

_LOGGER = logging.getLogger(__name__)
# Read at import, as Casa Mia's own: a reload must not take newer files as loaded.
LOADED_VERSION = manifest_version()


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = parent_coordinator(hass)
    off = follow_module(
        hass,
        entry,
        coordinator,
        MODULE,
        lambda: async_check_restart(hass, LOADED_VERSION),
    )
    if off:
        _LOGGER.info("Switched off in the app: no talkback through %s", entry.title)
        # Unloading took the patches out; go2rtc gets HA's own config back.
        if not patches._targets:
            entry.async_on_unload(async_at_started(hass, patches.restart_if_amended))
        return True
    refuse_beside_old(hass)

    host, api_key = entry.data[CONF_HOST], entry.data[CONF_API_KEY]
    try:
        cameras = await speaker_cameras(async_get_clientsession(hass), host, api_key)
    except InvalidAuth as exc:
        raise ConfigEntryAuthFailed(f"Protect at {host} refused the API key") from exc
    except CannotConnect as exc:
        raise ConfigEntryNotReady(f"Protect at {host} didn't answer: {exc}") from exc

    try:
        patches.install(hass)
    except PatchError as exc:
        # Stay loaded so the Repair is shown; cameras keep working without talk.
        patches.PATCHES.fail(hass, str(exc))
        return True

    chosen = [c for c in cameras if c.id in set(entry.options.get(CONF_CAMERAS, ()))]
    secrets = await hass.async_add_executor_job(
        _write_secrets, _secrets_file(hass, entry), host, api_key
    )
    patches.set_targets(entry.entry_id, {c.mac: (secrets, c.id) for c in chosen})
    _LOGGER.info(
        "Talkback on %s: %s", host, ", ".join(c.name for c in chosen) or "no cameras"
    )

    entry.async_on_unload(entry.add_update_listener(_reload))
    entry.async_on_unload(async_at_started(hass, patches.ensure_running_amended))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # go2rtc keeps our config until the last entry is removed (async_remove_entry) or the
    # module is switched off, so a reload after changing the cameras doesn't restart it twice.
    if patches.remove_targets(entry.entry_id):
        patches.uninstall()
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.async_add_executor_job(_secrets_file(hass, entry).unlink, True)
    if not hass.config_entries.async_loaded_entries(DOMAIN):
        await patches.restart_if_amended(hass)


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _secrets_file(hass: HomeAssistant, entry: ConfigEntry) -> Path:
    return Path(hass.config.path(".storage", DOMAIN, f"{entry.entry_id}.json"))


def _write_secrets(path: Path, host: str, api_key: str) -> str:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Created 0600 from the start, so the key is never readable by others even briefly.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as file:
        json.dump({"host": host, "api_key": api_key}, file)
    return str(path)
