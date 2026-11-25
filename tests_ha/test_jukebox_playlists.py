"""A Sonos playlist seen and changed from Jukebox's page: its songs listed, moved, taken
out and added to, where the speaker keeps it. The speakers are the page tests'."""

import re

from custom_components.casa_mia_jukebox.page import DO, HOUSE, QUEUE
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMockResponse,
)
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
            "source": "library",
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


# A song from Spotify as a speaker lists it in a playlist: its address, and what the
# speaker says of it, which is all a playlist can be told of it.
STREAMED = LISTED.replace(
    "x-file-cifs://nas/music/a.mp3</res>",
    "x-sonos-spotify:spotify%3atrack%3alanterns?sid=9</res>"
    '<desc id="cdudn">SA_RINCON2311_X_#Svc2311-0-Token</desc>',
).replace('id="S://nas/music/a.mp3"', 'id="SQ:4/2"')


async def test_a_song_is_moved_or_copied_to_another_playlist_added_there_first(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    listed, refuse = [LISTED], []

    async def browsed(method, url, data):
        said = answered("ContentDirectory", "Browse", Result=listed[0])
        return AiohttpClientMockResponse(method, url, text=said)

    async def changed(method, url, data):
        if any(action in data.decode() for action in refuse):
            return AiohttpClientMockResponse(method, url, status=500, text="<e/>")
        return AiohttpClientMockResponse(
            method, url, text=answered("AVTransport", "Any")
        )

    aioclient_mock.post(BROWSE, side_effect=browsed)
    aioclient_mock.post(TRANSPORT, side_effect=changed)
    client = await hass_ws_client(hass)

    async def do(action, name="Paper Lanterns", into="SQ:7"):
        aioclient_mock.mock_calls.clear()
        song = {"playlist": "SQ:4", "value": 2, "name": name, "into": into}
        return await ask(client, DO, action=action, entity_id=KITCHEN, **song)

    def sent_to_speaker(action):
        bodies = [call[2].decode() for call in aioclient_mock.mock_calls]
        return [i for i, body in enumerate(bodies) if f"<u:{action} " in body]

    # Moved: the song itself is read, added at the end of the other playlist, and
    # only then taken out of this one, so a failure between the two never loses it.
    assert (await do("playlist_send"))["success"]
    read = dict(
        re.findall(r"<(\w+)>(.*?)</\1>", aioclient_mock.mock_calls[0][2].decode(), re.S)
    )
    assert (read["ObjectID"], read["StartingIndex"], read["RequestedCount"]) == (
        "SQ:4",
        "1",
        "1",
    )
    added = asked(aioclient_mock, "AddURIToSavedQueue")
    assert added["ObjectID"] == "SQ:7"
    assert added["EnqueuedURI"] == "x-file-cifs://nas/music/a.mp3"
    assert "S://nas/music/a.mp3" in added["EnqueuedURIMetaData"]
    assert added["AddAtIndex"] == "4294967295"
    gone = asked(aioclient_mock, "ReorderTracksInSavedQueue")
    assert (gone["ObjectID"], gone["TrackList"], gone["NewPositionList"]) == (
        "SQ:4",
        "1",
        "",
    )
    assert sent_to_speaker("AddURIToSavedQueue") < sent_to_speaker(
        "ReorderTracksInSavedQueue"
    )

    # Copied: added to the other playlist the same way, and left where it was.
    assert (await do("playlist_copy"))["success"]
    assert asked(aioclient_mock, "AddURIToSavedQueue")["ObjectID"] == "SQ:7"
    assert not sent_to_speaker("ReorderTracksInSavedQueue")

    # A song from Spotify goes with everything the speaker said of it: its names, and
    # the account it is played with.
    listed[0] = STREAMED
    assert (await do("playlist_copy"))["success"]
    added = asked(aioclient_mock, "AddURIToSavedQueue")
    assert added["EnqueuedURI"] == "x-sonos-spotify:spotify%3atrack%3alanterns?sid=9"
    about = added["EnqueuedURIMetaData"]
    assert "Paper Lanterns" in about and "The Marigolds" in about
    assert "SA_RINCON2311_X_#Svc2311-0-Token" in about

    # The playlist was changed since the page listed it, and another song has that
    # number: refused, and nothing is asked of the speaker but to read it.
    stale = await do("playlist_send", name="Low Tide Motel")
    assert not stale["success"] and "has changed" in stale["error"]["message"]
    assert not sent_to_speaker("AddURIToSavedQueue")

    # Added, but it couldn't be taken out: said as it is, the song being in both.
    refuse.append("ReorderTracksInSavedQueue")
    half = await do("playlist_send")
    assert not half["success"] and "it is in both" in half["error"]["message"]
    assert sent_to_speaker("AddURIToSavedQueue")

    # Not into the playlist it is in, and only between Sonos playlists.
    same = await do("playlist_send", into="SQ:4")
    assert not same["success"] and "already" in same["error"]["message"]
    assert not (await do("playlist_send", into="FV:2/1"))["success"]


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


async def test_a_thing_found_is_added_at_a_place_in_a_playlist_and_in_the_queue(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    # The queue holds five songs, and seven once an album of two has been added.
    totals = iter([5, 7])

    async def browsed(method, url, data):
        total = next(totals, 0)
        said = answered("ContentDirectory", "Browse", Result=LISTED, TotalMatches=total)
        return AiohttpClientMockResponse(method, url, text=said)

    aioclient_mock.post(BROWSE, side_effect=browsed)
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))
    client = await hass_ws_client(hass)

    async def do(action, **data):
        return await ask(client, DO, action=action, entity_id=KITCHEN, **data)

    # Home Assistant adds to the end; the speaker then moves each song up to its place.
    album = {
        "media_content_id": "A:ALBUM/Harbour Lights",
        "media_content_type": "album",
    }
    assert (await do("queue_add", to=2, **album))["success"]
    assert sent.pop() == (
        "play_media",
        {"entity_id": KITCHEN, "enqueue": "add"} | album,
    )
    moves = [
        dict(re.findall(r"<(\w+)>(.*?)</\1>", call[2].decode(), re.S))
        for call in aioclient_mock.mock_calls
        if b"ReorderTracksInQueue" in call[2]
    ]
    assert [(m["StartingIndex"], m["InsertBefore"]) for m in moves] == [
        ("6", "2"),
        ("7", "3"),
    ]

    # In a playlist the speaker puts it at the place itself, counting from 0.
    song = "x-file-cifs://nas/music/a.mp3"
    placed = await do("playlist_add", playlist="SQ:4", media_content_id=song, to=3)
    assert placed["success"]
    assert asked(aioclient_mock, "AddURIToSavedQueue")["AddAtIndex"] == "2"


def listing(*songs):
    """A speaker's list of songs: each a (file, title, artist, album, track number)."""
    rows = "".join(
        f'<item id="S://nas/{file}"><res>x-file-cifs://nas/{file}</res>'
        f"<dc:title>{title}</dc:title><dc:creator>{artist}</dc:creator>"
        f"<upnp:album>{album}</upnp:album>"
        f"<upnp:originalTrackNumber>{track}</upnp:originalTrackNumber></item>"
        for file, title, artist, album, track in songs
    )
    return LISTED.partition("<item ")[0] + rows + "</DIDL-Lite>"


def a_speaker_with(aioclient_mock, songs, page=500):
    """A speaker that lists `songs` a page at a time, and takes anything else."""

    async def browsed(method, url, data):
        asked = dict(re.findall(r"<(\w+)>(.*?)</\1>", data.decode(), re.S))
        start = int(asked["StartingIndex"])
        some = songs[start : start + min(page, int(asked["RequestedCount"]))]
        said = answered(
            "ContentDirectory",
            "Browse",
            Result=listing(*some),
            TotalMatches=len(songs),
            UpdateID=7,
        )
        return AiohttpClientMockResponse(method, url, text=said)

    aioclient_mock.post(BROWSE, side_effect=browsed)
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "Any"))


SONGS = [
    ("c.mp3", "10 Last", "Velvet Arcade", "Neon", 2),
    ("a.mp3", "2 Second", "The Marigolds", "Harbour Lights", 9),
    ("b.mp3", "Borrowed", "The Marigolds", "Harbour Lights", 1),
    ("a.mp3", "2 Second", "The Marigolds", "Harbour Lights", 9),
    ("d.mp3", "1 First", "Velvet Arcade", "Neon", 1),
]


async def test_a_long_list_is_read_a_page_at_a_time(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    a_speaker_with(aioclient_mock, SONGS, page=2)
    client = await hass_ws_client(hass)
    found = (await ask(client, QUEUE, entity_id=KITCHEN, playlist="SQ:4"))["result"]
    assert [song["title"] for song in found["songs"]] == [s[1] for s in SONGS]
    assert found["total"] == 5 and aioclient_mock.call_count == 3


async def test_a_playlist_is_sorted_put_back_and_rid_of_songs_that_are_in_it_twice(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    a_speaker_with(aioclient_mock, SONGS)
    client = await hass_ws_client(hass)

    async def do(action, **data):
        return await ask(
            client, DO, action=action, entity_id=KITCHEN, playlist="SQ:4", **data
        )

    def reordered():
        said = asked(aioclient_mock, "ReorderTracksInSavedQueue")
        return said["TrackList"], said.get("NewPositionList", "")

    # By title, numbers counted: the songs named in the order wanted, places rising.
    sorted_ = await do("playlist_sort", by="title")
    assert sorted_["result"] == {"moved": True}
    assert reordered() == ("4,1,3,0,2", "0,1,2,3,4")

    # Put back: the order that undoes it, while the playlist is as the sort left it.
    assert (await do("playlist_unsort"))["success"]
    assert reordered() == ("3,1,4,2,0", "0,1,2,3,4")
    again = await do("playlist_unsort")
    assert not again["success"] and "no sort" in again["error"]["message"]

    # The song that is in it twice: the second is taken out, the first kept.
    assert (await do("playlist_dedupe"))["result"] == {"removed": 1}
    assert reordered() == ("3", "")
    assert not (await do("playlist_sort", by="mood"))["success"]
