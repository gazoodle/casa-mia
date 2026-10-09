"""The integrations that hang off Casa Mia: Casa Mia Guest Login and Casa Mia Camera
Commander. Each sets up only beside a Casa Mia entry and uses its coordinator (one
/health poll for all three); each comes and goes with its module in the app; Casa Mia
offers each under Discovered while its module is on and it is not set up."""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from typing import Any

from homeassistant.config_entries import (
    SOURCE_INTEGRATION_DISCOVERY,
    ConfigEntry,
    ConfigEntryState,
    ConfigFlow,
    ConfigFlowResult,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import discovery_flow

from .const import DOMAIN
from .coordinator import CasaMiaCoordinator, running_coordinator

_LOGGER = logging.getLogger(__name__)

# Each child's domain -> its module in the app's /health.
CHILDREN = {"casa_mia_guest_login": "guest_login", "casa_mia_commander": "commander"}
OFFERED = f"{DOMAIN}_offered"  # hass.data: children offered under Discovered this run


def module_state(coordinator: CasaMiaCoordinator, module: str) -> str | None:
    return coordinator.data.get("modules", {}).get(module, {}).get("state")


@callback
def reload_children(hass: HomeAssistant) -> None:
    """Casa Mia was set up (again): its children reload onto its new coordinator."""
    for domain in CHILDREN:
        for entry in hass.config_entries.async_entries(domain):
            if entry.state in (ConfigEntryState.LOADED, ConfigEntryState.SETUP_RETRY):
                hass.config_entries.async_schedule_reload(entry.entry_id)


@callback
def discover_children(hass: HomeAssistant, coordinator: CasaMiaCoordinator) -> None:
    """Offer each child whose module is on in the app and which is not set up (nor
    ignored) under Discovered, once per HA run, or again after its module was off."""
    offered: set[str] = hass.data.setdefault(OFFERED, set())
    for domain, module in CHILDREN.items():
        if module_state(coordinator, module) in (None, "disabled"):
            offered.discard(domain)
        elif domain not in offered and not hass.config_entries.async_entries(domain):
            offered.add(domain)
            _LOGGER.info("%s is on in the app: offering %s", module, domain)
            discovery_flow.async_create_flow(
                hass, domain, {"source": SOURCE_INTEGRATION_DISCOVERY}, {}
            )


def parent_coordinator(hass: HomeAssistant) -> CasaMiaCoordinator:
    """Casa Mia's coordinator for a child being set up; not ready without one (Casa Mia
    reloads its children once it is set up)."""
    if (coordinator := running_coordinator(hass)) is None:
        raise ConfigEntryNotReady("Casa Mia is not set up, or its app is not answering")
    return coordinator


@callback
def follow_module(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: CasaMiaCoordinator,
    module: str,
    check_restart: Callable[[], Coroutine[Any, Any, None]],
) -> bool:
    """Wire a child to its module: reload when the module is switched on or off in the
    app, and check the child's own restart Repair at each report. True while it is off."""
    off = module_state(coordinator, module) == "disabled"

    @callback
    def update() -> None:
        hass.async_create_task(check_restart())
        if (module_state(coordinator, module) == "disabled") != off:
            _LOGGER.info("%s was switched on or off in the app: reloading", module)
            hass.config_entries.async_schedule_reload(entry.entry_id)

    entry.async_on_unload(coordinator.async_add_listener(update))
    hass.async_create_task(check_restart())
    return off


class ChildConfigFlow(ConfigFlow):
    """One entry, no fields: confirm, and refuse without Casa Mia set up. Also what the
    Discovered card opens."""

    VERSION = 1
    TITLE = ""

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        await self.async_set_unique_id(self.handler)
        self._abort_if_unique_id_configured()
        if not self.hass.config_entries.async_entries(DOMAIN):
            return self.async_abort(reason="no_casa_mia")
        if user_input is not None:
            return self.async_create_entry(title=self.TITLE, data={})
        return self.async_show_form(step_id="user")

    async def async_step_integration_discovery(
        self, discovery_info: dict[str, Any]
    ) -> ConfigFlowResult:
        return await self.async_step_user()
