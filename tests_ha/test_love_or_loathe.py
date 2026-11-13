"""Love it or Loathe it inside a real Home Assistant: its set-up screens, and what it
does to a player when a song comes on. The players are states set by hand, and the
media_player services are caught, so each test says what the player then reports."""

from datetime import timedelta

from custom_components.casa_mia_love_or_loathe.const import DOMAIN, EVENT
from homeassistant.config_entries import (
    SOURCE_USER,
    ConfigEntryState,
    ConfigSubentryData,
)
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
    async_fire_time_changed,
    async_mock_service,
)

PLAYER = "media_player.kitchen"
SENSOR = "sensor.love_it_or_loathe_it_last_match"
HOME = {"media_content_id": "radio://home", "media_content_type": "music"}
JAZZ = {"media_content_id": "radio://jazz", "media_content_type": "music"}
ROCK = {"media_content_id": "radio://rock", "media_content_type": "music"}


def a_group(title, **data):
    data = {"kind": "loathe", "action": "mute", "amount": 10, "minutes": 5, **data}
    return ConfigSubentryData(
        data=data, subentry_type="group", title=title, unique_id=None
    )


def a_station(title, media):
    return ConfigSubentryData(
        data={"media": media}, subentry_type="station", title=title, unique_id=None
    )


def play(hass, title, artist="", entity=PLAYER, state="playing", **attributes):
    attributes = {"volume_level": 0.4, **attributes}
    if title:
        attributes |= {"media_title": title, "media_artist": artist}
    hass.states.async_set(entity, state, attributes)


async def add(hass, *subentries, players=(PLAYER,)):
    """Set up with a player already on an unremarkable song; the services it would be
    sent, by name."""
    play(hass, "Something Ordinary", "A Band", **HOME)
    calls = {
        name: async_mock_service(hass, "media_player", name)
        for name in ("volume_set", "volume_mute", "play_media")
    }
    entry = MockConfigEntry(
        domain=DOMAIN,
        options={"players": list(players), "delay": 0},
        subentries_data=list(subentries),
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    return entry, calls


async def settled(hass):
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_set_up_then_a_station_and_a_group_from_its_page(hass):
    hass.states.async_set(PLAYER, "idle")
    flow = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    made = await hass.config_entries.flow.async_configure(
        flow["flow_id"], {"players": [PLAYER], "delay": 0}
    )
    assert made["type"] is FlowResultType.CREATE_ENTRY
    entry = made["result"]
    await hass.async_block_till_done()

    async def subentry(kind, answers):
        flow = await hass.config_entries.subentries.async_init(
            (entry.entry_id, kind), context={"source": SOURCE_USER}
        )
        return await hass.config_entries.subentries.async_configure(
            flow["flow_id"], answers
        )

    group = {
        "name": "Christmas",
        "kind": "loathe",
        "library": "christmas",
        "action": "switch",
        "amount": 10,
        "minutes": 5,
    }
    # Nowhere to switch to yet, and a pattern that would match everything.
    assert (await subentry("group", group))["errors"] == {"action": "no_stations"}
    refused = await subentry("group", {**group, "action": "mute", "patterns": "*"})
    assert refused["errors"] == {"patterns": "bad_pattern"}

    station = await subentry(
        "station", {"name": "Jazz", "media": {**JAZZ, "entity_id": PLAYER}}
    )
    assert station["type"] is FlowResultType.CREATE_ENTRY
    assert (await subentry("group", group))["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    kept = {s.subentry_type: s for s in entry.subentries.values()}
    assert kept["station"].data == {"media": JAZZ}  # not the player it was browsed on
    assert kept["group"].title == "Christmas"
    assert hass.states.get("switch.love_it_or_loathe_it_christmas").state == "on"

    # Changing it shows what it holds, and saves over it.
    flow = await hass.config_entries.subentries.async_init(
        (entry.entry_id, "group"),
        context={"source": "reconfigure", "subentry_id": kept["group"].subentry_id},
    )
    saved = await hass.config_entries.subentries.async_configure(
        flow["flow_id"], {**group, "name": "Too soon", "minutes": 10}
    )
    assert saved["reason"] == "reconfigure_successful"
    [changed] = [s for s in entry.subentries.values() if s.subentry_type == "group"]
    assert (changed.title, changed.data["minutes"]) == ("Too soon", 10)

    # Home Assistant saves its registries a little later: let that happen in the test.
    async_fire_time_changed(
        hass, dt_util.utcnow() + timedelta(minutes=1), fire_all=True
    )
    await hass.async_block_till_done()


async def test_a_loathed_song_is_muted_until_the_next_track(hass):
    _, calls = await add(hass, a_group("Christmas", library="christmas"))
    events = async_capture_events(hass, EVENT)

    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    [mute] = calls["volume_mute"]
    assert mute.data == {"entity_id": PLAYER, "is_volume_muted": True}
    [event] = events
    assert event.data["group"] == "Christmas" and event.data["kind"] == "loathe"
    assert event.data["result"] == "muted until the next track"
    last = hass.states.get(SENSOR)
    assert last.state == "Last Christmas by Wham!"
    assert last.attributes["entity_id"] == PLAYER

    # The mute alone is no new track; the next song is, and it is unmuted for it.
    play(hass, "Last Christmas", "Wham!", is_volume_muted=True)
    await settled(hass)
    assert len(calls["volume_mute"]) == 1
    play(hass, "Something Ordinary", "A Band", is_volume_muted=True)
    await settled(hass)
    assert calls["volume_mute"][1].data["is_volume_muted"] is False
    assert len(events) == 1


async def test_a_loved_song_is_turned_up_and_put_back_unless_someone_moved_it(hass):
    loved = a_group("Mine", kind="love", action="volume", patterns="Good Song")
    _, calls = await add(hass, loved)

    play(hass, "Good Song", "A Band")
    await settled(hass)
    assert calls["volume_set"][0].data["volume_level"] == 0.44
    play(hass, "Something Ordinary", "A Band", volume_level=0.44)
    await settled(hass)
    assert calls["volume_set"][1].data["volume_level"] == 0.4

    # Turned down by hand during the song: that is where it stays.
    play(hass, "Good Song", "A Band")
    await settled(hass)
    play(hass, "Something Ordinary", "A Band", volume_level=0.2)
    await settled(hass)
    assert len(calls["volume_set"]) == 3


async def test_a_group_switched_off_and_a_song_loved_by_name(hass):
    entry, calls = await add(
        hass,
        a_group("Christmas", library="christmas"),
        a_group("Keep", kind="love", action="event", patterns="Fairytale of New York"),
    )
    events = async_capture_events(hass, EVENT)

    # Named in a group of its own, so the shipped list doesn't have it.
    play(hass, "Fairytale of New York", "The Pogues")
    await settled(hass)
    assert events[0].data["group"] == "Keep" and not calls["volume_mute"]

    switch = "switch.love_it_or_loathe_it_christmas"
    assert er.async_get(hass).async_get(switch).config_entry_id == entry.entry_id
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch}, blocking=True
    )
    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    assert not calls["volume_mute"] and len(events) == 1

    # Left off, it is still off after a reload.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(switch).state == "off"


async def test_a_switch_of_station_and_back_when_its_minutes_are_up(hass, freezer):
    _, calls = await add(
        hass,
        a_group("Christmas", library="christmas", action="switch", minutes=5),
        a_station("Home", HOME),
        a_station("Jazz", JAZZ),
        a_station("Rock", ROCK),
    )

    # On Home, so Jazz is the first to try; it is playing one too, so on to Rock.
    play(hass, "Last Christmas", "Wham!", **HOME)
    await settled(hass)
    assert calls["play_media"][0].data == {"entity_id": PLAYER, **JAZZ}
    play(hass, "White Christmas", "Bing Crosby", **JAZZ)
    await settled(hass)
    assert calls["play_media"][1].data == {"entity_id": PLAYER, **ROCK}
    # Every station tried: this one is muted where it is.
    play(hass, "Merry Xmas Everybody", "Slade", **ROCK)
    await settled(hass)
    assert len(calls["play_media"]) == 2 and len(calls["volume_mute"]) == 1
    assert PLAYER in hass.states.get(SENSOR).attributes["away"]

    # Five minutes from the first switch, back to where it was.
    freezer.tick(timedelta(minutes=5, seconds=1))
    async_fire_time_changed(hass, dt_util.utcnow())
    await settled(hass)
    assert calls["play_media"][2].data == {"entity_id": PLAYER, **HOME}
    assert hass.states.get(SENSOR).attributes["away"] == {}


async def test_no_switching_back_over_a_persons_own_choice(hass, freezer):
    entry, calls = await add(
        hass,
        a_group("Christmas", library="christmas", action="switch", minutes=5),
        a_station("Jazz", JAZZ),
    )

    async def away():
        play(hass, "Something Ordinary", "A Band", **HOME)
        await settled(hass)
        play(hass, "Last Christmas", "Wham!", **HOME)
        await settled(hass)
        play(hass, "A Jazz Tune", "A Trio", **JAZZ)
        await settled(hass)
        calls["play_media"].clear()

    async def five_minutes():
        freezer.tick(timedelta(minutes=5, seconds=1))
        async_fire_time_changed(hass, dt_util.utcnow())
        await settled(hass)

    # Someone picks another station while it is away.
    await away()
    play(hass, "A Rock Tune", "A Band", **ROCK)
    await settled(hass)
    await five_minutes()
    assert not calls["play_media"]

    # Someone stops it while it is away.
    await away()
    play(hass, "", state="paused")
    await five_minutes()
    assert not calls["play_media"]

    # A restart while away loses nothing: the return is kept, and still made.
    await away()
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await five_minutes()
    assert calls["play_media"][0].data == {"entity_id": PLAYER, **HOME}


async def test_only_a_groups_leader_acts_and_a_player_with_no_title_is_named(hass):
    other = "media_player.hall"
    play(hass, "Something Ordinary", "A Band", entity=other)
    _, calls = await add(
        hass, a_group("Christmas", library="christmas"), players=(PLAYER, other)
    )

    members = [PLAYER, other]
    play(hass, "Last Christmas", "Wham!", group_members=members)
    play(hass, "Last Christmas", "Wham!", entity=other, group_members=members)
    await settled(hass)
    assert [c.data["entity_id"] for c in calls["volume_mute"]] == [PLAYER]

    play(hass, "", entity=other)
    await settled(hass)
    assert hass.states.get(SENSOR).attributes["no_titles"] == [other]
