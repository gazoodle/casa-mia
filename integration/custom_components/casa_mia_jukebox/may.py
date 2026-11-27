"""Who is asking, and what they may do while a party is on.

Home Assistant doesn't limit what a login without administrator rights may ask for, so
Jukebox decides for itself, where a change is carried out (`feed.do`) and not on the
page: a guest at a wall tablet must not be able to end a party, or empty its queue, and
then carry on from their own phone.

- A **host** may start, change and end a party, and change the music during one: an
  administrator, a login on the options' "Who may run a party", and anything with no
  login at all (an automation).
- A **screen** is a login on the options' "The house's own screens", such as a wall
  tablet's. During a party it may change the music only while a host has opened the
  screens up (`Party.open`), and never the party itself.
- Anyone else, a guest's login among them, can only look while a party is on.

With no party, everyone may do everything but start one, and but change a playlist.
Saving, changing and deleting a playlist are a host's at any time, since a deleted
playlist can't be put back; and a screen's while no party is on anywhere in the house
(`curates`). Why a screen's (owner, 2026-11-24): a playlist is put together by the
household sitting at a tablet, which is easier than on a phone, and it was hosts only
before that. Why not during a party: that is when guests are at the tablets. A playlist
is the whole house's, so a party in any room counts.
"""

from __future__ import annotations

from typing import NamedTuple

from homeassistant.auth.models import User
from homeassistant.core import HomeAssistant

from .const import CONF_HOSTS, CONF_SCREENS, DOMAIN

HOST, SCREEN, OTHER = "host", "screen", "other"
# What changes a party itself, as `feed.ACTIONS` names it.
PARTY = frozenset({"party", "party_open"})
# What makes or deletes a Sonos playlist.
PLAYLISTS = frozenset(
    {
        "queue_save",
        "playlist_delete",
        "playlist_move",
        "playlist_remove",
        "playlist_add",
        "playlist_send",
        "playlist_copy",
        "playlist_new",
        "playlist_sort",
        "playlist_unsort",
        "playlist_dedupe",
    }
)


class Who(NamedTuple):
    """Whoever asked for something: their name for the log, their part, and whether
    they are one of Home Assistant's administrators."""

    name: str
    role: str
    admin: bool = False

    def __str__(self) -> str:
        return self.name


def who(hass: HomeAssistant, user: User | None) -> Who:
    """The asker, from the login that asked; none is an automation."""
    if user is None:
        return Who("An automation", HOST)
    name = user.name or "someone"
    if user.is_admin:
        return Who(name, HOST, admin=True)
    for entry in hass.config_entries.async_entries(DOMAIN):
        if user.id in entry.options.get(CONF_HOSTS, []):
            return Who(name, HOST)
        if user.id in entry.options.get(CONF_SCREENS, []):
            return Who(name, SCREEN)
    return Who(name, OTHER)


def curates(asker: Who, partying: bool) -> bool:
    """Whether this asker may save, change and delete playlists now. `partying` is a
    party being on in any room of the house."""
    return asker.role == HOST or (asker.role == SCREEN and not partying)


def refusal(
    asker: Who, action: str, party_on: bool, opened: bool, partying: bool
) -> str | None:
    """Why this asker may not do this now, in words for the page; none when they may.
    `party_on` is a party in the rooms asked about; `partying`, one anywhere."""
    if asker.role == HOST:
        return None
    if action in PARTY:
        return "Only the people who may run a party can start, change or end one"
    if action in PLAYLISTS:
        if curates(asker, partying):
            return None
        if asker.role == SCREEN:
            return (
                "A party is on, so playlists can't be changed from this screen until "
                "it ends"
            )
        return (
            "Only the people who look after the music, and the house's own screens, "
            "can save or change a playlist"
        )
    if party_on and not (asker.role == SCREEN and opened):
        return (
            "A party is on in these rooms, so the music can't be changed from this "
            "screen. Ask whoever is running the party."
        )
    return None
