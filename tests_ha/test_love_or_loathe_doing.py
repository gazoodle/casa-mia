"""Love it or Loathe it's account of each player (the Last match sensor's `players`):
what was last done to it, why, and whether that is still in force; and the skip of a
loathed song that is one of a queue. The helpers are the main file's."""

from homeassistant.components.media_player import MediaPlayerEntityFeature
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
    async_mock_service,
)

from test_love_or_loathe import EVENT, PLAYER, SENSOR, XMAS, a_group, add, play, settled

# A song of a queue, as a player reports one: it has a length and can be skipped.
QUEUED = {
    "media_duration": 200,
    "supported_features": MediaPlayerEntityFeature.NEXT_TRACK,
}


def doing(hass):
    return hass.states.get(SENSOR).attributes["players"].get(PLAYER)


async def test_each_player_says_what_was_done_why_and_whether_it_still_holds(hass):
    await add(hass, a_group("Christmas", patterns=XMAS))
    assert doing(hass) is None

    # Told before the speaker is asked, so a change is never mistaken for a person's.
    seen = []
    hass.services.async_remove("media_player", "volume_mute")

    async def mute(call):
        seen.append(doing(hass))

    hass.services.async_register("media_player", "volume_mute", mute)

    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    assert seen[0]["now"] is True and seen[0]["did"] == ""
    said = doing(hass)
    assert said["did"] == "Muted until the next track"
    assert said["why"] == "Last Christmas by Wham! is in Christmas (loathe)"
    assert said["because"] == (
        "“Last Christmas” by Wham! is in the loathed group “Christmas”"
    )
    assert said["now"] is True and said["at"]

    # The next track: unmuted, and nothing is said of the mute under a song it wasn't
    # for (owner, 2026-11-25).
    play(hass, "Something Ordinary", "A Band", is_volume_muted=True)
    await settled(hass)
    assert doing(hass) is None


async def test_a_loathed_song_in_a_queue_is_skipped_and_a_stations_is_not(hass):
    _, calls = await add(hass, a_group("Christmas", patterns=XMAS))
    skips = async_mock_service(hass, "media_player", "media_next_track")
    events = async_capture_events(hass, EVENT)

    play(hass, "Last Christmas", "Wham!", **QUEUED)
    await settled(hass)
    assert [call.data["entity_id"] for call in skips] == [PLAYER]
    assert not calls["volume_mute"]
    assert events[0].data["action"] == "skip"
    assert doing(hass)["did"] == "Skipped to the next song"
    assert doing(hass)["now"] is False  # nothing to put back

    # The song it skipped to plays because of the skip, so the skip is still told
    # through it, and no longer at the song after.
    play(hass, "Something Ordinary", "A Band")
    await settled(hass)
    assert doing(hass)["did"] == "Skipped to the next song"
    play(hass, "Something Else", "A Band")
    await settled(hass)
    assert doing(hass) is None

    # The same song from a station can't be skipped: muted, as the group says.
    play(hass, "Last Christmas", "Wham!", **QUEUED, media_channel="Harbour FM")
    await settled(hass)
    assert len(skips) == 1 and len(calls["volume_mute"]) == 1


async def test_a_group_that_turns_the_volume_down_does_not_skip(hass):
    quieter = {"action": "volume", "amount": -50}
    _, calls = await add(hass, a_group("Christmas", patterns=XMAS, **quieter))
    skips = async_mock_service(hass, "media_player", "media_next_track")

    play(hass, "Last Christmas", "Wham!", **QUEUED)
    await settled(hass)
    assert not skips and len(calls["volume_set"]) == 1


async def test_a_queue_of_nothing_but_loathed_songs_is_not_skipped_round_for_ever(hass):
    _, calls = await add(hass, a_group("Adverts", patterns="Advert*"))
    skips = async_mock_service(hass, "media_player", "media_next_track")

    for n in range(7):
        play(hass, f"Advert {n}", **QUEUED)
        await settled(hass)
    # Five skipped; the sixth is muted, and the count starts again after it.
    assert len(skips) == 6 and len(calls["volume_mute"]) >= 1


async def test_a_skip_the_player_refuses_falls_back_to_the_groups_action(hass):
    _, calls = await add(hass, a_group("Christmas", patterns=XMAS))

    async def refuse(call):
        raise HomeAssistantError("no next song")

    hass.services.async_register("media_player", "media_next_track", refuse)
    play(hass, "Last Christmas", "Wham!", **QUEUED)
    await settled(hass)
    assert len(calls["volume_mute"]) == 1
    assert doing(hass)["did"] == (
        "Could not skip (no next song): muted until the next track"
    )
    assert doing(hass)["now"] is True
