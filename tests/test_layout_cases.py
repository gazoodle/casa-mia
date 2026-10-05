"""One layout engine, two places: the compositor draws commanders in Python
(compositor.commander_layout), the Tablet layout card lays out cards in the browser
(integration/cards/src/layout.ts). Both must give the same rectangles for the same
settings, so both are checked against tests/layout_cases.json.

A deliberate change to the engine: change both, then rewrite the cases from Python with
`.venv/bin/python tests/test_layout_cases.py` and check the TypeScript still agrees."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from casa_mia.modules.compositor import EMPTY_COMMANDER, commander_layout

ROOT = Path(__file__).resolve().parents[1]
CASES = Path(__file__).with_name("layout_cases.json")
CARDS = ROOT / "integration" / "cards"


def cmd(**over) -> dict:
    """A commander with three cameras on each side unless told otherwise."""
    out = json.loads(json.dumps(EMPTY_COMMANDER))
    for p, n in (("left", 3), ("top", 2), ("right", 3), ("bottom", 4)):
        out[p]["cameras"] = [f"{p}{i}" for i in range(n)]
    for k, v in over.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = {**out[k], **v}
        else:
            out[k] = v
    return out


def inputs() -> list[tuple[str, dict, str | None]]:
    tall = {"left0": 0.56, "left1": 1.33, "left2": 1.78, "main": 0.75}
    return [
        ("defaults", cmd(), None),
        ("odd size", cmd(width=1366, height=769, gap=5), None),
        ("no gap", cmd(gap=0), None),
        (
            "empty panels take no room",
            cmd(top={"cameras": []}, right={"cameras": []}),
            None,
        ),
        (
            "nothing but main",
            cmd(**{p: {"cameras": []} for p in ("left", "top", "right", "bottom")}),
            None,
        ),
        (
            "lines",
            cmd(
                left={"lines": 2},
                bottom={"lines": 3, "cameras": [f"b{i}" for i in range(7)]},
            ),
            None,
        ),
        (
            "anchors",
            cmd(
                top={"anchor_left": True},
                bottom={"anchor_left": False, "anchor_right": False},
            ),
            None,
        ),
        (
            "stack",
            cmd(left={"fit": "stack"}, bottom={"fit": "stack"}, aspects=tall),
            None,
        ),
        (
            "reverse",
            cmd(left={"fit": "reverse"}, top={"fit": "reverse"}, aspects=tall),
            None,
        ),
        (
            "centre",
            cmd(right={"fit": "centre"}, bottom={"fit": "centre"}, aspects=tall),
            None,
        ),
        (
            "stack overflows",
            cmd(
                left={
                    "fit": "stack",
                    "size": 40,
                    "cameras": [f"l{i}" for i in range(9)],
                }
            ),
            None,
        ),
        ("own", cmd(main_fit="own", aspects={**tall, "left1": 1.78}), "left1"),
        ("own tall", cmd(main_fit="own", aspects=tall), "left0"),
        (
            "own one side",
            cmd(
                main_fit="own", top={"cameras": []}, right={"cameras": []}, aspects=tall
            ),
            "left2",
        ),
        ("fixed", cmd(main_fit="fixed", main_ratio="4:3", main_width=60), None),
        (
            "fixed wide",
            cmd(main_fit="fixed", main_ratio="21:9", main_width=95, panel_min=12),
            None,
        ),
        ("portrait", cmd(width=800, height=1280, gap=8), None),
        (
            "portrait own",
            cmd(width=800, height=1280, main_fit="own", aspects=tall),
            "left1",
        ),
    ]


def result(c: dict, main: str | None) -> dict:
    size, main_rect, tiles = commander_layout(c, main)
    return {
        "size": list(size),
        "main": list(main_rect),
        "tiles": {p: [list(r) for r in rs] for p, rs in tiles.items()},
    }


def test_python_engine_matches_the_cases():
    for case in json.loads(CASES.read_text()):
        assert result(case["cmd"], case["main_camera"]) == case["expect"], case["name"]


def node_strips_types() -> bool:
    """Node 22.6 or later runs TypeScript as it is."""
    if not shutil.which("node"):
        return False
    out = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout
    major, minor = (int(x) for x in out.lstrip("v").split(".")[:2])
    return (major, minor) >= (22, 6)


@pytest.mark.skipif(not node_strips_types(), reason="needs node 22.6+")
def test_typescript_engine_matches_the_cases():
    run = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--test",
            "src/layout.test.ts",
            "src/sizing.test.ts",  # the cards' sizing rule, alongside
        ],
        cwd=CARDS,
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stdout + run.stderr


if __name__ == "__main__":
    cases = [
        {"name": n, "cmd": c, "main_camera": m, "expect": result(c, m)}
        for n, c, m in inputs()
    ]
    CASES.write_text(json.dumps(cases, indent=1) + "\n")
    print(f"wrote {len(cases)} cases to {CASES}")
