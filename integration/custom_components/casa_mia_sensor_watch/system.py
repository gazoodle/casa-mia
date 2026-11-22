"""Home Assistant's own health for Sensor Watch: once Home Assistant has started, and each
time it says something changed (a config entry's state, a component loaded), its loaded
components and config entries are read into plain rows (levels.track_failures and
system_rows decide) and given to the roll-up (rollup.py), which counts them beside the
watched sensors. Pushed, not polled (CLAUDE.md RULE FOUR): the only timer is a one-off,
when a failing integration's SETTLE is up, or a recovered one's for its sensors."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntry
from homeassistant.const import EVENT_COMPONENT_LOADED
from homeassistant.core import CALLBACK_TYPE, CoreState, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.start import async_at_started
from homeassistant.loader import IntegrationNotLoaded, async_get_loaded_integration
from homeassistant.util import dt as dt_util

from .levels import INTEGRATION, SETTLE, system_rows, titled, track_failures
from .watch import Watcher

_LOGGER = logging.getLogger(__name__)


@callback
def start_checks(hass: HomeAssistant, watcher: Watcher) -> CALLBACK_TYPE:
    """Check once started and at each change; returns what stops it. Made before the
    records are given, so a failure is known before its sensors are judged."""
    recovered: dict[str, float] = {}  # entry id -> until when its sensors are given
    settle: list[CALLBACK_TYPE] = []  # the one-off check when a time is up

    @callback
    def look(found: bool) -> None:
        settings = watcher.system_settings
        # Not while it starts (integrations are still setting up; `is_running` is true
        # then), nor as it stops (they all unload), nor before the settings are known.
        if hass.state is not CoreState.running or not settings:
            return
        entries = [_plain(hass, e) for e in hass.config_entries.async_entries()]
        now = dt_util.utcnow().timestamp()

        failing = watcher.kept.failing
        before = dict(failing)
        track_failures(entries, failing, now)
        if failing != before:
            watcher.kept.changed()
        loaded = {}
        for e in entries:
            entry_id = e["entry_id"]
            if entry_id in before and entry_id not in failing:
                recovered[entry_id] = now + SETTLE
                if e["state"] == "loaded":
                    # DEBUG: every reload passes this way. One that counted is said
                    # at INFO as its event is (watch._fire).
                    _LOGGER.debug("%s: loaded, so no longer failing", titled(e))
                    loaded[f"{INTEGRATION}{entry_id}"] = {
                        "name": titled(e),
                        "level": "nominal",
                        "value": "loaded",
                        "message": None,
                        "since": dt_util.utcnow().isoformat(),
                    }
            elif entry_id in failing and entry_id not in before:
                _LOGGER.debug("%s: failing (%s)", titled(e), e["state"])
        for entry_id, until in list(recovered.items()):
            if not 0 < until - now <= SETTLE:
                del recovered[entry_id]

        # What new unavailable sensors may wait under (rollup.py): never an integration
        # that is ignored, or any of them with the page's switch off.
        settling: set[str] = set()
        if settings.get("integrations", True):
            ids = {*failing, *recovered} - set(settings.get("ignore") or [])
            settling = {f"{INTEGRATION}{entry_id}" for entry_id in ids}
        rows = system_rows(set(hass.config.components), entries, failing, now, settings)
        watcher.rollup.apply(rows, settling, loaded, found)

        # Nothing else will say that a time is up: look again the moment one is.
        while settle:
            settle.pop()()
        due = [f["since"] + SETTLE for f in failing.values()]
        waits = [t - now for t in [*due, *recovered.values()] if 0 < t - now <= SETTLE]
        if waits:
            settle.append(async_call_later(hass, min(waits) + 1, check))

    @callback
    def check(*_: Any) -> None:
        look(found=False)

    watcher.recheck = look  # the page's settings changed: check again at once
    stops = [
        async_at_started(hass, check),
        async_dispatcher_connect(hass, SIGNAL_CONFIG_ENTRY_CHANGED, check),
        hass.bus.async_listen(EVENT_COMPONENT_LOADED, check),
    ]

    @callback
    def stop() -> None:
        watcher.recheck = None
        for one in stops + settle:
            one()

    return stop


def _plain(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    try:
        integration = async_get_loaded_integration(hass, entry.domain).name
    except IntegrationNotLoaded:  # never got as far (not installed any more)
        integration = None
    return {
        "entry_id": entry.entry_id,
        "domain": entry.domain,
        "integration": integration,
        "title": entry.title,
        "state": entry.state.value,
        "reason": getattr(entry, "reason", None),
        "source": entry.source,
        "disabled": entry.disabled_by is not None,
    }
