"""Set-up: which media players to watch. Then, on the integration's own page, a subentry
for each group of songs and each station to switch to, added, changed and deleted with
Home Assistant's own screens."""

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
from homeassistant.core import callback
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
    CONF_KIND,
    CONF_LIBRARY,
    CONF_MEDIA,
    CONF_MINUTES,
    CONF_PATTERNS,
    CONF_PLAYERS,
    DOMAIN,
    GROUP,
    LOATHE,
    LOVE,
    STATION,
    SWITCH,
    TITLE,
)
from .pure import libraries, parse

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


class LoveOrLoatheConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={}, options=user_input)
        return self.async_show_form(step_id="user", data_schema=PLAYERS)

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
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                PLAYERS, self.config_entry.options
            ),
        )


class _NamedFlow(ConfigSubentryFlow):
    """A subentry made of a name (its title) and one form, the same form to add it and
    to change it."""

    async def _schema(self) -> vol.Schema:
        raise NotImplementedError

    def _errors(self, user_input: dict[str, Any]) -> dict[str, str]:
        return {}

    def _kept(self, user_input: dict[str, Any]) -> dict[str, Any]:
        """The subentry's data: the form without the name."""
        return {k: v for k, v in user_input.items() if k != CONF_NAME}

    async def async_step_user(
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

        shown = user_input
        if shown is None and changing:
            subentry = self._get_reconfigure_subentry()
            shown = {CONF_NAME: subentry.title, **subentry.data}
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(
                await self._schema(), shown
            ),
            errors=errors,
        )

    async_step_reconfigure = async_step_user


class GroupFlow(_NamedFlow):
    async def _schema(self) -> vol.Schema:
        shipped = await self.hass.async_add_executor_job(libraries)
        return vol.Schema(
            {
                vol.Required(CONF_NAME): str,
                vol.Required(CONF_KIND, default=LOATHE): SelectSelector(
                    SelectSelectorConfig(
                        options=[LOVE, LOATHE], translation_key=CONF_KIND
                    )
                ),
                vol.Optional(CONF_LIBRARY): SelectSelector(
                    SelectSelectorConfig(
                        options=[
                            SelectOptionDict(value=key, label=str(lib["name"]))
                            for key, lib in shipped.items()
                        ]
                    )
                ),
                vol.Optional(CONF_PATTERNS): TextSelector(
                    TextSelectorConfig(multiline=True)
                ),
                vol.Required(CONF_ACTION, default=SWITCH): SelectSelector(
                    SelectSelectorConfig(
                        options=list(ACTIONS), translation_key=CONF_ACTION
                    )
                ),
                vol.Required(CONF_AMOUNT, default=10): NumberSelector(
                    NumberSelectorConfig(
                        min=-100,
                        max=200,
                        step=5,
                        unit_of_measurement="%",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
                vol.Required(CONF_MINUTES, default=5): NumberSelector(
                    NumberSelectorConfig(
                        min=1,
                        max=120,
                        step=1,
                        unit_of_measurement="min",
                        mode=NumberSelectorMode.BOX,
                    )
                ),
            }
        )

    def _errors(self, user_input: dict[str, Any]) -> dict[str, str]:
        good, bad = parse(user_input.get(CONF_PATTERNS, "").splitlines())
        if bad:
            return {CONF_PATTERNS: "bad_pattern"}
        if not good and not user_input.get(CONF_LIBRARY):
            return {CONF_PATTERNS: "no_patterns"}
        stations = [
            s
            for s in self._get_entry().subentries.values()
            if s.subentry_type == STATION
        ]
        if user_input[CONF_ACTION] == SWITCH and not stations:
            return {CONF_ACTION: "no_stations"}
        return {}


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
