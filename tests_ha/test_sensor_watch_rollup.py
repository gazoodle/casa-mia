"""A failed integration is one problem (rollup.py), inside a real Home Assistant: its own
retry loop, its registries, and the Notify on Sensor Watch blueprint telling a phone.

Why these: to 2026.11.11 every retry was said as a recovery, a new failure never reached a
phone, and one failed cloud filled every card, hiding the fault that came after it."""

from copy import deepcopy
from datetime import datetime

import pytest
from custom_components.casa_mia_sensor_watch import admin
from custom_components.casa_mia_sensor_watch.const import DOMAIN, WITHDRAWN
from custom_components.casa_mia_sensor_watch.kept import KEY
from homeassistant import config_entries
from homeassistant.components import persistent_notification
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    MockModule,
    async_capture_events,
    async_fire_time_changed,
    async_mock_service,
    mock_config_flow,
    mock_integration,
    mock_platform,
)

CLOUD = "cloudy"
OVEN, HOB, FRIDGE = "binary_sensor.oven", "binary_sensor.hob", "binary_sensor.fridge"
FREEZER, SPEED = "binary_sensor.freezer", "sensor.speed"


def binary(eid, unavailable="error", group=None, **more):
    record = {
        "entity_id": eid,
        "kind": "binary",
        "name": eid.split(".")[1].title(),
        "hold_off": 60,
        "unavailable": unavailable,
        "unavailable_hold": 300,
        "off": {"level": "nominal", "message": ""},
        "on": {"level": "error", "message": "Fault"},
    }
    return record | ({"group": group} if group else {}) | more


RECORDS = [
    binary(OVEN, group="kitchen"),
    binary(HOB),
    binary(FRIDGE),
    binary(FREEZER, unavailable="critical"),
    {
        "entity_id": SPEED,
        "kind": "numeric",
        "name": "Speed",
        "hold_off": 0,
        "unavailable": "error",
        "bands": [
            {"from": None, "to": 20, "level": "error", "message": "Barely working"},
            {"from": 20, "to": None, "level": "nominal", "message": ""},
        ],
        "otherwise": "error",
    },
]
GROUP = {
    "id": "kitchen",
    "name": "Kitchen",
    "filters": {"q": "matches-nothing"},
    "profile": "",
    "left": [],
}


class House:
    """Sensor Watch, two automations from its blueprint (everything, and the Kitchen
    group's), and a cloud integration that won't set up until told it may."""

    def __init__(self, hass, freezer):
        self.hass, self.freezer = hass, freezer
        self.cloud_up = False
        self.revived = [OVEN, HOB, FRIDGE, FREEZER]
        self.reason = "503 Service Unavailable"
        self.fault = ConfigEntryNotReady  # how it fails: retrying, unless a test says
        self.phone = async_mock_service(hass, "notify", "mobile_app_test")
        self.kitchen = async_mock_service(hass, "notify", "mobile_app_kitchen")
        self.events = async_capture_events(hass, DOMAIN)

        async def setup(hass, entry):
            if not self.cloud_up:
                raise self.fault(self.reason)
            for eid in self.revived:
                hass.states.async_set(eid, "off")
            return True

        async def unload(hass, entry):
            return True

        module = MockModule(CLOUD, async_setup_entry=setup, async_unload_entry=unload)
        mock_integration(hass, module)
        mock_platform(hass, f"{CLOUD}.config_flow", None)
        self.cloud = MockConfigEntry(domain=CLOUD, title="Cloudy")
        self.cloud.add_to_hass(hass)
        for eid in (OVEN, HOB, FRIDGE, FREEZER):
            domain, name = eid.split(".")
            er.async_get(hass).async_get_or_create(
                domain, CLOUD, name, config_entry=self.cloud, suggested_object_id=name
            )
        self.watch = MockConfigEntry(domain=DOMAIN, data={})
        self.watch.add_to_hass(hass)
        self.key = f"integration.{self.cloud.entry_id}"

    async def start(self):
        hass = self.hass
        hass.states.async_set(SPEED, "90")
        assert await async_setup_component(hass, "persistent_notification", {})
        self.cloud_up = True  # working, until a test fails it
        assert await hass.config_entries.async_setup(self.cloud.entry_id)
        self.cloud_up = False
        assert await hass.config_entries.async_setup(self.watch.entry_id)
        await hass.async_block_till_done(wait_background_tasks=True)
        automation = {"path": "casa_mia/sensor_watch_notify.yaml"}
        assert await async_setup_component(
            hass,
            "automation",
            {
                "automation": [
                    {
                        "alias": "everything",
                        "use_blueprint": automation
                        | {"input": {"notify": "notify.mobile_app_test"}},
                    },
                    {
                        "alias": "kitchen",
                        "use_blueprint": automation
                        | {
                            "input": {
                                "notify": "notify.mobile_app_kitchen",
                                "group": "Kitchen",
                                "persistent": False,
                            }
                        },
                    },
                ]
            },
        )
        await self.settle()
        return self

    async def settle(self):
        await self.hass.async_block_till_done(wait_background_tasks=True)

    async def later(self, seconds, step=20):
        for _ in range(0, seconds, step):
            self.freezer.tick(step)
            async_fire_time_changed(self.hass, dt_util.utcnow())
            await self.settle()

    async def fail(self):
        """As at a start: its entities unavailable, then its setup failing."""
        for eid in (OVEN, HOB, FRIDGE, FREEZER):
            self.hass.states.async_set(eid, "unavailable")
        await self.hass.config_entries.async_reload(self.cloud.entry_id)
        await self.settle()

    async def restart(self):
        """Home Assistant started again: every state stamped afresh, its notifications
        gone, Sensor Watch loading before it has started."""
        hass = self.hass
        assert await hass.config_entries.async_unload(self.watch.entry_id)
        await self.settle()
        persistent_notification.async_dismiss_all(hass)
        hass.set_state(CoreState.not_running)
        for eid in (OVEN, HOB, FRIDGE, FREEZER):
            state = hass.states.get(eid).state
            hass.states.async_remove(eid)
            hass.states.async_set(eid, state)
        assert await hass.config_entries.async_setup(self.watch.entry_id)
        await self.settle()
        hass.set_state(CoreState.running)
        hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
        await self.settle()

    async def listed(self, **data):
        got = await self.hass.services.async_call(
            DOMAIN, "list", data, blocking=True, return_response=True
        )
        return got

    async def rows(self, **data):
        return {r["entity_id"]: r for r in (await self.listed(**data))["sensors"]}

    def titles(self, calls=None):
        return [c.data["title"] for c in (self.phone if calls is None else calls)]

    def notes(self):
        found = persistent_notification._async_get_or_create_notifications(self.hass)
        return sorted(n["title"] for n in found.values())

    def count(self, level="error"):
        return int(self.hass.states.get(f"sensor.sensor_watch_{level}s").state)


@pytest.fixture
async def house(hass, freezer, hass_storage, tmp_path):
    hass.config.config_dir = str(tmp_path)  # where the blueprint is written
    hass_storage[admin.DATA] = {
        "version": 1,
        "key": admin.DATA,
        # Its own copy: a test that changes a record mustn't change the next test's.
        "data": {"records": deepcopy(RECORDS), "groups": {"kitchen": GROUP}},
    }

    class Flow(config_entries.ConfigFlow):
        VERSION = 1

    with mock_config_flow(CLOUD, Flow):
        made = House(hass, freezer)
        for eid in (OVEN, HOB, FRIDGE, FREEZER):
            hass.states.async_set(eid, "off")
        yield await made.start()


async def test_a_retry_is_neither_a_recovery_nor_a_new_failure(house):
    began = dt_util.utcnow()
    await house.fail()
    await house.later(700)
    written = house.hass.states.get("sensor.sensor_watch_status").last_updated
    await house.later(2 * 3600)
    # Not one write for all those retries.
    assert house.hass.states.get("sensor.sensor_watch_status").last_updated == written

    said = [e.data for e in house.events if e.data["entity_id"] == house.key]
    said = [d for d in said if not d["for_group"]]
    assert [(d["level"], d["initial"]) for d in said] == [("error", False)]
    row = (await house.rows())[house.key]
    assert abs((datetime.fromisoformat(row["since"]) - began).total_seconds()) < 2
    assert row["message"] == (
        "not connecting, 3 watched sensors unavailable: 503 Service Unavailable"
    )


async def test_its_unavailable_sensors_are_one_problem_and_one_notification(house):
    await house.fail()
    await house.later(700)

    rows = await house.rows()
    assert set(rows) == {house.key, FREEZER}  # critical when unavailable: its own
    assert {s["entity_id"] for s in rows[house.key]["sensors"]} == {OVEN, HOB, FRIDGE}
    assert (house.count(), house.count("warning")) == (1, 0)
    assert sorted(house.titles()) == ["Critical: Freezer", "Error: Cloudy"]
    assert house.notes() == ["Critical: Freezer", "Error: Cloudy"]
    status = house.hass.states.get("sensor.sensor_watch_status").attributes
    assert status["rolled_up"] == 3

    # What came later is second, not below every sensor of the failure.
    house.hass.states.async_set(SPEED, "11")
    await house.settle()
    errors = (await house.listed(levels=["error"]))["sensors"]
    assert [r["entity_id"] for r in errors] == [house.key, SPEED]
    assert house.titles()[-1] == "Error: Speed"


async def test_a_group_still_sees_and_hears_its_rolled_up_sensors(house):
    await house.fail()
    await house.later(700)

    got = await house.listed(group="Kitchen")
    assert got["worst"] == "error"
    [row] = got["sensors"]
    assert row["entity_id"] == house.key
    assert [s["entity_id"] for s in row["sensors"]] == [OVEN]  # the group's alone
    assert house.titles(house.kitchen) == ["Error: Cloudy"]
    # The automation for everything wasn't told a second time for the group.
    assert house.titles().count("Error: Cloudy") == 1

    house.cloud_up = True
    await house.later(700)
    assert house.titles(house.kitchen) == ["Error: Cloudy", "Back to nominal: Cloudy"]


async def test_recovery_is_said_once_for_the_integration(house):
    await house.fail()
    await house.later(700)
    house.cloud_up = True
    await house.later(700)

    assert await house.rows() == {}
    assert house.count() == 0
    assert house.titles().count("Back to nominal: Cloudy") == 1
    assert not {"Back to nominal: Oven", "Error: Oven"} & set(house.titles())
    assert house.notes() == []


async def test_one_still_unavailable_after_the_recovery_is_its_own_row(house):
    await house.fail()
    await house.later(700)
    house.revived = [OVEN, HOB, FREEZER]
    house.cloud_up = True
    await house.hass.config_entries.async_reload(house.cloud.entry_id)
    await house.settle()
    assert "Error: Fridge" not in house.titles()  # given its time to come back

    await house.later(320)
    assert set(await house.rows()) == {FRIDGE}
    assert house.titles().count("Error: Fridge") == 1


async def test_a_bad_reading_breaks_out_of_the_roll_up(house):
    await house.fail()
    await house.later(700)
    house.hass.states.async_set(HOB, "on")  # the same level, for another reason
    await house.settle()

    rows = await house.rows()
    assert rows[HOB]["message"] == "Fault"
    assert house.titles().count("Error: Hob") == 1
    assert {s["entity_id"] for s in rows[house.key]["sensors"]} == {OVEN, FRIDGE}


async def test_those_already_said_are_taken_in_and_said_back_truly(house):
    """Unavailable while the integration still says it is loaded, then it fails."""
    house.hass.states.async_set(OVEN, "unavailable")
    await house.later(320)
    assert house.notes() == ["Error: Oven"]

    withdrawn = async_capture_events(house.hass, WITHDRAWN)
    await house.fail()
    assert house.count() == 1  # still counted until the integration's row is there
    assert not withdrawn
    await house.later(700)
    assert [e.data["entity_id"] for e in withdrawn] == [OVEN]
    assert "Error: Oven" not in house.notes()
    assert "Back to nominal: Oven" not in house.titles()

    house.cloud_up = True
    await house.later(700)
    assert house.titles().count("Back to nominal: Oven") == 1


async def test_a_restart_keeps_since_and_doesnt_tell_the_phone_again(house):
    await house.fail()
    await house.later(3600)
    before = await house.rows()
    told = house.titles()

    await house.restart()
    assert house.key in await house.rows()  # known to be failing: no five more minutes
    await house.later(700)

    after = await house.rows()
    assert after[house.key]["since"] == before[house.key]["since"]
    assert after[FREEZER]["since"] == before[FREEZER]["since"]
    was = {s["entity_id"]: s["since"] for s in before[house.key]["sensors"]}
    now = {s["entity_id"]: s["since"] for s in after[house.key]["sensors"]}
    assert now == was
    assert house.titles() == told
    assert house.notes() == ["Critical: Freezer", "Error: Cloudy"]  # raised again


async def test_a_recovery_during_a_restart_is_said(house):
    await house.fail()
    await house.later(700)
    assert await house.hass.config_entries.async_unload(house.watch.entry_id)
    house.cloud_up = True
    await house.hass.config_entries.async_reload(house.cloud.entry_id)
    await house.settle()
    assert await house.hass.config_entries.async_setup(house.watch.entry_id)
    await house.settle()

    assert house.titles().count("Back to nominal: Cloudy") == 1
    assert await house.rows() == {}


async def test_found_unavailable_and_refresh_leave_the_phone_be(house):
    house.hass.states.async_set(HOB, "unavailable")
    await house.later(320)
    assert house.titles() == ["Error: Hob"]

    await house.hass.services.async_call(DOMAIN, "refresh", {}, blocking=True)
    await house.settle()
    assert house.titles() == ["Error: Hob"]
    assert house.events[-1].data["initial"]

    await house.restart()
    await house.later(320)
    assert house.titles() == ["Error: Hob"]
    assert house.notes() == ["Error: Hob"]


async def test_watching_one_already_unavailable_is_found_not_a_change(
    house, hass_ws_client
):
    house.hass.states.async_set("binary_sensor.shed", "unavailable")
    await house.later(320)
    ws = await hass_ws_client(house.hass)
    record = binary("binary_sensor.shed")
    del record["entity_id"]
    await ws.send_json(
        {"id": 1, "type": admin.API, "method": "PUT", "path": "binary_sensor.shed"}
        | {"body": record}
    )
    assert (await ws.receive_json())["result"]["status"] == 200
    await house.settle()

    assert "binary_sensor.shed" in await house.rows()
    assert house.titles() == []


async def test_ignore_is_never_said_as_good_news(house, hass_ws_client):
    await house.fail()
    await house.later(700)
    told = house.titles()
    ws = await hass_ws_client(house.hass)
    withdrawn = async_capture_events(house.hass, WITHDRAWN)

    await ws.send_json(
        {"id": 1, "type": admin.API, "method": "POST", "path": "system/ignore"}
        | {"body": {"entry_id": house.cloud.entry_id, "name": "Cloudy"}}
    )
    assert (await ws.receive_json())["result"]["status"] == 200
    await house.settle()

    assert house.titles() == told
    assert not [e for e in house.events if e.data["level"] == "nominal"]
    assert "Error: Cloudy" not in house.notes()
    assert [e.data["entity_id"] for e in withdrawn] == [house.key]
    # Nothing hidden: the sensors that were under it are listed by themselves.
    assert set(await house.rows()) == {OVEN, HOB, FRIDGE, FREEZER}


async def test_one_that_escalates_to_critical_breaks_out(house, hass_ws_client):
    ws = await hass_ws_client(house.hass)
    record = binary(HOB, escalate={"error": 3600})
    del record["entity_id"]
    await ws.send_json(
        {"id": 1, "type": admin.API, "method": "PUT", "path": HOB} | {"body": record}
    )
    assert (await ws.receive_json())["result"]["status"] == 200
    await house.fail()
    await house.later(700)
    assert HOB not in await house.rows()

    await house.later(3600)
    assert (await house.rows())[HOB]["level"] == "critical"
    assert house.titles().count("Critical: Hob") == 1


async def test_disabling_the_integration_is_never_said_as_good_news(house):
    await house.fail()
    await house.later(700)
    await house.hass.config_entries.async_set_disabled_by(
        house.cloud.entry_id, config_entries.ConfigEntryDisabler.USER
    )
    await house.settle()

    assert not [e for e in house.events if e.data["level"] == "nominal"]
    assert house.key not in await house.rows()


async def test_a_routine_reload_says_nothing(house):
    house.cloud_up = True
    await house.hass.config_entries.async_reload(house.cloud.entry_id)
    await house.settle()
    await house.later(700)

    assert not house.events
    assert await house.rows() == {}


async def test_the_switch_off_lists_its_sensors_without_telling_the_phone(
    house, hass_ws_client
):
    await house.fail()
    await house.later(700)
    told = house.titles()
    ws = await hass_ws_client(house.hass)
    await ws.send_json(
        {"id": 1, "type": admin.API, "method": "PUT", "path": "system"}
        | {"body": {"integrations": False}}
    )
    assert (await ws.receive_json())["result"]["status"] == 200
    await house.settle()

    assert set(await house.rows()) == {OVEN, HOB, FRIDGE, FREEZER}
    assert house.titles() == told


async def test_updated_to_in_the_middle_of_an_outage(house, hass_storage):
    """The first start of this version: an outage under way and nothing kept of it. One
    of its sensors has no hold-off, so counts before Home Assistant has started."""
    await house.fail()
    await house.later(700)
    hass = house.hass
    assert await hass.config_entries.async_unload(house.watch.entry_id)
    await house.settle()
    hass_storage.pop(KEY)
    for record in hass_storage[admin.DATA]["data"]["records"]:
        if record["entity_id"] == HOB:
            record["unavailable_hold"] = 0
    persistent_notification.async_dismiss_all(hass)
    house.phone.clear()
    hass.set_state(CoreState.not_running)
    for eid in (OVEN, HOB, FRIDGE, FREEZER):
        hass.states.async_remove(eid)
        hass.states.async_set(eid, "unavailable")
    assert await hass.config_entries.async_setup(house.watch.entry_id)
    house.freezer.tick(20)  # the rest of the start
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await house.settle()
    await house.later(700)

    assert set(await house.rows()) == {house.key, FREEZER}
    assert house.notes() == ["Critical: Freezer", "Error: Cloudy"]
    assert sorted(house.titles()) == ["Critical: Freezer", "Error: Cloudy"]
