"""Jukebox's parts that need no Home Assistant (pure.py): what an announcement plays, and
following a clip through a speaker's reports."""

from pathlib import Path

from conftest import load_component_file

pure = load_component_file("casa_mia_jukebox", "pure")


def report(*clips):
    return {"audioClips": [{"id": id, "status": status} for id, status in clips]}


def test_an_announcement_plays_its_chime_then_its_sound_then_its_words():
    assert pure.clips("/chime.wav", "", "Dinner is ready", "tts.voice") == [
        "/chime.wav",
        "media-source://tts/tts.voice?message=Dinner%20is%20ready",
    ]
    assert pure.clips("", "/bell.mp3", "", "") == ["/bell.mp3"]


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
    forms = sum(
        (cards / name).read_text().count("static getConfigForm()")
        for name in ("card.ts", "pieces.ts")
    )
    assert registered == forms == 4


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

    # Something with a length and no title is a song; the same speaker stopped is quiet.
    song = {"media_content_id": "x-file-cifs://nas/a.mp3", "media_duration": 200}
    assert house.kind(song, True) == "queue"
    bare = {"media_content_id": "http://example/clip.mp3"}
    [idle] = house.house({"media_player.den": ("Den", "idle", bare)})["groups"]
    assert idle["kind"] == "nothing" and idle["quiet"]
