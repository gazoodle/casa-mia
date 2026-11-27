"""A queue that Jukebox replaced or cleared, put back (undo.py), inside a real Home
Assistant. The speaker is the party tests' stand-in, which keeps a queue, its playlists
and the song it is at."""

import pytest
from custom_components.casa_mia_jukebox import undo, upnp
from custom_components.casa_mia_jukebox.page import DO, FEED
from test_jukebox_page import ask, sent  # noqa: F401  (sent is a fixture)
from test_jukebox_party import Speaker, house  # noqa: F401  (house is a fixture)

from test_jukebox import KITCHEN

SONG = {"media_content_id": "x-file-cifs://nas.example/a.mp3"}
# What the stand-in media player refuses to play (the `sent` fixture).
BROKEN = {"media_content_id": "broken"}


@pytest.fixture
async def room(hass, hass_ws_client, sent, aioclient_mock):  # noqa: F811
    """The kitchen's speaker with three songs queued, at 1:05 into the second, and the
    page asking things of it."""

    class Room:
        speaker = Speaker(aioclient_mock)

        @staticmethod
        async def do(action, **data):
            return await ask(client, DO, action=action, entity_id=KITCHEN, **data)

        @staticmethod
        def offered():
            """Whether the page is told the queue can be put back."""
            groups = hass.data[FEED].model()["groups"]
            return next(g for g in groups if KITCHEN in g["rooms"])["undo"]

    Room.speaker.rel = "0:01:05"
    client = await hass_ws_client(hass)
    return Room


def as_it_was(speaker):
    return (speaker.queue, speaker.song, speaker.rel, speaker.playing) == (
        ["a", "b", "c"],
        2,
        "0:01:05",
        True,
    )


async def test_a_cleared_queue_is_put_back_at_the_song_it_was_on(hass, room):
    speaker = room.speaker
    assert not room.offered()

    # Cleared, with a copy kept first, under Jukebox's own name for it; and the page
    # is told it can be put back.
    assert (await room.do("queue_clear"))["success"]
    assert speaker.queue == [] and room.offered()
    [(name, songs)] = speaker.saved.values()
    assert name.startswith(upnp.UNDO) and songs == ["a", "b", "c"]

    # Put back: the same songs, at the song and the place it was, playing; the copy
    # gone, and no longer offered.
    assert (await room.do("queue_back"))["success"]
    await hass.async_block_till_done()
    assert as_it_was(speaker)
    assert speaker.saved == {} and not room.offered()

    # Only once.
    again = await room.do("queue_back")
    assert not again["success"] and "any more" in again["error"]["message"]


async def test_a_replaced_queue_can_be_put_back_only_for_a_while(
    hass, room, monkeypatch
):
    room.speaker.playing = False
    monkeypatch.setattr(undo, "FOR", 0)

    replaced = await room.do(
        "play_media", enqueue="replace", media_content_type="track", **SONG
    )
    assert replaced["success"]

    # The time is up: the copy is deleted, and there is nothing to put back or offer.
    await hass.async_block_till_done()
    assert room.speaker.saved == {} and not room.offered()
    late = await room.do("queue_back")
    assert not late["success"] and "any more" in late["error"]["message"]


async def test_a_queue_that_cant_be_kept_is_left_as_it_is(room):
    speaker = room.speaker
    speaker.refuses = {"SaveQueue"}

    refused = await room.do("queue_clear")
    assert not refused["success"]
    assert "left as it is" in refused["error"]["message"]
    assert speaker.queue == ["a", "b", "c"] and not room.offered()
    assert "RemoveAllTracksFromQueue" not in speaker.asked

    # An empty queue has nothing to keep, and nothing is offered back.
    speaker.refuses, speaker.queue = set(), []
    assert (await room.do("queue_clear"))["success"]
    assert speaker.saved == {} and not room.offered()


async def test_a_replacing_that_fails_part_way_puts_the_queue_back_itself(hass, room):
    """Whoever asked sees only the failure, so the queue must not be left empty."""
    speaker = room.speaker

    # The queue is emptied, and then what was to play in its place is refused.
    failed = await room.do(
        "play_media", enqueue="replace", media_content_type="track", **BROKEN
    )
    assert not failed["success"]
    assert "RemoveAllTracksFromQueue" in speaker.asked
    assert failed["error"]["message"] == (
        "the speaker refused it. The queue was put back as it was."
    )
    await hass.async_block_till_done()
    assert as_it_was(speaker)
    assert speaker.saved == {} and not room.offered()


async def test_a_queue_that_couldnt_be_put_back_is_still_kept_and_offered(hass, room):
    speaker = room.speaker

    # The replacing fails, and so does loading the copy back: the queue is empty, the
    # copy is still kept, and the page still offers it.
    speaker.refuses = {"AddURIToQueue"}
    failed = await room.do(
        "play_media", enqueue="replace", media_content_type="track", **BROKEN
    )
    assert not failed["success"]
    assert "couldn't be put back either" in failed["error"]["message"]
    assert speaker.queue == [] and len(speaker.saved) == 1 and room.offered()

    # Asked for from the page while the speaker still refuses: said, and still offered.
    assert not (await room.do("queue_back"))["success"]
    assert len(speaker.saved) == 1 and room.offered()

    # The speaker answers again: the queue is back where it was.
    speaker.refuses = set()
    assert (await room.do("queue_back"))["success"]
    await hass.async_block_till_done()
    assert as_it_was(speaker)
    assert speaker.saved == {} and not room.offered()


async def test_no_copy_is_left_in_sonos_when_home_assistant_stops(hass, room):
    assert (await room.do("queue_clear"))["success"]
    assert len(room.speaker.saved) == 1

    hass.data[FEED].undo.stop_all()
    await hass.async_block_till_done()
    assert room.speaker.saved == {}


async def test_a_queue_put_back_during_a_party_is_jukeboxs_own_change(
    hass,
    house,  # noqa: F811
):
    """A host clears the party's queue and puts it back: the lock takes neither for a
    guest's change, and guards the queue as it was put back."""
    speaker = house.speaker
    assert (await house.do("queue_clear"))["success"]
    house.watch["changed"]()
    await house.settled()
    assert speaker.queue == [] and not house.party.undone

    assert (await house.do("queue_back"))["success"]
    house.watch["changed"]()
    await house.settled()
    assert speaker.queue == ["a", "b", "c"] and not house.party.undone

    # A guest's change afterwards is put back to that queue.
    speaker.queue = ["a", "c"]
    house.watch["changed"]()
    await house.settled()
    assert speaker.queue == ["a", "b", "c"] and len(house.party.undone) == 1
