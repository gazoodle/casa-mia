"""Sensor Watch leaving the Casa Mia integration (2026.11.3): a user who had it there is
handed over with the same device, entities and records, and what was made against the
old names (service calls, device triggers) carries on."""

import asyncio

import pytest
from custom_components.casa_mia import sensor_watch
from custom_components.casa_mia_sensor_watch import admin
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import callback
from homeassistant.exceptions import ServiceNotFound
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

APP = "http://app.invalid"
THEIRS = "casa_mia_sensor_watch"
RECORDS = {
    "records": [
        {
            "entity_id": "sensor.salt",
            "kind": "numeric",
            "hold_off": 0,
            "bands": [
                {"from": None, "to": 10, "level": "critical", "message": "Out of salt"},
                {"from": 10, "to": None, "level": "nominal", "message": ""},
            ],
            "otherwise": "error",
            "unavailable": "error",
        }
    ]
}
# Each entity as Casa Mia registered it: domain, the end of its unique id, entity id.
OLD_ENTITIES = (
    ("sensor", "status", "sensor.sensor_watch_status"),
    ("sensor", "task_count", "sensor.sensor_watch_tasks"),
    ("sensor", "warning_count", "sensor.sensor_watch_warnings"),
    ("sensor", "error_count", "sensor.sensor_watch_errors"),
    ("sensor", "critical_count", "sensor.sensor_watch_critical"),
    ("binary_sensor", "problem", "binary_sensor.sensor_watch_problem"),
    ("button", "refresh", "button.sensor_watch_refresh_state"),
)


def entries_of(device):
    """The config entries a device belongs to: one, by the newer Home Assistant's name
    for it (its older `config_entries` is refused there), else the older set."""
    if hasattr(device, "config_entry_id"):
        return {device.config_entry_id}
    return device.config_entries


def casa_mia(hass, had_sensor_watch=True):
    """Casa Mia's entry as 2026.11.3-b1 left the registries (not set up: the app isn't
    here), with Sensor Watch's device and entities under it when it was switched on."""
    old = MockConfigEntry(domain="casa_mia", data={"url": APP})
    old.add_to_hass(hass)
    devices, entities = dr.async_get(hass), er.async_get(hass)
    hub = devices.async_get_or_create(
        config_entry_id=old.entry_id,
        identifiers={("casa_mia", old.entry_id)},
        name="Casa Mia",
    )
    if not had_sensor_watch:
        return old, None, {}
    device = devices.async_get_or_create(
        config_entry_id=old.entry_id,
        identifiers={("casa_mia", f"{old.entry_id}_sensor_watch")},
        name="Sensor Watch",
    )
    devices.async_update_device(device.id, via_device_id=hub.id)
    was = {
        entity_id: entities.async_get_or_create(
            domain,
            "casa_mia",
            f"{old.entry_id}_sensor_watch_{key}",
            config_entry=old,
            device_id=device.id,
            suggested_object_id=entity_id.split(".")[1],
        )
        for domain, key, entity_id in OLD_ENTITIES
    }
    assert set(was) == {e.entity_id for e in was.values()}
    return old, device, was


def handed_over(hass):
    """Sensor Watch's own entry, if it has one."""
    entries = hass.config_entries.async_entries(THEIRS)
    return entries[0] if entries else None


async def test_a_user_who_had_it_keeps_device_entities_and_records(
    hass, aioclient_mock, hass_storage
):
    old, device, was = casa_mia(hass)
    hass.states.async_set("sensor.salt", "5")
    aioclient_mock.get(f"{APP}/sensor-watch/export", json=RECORDS)

    await sensor_watch.hand_over(hass, old, APP)
    await hass.async_block_till_done()

    entry = handed_over(hass)
    assert entry and entry.state is ConfigEntryState.LOADED
    assert not ir.async_get(hass).async_get_issue("casa_mia", sensor_watch.ISSUE)

    # The same device, now Sensor Watch's alone.
    now = dr.async_get(hass).async_get(device.id)
    assert entries_of(now) == {entry.entry_id}
    assert now.identifiers == {(THEIRS, entry.entry_id)}
    assert now.via_device_id is None

    # The same entities: entity ids and registry ids kept (history, dashboards and
    # automations go by them), platform and unique ids Sensor Watch's own.
    entities = er.async_get(hass)
    for domain, key, entity_id in OLD_ENTITIES:
        e = entities.async_get(entity_id)
        assert e.id == was[entity_id].id, entity_id
        assert (e.platform, e.config_entry_id) == (THEIRS, entry.entry_id), entity_id
        assert e.unique_id == f"{entry.entry_id}_{key}", entity_id
        assert e.device_id == device.id, entity_id
    mine = er.async_entries_for_config_entry(entities, entry.entry_id)
    assert len(mine) == len(OLD_ENTITIES)  # none made twice
    assert not er.async_entries_for_config_entry(entities, old.entry_id)

    # The app's records, in Home Assistant's storage and watched.
    assert hass_storage[admin.DATA]["data"] == RECORDS
    assert hass.states.get("sensor.sensor_watch_status").state == "critical"

    # Done once: Casa Mia finds nothing to hand over next time, and doesn't ask the app.
    aioclient_mock.clear_requests()
    await sensor_watch.hand_over(hass, old, APP)
    assert aioclient_mock.call_count == 0


async def test_records_already_in_home_assistant_are_not_replaced(
    hass, aioclient_mock, hass_storage
):
    # 2026.11.3-b1 had already brought them over, and they may have been edited since.
    kept = {"records": [RECORDS["records"][0] | {"hold_off": 60}]}
    hass_storage[admin.DATA] = {"version": 1, "key": admin.DATA, "data": kept}
    old, _device, _was = casa_mia(hass)
    aioclient_mock.get(f"{APP}/sensor-watch/export", json=RECORDS)

    await sensor_watch.hand_over(hass, old, APP)
    await hass.async_block_till_done()

    assert handed_over(hass).state is ConfigEntryState.LOADED
    assert hass_storage[admin.DATA]["data"] == kept


async def test_a_user_who_never_had_it_gets_nothing(hass, aioclient_mock):
    old, _device, _was = casa_mia(hass, had_sensor_watch=False)
    await sensor_watch.hand_over(hass, old, APP)
    assert handed_over(hass) is None
    assert aioclient_mock.call_count == 0


async def test_a_failed_handover_says_so_and_is_tried_again(
    hass, aioclient_mock, monkeypatch
):
    old, device, was = casa_mia(hass)
    issues = ir.async_get(hass)

    # The app doesn't answer: a Repair, and everything left as it was.
    aioclient_mock.get(f"{APP}/sensor-watch/export", status=500)
    await sensor_watch.hand_over(hass, old, APP)
    assert issues.async_get_issue("casa_mia", sensor_watch.ISSUE)
    assert handed_over(hass) is None
    assert entries_of(dr.async_get(hass).async_get(device.id)) == {old.entry_id}

    # Sensor Watch's integration isn't installed: the same.
    aioclient_mock.clear_requests()
    aioclient_mock.get(f"{APP}/sensor-watch/export", json=RECORDS)
    monkeypatch.setattr(sensor_watch, "THEIRS", "casa_mia_not_installed")
    await sensor_watch.hand_over(hass, old, APP)
    issue = issues.async_get_issue("casa_mia", sensor_watch.ISSUE)
    assert "not installed" in issue.translation_placeholders["reason"]
    monkeypatch.undo()

    # Casa Mia's next setup tries again, and the Repair goes.
    await sensor_watch.hand_over(hass, old, APP)
    await hass.async_block_till_done()
    assert handed_over(hass).state is ConfigEntryState.LOADED
    assert not issues.async_get_issue("casa_mia", sensor_watch.ISSUE)
    assert er.async_get(hass).async_get("sensor.sensor_watch_status").platform == THEIRS


async def test_the_old_service_names_are_passed_on(hass, aioclient_mock, caplog):
    old, _device, _was = casa_mia(hass)
    sensor_watch.old_services(hass, old)

    # Without Sensor Watch the caller is told, not answered with nothing.
    with pytest.raises(ServiceNotFound):
        await hass.services.async_call(
            "casa_mia", "sensor_watch_list", {}, blocking=True, return_response=True
        )

    hass.states.async_set("sensor.salt", "5")
    aioclient_mock.get(f"{APP}/sensor-watch/export", json=RECORDS)
    await sensor_watch.hand_over(hass, old, APP)
    await hass.async_block_till_done()

    for _ in range(2):
        listed = await hass.services.async_call(
            "casa_mia",
            "sensor_watch_list",
            {"levels": ["critical"]},
            blocking=True,
            return_response=True,
        )
        assert [s["entity_id"] for s in listed["sensors"]] == ["sensor.salt"]
    await hass.services.async_call(
        "casa_mia", "sensor_watch_refresh", {}, blocking=True
    )
    said = [r for r in caplog.records if "is now casa_mia_sensor_watch" in r.message]
    assert len(said) == 2  # once for each name, not at each call


async def test_a_device_trigger_made_under_casa_mia_still_fires(hass, aioclient_mock):
    old, device, _was = casa_mia(hass)
    hass.states.async_set("sensor.salt", "40")
    aioclient_mock.get(f"{APP}/sensor-watch/export", json=RECORDS)
    await sensor_watch.hand_over(hass, old, APP)
    await hass.async_block_till_done()

    # As the automation editor saved it to 2026.11.3-b1: Casa Mia's domain.
    fired = asyncio.Event()
    hass.bus.async_listen("old_trigger_fired", callback(lambda _event: fired.set()))
    assert await async_setup_component(
        hass,
        "automation",
        {
            "automation": {
                "alias": "Tell me",
                "trigger": {
                    "platform": "device",
                    "domain": "casa_mia",
                    "device_id": device.id,
                    "type": "reached",
                    "level": "warning",
                },
                "action": {"event": "old_trigger_fired"},
            }
        },
    )
    await hass.async_block_till_done()
    assert hass.states.get("automation.tell_me").state == "on"

    hass.states.async_set("sensor.salt", "5")
    async with asyncio.timeout(5):  # the automation runs its action in its own time
        await fired.wait()
