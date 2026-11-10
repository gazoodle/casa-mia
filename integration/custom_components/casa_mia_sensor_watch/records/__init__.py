"""Sensor Watch's records and the page's routes on them: what is watched and how, the
profiles and groups, the scans and suggestions. Nothing in this package imports Home
Assistant: it reads it through a Source (common.py) and is handed its load and save, so
the tests run it as it is. The Home Assistant side is one folder up (source.py, admin.py)."""

from .api import SensorWatch
from .common import LEVELS, HAError

__all__ = ["LEVELS", "HAError", "SensorWatch"]
