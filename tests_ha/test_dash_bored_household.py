"""Dash-Bored's household feed inside a real Home Assistant: what Casa Mia's People says
of each person's age, as the band Digs draws them by. Casa Mia is not loaded: its People
action is a stand-in registered by each test, as the two meet only through Home Assistant."""

import pytest
from custom_components.casa_mia_dash_bored.const import DOMAIN, HOUSEHOLD, PEOPLE_EVENT
from homeassistant.core import SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

ENTRIES = [
    {
        "name": "Robin",
        "person": "person.robin",
        "age": 41,
        "days_to_birthday": 100,
        "born": "1984-03-07",
    },
    {
        "name": "Wren",
        "person": "person.wren",
        "age": 7,
        "days_to_birthday": 0,
        "born": "2018",
    },
    {"name": "Kit", "person": "person.kit", "age": 3, "days_to_birthday": 9},
    {"name": "Pip", "person": "person.pip", "age": 0, "days_to_birthday": 200},
    {
        "name": "Lodger",
        "person": None,
        "age": 30,
    },  # no Home Assistant person: not drawn
    {"name": "Robin at work", "person": "person.robin", "age": 41},  # the first counts
]


async def set_up(hass):
    entry = MockConfigEntry(domain=DOMAIN, title="Dash-Bored")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


def people_action(hass, answer):
    """Casa Mia's People action, answering with whatever `answer` holds when asked."""

    async def people(_call):
        if isinstance(answer[0], Exception):
            raise answer[0]
        return {"people": answer[0]}

    hass.services.async_register(
        "casa_mia", "people", people, supports_response=SupportsResponse.ONLY
    )


async def follow(hass, hass_ws_client):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": HOUSEHOLD})
    assert (await client.receive_json())["success"]
    return client, (await client.receive_json())["event"]


async def test_without_casa_mia_everyone_is_drawn_grown(hass, hass_ws_client):
    await set_up(hass)
    _, told = await follow(hass, hass_ws_client)
    assert told == [{"people": []}]


async def test_each_person_is_told_by_their_band_and_birthday_and_nothing_more(
    hass, hass_ws_client
):
    await set_up(hass)
    people_action(hass, [ENTRIES])
    await hass.async_block_till_done()
    client, told = await follow(hass, hass_ws_client)
    assert told == [
        {
            "people": [
                {"person": "person.robin", "band": None, "birthday": False},
                {"person": "person.wren", "band": "child", "birthday": True},
                {"person": "person.kit", "band": "toddler", "birthday": False},
                {"person": "person.pip", "band": "baby", "birthday": False},
            ]
        }
    ]

    # People changes: the page is told at once.
    ENTRIES_NOW = [{**ENTRIES[1], "days_to_birthday": 364}]
    answer = [ENTRIES_NOW]
    hass.services.async_remove("casa_mia", "people")
    people_action(hass, answer)
    await hass.async_block_till_done()
    assert (await client.receive_json())["event"] == [
        {"people": [{"person": "person.wren", "band": "child", "birthday": False}]}
    ]

    # People stops answering: what was told stands.
    answer[0] = HomeAssistantError("the app did not answer")
    hass.bus.async_fire(PEOPLE_EVENT)
    await hass.async_block_till_done()
    _, again = await follow(hass, hass_ws_client)
    assert again == [
        {"people": [{"person": "person.wren", "band": "child", "birthday": False}]}
    ]


@pytest.mark.parametrize(
    ("age", "band"),
    [
        (0, "baby"),
        (1, "baby"),
        (2, "toddler"),
        (4, "toddler"),
        (5, "child"),
        (12, "child"),
        (13, None),
        (None, None),
    ],
)
def test_the_bands(age, band):
    from custom_components.casa_mia_dash_bored.household import band as banded

    assert banded(age) == band
