"""Love it or Loathe it's return from another station, when it can't be made at its time:
the player isn't there yet after a restart, is paused, or refuses the call. The return is
kept until the player has been switched back (CLAUDE.md RULE FIVE), and made when it next
plays. The helpers are the main file's."""

from datetime import timedelta

from custom_components.casa_mia_love_or_loathe import trail
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from test_love_or_loathe import (
    HOME,
    JAZZ,
    PLAYER,
    ROCK,
    SENSOR,
    XMAS,
    a_group,
    a_station,
    add,
    play,
    settled,
)


async def away(hass, freezer, **options):
    """A player switched from Home to Jazz, with five minutes to go."""
    entry, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
        a_station("Jazz", JAZZ),
        **options,
    )
    play(hass, "Last Christmas", "Wham!", **HOME)
    await settled(hass)
    play(hass, "A Jazz Tune", "A Trio", **JAZZ)
    await settled(hass)
    calls["play_media"].clear()

    async def five_minutes():
        freezer.tick(timedelta(minutes=5, seconds=1))
        async_fire_time_changed(hass, dt_util.utcnow())
        await settled(hass)

    return entry, calls, five_minutes


def said(hass, entry):
    return trail.lines(hass, entry)[-1]["text"]


async def test_a_return_due_over_a_restart_waits_for_the_player(hass, freezer):
    entry, calls, _ = await away(hass, freezer)

    # Home Assistant is down when the time comes, and the player's integration has not
    # reported it yet when this one starts.
    assert await hass.config_entries.async_unload(entry.entry_id)
    hass.states.async_remove(PLAYER)
    freezer.tick(timedelta(minutes=6))
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert PLAYER in hass.states.get(SENSOR).attributes["away"]
    async_fire_time_changed(hass, dt_util.utcnow())
    await settled(hass)
    assert not calls["play_media"]
    assert PLAYER in hass.states.get(SENSOR).attributes["away"]
    assert said(hass, entry) == "Not playing: switching back when it next plays"

    # It turns up, still on the other station: back now.
    play(hass, "Another Jazz Tune", "A Trio", **JAZZ)
    await settled(hass)
    assert [c.data for c in calls["play_media"]] == [{"entity_id": PLAYER, **HOME}]
    assert hass.states.get(SENSOR).attributes["away"] == {}


async def test_a_paused_player_goes_back_when_it_plays_again(hass, freezer):
    entry, calls, five_minutes = await away(hass, freezer)

    play(hass, "A Jazz Tune", "A Trio", state="paused", **JAZZ)
    await five_minutes()
    assert not calls["play_media"]

    # The same song goes on: no new track, but the return is made.
    play(hass, "A Jazz Tune", "A Trio", **JAZZ)
    await settled(hass)
    assert [c.data for c in calls["play_media"]] == [{"entity_id": PLAYER, **HOME}]
    assert said(hass, entry) == "Switched back to radio://home"


async def test_a_paused_player_started_on_something_else_is_left_alone(hass, freezer):
    entry, calls, five_minutes = await away(hass, freezer)
    play(hass, "A Jazz Tune", "A Trio", state="paused", **JAZZ)
    await five_minutes()

    play(hass, "A Rock Tune", "A Band", **ROCK)
    await settled(hass)
    assert not calls["play_media"]
    assert hass.states.get(SENSOR).attributes["away"] == {}


async def test_a_player_someone_put_back_is_not_switched_again(hass, freezer):
    entry, calls, five_minutes = await away(hass, freezer)

    play(hass, "Something Ordinary", "A Band", **HOME)
    await settled(hass)
    await five_minutes()
    assert not calls["play_media"]
    assert hass.states.get(SENSOR).attributes["away"] == {}
    assert said(hass, entry) == "Already back on radio://home"


async def test_a_switch_back_that_fails_is_tried_again_at_the_next_track(hass, freezer):
    entry, calls, five_minutes = await away(hass, freezer)

    def refuse(call):
        raise HomeAssistantError("the speaker did not answer")

    hass.services.async_register("media_player", "play_media", refuse)
    await five_minutes()
    assert PLAYER in hass.states.get(SENSOR).attributes["away"]
    assert said(hass, entry) == (
        "Could not switch back: the speaker did not answer. "
        "Trying again at the next track"
    )

    back = []
    hass.services.async_register("media_player", "play_media", back.append)
    play(hass, "Another Jazz Tune", "A Trio", **JAZZ)
    await settled(hass)
    assert [c.data for c in back] == [{"entity_id": PLAYER, **HOME}]
    assert hass.states.get(SENSOR).attributes["away"] == {}
