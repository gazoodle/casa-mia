"""What Casa Mia's People says of the household that Digs draws by: whether each person
is a baby, a toddler or a child, and whether it is their birthday. People holds dates of
birth; a page is told only the band each person's age falls in, never the date or the
age, and nothing else People holds (names, numbers, plates).

Asked of Casa Mia's People action when Home Assistant starts or the action arrives, when
People says it changed (PEOPLE_EVENT), and just after midnight, when ages and birthdays
turn over: a date coming due, not a poll. Without Casa Mia, or with no one in People
linked to a Home Assistant person, the feed is empty and the pages draw everyone grown.
A People that does not answer keeps what was last told, and says so in the log."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.const import (
    EVENT_HOMEASSISTANT_STARTED,
    EVENT_HOMEASSISTANT_STOP,
    EVENT_SERVICE_REGISTERED,
)
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_time_change

from .const import DOMAIN, HOUSEHOLD, PEOPLE_ACTION, PEOPLE_EVENT
from .feed import Send, follow

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_household"
# The youngest age past each band, in years: under 2 a baby, under 5 a toddler, under 13
# a child. From 13, or with no age, a person is drawn grown.
BANDS = ((2, "baby"), (5, "toddler"), (13, "child"))


def band(age: Any) -> str | None:
    """The band an age falls in, or None for someone grown or of no known age."""
    if not isinstance(age, int):
        return None
    return next((name for under, name in BANDS if age < under), None)


class Household:
    """The latest the pages have been told: one item, the whole household."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.people: list[dict[str, Any]] = []
        self.feeds: list[Send] = []

    async def ask(self, *_: Any) -> None:
        """Ask People again, and tell every page if anything has changed."""
        if not self.hass.services.has_service(*PEOPLE_ACTION):
            return
        try:
            answer = await self.hass.services.async_call(
                *PEOPLE_ACTION, {}, blocking=True, return_response=True
            )
        except HomeAssistantError as exc:
            _LOGGER.warning(
                "Casa Mia's People did not answer, so Digs draws the household as before: %s",
                exc,
            )
            return

        # One entry for each Home Assistant person: the first People has for them.
        seen: dict[str, dict[str, Any]] = {}
        for entry in (answer or {}).get("people", []):
            person = entry.get("person")
            if isinstance(person, str) and person not in seen:
                seen[person] = {
                    "person": person,
                    "band": band(entry.get("age")),
                    "birthday": entry.get("days_to_birthday") == 0,
                }
        people = list(seen.values())
        if people == self.people:
            return
        self.people = people
        _LOGGER.info("Household from Casa Mia's People: %d people", len(people))
        for feed in list(self.feeds):
            feed(self.told())

    def told(self) -> dict[str, Any]:
        return {"people": self.people}


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    household = hass.data[KEY] = Household(hass)
    hass.bus.async_listen(PEOPLE_EVENT, household.ask)

    # Casa Mia may load after this, or be reloaded: ask when its action arrives.
    @callback
    def registered(event: Event) -> None:
        if (event.data.get("domain"), event.data.get("service")) == PEOPLE_ACTION:
            hass.async_create_task(household.ask())

    hass.bus.async_listen(EVENT_SERVICE_REGISTERED, registered)
    # Ended with the run, as Home Assistant stops.
    midnight = async_track_time_change(hass, household.ask, hour=0, minute=0, second=5)
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, lambda _event: midnight())
    if hass.is_running:
        hass.async_create_task(household.ask())
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, household.ask)
    websocket_api.async_register_command(hass, _ws_household)


@websocket_api.websocket_command({vol.Required("type"): HOUSEHOLD})
@callback
def _ws_household(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """The household as last told, then again each time it changes."""
    household: Household = hass.data[KEY]
    follow(connection, msg, household.feeds, [household.told()])
