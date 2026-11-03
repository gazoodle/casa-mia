"""The screenshot swap in the Sensor Watch integration (swap.py, loaded by path): the
swap's rule applied to what's shown, never to entity ids."""

import importlib.util
from pathlib import Path

from casa_mia.swap import engine

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "sw_swap", ROOT / "integration/custom_components/casa_mia/sensor_watch/swap.py"
)
assert _spec and _spec.loader
sw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sw)


def test_applied_to_what_is_shown():
    rule = engine.Rules(
        [{"match": "Oak Tree", "replace": "Barn"}, {"match": "Ann", "replace": "Bea"}]
    ).out
    row = {
        "entity_id": "sensor.oak_tree_plug",
        "name": "Oak Tree plug",
        "message": "Ann: check it",
        "area": "Oak Tree",
        "group": None,
        "level": "warning",
    }
    assert sw.shown(rule, row) == row | {
        "name": "Barn plug",
        "message": "Bea: check it",
        "area": "Barn",
    }
    assert sw.shown(sw.same, row) is row
