"""The house's music as Jukebox's page shows it, worked out from the Sonos entities'
states. Nothing here imports Home Assistant, so it is tested by itself.

The speakers hold the truth: a group is whatever the speakers say is playing together,
with the first of its members (Sonos's coordinator) standing for it. Every room is in
exactly one group; a room playing nothing by itself is a group that is `quiet`.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

# What a group is playing from. Only a queue has songs to line up and move.
QUEUE = "queue"
RADIO = "radio"
TV = "tv"
LINE_IN = "line_in"
NOTHING = "nothing"

# How Sonos addresses its television and line-in inputs.
_INPUTS = {"x-sonos-htastream:": TV, "x-rincon-stream:": LINE_IN}
_ANSWERING = ("playing", "paused", "idle", "buffering", "on", "off")


def kind(attributes: Mapping[str, Any]) -> str:
    """What a speaker is playing from."""
    address = str(attributes.get("media_content_id") or "")
    for start, what in _INPUTS.items():
        if address.startswith(start):
            return what
    if attributes.get("media_channel"):
        return RADIO
    return QUEUE if attributes.get("media_title") else NOTHING


def _percent(level: Any) -> int | None:
    return round(level * 100) if isinstance(level, (int, float)) else None


def house(
    players: Mapping[str, tuple[str, str, Mapping[str, Any]]],
) -> dict[str, Any]:
    """The rooms and their groups. `players` is each Sonos entity's room name, state and
    attributes; a room whose speaker isn't answering is listed, in no group, so the page
    can say so."""
    rooms = {
        entity: {
            "name": name,
            "volume": _percent(attributes.get("volume_level")),
            "muted": bool(attributes.get("is_volume_muted")),
            "available": state in _ANSWERING,
        }
        for entity, (name, state, attributes) in players.items()
    }

    groups = []
    for entity, (_name, state, attributes) in players.items():
        # Every member carries the same list, coordinator first, so a group is drawn
        # once: from its coordinator. A room alone lists itself, or nothing at all.
        members = list(attributes.get("group_members") or [entity])
        if not rooms[entity]["available"] or members[0] != entity:
            continue
        members = [m for m in members if m in rooms and rooms[m]["available"]]
        what = kind(attributes)
        at = attributes.get("media_position_updated_at")
        groups.append(
            {
                "id": entity,
                "rooms": members,
                "state": "playing" if state in ("playing", "buffering") else "paused",
                "kind": what,
                "quiet": what == NOTHING and len(members) == 1,
                "title": attributes.get("media_title") or "",
                "artist": attributes.get("media_artist") or "",
                "album": attributes.get("media_album_name") or "",
                "channel": attributes.get("media_channel") or "",
                "picture": attributes.get("entity_picture"),
                "duration": attributes.get("media_duration"),
                "position": attributes.get("media_position"),
                "position_at": at.isoformat() if hasattr(at, "isoformat") else at,
                "shuffle": bool(attributes.get("shuffle")),
                "repeat": attributes.get("repeat") or "off",
                "queue_size": attributes.get("queue_size"),
                "queue_position": attributes.get("queue_position"),
            }
        )

    # The order is steady, so the page's players don't jump about: what is playing
    # first, then by the room's name.
    groups.sort(key=lambda g: (g["quiet"], rooms[g["id"]]["name"].lower()))
    return {"groups": groups, "rooms": rooms}


def group_of(model: Mapping[str, Any], room: str) -> dict[str, Any] | None:
    """The group a room is in."""
    return next((g for g in model["groups"] if room in g["rooms"]), None)


def shifted(volumes: Mapping[str, int | None], to: int) -> dict[str, int]:
    """Each room's new volume when a group's one slider is moved to `to`: every room
    moves by the same amount, so a room set quieter than the rest stays quieter. The
    slider shows the rooms' average."""
    known = {room: volume for room, volume in volumes.items() if volume is not None}
    if not known:
        return {}
    by = to - round(sum(known.values()) / len(known))
    return {room: max(0, min(100, volume + by)) for room, volume in known.items()}
