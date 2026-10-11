"""Home Assistant's own health for Sensor Watch: each minute once Home Assistant has
started, its loaded components and config entries are read into plain rows
(levels.system_rows decides the levels) and counted beside the watched sensors."""

from __future__ import annotations

import time
from datetime import timedelta
from typing import Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.start import async_at_started

from .levels import system_rows
from .watch import Watcher

CHECK = timedelta(seconds=60)


@callback
def start_checks(hass: HomeAssistant, watcher: Watcher) -> CALLBACK_TYPE:
    """Check now (once started) and each minute; returns what stops it."""
    first_bad: dict[str, float] = {}

    @callback
    def check(_now: Any = None) -> None:
        if not hass.is_running:
            return  # still starting: integrations are still setting up
        entries = [
            {
                "entry_id": e.entry_id,
                "domain": e.domain,
                "title": e.title,
                "state": e.state.value,
                "reason": getattr(e, "reason", None),
                "disabled": e.disabled_by is not None,
            }
            for e in hass.config_entries.async_entries()
        ]
        watcher.apply_system(
            system_rows(
                set(hass.config.components), entries, first_bad, time.monotonic()
            )
        )

    stops = [
        async_at_started(hass, lambda _hass: check()),
        async_track_time_interval(hass, check, CHECK),
    ]

    @callback
    def stop() -> None:
        for one in stops:
            one()

    return stop
