"""Home Assistant's own health for Sensor Watch: once Home Assistant has started, and each
time it says something changed (a config entry's state, a component loaded), its loaded
components and config entries are read into plain rows (levels.system_rows decides the
levels) and counted beside the watched sensors. Pushed, not polled (CLAUDE.md RULE FOUR):
the only timer is a one-off, when a failing integration's SETTLE time is up."""

from __future__ import annotations

import time
from typing import Any

from homeassistant.config_entries import SIGNAL_CONFIG_ENTRY_CHANGED
from homeassistant.const import EVENT_COMPONENT_LOADED
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.start import async_at_started

from .levels import SETTLE, system_rows
from .watch import Watcher


@callback
def start_checks(hass: HomeAssistant, watcher: Watcher) -> CALLBACK_TYPE:
    """Check once started and at each change; returns what stops it."""
    first_bad: dict[str, float] = {}
    settle: list[CALLBACK_TYPE] = []  # the one-off check when a failure has settled

    @callback
    def check(*_: Any) -> None:
        if not hass.is_running:
            return  # still starting: integrations are still setting up
        entries = [
            {
                "entry_id": e.entry_id,
                "domain": e.domain,
                "title": e.title,
                "state": e.state.value,
                "reason": getattr(e, "reason", None),
                "source": e.source,
                "disabled": e.disabled_by is not None,
            }
            for e in hass.config_entries.async_entries()
        ]
        now = time.monotonic()
        watcher.apply_system(
            system_rows(
                set(hass.config.components),
                entries,
                first_bad,
                now,
                watcher.system_settings,
            )
        )
        # A failure not yet counted (it may still set up): look again the moment its
        # SETTLE time is up, since nothing else will say so.
        while settle:
            settle.pop()()
        waits = [
            since + SETTLE - now for since in first_bad.values() if now - since < SETTLE
        ]
        if waits:
            settle.append(async_call_later(hass, max(min(waits), 0) + 1, check))

    watcher.recheck = check  # the page's settings changed: check again at once
    stops = [
        async_at_started(hass, check),
        async_dispatcher_connect(hass, SIGNAL_CONFIG_ENTRY_CHANGED, check),
        hass.bus.async_listen(EVENT_COMPONENT_LOADED, check),
    ]

    @callback
    def stop() -> None:
        for one in stops + settle:
            one()

    return stop
