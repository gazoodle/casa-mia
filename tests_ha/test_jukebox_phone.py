"""Listening on a phone, inside a real Home Assistant: what the page asks for a room of
its own (phone.py), and Jukebox's sign-in to Spotify. The speakers are the page
tests' stand-ins; nothing here plays a sound, which is the page's own work."""

from custom_components.casa_mia_jukebox.const import CONF_HOSTS, DOMAIN
from custom_components.casa_mia_jukebox.page import HOUSE
from custom_components.casa_mia_jukebox.phone import (
    ADDRESS,
    SONGS,
    STREAM,
    TOKEN,
    TUNEIN,
)
from homeassistant.components.application_credentials import (
    ClientCredential,
    async_import_client_credential,
)
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import SupportsResponse
from homeassistant.setup import async_setup_component
from test_jukebox_page import (  # noqa: F401  (sent is a fixture)
    BROWSE,
    answered,
    ask,
    sent,
    signed_in,
    spotify_set_up,
)

from test_jukebox import KITCHEN

FAVOURITE = "favorite_item_id"
DIDL = (
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
    ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">{}</DIDL-Lite>'
)


def song(title, address, picture=""):
    art = f"<upnp:albumArtURI>{picture}</upnp:albumArtURI>" if picture else ""
    return (
        f'<item id="{title}"><res duration="0:03:14">{address}</res>'
        f"<dc:title>{title}</dc:title><dc:creator>The Marigolds</dc:creator>{art}</item>"
    )


def lists(aioclient_mock, *items):
    """The speaker lists these, whatever it is asked to list."""
    listing = DIDL.format("".join(items))
    aioclient_mock.post(
        BROWSE,
        text=answered(
            "ContentDirectory", "Browse", Result=listing, TotalMatches=len(items)
        ),
    )


async def test_a_playlists_songs_for_a_phone_leave_out_what_it_cant_play(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
):
    lists(
        aioclient_mock,
        song("Paper Lanterns", "x-file-cifs://nas.example/music/a.mp3", "/getaa?u=1"),
        song("Slow Sunday", "x-sonos-spotify:spotify%3atrack%3a4uLU?sid=9"),
        song("Elsewhere", "x-sonos-http:song%3a123.mp4?sid=204"),
    )
    client = await hass_ws_client(hass)
    what = {"media_content_id": "SQ:4", "media_content_type": FAVOURITE}
    found = (await ask(client, SONGS, entity_id=KITCHEN, **what))["result"]

    assert found["left_out"] == 1
    assert [(s["title"], s["uri"], s["duration"]) for s in found["songs"]] == [
        ("Paper Lanterns", "x-file-cifs://nas.example/music/a.mp3", 194),
        ("Slow Sunday", "spotify:track:4uLU", 194),
    ]
    # The speaker's own picture is fetched through Jukebox, as a queue's is.
    assert found["songs"][0]["picture"].startswith(f"/api/{DOMAIN}/art/")

    # Nothing in it a phone can play: said, never an empty list played.
    aioclient_mock.clear_requests()
    lists(aioclient_mock, song("Elsewhere", "x-sonos-http:song%3a123.mp4?sid=204"))
    refused = await ask(client, SONGS, entity_id=KITCHEN, **what)
    assert "another music service" in refused["error"]["message"]
    refused = await ask(client, SONGS, entity_id="media_player.nowhere", **what)
    assert "not a Sonos room" in refused["error"]["message"]


async def test_a_favourite_station_and_things_found_become_songs_for_a_phone(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    aioclient_mock,
    monkeypatch,
):
    station = (
        '<item id="FV:2/6"><res>x-sonosapi-stream:s1234?sid=254</res>'
        "<dc:title>Harbour FM</dc:title></item>"
    )
    lists(aioclient_mock, station)
    client = await hass_ws_client(hass)

    async def songs(id, kind, **more):
        what = {"media_content_id": id, "media_content_type": kind, **more}
        return await ask(client, SONGS, entity_id=KITCHEN, **what)

    [found] = (await songs("FV:2/6", FAVOURITE))["result"]["songs"]
    assert found["live"] and found["title"] == "Harbour FM"
    assert found["uri"] == "x-sonosapi-stream:s1234?sid=254"

    # A song found by searching is known only as the page shows it.
    library = await songs(
        "x-file-cifs://nas.example/music/a.mp3", "track", name="Paper Lanterns"
    )
    assert library["result"]["songs"][0]["title"] == "Paper Lanterns"
    one = await songs(
        "spotify://0123abc/spotify:track:4uLU", "spotify://track", name="A", by="B"
    )
    [spotify] = one["result"]["songs"]
    assert (spotify["uri"], spotify["artist"]) == ("spotify:track:4uLU", "B")

    # An album of Spotify's is opened by Home Assistant's own browsing.
    asked = []

    async def browse(call):
        asked.append(dict(call.data))
        tracks = [
            {"title": "One", "media_content_id": "spotify://0123abc/spotify:track:1"},
            {"title": "Two", "media_content_id": "spotify://0123abc/spotify:track:2"},
        ]
        return {KITCHEN: {"title": "Slow Sunday", "children": tracks}}

    hass.services.async_register(
        "media_player", "browse_media", browse, supports_response=SupportsResponse.ONLY
    )
    album = await songs("spotify://0123abc/spotify:album:9", "spotify://album")
    assert "isn't set up" in album["error"]["message"]
    spotify_set_up(hass, monkeypatch)
    album = await songs("spotify://0123abc/spotify:album:9", "spotify://album")
    assert [(s["title"], s["uri"], s["album"]) for s in album["result"]["songs"]] == [
        ("One", "spotify:track:1", "Slow Sunday"),
        ("Two", "spotify:track:2", "Slow Sunday"),
    ]
    assert asked[0]["media_content_id"] == "spotify://0123abc/spotify:album:9"

    other = await songs("x-sonos-http:song%3a123.mp4", "track")
    assert "only Spotify" in other["error"]["message"]


async def test_a_station_a_speaker_named_is_fetched_from_its_address_or_through_jukebox(
    hass,
    hass_ws_client,
    hass_client_no_auth,
    sent,  # noqa: F811
    aioclient_mock,
):
    client = await hass_ws_client(hass)
    # A room playing it names it.
    held = "x-rincon-mp3radio://https://streams.example/harbour.mp3"
    playing = {"group_members": [KITCHEN], "media_channel": "Harbour FM"}
    hass.states.async_set(KITCHEN, "playing", playing | {"media_content_id": held})
    found = await ask(client, ADDRESS, uri=held, secure=True)
    assert found["result"]["url"] == "https://streams.example/harbour.mp3"

    # So does one of the favourites. TuneIn knows a station by its number. A plain
    # http stream is fetched as it is by a page that is plain http itself.
    tuned = "x-sonosapi-stream:s1234?sid=254"
    lists(aioclient_mock, f'<item id="FV:2/6"><res>{tuned}</res></item>')
    stream = "http://streams.example/h.mp3"
    offer = {"body": [{"url": stream, "media_type": "mp3", "is_direct": True}]}
    aioclient_mock.get(TUNEIN, json=offer)
    assert (await ask(client, ADDRESS, uri=tuned))["result"]["url"] == stream
    assert aioclient_mock.mock_calls[-1][1].query["id"] == "s1234"

    # An address the page makes up isn't looked up: Home Assistant would fetch
    # whatever it names, anywhere on the house's network (hacs/default#14999).
    made_up = await ask(client, ADDRESS, uri="aac://192.168.1.1/admin", secure=True)
    assert "Only a station a Sonos room is playing" in made_up["error"]["message"]
    refused = await ask(client, ADDRESS, uri="https://example.com/anything")
    assert "Only a library song" in refused["error"]["message"]

    # A page reached over https is given it through Jukebox, by a link signed for
    # the login that asked, which passes sound on and nothing else.
    relayed = (await ask(client, ADDRESS, uri=tuned, secure=True))["result"]["url"]
    assert relayed.startswith(f"{STREAM}/") and "authSig=" in relayed
    web = await hass_client_no_auth()
    aioclient_mock.get(stream, content=b"sound", headers={"Content-Type": "audio/mpeg"})
    got = await web.get(relayed)
    assert got.status == 200 and await got.read() == b"sound"
    assert got.headers["Content-Type"] == "audio/mpeg"
    # Not without its signature.
    assert (await web.get(relayed.partition("?")[0])).status == 401

    aioclient_mock.clear_requests()
    aioclient_mock.get(stream, text="<html>", headers={"Content-Type": "text/html"})
    assert (await web.get(relayed)).status == 502


async def test_a_library_song_is_a_signed_link_to_home_assistants_media(
    hass,
    hass_ws_client,
    hass_client_no_auth,
    sent,  # noqa: F811
    tmp_path,
):
    (tmp_path / "tunes" / "The Marigolds").mkdir(parents=True)
    (tmp_path / "tunes" / "The Marigolds" / "Paper Lanterns.mp3").write_bytes(b"song")
    hass.config.media_dirs = {"local": str(tmp_path)}
    assert await async_setup_component(hass, "media_source", {})
    client = await hass_ws_client(hass)

    address = "x-file-cifs://nas.example/music/The%20Marigolds/Paper%20Lanterns.mp3"
    url = (await ask(client, ADDRESS, uri=address))["result"]["url"]
    assert url.startswith("/media/local/tunes/The%20Marigolds/Paper%20Lanterns.mp3?")
    # An <audio> can't sign in: the link itself is what lets it fetch the file.
    web = await hass_client_no_auth()
    got = await web.get(url)
    assert got.status == 200 and await got.read() == b"song"

    missing = await ask(client, ADDRESS, uri="x-file-cifs://nas.example/music/no.mp3")
    assert "isn't among Home Assistant's media" in missing["error"]["message"]


async def test_spotifys_player_is_for_administrators_once_jukebox_is_signed_in(
    hass,
    hass_ws_client,
    hass_read_only_access_token,
    hass_read_only_user,
    sent,  # noqa: F811
):
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    running = entry.runtime_data
    client = await hass_ws_client(hass)
    assert (await ask(client, HOUSE))["success"]
    assert (await client.receive_json())["event"]["spotify"] is False
    refused = await ask(client, TOKEN)
    assert "isn't signed in to Spotify" in refused["error"]["message"]

    # Signed in. Renewing the sign-in changes the entry's data every hour, which must
    # not start Jukebox again.
    await signed_in(hass)
    assert entry.state is ConfigEntryState.LOADED and entry.runtime_data is running
    assert (await ask(client, TOKEN))["result"] == {"token": "abc", "expires": 9e12}

    # Not for a login that may run a party but isn't an administrator: whoever holds
    # the token can act as the house's Spotify account (hacs/default#14999).
    hosts = entry.options | {CONF_HOSTS: [hass_read_only_user.id]}
    hass.config_entries.async_update_entry(entry, options=hosts)
    await hass.async_block_till_done()
    host = await hass_ws_client(hass, hass_read_only_access_token)
    assert (await ask(host, HOUSE))["success"]
    told = (await host.receive_json())["event"]
    assert (told["me"], told["spotify"]) == ("host", False)
    refused = await ask(host, TOKEN)
    assert "Only an administrator" in refused["error"]["message"]


async def test_reconfigure_signs_jukebox_in_to_spotify(
    hass,
    hass_client_no_auth,
    sent,  # noqa: F811
    aioclient_mock,
    current_request_with_host,
    caplog,
):
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    missing = await entry.start_reconfigure_flow(hass)
    assert (missing["type"], missing["reason"]) == ("abort", "missing_credentials")

    await async_import_client_credential(hass, DOMAIN, ClientCredential("id", "secret"))
    flow = await entry.start_reconfigure_flow(hass)
    assert flow["type"] == "external"
    # Leave to play is what Home Assistant's own Spotify sign-in doesn't ask for.
    assert "scope=streaming+" in flow["url"] and "client_id=id" in flow["url"]

    state = flow["url"].partition("state=")[2].partition("&")[0]
    web = await hass_client_no_auth()
    assert (
        await web.get(f"/auth/external/callback?code=xyz&state={state}")
    ).status == 200
    told = {"access_token": "abc", "refresh_token": "def", "expires_in": 3600}
    aioclient_mock.post("https://accounts.spotify.com/api/token", json=told)
    done = await hass.config_entries.flow.async_configure(flow["flow_id"])
    await hass.async_block_till_done()

    assert (done["type"], done["reason"]) == ("abort", "reconfigure_successful")
    # Home Assistant refuses, from 2026.12, a reload asked for here by an entry with a
    # listener of its own for changes.
    assert "update listener" not in caplog.text
    assert entry.data["token"]["access_token"] == "abc"
    assert len(hass.config_entries.async_entries(DOMAIN)) == 1
