"""What the engine's layers share: its constants, a station, a player, and the small
functions that read a state or word a line."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from homeassistant.components.media_player import MediaPlayerEntityFeature
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.core import (
    CALLBACK_TYPE,
    State,
)

from ..const import (
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_MINUTES,
    CONF_ORDER,
    DOMAIN,
)
from ..pure import Act

ID = "media_content_id"
TYPE = "media_content_type"
# A player rounds the volume it is given; within this it is still the one set here.
SAME_VOLUME = 0.011
# A speaker reports a new volume a moment after it is given one. For this long after a
# change made here, a report that still shows the volume from before it is taken as late
# (Engine._level).
# ponytail: a fixed window. Follow each speaker's own state changes if it proves wrong.
REPORT_LAG = 10.0
# Back at the end of a song (CONF_BACK_AT_END): the longest the return waits for the next
# track, for a station whose title never changes.
LONGEST_SONG = timedelta(minutes=10)
# A loathed song in a queue is skipped. This many skipped one after another, and the
# next is given its group's own action: a queue of nothing but loathed songs, on repeat,
# would otherwise be skipped round for ever.
# ponytail: a count. Tell a queue that has come round again if this proves too blunt.
SKIPS = 5


@dataclass(frozen=True, slots=True)
class Station:
    id: str
    name: str
    media: dict[str, str]  # media_content_id and media_content_type, for play_media


@dataclass(slots=True)
class Player:
    """One watched player. `undo` and `away` are kept in storage (Engine._save)."""

    track: tuple[str, str] | None = None
    playing: bool = False  # as last told to the listeners
    # What to put back at the next track: ["volume", was, set] or ["mute"].
    undo: list[Any] | None = None
    # Switched to another station: {"until": ISO time, "origin": media to go back to or
    # None, "tried": station ids, "was": the content id before the switch, "ours": the
    # one the player reported after it, "waiting": true once the time is up and the
    # return waits for "song", [title, artist], to end (CONF_BACK_AT_END), "home": the
    # content id before the first switch, "due": true once the return was tried and
    # could not be made, so it is made when the player next plays (_back)}.
    away: dict[str, Any] | None = None
    back: CALLBACK_TYPE | None = None  # the timer for the return
    # What was last done to it, {"did", "why", "at"}, for whoever shows the player
    # (Base.doing). Kept in storage with `undo` and `away`, which it explains.
    last: dict[str, Any] | None = None
    # `last` is why the track after it plays (a song skipped, another station come back
    # from), so it is still told through that track (Engine._outlived).
    outlives: bool = False
    acting: bool = False  # an action is being carried out now
    skips: int = 0  # songs skipped one after another (SKIPS)
    # One track's work at a time: the undo of the last before the action of the next.
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


def _said(result: str) -> str:
    """An action's own account of itself, as a line of the trail."""
    if result == "event only":
        return "Nothing done to the player: the action is to fire the event only"
    return result[0].upper() + result[1:]


def _act(data: dict[str, Any]) -> Act:
    return Act(data[CONF_ACTION], data[CONF_AMOUNT], data[CONF_MINUTES])


def ordered(entry: ConfigEntry) -> list[ConfigSubentry]:
    """The entry's groups and stations in the order the page gave them (CONF_ORDER);
    any it doesn't name come after, as made."""
    order = entry.options.get(CONF_ORDER, [])
    place = {id: n for n, id in enumerate(order)}
    return sorted(
        entry.subentries.values(),
        key=lambda s: place.get(s.subentry_id, len(place)),
    )


def store_key(entry: ConfigEntry) -> str:
    """Each entry's own file in Home Assistant's storage."""
    return f"{DOMAIN}.{entry.entry_id}"


def _speakers(state: State) -> list[str]:
    """The player and every speaker grouped with it, which hear what it plays. Sonos
    mutes and sets the volume of each speaker by itself, so a mute of the leader alone
    left the rest of its group playing (2026-11-15)."""
    members = state.attributes.get("group_members") or []
    return [state.entity_id, *(m for m in members if m != state.entity_id)]


def favourite(state: State) -> str | None:
    """The one of the player's own sources that it is on, as its source list names it,
    or None. A Sonos reports no source for a favourite, only the channel, and adds the
    show's name to that ("Harbour FM • Breakfast")."""
    sources = state.attributes.get("source_list") or []
    for said in (state.attributes.get("source"), state.attributes.get("media_channel")):
        for name in (said, str(said).split(" • ")[0]):
            if name in sources:
                return name
    return None


def skippable(state: State) -> bool:
    """Whether what a player is on can be skipped: a song of a known length, not a
    station's, on a player that can go to the next. A Sonos names the station in
    `media_channel`, and a station's song has no length."""
    said = state.attributes
    can = said.get("supported_features", 0) & MediaPlayerEntityFeature.NEXT_TRACK
    return bool(can and said.get("media_duration") and not said.get("media_channel"))


def _on(speakers: Any) -> str:
    """ " on 2 speakers", for an action on more than the player."""
    return f" on {len(speakers)} speakers" if len(speakers) > 1 else ""


def _track(state: State) -> tuple[str, str]:
    return (
        str(state.attributes.get("media_title") or ""),
        str(state.attributes.get("media_artist") or ""),
    )
