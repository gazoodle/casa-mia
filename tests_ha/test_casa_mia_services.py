"""Casa Mia's services that ask the app, with the app's answers stood in for."""

from types import SimpleNamespace

import pytest
from custom_components import casa_mia
from homeassistant.components import websocket_api
from homeassistant.exceptions import HomeAssistantError

APP = SimpleNamespace(url="http://app.invalid:8780")


async def test_an_ask_is_the_apps_answer_and_no_answer_is_an_error(
    hass, aioclient_mock
):
    held = {"picture": "cGljdHVyZQ==", "type": "image/jpeg", "age": 1.5}
    aioclient_mock.get(f"{APP.url}/compositor/picture", json=held)
    params = {"camera": "camera.shed", "fresh": "5.0"}

    got = await casa_mia._ask_app(
        hass, APP, "/compositor/picture", params, "No picture"
    )  # type: ignore[arg-type]
    assert got == held
    (_method, url, _data, _headers), *_ = aioclient_mock.mock_calls
    assert dict(url.query) == params

    aioclient_mock.clear_requests()
    aioclient_mock.get(f"{APP.url}/compositor/picture", status=500)
    with pytest.raises(HomeAssistantError, match="No picture: Casa Mia app"):
        await casa_mia._ask_app(hass, APP, "/compositor/picture", params, "No picture")  # type: ignore[arg-type]


async def test_people_are_asked_by_ha_person_and_answered_with_entities(
    hass, aioclient_mock
):
    hass.states.async_set("person.sam", "home", {"id": "sam1"})
    answer = {
        "people": [{"name": "Sam", "person": "sam1"}, {"name": "Ann", "person": None}]
    }
    aioclient_mock.get(f"{APP.url}/people/about", json=answer)

    got = await casa_mia._people(hass, APP, "person.sam")  # type: ignore[arg-type]
    assert [p["person"] for p in got["people"]] == ["person.sam", None]  # type: ignore[index]
    (_method, url, _data, _headers), *_ = aioclient_mock.mock_calls
    assert url.query["person"] == "sam1" and url.query["today"]

    with pytest.raises(HomeAssistantError, match="not one of Home Assistant's people"):
        await casa_mia._people(hass, APP, "person.nobody")  # type: ignore[arg-type]


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
