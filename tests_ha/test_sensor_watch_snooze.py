"""Snooze (snooze.py), inside a real Home Assistant, in the house of the roll-up's tests:
a cloud integration that fails and retries, the Notify on Sensor Watch blueprint telling a
phone, and a group's automation.

Why these: a known outage held Status at error, so a fault that came after it changed
nothing anyone could see; and a snooze that could hide a fault for ever, or wake itself,
would be worse than none."""

from datetime import timedelta

import pytest
import test_sensor_watch_rollup as rollup
from custom_components.casa_mia_sensor_watch import admin
from custom_components.casa_mia_sensor_watch.const import DOMAIN, WITHDRAWN
from custom_components.casa_mia_sensor_watch.kept import KEY
from homeassistant.core import Context
from homeassistant.exceptions import ConfigEntryError, ServiceValidationError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_capture_events
from test_sensor_watch_rollup import FREEZER, OVEN, SPEED, binary

house = rollup.house  # its fixture: the house, started
DAY = {"days": 1}


async def down(house):
    """The cloud has failed and counts. Its freezer, critical when unavailable, is left
    working, so the failure is the worst there is."""
    await house.fail()
    house.hass.states.async_set(FREEZER, "off")
    await house.later(700)
    assert (await status(house)).state == "error"


async def snooze(house, what=None, context=None, **when):
    data = {"entity_id": what or house.key} | (when or {"duration": DAY})
    await house.hass.services.async_call(
        DOMAIN, "snooze", data, blocking=True, context=context
    )
    await house.later(20)  # the entities write at most once a moment


async def unsnooze(house, what=None):
    data = {"entity_id": what or house.key}
    await house.hass.services.async_call(DOMAIN, "unsnooze", data, blocking=True)
    await house.later(20)


async def status(house):
    """The Status sensor, once it has written: its entities write at once, then at
    most once a moment, and the tests' clock stands still between steps."""
    await house.later(1, step=1)
    return house.hass.states.get("sensor.sensor_watch_status")


async def snoozed(house, **data):
    return {r["entity_id"]: r for r in (await house.listed(**data))["snoozed"]}


async def test_a_snoozed_fault_leaves_everything_that_counts_but_stays_in_sight(house):
    await down(house)
    withdrawn = async_capture_events(house.hass, WITHDRAWN)
    user = await house.hass.auth.async_create_user("Sam")
    await snooze(house, context=Context(user_id=user.id))

    assert (await status(house)).state == "nominal"
    assert house.hass.states.get("binary_sensor.sensor_watch_problem").state == "off"
    assert house.count() == 0
    assert await house.rows() == {}
    assert house.notes() == []  # the sidebar's notification went with it
    assert [e.data for e in withdrawn] == [
        {"entity_id": house.key, "reason": "snoozed"}
    ]
    # Withdrawn, never said to be back.
    assert house.titles() == ["Error: Cloudy"]
    assert not [e for e in house.events if e.data["level"] == "nominal"]

    # In sight: the list's own part, and the Status sensor's attributes.
    row = (await snoozed(house))[house.key]
    assert row["snoozed"]["by"] == "Sam"
    until = dt_util.parse_datetime(row["snoozed"]["until"])
    assert abs(until - dt_util.utcnow() - timedelta(days=1)) < timedelta(minutes=1)
    assert len(row["sensors"]) == 3  # what is rolled up into it, as before
    attributes = (await status(house)).attributes
    assert attributes["snoozed"] == 1
    assert attributes["error_list"] == []
    [listed] = attributes["snoozed_list"]
    assert (listed["entity_id"], listed["by"]) == (house.key, "Sam")
    assert listed["level"] == "error"


async def test_what_comes_after_is_seen_and_heard(house):
    await down(house)
    await snooze(house)

    house.hass.states.async_set(SPEED, "11")
    await house.later(20)
    assert (await status(house)).state == "error"
    assert list(await house.rows()) == [SPEED]
    assert house.titles()[-1] == "Error: Speed"


async def test_nothing_is_said_of_it_while_it_is_snoozed(house):
    await down(house)
    await snooze(house)
    said, told = len(house.events), house.titles()

    await house.later(3 * 3600)  # retry after retry
    assert len(house.events) == said  # no event: any automation at all goes quiet
    assert house.titles() == told
    assert house.titles(house.kitchen) == ["Error: Cloudy"]
    assert (await status(house)).state == "nominal"


async def test_at_its_time_it_is_said_again_as_still_failing(house):
    await down(house)
    await snooze(house)
    await house.later(86400, step=900)

    assert (await status(house)).state == "error"
    assert await snoozed(house) == {}
    assert house.notes() == ["Error: Cloudy"]
    last = house.phone[-1].data
    assert last["title"] == "Error: Cloudy"
    assert last["message"].startswith("still failing, down 1 day: not connecting")
    # The group that has a sensor rolled up into it hears too.
    assert house.titles(house.kitchen) == ["Error: Cloudy", "Error: Cloudy"]
    assert "still failing" in house.kitchen[-1].data["message"]
    # Said once: the row's own message is as it was.
    assert (await house.rows())[house.key]["message"].startswith("not connecting")


async def test_a_restart_keeps_it(house, hass_storage):
    await down(house)
    await snooze(house)
    told = house.titles()
    await house.restart()
    await house.later(700)

    assert house.key in hass_storage[KEY]["data"]["snoozed"]
    assert house.key in await snoozed(house)
    assert (await status(house)).state == "nominal"
    assert house.titles() == told
    assert house.notes() == []

    # And its time still comes.
    await house.later(86400, step=900)
    assert (await status(house)).state == "error"
    assert house.titles()[-1] == "Error: Cloudy"


async def test_recovery_ends_it_only_once_it_has_held(house):
    await down(house)
    await snooze(house)
    told = house.titles()

    async def recover():
        house.cloud_up = True
        await house.hass.config_entries.async_reload(house.cloud.entry_id)
        await house.settle()
        house.cloud_up = False

    # A flap: back, and down again within the quarter of an hour. Still snoozed.
    await recover()
    assert await snoozed(house) == {}  # nothing to show while it works
    await house.fail()
    house.hass.states.async_set(FREEZER, "off")
    await house.later(400)
    assert house.key in await snoozed(house)
    assert (await status(house)).state == "nominal"
    assert house.titles() == told  # neither "back" nor the failure

    # Back for good: the next failure, an hour on, is a new one.
    await recover()
    await house.later(3600)
    await house.fail()
    house.hass.states.async_set(FREEZER, "off")
    await house.later(400)
    assert await snoozed(house) == {}
    assert (await status(house)).state == "error"
    assert house.titles() == [*told, "Error: Cloudy"]


async def test_another_kind_of_failure_breaks_through(house):
    await down(house)
    await snooze(house)

    # Retrying has turned into an error that needs someone.
    house.fault, house.reason = ConfigEntryError, "sign in again"
    await house.hass.config_entries.async_reload(house.cloud.entry_id)
    await house.settle()
    assert await snoozed(house) == {}
    assert (await status(house)).state == "error"
    last = house.phone[-1].data
    assert last["title"] == "Error: Cloudy"
    assert last["message"].startswith("failed to set up")


async def test_a_change_of_the_errors_words_does_not(house):
    await down(house)
    await snooze(house)
    told = house.titles()

    house.reason = "504 Gateway Timeout"
    await house.later(1300)  # a retry or two
    assert "504" in (await snoozed(house))[house.key]["message"]
    assert house.titles() == told


async def test_a_worse_level_breaks_through_but_escalation_alone_does_not(
    house, hass_ws_client
):
    ws = await hass_ws_client(house.hass)
    record = binary(FREEZER, unavailable="critical", escalate={"error": 3600})
    del record["entity_id"]
    await ws.send_json(
        {"id": 1, "type": admin.API, "method": "PUT", "path": FREEZER}
        | {"body": record}
    )
    assert (await ws.receive_json())["result"]["status"] == 200
    house.hass.states.async_set(FREEZER, "on")
    await house.later(120)
    assert house.titles() == ["Error: Freezer"]
    await snooze(house, FREEZER)

    # An hour at error escalates it to critical: time alone, so it stays snoozed.
    await house.later(3700)
    assert (await snoozed(house))[FREEZER]["level"] == "critical"
    assert (await status(house)).state == "nominal"
    assert house.titles() == ["Error: Freezer"]

    # Its reading gets worse (unavailable is critical for it): that is news.
    house.hass.states.async_set(FREEZER, "unavailable")
    await house.later(400)
    assert await snoozed(house) == {}
    assert (await status(house)).state == "critical"
    assert house.titles()[-1] == "Critical: Freezer"


async def test_a_sensor_is_snoozed_as_an_integration_is(house):
    house.hass.states.async_set(SPEED, "11")
    await house.settle()
    await snooze(house, SPEED, until=dt_util.now() + timedelta(hours=6))
    assert (await status(house)).state == "nominal"
    assert house.notes() == []

    # Better for a moment, and bad again: not a word.
    house.hass.states.async_set(SPEED, "90")
    await house.settle()
    house.hass.states.async_set(SPEED, "12")
    await house.settle()
    assert house.titles() == ["Error: Speed"]
    assert SPEED in await snoozed(house)

    await house.later(6 * 3600, step=600)
    assert house.titles()[-1] == "Error: Speed"
    assert house.phone[-1].data["message"].startswith("still so after 6 h: Barely")


async def test_unsnooze_puts_it_back_at_once_and_leaves_the_phone_be(house):
    await down(house)
    await snooze(house)
    await unsnooze(house)

    assert (await status(house)).state == "error"
    assert house.count() == 1
    assert house.notes() == ["Error: Cloudy"]
    assert house.titles() == ["Error: Cloudy"]  # found again, not a change
    assert await snoozed(house) == {}


async def test_what_cant_be_snoozed_is_refused_and_says_why(house):
    await house.fail()
    await house.later(700)

    for what, why in (
        (FREEZER, "critical"),  # unavailable is critical for it
        (OVEN, "rolled up into Cloudy: snooze that"),
        (SPEED, "at no level to snooze"),
        ("sensor.nobody_watches", "at no level to snooze"),
    ):
        with pytest.raises(ServiceValidationError, match=why):
            await snooze(house, what)
    with pytest.raises(ServiceValidationError, match="still to come"):
        await snooze(house, until=dt_util.now() - timedelta(minutes=1))
    with pytest.raises(ServiceValidationError, match="isn't snoozed"):
        await unsnooze(house)
    assert (await status(house)).attributes["snoozed"] == 0


async def test_a_group_is_asked_about_what_is_snoozed_too(house):
    await down(house)
    await snooze(house)

    got = await house.listed(group="Kitchen")
    assert got["worst"] == "nominal"
    assert got["sensors"] == []
    [row] = got["snoozed"]
    assert [s["entity_id"] for s in row["sensors"]] == [OVEN]
