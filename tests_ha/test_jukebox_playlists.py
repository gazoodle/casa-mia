"""A Sonos playlist seen and changed from Jukebox's page: its songs listed, moved, taken
out and added to, where the speaker keeps it. The speakers are the page tests'."""

import re

from custom_components.casa_mia_jukebox.page import DO, HOUSE, QUEUE
from test_jukebox_page import (  # noqa: F401  (sent is a fixture)
    BROWSE,
    TRANSPORT,
    answered,
    ask,
    sent,
)

from test_jukebox import KITCHEN

LISTED = (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
    ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
    '<item id="S://nas/music/a.mp3" parentID="SQ:4" restricted="true">'
    '<res duration="0:03:14">x-file-cifs://nas/music/a.mp3</res>'
    "<dc:title>Paper Lanterns</dc:title><dc:creator>The Marigolds</dc:creator>"
    "<upnp:album>Harbour Lights</upnp:album></item></DIDL-Lite>"
)


def asked(aioclient_mock, action):
    """What the speaker was last sent for an action: each thing in it, by name."""
    bodies = [call[2].decode() for call in aioclient_mock.mock_calls]
    body = next(b for b in reversed(bodies) if f"<u:{action} " in b)
    return dict(re.findall(r"<(\w+)>(.*?)</\1>", body, re.S))


async def test_a_playlists_songs_are_listed_and_changed_where_it_is_kept(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=LISTED)
    )
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))
    client = await hass_ws_client(hass)

    found = await ask(client, QUEUE, entity_id=KITCHEN, playlist="SQ:4")
    assert found["result"]["songs"] == [
        {
            "title": "Paper Lanterns",
            "artist": "The Marigolds",
            "album": "Harbour Lights",
            "duration": 194,
            "picture": None,
        }
    ]
    assert asked(aioclient_mock, "Browse")["ObjectID"] == "SQ:4"
    # Only a playlist: never whatever else a speaker would list for an id.
    assert not (await ask(client, QUEUE, entity_id=KITCHEN, playlist="A:TRACKS"))[
        "success"
    ]

    async def do(action, **data):
        return await ask(client, DO, action=action, entity_id=KITCHEN, **data)

    # The speaker numbers a playlist's songs from 0; Jukebox, as its queue, from 1.
    assert (await do("playlist_move", playlist="SQ:4", value=3, to=1))["success"]
    moved = asked(aioclient_mock, "ReorderTracksInSavedQueue")
    assert (moved["ObjectID"], moved["TrackList"], moved["NewPositionList"]) == (
        "SQ:4",
        "2",
        "0",
    )
    assert (await do("playlist_remove", playlist="SQ:4", value=2))["success"]
    gone = asked(aioclient_mock, "ReorderTracksInSavedQueue")
    assert (gone["TrackList"], gone["NewPositionList"]) == ("1", "")

    # A song of the library is added by its file's address, with the short description
    # Sonos's own apps give; the speaker looks the rest up.
    song = "x-file-cifs://nas/music/a.mp3"
    assert (await do("playlist_add", playlist="SQ:4", media_content_id=song))["success"]
    added = asked(aioclient_mock, "AddURIToSavedQueue")
    assert added["EnqueuedURI"] == song and added["ObjectID"] == "SQ:4"
    assert "S://nas/music/a.mp3" in added["EnqueuedURIMetaData"]
    # The playlist's change number is read first: an old one is refused by a speaker.
    assert added["UpdateID"] == "0"

    # From Spotify: named to the speaker, which picks the household's account itself.
    found = "spotify://an-entry/spotify:track:4uLU6hMCjMI75M1A2tKUQC"
    assert (
        await do("playlist_add", playlist="SQ:4", media_content_id=found, name="A song")
    )["success"]
    added = asked(aioclient_mock, "AddURIToSavedQueue")
    assert added["EnqueuedURI"] == "spotify%3Atrack%3A4uLU6hMCjMI75M1A2tKUQC"
    assert "SA_RINCON2311_X_#Svc2311-0-Token" in added["EnqueuedURIMetaData"]
    assert "A song" in added["EnqueuedURIMetaData"]

    # Refused, with the reason: a Spotify artist, and anything that isn't a playlist.
    artist = "spotify://an-entry/spotify:artist:711MCceyCBcFnzjGY4Q7Un"
    refused = await do("playlist_add", playlist="SQ:4", media_content_id=artist)
    assert not refused["success"] and "Spotify" in refused["error"]["message"]
    assert not (await do("playlist_remove", playlist="FV:2/1", value=1))["success"]


async def test_the_queue_is_saved_over_a_playlist_and_remembers_where_it_came_from(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    kept = LISTED.replace(
        "<item ",
        '<container id="SQ:4" parentID="SQ:"><dc:title>Friday Night</dc:title>'
        "<res>file:///saved#4</res></container><item ",
    )
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=kept)
    )
    saved = answered("AVTransport", "SaveQueue", AssignedObjectID="SQ:4")
    aioclient_mock.post(TRANSPORT, text=saved)
    hass.services.async_register("sonos", "play_queue", lambda call: None)
    client = await hass_ws_client(hass)

    async def do(action, **data):
        return await ask(client, DO, action=action, entity_id=KITCHEN, **data)

    async def source():
        page = await hass_ws_client(hass)
        await ask(page, HOUSE)
        return (await page.receive_json())["event"]["groups"][0]["source"]

    # Saved over a playlist under the speaker's own name for it, which is the only
    # name a speaker accepts, whatever the page sent; and that is now where the queue
    # is from.
    assert await source() is None
    assert (await do("queue_save", playlist="SQ:4", name="Something else"))["success"]
    over = asked(aioclient_mock, "SaveQueue")
    assert (over["ObjectID"], over["Title"]) == ("SQ:4", "Friday Night")
    assert await source() == "SQ:4"

    # Refused, with the reason: a playlist that has gone, and what isn't a playlist.
    gone = await do("queue_save", playlist="SQ:99")
    assert not gone["success"] and "no longer in Sonos" in gone["error"]["message"]
    assert not (await do("queue_save", playlist="FV:2/1"))["success"]

    # The queue emptied is from nowhere; a playlist played in its place is from that.
    assert (await do("queue_clear"))["success"]
    assert not await source()
    what = {"media_content_id": "SQ:4", "media_content_type": "favorite_item_id"}
    assert (await do("play_media", **what))["success"]
    assert await source() == "SQ:4"
