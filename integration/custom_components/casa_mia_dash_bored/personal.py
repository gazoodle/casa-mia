"""The Personal column's announcements that are moments: for now, a song somebody loved
or loathed, which Love it or Loathe it says by a bus event. They are kept here and fed
to the pages (feed.py says why a page can't listen for itself).

Kept for this run of Home Assistant only, and the latest KEPT of them. Without Love it
or Loathe it nothing arrives, and the feed is empty. Who is at home is not here: a page
reads that from the person entities it already has."""

from __future__ import annotations

import logging
from collections import deque
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, PERSONAL, RATED_EVENT
from .feed import Send, follow

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_personal"
KEPT = 20
FEELINGS = ("love", "loathe")  # taking a rating away is not an announcement


class Personal:
    def __init__(self) -> None:
        self.items: deque[dict[str, Any]] = deque(maxlen=KEPT)
        self.feeds: list[Send] = []

    @callback
    def rated(self, event: Event) -> None:
        feeling, title = event.data.get("feeling"), event.data.get("title")
        if feeling not in FEELINGS:
            return
        if not title:
            _LOGGER.warning("A rating with no song's title was ignored")
            return
        item = {
            "kind": feeling,
            "name": str(event.data.get("name") or event.data.get("person") or ""),
            "title": str(title),
            "artist": str(event.data.get("artist") or ""),
            "at": dt_util.utcnow().timestamp(),
        }
        self.items.append(item)
        _LOGGER.info("Personal: %s, %s a song", item["name"], feeling)
        for feed in list(self.feeds):
            feed(item)


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    personal = hass.data[KEY] = Personal()
    hass.bus.async_listen(RATED_EVENT, personal.rated)
    websocket_api.async_register_command(hass, _ws_personal)


@websocket_api.websocket_command({vol.Required("type"): PERSONAL})
@callback
def _ws_personal(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Every announcement held now, then each as it comes."""
    personal: Personal = hass.data[KEY]
    follow(connection, msg, personal.feeds, personal.items)
