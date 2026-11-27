"""Jukebox's page inside a real Home Assistant: the panel, the feed of the house's music
and what the page asks to be done. The speakers are stand-ins: entities registered as
Sonos's, and media player services that record what they were sent."""

import logging
from types import SimpleNamespace as Of
from xml.sax.saxutils import escape

import pytest
from custom_components.casa_mia_jukebox.const import DOMAIN
from custom_components.casa_mia_jukebox.find import SEARCH as SPOTIFY_SEARCH
from custom_components.casa_mia_jukebox.page import (
    BROWSE as BROWSING,
)
from custom_components.casa_mia_jukebox.page import (
    CARDS_VERSION,
    DO,
    FAVOURITES,
    HOUSE,
    ORDER,
    PANEL,
    QUEUE,
    SEARCH,
)
from homeassistant.components import frontend
from homeassistant.components.application_credentials import (
    ClientCredential,
    async_import_client_credential,
)
from homeassistant.core import SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMockResponse,
)

from test_jukebox import GARDEN, KITCHEN, a_player

PORCH = "media_player.porch"
SERVICES = ("media_play", "volume_set", "volume_mute", "join", "unjoin", "play_media")


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


async def test_the_page_can_be_kept_out_of_the_sidebar(hass, sent):
    """For a house with a dashboard of its own made from the cards. The page stays where
    it is, and is changed in place: it is never taken out from under someone using it."""
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    was = hass.data[frontend.DATA_PANELS][PANEL]

    hass.config_entries.async_update_entry(entry, options={"sidebar": False})
    await hass.async_block_till_done()
    hidden = hass.data[frontend.DATA_PANELS][PANEL]
    assert hidden.sidebar_title is None and hidden.sidebar_icon is None
    assert hidden.config == was.config and not hidden.require_admin

    hass.config_entries.async_update_entry(entry, options={"sidebar": True})
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_PANELS][PANEL].sidebar_title == "Jukebox"


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

    # Mute, for one room and for every room of the group.
    await ask(client, DO, action="mute", entity_id=GARDEN, on=True)
    assert sent.pop() == ("volume_mute", {"entity_id": GARDEN, "is_volume_muted": True})
    await ask(client, DO, action="group_mute", entity_id=GARDEN, on=False)
    assert sent == [
        ("volume_mute", {"entity_id": room, "is_volume_muted": False})
        for room in (KITCHEN, GARDEN)
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
    ours = [
        r.getMessage() for r in caplog.records if r.name.endswith("jukebox.feed.asks")
    ]
    assert len(ours) == 1 and "play_media in media_player.kitchen" in ours[0]
    assert "broken" not in ours[0] and not sent

    assert not (await ask(client, DO, action="explode", entity_id=KITCHEN))["success"]


async def test_the_favourites_come_as_one_list_with_their_folders(
    hass, hass_ws_client, sent, aioclient_mock
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
        "lists": [
            item("Garden Party", "FV:1", thumbnail="/picture"),
            item("Friday Night", "SQ:3", thumbnail="/friday"),
            item("Deleted since", "SQ:4"),
        ],
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
    # Home Assistant's list of the Sonos playlists is renewed only when a favourite
    # changes: it still has one deleted since, and not one saved since. The speaker is
    # asked for them, and Home Assistant's are used only for their pictures. Jukebox's
    # own copies of a queue, a party's and one kept to put back, aren't the household's
    # playlists, and aren't listed.
    kept = (
        '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<container id="SQ:3"><dc:title>Friday Night</dc:title></container>'
        '<container id="SQ:9"><dc:title>Saved just now</dc:title></container>'
        '<container id="SQ:10"><dc:title>Jukebox party copy (Kitchen)</dc:title>'
        "</container>"
        '<container id="SQ:11"><dc:title>Jukebox undo copy (Kitchen)</dc:title>'
        "</container>"
        "</DIDL-Lite>"
    )
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=kept)
    )
    client = await hass_ws_client(hass)
    found = (await ask(client, FAVOURITES, entity_id=KITCHEN))["result"]
    assert [(f["folder"], f["title"], f["picture"], f["live"]) for f in found] == [
        ("Playlists", "Friday Night", "/friday", False),
        ("Playlists", "Saved just now", None, False),
        ("Playlists", "Garden Party", "/picture", False),
        ("Radio", "Harbour FM", None, True),
    ]
    assert [f["media_content_id"] for f in found] == ["SQ:3", "SQ:9", "FV:1", "FV:2"]
    # Only a playlist of Sonos's own can be deleted from the page.
    assert [f["playlist"] for f in found] == [True, True, False, False]


SPEAKER = "http://192.0.2.7:1400"  # where a_player says every stand-in speaker is
BROWSE = f"{SPEAKER}/MediaServer/ContentDirectory/Control"
TRANSPORT = f"{SPEAKER}/MediaRenderer/AVTransport/Control"
PLAYLIST = "file:///jffs/settings/savedqueues.rsq#3"


def answered(service, action, **parts):
    """A speaker's answer to a UPnP action."""
    inner = "".join(f"<{k}>{escape(str(v))}</{k}>" for k, v in parts.items())
    return (
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'
        f'<u:{action}Response xmlns:u="urn:schemas-upnp-org:service:{service}:1">'
        f"{inner}</u:{action}Response></s:Body></s:Envelope>"
    )


FAVOURITES_OF_THE_SPEAKER = answered(
    "ContentDirectory",
    "Browse",
    Result=(
        '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"'
        ' xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/">'
        '<item id="FV:2/6"><res>x-rincon-mp3radio://radio.example/harbour</res></item>'
        f'<item id="FV:2/7"><res>{PLAYLIST}</res><r:resMD>&lt;about/&gt;</r:resMD></item>'
        "</DIDL-Lite>"
    ),
)
REFUSED = (
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault>'
    '<detail><UPnPError xmlns="urn:schemas-upnp-org:control-1-0">'
    "<errorCode>701</errorCode></UPnPError></detail></s:Fault></s:Body></s:Envelope>"
)


async def test_a_favourite_is_lined_up_by_the_speaker_and_the_queue_is_kept(
    hass, hass_ws_client, sent, aioclient_mock
):
    """Home Assistant clears the queue for a favourite whatever `enqueue` says, so
    "add to the end" and "play next" go to the speaker itself."""
    client = await hass_ws_client(hass)
    aioclient_mock.post(BROWSE, text=FAVOURITES_OF_THE_SPEAKER)
    added = answered("AVTransport", "AddURIToQueue", NumTracksAdded=12)
    aioclient_mock.post(TRANSPORT, text=added)
    favourite = {"media_content_id": "FV:2/7", "media_content_type": "favorite_item_id"}

    def asked_of_the_queue():
        (_, url, body, headers) = aioclient_mock.mock_calls[-1]
        assert str(url) == TRANSPORT and "#AddURIToQueue" in headers["SOAPACTION"]
        return body.decode()

    # At the end: asked of the coordinator's speaker, and nothing of Home Assistant.
    answer = await ask(
        client, DO, action="play_media", entity_id=GARDEN, enqueue="add", **favourite
    )
    assert answer["success"] and not sent
    body = asked_of_the_queue()
    assert f"<EnqueuedURI>{PLAYLIST}</EnqueuedURI>" in body
    assert "<EnqueuedURIMetaData>&lt;about/&gt;</EnqueuedURIMetaData>" in body
    assert "<DesiredFirstTrackNumberEnqueued>0<" in body and "<EnqueueAsNext>0<" in body

    # Next: straight after the song that is playing, the fourth.
    state = hass.states.get(KITCHEN)
    hass.states.async_set(KITCHEN, "playing", {**state.attributes, "queue_position": 4})
    await ask(
        client, DO, action="play_media", entity_id=KITCHEN, enqueue="next", **favourite
    )
    body = asked_of_the_queue()
    assert "<DesiredFirstTrackNumberEnqueued>5<" in body and "<EnqueueAsNext>1<" in body
    assert not sent

    # Replacing the queue with a favourite, which the page asks about first, is Home
    # Assistant's to do.
    await ask(
        client,
        DO,
        action="play_media",
        entity_id=KITCHEN,
        enqueue="replace",
        **favourite,
    )
    assert sent.pop() == (
        "play_media",
        {"entity_id": KITCHEN, "enqueue": "replace", **favourite},
    )


async def test_a_sonos_playlist_is_found_where_the_speaker_keeps_those(
    hass, hass_ws_client, sent, aioclient_mock
):
    """Home Assistant lists the Sonos playlists among the favourites, but a speaker keeps
    them apart (`SQ:`), and with no description of their own. In 2026.11.12-b10 one was
    looked for in a list with no name, which the speaker refused (error 701)."""
    client = await hass_ws_client(hass)
    playlists = (
        '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/"'
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">'
        f'<container id="SQ:3" parentID="SQ:"><res>{PLAYLIST}</res>'
        "<dc:title>Friday &amp; Night</dc:title>"
        "<upnp:class>object.container.playlistContainer</upnp:class></container>"
        "</DIDL-Lite>"
    )
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=playlists)
    )
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "AddURIToQueue"))

    answer = await ask(
        client,
        DO,
        action="play_media",
        entity_id=KITCHEN,
        enqueue="add",
        media_content_id="SQ:3",
        media_content_type="favorite_item_id",
    )
    assert answer["success"] and not sent
    browsed, queued = (call[2].decode() for call in aioclient_mock.mock_calls)
    assert "<ObjectID>SQ:</ObjectID>" in browsed
    assert f"<EnqueuedURI>{PLAYLIST}</EnqueuedURI>" in queued
    # Its description is written for it, and escaped once more to travel as text.
    assert 'item id="SQ:3" parentID="SQ:"' in queued
    assert "&lt;dc:title&gt;Friday &amp;amp; Night&lt;/dc:title&gt;" in queued


async def test_stop_leaves_the_rooms_quiet_and_alone(
    hass, hass_ws_client, sent, aioclient_mock
):
    client = await hass_ws_client(hass)
    aioclient_mock.get(
        "https://192.0.2.7:1443/api/v1/players/local/info",
        json={"playerId": "RINCON_000000000000001400"},
    )
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))

    assert (await ask(client, DO, action="stop", entity_id=GARDEN))["success"]
    # The leader is set to play from its own queue, which stops a station too, the
    # queue is emptied, and the room that followed is by itself again.
    set_source, emptied = aioclient_mock.mock_calls[1:]
    assert (
        "<CurrentURI>x-rincon-queue:RINCON_000000000000001400#0<"
        in set_source[2].decode()
    )
    assert "#RemoveAllTracksFromQueue" in emptied[3]["SOAPACTION"]
    assert sent == [("unjoin", {"entity_id": GARDEN})]


async def test_a_song_found_is_always_played_from_the_queue(
    hass, hass_ws_client, sent, aioclient_mock
):
    """Home Assistant plays a library song's file directly unless it is told where in
    the queue to put it, and the queue then doesn't show what is playing."""
    client = await hass_ws_client(hass)
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))
    # An empty queue: there is nothing to keep before it is replaced (undo.py).
    aioclient_mock.post(BROWSE, text=answered("ContentDirectory", "Browse"))
    song = {
        "media_content_id": "x-file-cifs://nas.example/a.mp3",
        "media_content_type": "track",
    }

    # Played now, as in a room that was quiet: put into the queue and played there.
    assert (await ask(client, DO, action="play_media", entity_id=KITCHEN, **song))[
        "success"
    ]
    assert sent.pop() == (
        "play_media",
        {"entity_id": KITCHEN, "enqueue": "play", **song},
    )
    assert not aioclient_mock.mock_calls

    # In place of the queue: the queue is emptied first, then the same.
    await ask(
        client, DO, action="play_media", entity_id=KITCHEN, enqueue="replace", **song
    )
    assert "#RemoveAllTracksFromQueue" in aioclient_mock.mock_calls[-1][3]["SOAPACTION"]
    assert sent.pop() == (
        "play_media",
        {"entity_id": KITCHEN, "enqueue": "play", **song},
    )

    # Next, and at the end, as asked.
    await ask(client, DO, action="play_media", entity_id=KITCHEN, enqueue="add", **song)
    assert sent.pop()[1]["enqueue"] == "add"


async def test_a_sonos_playlist_replaces_the_queue_without_home_assistant(
    hass, hass_ws_client, sent, aioclient_mock
):
    """Home Assistant plays a playlist from its own list of them, which doesn't have
    one saved since it was last renewed. So the queue is emptied, filled and started
    by the speaker and Home Assistant's own "play the queue"."""
    client = await hass_ws_client(hass)
    started = []

    async def play_queue(call):
        started.append(dict(call.data))

    hass.services.async_register("sonos", "play_queue", play_queue)
    playlists = (
        '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
        f'<container id="SQ:9"><res>{PLAYLIST}</res></container></DIDL-Lite>'
    )
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=playlists)
    )
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))

    answer = await ask(
        client,
        DO,
        action="play_media",
        entity_id=GARDEN,
        enqueue="replace",
        media_content_id="SQ:9",
        media_content_type="favorite_item_id",
    )
    assert answer["success"] and not sent
    asked = [
        call[3]["SOAPACTION"].split("#")[1].strip('"')
        for call in aioclient_mock.mock_calls
    ]
    # The first Browse is how many songs the queue holds, to keep it to put back first;
    # this speaker lists none, so nothing is kept (undo.py).
    assert asked == ["Browse", "RemoveAllTracksFromQueue", "Browse", "AddURIToQueue"]
    assert started == [{"entity_id": KITCHEN, "queue_position": 0}]


async def test_a_favourite_that_cant_be_lined_up_says_why(
    hass, hass_ws_client, sent, aioclient_mock
):
    client = await hass_ws_client(hass)
    aioclient_mock.post(BROWSE, text=FAVOURITES_OF_THE_SPEAKER)
    aioclient_mock.post(TRANSPORT, text=REFUSED, status=500)
    line_up = {
        "action": "play_media",
        "entity_id": KITCHEN,
        "enqueue": "add",
        "media_content_type": "favorite_item_id",
    }

    answer = await ask(client, DO, media_content_id="FV:2/7", **line_up)
    assert answer["error"]["message"] == "The speaker refused AddURIToQueue (error 701)"

    # One that was deleted in Sonos since the page listed it.
    answer = await ask(client, DO, media_content_id="FV:2/99", **line_up)
    assert "doesn't have that favourite" in answer["error"]["message"]
    assert not sent


async def test_the_queue_is_read_and_changed_through_the_coordinator(
    hass, hass_ws_client, sent, aioclient_mock
):
    client = await hass_ws_client(hass)
    jumped = []

    async def play_queue(call):
        jumped.append(dict(call.data))

    hass.services.async_register("sonos", "play_queue", play_queue)
    songs = (
        '<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"'
        ' xmlns:dc="http://purl.org/dc/elements/1.1/"'
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">'
        '<item id="Q:0/1"><res duration="0:03:14">x-file-cifs://nas.example/a.mp3</res>'
        "<dc:title>Paper Lanterns</dc:title><dc:creator>The Marigolds</dc:creator>"
        "<upnp:album>Slow Sunday</upnp:album></item>"
        '<item id="Q:0/2"><res>x-file-cifs://nas.example/b.mp3</res>'
        "<dc:title>A song</dc:title></item>"
        "</DIDL-Lite>"
    )
    aioclient_mock.post(
        BROWSE,
        text=answered("ContentDirectory", "Browse", Result=songs, TotalMatches=2),
    )
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))

    # Asked of a room that follows: the queue is its coordinator's.
    found = (await ask(client, QUEUE, entity_id=GARDEN))["result"]
    assert found == {
        "total": 2,
        "songs": [
            {
                "title": "Paper Lanterns",
                "artist": "The Marigolds",
                "album": "Slow Sunday",
                "duration": 194,
                "picture": None,
                "source": "library",
            },
            {
                "title": "A song",
                "artist": "",
                "album": "",
                "duration": None,
                "picture": None,
                "source": "library",
            },
        ],
    }

    def asked(action):
        (_, url, body, headers) = aioclient_mock.mock_calls[-1]
        assert str(url) == TRANSPORT and f"#{action}" in headers["SOAPACTION"]
        return body.decode()

    # A song moved up goes in front of the one at its new place; moved down, in front
    # of the one after it, since the speaker counts before the move.
    assert (
        await ask(client, DO, action="queue_move", entity_id=GARDEN, value=5, to=2)
    )["success"]
    body = asked("ReorderTracksInQueue")
    assert "<StartingIndex>5<" in body and "<InsertBefore>2<" in body
    await ask(client, DO, action="queue_move", entity_id=GARDEN, value=2, to=5)
    assert "<InsertBefore>6<" in asked("ReorderTracksInQueue")

    await ask(client, DO, action="queue_remove", entity_id=GARDEN, value=3)
    assert "<ObjectID>Q:0/3</ObjectID>" in asked("RemoveTrackFromQueue")

    # Jumping to a song is Home Assistant's own action, which counts from 0.
    await ask(client, DO, action="queue_play", entity_id=GARDEN, value=4)
    assert jumped == [{"entity_id": KITCHEN, "queue_position": 3}]

    answer = await ask(client, DO, action="queue_remove", entity_id=GARDEN, value=0)
    assert "numbered from 1" in answer["error"]["message"] and not sent


async def test_the_queue_is_cleared_and_saved_and_a_playlist_deleted(
    hass, hass_ws_client, sent, aioclient_mock
):
    client = await hass_ws_client(hass)
    aioclient_mock.post(BROWSE, text=answered("ContentDirectory", "DestroyObject"))
    saved = answered("AVTransport", "SaveQueue", AssignedObjectID="SQ:9")
    aioclient_mock.post(TRANSPORT, text=saved)

    def asked(url, action):
        (_, to, body, headers) = aioclient_mock.mock_calls[-1]
        assert str(to) == url and f"#{action}" in headers["SOAPACTION"]
        return body.decode()

    assert (await ask(client, DO, action="queue_clear", entity_id=GARDEN))["success"]
    asked(TRANSPORT, "RemoveAllTracksFromQueue")

    named = {"action": "queue_save", "entity_id": GARDEN}
    assert (await ask(client, DO, name=" Friday & Night ", **named))["success"]
    assert "<Title>Friday &amp; Night</Title>" in asked(TRANSPORT, "SaveQueue")
    answer = await ask(client, DO, name="  ", **named)
    assert answer["error"]["message"] == "The playlist needs a name"

    gone = {"action": "playlist_delete", "entity_id": GARDEN}
    assert (await ask(client, DO, media_content_id="SQ:3", **gone))["success"]
    assert "<ObjectID>SQ:3</ObjectID>" in asked(BROWSE, "DestroyObject")
    # A favourite's id is never handed to the speaker to destroy.
    calls = len(aioclient_mock.mock_calls)
    answer = await ask(client, DO, media_content_id="FV:2/7", **gone)
    assert "Only a Sonos playlist" in answer["error"]["message"]
    assert len(aioclient_mock.mock_calls) == calls and not sent


async def test_the_players_order_is_kept_and_sent_to_every_page(
    hass, hass_ws_client, sent, hass_storage
):
    hass.states.async_set(PORCH, "playing", {"media_title": "Another song"})
    client = await hass_ws_client(hass)
    await ask(client, HOUSE)
    first = (await client.receive_json())["event"]
    assert [g["id"] for g in first["groups"]] == [KITCHEN, PORCH]

    # Arranged from another page: this one is sent the house again, in the new order.
    other = await hass_ws_client(hass)
    assert (await ask(other, ORDER, rooms=[PORCH, KITCHEN]))["success"]
    again = (await client.receive_json())["event"]
    assert [g["id"] for g in again["groups"]] == [PORCH, KITCHEN]

    # And it is kept for the next start.
    await hass.async_block_till_done()
    assert hass_storage["casa_mia_jukebox.order"]["data"] == {"rooms": [PORCH, KITCHEN]}


def node(title, id, kind="track", play=True, expand=False):
    """One thing as Home Assistant's browsing or searching gives it."""
    return {
        "title": title,
        "media_content_id": id,
        "media_content_type": kind,
        "can_play": play,
        "can_expand": expand,
        "thumbnail": None,
    }


@pytest.fixture
def library(hass, sent):
    """Home Assistant's search of the Sonos music library, and its browsing."""

    async def search(call):
        kind, query = call.data["media_content_type"], call.data["search_query"]
        if query == "broken":
            raise HomeAssistantError("the library is being indexed")
        found = {"track": [node("Paper Lanterns", "x-file-cifs://nas.example/a.mp3")]}
        found["album"] = [
            node("Slow Sunday", "A:ALBUM/Slow%20Sunday", "album", expand=True)
        ]
        return {KITCHEN: {"result": found.get(kind, [])}}

    async def browse(call):
        if "media_content_type" not in call.data:
            top = [
                node("Favorites", "", "favorites", play=False, expand=True),
                node("Music Library", "", "library", play=False, expand=True),
            ]
            return {KITCHEN: {"title": "Sonos", "children": top}}
        songs = [node("Paper Lanterns", "x-file-cifs://nas.example/a.mp3")]
        return {KITCHEN: {"title": "Slow Sunday", "children": songs}}

    for service, answers in (("search_media", search), ("browse_media", browse)):
        hass.services.async_register(
            "media_player", service, answers, supports_response=SupportsResponse.ONLY
        )


def spotify_set_up(hass, monkeypatch):
    """Home Assistant's Spotify integration, set up. What Spotify finds is opened
    through it, by an address naming its entry, so only its place among the loaded
    entries is stood in for: a real entry would have Home Assistant load it."""
    entry = Of(entry_id="0123abc")
    loaded = hass.config_entries.async_loaded_entries
    monkeypatch.setattr(
        hass.config_entries,
        "async_loaded_entries",
        lambda domain: [entry] if domain == "spotify" else loaded(domain),
    )
    return entry


async def signed_in(hass):
    """Jukebox signed in to Spotify (config_flow.py), with a token good for ages."""
    await async_import_client_credential(hass, DOMAIN, ClientCredential("id", "secret"))
    token = {"access_token": "abc", "refresh_token": "def", "expires_at": 9e12}
    signed = {"auth_implementation": DOMAIN, "token": token}
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    hass.config_entries.async_update_entry(entry, data=signed)
    await hass.async_block_till_done()


async def a_spotify(hass, monkeypatch, aioclient_mock, search):
    """Home Assistant's Spotify integration set up, and Jukebox signed in to Spotify,
    whose search answers with `search`: a dict of its JSON, as Spotify's own search
    sends it, or a status it refuses the search with."""

    async def answer(method, url, data):
        asked = url.query
        found = await search(asked["q"], asked["type"].split(","), int(asked["limit"]))
        if isinstance(found, int):
            return AiohttpClientMockResponse(method, url, status=found)
        return AiohttpClientMockResponse(method, url, json=found)

    aioclient_mock.get(SPOTIFY_SEARCH, side_effect=answer)
    await signed_in(hass)
    return spotify_set_up(hass, monkeypatch)


async def test_the_library_and_spotify_are_searched_together(
    hass, hass_ws_client, library, caplog, monkeypatch, aioclient_mock
):
    asked = []

    async def search(query, kinds, limit):
        asked.append((query, kinds, limit))
        artists = [{"name": "The Marigolds", "uri": "spotify:artist:1"}]
        album = {
            "name": "Slow Sunday",
            "uri": "spotify:album:3",
            "artists": artists,
            "images": [{"url": "https://images.example/cover.jpg"}],
        }
        song = {"name": "Paper Lanterns", "uri": "spotify:track:2"}
        garden = {
            "name": "Garden Party",
            "uri": "spotify:playlist:4",
            "owner": {"display_name": "Ann"},
            "images": None,
        }
        return {
            # A song's cover is its album's.
            "tracks": {"items": [song | {"artists": artists, "album": album}]},
            "albums": {"items": [album]},
            # Spotify leaves a gap for a playlist it has withdrawn.
            "playlists": {"items": [None, garden]},
            "artists": {"items": []},
        }

    entry = await a_spotify(hass, monkeypatch, aioclient_mock, search)
    client = await hass_ws_client(hass)
    caplog.set_level(logging.INFO)
    found = (await ask(client, SEARCH, entity_id=KITCHEN, query="paper"))["result"]
    # Asked with Jukebox's own sign-in, never Home Assistant's Spotify integration's.
    assert aioclient_mock.mock_calls[-1][3]["Authorization"] == "Bearer abc"

    ours, spotify = found["sources"]
    assert (ours["name"], ours["why"]) == ("Music library", None)
    assert [(i["folder"], i["title"], i["can_expand"]) for i in ours["items"]] == [
        ("Songs", "Paper Lanterns", False),
        ("Albums", "Slow Sunday", True),
    ]
    # A Spotify result has the address Spotify's own browsing gives, so Sonos browses
    # and plays it the same way.
    assert (spotify["name"], spotify["why"]) == ("Spotify", None)
    # No more than 10 of a kind: Spotify refuses a request for more.
    assert asked == [("paper", ["track", "album", "playlist", "artist"], 10)]
    assert [(i["folder"], i["title"], i["by"]) for i in spotify["items"]] == [
        ("Songs", "Paper Lanterns", "The Marigolds"),
        ("Albums", "Slow Sunday", "The Marigolds"),
        ("Playlists", "Garden Party", "Ann"),
    ]
    song, album, _ = spotify["items"]
    assert song["media_content_id"] == f"spotify://{entry.entry_id}/spotify:track:2"
    assert (song["media_content_type"], song["can_expand"]) == (
        "spotify://track",
        False,
    )
    assert album["can_expand"]
    assert song["picture"] == album["picture"] == "https://images.example/cover.jpg"
    assert "searched for 'paper': 2 in Music library, 3 in Spotify" in caplog.text


async def test_one_source_failing_never_hides_the_other(
    hass, hass_ws_client, library, monkeypatch, aioclient_mock
):
    client = await hass_ws_client(hass)

    async def why(query):
        """The two sources' answers to a search: the library's, and Spotify's."""
        found = await ask(client, SEARCH, entity_id=KITCHEN, query=query)
        return found["result"]["sources"]

    # No Spotify integration: the library's results come, and Spotify says why not.
    ours, spotify = await why("paper")
    assert len(ours["items"]) == 2 and not spotify["items"]
    assert "isn't set up" in spotify["why"]

    # Set up, but Jukebox has no sign-in of its own to search with.
    spotify_set_up(hass, monkeypatch)
    _, spotify = await why("paper")
    assert "isn't signed in to Spotify" in spotify["why"]

    # Spotify refusing the search, and the library failing too.
    async def search(query, kinds, limit):
        return 401

    await a_spotify(hass, monkeypatch, aioclient_mock, search)
    ours, spotify = await why("broken")
    assert ours["why"] == "the library is being indexed" and not ours["items"]
    assert spotify["why"] == "Spotify refused the search (401)"


async def test_browsing_starts_without_the_favourites_and_opens_a_place(
    hass, hass_ws_client, library
):
    client = await hass_ws_client(hass)
    top = (await ask(client, BROWSING, entity_id=KITCHEN))["result"]
    assert [i["title"] for i in top["items"]] == ["Music Library"]

    inside = await ask(
        client,
        BROWSING,
        entity_id=KITCHEN,
        media_content_type="album",
        media_content_id="A:ALBUM/Slow%20Sunday",
    )
    assert inside["result"]["title"] == "Slow Sunday"
    assert [i["title"] for i in inside["result"]["items"]] == ["Paper Lanterns"]
