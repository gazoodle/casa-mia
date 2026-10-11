"""sensor_watch: Sensor Watch, any sensor given bands of values, each with a level
(nominal, task, warning, error, critical), so what has gone wrong (or needs doing) shows
before the family notices. The app keeps the records and suggests them from history;
the Casa Mia Sensor Watch integration watches the states and tells Home Assistant.

Layers: common (constants, records checked) → suggest (statistics), history (what
HA is asked), profiles, status (overall health, for the Home tile) and live (the
levels, pushed) → store (Store: the records, saving) → scans (Scanner: candidates,
suggestions, the scan) → api (SensorWatch: the admin page's routes)."""

from .api import SensorWatch
from .common import LEVELS

__all__ = ["LEVELS", "SensorWatch"]
