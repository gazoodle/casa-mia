"""Fixtures for the tests that run the integrations inside a real Home Assistant."""

import sys
from pathlib import Path

import pytest

# custom_components, as Home Assistant finds it in its config folder.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integration"))


@pytest.fixture(autouse=True)
def _custom_integrations(enable_custom_integrations):
    yield


@pytest.fixture(autouse=True)
def recorder_and_history_running(hass):
    """The test instance runs neither, which Sensor Watch rightly counts as critical:
    these tests start from a healthy Home Assistant."""
    hass.config.components.update({"recorder", "history"})
