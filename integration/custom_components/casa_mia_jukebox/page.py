"""Jukebox's page and its small card: one bundle (www/cards.js, built from
integration/cards/src/jukebox by tools/build_cards), put into every Home Assistant page
for the card and shown as a page of its own, /jukebox, in the sidebar. The page is for
everyone who is signed in, as the speakers are.

The websocket commands they talk to are here; feed.py does the work.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import frontend, websocket_api
from homeassistant.const import ATTR_ENTITY_ID, EVENT_HOMEASSISTANT_STOP
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from . import find, may
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
SEARCH = f"{DOMAIN}/search"
BROWSE = f"{DOMAIN}/browse"
FEED = f"{DOMAIN}_feed"  # hass.data
VERSION = f"{DOMAIN}_version"


def setup(hass: HomeAssistant, version: str | None) -> None:
    """Once per Home Assistant run. ?v= changes with each update, so browsers fetch the
    new copy."""
    hass.data[VERSION] = version
    hass.data[FEED] = feed = Feed(hass)
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, feed.parties.stop_all)
    frontend.add_extra_js_url(hass, f"{URL}/cards.js?v={version}")
    for command in (
        _ws_cards,
        _ws_house,
        _ws_do,
        _ws_favourites,
        _ws_queue,
        _ws_order,
        _ws_search,
        _ws_browse,
    ):
        websocket_api.async_register_command(hass, command)


async def show(hass: HomeAssistant, sidebar: bool) -> None:
    """The page, at /jukebox, and in the sidebar unless the options say not (someone
    with a dashboard of their own made from the cards may not want it there). It is
    registered again in place when the option changes, never taken out and put back:
    taking a panel out under an open page broke Home Assistant's own (Sensor Watch,
    2026.11.3-b1)."""
    await hass.data[FEED].load()
    # As panel_custom registers one, but through the frontend's own call, which can
    # change a panel that is already there. A panel with no title isn't in the sidebar.
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=TITLE if sidebar else None,
        sidebar_icon="mdi:boombox" if sidebar else None,
        frontend_url_path=PANEL,
        config={
            "_panel_custom": {
                "name": ELEMENT,
                "embed_iframe": False,
                "trust_external": False,
                "module_url": f"{URL}/cards.js?v={hass.data[VERSION]}",
            }
        },
        require_admin=False,
        update=PANEL in hass.data.get(frontend.DATA_PANELS, {}),
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
        # With this login's part (may.py), so the page offers only what it may do. It
        # is looked up at each send; Jukebox decides again when something is asked.
        me = may.who(hass, connection.user).role
        connection.send_message(
            websocket_api.event_message(msg["id"], {**model, "me": me})
        )

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
        vol.Optional("playlist"): str,
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
    who = may.who(hass, connection.user)
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
    {
        vol.Required("type"): QUEUE,
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Optional("playlist"): str,
    }
)
@websocket_api.async_response
async def _ws_queue(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The queue of the group a room is in, or the songs of a Sonos playlist. The page asks again when the house's music
    says the queue or the song has changed; it is never asked on a timer."""
    try:
        found = await queue(
            hass.data[FEED], msg[ATTR_ENTITY_ID], msg.get("playlist", "")
        )
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
    await hass.data[FEED].arrange(may.who(hass, connection.user), msg["rooms"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): SEARCH,
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Required("query"): vol.All(str, vol.Length(min=1, max=100)),
    }
)
@websocket_api.async_response
async def _ws_search(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The music library and Spotify, searched together. A source that fails comes
    back with its reason beside the other's results (find.search)."""
    who = may.who(hass, connection.user)
    found = await find.search(hass, who, msg[ATTR_ENTITY_ID], msg["query"])
    connection.send_result(msg["id"], found)


@websocket_api.websocket_command(
    {
        vol.Required("type"): BROWSE,
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Optional("media_content_type"): str,
        vol.Optional("media_content_id"): str,
    }
)
@websocket_api.async_response
async def _ws_browse(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """One place in what a speaker can play, and what is in it."""
    try:
        found = await find.browse(
            hass,
            msg[ATTR_ENTITY_ID],
            msg.get("media_content_type"),
            msg.get("media_content_id"),
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"], found)
