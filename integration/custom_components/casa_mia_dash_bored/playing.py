"""What the house's media players have played: the songs and programmes of the celebrity
column. A page knows only what each player is playing now, so the last KEPT titles are
kept here and fed to the pages (feed.py says why a page can't listen for itself).

Home Assistant says when a player's state changes; nothing is polled. A player that
gives no title (many televisions give only their input) has nothing to tell, and is
left out. Kept for this run of Home Assistant only."""

from __future__ import annotations

import logging
from collections import deque
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.const import EVENT_STATE_CHANGED, STATE_PLAYING
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, PLAYING
from .feed import Send, follow

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_playing"
KEPT = 30
# The media player's content types that are watched, not listened to.
SHOWS = {"tvshow", "episode", "channel", "movie", "video"}


class Playing:
    def __init__(self) -> None:
        self.items: deque[dict[str, Any]] = deque(maxlen=KEPT)
        self.feeds: list[Send] = []
        # By player, the last thing it was told of: a change of volume, or a pause and
        # a resume, is not another playing of it.
        self.last: dict[str, tuple[str, str]] = {}

    @callback
    def changed(self, event: Event[EventStateChangedData]) -> None:
        state = event.data["new_state"]
        if state is None or state.state != STATE_PLAYING:
            return
        told = state.attributes
        # A programme is known by its series, and a channel with no programme by its name.
        title = str(
            told.get("media_series_title")
            or told.get("media_title")
            or told.get("media_channel")
            or ""
        )
        artist = str(told.get("media_artist") or "")
        if not title or self.last.get(state.entity_id) == (title, artist):
            return
        self.last[state.entity_id] = (title, artist)

        at = dt_util.utcnow().timestamp()
        item = {
            "id": f"{state.entity_id} {at}",
            "entity_id": state.entity_id,
            "title": title,
            "artist": artist,
            "show": told.get("media_content_type") in SHOWS,
            "at": at,
        }
        self.items.append(item)
        _LOGGER.info("Playing: %s began %r", state.entity_id, title)
        for feed in list(self.feeds):
            feed(item)


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    playing = hass.data[KEY] = Playing()

    @callback
    def players(data: EventStateChangedData) -> bool:
        return data["entity_id"].startswith("media_player.")

    # The bus, filtered, and not the helper that tracks a domain: that one does not tell
    # of an entity's first state, so what was playing as Home Assistant started was missed.
    hass.bus.async_listen(EVENT_STATE_CHANGED, playing.changed, event_filter=players)
    websocket_api.async_register_command(hass, _ws_playing)


@websocket_api.websocket_command({vol.Required("type"): PLAYING})
@callback
def _ws_playing(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Everything held now, then each as it begins."""
    playing: Playing = hass.data[KEY]
    follow(connection, msg, playing.feeds, playing.items)
