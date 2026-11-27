"""A card's live video report (casa_mia_commander/live.py: live_report), said in Home
Assistant's log: a start with how long its first frame took, a loss, a return."""

import logging

from custom_components.casa_mia_commander import live
from homeassistant.setup import async_setup_component


def _report(n: int, what: str, why: str, fails: int) -> dict:
    return {
        "id": n,
        "type": "casa_mia_commander/live_report",
        "commander": "select.front_main_camera",
        "channel": "camera.gate_high_resolution_channel",
        "what": what,
        "why": why,
        "fails": fails,
    }


async def test_a_start_is_info_and_a_first_loss_a_warning(hass, hass_ws_client, caplog):
    assert await async_setup_component(hass, "websocket_api", {})
    live.setup(hass)
    ws = await hass_ws_client(hass)
    caplog.set_level(logging.INFO, logger=live.__name__)

    await ws.send_json(
        _report(1, "started", "first frame 1.4 s after it was asked for", 0)
    )
    assert (await ws.receive_json())["success"]
    await ws.send_json(_report(2, "lost", "no frame for 10 s", 1))
    assert (await ws.receive_json())["success"]

    said = [
        (r.levelno, r.getMessage()) for r in caplog.records if r.name == live.__name__
    ]
    assert said[0][0] == logging.INFO and "Live video started" in said[0][1]
    assert "first frame 1.4 s" in said[0][1]
    assert said[1][0] == logging.WARNING and "Live video lost" in said[1][1]


async def test_an_unknown_report_or_a_negative_count_is_refused(hass, hass_ws_client):
    assert await async_setup_component(hass, "websocket_api", {})
    live.setup(hass)
    ws = await hass_ws_client(hass)
    await ws.send_json(_report(1, "stalled", "x", 1))
    assert not (await ws.receive_json())["success"]
    await ws.send_json(_report(2, "lost", "x", -1))
    assert not (await ws.receive_json())["success"]
