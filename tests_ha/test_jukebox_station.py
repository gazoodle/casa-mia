"""A station that Home Assistant has no name or picture for: Jukebox asks the speaker,
once for each stream. The speakers are the page tests' stand-ins."""

from custom_components.casa_mia_jukebox.page import HOUSE
from test_jukebox_page import (  # noqa: F401  (sent is a fixture)
    TRANSPORT,
    a_spotify,
    answered,
    ask,
    sent,
)

from test_jukebox import GARDEN, KITCHEN

ABOUT = (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
    ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"><item id="-1" parentID="-1">'
    "<dc:title>Harbour FM</dc:title>"
    "<upnp:albumArtURI>https://example.com/harbour.png</upnp:albumArtURI>"
    "</item></DIDL-Lite>"
)


async def test_a_station_home_assistant_cant_name_is_named_by_its_speaker(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    told = {"CurrentURI": "x-sonosapi-stream:s1", "CurrentURIMetaData": ABOUT}
    aioclient_mock.post(TRANSPORT, text=answered("AVTransport", "GetMediaInfo", **told))
    # Playing a stream, with a song's title at most: no station name and no picture.
    bare = {"group_members": [KITCHEN, GARDEN], "media_content_id": "aac://a/stream"}
    hass.states.async_set(KITCHEN, "playing", {**bare, "media_title": "A song"})

    client = await hass_ws_client(hass)
    await ask(client, HOUSE)
    first = (await client.receive_json())["event"]["groups"][0]
    assert first["kind"] == "radio" and first["channel"] == ""

    named = (await client.receive_json())["event"]["groups"][0]
    assert named["channel"] == "Harbour FM"
    assert named["picture"] == "https://example.com/harbour.png"

    # The next song on the same stream: nothing more is asked of the speaker.
    hass.states.async_set(KITCHEN, "playing", {**bare, "media_title": "Another song"})
    again = (await client.receive_json())["event"]["groups"][0]
    assert again["title"] == "Another song" and again["channel"] == "Harbour FM"
    assert aioclient_mock.call_count == 1


async def test_a_stations_song_gets_its_cover_from_spotify_beside_the_stations_own(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    monkeypatch,
    caplog,
):
    caplog.set_level("INFO")
    asked = []

    async def search(query, kinds, limit):
        asked.append((query, kinds))
        album = {"images": [{"url": "https://covers.example/lanterns.jpg"}]}
        song = {
            "name": "Paper Lanterns",
            "artists": [{"name": "The Marigolds"}],
            "uri": "spotify:track:lanterns",
        }
        return {"tracks": {"items": [song | {"album": album}]}}

    a_spotify(hass, monkeypatch, search)
    # This station sends the song's two names the wrong way round.
    station = {
        "group_members": [KITCHEN, GARDEN],
        "media_channel": "Harbour FM",
        "entity_picture": "/logo.png",
        "media_title": "The Marigolds",
        "media_artist": "Paper Lanterns",
    }
    hass.states.async_set(KITCHEN, "playing", station)

    client = await hass_ws_client(hass)
    await ask(client, HOUSE)

    # Found, by the time the page is told or straight after: the song's cover as well
    # as the station's picture, not in its place.
    found = (await client.receive_json())["event"]["groups"][0]
    if found["cover"] is None:
        # Until Spotify answers, the page can say why the song can't be added yet.
        assert found["unfound"] == "It is still being looked for on Spotify"
        found = (await client.receive_json())["event"]["groups"][0]
    assert found["cover"] == "https://covers.example/lanterns.jpg"
    assert found["picture"] == "/logo.png"
    assert asked == [("Paper Lanterns The Marigolds", ["track"])]
    # The same song is what a playlist is given, by Spotify's address for it.
    assert found["found"] == {
        "uri": "spotify:track:lanterns",
        "title": "Paper Lanterns",
        "by": "The Marigolds",
    }
    assert found["unfound"] is None

    # A show's name, with no artist, isn't looked for; and the same song isn't again.
    async def once(artist):
        """The group as the page is next told it with this artist."""
        while True:
            group = (await client.receive_json())["event"]["groups"][0]
            if group["artist"] == artist:
                return group

    hass.states.async_set(KITCHEN, "playing", station | {"media_artist": ""})
    show = await once("")
    assert show["cover"] is None and show["found"] is None
    assert "didn't say an artist and a title" in show["unfound"]
    # The log says so, once, so that a missing cover can be explained.
    assert caplog.text.count("aren't an artist and a title") == 1
    assert "its cover found on Spotify" in caplog.text
    hass.states.async_set(KITCHEN, "playing", station)
    assert (await once("Paper Lanterns"))["cover"] and len(asked) == 1
