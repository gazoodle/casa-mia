"""The commanders' pictures through Home Assistant, for a browser that can't show the
compositor's own address: away from home (the LAN address is out of reach), or with HA
opened over HTTPS (an http:// picture is blocked as mixed content). The Camera Commander
card asks for a token (websocket casa_mia/picture_token, any signed-in user) and shows
/api/casa_mia/{live|draft}/g/<name>.mjpg?token=...; this passes the app's stream through
as it comes, so the compositor's trick of opening each next part at once still works.
Only the pictures the app lists for its commanders can be reached this way.

Not HA's signed paths: an <img> can't send a login, and a signed path is refused once a
query changes (Keep camera pictures live restarts a stream with ?cm=) or after 30 s."""

from __future__ import annotations

import logging
import secrets
import time
from typing import Any
from urllib.parse import urlsplit

import aiohttp
import voluptuous as vol
from aiohttp import web
from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN
from .coordinator import CasaMiaCoordinator
from .motion import commanders

_LOGGER = logging.getLogger(__name__)

PROXY = f"/api/{DOMAIN}"
TOKEN_LIFE = 24 * 3600  # the card asks again well before, and after any refusal
TOKENS = f"{DOMAIN}_picture_tokens"  # hass.data: token -> (expires, user's name)
# Passed on, nothing else is: the card's size, its main camera as its own live video
# (main=video), its name for the stream (sid, for /done) and its version (v).
PASSED = ("w", "h", "dpr", "main", "sid", "v")


def setup(hass: HomeAssistant) -> None:
    """Once per HA run."""
    hass.data[TOKENS] = {}
    hass.http.register_view(PictureView(hass))
    hass.http.register_view(DoneView(hass))
    websocket_api.async_register_command(hass, _ws_token)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/picture_token"})
@callback
def _ws_token(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    tokens: dict[str, tuple[float, str]] = hass.data[TOKENS]
    now = time.monotonic()
    for old in [t for t, (expires, _) in tokens.items() if expires < now]:
        del tokens[old]
    token = secrets.token_urlsafe(24)
    tokens[token] = (now + TOKEN_LIFE, connection.user.name or connection.user.id)
    connection.send_result(msg["id"], {"token": token, "expires_in": TOKEN_LIFE})


def running_coordinator(hass: HomeAssistant) -> CasaMiaCoordinator | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if isinstance(
            found := getattr(entry, "runtime_data", None), CasaMiaCoordinator
        ):
            return found
    return None


def source(hass: HomeAssistant, which: str, name: str) -> str | None:
    """The app's own address for a commander's picture, live or draft; None if no
    commander has it."""
    coordinator = running_coordinator(hass)
    key = "card" if which == "live" else "draft_card"
    for cmd in commanders(coordinator) if coordinator and coordinator.data else []:
        picture = (cmd.get(key) or {}).get("picture") or ""
        if picture and urlsplit(picture).path == f"/g/{name}.mjpg":
            return picture
    return None


def _token_ok(hass: HomeAssistant, request: web.Request) -> bool:
    expires, _ = hass.data[TOKENS].get(request.query.get("token", ""), (0, ""))
    return expires >= time.monotonic()


class DoneView(HomeAssistantView):
    """The card done with a stream it named (?sid=): passed to the app, which ends it.
    A connection closed through Home Assistant (and Nabu Casa) may not reach the app."""

    url = PROXY + "/{which:live|draft}/g/{name}/done"
    name = f"api:{DOMAIN}:picture_done"
    requires_auth = False  # the token instead

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request, which: str, name: str) -> web.Response:
        sid, why = request.query.get("sid", ""), request.query.get("why", "")[:40]
        if not _token_ok(self.hass, request):
            _LOGGER.warning(
                "picture %s/%s: done with stream %s refused to %s: no token, or an "
                "old one",
                which,
                name,
                sid,
                request.remote,
            )
            return web.Response(status=401)
        if not (url := source(self.hass, which, name)):
            _LOGGER.warning("picture %s/%s: done, but no commander has it", which, name)
            return web.Response(status=404)
        done = urlsplit(url)._replace(path=f"/g/{name}/done", query="").geturl()
        try:
            async with async_get_clientsession(self.hass).post(
                done,
                params={"sid": sid, "why": why},
                headers={"X-Forwarded-For": request.remote or ""},
                timeout=aiohttp.ClientTimeout(total=5),
            ):
                pass
        except (aiohttp.ClientError, TimeoutError) as exc:
            _LOGGER.warning("picture %s/%s: done not passed on: %s", which, name, exc)
            return web.Response(status=502)
        _LOGGER.info(
            "picture %s/%s: the card at %s is done with stream %s (%s): passed on",
            which,
            name,
            request.remote,
            sid,
            why,
        )
        return web.Response(status=204)


class PictureView(HomeAssistantView):
    url = PROXY + "/{which:live|draft}/g/{name}.mjpg"
    name = f"api:{DOMAIN}:picture"
    requires_auth = False  # the token instead (see the module's doc)

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(
        self, request: web.Request, which: str, name: str
    ) -> web.StreamResponse:
        expires, user = self.hass.data[TOKENS].get(
            request.query.get("token", ""), (0, "")
        )
        if expires < time.monotonic():
            _LOGGER.warning(
                "picture %s/%s refused to %s: no token, or an old one",
                which,
                name,
                request.remote,
            )
            return web.Response(status=401)
        if not (url := source(self.hass, which, name)):
            _LOGGER.warning("picture %s/%s: no commander has it", which, name)
            return web.Response(status=404)
        params: dict[str, Any] = {
            k: request.query[k] for k in PASSED if k in request.query
        }
        # The viewer, so the compositor's limit on streams per device counts each viewer,
        # not Home Assistant.
        headers = {"X-Forwarded-For": request.remote or ""}
        session = async_get_clientsession(self.hass)
        _LOGGER.info(
            "picture %s/%s to %s (%s) through Home Assistant",
            which,
            name,
            user,
            request.remote,
        )
        resp: web.StreamResponse | None = None
        began, sent, waiting = time.monotonic(), 0, 0.0
        try:
            async with session.get(
                url,
                params=params,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=None, sock_connect=10),
            ) as upstream:
                if upstream.status != 200:
                    _LOGGER.warning(
                        "picture %s/%s: the app answered %s",
                        which,
                        name,
                        upstream.status,
                    )
                    return web.Response(status=502)
                resp = web.StreamResponse(
                    headers={
                        "Content-Type": upstream.headers.get("Content-Type", ""),
                        "Cache-Control": "no-store",
                    }
                )
                await resp.prepare(request)
                async for chunk in upstream.content.iter_any():
                    at = time.monotonic()
                    await resp.write(chunk)
                    waiting += time.monotonic() - at
                    sent += len(chunk)
        except ConnectionResetError:  # the viewer left
            pass
        except aiohttp.ClientError as exc:
            _LOGGER.warning(
                "picture %s/%s: the app is not reachable: %s", which, name, exc
            )
        finally:
            took = max(time.monotonic() - began, 0.001)
            _LOGGER.info(
                "picture %s/%s to %s ended after %.0f s: %.0f kbit/s, %.0f%% of the "
                "time waiting to send",
                which,
                name,
                user,
                took,
                sent * 8 / 1000 / took,
                100 * waiting / took,
            )
        return resp if resp is not None else web.Response(status=502)
