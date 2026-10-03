"""The intruder alarm panel's logic, kept free of Home Assistant so tests can load it.

The alarm panel has one toggle button, wired through ESPHome: `ENABLE_SWITCH` arms the
relay, `BUTTON` pulses it. Two binary sensors report the panel's real state. Ported
from the standalone `casa_mia_alarm` integration (custom_components on the box).
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

ARMED_SENSOR = "binary_sensor.intruder_alarm_set"
TRIGGERED_SENSOR = "binary_sensor.intruder_alarm_triggered"
BUTTON = "button.toggle_alarm_state"
ENABLE_SWITCH = "switch.toggle_alarm_state_enabled"
SENSORS = (ARMED_SENSOR, TRIGGERED_SENSOR)

# AlarmControlPanelState values.
DISARMED, ARMED_AWAY, TRIGGERED = "disarmed", "armed_away", "triggered"
ARMING, DISARMING = "arming", "disarming"

# Held between the steps of a press: the relay needs time to see enable, then the pulse.
ENABLE_SECONDS = 0.5
PRESS_SECONDS = 2.0


def panel_state(armed: str | None, triggered: str | None) -> str:
    """The panel's state from the two sensors' states ("on", "off", None if missing)."""
    if triggered == "on":
        return TRIGGERED
    if armed == "on":
        return ARMED_AWAY
    return DISARMED


def needs_press(state: str, target: str) -> bool:
    """Whether reaching `target` (ARMED_AWAY or DISARMED) from `state` takes a press.
    The button only toggles, so a press in the wrong state does the opposite: arming
    while triggered would disarm, disarming twice would re-arm."""
    if target == ARMED_AWAY:
        return state == DISARMED
    return state not in (DISARMED, DISARMING)


def code_ok(entered: str | None, configured: str | None) -> bool:
    """No configured code refuses everything rather than falling back to a default."""
    return bool(configured) and entered == configured


async def press(
    call: Callable[[str, str, str], Awaitable[object]],
    sleep: Callable[[float], Awaitable[object]] = asyncio.sleep,
) -> None:
    """Pulse the panel's toggle: enable the relay, press, disable. `call(domain, service,
    entity_id)` runs an HA service. The relay is disabled again even if the press fails."""
    await call("switch", "turn_on", ENABLE_SWITCH)
    try:
        await sleep(ENABLE_SECONDS)
        await call("button", "press", BUTTON)
        await sleep(PRESS_SECONDS)
    finally:
        await call("switch", "turn_off", ENABLE_SWITCH)
