"""Jukebox's parts that need no Home Assistant (pure.py): what an announcement plays, and
following a clip through a speaker's reports."""

from pathlib import Path

from conftest import load_component_file

pure = load_component_file("casa_mia_jukebox", "pure")


def report(*clips):
    return {"audioClips": [{"id": id, "status": status} for id, status in clips]}


def test_an_announcement_plays_its_chime_then_its_sound_then_its_words():
    said = "media-source://tts/tts.voice?message=Dinner%20is%20ready"
    assert pure.clips("/chime.wav", "/bell.mp3", said) == [
        "/chime.wav",
        "/bell.mp3",
        said,
    ]
    assert pure.clips("", "/bell.mp3", "") == ["/bell.mp3"]


def test_a_speakers_address_comes_from_its_devices_link():
    assert pure.address("http://192.0.2.7:1400/support/review") == "192.0.2.7"
    assert pure.address(None) is None


def test_the_speakers_first_report_is_an_old_clip_and_not_ours():
    watch = pure.Watch()
    assert not watch.ready

    # Subscribing answers with the last clip, long done: it must not end ours.
    assert watch.feed(report(("old", "DONE"))) is None
    assert watch.ready
    assert watch.feed(report(("old", "DONE"))) is None

    assert watch.feed(report(("ours", "ACTIVE"))) is None
    assert watch.feed(report(("ours", "DONE"))) == pure.PLAYED


def test_a_clip_cut_off_or_in_error_is_not_played():
    for status, result in (("INTERRUPTED", pure.INTERRUPTED), ("ERROR", pure.FAILED)):
        watch = pure.Watch()
        watch.feed(report())
        assert watch.feed(report(("ours", status))) == result


def test_other_messages_from_the_speaker_are_passed_over():
    watch = pure.Watch()
    assert watch.feed({}) is None
    assert not watch.ready


def test_a_speaker_says_whether_it_can_play_clips():
    assert pure.has_clips({"device": {"capabilities": ["PLAYBACK", "AUDIO_CLIP"]}})
    assert not pure.has_clips({"device": {"capabilities": ["PLAYBACK"]}})


def test_quiet_rooms_dont_make_an_announcement_partial():
    assert pure.summary({"a": pure.PLAYED, "b": pure.QUIET}) == pure.ALL
    assert pure.summary({"a": pure.PLAYED, "b": pure.UNAVAILABLE}) == pure.PARTLY
    assert pure.summary({"a": pure.QUIET}) == pure.NOTHING
    assert pure.summary({"a": pure.NO_ANSWER}) == pure.NOTHING


# ---- The house's music, as the page shows it (house.py) ----

house = load_component_file("casa_mia_jukebox", "house")

KITCHEN, GARDEN, PORCH, SHED = (
    f"media_player.{room}" for room in ("kitchen", "garden", "porch", "shed")
)
RADIO = {"media_title": "A song", "media_channel": "Harbour FM", "volume_level": 0.2}


def test_a_group_is_drawn_once_from_its_coordinator_and_a_lone_idle_room_is_quiet():
    together = {**RADIO, "group_members": [KITCHEN, GARDEN]}
    model = house.house(
        {
            GARDEN: ("Garden", "playing", {**together, "volume_level": 0.31}),
            KITCHEN: ("Kitchen", "playing", together),
            PORCH: ("Porch", "idle", {"group_members": [PORCH]}),
            SHED: ("Shed", "unavailable", {}),
        }
    )

    playing, quiet = model["groups"]
    assert (playing["id"], playing["rooms"]) == (KITCHEN, [KITCHEN, GARDEN])
    assert (playing["state"], playing["kind"]) == ("playing", house.RADIO)
    assert not playing["quiet"]
    assert (quiet["id"], quiet["quiet"], quiet["kind"]) == (PORCH, True, house.NOTHING)

    # Each room keeps its own volume. One that isn't answering is listed, in no group.
    assert model["rooms"][GARDEN] == {
        "name": "Garden",
        "volume": 31,
        "muted": False,
        "available": True,
    }
    assert not model["rooms"][SHED]["available"]
    assert house.group_of(model, GARDEN) is playing
    assert house.group_of(model, SHED) is None


def test_the_players_keep_the_order_the_owner_arranged_them_in():
    def ids(*order):
        playing = {name: (name.title(), "playing", RADIO) for name in "cba"}
        quiet = {"q": ("Quiet", "idle", {})}
        together = {"x": ("X", "playing", {**RADIO, "group_members": ["x", "y"]})}
        follows = {"y": ("Y", "playing", {**RADIO, "group_members": ["x", "y"]})}
        model = house.house({**playing, **quiet, **together, **follows}, order)
        return "".join(group["id"] for group in model["groups"])

    # Left alone: by name, and a quiet room after everything that plays.
    assert ids() == "abcxq"
    # Arranged: those first, in that order. A group stands where the first of its
    # rooms was put, and a room nobody has arranged comes after, by name.
    assert ids("c", "y", "a") == "cxabq"
    assert ids("q", "b") == "bacxq"


def test_what_a_speaker_is_playing_from():
    assert house.kind({"media_title": "A song"}) == house.QUEUE
    assert house.kind(RADIO) == house.RADIO
    assert house.kind({"media_content_id": "x-sonos-htastream:R:spdif"}) == house.TV
    assert house.kind({"media_content_id": "x-rincon-stream:R"}) == house.LINE_IN
    assert house.kind({}) == house.NOTHING


def test_a_groups_one_slider_moves_every_room_by_the_same_amount():
    # The slider shows the average, 20; moved to 30, each room goes up by 10.
    assert house.shifted({KITCHEN: 30, GARDEN: 10}, 30) == {KITCHEN: 40, GARDEN: 20}
    # No room goes below nothing or above full, and one with no volume is left alone.
    assert house.shifted({KITCHEN: 95, GARDEN: 5, SHED: None}, 60) == {
        KITCHEN: 100,
        GARDEN: 15,
    }
    assert house.shifted({SHED: None}, 60) == {}


def test_every_jukebox_card_can_be_edited_without_yaml():
    """A card that doesn't describe its options gets no visual editor in Home Assistant,
    only YAML (owner, 2026-11-24: the Quiet rooms card had none)."""
    cards = Path(__file__).parent.parent / "integration/cards/src/jukebox"
    registered = (cards / "index.ts").read_text().count("\nregister(")
    # Either a form Home Assistant draws, or an editor of the card's own.
    forms = sum(
        (cards / name).read_text().count(f"static {how}()")
        for name in ("card.ts", "micro.ts", "pieces.ts")
        for how in ("getConfigForm", "getConfigElement")
    )
    assert registered == forms == 5


def test_a_speaker_playing_with_no_title_is_not_a_quiet_room():
    """Some streams give neither a title nor a station's name. Playing is playing."""
    bare = {"media_content_id": "aac://stream", "volume_level": 0.3}
    model = house.house({"media_player.den": ("Den", "playing", bare)})
    [group] = model["groups"]
    assert (
        group["kind"] == "radio" and not group["quiet"] and group["state"] == "playing"
    )

    # A station that Home Assistant has no name for is still a station, song or no song.
    assert house.kind({**bare, "media_title": "A song"}, True) == "radio"

    # Anything else playing with no title is a song of a queue, length or no length;
    # the same speaker stopped is quiet.
    assert house.kind({"media_content_id": "x-sonosapi-hls-static:a"}, True) == "queue"
    bare = {"media_content_id": "http://example/clip.mp3"}
    [idle] = house.house({"media_player.den": ("Den", "idle", bare)})["groups"]
    assert idle["kind"] == "nothing" and idle["quiet"]


cover = load_component_file("casa_mia_jukebox", "cover")
SONGS = [
    ("Paper Lanterns (Remastered 2011)", "The Marigolds, A Guest", "/right.jpg"),
    ("Paper Lanterns", "Somebody Else", "/wrong.jpg"),
]


def test_a_stations_song_is_found_on_spotify_whichever_way_round_it_is_named():
    assert cover.cover(("The Marigolds", "Paper Lanterns"), SONGS) == "/right.jpg"
    # A station that sends the two swapped, and one that shouts.
    assert cover.cover(("Paper Lanterns", "The Marigolds"), SONGS) == "/right.jpg"
    assert cover.cover(("THE MARIGOLDS", "PAPER LANTERNS"), SONGS) == "/right.jpg"
    # "Artist - Title" as the title, with no artist.
    assert cover.names("", "The Marigolds - Paper Lanterns") == (
        "The Marigolds",
        "Paper Lanterns",
    )
    # The title alone agreeing isn't enough: a wrong cover is worse than none.
    assert cover.cover(("Velvet Arcade", "Paper Lanterns"), SONGS) is None
    # One name only (a show's, an advert's) is never looked for.
    assert cover.names("", "The Breakfast Show") is None
    assert cover.names("Harbour FM", "  ") is None


def test_a_song_by_two_artists_is_found_however_the_station_joins_their_names():
    both = [("Paper Lanterns", "The Marigolds, VELVET ARCADE", "/both.jpg")]
    for artists in (
        "The Marigolds and Velvet Arcade",
        "The Marigolds & Velvet Arcade",
        "The Marigolds feat. Velvet Arcade",
        "The Marigolds ft Velvet Arcade",
        "The Marigolds featuring Velvet Arcade",
        "The Marigolds x Velvet Arcade",
        "The Marigolds with Velvet Arcade",
        "Velvet Arcade and The Marigolds",  # the other way round
        "The Marigolds",  # the first only
    ):
        assert cover.cover((artists, "Paper Lanterns"), both) == "/both.jpg", artists
    # The station names a guest that Spotify doesn't list.
    alone = [("Paper Lanterns", "The Marigolds", "/alone.jpg")]
    pair = ("The Marigolds feat. Velvet Arcade", "Paper Lanterns")
    assert cover.cover(pair, alone) == "/alone.jpg"
    # A band whose own name has "and" in it, which Spotify writes with a plus.
    tides = [("Low Tide Motel", "Juniper + The Tides", "/tides.jpg")]
    assert (
        cover.cover(("Juniper and the Tides", "Low Tide Motel"), tides) == "/tides.jpg"
    )
    # A band named by a joining word alone is still a name.
    assert (
        cover.cover(("X", "Low Tide Motel"), [("Low Tide Motel", "X", "/x.jpg")])
        == "/x.jpg"
    )
    # Somebody else joined to the right artist is not the same people.
    assert (
        cover.cover(("The Marigolds and Somebody Else", "Paper Lanterns"), both) is None
    )


def test_marks_hyphens_and_apostrophes_dont_stop_a_song_being_found():
    # Spotify's spelling of an artist with a mark the station leaves off.
    marked = [("Paper Lanterns", "MARIGÖLD-Z, Velvet Arcade", "/marked.jpg")]
    pair = ("Marigold-Z feat. Velvet Arcade", "Paper Lanterns")
    assert cover.cover(pair, marked) == "/marked.jpg"
    # A word one side hyphenates and the other doesn't, and an apostrophe.
    broken = [("Un-Break My Lantern", "The Marigolds", "/broken.jpg")]
    assert cover.cover(("The Marigolds", "Unbreak My Lantern"), broken) == "/broken.jpg"
    dont = [("Don't Stop The Lanterns", "The Marigolds", "/dont.jpg")]
    assert cover.cover(("The Marigolds", "Dont Stop The Lanterns"), dont) == "/dont.jpg"
    # A title's own " - " still parts it from what follows.
    live = [("Paper Lanterns - Live", "The Marigolds", "/live.jpg")]
    assert cover.cover(("The Marigolds", "Paper Lanterns"), live) == "/live.jpg"


def test_of_the_records_a_song_is_on_the_artists_own_single_gives_the_cover():
    def on(picture, by, kind, date, title="Paper Lanterns"):
        return (title, "The Marigolds", picture, by, kind, date)

    hits = on("/hits.jpg", "Various Artists", "compilation", "1979")
    best = on("/best-of.jpg", "The Marigolds", "compilation", "1995")
    album = on("/album.jpg", "The Marigolds", "album", "1982-07-02")
    single = on("/single.jpg", "The Marigolds", "single", "1982-10-22")
    live = on("/live.jpg", "The Marigolds", "single", "1981", "Paper Lanterns - Live")
    again = on("/reissue.jpg", "The Marigolds", "single", "2015-03-01")
    pair = ("The Marigolds", "Paper Lanterns")

    def chosen(*songs):
        return cover.cover(pair, songs)

    # The artist's own record before a collection of anyone's, however early.
    assert chosen(hits, best) == "/best-of.jpg"
    # The earliest of the artist's own, and the single before the album.
    assert chosen(hits, best, album) == "/album.jpg"
    assert chosen(hits, best, album, again, single) == "/single.jpg"
    # The song as the station named it before a live one.
    assert chosen(live, album) == "/album.jpg"
    # A song that is only on a collection still has a cover.
    assert chosen(hits) == "/hits.jpg"


tidy = load_component_file("casa_mia_jukebox", "tidy")


def a_song(title, artist="", album="", track=None):
    return {"title": title, "artist": artist, "album": album, "track": track}


def test_a_playlist_is_sorted_by_title_artist_or_album_and_can_be_put_back():
    songs = [
        a_song("10 Last", "Velvet Arcade", "Neon", 2),
        a_song("2 second", "The Marigolds", "Harbour Lights", 9),
        a_song("Borrowed", "the marigolds", "Harbour Lights", 1),
        a_song("1 First", "Velvet Arcade", "Neon", 1),
    ]
    # A number in a title is counted, not spelt: 1, 2, 10.
    assert tidy.order(songs, "title") == [3, 1, 0, 2]
    # Within an album, by track number; capitals make no difference.
    assert tidy.order(songs, "album") == [2, 1, 3, 0]
    assert tidy.order(songs, "artist") == [2, 1, 3, 0]

    # Applying an order and then its inverse leaves the list as it was.
    def apply(order, things):
        return [things[n] for n in order]

    new = tidy.order(songs, "title")
    assert apply(tidy.inverse(new), apply(new, "abcd")) == list("abcd")


def test_a_new_order_is_asked_of_the_speaker_a_few_songs_at_a_time():
    def speaker(now, tracks, places):
        """As a real speaker does it: the songs named land at their places, and the
        rest keep the order they had."""
        moved = [now[t] for t in tracks]
        rest = [x for n, x in enumerate(now) if n not in tracks]
        out = []
        for place in range(len(now)):
            out.append(moved.pop(0) if place in places else rest.pop(0))
        return out

    order = [6, 2, 5, 0, 1, 4, 3]
    now = list(range(7))
    asked = list(tidy.steps(order, each=3))
    for tracks, places in asked:
        assert places == sorted(places)  # a speaker refuses places that don't rise
        now = speaker(now, tracks, places)
    assert now == order and len(asked) == 2  # the last few were already in place
    # Nothing is asked for a list already in order.
    assert list(tidy.steps([0, 1, 2])) == []


def test_songs_that_are_in_a_playlist_twice_are_found_and_the_first_kept():
    assert tidy.repeats(["a", "b", "a", "c", "b", "a", ""]) == [2, 4, 5]
