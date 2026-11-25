"""Love it or Loathe it's stations that are one of a player's own sources (a speaker's
favourites): put on with select_source, by name, so the speaker plays it as it plays the
favourite, with its name and picture. A station given by its address is put on bare. The
helpers are the main file's."""

from datetime import timedelta

from custom_components.casa_mia_love_or_loathe import trail
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    async_fire_time_changed,
    async_mock_service,
)

from test_love_or_loathe import (
    HOME,
    JAZZ,
    PLAYER,
    XMAS,
    Page,
    a_group,
    a_station,
    add,
    play,
    settled,
)

# What a speaker says of itself: its favourites, and the channel it is on, to which a
# Sonos adds the name of the show.
FAVOURITES = {"source_list": ["Line-in", "Harbour FM", "Jazz Cellar"]}
ON_HARBOUR = {**HOME, **FAVOURITES, "media_channel": "Harbour FM • Breakfast"}
ON_JAZZ = {**JAZZ, **FAVOURITES, "media_channel": "Jazz Cellar"}
JAZZ_CELLAR = {"media_content_id": "Jazz Cellar", "media_content_type": "source"}
HARBOUR_FM = {"media_content_id": "Harbour FM", "media_content_type": "source"}


async def test_a_favourite_is_put_on_by_name_and_gone_back_to_by_name(hass, freezer):
    entry, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
        a_station("Jazz", JAZZ_CELLAR),
    )
    chosen = async_mock_service(hass, "media_player", "select_source")

    play(hass, "Last Christmas", "Wham!", **ON_HARBOUR)
    await settled(hass)
    assert [c.data for c in chosen] == [{"entity_id": PLAYER, "source": "Jazz Cellar"}]

    # Where it was is one of its favourites too, so that is how it goes back.
    play(hass, "A Jazz Tune", "A Trio", **ON_JAZZ)
    await settled(hass)
    freezer.tick(timedelta(minutes=5, seconds=1))
    async_fire_time_changed(hass, dt_util.utcnow())
    await settled(hass)
    assert chosen[-1].data == {"entity_id": PLAYER, "source": "Harbour FM"}
    assert not calls["play_media"]
    assert trail.lines(hass, entry)[-1]["text"] == "Switched back to Harbour FM"


async def test_a_favourite_already_on_is_not_the_one_switched_to(hass):
    _, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
        a_station("Harbour", HARBOUR_FM),
        a_station("Jazz", JAZZ_CELLAR),
    )
    chosen = async_mock_service(hass, "media_player", "select_source")

    play(hass, "Last Christmas", "Wham!", **ON_HARBOUR)
    await settled(hass)
    assert [c.data["source"] for c in chosen] == ["Jazz Cellar"]


async def test_a_player_on_no_favourite_goes_back_by_its_address(hass, freezer):
    _, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
        a_station("Jazz", JAZZ),
    )

    # Its channel is none of its sources: as before, the address it reports.
    play(hass, "Last Christmas", "Wham!", **HOME, **FAVOURITES, media_channel="Other")
    await settled(hass)
    play(hass, "A Jazz Tune", "A Trio", **ON_JAZZ)
    await settled(hass)
    freezer.tick(timedelta(minutes=5, seconds=1))
    async_fire_time_changed(hass, dt_util.utcnow())
    await settled(hass)
    assert [c.data for c in calls["play_media"]] == [
        {"entity_id": PLAYER, **JAZZ},
        {"entity_id": PLAYER, **HOME},
    ]


async def test_the_page_is_told_the_favourites_and_which_one_is_on(
    hass, hass_ws_client
):
    await add(hass)
    page = Page(hass, await hass_ws_client(hass))
    play(hass, "Something Ordinary", "A Band", **ON_HARBOUR)

    (shown,) = (await page.open())["entries"]
    assert shown["sources"] == ["Line-in", "Harbour FM", "Jazz Cellar"]
    assert shown["playing"][PLAYER]["source"] == "Harbour FM"
