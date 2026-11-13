"""Dash-Bored inside a real Home Assistant: its set-up, its page in the sidebar, and the
feed of Sensor Watch's alerts that its pages follow. Sensor Watch itself is not loaded:
the two meet only through its bus event, which each test fires by hand."""

from custom_components.casa_mia_dash_bored.const import (
    ALERTS,
    CARDS_VERSION,
    DOMAIN,
    PANEL,
    WATCH_EVENT,
)
from homeassistant.components import frontend
from homeassistant.config_entries import SOURCE_USER, ConfigEntryState
from homeassistant.data_entry_flow import FlowResultType
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
