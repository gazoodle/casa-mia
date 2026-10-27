"""The "Notify on Sensor Watch" blueprint the integration installs: sound YAML, every
!input an input it declares, and every event field it reads one the integration fires."""

import importlib.util
import re
import threading
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "integration" / "custom_components" / "casa_mia" / "sensor_watch"


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
    # The integration keeps it current. A source_url (GitHub's main) never matched the
    # copy written with the dropdowns filled in, so updaters (Spook) always offered an
    # "update" that would have put back an older blueprint with empty dropdowns.
    assert "source_url" not in bp["blueprint"]
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


def _module():
    spec = importlib.util.spec_from_file_location("bp", COMPONENT / "blueprint.py")
    assert spec and spec.loader
    bp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bp)
    return bp


def test_installs_in_flight_together_never_leave_a_torn_file(tmp_path):
    """Several installs run in the executor at once (notify services register one by
    one at start), each with a different-length text. Written in place, a longer text's
    tail survived a shorter one's end and Home Assistant refused the file."""
    bp = _module()
    template = (COMPONENT / "blueprints" / "notify.yaml").read_text()
    texts = [
        bp.filled(template, ["Leaks"] * n, [f"notify.mobile_app_{i}" for i in range(n)])
        for n in (1, 30, 2, 60, 3)
    ]
    target = tmp_path / "blueprints" / "sensor_watch_notify.yaml"
    jobs = [
        threading.Thread(target=bp.install, args=(str(target), lambda t=t: t))
        for t in texts * 8
    ]
    for job in jobs:
        job.start()
    for job in jobs:
        job.join()
    assert target.read_text() in texts
    yaml.load(target.read_text(), _Loader)  # noqa: S506
    assert [p.name for p in target.parent.iterdir()] == [target.name]  # no part left

    # the last to run writes the newest text, whatever order the jobs ran in
    bp.install(str(target), lambda: texts[0])
    assert target.read_text() == texts[0]


def test_its_dropdowns_offer_the_groups_and_notify_actions():
    bp = _module()
    template = (COMPONENT / "blueprints" / "notify.yaml").read_text()
    assert bp.GROUPS in template and bp.NOTIFIES in template
    text = bp.filled(template, ['Mains "UK"', "Leaks"], ["notify.mobile_app_ann"])
    inputs = yaml.load(text, _Loader)["blueprint"]["input"]  # noqa: S506
    group = inputs["group"]["selector"]["select"]
    assert group == {"custom_value": True, "options": ['Mains "UK"', "Leaks"]}
    notify = inputs["notify"]["selector"]["select"]
    assert notify["options"] == ["notify.mobile_app_ann"]


def test_every_level_has_its_phone_style_and_titles_are_words():
    from casa_mia.modules.sensor_watch import LEVELS

    text = (COMPONENT / "blueprints" / "notify.yaml").read_text()
    bp = yaml.load(text, _Loader)  # noqa: S506 (our own loader, SafeLoader based)
    styles = bp["variables"]["styles"]
    assert set(styles) == {*LEVELS[1:], "back"}
    for style in styles.values():
        assert {"channel", "importance", "color", "icon", "push"} <= set(style)
    # The level as a word, no coloured symbols (2026-10-27).
    assert all(ord(c) < 0x2000 for c in bp["variables"]["title"])
