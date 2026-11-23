"""Jukebox's parts that need no Home Assistant (pure.py): what an announcement plays, and
following a clip through a speaker's reports."""

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
