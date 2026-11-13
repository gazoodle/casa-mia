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


async def add(
    hass, *subentries, players=(PLAYER,), title="Love it or Loathe it", **options
):
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
        options={"players": list(players), "delay": 0, **options},
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
        screens=["the-tablet"],
    )
    # People who had a group before the entry said who may rate are the ones who may.
    assert entry.options["raters"] == ["person.ann", "person.ben"]

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

    # Ben has no loved group yet: his first loved song makes it, and it is his.
    await rate("love", "ben-login")
    assert songs("Loved by ben") == "Dreadful Song | A Band"
    assert songs("Ben loathes") == ""
    [made] = [g for g in entry.subentries.values() if g.title == "Loved by ben"]
    assert (made.data["feeling"], made.data["person"]) == ("love", "person.ben")
    assert hass.states.get("select.love_it_or_loathe_it_loved_by_ben").state == "love"

    # Refused, with the reason, and nothing is made: nobody's login, a name that is
    # no person, not a watched player.
    groups = len(entry.subentries)
    for login, more, reason in (
        ("the-tablet", {}, "belongs to no person"),
        ("the-tablet", {"person": "person.nobody"}, "is not one of the people"),
        ("the-tablet", {"person": PLAYER}, "is not one of the people"),
        # A guest's login may not rate as someone else, though that someone may rate.
        ("a-guest", {"person": "person.ann"}, "may not rate for someone else"),
        ("ann-login", {"entity_id": "media_player.shed"}, "is not a player"),
    ):
        with pytest.raises(ServiceValidationError, match=reason):
            await rate("loathe", login, **more)
    assert len(entry.subentries) == groups


async def test_a_song_heard_too_often_is_the_groups_too(hass, freezer):
    often = a_group("Heard too often", repeats={"times": 3, "hours": 4})
    entry, calls = await add(
        hass, often, a_group("Loved", "love", "event", patterns="Agadoo")
    )
    events = async_capture_events(hass, EVENT)

    fillers = iter(range(100))

    async def hear(title, after=30):
        """The song, half an hour after the last; "" for one never heard before."""
        freezer.tick(timedelta(minutes=after))
        title = title or f"Filler {next(fillers)}"
        play(hass, title, "A Band")
        await settled(hass)

    # Twice is not three times, and the same play judged afresh is not another.
    await hear("Round Again")
    await hear("")
    await hear("Round Again")
    await hass.config_entries.async_reload(entry.entry_id)
    await settled(hass)
    assert not calls["volume_mute"]

    # The third time in four hours it is muted, and the event says why.
    await hear("")
    await hear("Round Again")
    assert [c.data["is_volume_muted"] for c in calls["volume_mute"]] == [True]
    assert (events[-1].data["group"], events[-1].data["repeats"]) == (
        "Heard too often",
        3,
    )

    # A song a group names is treated as that group says, however often it comes.
    for _ in range(3):
        await hear("Agadoo")
        await hear("")
    assert events[-1].data["group"] == "Loved" and events[-1].data["repeats"] == 0

    # Four hours on, the early plays no longer count: it is the first again.
    await hear("Round Again", after=300)
    assert events[-1].data["group"] == "Loved"

    # A restart of Home Assistant keeps what was played.
    await hear("")
    await hear("Round Again")
    await hass.config_entries.async_reload(entry.entry_id)
    await settled(hass)
    await hear("")
    await hear("Round Again")
    assert (events[-1].data["title"], events[-1].data["repeats"]) == ("Round Again", 3)


async def test_the_notify_blueprint_is_installed(hass):
    await add(hass)
    await settled(hass)
    assert (
        "Notify on Love it or Loathe it"
        in open(
            hass.config.path(
                "blueprints/automation/casa_mia/love_or_loathe_notify.yaml"
            )
        ).read()
    )


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


# --- the page's commands (admin.py) ---------------------------------------------------


class Page:
    """The page's end of the websocket: its feed, and its changes."""

    def __init__(self, hass, ws):
        self.hass, self.ws, self.n = hass, ws, 1

    async def open(self):
        await self.ws.send_json({"id": 1, "type": f"{DOMAIN}/view"})
        assert (await self.ws.receive_json())["success"]
        self.last = (await self.ws.receive_json())["event"]
        return self.last

    async def view(self):
        """The view as last pushed, once everything has settled."""
        await settled(self.hass)
        self.n += 1
        await self.ws.send_json({"id": self.n, "type": "ping"})
        while (msg := await self.ws.receive_json())["type"] != "pong":
            self.last = msg["event"]
        return self.last

    async def change(self, command, entry, /, **fields):
        """Its error's words if it is refused, else None."""
        self.n += 1
        await self.ws.send_json(
            {
                "id": self.n,
                "type": f"{DOMAIN}/{command}",
                "entry_id": entry.entry_id,
                **fields,
            }
        )
        while (msg := await self.ws.receive_json())["type"] != "result":
            self.last = msg["event"]
        return None if msg["success"] else msg["error"]["message"]


MUTES = {"action": "mute", "amount": 0, "minutes": 5}
GROUP = {"feeling": "loathe", "love": MUTES, "loathe": MUTES}


async def test_the_page_is_pushed_what_each_player_is_playing(hass, hass_ws_client):
    entry, _calls = await add(
        hass, a_group("Dreadful", patterns="*dreadful*"), a_station("Jazz", JAZZ)
    )
    page = Page(hass, await hass_ws_client(hass))

    view = await page.open()
    (shown,) = view["entries"]
    (group,) = shown["groups"]
    assert shown["running"] and shown["players"] == [PLAYER]
    assert (group["name"], group["feeling"], group["home"]) == (
        "Dreadful",
        "loathe",
        "loathe",
    )
    assert (
        shown["stations"][0]
        == {"id": shown["stations"][0]["id"], "name": "Jazz"} | JAZZ
    )
    assert shown["playing"][PLAYER]["title"] == "Something Ordinary"
    assert shown["playing"][PLAYER]["group"] is None
    assert "christmas" in view["libraries"]
    assert {"entity_id": PLAYER, "name": "kitchen"} in view["players"]

    play(hass, "A Dreadful Song", "A Band", **HOME)
    (shown,) = (await page.view())["entries"]
    assert (
        shown["playing"][PLAYER]
        == {
            "state": "playing",
            "title": "A Dreadful Song",
            "artist": "A Band",
            "group": group["id"],
            "repeats": 0,
        }
        | HOME
    )
    assert shown["last"]["result"] == "muted until the next track"

    # Not running, it says so, and nothing of what was playing.
    await hass.config_entries.async_unload(entry.entry_id)
    (shown,) = (await page.view())["entries"]
    assert not shown["running"] and shown["playing"] == {}
    assert shown["groups"] == [group]


async def test_the_page_saves_groups_and_stations_and_is_refused_as_the_form_is(
    hass, hass_ws_client
):
    entry, _calls = await add(hass)
    page = Page(hass, await hass_ws_client(hass))
    await page.open()

    switch = {"action": "switch", "amount": 0, "minutes": 5}
    refused = await page.change(
        "save_group", entry, name="Dreadful", **GROUP | {"loathe": switch}
    )
    assert refused.startswith("Add a station to switch to first")
    refused = await page.change(
        "save_group", entry, name="Dreadful", patterns="*", **GROUP
    )
    assert refused.startswith("A line of nothing but *")

    assert not await page.change("save_station", entry, name="Jazz", **JAZZ)
    assert not await page.change(
        "save_group",
        entry,
        name="Dreadful",
        patterns="*dreadful*",
        person="person.ann",
        **GROUP,
    )
    (shown,) = (await page.view())["entries"]
    (group,), (station,) = shown["groups"], shown["stations"]
    assert group["patterns"] == "*dreadful*" and group["person"] == "person.ann"
    assert station["name"] == "Jazz"

    # Saved, it acts at once on what is playing, as a save from the form does.
    play(hass, "A Dreadful Song", "A Band", **HOME)
    assert (await page.view())["entries"][0]["last"]["group"] == "Dreadful"

    # Ignored from the page, it is still Ann's loathed list.
    changed = GROUP | {"feeling": "ignore"}
    assert not await page.change(
        "save_group",
        entry,
        subentry_id=group["id"],
        name="Awful",
        patterns="*awful*",
        **changed,
    )
    (shown,) = (await page.view())["entries"]
    (group,) = shown["groups"]
    assert (group["name"], group["feeling"], group["home"]) == (
        "Awful",
        "ignore",
        "loathe",
    )
    assert "person" not in group

    assert not await page.change("remove", entry, subentry_id=station["id"])
    assert await page.change(
        "remove", entry, subentry_id=station["id"]
    )  # no longer there
    assert (await page.view())["entries"][0]["stations"] == []


async def test_the_page_orders_the_groups_and_changes_the_players(hass, hass_ws_client):
    entry, _calls = await add(
        hass,
        a_group("First", patterns="*song*"),
        a_group("Second", patterns="*song*"),
    )
    await add(hass, players=["media_player.shed"], title="Shed")
    page = Page(hass, await hass_ws_client(hass))
    first, second = [g["id"] for g in (await page.open())["entries"][0]["groups"]]

    play(hass, "A Song", "A Band", **HOME)
    assert (await page.view())["entries"][0]["last"]["group"] == "First"

    # A tie between two groups goes to the one the page puts first.
    assert not await page.change("order", entry, order=[second, first])
    shown = (await page.view())["entries"][0]
    assert [g["name"] for g in shown["groups"]] == ["Second", "First"]
    assert shown["playing"][PLAYER]["group"] == second

    taken = await page.change(
        "save_entry",
        entry,
        name="Kitchen",
        players=[PLAYER, "media_player.shed"],
        delay=0,
        raters=[],
        screens=[],
    )
    assert taken.startswith("One of those players is already watched")
    assert not await page.change(
        "save_entry",
        entry,
        name="Kitchen",
        players=[PLAYER, "media_player.hall"],
        delay=2,
        raters=[],
        screens=[],
    )
    shown = (await page.view())["entries"][0]
    assert (shown["title"], shown["delay"]) == ("Kitchen", 2)
    assert shown["players"] == [PLAYER, "media_player.hall"]
    # The players' own form keeps the order.
    assert [g["name"] for g in shown["groups"]] == ["Second", "First"]
    form = await hass.config_entries.options.async_init(entry.entry_id)
    await hass.config_entries.options.async_configure(
        form["flow_id"], {"players": [PLAYER], "delay": 0}
    )
    assert entry.options["order"] == [second, first]


async def test_what_happened_is_kept_and_an_entry_can_be_switched_off(
    hass, hass_ws_client
):
    entry, calls = await add(hass, a_group("Dreadful", patterns="*dreadful*"))
    page = Page(hass, await hass_ws_client(hass))
    await page.open()
    logbook = async_capture_events(hass, "logbook_entry")

    async def happened():
        """The trail's lines, the oldest first, as (what about, the words)."""
        (shown,) = (await page.view())["entries"]
        return [(line["kind"], line["text"]) for line in reversed(shown["trail"])]

    # A match, then what was done; and at the next track, what was put back.
    play(hass, "A Dreadful Song", "A Band")
    assert (await happened())[-2:] == [
        ("match", "A Dreadful Song by A Band is in Dreadful (loathe)"),
        ("change", "Muted until the next track"),
    ]
    play(hass, "A Fine Song", "A Band", is_volume_muted=True)
    assert (await happened())[-1] == ("back", "Unmuted")

    # Home Assistant's Logbook has each line too, against the Last match sensor.
    assert logbook[-1].data == {
        "name": "Love it or Loathe it",
        "message": "kitchen: Unmuted",
        "domain": DOMAIN,
        "entity_id": SENSOR,
    }

    # A match with nothing done says why.
    play(hass, "A Dreadful Tune", group_members=["media_player.hall", PLAYER])
    assert (await happened())[-1] == (
        "skip",
        "Nothing done: media_player.hall leads its speaker group and acts for it",
    )

    # Switched off, it watches nothing; the trail outlives the restart of the watching.
    switch = "switch.love_it_or_loathe_it_watching"
    assert hass.states.get(switch).state == "on"
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch}, blocking=True
    )
    (shown,) = (await page.view())["entries"]
    assert not shown["enabled"] and shown["playing"] == {}
    assert (await happened())[-2:] == [
        ("stop", "Stopped"),
        ("start", "Started, but switched off: nothing is watched"),
    ]
    muted = len(calls["volume_mute"])
    play(hass, "Another Dreadful Song", "A Band")
    await settled(hass)
    assert len(calls["volume_mute"]) == muted

    # On again from the page, it acts on what is playing.
    assert not await page.change("enable", entry, enabled=True)
    lines = await happened()
    assert ("edit", "Changed from the page: switched on") in lines
    assert lines[-1] == ("change", "Muted until the next track")
    assert hass.states.get(switch).state == "on"


async def test_the_thumbs_are_told_whether_the_song_is_already_rated(
    hass, hass_ws_client, hass_admin_user
):
    hass.states.async_set("person.ann", "home", {"user_id": hass_admin_user.id})
    hass.states.async_set("person.ben", "home", {"user_id": "ben-login"})
    entry, _calls = await add(
        hass,
        a_group("Stars", "love", "event", patterns="*song*"),
        raters=["person.ann", "person.ben"],
    )
    ws = await hass_ws_client(hass)
    n = iter(range(1, 100))

    async def follow(entity, **more):
        """Subscribe; the first thing sent."""
        await ws.send_json(
            {"id": next(n), "type": f"{DOMAIN}/song", "entity_id": entity, **more}
        )
        assert (await ws.receive_json())["success"]
        return (await ws.receive_json())["event"]

    async def rate(feeling, **more):
        await hass.services.async_call(
            DOMAIN,
            "rate",
            {"entity_id": PLAYER, "feeling": feeling, **more},
            blocking=True,
            context=Context(user_id=hass_admin_user.id),
        )
        await settled(hass)

    async def told():
        """What the thumbs were last sent, each subscription's by its id."""
        await settled(hass)
        await ws.send_json({"id": next(n), "type": "ping"})
        out = {}
        while (msg := await ws.receive_json())["type"] != "pong":
            out[msg["id"]] = msg["event"]
        return out

    # The login's own person; a song a star takes in is not a rating of it.
    play(hass, "A Song", "A Band")
    await settled(hass)
    assert await follow(PLAYER) == {
        "watched": True,
        "playing": True,
        "title": "A Song",
        "artist": "A Band",
        "person": "person.ann",
        "feeling": None,
        "refused": None,
    }
    # A card that names its person, as on a wall tablet; and a player nobody watches.
    assert (await follow(PLAYER, person="person.ben"))["person"] == "person.ben"
    assert not (await follow("media_player.shed"))["watched"]

    # Rated, the thumb lights for her and not for him; cleared, it goes out again.
    await rate("love")
    lit = await told()
    assert lit[1]["feeling"] == "love" and 2 not in lit
    await rate("loathe", person="person.ben")
    assert (await told())[2]["feeling"] == "loathe"
    await rate("clear")
    assert (await told())[1]["feeling"] is None

    # The next track is sent as it comes on.
    play(hass, "Another", "A Band")
    assert (await told())[1]["title"] == "Another"

    # The cards say which version is served, to offer a reload after an update.
    await ws.send_json({"id": next(n), "type": f"{DOMAIN}/cards"})
    assert (await ws.receive_json())["result"]["version"]


async def test_only_the_people_chosen_may_rate_and_nobody_at_first(
    hass, hass_ws_client, hass_admin_user
):
    hass.states.async_set("person.ann", "home", {"user_id": "ann-login"})
    hass.states.async_set("person.ben", "home", {"user_id": "ben-login"})
    entry, _calls = await add(hass)
    page = Page(hass, await hass_ws_client(hass))
    view = await page.open()
    assert view["entries"][0]["raters"] == [] and view["entries"][0]["screens"] == []
    assert {"id": hass_admin_user.id, "name": hass_admin_user.name} in view["users"]

    async def rate(login, **more):
        await hass.services.async_call(
            DOMAIN,
            "rate",
            {"entity_id": PLAYER, "feeling": "love", **more},
            blocking=True,
            context=Context(user_id=login),
        )
        await settled(hass)

    def refused(match):
        return pytest.raises(ServiceValidationError, match=match)

    # A new entry: nobody may rate, and no group is made for anyone.
    with refused("is not one of the people who may rate"):
        await rate("ann-login")
    assert not entry.subentries

    # Ann is chosen from the page, and the wall tablet's login may rate for her.
    assert not await page.change(
        "save_entry",
        entry,
        name=entry.title,
        players=[PLAYER],
        delay=0,
        raters=["person.ann"],
        screens=["the-tablet"],
    )
    await rate("ann-login")
    await rate("the-tablet", person="person.ann")
    assert [g.title for g in entry.subentries.values()] == ["Loved by ann"]

    # Ben isn't chosen, as himself or named by the tablet; a guest can't name Ann.
    with refused("person.ben is not one of the people"):
        await rate("ben-login")
    with refused("person.ben is not one of the people"):
        await rate("the-tablet", person="person.ben")
    with refused("may not rate for someone else"):
        await rate("a-guest", person="person.ann")
    assert len(entry.subentries) == 1

    # An administrator may name a person, and so may an automation (no login at all).
    await rate(hass_admin_user.id, person="person.ann")
    await rate(None, person="person.ann")

    # The form in Home Assistant shows the two lists, and an emptied one is empty.
    form = await hass.config_entries.options.async_init(entry.entry_id)
    assert {"raters", "screens"} <= {key.schema for key in form["data_schema"].schema}
    await hass.config_entries.options.async_configure(
        form["flow_id"],
        {"players": [PLAYER], "delay": 0, "screens": [hass_admin_user.id]},
    )
    await settled(hass)
    assert entry.options["raters"] == []
    assert entry.options["screens"] == [hass_admin_user.id]
    with refused("is not one of the people who may rate"):
        await rate("ann-login")
