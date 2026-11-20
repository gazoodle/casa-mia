"""A Repair while Tablet Layout's own file is in the dashboard's resources too.

Tablet Layout, garnish and the Over layer are also published by themselves, as the
dashboard plugin `casa-mia-tablet-layout.js`, for a house without Casa Mia. This
integration loads the same elements in `cm-cards.js`. With both loaded, the browser uses
whichever defines them first, so an older plugin could run in place of the copy this
version ships and nobody would know. The card files say so in the browser's console; this
says so where the owner looks.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

ISSUE = "standalone_layout"
FILE = "casa-mia-tablet-layout.js"
_LOGGER = logging.getLogger(__name__)


async def watch(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Raises the Repair while the plugin is a dashboard resource, now and at each change
    to the resources, and clears it when it is gone."""
    if LOVELACE_DATA not in hass.data:
        _LOGGER.warning("Dashboards are not set up: not watching their resources")
        return
    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()  # stored resources are read at their first use

    async def check(*_: Any) -> None:
        urls = [
            item["url"]
            for item in resources.async_items()
            if FILE in item.get("url", "")
        ]
        if not urls:
            ir.async_delete_issue(hass, DOMAIN, ISSUE)
            return
        _LOGGER.warning(
            "%s is in the dashboard's resources (%s) and Casa Mia loads the same "
            "elements itself: the first one loaded is used. Remove the resource",
            FILE,
            urls[0],
        )
        ir.async_create_issue(
            hass,
            DOMAIN,
            ISSUE,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE,
            translation_placeholders={"url": urls[0]},
        )

    await check()
    # Unloaded, Casa Mia loads no cards, so nothing is loaded twice.
    entry.async_on_unload(lambda: ir.async_delete_issue(hass, DOMAIN, ISSUE))
    # ponytail: resources kept in YAML have no listener, and `lovelace.reload_resources`
    # swaps the collection without an event, so there is nothing to follow: those are
    # looked at when this integration loads only.
    if hasattr(resources, "async_add_listener"):
        entry.async_on_unload(resources.async_add_listener(check))
