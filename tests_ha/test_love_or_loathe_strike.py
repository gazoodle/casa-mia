"""Love it or Loathe it's strike inside a real Home Assistant: a song played too often,
whatever a group says of it (owner, 2026-11-15: "a repetition is a strike"), and the
move of each group's own repeats (2026.11.7) to the entry's, once. The helpers are the
main file's."""

from datetime import timedelta

from custom_components.casa_mia_love_or_loathe.const import EVENT
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_capture_events

from test_love_or_loathe import PLAYER, a_group, add, play, settled


async def test_a_song_played_too_often_is_struck_whatever_a_group_says(hass, freezer):
    strike = {"times": 3, "hours": 4, "action": "mute", "amount": -50, "minutes": 5}
    entry, calls = await add(
        hass, a_group("Loved", "love", "event", patterns="Agadoo"), repeats=strike
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

    # The third time in four hours it is muted, and the event says why: no group.
    await hear("")
    await hear("Round Again")
    assert [c.data["is_volume_muted"] for c in calls["volume_mute"]] == [True]
    struck = {k: events[-1].data[k] for k in ("group", "feeling", "repeats")}
    assert struck == {"group": "", "feeling": "loathe", "repeats": 3}

    # A song a group loves is struck too, the third time (owner, 2026-11-15).
    for _ in range(3):
        await hear("Agadoo")
        await hear("")
    assert [e.data["group"] for e in events[-3:]] == ["Loved", "Loved", ""]
    assert events[-1].data["repeats"] == 3

    # Four hours on, the early plays no longer count: it is the first again.
    count = len(events)
    await hear("Round Again", after=300)
    assert len(events) == count

    # Its switch turns it off, numbers kept; the song a group names is then as it says.
    repeats = "switch.love_it_or_loathe_it_repeats"
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": repeats}, blocking=True
    )
    await settled(hass)
    assert entry.options["repeats"]["times"] == 3
    await hear("Agadoo")
    assert (events[-1].data["group"], events[-1].data["repeats"]) == ("Loved", 0)
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": repeats}, blocking=True
    )
    await settled(hass)

    # A restart of Home Assistant keeps what was played.
    await hear("")
    await hear("Round Again")
    await hass.config_entries.async_reload(entry.entry_id)
    await settled(hass)
    await hear("")
    await hear("Round Again")
    assert (events[-1].data["title"], events[-1].data["repeats"]) == ("Round Again", 3)


async def test_a_loathed_group_acts_before_the_strike_and_a_loved_one_after(
    hass, freezer
):
    """Owner, 2026-11-15: a loathed song gets its group's own action, the strike is for
    boredom, a loved song is boosted. Seen when a Christmas group's switch of station
    was beaten by the strike's mute."""
    strike = {"times": 2, "hours": 4, "action": "mute", "amount": 0, "minutes": 5}
    entry, calls = await add(
        hass,
        a_group("Xmas", action="volume", amount=-50, patterns="Last Christmas"),
        a_group("Fond", "love", action="volume", amount=10, patterns="Agadoo"),
        repeats=strike,
    )
    events = async_capture_events(hass, EVENT)

    for title in ("Last Christmas", "Agadoo", "Last Christmas", "Agadoo"):
        freezer.tick(timedelta(minutes=30))
        play(hass, title, "A Band")
        await settled(hass)
    said = [(e.data["group"], e.data["action"]) for e in events]
    assert said == [
        ("Xmas", "volume"),
        ("Fond", "volume"),
        ("Xmas", "volume"),  # played twice, but loathed: its own action
        ("", "mute"),  # loved, but played twice: struck
    ]


async def test_a_volume_change_is_made_on_each_speaker_of_a_group(hass):
    other = "media_player.dining"
    members = [PLAYER, other]
    play(hass, "Something Ordinary", "A Band", entity=other, volume_level=0.2)
    _, calls = await add(hass, a_group("Fond", "love", "volume", patterns="Agadoo"))

    play(hass, "Agadoo", "Black Lace", group_members=members)
    await settled(hass)
    assert [
        (c.data["entity_id"], c.data["volume_level"]) for c in calls["volume_set"]
    ] == [
        (PLAYER, 0.44),
        (other, 0.22),
    ]

    # Put back where nobody moved it since; the other left as someone set it.
    play(hass, "Something Ordinary", "A Band", entity=other, volume_level=0.5)
    play(hass, "Wonderwall", "Oasis", group_members=members, volume_level=0.44)
    await settled(hass)
    assert [
        (c.data["entity_id"], c.data["volume_level"]) for c in calls["volume_set"][2:]
    ] == [(PLAYER, 0.4)]


async def test_each_groups_repeats_move_to_its_entry_once(hass):
    """As 2026.11.7 kept them: a group of no songs there for the repeats, and a loved
    group with some of its own. The loathed one's are taken, and its group goes."""
    often = a_group("Heard too often", action="switch", minutes=10)
    often["data"]["repeats"] = {"times": 3, "hours": 4}
    fond = a_group("Fond", "love", patterns="Agadoo")
    fond["data"]["repeats"] = {"times": 2, "hours": 48}
    entry, _ = await add(hass, often, fond)

    assert entry.options["repeats"] == {
        "times": 3,
        "hours": 4,
        "action": "switch",
        "amount": 10,
        "minutes": 10,
    }
    assert entry.options["repeats_on"] is True
    (left,) = entry.subentries.values()
    assert left.title == "Fond" and "repeats" not in left.data
    selects = [
        e.entity_id
        for e in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)
        if e.domain == "select"
    ]
    assert selects == ["select.love_it_or_loathe_it_fond"]

    # Once only: the entry's own are not taken again from anything.
    await hass.config_entries.async_reload(entry.entry_id)
    await settled(hass)
    assert entry.options["repeats"]["times"] == 3


async def test_an_ignored_groups_repeats_move_switched_off(hass):
    resting = a_group("Resting", "ignore")
    resting["data"]["repeats"] = {"times": 2, "hours": 4}
    entry, _ = await add(hass, resting)
    assert entry.options["repeats"]["times"] == 2
    assert entry.options["repeats_on"] is False
    assert not entry.subentries  # it had no songs: it was only the repeats


async def test_its_form_refuses_a_switch_of_station_with_none_to_switch_to(hass):
    entry, _ = await add(hass)
    form = await hass.config_entries.options.async_init(entry.entry_id)
    strike = {"times": 3, "hours": 4, "action": "switch", "amount": 0, "minutes": 5}
    answer = {"players": ["media_player.kitchen"], "delay": 0, "repeats": strike}
    refused = await hass.config_entries.options.async_configure(form["flow_id"], answer)
    assert refused["errors"] == {"base": "no_stations"}

    # Off (0 times), it can say switch: nothing will.
    answer["repeats"] = {**strike, "times": 0}
    saved = await hass.config_entries.options.async_configure(
        refused["flow_id"], answer
    )
    assert saved["type"] == "create_entry"
    assert entry.options["repeats"]["action"] == "switch"
