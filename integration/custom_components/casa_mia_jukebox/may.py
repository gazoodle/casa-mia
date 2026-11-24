"""Who is asking, and what they may do while a party is on.

Home Assistant doesn't limit what a login without administrator rights may ask for, so
Jukebox decides for itself, where a change is carried out (`feed.do`) and not on the
page: a guest at a wall tablet must not be able to end a party, or empty its queue, and
then carry on from their own phone.

- A **host** may start, change and end a party, and change the music during one: an
  administrator, a login on the options' "Who may run a party", and anything with no
  login at all (an automation).
- A **screen** is a login on the options' "Screens that may be opened up at a party",
  such as a wall tablet's. During a party it may change the music only while a host has
  opened the screens up (`Party.open`), and never the party itself.
- Anyone else, a guest's login among them, can only look while a party is on.

With no party, everyone may do everything but start one, and but keep or delete a
playlist: saving the queue as a playlist and deleting one are a host's at any time
(owner, 2026-11-24), since a deleted playlist can't be put back.
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
    }
)


class Who(NamedTuple):
    """Whoever asked for something: their name for the log, and their part."""

    name: str
    role: str

    def __str__(self) -> str:
        return self.name


def who(hass: HomeAssistant, user: User | None) -> Who:
    """The asker, from the login that asked; none is an automation."""
    if user is None:
        return Who("An automation", HOST)
    name = user.name or "someone"
    if user.is_admin:
        return Who(name, HOST)
    for entry in hass.config_entries.async_entries(DOMAIN):
        if user.id in entry.options.get(CONF_HOSTS, []):
            return Who(name, HOST)
        if user.id in entry.options.get(CONF_SCREENS, []):
            return Who(name, SCREEN)
    return Who(name, OTHER)


def refusal(asker: Who, action: str, party_on: bool, opened: bool) -> str | None:
    """Why this asker may not do this now, in words for the page; none when they may."""
    if asker.role == HOST:
        return None
    if action in PARTY:
        return "Only the people who may run a party can start, change or end one"
    if action in PLAYLISTS:
        return "Only the people who look after the music can save or change a playlist"
    if party_on and not (asker.role == SCREEN and opened):
        return (
            "A party is on in these rooms, so the music can't be changed from this "
            "screen. Ask whoever is running the party."
        )
    return None
