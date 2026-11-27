"""Asking a Sonos speaker itself, over UPnP on port 1400, for what Home Assistant's Sonos
integration has no action for, or does differently from what the page offers.

The queue is read, and a song in it moved or taken out, here: Home Assistant can't
move one, and its reading of the queue has no lengths.

Home Assistant plays a Sonos favourite by clearing the queue first, whatever `enqueue`
says (read in its code, 2026-11-23, after "Add to the end" replaced the owner's queue).
So a favourite is added to the queue here, as the Sonos app does it: its address and
description are read from the speaker's list of favourites and handed to the queue.

The parts: `common` (how a speaker is asked, and its lists read), `listing` (what it
lists), `saved` (changing a Sonos playlist, which a speaker calls a saved queue) and
`player` (its queue and what it is playing). Everything is imported from here.
"""

from .common import (
    ABOUT,
    ANSWER,
    COPIES,
    COPY,
    DC,
    DIDL,
    ENVELOPE,
    ERROR,
    MOST,
    OWN_QUEUE,
    PAGE,
    PATHS,
    PORT,
    QUEUE,
    SAVED_QUEUES,
    SONOS,
    UNDO,
    UPNP,
    _described,  # noqa: F401  (its test reads it as it was written, from here)
    call,
)
from .listing import (
    covers,
    detailed,
    favourite_item,
    library,
    named,
    playlists,
    queue,
    queue_favourite,
    size,
)
from .player import (
    clear,
    delete_playlist,
    go_to,
    insert,
    keep,
    move,
    place,
    play_from,
    playing,
    remove,
    rest,
    save,
    songs,
    source,
    station,
    track,
)
from .saved import (
    SPOTIFY,
    changes,
    holds,
    playlist_add,
    playlist_arrange,
    playlist_drop,
    playlist_move,
    playlist_new,
    playlist_remove,
    playlist_send,
    spotify,
)

__all__ = [
    "ABOUT",
    "ANSWER",
    "COPIES",
    "COPY",
    "DC",
    "DIDL",
    "ENVELOPE",
    "ERROR",
    "MOST",
    "OWN_QUEUE",
    "PAGE",
    "PATHS",
    "PORT",
    "QUEUE",
    "SAVED_QUEUES",
    "SONOS",
    "SPOTIFY",
    "UNDO",
    "UPNP",
    "call",
    "changes",
    "clear",
    "covers",
    "delete_playlist",
    "detailed",
    "favourite_item",
    "go_to",
    "holds",
    "insert",
    "keep",
    "library",
    "move",
    "named",
    "place",
    "play_from",
    "playing",
    "playlist_add",
    "playlist_arrange",
    "playlist_drop",
    "playlist_move",
    "playlist_new",
    "playlist_remove",
    "playlist_send",
    "playlists",
    "queue",
    "queue_favourite",
    "remove",
    "rest",
    "save",
    "size",
    "songs",
    "source",
    "spotify",
    "station",
    "track",
]
