"""Sensor Watch's test helpers: the integration's levels.py loaded by path, a stand-in
Home Assistant, and the records the tests share."""

import importlib.util
import json
from pathlib import Path
from typing import Any

from casa_mia.ha import HAError
from casa_mia.modules.sensor_watch import SensorWatch

# Loaded by path: the package __init__ needs Home Assistant, levels.py does not.
FILE = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia/sensor_watch/levels.py"
)


spec = importlib.util.spec_from_file_location("sw_levels", FILE)


assert spec and spec.loader


levels = importlib.util.module_from_spec(spec)


spec.loader.exec_module(levels)


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
    def __init__(self, states, entities=(), service=None):
        self.states = states
        self.entities = list(entities)
        self.service = service
        self.components = ["recorder", "history", "sensor"]
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
                out.append({"components": self.components})
            elif kind == "call_service":
                if self.service is None:
                    raise HAError("call_service: Service not found")
                out.append({"response": self.service})
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


def make(path, ha, **kw) -> SensorWatch:
    ha_: Any = ha  # a stand-in for HA
    return SensorWatch(path, ha_, **kw)


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
