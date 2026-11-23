"""The watching and the acting: each chosen media player's track, as Home Assistant
reports it changing (pushed, never polled), against the groups; then the group's action,
and its undoing.

What an action changes is always put back by something that must happen: a volume change
or a mute at the player's next track, a switch of station at a time kept in Home
Assistant's storage, so a restart in between loses neither. Nothing is put back over a
person's own change: a volume someone has moved since is left alone, and a player that
is no longer playing what was put on is not switched back.

A return is forgotten only once the player has been switched back (or someone has chosen
something else). One that can't be made at its time, because the player is not playing,
has not turned up yet after a restart or refuses the call, is kept as due and made when
the player next plays.
"""

from .common import ID, TYPE, ordered, store_key
from .engine import Engine

__all__ = ["ID", "TYPE", "Engine", "ordered", "store_key"]
