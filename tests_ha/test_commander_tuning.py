"""A Camera Commander card's tuning record (casa_mia_commander/live.py: tuning): taken
only while that commander's debug is on, and passed to the app with who sent it."""

from custom_components.casa_mia_commander import live
from homeassistant.setup import async_setup_component

ENTRY = {"ref": "T-1127-143205-KQZ", "tuned": {"page": {"tile": 13}}}


async def _setup(hass, monkeypatch, debug: bool) -> list:
    sent: list = []

    class App:
        url = "http://app"
        data = {"x": 1}

    async def post(hass, url, path, json):
        sent.append((url, path, json))

    card = {
        "picture": "http://app:8099/g/cameras.mjpg",
        "layout": {"debug": {"on": debug}},
    }
    monkeypatch.setattr(live, "running_coordinator", lambda hass: App())
    monkeypatch.setattr(live, "commanders", lambda coordinator: [{"card": card}])
    monkeypatch.setattr(live, "async_post", post)
    assert await async_setup_component(hass, "websocket_api", {})
    live.setup(hass)
    return sent


async def test_a_record_is_passed_to_the_app_while_debug_is_on(
    hass, hass_ws_client, monkeypatch
):
    sent = await _setup(hass, monkeypatch, debug=True)
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "casa_mia_commander/tuning",
            "picture": "cameras",
            "entry": ENTRY,
        }
    )
    msg = await ws.receive_json()
    assert msg["success"] and msg["result"] == {"ref": "T-1127-143205-KQZ"}
    ((url, path, body),) = sent
    assert (url, path) == ("http://app", "/commander/tuning")
    assert body["tuned"] == ENTRY["tuned"] and body["user"]  # who sent it


async def test_a_record_is_refused_with_debug_off_or_without_a_reference(
    hass, hass_ws_client, monkeypatch
):
    sent = await _setup(hass, monkeypatch, debug=False)
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "casa_mia_commander/tuning",
            "picture": "cameras",
            "entry": ENTRY,
        }
    )
    msg = await ws.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "debug_off"
    await ws.send_json(
        {
            "id": 2,
            "type": "casa_mia_commander/tuning",
            "picture": "cameras",
            "entry": {"ref": "x"},
        }
    )
    msg = await ws.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "invalid"
    assert sent == []
