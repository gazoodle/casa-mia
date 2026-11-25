"""What the parts of the feed share: the names of things, and a refusal."""

from __future__ import annotations

from homeassistant.exceptions import HomeAssistantError

PLAYER = "media_player"
SONOS = "sonos"
# Where a favourite can go in the queue, in Home Assistant's own words.
ENQUEUE = ("next", "add", "replace", "play")
# A Sonos favourite, as Home Assistant's browsing names its kind, and the two places in
# the queue that leave the rest of it alone.
FAVOURITE = "favorite_item_id"
LINED_UP = ("next", "add")
# What puts different music on: after one of these, what Love it or Loathe it did to the
# music before, and has finished with, is no longer said on the players.
NEW_MUSIC = frozenset({"play_media", "queue_play", "queue_clear", "stop"})
# The folder Home Assistant puts a favourite playlist in, and Jukebox the Sonos playlists.
PLAYLISTS = "Playlists"


class Refused(HomeAssistantError):
    """Something the page asked for that can't be done, in words for the page."""
