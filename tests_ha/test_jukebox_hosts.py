"""Who may change what while Jukebox's party lock is on (may.py), and Love it or Loathe
it's changes being left alone by it (love.py). The house and its stand-in speaker are
the party tests'."""

from custom_components.casa_mia_jukebox.const import DOMAIN
from custom_components.casa_mia_jukebox.page import DO, HOUSE
from homeassistant.helpers import entity_registry as er
from test_jukebox_page import ask, sent  # noqa: F401  (sent is a fixture)
from test_jukebox_party import house  # noqa: F401  (a fixture)

from test_jukebox import GARDEN, KITCHEN


async def options(hass, **lists):
    [entry] = hass.config_entries.async_entries(DOMAIN)
    hass.config_entries.async_update_entry(entry, options={**entry.options, **lists})
    await hass.async_block_till_done()


async def me(hass, hass_ws_client, token):
    """This login's part, as its page is told. On a connection of its own: the page's
    feed pushes, which would come between another question and its answer."""
    client = await hass_ws_client(hass, token)
    await ask(client, HOUSE)
    return (await client.receive_json())["event"]["me"]


async def test_a_login_on_neither_list_can_only_look_while_a_party_is_on(
    hass,
    house,  # noqa: F811
    sent,  # noqa: F811
    hass_ws_client,
    hass_read_only_access_token,
    caplog,
):
    guest = await hass_ws_client(hass, hass_read_only_access_token)
    assert await me(hass, hass_ws_client, hass_read_only_access_token) == "other"

    turned = await ask(guest, DO, action="volume", entity_id=GARDEN, value=90)
    assert not turned["success"] and "A party is on" in turned["error"]["message"]
    ended = await ask(guest, DO, action="party", entity_id=KITCHEN, on=False)
    assert not ended["success"] and "Only the people" in ended["error"]["message"]
    assert house.party is not None and sent == []
    assert "volume in media_player.garden" in caplog.text  # who tried is written down

    # The administrator's own page still can.
    assert (await house.do("volume", GARDEN, value=30))["success"]


async def test_a_screen_changes_the_music_only_once_a_host_opens_the_screens_up(
    hass,
    house,  # noqa: F811
    sent,  # noqa: F811
    hass_ws_client,
    hass_read_only_user,
    hass_read_only_access_token,
):
    await options(hass, screens=[hass_read_only_user.id])
    tablet = await hass_ws_client(hass, hass_read_only_access_token)
    assert await me(hass, hass_ws_client, hass_read_only_access_token) == "screen"
    assert house.party.view()["open"] is False

    async def turn(value):
        return await ask(tablet, DO, action="volume", entity_id=GARDEN, value=value)

    assert not (await turn(20))["success"]
    # Not the tablet's to open, nor the party's end, whatever a host has allowed.
    assert not (await ask(tablet, DO, action="party_open", entity_id=KITCHEN, on=True))[
        "success"
    ]

    assert (await house.do("party_open", on=True))["success"]
    assert house.party.view()["open"] is True
    assert (await turn(20))["success"]
    assert sent.pop() == ("volume_set", {"entity_id": GARDEN, "volume_level": 0.2})
    # Jukebox's own change, though a tablet asked for it: not put back.
    await house.a_guest(GARDEN, volume_level=0.2)
    assert sent == [] and house.party.undone == []
    assert not (await ask(tablet, DO, action="party", entity_id=KITCHEN, on=False))[
        "success"
    ]

    assert (await house.do("party_open", on=False))["success"]
    assert not (await turn(30))["success"]


async def test_a_login_named_as_a_host_runs_the_party_and_others_cant_start_one(
    hass,
    house,  # noqa: F811
    hass_ws_client,
    hass_read_only_user,
    hass_read_only_access_token,
):
    someone = await hass_ws_client(hass, hass_read_only_access_token)

    async def party(on):
        return await ask(someone, DO, action="party", entity_id=KITCHEN, on=on)

    assert not (await party(False))["success"]
    await options(hass, hosts=[hass_read_only_user.id])
    assert await me(hass, hass_ws_client, hass_read_only_access_token) == "host"
    assert (await party(False))["success"] and house.party is None

    # With no party, anyone may change the music, but only a host may start one, or
    # save or delete a playlist.
    await options(hass, hosts=[])
    for action in ("queue_save", "playlist_delete", "playlist_remove", "playlist_add"):
        kept = await ask(someone, DO, action=action, entity_id=KITCHEN, name="A list")
        assert (
            not kept["success"] and "look after the music" in kept["error"]["message"]
        )
    assert (await ask(someone, DO, action="volume", entity_id=GARDEN, value=15))[
        "success"
    ]
    assert not (await party(True))["success"] and house.party is None


async def test_what_love_it_or_loathe_it_does_is_shown_and_not_put_back(
    hass,
    house,  # noqa: F811
    sent,  # noqa: F811
    hass_ws_client,
):
    sensor = (
        er.async_get(hass)
        .async_get_or_create("sensor", "casa_mia_love_or_loathe", "an_entry_last_match")
        .entity_id
    )

    def said(now):
        did = {"did": "Volume 30% to 10% until the next track", "why": "A song"}
        hass.states.async_set(sensor, "A song", {"players": {KITCHEN: did | now}})

    said({"now": True})
    await house.a_guest(KITCHEN, volume_level=0.1)
    assert sent == [] and house.party.undone == []

    page = await hass_ws_client(hass)
    await ask(page, HOUSE)
    group = (await page.receive_json())["event"]["groups"][0]
    assert group["love"]["now"] is True and group["love"]["why"] == "A song"

    # No longer in force, and the volume still isn't the party's: now it is put back.
    said({"now": False})
    await house.settled()
    assert sent.pop() == ("volume_set", {"entity_id": KITCHEN, "volume_level": 0.3})
    assert "turned" in house.party.undone[0]["what"]


async def test_what_was_done_to_the_last_music_isnt_said_over_new_music(
    hass,
    sent,  # noqa: F811
    hass_ws_client,
):
    sensor = (
        er.async_get(hass)
        .async_get_or_create("sensor", "casa_mia_love_or_loathe", "an_entry_last_match")
        .entity_id
    )
    over = {"did": "Volume 30% to 15% until the next track", "why": "An advert"}
    over |= {"at": "2026-11-24T09:00:00+00:00", "now": False}
    hass.states.async_set(sensor, "An advert", {"players": {KITCHEN: over}})

    page = await hass_ws_client(hass)
    await ask(page, HOUSE)
    assert (await page.receive_json())["event"]["groups"][0]["love"][
        "why"
    ] == "An advert"

    # Something else is put on from Jukebox: the old reason goes.
    asker = await hass_ws_client(hass)
    what = {"media_content_id": "FV:2/1", "media_content_type": "favorite_item_id"}
    assert (await ask(asker, DO, action="play_media", entity_id=KITCHEN, **what))[
        "success"
    ]
    assert (await page.receive_json())["event"]["groups"][0]["love"] is None


async def test_a_screen_changes_playlists_except_while_a_party_is_on_anywhere(
    hass,
    house,  # noqa: F811
    hass_ws_client,
    hass_read_only_user,
    hass_read_only_access_token,
):
    await options(hass, screens=[hass_read_only_user.id])
    tablet = await hass_ws_client(hass, hass_read_only_access_token)

    async def curates():
        page = await hass_ws_client(hass, hass_read_only_access_token)
        await ask(page, HOUSE)
        return (await page.receive_json())["event"]["curates"]

    async def save():
        named = {"action": "queue_save", "entity_id": KITCHEN, "name": "A list"}
        return await ask(tablet, DO, **named)

    # A party is on: the tablet's page isn't offered the playlists, and is refused.
    assert await curates() is False
    refused = await save()
    assert not refused["success"] and "until it ends" in refused["error"]["message"]
    # Not even once the tablets are let to change the party's music.
    assert (await house.do("party_open", on=True))["success"]
    assert not (await save())["success"]

    # The party over, a playlist is the tablet's to save, change and delete.
    assert (await house.do("party", on=False))["success"]
    assert await curates() is True
    assert (await save())["success"]
    [kept] = house.speaker.saved
    gone = {"action": "playlist_delete", "media_content_id": kept}
    assert (await ask(tablet, DO, entity_id=KITCHEN, **gone))["success"]

    # A login on neither list still can't, party or no party.
    await options(hass, screens=[])
    assert await curates() is False and not (await save())["success"]
