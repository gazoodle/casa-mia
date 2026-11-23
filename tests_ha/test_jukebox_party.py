"""Jukebox's party lock inside a real Home Assistant. The speaker is a stand-in that
keeps a queue and what it plays from, so a "guest" can change them behind Jukebox's back
and the lock can be seen to put them back."""

import asyncio
import re
from xml.sax.saxutils import unescape

import pytest
from custom_components.casa_mia_jukebox import party as party_module
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
        service = "ContentDirectory" if action == "Browse" else "AVTransport"
        text = answered(service, action, **(getattr(self, action)(said) or {}))
        return AiohttpClientMockResponse(method, url, text=text)

    def Browse(self, said):
        items = "".join(
            f'<item id="Q:0/{n}"><res>{uri}</res></item>'
            for n, uri in enumerate(self.queue, 1)
        )
        didl = "urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"
        return {"Result": f'<DIDL-Lite xmlns="{didl}">{items}</DIDL-Lite>'}

    def GetMediaInfo(self, said):
        return {"CurrentURI": self.uri, "CurrentURIMetaData": ""}

    def GetPositionInfo(self, said):
        return {"Track": self.song}

    def SetAVTransportURI(self, said):
        self.uri = said["CurrentURI"]

    def Seek(self, said):
        self.song = int(said["Target"])

    def Play(self, said):
        pass

    def RemoveTrackFromQueue(self, said):
        del self.queue[int(said["ObjectID"].split("/")[1]) - 1]

    def AddURIToQueue(self, said):
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
