"""Set-up: a name and the media players to watch, as many as wanted; more entries can be
added for players that want different groups or stations. Then, on the integration's
page, a subentry for each group of songs and each station to switch to, added, changed
and deleted with Home Assistant's own screens.

A new group starts from a shipped list or from nothing. A shipped list is put into the
group's Songs box, and from then on its songs are the group's own."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    SOURCE_RECONFIGURE,
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    ConfigSubentryFlow,
    OptionsFlow,
    SubentryFlowResult,
)
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    MediaSelector,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    TextSelector,
    TextSelectorConfig,
)

from .const import (
    ACTIONS,
    CONF_ACTION,
    CONF_AMOUNT,
    CONF_DELAY,
    CONF_FEELING,
    CONF_HOURS,
    CONF_LIBRARY,
    CONF_MEDIA,
    CONF_MINUTES,
    CONF_PATTERNS,
    CONF_PERSON,
    CONF_PLAYERS,
    CONF_RATERS,
    CONF_REPEATS,
    CONF_SCREENS,
    CONF_TIMES,
    DEFAULT_ACTS,
    DEFAULT_REPEATS,
    DOMAIN,
    GROUP,
    IGNORE,
    LOATHE,
    LOVE,
    STATION,
    SWITCH,
    TITLE,
)
from .pure import felt, libraries, parse

PLAYERS = vol.Schema(
    {
        vol.Required(CONF_PLAYERS): EntitySelector(
            EntitySelectorConfig(domain="media_player", multiple=True)
        ),
        vol.Required(CONF_DELAY, default=0): NumberSelector(
            NumberSelectorConfig(
                min=0,
                max=60,
                step=1,
                unit_of_measurement="s",
                mode=NumberSelectorMode.BOX,
            )
        ),
    }
)


async def _raters(hass: HomeAssistant) -> dict[Any, Any]:
    """The two lists of who may rate, for the options form: people, and the logins that
    may rate for them (Home Assistant's own users, by name)."""
    users = [
        SelectOptionDict(value=user.id, label=user.name or user.id)
        for user in await hass.auth.async_get_users()
        if not user.system_generated and user.is_active
    ]
    return {
        vol.Optional(CONF_RATERS): EntitySelector(
            EntitySelectorConfig(domain="person", multiple=True)
        ),
        vol.Optional(CONF_SCREENS): SelectSelector(
            SelectSelectorConfig(options=users, multiple=True)
        ),
    }


def taken(hass: HomeAssistant, players: list[str], own: str = "") -> bool:
    """Whether another entry already watches one of these players: two entries acting
    on one player would undo each other's work."""
    return any(
        set(players) & set(entry.options.get(CONF_PLAYERS, []))
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.entry_id != own
    )


def group_errors(entry: ConfigEntry, group: dict[str, Any]) -> dict[str, str]:
    """What is wrong with a group about to be saved, as its form's errors. The page's
    save (admin.py) is refused for the same."""
    _good, bad = parse(group.get(CONF_PATTERNS, "").splitlines())
    if bad:
        return {CONF_PATTERNS: "bad_pattern"}
    stations = [s for s in entry.subentries.values() if s.subentry_type == STATION]
    switches = any(group[f][CONF_ACTION] == SWITCH for f in (LOVE, LOATHE))
    if switches and not stations:
        return {"base": "no_stations"}
    return {}


class LoveOrLoatheConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if not taken(self.hass, user_input[CONF_PLAYERS]):
                title = user_input.pop(CONF_NAME)
                return self.async_create_entry(title=title, data={}, options=user_input)
            errors[CONF_PLAYERS] = "player_taken"
        named = vol.Schema({vol.Required(CONF_NAME, default=TITLE): str}).extend(
            PLAYERS.schema
        )
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(named, user_input),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return LoveOrLoatheOptionsFlow()

    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        return {GROUP: GroupFlow, STATION: StationFlow}


class LoveOrLoatheOptionsFlow(OptionsFlow):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            own = self.config_entry.entry_id
            if not taken(self.hass, user_input[CONF_PLAYERS], own):
                # With what the form doesn't show: the order the page gave (admin.py).
                # A list of who may rate that was emptied comes back as no key at all.
                emptied = {CONF_RATERS: [], CONF_SCREENS: []}
                return self.async_create_entry(
                    data={**self.config_entry.options, **emptied, **user_input}
                )
            errors[CONF_PLAYERS] = "player_taken"
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                PLAYERS.extend(await _raters(self.hass)),
                user_input or self.config_entry.options,
            ),
            errors=errors,
        )


class _NamedFlow(ConfigSubentryFlow):
    """A subentry made of a name (its title) and one form, the same form to add it and
    to change it, shown at the step FORM."""

    FORM = "user"
    # What a new one's form starts with.
    start: dict[str, Any] | None = None

    async def _schema(self) -> vol.Schema:
        raise NotImplementedError

    def _errors(self, user_input: dict[str, Any]) -> dict[str, str]:
        return {}

    def _kept(self, user_input: dict[str, Any]) -> dict[str, Any]:
        """The subentry's data: the form without the name."""
        return {k: v for k, v in user_input.items() if k != CONF_NAME}

    async def _form(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        changing = self.source == SOURCE_RECONFIGURE
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = self._errors(user_input)
            if not errors:
                data = self._kept(user_input)
                title = user_input[CONF_NAME]
                if not changing:
                    return self.async_create_entry(title=title, data=data)
                return self.async_update_and_abort(
                    self._get_entry(),
                    self._get_reconfigure_subentry(),
                    title=title,
                    data=data,
                )

        shown = user_input or self.start
        if shown is None and changing:
            subentry = self._get_reconfigure_subentry()
            shown = {CONF_NAME: subentry.title, **subentry.data}
        return self.async_show_form(
            step_id=self.FORM,
            data_schema=self.add_suggested_values_to_schema(
                await self._schema(), shown
            ),
            errors=errors,
        )

    async_step_user = async_step_reconfigure = _form


class GroupFlow(_NamedFlow):
    FORM = "songs"
    EMPTY = "empty"

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """What a new group starts from: nothing, or a shipped list, whose songs then
        fill the form's Songs box to be added to and cut like any others."""
        shipped = await self.hass.async_add_executor_job(libraries)
        if user_input is not None:
            chosen = shipped.get(user_input[CONF_LIBRARY])
            if chosen:
                self.start = {
                    CONF_NAME: chosen["name"],
                    CONF_PATTERNS: "\n".join(chosen["patterns"]),
                }
            return await self.async_step_songs()

        options = [SelectOptionDict(value=self.EMPTY, label="An empty list")] + [
            SelectOptionDict(value=key, label=str(lib["name"]))
            for key, lib in shipped.items()
        ]
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_LIBRARY, default=self.EMPTY): SelectSelector(
                        SelectSelectorConfig(options=options)
                    )
                }
            ),
        )

    async_step_songs = _NamedFlow._form

    async def _schema(self) -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_NAME): str,
                vol.Required(CONF_FEELING, default=LOATHE): SelectSelector(
                    SelectSelectorConfig(
                        options=[LOVE, LOATHE, IGNORE], translation_key=CONF_FEELING
                    )
                ),
                vol.Optional(CONF_PATTERNS): TextSelector(
                    TextSelectorConfig(multiline=True)
                ),
                vol.Optional(CONF_PERSON): EntitySelector(
                    EntitySelectorConfig(domain="person")
                ),
                vol.Optional(CONF_REPEATS): _REPEATS,
                vol.Required(LOVE): _act_section(LOVE),
                vol.Required(LOATHE): _act_section(LOATHE),
            }
        )

    def _errors(self, user_input: dict[str, Any]) -> dict[str, str]:
        return group_errors(self._get_entry(), user_input)

    def _kept(self, user_input: dict[str, Any]) -> dict[str, Any]:
        # Whose list an ignored group still is isn't on the form.
        changing = self.source == SOURCE_RECONFIGURE
        was = self._get_reconfigure_subentry().data if changing else {}
        return felt(was, super()._kept(user_input))


def _number(least: float, most: float, unit: str = "") -> NumberSelector:
    config = NumberSelectorConfig(
        min=least, max=most, step=1, mode=NumberSelectorMode.BOX
    )
    if unit:
        config["unit_of_measurement"] = unit
    return NumberSelector(config)


# Any song heard so many times in so many hours is the group's too. The most hours is
# how long the plays are remembered (pure.KEPT).
_REPEATS = section(
    vol.Schema(
        {
            vol.Required(CONF_TIMES, default=DEFAULT_REPEATS[CONF_TIMES]): _number(
                0, 20
            ),
            vol.Required(CONF_HOURS, default=DEFAULT_REPEATS[CONF_HOURS]): _number(
                1, 48, "h"
            ),
        }
    ),
    {"collapsed": True},
)


def _act_section(feeling: str) -> section:
    """What to do while the group is loved, or loathed: one part of its form."""
    usual = DEFAULT_ACTS[feeling]
    return section(
        vol.Schema(
            {
                vol.Required(CONF_ACTION, default=usual[CONF_ACTION]): SelectSelector(
                    SelectSelectorConfig(
                        options=list(ACTIONS), translation_key=CONF_ACTION
                    )
                ),
                vol.Required(CONF_AMOUNT, default=usual[CONF_AMOUNT]): NumberSelector(
                    NumberSelectorConfig(
                        min=-100,
                        max=200,
                        step=5,
                        unit_of_measurement="%",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
                vol.Required(CONF_MINUTES, default=usual[CONF_MINUTES]): NumberSelector(
                    NumberSelectorConfig(
                        min=1,
                        max=120,
                        step=1,
                        unit_of_measurement="min",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
            }
        ),
        {"collapsed": False},
    )


class StationFlow(_NamedFlow):
    async def _schema(self) -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_NAME): str,
                # Home Assistant's media browser. It asks for a player to browse on;
                # only what was chosen is kept (_kept).
                vol.Required(CONF_MEDIA): MediaSelector(),
            }
        )

    def _kept(self, user_input: dict[str, Any]) -> dict[str, Any]:
        # Just what media_player.play_media takes, for whichever player.
        media = user_input[CONF_MEDIA]
        return {
            CONF_MEDIA: {
                key: media[key] for key in ("media_content_id", "media_content_type")
            }
        }
