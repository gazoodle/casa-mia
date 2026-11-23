"""Love it or Loathe it's volume change when a player's reported volume runs behind what
it was just set to, as a real speaker's does: the stand-in services here never change the
state, so every report is as late as it can be. The helpers are the main file's."""

from test_love_or_loathe import a_group, add, play, settled

ADVERTS = {"action": "volume", "amount": -50, "patterns": "Advert*"}


def levels(calls):
    return [c.data["volume_level"] for c in calls["volume_set"]]


async def test_one_loathed_song_after_another_starts_from_the_volume_put_back(hass):
    _, calls = await add(hass, a_group("Adverts", **ADVERTS))

    play(hass, "Advert One")
    await settled(hass)
    assert levels(calls) == [0.2]

    # The next is loathed too. The volume is put back to 40% and halved from there, not
    # from the 20% the player still reports.
    play(hass, "Advert Two", volume_level=0.2)
    await settled(hass)
    play(hass, "Advert Three", volume_level=0.2)
    await settled(hass)
    assert levels(calls) == [0.2, 0.4, 0.2, 0.4, 0.2]

    play(hass, "Something Ordinary", "A Band", volume_level=0.2)
    await settled(hass)
    assert levels(calls)[-1] == 0.4 and len(levels(calls)) == 6


async def test_a_save_while_a_song_is_turned_down_does_not_turn_it_down_twice(hass):
    entry, calls = await add(hass, a_group("Adverts", **ADVERTS))
    play(hass, "Advert One")
    await settled(hass)
    play(hass, "Advert One", volume_level=0.2)

    # A group saved or a song rated starts it again: put back, then judged afresh.
    await hass.config_entries.async_reload(entry.entry_id)
    await settled(hass)
    assert levels(calls) == [0.2, 0.4, 0.2]


async def test_a_volume_not_yet_reported_as_changed_is_still_put_back(hass):
    _, calls = await add(hass, a_group("Adverts", **ADVERTS))
    play(hass, "Advert One")
    await settled(hass)

    # The next track comes before the player has reported the 20% it was set to.
    play(hass, "Something Ordinary", "A Band", volume_level=0.4)
    await settled(hass)
    assert levels(calls) == [0.2, 0.4]
