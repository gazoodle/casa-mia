"""Sensor Watch as an integration of its own: added by hand it needs nothing of Casa
Mia's, and its page's commands are an admin's only."""

from custom_components.casa_mia_sensor_watch import admin, panel
from custom_components.casa_mia_sensor_watch.const import DOMAIN, ENTITY, SWAP, SWAP_ASK
from homeassistant.components import frontend
from homeassistant.config_entries import SOURCE_USER, ConfigEntryState
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from pytest_homeassistant_custom_component.common import async_capture_events

SALT = {
    "kind": "numeric",
    "hold_off": 0,
    "bands": [
        {"from": None, "to": 10, "level": "critical", "message": "Out of salt"},
        {"from": 10, "to": 25, "level": "task", "message": "Top up the salt"},
        {"from": 25, "to": None, "level": "nominal", "message": ""},
    ],
    "otherwise": "error",
    "unavailable": "error",
}
KEYS = {
    "sensor": {
        "status",
        "task_count",
        "warning_count",
        "error_count",
        "critical_count",
    },
    "binary_sensor": {"problem"},
    "button": {"refresh"},
}


async def add(hass):
    """Added as a user does: the form, which asks nothing, then Submit."""
    form = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert form["type"] is FlowResultType.FORM
    made = await hass.config_entries.flow.async_configure(form["flow_id"], {})
    assert made["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    return made["result"]


async def answers(ws, *ids):
    """The next message for each of these ids, whatever order they come in."""
    got = {}
    while set(ids) - set(got):
        msg = await ws.receive_json()
        got[msg["id"]] = msg
    return got


async def test_added_by_hand_it_watches_with_no_casa_mia(
    hass, hass_ws_client, hass_client, hass_storage
):
    asked = []
    async_dispatcher_connect(hass, SWAP_ASK, lambda: asked.append(True))
    hass.states.async_set("sensor.salt", "40", {"unit_of_measurement": "%"})
    entry = await add(hass)
    assert entry.state is ConfigEntryState.LOADED
    assert "casa_mia" not in hass.config.components
    assert asked  # the swap's rule was asked for, though nobody is there to answer

    # Its device and entities, by the ids the take-over from Casa Mia writes too.
    [device] = dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)
    assert device.identifiers == {(DOMAIN, entry.entry_id)}
    entities = er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)
    for domain, keys in KEYS.items():
        ids = {e.unique_id for e in entities if e.domain == domain}
        assert ids == {f"{entry.entry_id}_{key}" for key in keys}, domain
    assert all(e.device_id == device.id and e.platform == DOMAIN for e in entities)

    # The page and the card, served and loaded.
    assert hass.data[frontend.DATA_PANELS][panel.PANEL].require_admin
    client = await hass_client()
    for name in ("panel.js", "panel.css", "cards.js"):
        assert (await client.get(f"{panel.URL}/{name}")).status == 200, name
    assert any(
        url.startswith(f"{panel.URL}/cards.js")
        for url in hass.data[frontend.DATA_EXTRA_MODULE_URL].urls
    )

    # A record saved on the page is watched at once, and kept in Home Assistant.
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": admin.LEVELS_FEED})
    await ws.send_json({"id": 2, "type": admin.SUMMARY})
    for _ in range(4):  # each feed's result, then everything it has
        await ws.receive_json()
    await ws.send_json(
        {
            "id": 3,
            "type": admin.API,
            "method": "PUT",
            "path": "sensor.salt",
            "body": SALT,
        }
    )
    got = await answers(ws, 1, 2, 3)  # both feeds say so, and the save's own answer
    assert got[3]["result"]["status"] == 200, got[3]
    assert got[1]["event"]["levels"]["sensor.salt"]["level"] == "nominal"
    assert hass_storage[admin.DATA]["data"]["records"]

    events = async_capture_events(hass, DOMAIN)
    hass.states.async_set("sensor.salt", "5", {"unit_of_measurement": "%"})
    got = await answers(ws, 1, 2)
    assert got[1]["event"]["levels"]["sensor.salt"]["level"] == "critical"
    assert got[2]["event"]["counts"] == {"critical": 1}
    await hass.async_block_till_done()
    assert events and events[-1].data["level"] == "critical"
    assert hass.states.get("sensor.sensor_watch_status").state == "critical"
    assert hass.states.get("binary_sensor.sensor_watch_problem").state == "on"

    # The services, and the eye's feed.
    listed = await hass.services.async_call(
        DOMAIN, "list", {}, blocking=True, return_response=True
    )
    assert [s["message"] for s in listed["sensors"]] == ["Out of salt"]
    await hass.services.async_call(DOMAIN, "refresh", {}, blocking=True)
    await ws.send_json({"id": 4, "type": ENTITY, "entity_id": "sensor.salt"})
    got = await answers(ws, 4)
    assert got[4]["success"], got[4]

    # Casa Mia's screenshot swap, when it is there: its rule arrives by signal.
    async_dispatcher_send(hass, SWAP, str.upper)
    listed = await hass.services.async_call(
        DOMAIN, "list", {}, blocking=True, return_response=True
    )
    assert [s["message"] for s in listed["sensors"]] == ["OUT OF SALT"]
    async_dispatcher_send(hass, SWAP, None)


async def test_one_entry_only(hass):
    await add(hass)
    again = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert again["type"] is FlowResultType.ABORT
    assert again["reason"] == "single_instance_allowed"


async def test_its_commands_are_an_admins_only(
    hass, hass_ws_client, hass_read_only_access_token
):
    await add(hass)
    ws = await hass_ws_client(hass, hass_read_only_access_token)
    for n, msg in enumerate(
        (
            {"type": admin.LEVELS_FEED},
            {"type": admin.SUMMARY},
            {"type": admin.API, "method": "GET", "path": ""},
            {"type": ENTITY, "entity_id": "sensor.salt"},
        ),
        1,
    ):
        await ws.send_json({"id": n, **msg})
        got = await ws.receive_json()
        assert not got["success"] and got["error"]["code"] == "unauthorized", got


async def test_the_page_stays_through_a_reload_and_leaves_when_deleted(
    hass, hass_ws_client
):
    entry = await add(hass)
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": admin.SUMMARY})
    assert (await ws.receive_json())["success"]
    assert (await ws.receive_json())["event"]["health"] == "nominal"

    # Unloaded: an open page is told, and its panel is still there to say so (taking
    # it out under an open page broke Home Assistant's own, 2026.11.3-b1).
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert (await ws.receive_json())["event"] == {"error": admin.NOT_RUNNING}
    assert panel.PANEL in hass.data[frontend.DATA_PANELS]
    assert not hass.services.has_service(DOMAIN, "list")

    assert await hass.config_entries.async_setup(entry.entry_id)
    assert (await ws.receive_json())["event"]["health"] == "nominal"

    assert await hass.config_entries.async_remove(entry.entry_id)
    assert panel.PANEL not in hass.data[frontend.DATA_PANELS]
