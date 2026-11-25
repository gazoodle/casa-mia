"""The sightings of the last half hour, kept for the pages: each with its own
photograph, so that a camera's second sighting does not take the first one's picture
away. image.py tells each one here as it happens. SIGHTINGS feeds them to any signed-in
page (all of them when it subscribes, then each as it comes or changes), and a
photograph is served at PHOTO by its sighting's id.

Kept in memory, for this run of Home Assistant only, and never more than MOST of them.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import voluptuous as vol
from aiohttp import web
from homeassistant.components import websocket_api
from homeassistant.components.http import KEY_HASS, HomeAssistantView
from homeassistant.components.http.auth import async_sign_path
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, SIGHTINGS
from .feed import Send, follow

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_sightings"
KEEP = 1800  # seconds a sighting is kept: the pages' history is of the last half hour
MOST = 40  # sightings kept at once, each with a photograph of 100 kB or so
PHOTO = f"/api/{DOMAIN}/photo/{{sighting_id}}"


class Log:
    """The sightings kept, oldest first, and each one's photograph."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}
        self.photos: dict[str, tuple[bytes, str]] = {}
        self.feeds: list[Send] = []

    @callback
    def tell(self, item: dict[str, Any], photo: tuple[bytes, str] | None) -> None:
        """A new sighting, or one that has changed: its kind, or its photograph."""
        self.items[item["id"]] = item
        if photo:
            self.photos[item["id"]] = photo
        else:
            self.photos.pop(item["id"], None)

        now = dt_util.utcnow().timestamp()
        gone = [key for key, old in self.items.items() if now - old["at"] > KEEP]
        for key in [*gone, *list(self.items)[:-MOST]]:
            self.items.pop(key, None)
            self.photos.pop(key, None)
        for feed in list(self.feeds):
            feed(item)


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    hass.data[KEY] = Log()
    websocket_api.async_register_command(hass, _ws_sightings)
    hass.http.register_view(PhotoView())


@websocket_api.websocket_command({vol.Required("type"): SIGHTINGS})
@callback
def _ws_sightings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Every sighting held now, then each as it comes, each with a photograph its
    address signed for this connection's login."""
    log: Log = hass.data[KEY]

    def shape(item: dict[str, Any]) -> dict[str, Any]:
        if not item["photo"]:
            return item
        path = f"{PHOTO.format(sighting_id=item['id'])}?v={item['changed']}"
        # Its refresh token named: a sighting told later is sent from outside this
        # command, where Home Assistant can't tell whose connection it is.
        signed = async_sign_path(
            hass,
            path,
            timedelta(seconds=KEEP),
            refresh_token_id=connection.refresh_token_id,
        )
        return {**item, "photo_url": signed}

    follow(connection, msg, log.feeds, log.items.values(), shape)


class PhotoView(HomeAssistantView):
    """A sighting's photograph, for a signed-in page or a signed address (an <img>
    can't sign in). Never open to whoever has the id: these are pictures of people at
    the door, and an id ends up in browser history and logs (Frenck, reviewing
    hacs/default#14577, 2026-11-24)."""

    url = PHOTO
    name = f"api:{DOMAIN}:photo"

    async def get(self, request: web.Request, sighting_id: str) -> web.Response:
        log: Log = request.app[KEY_HASS].data[KEY]
        if (photo := log.photos.get(sighting_id)) is None:
            return web.Response(status=404)
        # The page asks again, with another ?v=, when the photograph changes.
        return web.Response(
            body=photo[0],
            content_type=photo[1],
            headers={"Cache-Control": f"private, max-age={KEEP}"},
        )
