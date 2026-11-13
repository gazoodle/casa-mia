"""Casa Mia's services that ask the app, with the app's answers stood in for."""

from types import SimpleNamespace

import pytest
from custom_components import casa_mia
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
