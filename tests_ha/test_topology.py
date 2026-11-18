"""Topology inside a real Home Assistant: its storage, the area and floor registries, and
the websocket contract, against the same invented house as tests/test_topology.py."""

import copy
import json
from pathlib import Path

import pytest
from custom_components.casa_mia.topology import DATA
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import floor_registry as fr
from homeassistant.setup import async_setup_component

CASES = json.loads(
    (Path(__file__).resolve().parents[1] / "tests" / "topology_cases.json").read_text()
)
KEY = "casa_mia.topology"


@pytest.fixture
async def house(hass):
    """The cases' registry, made for real: floors and areas by the ids the cases use."""
    floors = fr.async_get(hass)
    for floor in CASES["registry"]["floors"]:
        assert floors.async_create(floor).floor_id == floor
    areas = ar.async_get(hass)
    for area, floor in CASES["registry"]["areas"].items():
        assert areas.async_create(area, floor_id=floor).id == area


async def started(hass, hass_ws_client, *token):
    """Casa Mia set up with no entry, as when the app is down, and a page following the
    feed: the client and the feed as first sent."""
    assert await async_setup_component(hass, "casa_mia", {})
    client = await hass_ws_client(hass, *token)
    await client.send_json_auto_id({"type": "casa_mia/topology/subscribe"})
    assert (await client.receive_json())["success"]
    return client, (await client.receive_json())["event"]


async def save(client, rev, record):
    """The save's answer, and the feeds sent meanwhile (a save tells every page, this
    one too, before it answers)."""
    await client.send_json_auto_id(
        {"type": "casa_mia/topology/save", "rev": rev, **record}
    )
    feeds = []
    while (message := await client.receive_json())["type"] != "result":
        feeds.append(message["event"])
    return message, feeds


async def test_what_was_kept_is_fed_as_the_contract_says(
    hass, hass_ws_client, hass_storage, house
):
    hass_storage[KEY] = {
        "version": 1,
        "key": KEY,
        "data": {"rev": 7, "record": CASES["record"]},
    }
    _client, feed = await started(hass, hass_ws_client)
    assert feed == CASES["view"]


async def test_nothing_entered_is_an_empty_feed(hass, hass_ws_client, house):
    _client, feed = await started(hass, hass_ws_client)
    assert feed == {"rev": 0, "sites": [], "buildings": [], "exits": {}, "broken": []}


async def test_a_save_is_kept_and_every_page_is_told(
    hass, hass_ws_client, hass_storage, house
):
    client, _feed = await started(hass, hass_ws_client)
    record = {
        "sites": [],
        "buildings": [{"id": "shed", "name": "Shed", "areas": ["workshop"]}],
        "connections": [{"a": "hall", "b": "parlour", "way": "North-East"}],
    }

    answer, [feed] = await save(client, 0, record)
    assert answer["success"] and answer["result"] == {"rev": 1}
    assert feed["rev"] == hass.data[DATA].rev == 1
    assert feed["exits"] == {
        "hall": [{"to": "parlour", "way": "ne"}],
        "parlour": [{"to": "hall", "way": "sw"}],
    }
    assert feed["buildings"] == [
        {
            "id": "shed",
            "name": "Shed",
            "site": None,
            "floors": [],
            "areas": ["workshop"],
        }
    ]
    assert hass_storage[KEY]["data"]["rev"] == 1


async def test_a_save_based_on_an_older_rev_is_refused(
    hass, hass_ws_client, hass_storage, house
):
    client, _feed = await started(hass, hass_ws_client)
    empty = {"sites": [], "buildings": [], "connections": []}
    assert (await save(client, 0, empty))[0]["success"]

    answer, feeds = await save(client, 0, empty)
    assert answer["error"]["code"] == "stale" and not feeds
    assert hass_storage[KEY]["data"]["rev"] == 1


async def test_an_invalid_save_is_refused_with_its_reasons(hass, hass_ws_client, house):
    client, _feed = await started(hass, hass_ws_client)
    record = {
        "sites": [],
        "buildings": [],
        "connections": [{"a": "hall", "b": "hall", "way": "sideways"}],
    }

    answer, feeds = await save(client, 0, record)
    assert answer["error"]["code"] == "invalid" and not feeds
    assert "joined to itself" in answer["error"]["message"]
    assert "'sideways'" in answer["error"]["message"]


async def test_only_an_administrator_saves(
    hass, hass_ws_client, hass_read_only_access_token, house
):
    client, _feed = await started(hass, hass_ws_client, hass_read_only_access_token)
    answer, _feeds = await save(
        client, 0, {"sites": [], "buildings": [], "connections": []}
    )
    assert answer["error"]["code"] == "unauthorized"


async def test_an_area_removed_is_reported_at_once(
    hass, hass_ws_client, hass_storage, house
):
    hass_storage[KEY] = {
        "version": 1,
        "key": KEY,
        "data": {"rev": 7, "record": CASES["record"]},
    }
    client, _feed = await started(hass, hass_ws_client)

    ar.async_get(hass).async_delete("parlour")
    await hass.async_block_till_done()

    feed = (await client.receive_json())["event"]
    assert "parlour" not in feed["exits"]
    assert {"to": "parlour", "way": "n"} not in feed["exits"]["hall"]
    expected = copy.deepcopy(CASES["view"]["broken"])
    expected.append(
        {
            "kind": "connection",
            "a": "hall",
            "b": "parlour",
            "ref": "parlour",
            "why": "gone",
        }
    )
    assert sorted(map(json.dumps, feed["broken"])) == sorted(map(json.dumps, expected))
