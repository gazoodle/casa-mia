import asyncio
import importlib.util
from pathlib import Path

import pytest

# Loaded by path: the package __init__ needs Home Assistant, this module does not.
FILE = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia/alarm.py"
)
spec = importlib.util.spec_from_file_location("alarm", FILE)
assert spec and spec.loader
alarm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alarm)


@pytest.mark.parametrize(
    ("armed", "triggered", "state"),
    [
        ("off", "off", alarm.DISARMED),
        ("on", "off", alarm.ARMED_AWAY),
        ("on", "on", alarm.TRIGGERED),
        ("off", "on", alarm.TRIGGERED),
        (None, None, alarm.DISARMED),  # sensors missing (ESPHome device not up yet)
        ("unavailable", "unavailable", alarm.DISARMED),
    ],
)
def test_panel_state(armed, triggered, state):
    assert alarm.panel_state(armed, triggered) == state


@pytest.mark.parametrize(
    ("state", "target", "press"),
    [
        (alarm.DISARMED, alarm.ARMED_AWAY, True),
        (alarm.ARMED_AWAY, alarm.ARMED_AWAY, False),
        (alarm.ARMING, alarm.ARMED_AWAY, False),  # a second press would cancel it
        (alarm.TRIGGERED, alarm.ARMED_AWAY, False),  # a press would disarm
        (alarm.ARMED_AWAY, alarm.DISARMED, True),
        (alarm.TRIGGERED, alarm.DISARMED, True),
        (alarm.ARMING, alarm.DISARMED, True),  # cancels the exit delay
        (alarm.DISARMED, alarm.DISARMED, False),
        (alarm.DISARMING, alarm.DISARMED, False),  # a second press would re-arm
    ],
)
def test_needs_press(state, target, press):
    assert alarm.needs_press(state, target) is press


def test_code_ok():
    assert alarm.code_ok("4321", "4321")
    assert not alarm.code_ok("1234", "4321")
    assert not alarm.code_ok(None, "4321")
    # No code configured refuses everything, even an empty or missing code.
    assert not alarm.code_ok("", "")
    assert not alarm.code_ok(None, None)


def run_press(fail_on=None):
    calls = []

    async def call(domain, service, entity_id):
        calls.append((domain, service, entity_id))
        if service == fail_on:
            raise RuntimeError("boom")

    async def sleep(seconds):
        calls.append(("sleep", seconds))

    try:
        asyncio.run(alarm.press(call, sleep))
    except RuntimeError:
        pass
    return calls


def test_press_sequence():
    assert run_press() == [
        ("switch", "turn_on", alarm.ENABLE_SWITCH),
        ("sleep", alarm.ENABLE_SECONDS),
        ("button", "press", alarm.BUTTON),
        ("sleep", alarm.PRESS_SECONDS),
        ("switch", "turn_off", alarm.ENABLE_SWITCH),
    ]


def test_press_failure_still_disables_the_relay():
    calls = run_press(fail_on="press")
    assert calls[-1] == ("switch", "turn_off", alarm.ENABLE_SWITCH)
