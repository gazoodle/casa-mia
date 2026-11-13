"""Love it or Loathe it inside a real Home Assistant: its set-up screens, and what it
does to a player when a song comes on. The players are states set by hand, and the
media_player services are caught, so each test says what the player then reports."""

from datetime import timedelta

import pytest
from custom_components.casa_mia_love_or_loathe.const import DOMAIN, EVENT
from custom_components.casa_mia_love_or_loathe.pure import libraries
from homeassistant.config_entries import (
    SOURCE_USER,
    ConfigEntryState,
    ConfigSubentryData,
)
from homeassistant.core import Context
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import ServiceValidationError
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
XMAS = "\n".join(libraries()["christmas"]["patterns"])


def a_group(title, feeling="loathe", action="mute", amount=10, minutes=5, **data):
    """A group whose two actions are the same, so a test says only what matters to it."""
    act = {"action": action, "amount": amount, "minutes": minutes}
    data = {"feeling": feeling, "patterns": "", "love": act, "loathe": act, **data}
    return ConfigSubentryData(
        data=data, subentry_type="group", title=title, unique_id=None
    )


async def feel(hass, select, feeling):
    await hass.services.async_call(
        "select",
        "select_option",
        {"entity_id": select, "option": feeling},
        blocking=True,
    )
    await settled(hass)


def a_station(title, media):
    return ConfigSubentryData(
        data={"media": media}, subentry_type="station", title=title, unique_id=None
    )


def play(hass, title, artist="", entity=PLAYER, state="playing", **attributes):
    attributes = {"volume_level": 0.4, **attributes}
    if title:
        attributes |= {"media_title": title, "media_artist": artist}
    hass.states.async_set(entity, state, attributes)


async def add(hass, *subentries, players=(PLAYER,), title="Love it or Loathe it"):
    """Set up with a player already on an unremarkable song; the services it would be
    sent, by name."""
    play(hass, "Something Ordinary", "A Band", **HOME)
    calls = {
        name: async_mock_service(hass, "media_player", name)
        for name in ("volume_set", "volume_mute", "play_media")
    }
    entry = MockConfigEntry(
        domain=DOMAIN,
        title=title,
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

    async def set_up(name, players):
        flow = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        return await hass.config_entries.flow.async_configure(
            flow["flow_id"], {"name": name, "players": players, "delay": 0}
        )

    made = await set_up("Downstairs", [PLAYER, "media_player.hall"])
    assert made["type"] is FlowResultType.CREATE_ENTRY
    entry = made["result"]
    assert entry.title == "Downstairs" and len(entry.options["players"]) == 2
    await hass.async_block_till_done()

    # A second entry, for players that want different treatment; not a player twice.
    assert (await set_up("Upstairs", [PLAYER]))["errors"] == {"players": "player_taken"}
    upstairs = await set_up("Upstairs", ["media_player.landing"])
    assert upstairs["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    async def subentry(kind, *answers):
        step = await hass.config_entries.subentries.async_init(
            (entry.entry_id, kind), context={"source": SOURCE_USER}
        )
        for answer in answers:
            step = await hass.config_entries.subentries.async_configure(
                step["flow_id"], answer
            )
        return step

    # Starting from the shipped list puts its songs in the box, and its name.
    start = await subentry("group", {"library": "christmas"})
    assert start["step_id"] == "songs"
    offered = {
        key.schema: key.description["suggested_value"]
        for key in start["data_schema"].schema
        if key.description
    }
    assert offered == {"name": "Christmas songs", "patterns": XMAS}

    switch = {"action": "switch", "amount": 10, "minutes": 5}
    group = {
        "name": "Christmas",
        "feeling": "loathe",
        "patterns": XMAS,
        "love": {"action": "volume", "amount": 10, "minutes": 5},
        "loathe": switch,
    }
    # Nowhere to switch to yet, and a pattern that would match everything.
    empty = {"library": "empty"}
    assert (await subentry("group", empty, group))["errors"] == {"base": "no_stations"}
    refused = await subentry("group", empty, {**group, "patterns": "*"})
    assert refused["errors"] == {"patterns": "bad_pattern"}

    station = await subentry(
        "station", {"name": "Jazz", "media": {**JAZZ, "entity_id": PLAYER}}
    )
    assert station["type"] is FlowResultType.CREATE_ENTRY
    made = await subentry("group", empty, group)
    assert made["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    kept = {s.subentry_type: s for s in entry.subentries.values()}
    assert kept["station"].data == {"media": JAZZ}  # not the player it was browsed on
    assert kept["group"].title == "Christmas"
    assert kept["group"].data["patterns"] == XMAS  # the group's own songs now
    assert kept["group"].data["loathe"] == switch
    assert hass.states.get("select.downstairs_christmas").state == "loathe"

    # Changing it goes straight to the form, shows what it holds, and saves over it.
    flow = await hass.config_entries.subentries.async_init(
        (entry.entry_id, "group"),
        context={"source": "reconfigure", "subentry_id": kept["group"].subentry_id},
    )
    assert flow["step_id"] == "songs"
    saved = await hass.config_entries.subentries.async_configure(
        flow["flow_id"], {**group, "name": "Too soon", "patterns": "*xmas*"}
    )
    assert saved["reason"] == "reconfigure_successful"
    [changed] = [s for s in entry.subentries.values() if s.subentry_type == "group"]
    assert (changed.title, changed.data["patterns"]) == ("Too soon", "*xmas*")

    # Home Assistant saves its registries a little later: let that happen in the test.
    async_fire_time_changed(
        hass, dt_util.utcnow() + timedelta(minutes=1), fire_all=True
    )
    await hass.async_block_till_done()


async def test_a_group_from_before_b5_is_converted(hass):
    """2026.11.7-b2 kept a shipped list's name on the group, not its songs; to b4 a
    group had a fixed kind, one action and a switch."""
    old = ConfigSubentryData(
        data={
            "kind": "loathe",
            "library": "christmas",
            "patterns": "My Own Song",
            "action": "mute",
            "amount": 10,
            "minutes": 7,
        },
        subentry_type="group",
        title="Christmas",
        unique_id=None,
    )
    entry, calls = await add(hass, old)
    [group] = entry.subentries.values()
    assert group.data == {
        "feeling": "loathe",
        "patterns": f"{XMAS}\nMy Own Song",
        "love": {"action": "volume", "amount": 10, "minutes": 5},
        "loathe": {"action": "mute", "amount": 10, "minutes": 7},
    }
    assert hass.states.get("select.love_it_or_loathe_it_christmas").state == "loathe"

    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    assert len(calls["volume_mute"]) == 1


async def test_a_loathed_song_is_muted_until_the_next_track(hass):
    _, calls = await add(hass, a_group("Christmas", patterns=XMAS))
    events = async_capture_events(hass, EVENT)

    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    [mute] = calls["volume_mute"]
    assert mute.data == {"entity_id": PLAYER, "is_volume_muted": True}
    [event] = events
    assert event.data["group"] == "Christmas" and event.data["feeling"] == "loathe"
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


async def test_a_song_already_playing_is_acted_on_when_its_list_is_saved(hass):
    entry, calls = await add(hass, a_group("Mine", patterns="Some Other Song"))
    [group] = entry.subentries.values()
    play(hass, "Dreadful Song", "A Band")
    await settled(hass)
    assert not calls["volume_mute"]

    # Added to the list while it plays: muted at the save, not at the next track.
    hass.config_entries.async_update_subentry(
        entry, group, data={**group.data, "patterns": "Dreadful Song"}
    )
    await settled(hass)
    assert [c.data["is_volume_muted"] for c in calls["volume_mute"]] == [True]


async def test_the_same_songs_loved_loathed_or_ignored_as_the_select_says(hass):
    """One list, treated as its feeling says now: Christmas songs in November, in
    December and in January."""
    xmas = ConfigSubentryData(
        data={
            "feeling": "loathe",
            "patterns": XMAS,
            "love": {"action": "volume", "amount": 10, "minutes": 5},
            "loathe": {"action": "mute", "amount": 0, "minutes": 5},
        },
        subentry_type="group",
        title="Christmas",
        unique_id=None,
    )
    entry, calls = await add(hass, xmas)
    select = "select.love_it_or_loathe_it_christmas"
    assert er.async_get(hass).async_get(select).config_entry_id == entry.entry_id

    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    assert len(calls["volume_mute"]) == 1 and not calls["volume_set"]

    # Loved from now: the song that is on is unmuted and turned up, at once.
    play(hass, "Last Christmas", "Wham!", is_volume_muted=True)
    await feel(hass, select, "love")
    assert hass.states.get(select).state == "love"
    assert calls["volume_mute"][1].data["is_volume_muted"] is False
    assert calls["volume_set"][0].data["volume_level"] == 0.44

    # Ignored: put back, and the next one is left alone.
    play(hass, "Last Christmas", "Wham!", volume_level=0.44)
    await feel(hass, select, "ignore")
    assert calls["volume_set"][1].data["volume_level"] == 0.4
    play(hass, "White Christmas", "Bing Crosby")
    await settled(hass)
    assert len(calls["volume_mute"]) == 2 and len(calls["volume_set"]) == 2


async def test_a_loved_song_is_turned_up_and_put_back_unless_someone_moved_it(hass):
    loved = a_group("Mine", feeling="love", action="volume", patterns="Good Song")
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


async def test_a_song_loved_by_name_is_kept_from_a_loathed_star(hass):
    _, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS),
        a_group("Keep", feeling="love", action="event", patterns="Last Christmas"),
        a_group("Stars", feeling="love", action="event", patterns="*white*"),
    )
    events = async_capture_events(hass, EVENT)

    # Named outright in a loved group, which beats the other's *christmas*.
    play(hass, "Last Christmas", "Wham!")
    await settled(hass)
    assert events[0].data["group"] == "Keep" and not calls["volume_mute"]
    # A star in each: the loved group has it, though the loathed one was made first.
    play(hass, "White Christmas", "Bing Crosby")
    await settled(hass)
    assert events[1].data["group"] == "Stars" and not calls["volume_mute"]


async def test_rating_the_song_playing_into_a_persons_groups(hass):
    hass.states.async_set("person.ann", "home", {"user_id": "ann-login"})
    hass.states.async_set("person.ben", "home", {"user_id": "ben-login"})
    entry, calls = await add(
        hass,
        a_group("Ann loves", feeling="love", action="event", person="person.ann"),
        a_group("Ann loathes", person="person.ann", patterns="Old Song\n*awful*"),
        a_group("Ben loathes", person="person.ben"),
    )

    def songs(title):
        [group] = [g for g in entry.subentries.values() if g.title == title]
        return group.data["patterns"]

    async def rate(feeling, login=None, **more):
        await hass.services.async_call(
            DOMAIN,
            "rate",
            {"entity_id": PLAYER, "feeling": feeling, **more},
            blocking=True,
            context=Context(user_id=login),
        )
        await settled(hass)

    # Whoever pressed: Ann loathes it, and it is muted at once.
    play(hass, "Dreadful Song", "A Band")
    await settled(hass)
    await rate("loathe", "ann-login")
    assert songs("Ann loathes") == "Old Song\n*awful*\nDreadful Song | A Band"
    assert songs("Ben loathes") == ""
    assert [c.data["is_volume_muted"] for c in calls["volume_mute"]] == [True]
    # Pressed twice, it is there once.
    await rate("loathe", "ann-login")
    assert songs("Ann loathes").count("Dreadful Song") == 1

    # She changes her mind: out of the one, into the other. Her star stays.
    await rate("love", "ann-login")
    assert songs("Ann loves") == "Dreadful Song | A Band"
    assert songs("Ann loathes") == "Old Song\n*awful*"

    # A wall tablet is nobody's login: the person is named. An ignored group is
    # still Ben's loathed list.
    await feel(hass, "select.love_it_or_loathe_it_ben_loathes", "ignore")
    await rate("loathe", "the-tablet", person="person.ben")
    assert songs("Ben loathes") == "Dreadful Song | A Band"

    # Refused, with the reason: nobody's login, no such group, not a watched player.
    for login, more, reason in (
        ("the-tablet", {}, "belongs to no person"),
        ("ben-login", {"feeling": "love"}, "has no love group"),
        ("ann-login", {"entity_id": "media_player.shed"}, "is not a player"),
    ):
        with pytest.raises(ServiceValidationError, match=reason):
            await rate(more.pop("feeling", "loathe"), login, **more)


async def test_a_switch_of_station_and_back_when_its_minutes_are_up(hass, freezer):
    _, calls = await add(
        hass,
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
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
        a_group("Christmas", patterns=XMAS, action="switch", minutes=5),
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
        hass, a_group("Christmas", patterns=XMAS), players=(PLAYER, other)
    )

    members = [PLAYER, other]
    play(hass, "Last Christmas", "Wham!", group_members=members)
    play(hass, "Last Christmas", "Wham!", entity=other, group_members=members)
    await settled(hass)
    assert [c.data["entity_id"] for c in calls["volume_mute"]] == [PLAYER]

    play(hass, "", entity=other)
    await settled(hass)
    assert hass.states.get(SENSOR).attributes["no_titles"] == [other]
