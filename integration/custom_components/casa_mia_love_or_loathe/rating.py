"""The rate action: the song a player is playing, added to a person's loved or loathed
group, and taken out of their other one. Buttons on a dashboard call it; whose song it
is comes from the login that pressed, or from the person named in the call (a wall
tablet is signed in as nobody in particular).

The feeling `clear` takes a rating away: the song comes out of both their lists.

A person's loved group is the group that belongs to them and is set to Love, or was
before it was set to Ignore; the same for loathed. One they don't have yet is made at
their first rating. Only a person gets one: a login that belongs to no person (a wall
tablet's) is refused unless its button names the person, so a screen can't fill the
entry with groups of its own.

Who may rate is the entry's to say (`refused`): only the people it lists, and only a
login it lists may rate for someone other than itself. Both lists start empty."""

from __future__ import annotations

import logging
from types import MappingProxyType

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigSubentry
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from . import trail
from .const import (
    CLEAR,
    CONF_FEELING,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_RATERS,
    CONF_REPEATS,
    CONF_SCREENS,
    DEFAULT_ACTS,
    DEFAULT_REPEATS,
    DOMAIN,
    GROUP,
    LOATHE,
    LOVE,
    RATED_EVENT,
)
from .pure import home, with_song, without_song

_LOGGER = logging.getLogger(__name__)
SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(CONF_FEELING): vol.In([LOVE, LOATHE, CLEAR]),
        vol.Optional(CONF_PERSON): cv.entity_id,
    }
)


def person_of(hass: HomeAssistant, user_id: str | None) -> str | None:
    """The person a login belongs to."""
    return next(
        (
            state.entity_id
            for state in hass.states.async_all("person")
            if user_id and state.attributes.get("user_id") == user_id
        ),
        None,
    )


def entry_of(hass: HomeAssistant, player: str) -> ConfigEntry | None:
    """The running entry that watches a player."""
    return next(
        (
            e
            for e in hass.config_entries.async_loaded_entries(DOMAIN)
            if player in e.options.get(CONF_PLAYERS, [])
        ),
        None,
    )


def refused(
    entry: ConfigEntry,
    person: str | None,
    own: str | None,
    user_id: str | None,
    admin: bool,
) -> str | None:
    """Why a rating may not be made in this entry, or None when it may. `person`: whose
    song it would be; `own`: the person the login belongs to; `user_id`: the login, None
    for a call with none behind it (an automation); `admin`: it is an administrator's."""
    if person is None:
        return (
            "Can't tell whose song this is: this login belongs to no person. "
            "Name the person in the action."
        )
    if person != own and not (
        admin or user_id is None or user_id in entry.options.get(CONF_SCREENS, [])
    ):
        return (
            "This login may not rate for someone else. An admin can allow it in "
            f"{entry.title}'s players: Screens that may rate for them."
        )
    if person not in entry.options.get(CONF_RATERS, []):
        return (
            f"{person} is not one of the people who may rate in {entry.title}. "
            "An admin can add them in its players: Who may rate."
        )
    return None


def _songs(
    hass: HomeAssistant, entry: ConfigEntry, group: ConfigSubentry, songs: str
) -> None:
    if songs != group.data.get(CONF_PATTERNS, ""):
        hass.config_entries.async_update_subentry(
            entry, group, data={**group.data, CONF_PATTERNS: songs}
        )


async def rate(hass: HomeAssistant, call: ServiceCall) -> None:
    player, feeling = call.data[ATTR_ENTITY_ID], call.data[CONF_FEELING]
    entry = entry_of(hass, player)
    if entry is None:
        raise ServiceValidationError(
            f"{player} is not a player that Love it or Loathe it watches"
        )

    login = call.context.user_id
    user = await hass.auth.async_get_user(login) if login else None
    own = person_of(hass, login)
    person = call.data.get(CONF_PERSON) or own
    why = refused(entry, person, own, login, user is not None and user.is_admin)
    if why:
        _LOGGER.warning("%s: rating refused: %s", player, why)
        raise ServiceValidationError(why)
    assert person is not None

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
    by = f" by {artist}" if artist else ""
    known = hass.states.get(person)

    def told(feeling: str) -> None:
        """Say it on the bus."""
        hass.bus.async_fire(
            RATED_EVENT,
            {
                ATTR_ENTITY_ID: player,
                CONF_PERSON: person,
                "name": known.name if known else person,
                CONF_FEELING: feeling,
                "title": title,
                "artist": artist,
            },
        )

    if feeling == CLEAR:
        # No rating at all: out of both their lists, and nothing is made.
        for group in theirs.values():
            was = group.data.get(CONF_PATTERNS, "")
            _songs(hass, entry, group, without_song(was, title, artist))
        _LOGGER.info(
            "%s: %r by %r is no longer rated by %s", player, title, artist, person
        )
        trail.note(
            hass, entry, trail.EDIT, f"{person} no longer rates {title}{by}", player
        )
        told(CLEAR)
        return

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
    trail.note(
        hass,
        entry,
        trail.EDIT,
        f"{known.name if known else person} rated {title}{by}: now in {group.title}",
        player,
    )
    told(feeling)
