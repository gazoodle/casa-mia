"""Casa Mia's services that ask the app, with the app's answers stood in for."""

from types import SimpleNamespace

import pytest
from custom_components import casa_mia
from homeassistant.components import websocket_api
from homeassistant.exceptions import HomeAssistantError

APP = SimpleNamespace(url="http://app.invalid:8780")


async def test_camera_picture_is_the_apps_answer_and_no_answer_is_an_error(
    hass, aioclient_mock
):
    held = {"picture": "cGljdHVyZQ==", "type": "image/jpeg", "age": 1.5}
    aioclient_mock.get(f"{APP.url}/compositor/picture", json=held)

    got = await casa_mia._camera_picture(hass, APP, "camera.shed", 5.0)  # type: ignore[arg-type]
    assert got == held
    (_method, url, _data, _headers), *_ = aioclient_mock.mock_calls
    assert dict(url.query) == {"camera": "camera.shed", "fresh": "5.0"}

    aioclient_mock.clear_requests()
    aioclient_mock.get(f"{APP.url}/compositor/picture", status=500)
    with pytest.raises(HomeAssistantError, match="No picture: Casa Mia app"):
        await casa_mia._camera_picture(hass, APP, "camera.shed", 5.0)  # type: ignore[arg-type]


async def test_the_cameras_feed_says_them_now_and_at_each_change(
    hass, hass_ws_client, monkeypatch
):
    cameras = [
        {"entity": "camera.shed", "title": "Shed", "presets": [], "controls": []}
    ]
    listeners = []
    app = SimpleNamespace(
        data={"modules": {"cameras": {"list": cameras}}},
        async_add_listener=lambda tell: listeners.append(tell) or (lambda: None),
    )
    monkeypatch.setattr(casa_mia, "running_coordinator", lambda hass: app)
    websocket_api.async_register_command(hass, casa_mia._ws_cameras_subscribe)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "casa_mia/cameras/subscribe"})
    assert (await client.receive_json())["success"]
    assert (await client.receive_json())["event"] == cameras

    # The Cameras module switched off: none, so a page goes back to Home Assistant's own.
    listeners[0]()  # the same again is not sent twice
    app.data = {"modules": {}}
    listeners[0]()
    assert (await client.receive_json())["event"] == []
