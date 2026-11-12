"""The commander's picture through Home Assistant as frames over a WebSocket
(casa_mia_commander/pictures.py), against a stand-in for the app's stream."""

import time

from aiohttp import web
from custom_components.casa_mia_commander import pictures
from homeassistant.setup import async_setup_component

FRAMES = [b"\xff\xd8first\xff\xd9", b"\xff\xd8second, with \r\n--fram inside\xff\xd9"]


async def _app_stream(request: web.Request) -> web.StreamResponse:
    """As the compositor writes it: each frame followed at once by the next part's start."""
    resp = web.StreamResponse(
        headers={"Content-Type": "multipart/x-mixed-replace; boundary=frame"}
    )
    await resp.prepare(request)
    part = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
    await resp.write(part)
    for frame in FRAMES:
        await resp.write(frame + b"\r\n" + part)
    return resp


async def _setup(hass, aiohttp_server, monkeypatch):
    app = web.Application()
    app.router.add_get("/g/cameras.mjpg", _app_stream)
    upstream = await aiohttp_server(app)
    monkeypatch.setattr(
        pictures,
        "source",
        lambda hass, which, name: str(upstream.make_url("/g/cameras.mjpg")),
    )
    assert await async_setup_component(hass, "websocket_api", {})  # brings http
    pictures.setup(hass)
    hass.data[pictures.TOKENS]["good"] = (time.monotonic() + 60, "someone")


async def test_frames_arrive_one_message_each(
    hass, hass_client_no_auth, aiohttp_server, monkeypatch
):
    await _setup(hass, aiohttp_server, monkeypatch)
    client = await hass_client_no_auth()

    async with client.ws_connect(
        "/api/casa_mia_commander/live/g/cameras.ws?token=good&w=640&h=360"
    ) as ws:
        got = [await ws.receive_bytes(), await ws.receive_bytes()]
        assert (await ws.receive()).type.name in ("CLOSE", "CLOSED", "CLOSING")

    assert got == FRAMES  # whole frames, and the app's stream ending closes the socket


async def test_frames_refused_without_a_token(
    hass, hass_client_no_auth, aiohttp_server, monkeypatch
):
    await _setup(hass, aiohttp_server, monkeypatch)
    client = await hass_client_no_auth()

    resp = await client.get("/api/casa_mia_commander/live/g/cameras.ws?token=old")

    assert resp.status == 401
