"""Sensor Watch's page, as a panel in Home Assistant's sidebar: the bundle in www/
(built from app/web/src/sensor-watch by tools/build_web), served here and shown to
admins only. That flag only hides the panel from a non-admin's sidebar; what keeps them
out is every command the page talks to being admin-only (admin.py)."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

URL = "/casa_mia_sensor_watch"  # where www/ is served
PANEL = "sensor-watch"  # the page's address in Home Assistant: /sensor-watch
ELEMENT = "casa-mia-sensor-watch-panel"  # the custom element panel.js defines


async def show(hass: HomeAssistant, version: str | None) -> None:
    """Serve www/ and put the panel in the sidebar, once per Home Assistant run: a path
    can't be taken off, and the panel stays through a reload of the entry (the page
    says Sensor Watch isn't running, then carries on), since taking it out under an
    open page broke Home Assistant's own (2026.11.3-b1). ?v= changes with each update,
    so browsers fetch the new copy."""
    if not hass.data.get(URL):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL, str(Path(__file__).parent / "www"), False)]
        )
        hass.data[URL] = True
    if PANEL in hass.data.get(frontend.DATA_PANELS, {}):
        return
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL,
        webcomponent_name=ELEMENT,
        sidebar_title="Sensor Watch",
        sidebar_icon="mdi:eye-check-outline",
        module_url=f"{URL}/panel.js?v={version}",
        # In a frame of its own: the page's styles are global, and would leak into
        # Home Assistant's (and its into the page).
        embed_iframe=True,
        require_admin=True,
    )


def hide(hass: HomeAssistant) -> None:
    """Out of the sidebar: the integration was deleted."""
    frontend.async_remove_panel(hass, PANEL, warn_if_unknown=False)
