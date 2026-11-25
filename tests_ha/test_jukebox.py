"""Jukebox's announcements inside a real Home Assistant. The speakers are stand-ins:
entities registered as Sonos's, a `play_media` that records what it was sent, and a
speaker's own reports (speaker.py) answered here, as measured on real ones."""

import asyncio
from contextlib import asynccontextmanager

import pytest
from custom_components.casa_mia_jukebox import announce, speaker, volume_id
from custom_components.casa_mia_jukebox.const import CHIME, DOMAIN, EVENT
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
)

KITCHEN, GARDEN = "media_player.kitchen", "media_player.garden"
VOICE = "media-source://tts/tts.voice?message="


class Speakers:
    """Every stand-in speaker's end: what it was sent and when each clip ended."""

    def __init__(self):
        self.log = []
        self.about = {"householdId": "h", "playerId": "p"}
        self.about["device"] = {"capabilities": ["AUDIO_CLIP"]}
        # Clips end at once unless a test holds them.
        self.playing = asyncio.Event()
        self.playing.set()

    async def info(self, session, host):
        return self.about

    @asynccontextmanager
    async def listening(self, session, host, about):
        async def ended():
            await self.playing.wait()
            self.log.append("ended")
            return "played"

        yield ended

    async def play_media(self, call):
        self.log.append(
            (call.data["entity_id"], call.data["media_content_id"], call.data["extra"])
        )

    @property
    def sent(self):
        return [entry for entry in self.log if entry != "ended"]


@pytest.fixture
def speakers(hass, monkeypatch):
    speakers = Speakers()
    monkeypatch.setattr(speaker, "info", speakers.info)
    monkeypatch.setattr(speaker, "listening", speakers.listening)
    hass.services.async_register("media_player", "play_media", speakers.play_media)
    return speakers


def a_player(hass, entity_id, platform="sonos", state="playing"):
    owner = MockConfigEntry(domain=platform)
    owner.add_to_hass(hass)
    name = entity_id.split(".")[1]
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=owner.entry_id,
        identifiers={(platform, name)},
        name=name.title(),
        configuration_url="http://192.0.2.7:1400/support/review",
    )
    er.async_get(hass).async_get_or_create(
        "media_player", platform, name, suggested_object_id=name, device_id=device.id
    )
    hass.states.async_set(entity_id, state)


async def add(hass, **options):
    for player in (KITCHEN, GARDEN):
        a_player(hass, player)
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Jukebox",
        options={"players": [KITCHEN, GARDEN], "tts": "tts.voice", **options},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def settle():
    """Lets held announcements run as far as they can. Not async_block_till_done: it
    would wait for the very clips a test is holding."""
    for _ in range(20):
        await asyncio.sleep(0)


async def say(hass, **data):
    return await hass.services.async_call(
        DOMAIN,
        "announce",
        {"message": "Dinner", **data},
        blocking=True,
        return_response=True,
    )


async def test_a_chime_then_the_words_in_each_room_at_its_own_volume(hass, speakers):
    entry = await add(hass)
    events = async_capture_events(hass, EVENT)
    number = er.async_get(hass).async_get_entity_id(
        "number", DOMAIN, volume_id(entry, GARDEN)
    )
    await hass.services.async_call(
        "number", "set_value", {"entity_id": number, "value": 40}, blocking=True
    )

    answer = await say(hass)

    assert [clip for clip in speakers.sent if clip[0] == KITCHEN] == [
        (KITCHEN, CHIME, {"volume": 25}),
        (KITCHEN, VOICE + "Dinner", {"volume": 25}),
    ]
    assert [clip[2] for clip in speakers.sent if clip[0] == GARDEN] == [
        {"volume": 40}
    ] * 2
    assert answer["result"] == "played"
    assert answer["rooms"] == {
        KITCHEN: {"result": "played"},
        GARDEN: {"result": "played"},
    }

    # The same goes out as the event, and shows on the sensor.
    await hass.async_block_till_done()
    assert events[0].data["rooms"] == answer["rooms"]
    last = hass.states.get("sensor.jukebox_last_announcement")
    assert last.state == "played"
    assert last.attributes["rooms"] == {"Kitchen": "played", "Garden": "played"}


async def test_the_actions_volume_and_no_chime(hass, speakers):
    await add(hass)
    await say(hass, players=[KITCHEN], chime=False, volume=12)
    assert speakers.sent == [(KITCHEN, VOICE + "Dinner", {"volume": 12})]


async def test_quiet_hours_keep_all_but_a_priority_announcement_back(hass, speakers):
    await add(hass, quiet="schedule.night")
    hass.states.async_set("schedule.night", "on")

    answer = await say(hass, players=[KITCHEN])
    assert answer["rooms"][KITCHEN] == {"result": "quiet_hours"}
    assert answer["result"] == "nothing" and speakers.sent == []

    answer = await say(hass, players=[KITCHEN], priority=True)
    assert answer["result"] == "played" and len(speakers.sent) == 2


async def test_a_room_that_cant_play_says_why_and_the_others_still_do(hass, speakers):
    await add(hass)
    a_player(hass, "media_player.porch", state="unavailable")
    a_player(hass, "media_player.shed", platform="cast")

    answer = await say(
        hass, players=[KITCHEN, "media_player.porch", "media_player.shed"]
    )

    assert answer["result"] == "partly"
    assert answer["rooms"]["media_player.porch"] == {"result": "unavailable"}
    assert answer["rooms"]["media_player.shed"] == {"result": "not_sonos"}
    assert {clip[0] for clip in speakers.sent} == {KITCHEN}
    assert hass.states.get("sensor.jukebox_last_announcement").state == "partly"


async def test_a_speaker_with_no_audio_clips_is_refused_and_sent_nothing(
    hass, speakers
):
    await add(hass)
    speakers.about["device"]["capabilities"] = ["PLAYBACK"]  # as a Sonos S1 speaker

    answer = await say(hass, players=[KITCHEN])

    assert answer["rooms"][KITCHEN]["result"] == "no_audio_clips"
    assert "S1" in answer["rooms"][KITCHEN]["reason"]
    assert speakers.sent == []


async def test_a_speaker_that_doesnt_answer_is_a_result_not_an_error(
    hass, speakers, monkeypatch
):
    await add(hass)

    async def silent(session, host):
        raise TimeoutError

    monkeypatch.setattr(speaker, "info", silent)
    answer = await say(hass, players=[KITCHEN])
    assert answer["rooms"][KITCHEN]["result"] == "no_answer"
    assert speakers.sent == []


async def test_a_second_announcement_waits_for_the_first_to_end(hass, speakers):
    await add(hass)
    speakers.playing.clear()

    first = asyncio.create_task(say(hass, players=[KITCHEN], chime=False))
    second = asyncio.create_task(
        say(hass, players=[KITCHEN], chime=False, message="Pudding")
    )
    await settle()

    # Only the first has been sent: sending the second now would cut it off.
    assert speakers.log == [(KITCHEN, VOICE + "Dinner", {"volume": 25})]

    speakers.playing.set()
    assert (await first)["result"] == "played"
    assert (await second)["result"] == "played"
    assert [e if e == "ended" else e[1] for e in speakers.log] == [
        VOICE + "Dinner",
        "ended",
        VOICE + "Pudding",
        "ended",
    ]


async def test_an_announcement_kept_waiting_too_long_is_dropped(
    hass, speakers, monkeypatch
):
    await add(hass)
    monkeypatch.setattr(announce, "TURN", 0.01)
    speakers.playing.clear()

    first = asyncio.create_task(say(hass, players=[KITCHEN], chime=False))
    await settle()
    answer = await say(hass, players=[KITCHEN], chime=False, message="The door")

    assert answer["rooms"][KITCHEN]["result"] == "too_late"
    speakers.playing.set()
    await first
    assert len(speakers.sent) == 1


async def test_what_the_action_refuses(hass, speakers):
    with pytest.raises(ServiceValidationError):  # not set up
        await say(hass)

    entry = await add(hass)
    with pytest.raises(ServiceValidationError):  # nothing to play
        await say(hass, message=" ")

    hass.config_entries.async_update_entry(entry, options={"players": [KITCHEN]})
    await hass.async_block_till_done()
    with pytest.raises(ServiceValidationError):  # words, and no voice to say them
        await say(hass)
    assert (await say(hass, message="", media="/bell.mp3"))["result"] == "played"


async def test_a_room_taken_out_takes_its_volume_with_it(hass, speakers):
    entry = await add(hass)
    registry = er.async_get(hass)
    assert registry.async_get_entity_id("number", DOMAIN, volume_id(entry, GARDEN))

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "players": [KITCHEN]}
    )
    await hass.async_block_till_done()

    assert not registry.async_get_entity_id("number", DOMAIN, volume_id(entry, GARDEN))
    assert registry.async_get_entity_id("number", DOMAIN, volume_id(entry, KITCHEN))
