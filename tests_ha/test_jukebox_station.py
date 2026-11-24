"""A station that Home Assistant has no name or picture for: Jukebox asks the speaker,
once for each stream. The speakers are the page tests' stand-ins."""

from custom_components.casa_mia_jukebox.page import HOUSE
from test_jukebox_page import TRANSPORT, answered, ask, sent  # noqa: F401  (a fixture)

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
