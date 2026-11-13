"""The Love it or Loathe it page's end in Home Assistant (the page is in the Casa Mia
app's admin panel). The page keeps nothing of its own: it shows the entries, groups and
stations Home Assistant holds, and changes them through the websocket commands here,
admins only. So the page and Home Assistant's own screens edit the one thing, and a save
from either is refused for the same reasons (config_flow.py's checks).

One feed, VIEW, carries everything the page shows and is pushed at each change: a save
from anywhere, a player's new track, a match, a player going to another station or coming
back. An entry that isn't running says so in it, so the page never shows what a player
"is playing" from a watcher that has stopped.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from types import MappingProxyType
from typing import Any

import voluptuous as vol
from homeassistant.auth import EVENT_USER_ADDED, EVENT_USER_REMOVED, EVENT_USER_UPDATED
from homeassistant.components import websocket_api
from homeassistant.config_entries import (
    SIGNAL_CONFIG_ENTRY_CHANGED,
    ConfigEntry,
    ConfigEntryChange,
    ConfigEntryState,
    ConfigSubentry,
)
from homeassistant.const import CONF_NAME
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.translation import async_get_translations

from . import trail
from .config_flow import group_errors, taken
from .const import (
    ACTIONS,
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_DELAY,
    CONF_ENABLED,
    CONF_FEELING,
    CONF_HOURS,
    CONF_MEDIA,
    CONF_MINUTES,
    CONF_ORDER,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_RATERS,
    CONF_REPEATS,
    CONF_SCREENS,
    CONF_TIMES,
    DEFAULT_REPEATS,
    DOMAIN,
    GROUP,
    IGNORE,
    LOATHE,
    LOVE,
    STATION,
)
from .engine import ID, TYPE, Engine, ordered
from .pure import felt, home, libraries

_LOGGER = logging.getLogger(__name__)
VIEW = f"{DOMAIN}/view"
FEEDS = f"{DOMAIN}_feeds"  # hass.data: what each open feed is sent by
USERS = f"{DOMAIN}_users"  # hass.data: the logins, by name
LIBRARIES = f"{DOMAIN}_libraries"  # hass.data: the shipped lists, read once
# A group or station's subentry id: "id" in the view, and this in a command (whose own
# "id" is the websocket message's).
SUBENTRY = "subentry_id"


class Refused(Exception):
    """A change the page asked for that isn't made: why, as the place of the words in
    translations/en.json ("config.error.player_taken"), or as the words themselves."""


async def setup(hass: HomeAssistant) -> None:
    hass.data[FEEDS] = []
    hass.data[LIBRARIES] = await hass.async_add_executor_job(libraries)
    websocket_api.async_register_command(hass, _ws_view)

    # An entry added, removed, saved, started or stopped, as Home Assistant says it of
    # every integration's: the page is told of this one's.
    @callback
    def entry_changed(_change: ConfigEntryChange, entry: ConfigEntry) -> None:
        if entry.domain == DOMAIN:
            tell(hass)

    async_dispatcher_connect(hass, SIGNAL_CONFIG_ENTRY_CHANGED, entry_changed)
    await _users(hass)

    async def users_changed(_event: Event) -> None:
        await _users(hass)

    for changed in (EVENT_USER_ADDED, EVENT_USER_REMOVED, EVENT_USER_UPDATED):
        hass.bus.async_listen(changed, users_changed)
    # And of each line added to what happened (trail.py).
    async_dispatcher_connect(hass, trail.NOTED, callback(lambda: tell(hass)))
    for command in _CHANGES:
        websocket_api.async_register_command(hass, command)


async def _users(hass: HomeAssistant) -> None:
    """Home Assistant's logins by name, kept for the view (which is built without
    waiting) and read again when one is added, removed or changed."""
    hass.data[USERS] = sorted(
        (
            {"id": user.id, "name": user.name or user.id}
            for user in await hass.auth.async_get_users()
            if not user.system_generated and user.is_active
        ),
        key=lambda user: user["name"].lower(),
    )
    tell(hass)


@callback
def tell(hass: HomeAssistant) -> None:
    """Something the page shows has changed: every open feed is sent the view."""
    for send in list(hass.data[FEEDS]):
        send()


# --- the view ---------------------------------------------------------------------


def _view(hass: HomeAssistant) -> dict[str, Any]:
    def named(domain: str) -> list[dict[str, str]]:
        return [{"entity_id": s.entity_id, "name": s.name} for s in found[domain]]

    found = {d: hass.states.async_all(d) for d in ("media_player", "person")}
    return {
        "entries": [
            _entry(hass, entry) for entry in hass.config_entries.async_entries(DOMAIN)
        ],
        "libraries": hass.data[LIBRARIES],
        # Every player and person there is, to choose from.
        "players": named("media_player"),
        "people": named("person"),
        # The logins there are, for the screens that may rate for someone.
        "users": hass.data[USERS],
    }


def _entry(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    running = entry.state is ConfigEntryState.LOADED
    engine: Engine | None = entry.runtime_data if running else None
    subentries = ordered(entry)
    players = entry.options.get(CONF_PLAYERS, [])
    return {
        "id": entry.entry_id,
        "title": entry.title,
        "running": running,
        "enabled": entry.options.get(CONF_ENABLED, True),
        # What happened, the newest first (trail.py).
        "trail": list(reversed(trail.lines(hass, entry))),
        "players": players,
        "delay": entry.options.get(CONF_DELAY, 0),
        # Who may rate: the people, and the logins that may rate for them.
        CONF_RATERS: entry.options.get(CONF_RATERS, []),
        CONF_SCREENS: entry.options.get(CONF_SCREENS, []),
        "groups": [
            # `home`: love or loathe, which list it is even while ignored.
            {
                "id": s.subentry_id,
                CONF_NAME: s.title,
                **s.data,
                "home": home(s.data),
            }
            for s in subentries
            if s.subentry_type == GROUP
        ],
        "stations": [
            {"id": s.subentry_id, CONF_NAME: s.title, **s.data[CONF_MEDIA]}
            for s in subentries
            if s.subentry_type == STATION
        ],
        "playing": {e: _playing(hass, engine, e) for e in players}
        if engine and engine.enabled
        else {},
        "away": engine.away if engine else {},
        "last": engine.last if engine else None,
    }


def _playing(hass: HomeAssistant, engine: Engine, entity: str) -> dict[str, Any]:
    """What a watched player is doing: its state, its track, the group that has the
    track, and what it says it is playing (for making a station of it)."""
    state = hass.states.get(entity)
    if state is None:
        return {"state": None}
    title = str(state.attributes.get("media_title") or "")
    artist = str(state.attributes.get("media_artist") or "")
    group, repeats = engine.judge(title, artist)
    return {
        "state": state.state,
        "title": title,
        "artist": artist,
        "group": group.id if group else None,
        "repeats": repeats,  # how often it has been played, when that is why
        ID: state.attributes.get(ID),
        TYPE: state.attributes.get(TYPE),
    }


@websocket_api.websocket_command({vol.Required("type"): VIEW})
@websocket_api.require_admin
@callback
def _ws_view(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Everything the page shows, now and again at each change."""
    feeds: list[Callable[[], None]] = hass.data[FEEDS]

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], _view(hass)))

    feeds.append(send)
    connection.subscriptions[msg["id"]] = lambda: feeds.remove(send)
    connection.send_result(msg["id"])
    send()


# --- the changes ------------------------------------------------------------------

_CHANGES: list[Any] = []
_ACT = {
    vol.Required(CONF_ACTION): vol.In(ACTIONS),
    vol.Required(CONF_AMOUNT): vol.All(vol.Coerce(float), vol.Range(-100, 200)),
    vol.Required(CONF_MINUTES): vol.All(vol.Coerce(float), vol.Range(1, 120)),
}
_NAME = vol.All(str, vol.Strip, vol.Length(min=1))


def _change(name: str, fields: dict[Any, Any]) -> Callable[[Any], Any]:
    """Makes a websocket command of a function that changes one entry: it is given the
    entry and the message, answers what it did in words for the trail (trail.py), and
    raises Refused. Every change is logged here, with its
    result; each then reaches the page by the feed, as a change made anywhere does."""

    def wrap(change: Callable[[HomeAssistant, ConfigEntry, dict[str, Any]], str]):
        @websocket_api.websocket_command(
            {
                vol.Required("type"): f"{DOMAIN}/{name}",
                vol.Required("entry_id"): str,
                **fields,
            }
        )
        @websocket_api.require_admin
        @websocket_api.async_response
        async def command(
            hass: HomeAssistant,
            connection: websocket_api.ActiveConnection,
            msg: dict[str, Any],
        ) -> None:
            entry = hass.config_entries.async_get_entry(msg["entry_id"])
            try:
                if entry is None or entry.domain != DOMAIN:
                    raise Refused("That entry is no longer in Home Assistant.")
                said = change(hass, entry, msg)
            except Refused as exc:
                why = await _words(hass, str(exc))
                _LOGGER.warning("page: %s refused: %s", name, why)
                connection.send_error(msg["id"], "refused", why)
                return
            _LOGGER.info("page: %s in %s", name, entry.title)
            trail.note(hass, entry, trail.EDIT, f"Changed from the page: {said}")
            connection.send_result(msg["id"])

        _CHANGES.append(command)
        return command

    return wrap


async def _words(hass: HomeAssistant, why: str) -> str:
    """A refusal in words: the same ones Home Assistant's own form shows for it."""
    known = await async_get_translations(
        hass, hass.config.language, why.split(".")[0], [DOMAIN]
    )
    return known.get(f"component.{DOMAIN}.{why}", why)


def _save(
    hass: HomeAssistant,
    entry: ConfigEntry,
    kind: str,
    msg: dict[str, Any],
    data: Callable[[ConfigSubentry | None], dict[str, Any]],
) -> None:
    """Add a group or a station, or change the one the message names. `data` is given
    the one being changed, if any."""
    if SUBENTRY not in msg:
        new = ConfigSubentry(
            data=MappingProxyType(data(None)),
            subentry_type=kind,
            title=msg[CONF_NAME],
            unique_id=None,
        )
        hass.config_entries.async_add_subentry(entry, new)
        return
    hass.config_entries.async_update_subentry(
        entry,
        was := _subentry(entry, msg[SUBENTRY], kind),
        title=msg[CONF_NAME],
        data=data(was),
    )


def _subentry(entry: ConfigEntry, id: str, kind: str | None = None) -> ConfigSubentry:
    found = entry.subentries.get(id)
    if found is None or kind not in (None, found.subentry_type):
        raise Refused("That one is no longer in Home Assistant.")
    return found


@_change(
    "save_group",
    {
        vol.Optional(SUBENTRY): str,
        vol.Required(CONF_NAME): _NAME,
        vol.Required(CONF_FEELING): vol.In((LOVE, LOATHE, IGNORE)),
        vol.Optional(CONF_PATTERNS, default=""): str,
        vol.Optional(CONF_PERSON, default=""): str,
        vol.Optional(CONF_REPEATS, default=lambda: dict(DEFAULT_REPEATS)): {
            vol.Required(CONF_TIMES): vol.All(vol.Coerce(int), vol.Range(0, 20)),
            vol.Required(CONF_HOURS): vol.All(vol.Coerce(float), vol.Range(1, 48)),
        },
        vol.Required(LOVE): _ACT,
        vol.Required(LOATHE): _ACT,
    },
)
def _save_group(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    group = {
        key: msg[key]
        for key in (
            CONF_FEELING,
            CONF_PATTERNS,
            CONF_PERSON,
            CONF_REPEATS,
            LOVE,
            LOATHE,
        )
    }
    if not group[CONF_PERSON]:
        del group[CONF_PERSON]  # as Home Assistant's form leaves it out
    for error in group_errors(entry, group).values():
        raise Refused(f"config_subentries.group.error.{error}")
    _save(hass, entry, GROUP, msg, lambda was: felt(was.data if was else {}, group))
    return f"the group {msg[CONF_NAME]} saved, {group[CONF_FEELING]}"


@_change(
    "save_station",
    {
        vol.Optional(SUBENTRY): str,
        vol.Required(CONF_NAME): _NAME,
        vol.Required(ID): _NAME,
        vol.Required(TYPE): _NAME,
    },
)
def _save_station(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    media = {CONF_MEDIA: {ID: msg[ID], TYPE: msg[TYPE]}}
    _save(hass, entry, STATION, msg, lambda _was: media)
    return f"the station {msg[CONF_NAME]} saved"


@_change("remove", {vol.Required(SUBENTRY): str})
def _remove(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    gone = _subentry(entry, msg[SUBENTRY])
    hass.config_entries.async_remove_subentry(entry, msg[SUBENTRY])
    return f"the {gone.subentry_type} {gone.title} removed"


@_change("order", {vol.Required(CONF_ORDER): [str]})
def _order(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    """The groups and the stations, in the order given: which group has a song that is
    in two, and which station is tried first."""
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, CONF_ORDER: msg[CONF_ORDER]}
    )
    return "the order of the groups or the stations"


@_change(
    "save_entry",
    {
        vol.Required(CONF_NAME): _NAME,
        vol.Required(CONF_PLAYERS): vol.All([str], vol.Length(min=1)),
        vol.Required(CONF_DELAY): vol.All(vol.Coerce(float), vol.Range(0, 60)),
        vol.Required(CONF_RATERS): [str],
        vol.Required(CONF_SCREENS): [str],
    },
)
def _save_entry(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    if taken(hass, msg[CONF_PLAYERS], entry.entry_id):
        raise Refused("config.error.player_taken")
    kept = (CONF_PLAYERS, CONF_DELAY, CONF_RATERS, CONF_SCREENS)
    options = {key: msg[key] for key in kept}
    hass.config_entries.async_update_entry(
        entry, title=msg[CONF_NAME], options={**entry.options, **options}
    )
    return "its name, players, delay or who may rate"


@_change("enable", {vol.Required(CONF_ENABLED): bool})
def _enable(hass: HomeAssistant, entry: ConfigEntry, msg: dict[str, Any]) -> str:
    """Whether the entry watches its players at all: what its switch does (switch.py)."""
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, CONF_ENABLED: msg[CONF_ENABLED]}
    )
    return "switched on" if msg[CONF_ENABLED] else "switched off"
