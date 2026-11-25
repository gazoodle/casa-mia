"""The pictures of a queue's songs (art.py): the speaker's own, fetched by Jukebox and
passed on to a page that holds the key. The speakers are the page tests'."""

from urllib.parse import quote

from custom_components.casa_mia_jukebox import art
from custom_components.casa_mia_jukebox.page import FEED, QUEUE
from test_jukebox_page import (  # noqa: F401  (sent is a fixture)
    BROWSE,
    SPEAKER,
    answered,
    ask,
    sent,
)

from test_jukebox import GARDEN, KITCHEN

COVER = "/getaa?u=x-file-cifs%3a%2f%2fnas.example%2fa.mp3&v=7"
LISTED = (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
    ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
    '<item id="Q:0/1"><dc:title>Paper Lanterns</dc:title>'
    f"<upnp:albumArtURI>{COVER.replace('&', '&amp;')}</upnp:albumArtURI></item>"
    '<item id="Q:0/2"><dc:title>From elsewhere</dc:title>'
    "<upnp:albumArtURI>https://covers.example/b.jpg</upnp:albumArtURI></item>"
    '<item id="Q:0/3"><dc:title>Not to be trusted</dc:title>'
    "<upnp:albumArtURI>http://192.0.2.99/c.jpg</upnp:albumArtURI></item>"
    "</DIDL-Lite>"
)


async def test_a_songs_picture_is_the_speakers_passed_on_by_jukebox(
    hass,
    hass_ws_client,
    hass_client_no_auth,
    sent,  # noqa: F811
    aioclient_mock,
):
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=LISTED)
    )
    client = await hass_ws_client(hass)
    songs = (await ask(client, QUEUE, entity_id=GARDEN))["result"]["songs"]
    key = hass.data[FEED].art_key

    # The speaker's own picture goes through Jukebox, by the group's coordinator; one
    # on the internet is shown from there; any other address isn't shown at all.
    own = f"{art.URL}/{key}/{KITCHEN}?u={quote(COVER, safe='')}"
    assert [song["picture"] for song in songs] == [
        own,
        "https://covers.example/b.jpg",
        None,
    ]

    # An <img> can't sign in: the key in the address is what lets it be fetched.
    aioclient_mock.get(
        f"{SPEAKER}{COVER}", content=b"a cover", headers={"Content-Type": "image/jpeg"}
    )
    page = await hass_client_no_auth()
    got = await page.get(own)
    assert got.status == 200 and await got.read() == b"a cover"
    assert (
        got.content_type == "image/jpeg" and "max-age" in got.headers["Cache-Control"]
    )

    # Refused: a wrong key, a room that isn't a Sonos one, and anything of the
    # speaker's that isn't a picture's address.
    asked = len(aioclient_mock.mock_calls)
    for wrong in (
        own.replace(key, "a-guess"),
        own.replace(KITCHEN, "media_player.someone_elses"),
        f"{art.URL}/{key}/{KITCHEN}?u={quote('/status/topology', safe='')}",
    ):
        assert (await page.get(wrong)).status == 404
    assert len(aioclient_mock.mock_calls) == asked

    # A speaker with no picture for the song: the page draws its own tile.
    aioclient_mock.clear_requests()
    aioclient_mock.get(f"{SPEAKER}{COVER}", status=404)
    assert (await page.get(own)).status == 404


async def test_a_playlists_tile_is_made_of_the_covers_of_its_first_albums(
    hass,
    sent,  # noqa: F811
    aioclient_mock,
):
    def song(n, album):
        return (
            f'<item id="S://nas.example/{n}.mp3"><upnp:album>{album}</upnp:album>'
            f"<upnp:albumArtURI>/getaa?u={n}</upnp:albumArtURI></item>"
        )

    albums = ["Harbour Lights", "Harbour Lights", "Neon Arcade", "Lido", "Slow", "More"]
    listed = (
        '<DIDL-Lite xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
        ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
        + "".join(song(n, album) for n, album in enumerate(albums))
        + "</DIDL-Lite>"
    )
    aioclient_mock.post(
        BROWSE, text=answered("ContentDirectory", "Browse", Result=listed)
    )
    feed = hass.data[FEED]
    found = [
        {"playlist": True, "media_content_id": "SQ:4"},
        {"playlist": False, "media_content_id": "FV:2/1"},
    ]
    await art.tiled(feed, KITCHEN, found)

    # Four, one for each album and not two of the same; a favourite is left alone.
    start = f"{art.URL}/{feed.art_key}/{KITCHEN}?u="
    assert found[0]["pictures"] == [
        start + quote(f"/getaa?u={n}", safe="") for n in (0, 2, 3, 4)
    ]
    assert "pictures" not in found[1]
