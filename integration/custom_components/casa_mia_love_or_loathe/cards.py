"""The dashboards' end: the thumbs card's bundle (www/cards.js, built from
integration/cards/src/love-or-loathe by tools/build_cards), put into every Home Assistant
page, and the feed its thumbs follow.

The feed, SONG, is any signed-in user's, as the rate action is: for one player, what it
is playing, whether that song is already in the person's loved or loathed group, and
whether this login may rate for them at all. The person is the one the login belongs to, or the one the card names (a wall tablet's). It
is pushed when the player's track changes and when anything about the entries does.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.auth.models import User
from homeassistant.components import frontend, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import ATTR_ENTITY_ID, STATE_PLAYING
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .admin import FEEDS
from .const import (
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    DOMAIN,
    GROUP,
    LOATHE,
    LOVE,
)
from .pure import has_song, home
from .rating import person_of, refused

URL = f"/{DOMAIN}"  # where www/ is served
CARDS_VERSION = f"{DOMAIN}/cards"  # the websocket command: which version is served
SONG = f"{DOMAIN}/song"
VERSION = f"{DOMAIN}_version"  # hass.data: the version loaded


async def setup(hass: HomeAssistant, version: str | None) -> None:
    """Once per Home Assistant run. ?v= changes with each update, so browsers fetch the
    new copy."""
    hass.data[VERSION] = version
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL, str(Path(__file__).parent / "www"), False)]
    )
    frontend.add_extra_js_url(hass, f"{URL}/cards.js?v={version}")
    websocket_api.async_register_command(hass, _ws_cards)
    websocket_api.async_register_command(hass, _ws_song)


@websocket_api.websocket_command({vol.Required("type"): CARDS_VERSION})
@callback
def _ws_cards(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The version of the cards served now. A page open since before an update still
    runs the old ones (a browser loads each script once), so they ask at each reconnect
    and offer a reload when this is newer."""
    connection.send_result(msg["id"], {"version": hass.data[VERSION]})


def _song(
    hass: HomeAssistant, player: str, named: str | None, user: User
) -> dict[str, Any]:
    # The entry that has the player, running at this instant or not: every save starts
    # the watching again, and the thumbs must not go out and come back at each.
    entry = next(
        (
            e
            for e in hass.config_entries.async_entries(DOMAIN)
            if not e.disabled_by and player in e.options.get(CONF_PLAYERS, [])
        ),
        None,
    )
    own = person_of(hass, user.id)
    person = named or own
    state = hass.states.get(player)
    title = str(state.attributes.get("media_title") or "") if state else ""
    artist = str(state.attributes.get("media_artist") or "") if state else ""

    # Loved or loathed already: a line of one of the person's groups names the song. (A
    # line with a * that takes it in is not a rating of this song.)
    feeling = None
    if entry and person and title:
        for group in entry.subentries.values():
            mine = (
                group.subentry_type == GROUP and group.data.get(CONF_PERSON) == person
            )
            named = mine and has_song(group.data.get(CONF_PATTERNS, ""), title, artist)
            if named and home(group.data) in (LOVE, LOATHE):
                feeling = home(group.data)
    return {
        # Not watched: there is nothing to rate into.
        "watched": entry is not None,
        "playing": state is not None and state.state == STATE_PLAYING,
        "title": title,
        "artist": artist,
        "person": person,
        "feeling": feeling,
        # Why this login may not rate for this person here, in words; None when it may
        # (rating.refused, which the rate action goes by too).
        "refused": refused(entry, person, own, user.id, user.is_admin)
        if entry
        else None,
    }


@websocket_api.websocket_command(
    {
        vol.Required("type"): SONG,
        vol.Required(ATTR_ENTITY_ID): str,
        vol.Optional(CONF_PERSON): str,
    }
)
@callback
def _ws_song(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """One player's song for one person, now and again whenever it differs."""
    feeds: list[Callable[[], None]] = hass.data[FEEDS]
    player = msg[ATTR_ENTITY_ID]
    last: list[dict[str, Any]] = []

    @callback
    def send(*_: Any) -> None:
        now = _song(hass, player, msg.get(CONF_PERSON), connection.user)
        if last != [now]:
            last[:] = [now]
            connection.send_message(websocket_api.event_message(msg["id"], now))

    @callback
    def stop() -> None:
        feeds.remove(send)
        unfollow()

    # The entries' changes come by the page's feeds (admin.tell); the player's own, from
    # its state, so the thumbs follow a player even while its entry is switched off.
    feeds.append(send)
    unfollow = async_track_state_change_event(hass, [player], send)
    connection.subscriptions[msg["id"]] = stop
    connection.send_result(msg["id"])
    send()
