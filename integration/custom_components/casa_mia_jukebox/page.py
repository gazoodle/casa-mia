"""Jukebox's page and its small card: one bundle (www/cards.js, built from
integration/cards/src/jukebox by tools/build_cards), put into every Home Assistant page
for the card and shown as a page of its own, /jukebox, in the sidebar. The page is for
everyone who is signed in, as the speakers are.

The websocket commands they talk to are here; feed.py does the work.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN, TITLE, URL
from .feed import ACTIONS, ENQUEUE, Feed, do, favourites, queue

PANEL = "jukebox"  # the page's address in Home Assistant: /jukebox
ELEMENT = "casa-mia-jukebox-page"  # the custom element cards.js defines
CARDS_VERSION = f"{DOMAIN}/cards"  # which version is served
HOUSE = f"{DOMAIN}/house"
DO = f"{DOMAIN}/do"
FAVOURITES = f"{DOMAIN}/favourites"
QUEUE = f"{DOMAIN}/queue"
ORDER = f"{DOMAIN}/order"
FEED = f"{DOMAIN}_feed"  # hass.data
VERSION = f"{DOMAIN}_version"


def setup(hass: HomeAssistant, version: str | None) -> None:
    """Once per Home Assistant run. ?v= changes with each update, so browsers fetch the
    new copy."""
    hass.data[VERSION] = version
    hass.data[FEED] = Feed(hass)
    frontend.add_extra_js_url(hass, f"{URL}/cards.js?v={version}")
    for command in (
        _ws_cards,
        _ws_house,
        _ws_do,
        _ws_favourites,
        _ws_queue,
        _ws_order,
    ):
        websocket_api.async_register_command(hass, command)


async def show(hass: HomeAssistant) -> None:
    """The page in the sidebar. It stays through a reload of the entry: taking a panel
    out under an open page broke Home Assistant's own (Sensor Watch, 2026.11.3-b1)."""
    await hass.data[FEED].load()
    if PANEL in hass.data.get(frontend.DATA_PANELS, {}):
        return
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL,
        webcomponent_name=ELEMENT,
        sidebar_title=TITLE,
        sidebar_icon="mdi:boombox",
        module_url=f"{URL}/cards.js?v={hass.data[VERSION]}",
        require_admin=False,
    )


def hide(hass: HomeAssistant) -> None:
    """Out of the sidebar: the integration was deleted."""
    frontend.async_remove_panel(hass, PANEL, warn_if_unknown=False)


@websocket_api.websocket_command({vol.Required("type"): CARDS_VERSION})
@callback
def _ws_cards(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The version of the bundle served now. A page open since before an update still
    runs the old one, so it asks at each reconnect and offers a reload."""
    connection.send_result(msg["id"], {"version": hass.data[VERSION]})


@websocket_api.websocket_command({vol.Required("type"): HOUSE})
@callback
def _ws_house(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The house's music, now and again whenever a speaker changes."""

    @callback
    def send(model: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], model))

    connection.send_result(msg["id"])
    connection.subscriptions[msg["id"]] = hass.data[FEED].listen(send)


@websocket_api.websocket_command(
    {
        vol.Required("type"): DO,
        vol.Required("action"): vol.In(ACTIONS),
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Optional("room"): str,
        vol.Optional("value"): vol.All(vol.Coerce(int), vol.Range(0, 86400)),
        vol.Optional("to"): vol.All(vol.Coerce(int), vol.Range(0, 86400)),
        vol.Optional("on"): bool,
        vol.Optional("mode"): vol.In(("off", "all", "one")),
        vol.Optional("media_content_id"): str,
        vol.Optional("media_content_type"): str,
        vol.Optional("enqueue"): vol.In(ENQUEUE),
        vol.Optional("name"): vol.All(str, vol.Length(max=60)),
    }
)
@websocket_api.async_response
async def _ws_do(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """One thing the page asks for. A failure goes back with its reason, for the page
    to show."""
    data = {
        k: v for k, v in msg.items() if k not in ("id", "type", "action", "entity_id")
    }
    who = connection.user.name or "someone"
    try:
        await do(hass.data[FEED], who, msg["action"], msg[ATTR_ENTITY_ID], data)
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {vol.Required("type"): FAVOURITES, vol.Required(ATTR_ENTITY_ID): str}
)
@websocket_api.async_response
async def _ws_favourites(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    try:
        found = await favourites(hass, msg[ATTR_ENTITY_ID])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"], found)


@websocket_api.websocket_command(
    {vol.Required("type"): QUEUE, vol.Required(ATTR_ENTITY_ID): str}
)
@websocket_api.async_response
async def _ws_queue(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The queue of the group a room is in. The page asks again when the house's music
    says the queue or the song has changed; it is never asked on a timer."""
    try:
        found = await queue(hass.data[FEED], msg[ATTR_ENTITY_ID])
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"], found)


@websocket_api.websocket_command(
    {vol.Required("type"): ORDER, vol.Required("rooms"): [str]}
)
@websocket_api.async_response
async def _ws_order(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The order the page's players were dragged into, for the whole house. Every open
    page is sent the house again, in the new order."""
    await hass.data[FEED].arrange(connection.user.name or "someone", msg["rooms"])
    connection.send_result(msg["id"])
