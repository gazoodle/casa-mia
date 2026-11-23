"""Jukebox's page inside a real Home Assistant: the panel, the feed of the house's music
and what the page asks to be done. The speakers are stand-ins: entities registered as
Sonos's, and media player services that record what they were sent."""

import logging

import pytest
from custom_components.casa_mia_jukebox.const import DOMAIN
from custom_components.casa_mia_jukebox.page import (
    CARDS_VERSION,
    DO,
    FAVOURITES,
    HOUSE,
    PANEL,
)
from homeassistant.components import frontend
from homeassistant.core import SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from test_jukebox import GARDEN, KITCHEN, a_player

PORCH = "media_player.porch"
SERVICES = ("media_play", "volume_set", "join", "unjoin", "play_media")


@pytest.fixture
async def sent(hass):
    """Jukebox set up over three rooms, the kitchen and garden playing together. Gives
    what the speakers were sent: (service, its data)."""
    sent = []

    async def record(call):
        if call.data.get("media_content_id") == "broken":
            raise HomeAssistantError("the speaker refused it")
        sent.append((call.service, dict(call.data)))

    for service in SERVICES:
        hass.services.async_register("media_player", service, record)
    for room in (KITCHEN, GARDEN, PORCH):
        a_player(hass, room)
    together = {"group_members": [KITCHEN, GARDEN], "media_title": "A song"}
    hass.states.async_set(KITCHEN, "playing", {**together, "volume_level": 0.3})
    hass.states.async_set(GARDEN, "playing", {**together, "volume_level": 0.1})
    hass.states.async_set(PORCH, "idle", {"group_members": [PORCH]})

    entry = MockConfigEntry(domain=DOMAIN, title="Jukebox")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return sent


async def ask(client, type, **data):
    await client.send_json_auto_id({"type": type, **data})
    return await client.receive_json()


async def test_the_page_is_in_the_sidebar_for_everyone(hass, hass_ws_client, sent):
    panel = hass.data[frontend.DATA_PANELS][PANEL]
    assert panel.sidebar_title == "Jukebox" and not panel.require_admin
    served = panel.config["_panel_custom"]
    assert served["name"] == "casa-mia-jukebox-page" and not served["embed_iframe"]
    assert served["module_url"].startswith("/casa_mia_jukebox/cards.js?v=")

    client = await hass_ws_client(hass)
    assert (await ask(client, CARDS_VERSION))["result"]["version"]


async def test_the_house_is_sent_at_once_and_again_when_a_speaker_changes(
    hass, hass_ws_client, sent
):
    client = await hass_ws_client(hass)
    assert (await ask(client, HOUSE))["success"]
    model = (await client.receive_json())["event"]
    assert [(g["id"], g["rooms"], g["quiet"]) for g in model["groups"]] == [
        (KITCHEN, [KITCHEN, GARDEN], False),
        (PORCH, [PORCH], True),
    ]
    assert model["rooms"][GARDEN] | {"name": ""} == {
        "name": "",
        "volume": 10,
        "muted": False,
        "available": True,
    }

    # A group reports through each of its speakers at the same instant: told once.
    alone = {"group_members": [KITCHEN], "media_title": "A song", "volume_level": 0.3}
    hass.states.async_set(KITCHEN, "paused", alone)
    hass.states.async_set(GARDEN, "idle", {"group_members": [GARDEN]})
    model = (await client.receive_json())["event"]
    assert [(g["id"], g["state"], g["quiet"]) for g in model["groups"]] == [
        (KITCHEN, "paused", False),
        (GARDEN, "paused", True),
        (PORCH, "paused", True),
    ]

    # Another entity's change is none of its business.
    hass.states.async_set("light.porch", "on")
    await hass.async_block_till_done()
    assert (await ask(client, CARDS_VERSION))["type"] == "result"


async def test_what_the_page_asks_goes_to_the_right_speakers(
    hass, hass_ws_client, sent, caplog
):
    client = await hass_ws_client(hass)
    caplog.set_level(logging.INFO)

    # Playing is asked of the coordinator, whichever of the group's rooms was named.
    assert (await ask(client, DO, action="play", entity_id=GARDEN))["success"]
    assert sent.pop() == ("media_play", {"entity_id": KITCHEN})
    assert "play in media_player.garden" in caplog.text

    # A room's own volume, and the group's one slider: 20 on average, moved to 40.
    await ask(client, DO, action="volume", entity_id=GARDEN, value=15)
    assert sent.pop() == ("volume_set", {"entity_id": GARDEN, "volume_level": 0.15})
    await ask(client, DO, action="group_volume", entity_id=KITCHEN, value=40)
    assert sent == [
        ("volume_set", {"entity_id": KITCHEN, "volume_level": 0.5}),
        ("volume_set", {"entity_id": GARDEN, "volume_level": 0.3}),
    ]
    sent.clear()

    # The porch joins what the kitchen plays, and the garden leaves it.
    await ask(client, DO, action="join", entity_id=GARDEN, room=PORCH)
    assert sent.pop() == ("join", {"entity_id": KITCHEN, "group_members": [PORCH]})
    await ask(client, DO, action="leave", entity_id=KITCHEN, room=GARDEN)
    assert sent.pop() == ("unjoin", {"entity_id": GARDEN})


async def test_a_refusal_goes_back_to_the_page_with_its_reason(
    hass, hass_ws_client, sent, caplog
):
    client = await hass_ws_client(hass)

    answer = await ask(client, DO, action="play", entity_id="media_player.nowhere")
    assert "not a Sonos room" in answer["error"]["message"]

    # A speaker's own refusal too, and it is logged. What was to play is not: an
    # address can carry a key.
    broken = {"media_content_id": "broken", "media_content_type": "playlist"}
    answer = await ask(client, DO, action="play_media", entity_id=KITCHEN, **broken)
    assert answer["error"]["message"] == "the speaker refused it"
    ours = [r.getMessage() for r in caplog.records if r.name.endswith("jukebox.feed")]
    assert len(ours) == 1 and "play_media in media_player.kitchen" in ours[0]
    assert "broken" not in ours[0] and not sent

    assert not (await ask(client, DO, action="explode", entity_id=KITCHEN))["success"]


async def test_the_favourites_come_as_one_list_with_their_folders(
    hass, hass_ws_client, sent
):
    def item(title, id, play=True, kind="playlist", **more):
        return {
            "title": title,
            "media_class": kind,
            "media_content_type": "favorite",
            "media_content_id": id,
            "can_play": play,
            **more,
        }

    shelves = {
        "": [
            item("Playlists", "lists", play=False),
            item("Radio", "radio", play=False),
        ],
        "lists": [item("Garden Party", "FV:1", thumbnail="/picture")],
        "radio": [
            item("Harbour FM", "FV:2", kind="genre"),
            item("A folder", "FV:3", play=False),
        ],
    }

    async def browse(call):
        return {KITCHEN: {"children": shelves[call.data["media_content_id"]]}}

    hass.services.async_register(
        "media_player", "browse_media", browse, supports_response=SupportsResponse.ONLY
    )
    client = await hass_ws_client(hass)
    found = (await ask(client, FAVOURITES, entity_id=KITCHEN))["result"]
    assert [(f["folder"], f["title"], f["picture"], f["live"]) for f in found] == [
        ("Playlists", "Garden Party", "/picture", False),
        ("Radio", "Harbour FM", None, True),
    ]
    assert found[0]["media_content_id"] == "FV:1"
