"""The page's two ends in Home Assistant: the house's music, pushed whenever a speaker
changes, and what the page asks to be done.

Everything the page does comes through `do` here and never goes to a speaker by another
way, so Jukebox always knows which changes were its own. (The party lock, when it is
built, tells a guest's change from the owners' by that.)

The rooms are every media player of Home Assistant's Sonos integration: nothing is
listed in Jukebox's options. Changes arrive as Home Assistant's own state events (RULE
FOUR); nothing is polled.
"""

from .asks import do, favourites, play, queue
from .common import (
    ENQUEUE,
    FAVOURITE,
    LINED_UP,
    NEW_MUSIC,
    PLAYER,
    PLAYLISTS,
    SONOS,
    Refused,
)
from .doing import ACTIONS
from .model import Feed

__all__ = [
    "ACTIONS",
    "ENQUEUE",
    "FAVOURITE",
    "LINED_UP",
    "NEW_MUSIC",
    "PLAYER",
    "PLAYLISTS",
    "SONOS",
    "Feed",
    "Refused",
    "do",
    "favourites",
    "play",
    "queue",
]
