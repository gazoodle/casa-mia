"""The "Notify on Sensor Watch" blueprint the integration installs: sound YAML, every
!input an input it declares, and every event field it reads one the integration fires."""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "integration" / "custom_components" / "casa_mia_sensor_watch"


class _Loader(yaml.SafeLoader):
    pass


_Loader.add_constructor("!input", lambda loader, node: ("input", node.value))


def _inputs(node, out):
    if isinstance(node, tuple) and node[0] == "input":
        out.add(node[1])
    elif isinstance(node, dict):
        for v in node.values():
            _inputs(v, out)
    elif isinstance(node, list):
        for v in node:
            _inputs(v, out)
    return out


def test_the_blueprint_is_sound():
    text = (COMPONENT / "blueprints" / "notify.yaml").read_text()
    bp = yaml.load(text, _Loader)  # noqa: S506 (our own loader, SafeLoader based)
    assert bp["blueprint"]["domain"] == "automation"
    declared = set(bp["blueprint"]["input"])
    assert _inputs({k: v for k, v in bp.items() if k != "blueprint"}, set()) == declared
    fired = set(
        re.findall(r'^\s+"(\w+)":', _fire_body(), re.MULTILINE)
    )  # the event's keys
    read = set(re.findall(r"trigger\.event\.data\.(\w+)", text))
    assert read and read <= fired, read - fired


def _fire_body() -> str:
    source = (COMPONENT / "watch.py").read_text()
    return source.split("def _fire(", 1)[1].split("\n    def ", 1)[0]
