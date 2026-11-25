"""Jukebox's party lock inside a real Home Assistant. The speaker is a stand-in that
keeps a queue and what it plays from, so a "guest" can change them behind Jukebox's back
and the lock can be seen to put them back."""

import asyncio
import re
from xml.etree.ElementTree import fromstring
from xml.sax.saxutils import unescape

import pytest
from custom_components.casa_mia_jukebox import party as party_module
from custom_components.casa_mia_jukebox import upnp
from custom_components.casa_mia_jukebox.page import DO, FEED, HOUSE
from custom_components.casa_mia_jukebox.party import EVENT
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMockResponse,
)
from test_jukebox_page import (  # noqa: F401  (sent is a fixture)
    BROWSE,
    PORCH,
    TRANSPORT,
    answered,
    ask,
    sent,
)

from test_jukebox import GARDEN, KITCHEN

OWN_QUEUE = "x-rincon-queue:RINCON_000000000000001400#0"


class Speaker:
    """A stand-in for the leading speaker's UPnP: its queue, what it plays from and the
    song it is at, changed by the actions the lock and the page send."""

    def __init__(self, aioclient_mock):
        self.queue = ["a", "b", "c"]
        self.uri = OWN_QUEUE
        self.song = 2
        self.playing = True
        self.saved = {}  # the Sonos playlists: id to (name, songs)
        self.rel = "0:00:00"  # how far into the song
        self.asked = []
        self.refuses = set()
        aioclient_mock.post(BROWSE, side_effect=self.answer)
        aioclient_mock.post(TRANSPORT, side_effect=self.answer)

    async def answer(self, method, url, data):
        body = data.decode()
        action = re.search(r"<u:(\w+) ", body).group(1)
        said = {k: unescape(v) for k, v in re.findall(r"<(\w+)>(.*?)</\1>", body, re.S)}
        self.asked.append(action)
        if action in self.refuses:
            return AiohttpClientMockResponse(method, url, status=500, text="<e/>")
        listing = action in ("Browse", "DestroyObject")
        service = "ContentDirectory" if listing else "AVTransport"
        text = answered(service, action, **(getattr(self, action)(said) or {}))
        return AiohttpClientMockResponse(method, url, text=text)

    def Browse(self, said):
        if said["ObjectID"] == "SQ:":
            items = "".join(
                f'<container id="{id}" parentID="SQ:"><dc:title>{name}</dc:title>'
                f"<res>file:///saved#{id}</res></container>"
                for id, (name, _songs) in self.saved.items()
            )
        else:
            items = "".join(
                f'<item id="Q:0/{n}"><res>{uri}</res></item>'
                for n, uri in enumerate(self.queue, 1)
            )
        didl = "urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"
        dc = "http://purl.org/dc/elements/1.1/"
        return {
            "Result": f'<DIDL-Lite xmlns="{didl}" xmlns:dc="{dc}">{items}</DIDL-Lite>'
        }

    def SaveQueue(self, said):
        self.made = getattr(self, "made", 0) + 1
        id = f"SQ:{self.made}"
        self.saved[id] = (said["Title"], list(self.queue))
        return {"AssignedObjectID": id}

    def DestroyObject(self, said):
        del self.saved[said["ObjectID"]]

    def RemoveAllTracksFromQueue(self, said):
        self.queue, self.song, self.playing = [], 0, False

    def GetMediaInfo(self, said):
        return {"CurrentURI": self.uri, "CurrentURIMetaData": ""}

    def GetPositionInfo(self, said):
        return {"Track": self.song, "RelTime": self.rel}

    def GetTransportInfo(self, said):
        return {"CurrentTransportState": "PLAYING" if self.playing else "STOPPED"}

    def SetAVTransportURI(self, said):
        self.uri = said["CurrentURI"]

    def Seek(self, said):
        if said["Unit"] == "REL_TIME":
            self.rel = said["Target"]
        else:
            self.song, self.rel = int(said["Target"]), "0:00:00"

    def Play(self, said):
        self.playing = True

    def RemoveTrackFromQueue(self, said):
        del self.queue[int(said["ObjectID"].split("/")[1]) - 1]

    def AddURIToQueue(self, said):
        if said["EnqueuedURI"].startswith("file:///saved#"):
            # A playlist: the speaker loads every song of it itself.
            self.queue += self.saved[said["EnqueuedURI"].split("#")[1]][1]
            return {"NumTracksAdded": len(self.queue)}
        at = int(said["DesiredFirstTrackNumberEnqueued"])
        self.queue.insert(at - 1 if at else len(self.queue), said["EnqueuedURI"])

    def ReorderTracksInQueue(self, said):
        song, before = int(said["StartingIndex"]), int(said["InsertBefore"])
        moved = self.queue.pop(song - 1)
        self.queue.insert(before - 1 if before < song else before - 2, moved)


@pytest.fixture
async def house(hass, hass_ws_client, sent, aioclient_mock, monkeypatch):  # noqa: F811
    """The kitchen and garden playing together with a party on, the lock comparing at
    once, and the watch on the queue in the test's hands."""

    class House:
        speaker = Speaker(aioclient_mock)
        watch = {}
        put_back = []

        @property
        def party(self):
            return hass.data[FEED].parties.of(KITCHEN)

        async def do(self, action, entity=KITCHEN, **data):
            return await ask(self.client, DO, action=action, entity_id=entity, **data)

        async def settled(self):
            """The lock has compared the speakers after whatever was just changed."""
            async with asyncio.timeout(2):
                while self.party and (self.party._due or self.party.lock.locked()):
                    await asyncio.sleep(0.01)
            await hass.async_block_till_done()

        async def a_guest(self, entity, **attributes):
            """Something changed at a speaker, as Home Assistant hears of it."""
            state = hass.states.get(entity)
            hass.states.async_set(
                entity, state.state, {**state.attributes, **attributes}
            )
            await self.settled()

    async def watch_queue(session, host, watching, changed):
        House.watch.update(watching=watching, changed=changed, lost=asyncio.Event())
        await House.watch["lost"].wait()
        raise ConnectionError("the speaker closed the connection")

    monkeypatch.setattr(party_module.speaker, "watch_queue", watch_queue)
    monkeypatch.setattr(party_module, "SETTLE", 0)
    monkeypatch.setattr(party_module, "BURST", 0)
    hass.bus.async_listen(EVENT, lambda event: House.put_back.append(event.data))

    house = House()
    house.client = await hass_ws_client(hass)
    assert (await house.do("party", GARDEN, on=True))["success"]
    await house.settled()
    sent.clear()
    return house


def entity(hass, platform, key):
    found = [
        e.entity_id
        for e in er.async_get(hass).entities.values()
        if e.platform == "casa_mia_jukebox"
        and e.domain == platform
        and e.unique_id.endswith(key)
    ]
    return hass.states.get(found[0])


async def test_a_party_shows_on_the_page_and_in_home_assistant(
    hass, house, hass_ws_client
):
    page = await hass_ws_client(hass)
    await ask(page, HOUSE)
    group = (await page.receive_json())["event"]["groups"][0]
    assert group["id"] == KITCHEN and group["party"]["undone"] == []
    on = entity(hass, "binary_sensor", "_party")
    assert on.state == "on" and len(on.attributes["rooms"][0]) == 2
    assert entity(hass, "sensor", "_put_back").state == "0"

    # The watch on the queue isn't claimed until the speaker has agreed to it, and
    # says since when it was lost.
    assert house.party.view()["unwatched"]
    house.watch["watching"]()
    assert house.party.view()["unwatched"] is None
    house.watch["lost"].set()
    await asyncio.sleep(0.01)
    assert house.party.view()["unwatched"]

    assert (await house.do("party", on=False))["success"]
    assert entity(hass, "binary_sensor", "_party").state == "off"
    assert house.party is None


async def test_a_guests_volume_and_rooms_are_put_back(hass, house, sent):  # noqa: F811
    await house.a_guest(GARDEN, volume_level=0.9)
    assert sent.pop() == ("volume_set", {"entity_id": GARDEN, "volume_level": 0.1})
    last = house.party.undone[0]
    assert (
        "turned" in last["what"] and "up to 90" in last["what"] and not last["failed"]
    )
    assert entity(hass, "sensor", "_put_back").state == "1"
    assert house.put_back[-1]["what"] == last["what"]
    await house.a_guest(GARDEN, volume_level=0.1)

    # Taken out of the group, and a room that isn't the party's brought in.
    await house.a_guest(KITCHEN, group_members=[KITCHEN, PORCH])
    assert sent == [
        ("join", {"entity_id": KITCHEN, "group_members": [GARDEN]}),
        ("unjoin", {"entity_id": PORCH}),
    ]
    assert len(house.party.undone) == 3


async def test_what_jukebox_does_itself_is_never_put_back(hass, house, sent):  # noqa: F811
    assert (await house.do("volume", GARDEN, value=40))["success"]
    sent.clear()
    # The speaker's report of it arrives afterwards, as it does in a house.
    await house.a_guest(GARDEN, volume_level=0.4)
    assert (await house.do("join", room=PORCH))["success"]
    sent.clear()
    await house.a_guest(KITCHEN, group_members=[KITCHEN, GARDEN, PORCH])
    assert (await house.do("queue_remove", value=1))["success"]
    assert house.speaker.queue == ["b", "c"]
    house.watch["changed"]()
    await house.settled()

    assert not sent and not house.party.undone and house.speaker.queue == ["b", "c"]

    # The room that leads the music can't be taken out while the party is on.
    answer = await house.do("leave", room=KITCHEN)
    assert "leads the party's music" in answer["error"]["message"]


async def test_a_guests_changes_to_the_queue_are_put_back(hass, house):
    # One song taken out and one of their own put in, seen through the watch.
    house.speaker.queue = ["x", "a", "c"]
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    assert house.party.undone[0]["what"] == (
        "Someone changed the queue (1 song added to it and 1 song taken out of it)"
    )

    # Songs moved, which Home Assistant is never told of.
    house.speaker.queue = ["c", "a", "b"]
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    assert house.party.undone[0]["what"] == "Someone moved songs in the queue"

    # A song twice in the queue is two songs.
    house.speaker.queue = ["a", "b", "b", "c", "a"]
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]


async def test_a_queue_replaced_from_another_app_plays_on_from_where_it_was(
    hass, house
):
    """Another app's "play this album now" empties the queue, fills it and leaves the
    speaker at its first song; on a real speaker the music then stayed stopped."""
    house.speaker.queue, house.speaker.song = ["x", "y"], 1
    house.speaker.playing = False
    house.speaker.asked.clear()
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    assert (house.speaker.song, house.speaker.playing) == (2, True)
    assert house.speaker.asked[-3:] == ["SetAVTransportURI", "Seek", "Play"]

    # A song added while the music carries on: taken out, and nothing started again.
    house.speaker.queue = ["a", "b", "c", "z"]
    house.speaker.asked.clear()
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    assert not {"Seek", "Play", "SetAVTransportURI"} & set(house.speaker.asked)

    # Paused by someone before the queue was changed: put back, and left paused.
    house.speaker.playing = False
    await house.a_guest(KITCHEN, media_position=40)  # a report: compared, nothing to do
    house.speaker.queue = ["x"]
    house.speaker.asked.clear()
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"] and not house.speaker.playing
    assert "Play" not in house.speaker.asked


async def test_the_speaker_keeps_the_partys_copy_and_loads_it_back_whole(hass, house):
    """A song put back one at a time came back with less than it had. The speaker
    loading a playlist of its own brings the queue back as it was made."""
    [(copy, (name, songs))] = house.speaker.saved.items()
    assert name.startswith("Jukebox party copy (") and songs == ["a", "b", "c"]
    assert house.party.copy == copy

    # A song is taken out: the queue is emptied and the copy loaded, in one go.
    house.speaker.queue = ["a", "c"]
    house.speaker.asked.clear()
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    adds = [a for a in house.speaker.asked if a == "AddURIToQueue"]
    assert len(adds) == 1 and "RemoveAllTracksFromQueue" in house.speaker.asked

    # Songs added or moved lose nothing: taken out and moved back, nothing reloaded.
    house.speaker.queue = ["c", "a", "b", "z"]
    house.speaker.asked.clear()
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"]
    assert "RemoveAllTracksFromQueue" not in house.speaker.asked

    # Jukebox's own change to the queue: the copy is made again, and the old one goes.
    assert (await house.do("queue_remove", value=3))["success"]
    [(_id, (_name, songs))] = house.speaker.saved.items()
    assert songs == ["a", "b"]

    # Someone deletes the copy: said on the page, and songs go back one at a time.
    house.speaker.saved.clear()
    house.speaker.queue = ["a"]
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b"]
    assert any("copy of the queue was deleted" in u["what"] for u in house.party.undone)


async def test_the_music_goes_back_to_where_it_was_in_the_song(hass, house):
    """Not to the start of the song, which a guest could use to make it start again
    and again (owner, 2026-11-24)."""
    house.speaker.rel = "0:01:10"
    await house.a_guest(KITCHEN, media_position=70)  # a report: where it is is noted
    assert house.party.at[0] == 70

    house.speaker.queue, house.speaker.song = ["x", "y"], 1
    house.speaker.playing, house.speaker.rel = False, "0:00:03"
    house.watch["changed"]()
    await house.settled()
    assert house.speaker.queue == ["a", "b", "c"] and house.speaker.playing
    assert house.speaker.song == 2
    minutes, seconds = house.speaker.rel.split(":")[1:]
    assert int(minutes) * 60 + int(seconds) >= 70


async def test_the_copy_goes_when_the_party_ends(hass, house):
    assert house.speaker.saved
    assert (await house.do("party", on=False))["success"]
    await hass.async_block_till_done(wait_background_tasks=True)
    assert house.speaker.saved == {}


def test_a_song_is_described_to_the_speaker_as_the_speaker_writes_it():
    """Written with made-up names for the same things, a streamed song put back lost
    its title on a real speaker."""
    listed = fromstring(
        '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/"'
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"'
        ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
        '<item id="Q:0/1" parentID="Q:0" restricted="true">'
        '<res protocolInfo="sonos.com-http:*:audio/mp4:*">x-stream:a?sid=1&amp;sn=2</res>'
        "<dc:title>Salt &amp; Vinegar</dc:title><dc:creator>The Marigolds</dc:creator>"
        "<upnp:class>object.item.audioItem.musicTrack</upnp:class></item></DIDL-Lite>"
    )
    said = upnp._described(listed[0])
    assert "<dc:title>Salt &amp; Vinegar</dc:title>" in said
    assert "<upnp:class>object.item.audioItem.musicTrack</upnp:class>" in said
    assert (
        '<res protocolInfo="sonos.com-http:*:audio/mp4:*">x-stream:a?sid=1&amp;sn=2</res>'
        in said
    )
    assert "ns0" not in said and 'id="Q:0/1"' in said
    # And it still reads as what it was.
    again = fromstring(said)[0]
    assert [c.tag for c in again] == [c.tag for c in listed[0]]


async def test_a_guest_playing_something_else_is_brought_back_to_the_queue(hass, house):
    house.speaker.uri, house.speaker.song = "x-sonos-vli:another-app", 1
    house.speaker.asked.clear()
    await house.a_guest(KITCHEN, media_title="Somebody else's song")
    assert (house.speaker.uri, house.speaker.song) == (OWN_QUEUE, 2)
    assert house.speaker.asked[1:4] == ["SetAVTransportURI", "Seek", "Play"]
    assert house.party.undone[0]["what"] == "Someone played something of their own"

    # The music moving on by itself is not a change: only where it is is remembered.
    house.speaker.song = 3
    await house.a_guest(KITCHEN, media_title="The next song")
    assert len(house.party.undone) == 1 and house.party.song == 3


async def test_what_cant_be_put_back_is_said(hass, house, caplog):
    house.speaker.refuses = {"RemoveTrackFromQueue"}
    house.speaker.queue = ["a", "b", "c", "x"]
    house.watch["changed"]()
    await house.settled()

    last = house.party.undone[0]
    assert last["failed"] and "couldn't be put back" in last["what"]
    assert "error" in last["what"] and "couldn't be put back" in caplog.text
    # It isn't counted as put back.
    assert entity(hass, "sensor", "_put_back").state == "0"


async def test_the_play_action_goes_through_jukebox(hass, house, sent, caplog):  # noqa: F811
    """A dashboard button or an automation plays a favourite by name through Jukebox,
    so that it is logged and, with a party on, isn't put back as a guest's change."""
    from homeassistant.core import SupportsResponse
    from homeassistant.exceptions import HomeAssistantError

    async def browse(call):
        top = call.data["media_content_id"] == ""
        folder = {"title": "Radio", "media_content_type": "favorites_folder"}
        station = {"title": "Harbour FM", "media_class": "genre", "can_play": True}
        ids = {"media_content_id": "FV:2/6", "media_content_type": "favorite_item_id"}
        child = {**folder, "media_content_id": "radio"} if top else {**station, **ids}
        return {KITCHEN: {"children": [child]}}

    hass.services.async_register(
        "media_player", "browse_media", browse, supports_response=SupportsResponse.ONLY
    )
    caplog.set_level("INFO")

    play = {"rooms": [KITCHEN, PORCH], "favourite": " harbour fm "}
    await hass.services.async_call("casa_mia_jukebox", "play", play, blocking=True)
    assert sent == [
        ("join", {"entity_id": KITCHEN, "group_members": [PORCH]}),
        (
            "play_media",
            {
                "entity_id": KITCHEN,
                "media_content_id": "FV:2/6",
                "media_content_type": "favorite_item_id",
            },
        ),
    ]
    assert "An automation: play_media in media_player.kitchen" in caplog.text
    # The party took both as Jukebox's own: the porch is one of its rooms now.
    await house.settled()
    assert PORCH in house.party.rooms and not house.party.undone

    with pytest.raises(HomeAssistantError, match="no favourite or playlist called"):
        unknown = {"rooms": [KITCHEN], "favourite": "Nothing of the kind"}
        await hass.services.async_call(
            "casa_mia_jukebox", "play", unknown, blocking=True
        )
