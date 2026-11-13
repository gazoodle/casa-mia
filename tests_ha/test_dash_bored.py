"""Dash-Bored inside a real Home Assistant: its set-up, its page in the sidebar, the
photographs it takes of what the cameras see, and the feed of Sensor Watch's alerts that
its pages follow. Sensor Watch itself is not loaded:
the two meet only through its bus event, which each test fires by hand."""

import asyncio

import pytest
from custom_components.casa_mia_dash_bored import image as sightings
from custom_components.casa_mia_dash_bored.const import (
    ALERTS,
    CARDS_VERSION,
    DOMAIN,
    PANEL,
    WATCH_EVENT,
)
from homeassistant.components import frontend
from homeassistant.config_entries import SOURCE_USER, ConfigEntryState
from homeassistant.core import SupportsResponse
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

FREEZER = {
    "entity_id": "sensor.freezer",
    "name": "Freezer",
    "level": "warning",
    "previous": "nominal",
    "value": -11,
    "unit": "°C",
    "message": "The freezer is warmer than it should be.",
    "area": "Kitchen",
    "escalated": False,
    "group": "Cold things",  # not a page's business, so not passed on
}


async def set_up(hass):
    entry = MockConfigEntry(domain=DOMAIN, title="Dash-Bored")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_the_hide_label_is_made_once_under_the_id_the_pages_know(hass):
    entry = await set_up(hass)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    # house.ts knows it as HIDE: the two must not drift apart.
    assert [label.label_id for label in lr.async_get(hass).async_list_labels()] == [
        "dash_bored_hide"
    ]


async def feed(hass, hass_ws_client):
    """A page following the alerts: its client, and what it was told on subscribing."""
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": ALERTS})
    assert (await client.receive_json())["success"]
    return client, (await client.receive_json())["event"]


async def test_the_set_up_has_nothing_to_fill_in_and_only_happens_once(hass):
    assert await async_setup_component(hass, "http", {})
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Dash-Bored"

    again = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert again["type"] is FlowResultType.ABORT
    assert again["reason"] == "single_instance_allowed"


async def test_the_page_is_in_the_sidebar_for_everyone_until_removed(
    hass, hass_ws_client
):
    entry = await set_up(hass)
    panel = hass.data[frontend.DATA_PANELS][PANEL]
    assert panel.sidebar_title == "Dash-Bored" and not panel.require_admin
    served = panel.config["_panel_custom"]
    assert served["name"] == "dash-bored-gazette" and not served["embed_iframe"]
    assert served["module_url"].startswith("/casa_mia_dash_bored/cards.js?v=")

    # A reload leaves it: taking a panel from under an open page breaks the page.
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert entry.state is ConfigEntryState.LOADED
    assert PANEL in hass.data[frontend.DATA_PANELS]

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": CARDS_VERSION})
    assert (await client.receive_json())["result"]["version"]

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert PANEL not in hass.data[frontend.DATA_PANELS]


async def test_a_page_opened_after_an_alert_is_still_told_of_it(hass, hass_ws_client):
    await set_up(hass)
    hass.bus.async_fire(WATCH_EVENT, FREEZER)
    await hass.async_block_till_done()

    _, held = await feed(hass, hass_ws_client)
    assert len(held) == 1
    alert = held[0]
    assert alert["name"] == "Freezer" and alert["level"] == "warning"
    assert alert["message"] == FREEZER["message"] and alert["area"] == "Kitchen"
    assert alert["began"] == alert["at"] and "group" not in alert


async def test_when_a_level_began_is_sensor_watchs_own_word(hass, hass_ws_client):
    """After a restart Sensor Watch says each level again, with when it truly began."""
    await set_up(hass)
    hass.bus.async_fire(WATCH_EVENT, {**FREEZER, "since": "2026-11-13T10:00:00+00:00"})
    await hass.async_block_till_done()

    _, (alert,) = await feed(hass, hass_ws_client)
    assert alert["at"] == alert["began"] == 1794564000


async def test_an_alert_is_pushed_to_a_page_that_is_open(hass, hass_ws_client):
    await set_up(hass)
    client, held = await feed(hass, hass_ws_client)
    assert held == []

    hass.bus.async_fire(WATCH_EVENT, FREEZER)
    pushed = (await client.receive_json())["event"]
    assert [alert["level"] for alert in pushed] == ["warning"]


async def test_when_the_trouble_began_outlives_an_escalation_and_the_recovery(
    hass, hass_ws_client, freezer
):
    """A fresh page each time: moving the clock closes the test's open websocket."""

    async def now_held():
        await hass.async_block_till_done()
        return (await feed(hass, hass_ws_client))[1]

    await set_up(hass)
    hass.bus.async_fire(WATCH_EVENT, FREEZER)
    (first,) = await now_held()

    freezer.tick(120)
    worse = {**FREEZER, "level": "critical", "previous": "warning", "escalated": True}
    hass.bus.async_fire(WATCH_EVENT, worse)
    (second,) = await now_held()
    assert second["level"] == "critical" and second["escalated"]
    assert second["began"] == first["began"] and second["at"] == first["at"] + 120

    # Put right: still told, with when the trouble began, for the recovery story.
    freezer.tick(60)
    hass.bus.async_fire(WATCH_EVENT, {**FREEZER, "level": "nominal"})
    (mended,) = await now_held()
    assert mended["level"] == "nominal" and mended["began"] == first["began"]

    # Long mended, it is dropped when the next event comes; a sensor found well is no news.
    freezer.tick(601)
    hass.bus.async_fire(
        WATCH_EVENT, {**FREEZER, "entity_id": "sensor.loft", "level": "nominal"}
    )
    assert await now_held() == []


async def test_an_event_with_no_entity_is_ignored_aloud(hass, hass_ws_client, caplog):
    await set_up(hass)
    hass.bus.async_fire(WATCH_EVENT, {"level": "warning"})
    await hass.async_block_till_done()
    assert "no entity_id was ignored" in caplog.text
    _, held = await feed(hass, hass_ws_client)
    assert held == []


@pytest.mark.parametrize(
    ("domain", "name", "device_class", "kind"),
    [
        ("binary_sensor", "person_detected", None, "person"),
        ("binary_sensor", "Person occupancy", "occupancy", "person"),
        ("binary_sensor", "vehicle_detected", None, "vehicle"),
        ("binary_sensor", "animal_detected", None, "animal"),
        ("binary_sensor", "doorbell", "occupancy", "doorbell"),
        ("event", "ring", "doorbell", "doorbell"),
        ("binary_sensor", "smoke_alarm_detected", None, "alarm"),
        ("binary_sensor", "co_alarm_detected", "carbon_monoxide", "alarm"),
        # Heard, not seen; and what would fill the paper.
        ("binary_sensor", "car_alarm_detected", None, None),
        ("binary_sensor", "car_horn_detected", None, None),
        ("binary_sensor", "Motion", "motion", None),
        ("binary_sensor", "is_dark", None, None),
        ("event", "motion", "motion", None),
    ],
)
def test_which_detections_are_worth_a_photograph(domain, name, device_class, kind):
    assert sightings.kind_of(domain, name, device_class) == kind


async def shed(hass, monkeypatch, platform="test"):
    """An invented camera with a person sensor, a motion sensor and a doorbell, and Dash-
    Bored set up beside it. Gives the stills asked for, and the sighting's entity id."""
    source = MockConfigEntry(domain="test")
    source.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("test", "shed")},
        name="Shed camera",
    )
    entities = er.async_get(hass)
    for domain, uid, key, device_class in (
        ("camera", "cam", None, None),
        ("binary_sensor", "person", "person_detected", None),
        ("binary_sensor", "motion", None, "motion"),
        ("event", "ring", None, "doorbell"),
    ):
        entities.async_get_or_create(
            domain,
            platform,
            uid,
            config_entry=source,
            device_id=device.id,
            translation_key=key,
            original_device_class=device_class,
            suggested_object_id=f"shed_{uid}",
        )
        hass.states.async_set(f"{domain}.shed_{uid}", "off")

    asked: list[str] = []

    async def still(_hass, camera_id):
        asked.append(camera_id)
        if camera_id == "broken":
            raise HomeAssistantError("the camera did not answer")
        return b"a photograph", "image/jpeg"

    monkeypatch.setattr(sightings, "from_camera", still)
    await set_up(hass)
    entity_id = entities.async_get_entity_id("image", DOMAIN, f"sighting-{device.id}")
    assert entity_id and entities.async_get(entity_id).device_id == device.id
    return asked, entity_id


async def test_a_person_seen_is_photographed_and_plain_motion_is_not(
    hass, hass_client, monkeypatch
):
    asked, entity_id = await shed(hass, monkeypatch)
    assert hass.states.get(entity_id).state == "unknown"

    hass.states.async_set("binary_sensor.shed_motion", "on")
    await hass.async_block_till_done()
    assert asked == []

    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    assert asked == ["camera.shed_cam"]
    state = hass.states.get(entity_id)
    assert state.attributes["kind"] == "person" and state.attributes["photo"]
    assert state.attributes["camera"] == "camera.shed_cam"

    # Home Assistant serves it to a page by the address in the entity's own state.
    client = await hass_client()
    served = await client.get(state.attributes["entity_picture"])
    assert await served.read() == b"a photograph"


async def test_a_doorbell_rung_as_the_person_is_seen_is_one_photograph(
    hass, monkeypatch, freezer
):
    asked, entity_id = await shed(hass, monkeypatch)
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    taken = hass.states.get(entity_id).state

    freezer.tick(2)
    hass.states.async_set("event.shed_ring", "2026-11-13T10:00:02+00:00")
    await hass.async_block_till_done()
    state = hass.states.get(entity_id)
    assert len(asked) == 1 and state.state == taken
    assert state.attributes["kind"] == "doorbell"

    # Later, it is a new sighting with a photograph of its own.
    freezer.tick(sightings.APART)
    hass.states.async_set("binary_sensor.shed_person", "off")
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    state = hass.states.get(entity_id)
    assert len(asked) == 2 and state.state != taken
    assert state.attributes["kind"] == "person"


async def test_a_camera_that_does_not_answer_is_told_with_no_photograph(
    hass, monkeypatch, caplog
):
    """Never an old photograph under a new headline."""
    _, entity_id = await shed(hass, monkeypatch)
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).attributes["photo"]

    entity = hass.data["image"].get_entity(entity_id)
    entity._camera = "broken"
    entity._at = None
    hass.states.async_set("binary_sensor.shed_person", "off")
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    state = hass.states.get(entity_id)
    assert state.attributes["kind"] == "person" and not state.attributes["photo"]
    assert "No photograph of the person at broken" in caplog.text


async def test_casa_mias_picture_is_used_when_it_has_one_and_the_camera_when_not(
    hass, monkeypatch, caplog
):
    """Casa Mia itself is not loaded: the two meet only through its service, which is
    stood in for here."""
    held: dict = {"picture": "ZnJvbSB0aGUgY2FjaGU=", "type": "image/png", "age": 1.2}
    calls: list[dict] = []

    async def camera_picture(call):
        calls.append(dict(call.data))
        if held.get("fail"):
            raise HomeAssistantError("the app did not answer")
        return held

    hass.services.async_register(
        *sightings.CACHE, camera_picture, supports_response=SupportsResponse.ONLY
    )
    asked, entity_id = await shed(hass, monkeypatch)

    async def seen():
        hass.data["image"].get_entity(entity_id)._at = None  # no wait between stills
        hass.states.async_set("binary_sensor.shed_person", "off")
        hass.states.async_set("binary_sensor.shed_person", "on")
        await hass.async_block_till_done()
        return hass.data["image"].get_entity(entity_id)

    entity = await seen()
    assert calls == [{"entity_id": "camera.shed_cam", "fresh": sightings.FRESH}]
    assert (entity._photo, entity.content_type) == (b"from the cache", "image/png")
    assert asked == [] and "photograph from Casa Mia" in caplog.text

    # Nothing new enough there (a camera nobody is watching): the camera is asked.
    held.update(picture=None, why="no picture in the last 5 s")
    entity = await seen()
    assert entity._photo == b"a photograph" and asked == ["camera.shed_cam"]

    # And the same when the app does not answer, said aloud.
    held.update(fail=True)
    entity = await seen()
    assert entity._photo == b"a photograph" and len(asked) == 2
    assert "could not be had, so the camera is asked" in caplog.text


async def test_protects_thumbnail_replaces_the_first_photograph_when_it_comes(
    hass, monkeypatch, freezer, caplog
):
    """The sighting is told at once with the first photograph; Protect's own picture of
    the event follows, and its failure leaves the first in place."""
    ready, asked = asyncio.Event(), []

    async def thumbnail(_hass, entry_id, event_id):
        asked.append(event_id)
        await ready.wait()
        if event_id == "gone":
            raise RuntimeError("no such event")
        return b"protect's choice"

    monkeypatch.setattr(sightings, "protect_thumbnail", thumbnail)
    _, entity_id = await shed(hass, monkeypatch, platform="unifiprotect")
    entity = hass.data["image"].get_entity(entity_id)

    hass.states.async_set("binary_sensor.shed_person", "on", {"event_id": "e1"})
    await hass.async_block_till_done()
    seen = hass.states.get(entity_id).state
    assert entity._photo == b"a photograph" and asked == ["e1"]
    assert hass.states.get(entity_id).attributes["seen"] == seen

    freezer.tick(3)
    ready.set()
    await hass.async_block_till_done(wait_background_tasks=True)
    state = hass.states.get(entity_id)
    assert entity._photo == b"protect's choice"
    # The photograph is newer, so a page fetches it; the sighting is when it was.
    assert state.state != seen and state.attributes["seen"] == seen

    entity._at = None  # no wait between stills
    hass.states.async_set("binary_sensor.shed_person", "off")
    hass.states.async_set("binary_sensor.shed_person", "on", {"event_id": "gone"})
    await hass.async_block_till_done(wait_background_tasks=True)
    assert entity._photo == b"a photograph" and asked == ["e1", "gone"]
    assert "the first photograph stays: RuntimeError: no such event" in caplog.text
