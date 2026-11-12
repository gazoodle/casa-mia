"""Sensor Watch's test helpers: the integration's files that don't need Home Assistant
(levels.py and the records package) loaded as a package of their own, a stand-in Home
Assistant, and the records the tests share."""

import importlib
import json
import sys
import types
from pathlib import Path
from typing import Any

# The integration's package __init__ needs Home Assistant (Python 3.13; this venv is
# 3.11), so its folder is given a bare package of another name: levels.py and records/
# import from it as they are, relative imports and all, and nothing else is loaded.
FOLDER = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia_sensor_watch"
)
PACKAGE = "sensor_watch_under_test"
if PACKAGE not in sys.modules:
    _package = types.ModuleType(PACKAGE)
    _package.__path__ = [str(FOLDER)]
    sys.modules[PACKAGE] = _package


def _load(name: str) -> Any:
    return importlib.import_module(f"{PACKAGE}.{name}")


levels = _load("levels")
records = _load("records")
common = _load("records.common")
defaults = _load("records.defaults")
history = _load("records.history")
profiles = _load("records.profiles")
scans = _load("records.scans")
store = _load("records.store")
suggest = _load("records.suggest")
HAError = records.HAError


SALT = {
    "kind": "numeric",
    "bands": [
        {"from": None, "to": 10, "level": "critical", "message": "Out of salt"},
        {"from": 10, "to": 25, "level": "task", "message": "Top up the salt"},
        {"from": 25, "to": None, "level": "nominal", "message": ""},
    ],
    "otherwise": "error",
    "unavailable": "error",
}


def _now(**levels_by_entity):
    return {
        e: {
            "level": lv,
            "since": f"2026-10-11T0{n}:00:00",
            "name": e,
            "value": "1",
            "message": None,
        }
        for n, (e, lv) in enumerate(levels_by_entity.items())
    }


class FakeHA:
    def __init__(self, states, entities=()):
        self.states = states
        self.entities = list(entities)
        self.components = ["recorder", "history", "sensor"]
        self.country: str | None = None  # Home Assistant's, when it has been told
        self.asked: list[dict] = []

    def call(self, *commands):
        out = []
        for c in commands:
            self.asked.append(c)
            kind = c["type"]
            if kind == "get_states":
                out.append(self.states)
            elif kind == "config/entity_registry/list":
                out.append(self.entities)
            elif kind == "config/device_registry/list":
                out.append(
                    [
                        {
                            "id": "dev1",
                            "area_id": "kitchen",
                            "name": "Softener",
                            "manufacturer": "Acme",
                            "model": "Soft 2",
                        }
                    ]
                )
            elif kind == "config/area_registry/list":
                out.append(
                    [{"area_id": "kitchen", "name": "Kitchen", "floor_id": "ground"}]
                )
            elif kind == "config/floor_registry/list":
                out.append([{"floor_id": "ground", "name": "Ground floor"}])
            elif kind == "config/label_registry/list":
                out.append([{"label_id": "water", "name": "Water"}])
            elif kind == "recorder/statistics_during_period":
                out.append(
                    {
                        i: [{"start": 0, "mean": 20.0, "min": 19.0, "max": 21.0}]
                        for i in c["statistic_ids"]
                    }
                )
            elif kind == "history/history_during_period":
                out.append({i: [{"s": "off", "lu": 0.0}] for i in c["entity_ids"]})
            elif kind == "get_config":
                out.append({"components": self.components, "country": self.country})
            else:
                raise AssertionError(kind)
        return out


def _state(eid, state, **attrs):
    return {
        "entity_id": eid,
        "state": state,
        "attributes": {"friendly_name": eid.split(".")[1].title(), **attrs},
    }


STATES = [
    _state("sensor.salt", "40", state_class="measurement", unit_of_measurement="%"),
    _state("sensor.weather_text", "sunny"),  # text: nothing to range
    _state("binary_sensor.leak", "off", device_class="moisture"),
    _state("sensor.status", "nominal"),  # Sensor Watch's own
    _state("light.lamp", "on"),
] + [_state(f"sensor.temp_{n:02}", "21", state_class="measurement") for n in range(5)]


ENTITIES = [
    {
        "entity_id": "sensor.salt",
        "platform": "esphome",
        "device_id": "dev1",
        "labels": ["water"],
    },
    {"entity_id": "sensor.weather_text", "entity_category": "diagnostic"},
    {
        "entity_id": "sensor.status",
        "platform": "casa_mia",
        "translation_key": "sensor_watch_status",
    },
]


def make(path, ha, **kw) -> Any:
    """A SensorWatch kept in the file at `path` (Home Assistant's storage, in the
    integration). `told` gathers what the watcher is told of: the entities whose records
    changed, or None for any of them."""
    told: list[set[str] | None] = []
    data = json.loads(path.read_text()) if path.exists() else None
    watch = records.SensorWatch(
        data, ha, lambda d: path.write_text(json.dumps(d)), told.append, **kw
    )
    watch.told = told
    return watch


def call(watch, method, path, query=None, body=None):
    status, _, data = watch.handle(
        method,
        path,
        query or {},
        json.dumps(body).encode() if body is not None else b"",
    )
    return status, json.loads(data)


class NoHistoryHA(FakeHA):
    """An HA without its History integration: the command is unknown."""

    def call(self, *commands):
        if any(c["type"] == "history/history_during_period" for c in commands):
            raise HAError("history/history_during_period: Unknown command.")
        return super().call(*commands)


def _entry(entry_id, state, disabled=False, reason=None):
    return {
        "entry_id": entry_id,
        "domain": "acme_hub",
        "title": "Barn blinds",
        "state": state,
        "reason": reason,
        "disabled": disabled,
    }


ALARM = {"kind": "state", "states": ["0"], "other": "error", "message": "Alarm raised"}


def _cand(eid, device_class="", unit=""):
    return {"entity_id": eid, "device_class": device_class, "unit": unit}
