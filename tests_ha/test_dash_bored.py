"""Dash-Bored inside a real Home Assistant: its set-up, its page in the sidebar, the
photographs it takes of what the cameras see, and the feed of Sensor Watch's alerts that
its pages follow. Sensor Watch itself is not loaded:
the two meet only through its bus event, which each test fires by hand."""

import asyncio

import pytest
from custom_components.casa_mia_dash_bored import image as sightings
from custom_components.casa_mia_dash_bored import sightings as log
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
    ("name", "device_class", "kind"),
    [
        ("person_detected", None, "person"),
        ("Person occupancy", "occupancy", "person"),
        ("vehicle_detected", None, "vehicle"),
        ("animal_detected", None, "animal"),
        ("doorbell", "occupancy", "doorbell"),
        ("smoke_alarm_detected", None, "alarm"),
        ("co_alarm_detected", "carbon_monoxide", "alarm"),
        # The type of event an event entity fires.
        ("person", None, "person"),
        ("pet", None, "animal"),
        ("car", None, "vehicle"),
        ("smoke", None, "alarm"),
        # Heard, not seen; and what would fill the paper.
        ("car_alarm_detected", None, None),
        ("car_horn_detected", None, None),
        ("siren", None, None),
        ("license_plate", None, None),
        ("Motion", "motion", None),
        ("is_dark", None, None),
    ],
)
def test_which_detections_are_worth_a_photograph(name, device_class, kind):
    assert sightings.kind_of(name, device_class) == kind


async def shed(hass, monkeypatch, platform="test"):
    """An invented camera with a person sensor, a motion sensor, a doorbell and an event
    entity that says what it detected, and Dash-Bored set up beside it. Gives the stills asked for, and the sighting's entity id."""
    source = MockConfigEntry(domain="test")
    source.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("test", "shed")},
        name="Shed camera",
    )
    entities = er.async_get(hass)
    detects = {"event_types": ["person", "animal", "vehicle", "license_plate"]}
    for domain, uid, key, device_class, capabilities in (
        ("camera", "cam", None, None, None),
        ("binary_sensor", "person", "person_detected", None, None),
        ("binary_sensor", "animal", "animal_detected", None, None),
        ("binary_sensor", "motion", None, "motion", None),
        ("event", "ring", None, "doorbell", None),
        ("event", "detect", None, None, detects),
        ("event", "motion", None, "motion", {"event_types": ["motion"]}),
    ):
        entities.async_get_or_create(
            domain,
            platform,
            uid,
            config_entry=source,
            device_id=device.id,
            translation_key=key,
            original_device_class=device_class,
            capabilities=capabilities,
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
    """As UniFi Protect tells it: the sensor turns on, with no word of which event, and
    the event entity fires a moment later naming it. One sighting, told at once with the
    first photograph; Protect's own picture follows, and its failure leaves the first."""
    ready, wanted = asyncio.Event(), []

    async def thumbnail(_hass, entry_id, event_id):
        wanted.append(event_id)
        await ready.wait()
        if event_id == "gone":
            raise RuntimeError("no such event")
        return b"protect's choice"

    monkeypatch.setattr(sightings, "protect_thumbnail", thumbnail)
    asked, entity_id = await shed(hass, monkeypatch, platform="unifiprotect")
    entity = hass.data["image"].get_entity(entity_id)

    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    assert entity._photo == b"a photograph" and wanted == []
    seen, first = hass.states.get(entity_id).state, entity._id

    freezer.tick(1)
    fired = {"event_type": "person", "event_id": "e1"}
    hass.states.async_set("event.shed_detect", "2026-11-13T10:00:01+00:00", fired)
    await hass.async_block_till_done()
    assert wanted == ["e1"] and len(asked) == 1 and entity._id == first

    freezer.tick(2)
    ready.set()
    await hass.async_block_till_done(wait_background_tasks=True)
    state = hass.states.get(entity_id)
    assert entity._photo == b"protect's choice"
    # The photograph is newer, so a page fetches it; the sighting is when it was.
    assert state.state != seen and state.attributes["seen"] == seen
    (item,) = hass.data[log.KEY].items.values()
    assert item["id"] == first and item["changed"] == item["at"] + 3
    assert hass.data[log.KEY].photos[first] == (b"protect's choice", "image/jpeg")

    # An event entity alone is a sighting too, of the kind it says; and what it does
    # not say is worth a photograph (a number plate read) is none.
    freezer.tick(sightings.APART)
    fired = {"event_type": "license_plate", "event_id": "plate"}
    hass.states.async_set("event.shed_detect", "2026-11-13T10:00:09+00:00", fired)
    fired = {"event_type": "animal", "event_id": "gone"}
    hass.states.async_set("event.shed_detect", "2026-11-13T10:00:10+00:00", fired)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert entity._kind == "animal" and entity._id != first
    assert entity._photo == b"a photograph" and wanted == ["e1", "gone"]
    assert "the first photograph stays: RuntimeError: no such event" in caplog.text


async def test_each_sighting_is_kept_with_its_own_photograph_for_half_an_hour(
    hass, hass_ws_client, hass_client_no_auth, monkeypatch, freezer
):
    """An animal reported after a person does not take the person's picture away: both
    are in the feed. A page opened later is told them, and fetches each photograph by
    its sighting's id."""
    _, entity_id = await shed(hass, monkeypatch)
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    freezer.tick(30)
    hass.states.async_set("binary_sensor.shed_animal", "on")
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": log.SIGHTINGS})
    assert (await client.receive_json())["success"]
    person, animal = (await client.receive_json())["event"]
    assert [person["kind"], animal["kind"]] == ["person", "animal"]
    assert animal["at"] == person["at"] + 30 and person["id"] != animal["id"]
    assert person["entity"] == entity_id and person["camera"] == "camera.shed_cam"

    photos = await hass_client_no_auth()
    served = await photos.get(log.PHOTO.format(sighting_id=person["id"]))
    assert await served.read() == b"a photograph"
    assert (await photos.get(log.PHOTO.format(sighting_id="guess"))).status == 404

    # Half an hour on, the next sighting finds the old ones gone, photographs and all.
    freezer.tick(log.KEEP + 1)
    hass.states.async_set("binary_sensor.shed_person", "off")
    hass.states.async_set("binary_sensor.shed_person", "on")
    await hass.async_block_till_done()
    kept = hass.data[log.KEY]
    assert [item["kind"] for item in kept.items.values()] == ["person"]
    assert list(kept.photos) == list(kept.items) != [person["id"]]
