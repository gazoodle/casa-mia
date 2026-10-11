"""sensor_watch: Sensor Watch, any sensor given bands of values, each with a level
(nominal, task, warning, error, critical), so what has gone wrong (or needs doing) shows
before the family notices. The app keeps the records and suggests them from history;
the Casa Mia Sensor Watch integration watches the states and tells Home Assistant.

Layers: common (constants, records checked) → suggest (statistics) and history (what
HA is asked) → api (SensorWatch: the store, the admin API, the scans)."""

from .api import SensorWatch
from .common import LEVELS

__all__ = ["LEVELS", "SensorWatch"]
