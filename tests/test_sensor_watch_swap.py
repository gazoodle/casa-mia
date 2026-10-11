"""The screenshot swap in the Sensor Watch integration (swap.py, loaded by path): the
app's rule, read from swap.json, applied to what's shown and never to entity ids."""

import importlib.util
import json
from pathlib import Path

from casa_mia import swap as app_swap

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "sw_swap", ROOT / "integration/custom_components/casa_mia_sensor_watch/swap.py"
)
assert _spec and _spec.loader
sw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sw)

PAIRS = {"Ann": "Bea", "Oak Tree": "Barn", "07700 900123": "07700 900999"}


def test_the_same_rule_as_the_app():
    for text in ["Ann's plug", "Annex", "Oak Tree kitchen", "+44 07700 900123", "x"]:
        assert sw.rule(PAIRS)(text) == app_swap._rule(PAIRS)(text)


def test_read_from_swap_json_and_applied_to_what_is_shown(tmp_path):
    path = tmp_path / "swap.json"
    assert sw.current(path) is sw.same  # no file: off
    path.write_text(json.dumps({"swap": True, "camera_images": {}, **PAIRS}))
    rule = sw.current(path)
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
    path.write_text(json.dumps({"swap": False, **PAIRS}))
    assert sw.current(path) is sw.same  # switched off
