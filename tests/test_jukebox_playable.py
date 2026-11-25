"""What a phone can play of what a speaker lists, and where a library song's file is
among Home Assistant's media (Jukebox's playable.py, which needs no Home Assistant)."""

from conftest import load_component_file

playable = load_component_file("casa_mia_jukebox", "playable")

SONG = {"title": "Paper Lanterns", "artist": "The Marigolds", "album": "Harbour Lights"}
SONG |= {"duration": 194, "picture": "/getaa?u=1", "source": "library", "track": 3}


def test_a_spotify_thing_is_known_however_its_address_is_written():
    # As a speaker lists a song, as Home Assistant's search names an album, and bare.
    sonos = "x-sonos-spotify:spotify%3atrack%3a4uLU6hMCjMI75M1A2tKUQC?sid=9&flags=8224"
    assert playable.spotify(sonos) == ("track", "spotify:track:4uLU6hMCjMI75M1A2tKUQC")
    found = playable.spotify("spotify://0123abc/spotify:album:1a2B3c")
    assert found == ("album", "spotify:album:1a2B3c")
    assert playable.spotify("x-rincon-cpcontainer:1006206cspotify%3aplaylist%3a9zY")
    assert playable.spotify("x-file-cifs://nas.example/music/spotify.mp3") is None


def test_a_phone_plays_spotify_and_library_songs_and_no_other_services():
    file = "x-file-cifs://nas.example/music/a.mp3"
    assert playable.track(SONG | {"address": file}) == {
        "title": "Paper Lanterns",
        "artist": "The Marigolds",
        "album": "Harbour Lights",
        "duration": 194,
        "picture": "/getaa?u=1",
        "source": "library",
        "uri": file,
    }
    streamed = SONG | {"address": "x-sonos-spotify:spotify%3atrack%3a4uLU?sid=9"}
    assert playable.track(streamed)["uri"] == "spotify:track:4uLU"
    # An album of Spotify's is no song, and another service's song can't be played.
    album = "x-rincon-cpcontainer:1004206cspotify%3aalbum%3a1a2B"
    assert playable.track(SONG | {"address": album}) is None
    assert playable.track(SONG | {"address": "x-sonos-http:song%3a123.mp4"}) is None


def test_a_stations_web_address_comes_from_the_speakers_or_from_tunein():
    held = "x-rincon-mp3radio://https://streams.example/harbour.mp3"
    assert playable.direct(held) == "https://streams.example/harbour.mp3"
    assert playable.direct("x-rincon-mp3radio://streams.example/h") == (
        "http://streams.example/h"
    )
    assert playable.direct("x-sonosapi-stream:s1234?sid=254") is None
    assert playable.tunein("x-sonosapi-stream:s1234?sid=254&flags=8224") == "s1234"
    assert playable.tunein("x-rincon-mp3radio://streams.example/h") is None


def test_of_tuneins_streams_one_every_phone_plays_is_chosen():
    hls = {"url": "https://streams.example/h.m3u8", "media_type": "hls"}
    mp3 = {"url": "http://streams.example/h.pls", "media_type": "mp3"}
    assert playable.chosen([hls, mp3 | {"is_direct": False}]) == (mp3["url"], False)
    assert playable.chosen([hls]) == (hls["url"], True)
    assert playable.chosen([]) is None and playable.chosen("no such station") is None


def test_a_stations_list_gives_its_first_stream():
    pls = "[playlist]\nNumberOfEntries=2\nFile1=http://a.example/one\nFile2=http://b\n"
    assert playable.listed(pls) == "http://a.example/one"
    assert playable.listed("#EXTM3U\n#EXTINF:-1,Harbour FM\nhttps://a.example/h\n") == (
        "https://a.example/h"
    )
    assert playable.listed("<html>not a list</html>") is None


def test_a_library_songs_file_is_found_among_the_media_once(tmp_path):
    media = tmp_path / "media"
    song = media / "tunes" / "The Marigolds" / "Paper Lanterns.mp3"
    song.parent.mkdir(parents=True)
    song.touch()
    dirs = {"local": str(media), "gone": str(tmp_path / "not there")}
    known: dict = {}

    # The share "music" is mounted under a name of the owner's choosing, "tunes".
    address = "x-file-cifs://nas.example/music/The%20Marigolds/Paper%20Lanterns.mp3"
    where = ("local", "tunes/The Marigolds/Paper Lanterns.mp3")
    assert playable.placed(dirs, address, known) == where
    assert known == {"nas.example/music": ("local", "tunes")}

    # Then the share isn't looked for again: only the file is.
    (media / "decoy" / "The Marigolds").mkdir(parents=True)
    (media / "decoy" / "The Marigolds" / "Paper Lanterns.mp3").touch()
    assert playable.placed(dirs, address, known) == where
    missing = "x-file-cifs://nas.example/music/The%20Marigolds/Gone.mp3"
    assert playable.placed(dirs, missing, known) is None


def test_a_share_mounted_whole_is_found_by_its_own_name(tmp_path):
    song = tmp_path / "nas" / "music" / "a.mp3"
    song.parent.mkdir(parents=True)
    song.touch()
    found = playable.placed(
        {"local": str(tmp_path)}, "x-file-cifs://nas.example/music/a.mp3", {}
    )
    assert found == ("local", "nas/music/a.mp3")


def test_an_address_that_climbs_out_of_its_share_is_never_looked_for(tmp_path):
    (tmp_path / "secret.txt").touch()
    (tmp_path / "media").mkdir()
    dirs = {"local": str(tmp_path / "media")}
    for path in ("../secret.txt", "a/../../secret.txt", ""):
        address = f"x-file-cifs://nas.example/music/{path}"
        assert playable.placed(dirs, address, {}) is None
    assert playable.placed(dirs, "x-file-cifs://nas.example", {}) is None
