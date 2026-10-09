"""Poll the Casa Mia app's /health and surface problems as Repairs."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import API_VERSION, DOMAIN, SCRIPTS
from .restart_notice import async_check_restart

_LOGGER = logging.getLogger(__name__)
API_MISMATCH = "api_mismatch"


def helpers_on(data: dict[str, Any] | None) -> list[str]:
    """The dashboard helper scripts switched on in the app (its Settings page), by file;
    the defaults until the app has said."""
    chosen = ((data or {}).get("settings") or {}).get("helpers") or {}
    return [f for k, (f, on) in SCRIPTS.items() if chosen.get(k, on)]


async def async_fetch_health(
    hass: HomeAssistant, url: str, helpers: list[str] | None = None
) -> dict[str, Any]:
    """The app's /health. `helpers`: the dashboard helper scripts loaded, told to the app
    so its Camera Dashboard page knows (e.g. that Back works)."""
    session = async_get_clientsession(hass)
    params = {"helpers": ",".join(helpers)} if helpers is not None else None
    async with session.get(
        f"{url}/health", params=params, timeout=aiohttp.ClientTimeout(total=10)
    ) as response:
        response.raise_for_status()
        return await response.json()


class CasaMiaCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    def __init__(
        self, hass: HomeAssistant, entry: ConfigEntry, loaded_version: str | None
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            config_entry=entry,
            update_interval=timedelta(seconds=30),
        )
        self.url: str = entry.data[CONF_URL]
        self.loaded_version = loaded_version
        # Track motion, per commander id (motion.MotionTracker); see motion.tracker
        self.motion: dict[str, Any] = {}

    async def _async_update_data(self) -> dict[str, Any]:
        # Before the fetch, so a restart prompt still appears while the app is down.
        await async_check_restart(self.hass, self.loaded_version)
        try:
            data = await async_fetch_health(self.hass, self.url, helpers_on(self.data))
        except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
            raise UpdateFailed(f"Casa Mia app unreachable: {exc}") from exc
        self._check_api(data.get("api"))
        downloading = data.get("modules", {}).get("gitproxy", {}).get("downloading")
        # Faster polling while a download is running so progress is watchable.
        self.update_interval = timedelta(seconds=5 if downloading else 30)
        return data

    async def async_set_guest_endpoint(
        self, endpoint_id: str, on: bool, minutes: float | None = None
    ) -> None:
        """Open or close a guest-login endpoint in the app (optionally for `minutes`)."""
        path = f"/guest-login/{endpoint_id}/{'enable' if on else 'disable'}"
        if on and minutes:
            path += f"?minutes={minutes}"
        try:
            await async_post(self.hass, self.url, path)
        except aiohttp.ClientError as exc:
            raise HomeAssistantError(
                f"Guest login endpoint not changed: {exc}"
            ) from exc
        await self.async_request_refresh()

    def _check_api(self, app_api: object) -> None:
        if app_api == API_VERSION:
            ir.async_delete_issue(self.hass, DOMAIN, API_MISMATCH)
            return
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            API_MISMATCH,
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key=API_MISMATCH,
            translation_placeholders={
                "app_api": str(app_api),
                "expected_api": str(API_VERSION),
            },
        )


async def async_post(
    hass: HomeAssistant, url: str, path: str, json: dict[str, Any] | None = None
) -> None:
    session = async_get_clientsession(hass)
    async with session.post(
        f"{url}{path}", json=json, timeout=aiohttp.ClientTimeout(total=10)
    ) as response:
        response.raise_for_status()
