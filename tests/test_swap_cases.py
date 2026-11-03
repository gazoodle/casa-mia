"""One swap engine, two places: the app swaps text in Python (casa_mia/swap/engine.py),
the browser in TypeScript (integration/cards/src/swap/engine.ts). Both must give the same
text for the same rules, so both are checked against tests/swap_cases.json, written by
hand: the cases are the spec."""

import json
import subprocess
from pathlib import Path

import pytest

from casa_mia.swap import engine
from test_layout_cases import CARDS, node_strips_types

CASES = json.loads(Path(__file__).with_name("swap_cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_python_engine_matches_the_cases(case):
    rules = engine.Rules(case["rules"])
    assert rules.out(case["text"]) == case["expect"]
    assert [i for i, _ in rules.errors] == case.get("errors", [])


def test_spans_say_where_each_replacement_goes():
    rules = engine.Rules([{"match": "Ann", "replace": "Bea"}])
    assert list(rules.spans("Ann met Ann")) == [(0, 3, "Bea"), (8, 11, "Bea")]


@pytest.mark.skipif(not node_strips_types(), reason="needs node 22.6+")
def test_typescript_engine_matches_the_cases():
    run = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--test",
            "src/swap/engine.test.ts",
        ],
        cwd=CARDS,
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stdout + run.stderr
