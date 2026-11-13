"""The rate action: the song a player is playing, added to a person's loved or loathed
group, and taken out of their other one. Buttons on a dashboard call it; whose song it
is comes from the login that pressed, or from the person named in the call (a wall
tablet is signed in as nobody in particular).

A person's loved group is the group that belongs to them and is set to Love, or was
before it was set to Ignore; the same for loathed. One they don't have yet is made at
their first rating. Only a person gets one: a login that belongs to no person (a wall
tablet's) is refused unless its button names the person, so a screen can't fill the
entry with groups of its own."""

from __future__ import annotations

import logging
from types import MappingProxyType

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_FEELING,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_REPEATS,
    DEFAULT_ACTS,
    DEFAULT_REPEATS,
    DOMAIN,
    GROUP,
    LOATHE,
    LOVE,
)
from .pure import home, with_song, without_song

_LOGGER = logging.getLogger(__name__)
SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(CONF_FEELING): vol.In([LOVE, LOATHE]),
        vol.Optional(CONF_PERSON): cv.entity_id,
    }
)


def _person_of(hass: HomeAssistant, user_id: str | None) -> str | None:
    """The person a login belongs to."""
    return next(
        (
            state.entity_id
            for state in hass.states.async_all("person")
            if user_id and state.attributes.get("user_id") == user_id
        ),
        None,
    )


def _songs(
    hass: HomeAssistant, entry: ConfigEntry, group: ConfigSubentry, songs: str
) -> None:
    if songs != group.data.get(CONF_PATTERNS, ""):
        hass.config_entries.async_update_subentry(
            entry, group, data={**group.data, CONF_PATTERNS: songs}
        )


async def rate(hass: HomeAssistant, call: ServiceCall) -> None:
    player, feeling = call.data[ATTR_ENTITY_ID], call.data[CONF_FEELING]
    entry = next(
        (
            e
            for e in hass.config_entries.async_loaded_entries(DOMAIN)
            if player in e.options.get(CONF_PLAYERS, [])
        ),
        None,
    )
    if entry is None:
        raise ServiceValidationError(
            f"{player} is not a player that Love it or Loathe it watches"
        )

    person = call.data.get(CONF_PERSON) or _person_of(hass, call.context.user_id)
    if person is None:
        raise ServiceValidationError(
            "Can't tell whose song this is: this login belongs to no person. "
            "Name the person in the action."
        )

    state = hass.states.get(player)
    title = str(state.attributes.get("media_title") or "") if state else ""
    artist = str(state.attributes.get("media_artist") or "") if state else ""
    if not title:
        raise ServiceValidationError(f"{player} is not playing anything with a title")

    theirs = {
        home(group.data): group
        for group in entry.subentries.values()
        if group.subentry_type == GROUP and group.data.get(CONF_PERSON) == person
    }
    known = hass.states.get(person)
    if feeling not in theirs and (known is None or known.domain != "person"):
        raise ServiceValidationError(f"{person} is not a person in Home Assistant")

    # Out of their other list first, so the last save has the song where it belongs.
    other = theirs.get(LOVE if feeling == LOATHE else LOATHE)
    if other is not None:
        was = other.data.get(CONF_PATTERNS, "")
        _songs(hass, entry, other, without_song(was, title, artist))

    group = theirs.get(feeling)
    if group is not None:
        was = group.data.get(CONF_PATTERNS, "")
        _songs(hass, entry, group, with_song(was, title, artist))
    else:
        # Their first of this feeling: its group is made, with the usual actions.
        assert known is not None
        group = ConfigSubentry(
            data=MappingProxyType(
                {
                    CONF_FEELING: feeling,
                    CONF_PATTERNS: with_song("", title, artist),
                    CONF_PERSON: person,
                    CONF_REPEATS: dict(DEFAULT_REPEATS),
                    LOVE: dict(DEFAULT_ACTS[LOVE]),
                    LOATHE: dict(DEFAULT_ACTS[LOATHE]),
                }
            ),
            subentry_type=GROUP,
            title=f"{'Loved' if feeling == LOVE else 'Loathed'} by {known.name}",
            unique_id=None,
        )
        hass.config_entries.async_add_subentry(entry, group)
        _LOGGER.info("%s made in %s, at %s's first", group.title, entry.title, person)
    _LOGGER.info(
        "%s: %r by %r is now in %s (%s) for %s",
        player,
        title,
        artist,
        group.title,
        feeling,
        person,
    )
