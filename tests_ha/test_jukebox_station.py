"""A station that Home Assistant has no name or picture for: Jukebox asks the speaker,
once for each stream. The speakers are the page tests' stand-ins."""

import re

from custom_components.casa_mia_jukebox.find import Covers
from custom_components.casa_mia_jukebox.page import DO, HOUSE
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
    aioclient_mock,
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

    await a_spotify(hass, monkeypatch, aioclient_mock, search)
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
    # Asked for three ways at once (cover.searches), the best of them all taken.
    assert asked == [
        ('track:"the marigolds" artist:"paper lanterns"', ["track"]),
        ('track:"paper lanterns" artist:"the marigolds"', ["track"]),
        ("paper lanterns the marigolds", ["track"]),
    ]
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
    assert (await once("Paper Lanterns"))["cover"] and len(asked) == 3


async def test_a_song_spotify_didnt_answer_for_is_looked_for_again_when_asked(
    hass,
    hass_ws_client,
    sent,  # noqa: F811
    monkeypatch,
    aioclient_mock,
):
    asked = []

    async def search(query, kinds, limit):
        asked.append(query)
        # The first time the song is looked for, none of its three searches answers.
        if len(asked) <= 3:
            raise TimeoutError("no answer")
        album = {"images": [{"url": "https://covers.example/lanterns.jpg"}]}
        song = {
            "name": "Paper Lanterns",
            "artists": [{"name": "The Marigolds"}],
            "uri": "spotify:track:lanterns",
        }
        return {"tracks": {"items": [song | {"album": album}]}}

    await a_spotify(hass, monkeypatch, aioclient_mock, search)
    station = {
        "group_members": [KITCHEN, GARDEN],
        "media_channel": "Harbour FM",
        "entity_picture": "/logo.png",
        "media_title": "Paper Lanterns",
        "media_artist": "The Marigolds",
    }
    hass.states.async_set(KITCHEN, "playing", station)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": HOUSE})

    async def told(wanted):
        """The next thing the page is sent that `wanted` picks out."""
        while True:
            if (found := wanted(await client.receive_json())) is not None:
                return found

    def group(message):
        return message.get("event", {}).get("groups", [None])[0]

    # Spotify didn't answer: the page has the reason, and it isn't asked at each change.
    failed = await told(
        lambda m: g if (g := group(m)) and "didn't answer" in g["unfound"] else None
    )
    assert failed["found"] is None
    hass.states.async_set(KITCHEN, "playing", station | {"volume_level": 0.2})
    hass.states.async_set(KITCHEN, "playing", station)
    await hass.async_block_till_done()
    assert len(asked) == 3

    # Someone presses Add to a playlist: it is asked once more, and what is found is
    # pushed to the page.
    await client.send_json_auto_id(
        {"type": DO, "action": "song_find", "entity_id": KITCHEN}
    )
    answer = await told(
        lambda m: m.get("result") if m.get("type") == "result" else None
    )
    assert answer == {"asking": True}
    found = await told(lambda m: (g := group(m)) and g["found"])
    assert found["uri"] == "spotify:track:lanterns" and len(asked) == 6

    # A song that is found isn't looked for again.
    await client.send_json_auto_id(
        {"type": DO, "action": "song_find", "entity_id": KITCHEN}
    )
    answer = await told(
        lambda m: m.get("result") if m.get("type") == "result" else None
    )
    assert answer == {"asking": False} and len(asked) == 6


def a_catalogue(*songs):
    """Spotify's search over a few songs, behaving as it was measured to on the
    owner's box (2026-11-26), so that what Jukebox asks is tested with what it makes
    of the answer:

    - asked with `track:"…" artist:"…"`, it sends the songs whose title holds every
      word of the one and whose artists hold every word of the other;
    - asked for plain words, it sends the songs that hold the most of them in their
      title and artists, its own order among equals: a karaoke version, whose title
      names the song and its artists, comes before the song itself.
    """

    def words(text):
        return re.findall(r"\w+", text.lower())

    def by(song):
        return " ".join(artist["name"] for artist in song["artists"])

    async def search(query, kinds, limit):
        filtered = re.fullmatch(r'track:"(.*)" artist:"(.*)"', query)
        if filtered:
            title, artist = (set(words(asked)) for asked in filtered.groups())
            found = [
                song
                for song in songs
                if title <= set(words(song["name"])) and artist <= set(words(by(song)))
            ]
        else:
            asked = set(words(query))
            found = sorted(
                songs,
                key=lambda song: -len(asked & set(words(f"{song['name']} {by(song)}"))),
            )
        return {"tracks": {"items": found[:limit]}}

    return search


def a_record(name, artists, uri, by, kind, date):
    """One of Spotify's songs, on a record of this kind by these artists."""
    return {
        "name": name,
        "artists": [{"name": artist} for artist in artists],
        "uri": uri,
        "album": {
            "images": [{"url": f"https://covers.example/{uri}.jpg"}],
            "artists": [{"name": by}],
            "album_type": kind,
            "release_date": date,
        },
    }


async def test_a_song_with_a_guest_artist_is_found_past_the_karaoke_versions_of_it(
    hass,
    sent,  # noqa: F811  (Jukebox, whose sign-in searches Spotify)
    monkeypatch,
    aioclient_mock,
    caplog,
):
    caplog.set_level("INFO")
    # Owner's box, 2026-11-26: this song had no cover. Spotify has more karaoke
    # versions of it than one search sends songs, and lists them first.
    song, pair = "This Is What You Came For", ["Calvin Harris", "Rihanna"]
    karaoke = [
        a_record(
            f"{song} (Originally Performed by Calvin Harris feat. Rihanna)",
            [f"Karaoke Band {n}"],
            f"karaoke-{n}",
            f"Karaoke Band {n}",
            "single",
            "2016",
        )
        for n in range(12)
    ]
    hits = a_record(song, pair, "hits", "Various Artists", "compilation", "2016-06-01")
    remix = a_record(f"{song} - Extended Mix", pair, "remix", pair[0], "single", "2016")
    own = a_record(song, pair, "own", pair[0], "single", "2016-04-29")
    await a_spotify(
        hass, monkeypatch, aioclient_mock, a_catalogue(*karaoke, hits, remix, own)
    )
    covers = Covers(hass, lambda: None)

    async def found(artist, title):
        covers.of(artist, title)
        await hass.async_block_till_done(wait_background_tasks=True)
        return covers.of(artist, title)

    # However the station names the two artists, and whichever way round it gives
    # the song's two names: the artist's own single, not a collection or a remix.
    for artist in (
        "Calvin Harris feat. Rihanna",
        "Calvin Harris & Rihanna",
        "Calvin Harris and Rihanna",
        "Calvin Harris",
    ):
        assert (await found(artist, song)).uri == "own", artist
        assert (await found(f"{song} (Radio Edit)", artist)).uri == "own", artist

    # A song Spotify hasn't got: the log names what it sent, so the reason can be seen.
    assert await found("Calvin Harris", "Paper Lanterns") == Covers.NOT_FOUND
    assert "none of 10 songs is it (" in caplog.text
    assert "by 'Karaoke Band 0'" in caplog.text
