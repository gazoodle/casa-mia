"""What happened, as it happens: each entry's watching started and stopped, each song a
group had and what was done about it (or why nothing was), what was put back, each
return from another station, and each change to its groups.

Kept twice. In memory, the last KEPT lines of each entry, for the page in Casa Mia (lost
at a restart of Home Assistant, not at a reload). And in Home Assistant's own Logbook,
against the entry's Last match sensor, where it is kept as long as the Recorder keeps
anything.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_DOMAIN, ATTR_ENTITY_ID, ATTR_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import dt as dt_util

from .const import DOMAIN

KEPT = 100
TRAILS = f"{DOMAIN}_trails"  # hass.data: each entry's lines, by entry id
NOTED = f"{DOMAIN}_noted"  # dispatcher signal: a line was added
# Home Assistant's Logbook takes these from any integration (its "logbook_entry").
LOGBOOK = "logbook_entry"

# What a line is about.
START, STOP = "start", "stop"
MATCH = "match"  # a group had the song
CHANGE = "change"  # what was done to the player for it
SKIP = "skip"  # nothing was done, and why
BACK = "back"  # a volume or a mute put back at the next track
RETURN = "return"  # back from another station, or why not
PROBLEM = "problem"
EDIT = "edit"  # a group, a station or the entry changed, or a song was rated


def last_match(entry: ConfigEntry) -> str:
    """The unique id of the entry's Last match sensor (sensor.py)."""
    return f"{entry.entry_id}_last_match"


@callback
def lines(hass: HomeAssistant, entry: ConfigEntry) -> deque[dict[str, Any]]:
    return hass.data.setdefault(TRAILS, {}).setdefault(
        entry.entry_id, deque(maxlen=KEPT)
    )


@callback
def note(
    hass: HomeAssistant, entry: ConfigEntry, kind: str, text: str, player: str = ""
) -> None:
    """Add a line: what it is about, the words, and the player it happened on."""
    lines(hass, entry).append(
        {
            "at": dt_util.utcnow().isoformat(),
            "kind": kind,
            "player": player,
            "text": text,
        }
    )

    state = hass.states.get(player) if player else None
    sensor = er.async_get(hass).async_get_entity_id("sensor", DOMAIN, last_match(entry))
    hass.bus.async_fire(
        LOGBOOK,
        {
            ATTR_NAME: entry.title,
            "message": f"{state.name if state else player}: {text}" if player else text,
            ATTR_DOMAIN: DOMAIN,
            ATTR_ENTITY_ID: sensor,
        },
    )
    async_dispatcher_send(hass, NOTED)


@callback
def forget(hass: HomeAssistant, entry: ConfigEntry) -> None:
    hass.data.get(TRAILS, {}).pop(entry.entry_id, None)
