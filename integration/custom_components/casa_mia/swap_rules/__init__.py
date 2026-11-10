"""The screenshot swap in Home Assistant. The app's rules are fetched from the app when
/health's swap stamp moves (a save on the Swap page fires casa_mia_settings_changed, so at
once). The draft the Swap page is writing is pushed by the app (casa_mia/swap/draft).
Every browser is told of both (casa_mia/swap/subscribe, any user), and cm-cards.js swaps
the page's text. Sensor Watch, an integration of its own, swaps what it shows by the same
rule: it is sent the rule by dispatcher signal (RULE), at each change and when it asks.

One Swap per Home Assistant run (hass.data), not per entry, so a browser's subscription
outlives an entry reload. engine.py is the app's own (app/src/casa_mia/swap/engine.py),
kept identical by a test."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from homeassistant.helpers.event import async_call_later

from ..const import DOMAIN
from ..coordinator import CasaMiaCoordinator
from . import engine

_LOGGER = logging.getLogger(__name__)

DATA = f"{DOMAIN}_swap"
# Sensor Watch's end is its const.SWAP and SWAP_ASK: RULE carries `Swap.rule` (a
# function, so a signal, not a bus event) whenever anything of the swap changes, and
# when RULE_ASK is sent.
RULE = f"{DOMAIN}_swap"
RULE_ASK = f"{DOMAIN}_swap_ask"
# A draft is a lease: the page renews it while its dialog is open, so a closed tab
# can't leave a preview on every screen for ever.
DRAFT_LEASE = 60


class Swap:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.stamp = ""  # the app's, "" while off; changes whenever the rules do
        self.rules: list[dict[str, Any]] = []
        self.rule: Callable[[str], str] | None = None  # None: nothing to swap
        self.draft: dict[str, Any] | None = None
        self._lapse: CALLBACK_TYPE | None = None
        self._listeners: list[Callable[[], None]] = []

    def listen(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    def _changed(self) -> None:
        for listener in list(self._listeners):
            listener()

    def view(self) -> dict[str, Any]:
        """What a browser gets: the rules (none while off) and the draft (shown even
        while off, as it is being written)."""
        return {"rules": self.rules, "draft": self.draft}

    async def follow(self, coordinator: CasaMiaCoordinator) -> None:
        """The app's rules, fetched when its stamp has moved. A failed fetch keeps the
        old ones, and the stamp, so the next poll asks again."""
        stamp = str((coordinator.data or {}).get("swap") or "")
        if stamp == self.stamp:
            return
        found: dict[str, Any] = {"stamp": "", "rules": []}
        if stamp:
            try:
                async with async_get_clientsession(self.hass).get(
                    f"{coordinator.url}/swap", timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response.raise_for_status()
                    found = await response.json()
            except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
                _LOGGER.warning("screenshot swap: rules not fetched, kept: %s", exc)
                return
        self.stamp = str(found.get("stamp") or "")
        self.rules = list(found.get("rules") or [])
        compiled = engine.Rules(self.rules)
        for i, why in compiled.errors:  # by number: the text is a real string
            _LOGGER.warning("screenshot swap: rule %d left out (%s)", i + 1, why)
        self.rule = compiled.out if self.rules else None
        _LOGGER.info(
            "screenshot swap %s",
            f"on: {len(self.rules)} rules" if self.stamp else "off",
        )
        self._changed()

    @callback
    def set_draft(self, draft: dict[str, Any] | None) -> None:
        if self._lapse:
            self._lapse()
            self._lapse = None
        if draft is not None:
            self._lapse = async_call_later(
                self.hass, DRAFT_LEASE, lambda _now: self.set_draft(None)
            )
        if draft != self.draft:
            self.draft = draft
            self._changed()


def swap_of(hass: HomeAssistant) -> Swap:
    """This run's Swap, made on first use (with its websocket commands)."""
    if (swap := hass.data.get(DATA)) is None:
        swap = hass.data[DATA] = Swap(hass)
        websocket_api.async_register_command(hass, _ws_subscribe)
        websocket_api.async_register_command(hass, _ws_draft)

        @callback
        def tell() -> None:
            async_dispatcher_send(hass, RULE, swap.rule)

        swap.listen(tell)
        async_dispatcher_connect(hass, RULE_ASK, tell)
    return swap


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/swap/subscribe"})
@callback
def _ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The rules and the draft, now and at each change; any user (every page swaps)."""
    swap = swap_of(hass)

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], swap.view()))

    connection.subscriptions[msg["id"]] = swap.listen(send)
    connection.send_result(msg["id"])
    send()


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/swap/draft",
        vol.Required("draft"): vol.Any(None, dict),
    }
)
@websocket_api.require_admin
@callback
def _ws_draft(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The app pushing the rule being written on the Swap page (None: no longer)."""
    swap_of(hass).set_draft(msg["draft"])
    connection.send_result(msg["id"])
