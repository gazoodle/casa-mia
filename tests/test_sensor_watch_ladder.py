"""The band editor's ladder (app/web/src/sensor-watch/ladder.ts): stored bands to a
ladder out from nominal and back, the gaps of an older record kept as bands, what stops
a save, and the nudge. Run in node as it is, as test_layout_cases.py runs the cards'."""

import subprocess
from pathlib import Path

import pytest

from test_layout_cases import node_strips_types

LADDER = Path(__file__).resolve().parents[1] / "app/web/src/sensor-watch/ladder.ts"

CHECKS = """
import assert from "node:assert/strict";
const { toLadder, toBands, problemOf, moved, nudge } = await import(process.argv[1]);
const band = (from, to, level) => ({ from, to, level, message: "" });

// Warning down to 16, nominal 18-22, warning up to 24, error above: and back again.
const stored = [band(null, 16, "error"), band(16, 18, "warning"), band(18, 22, "nominal"), band(22, 24, "warning"), band(24, null, "error")];
const { ladder, promoted } = toLadder([...stored].reverse(), "error");
assert.equal(promoted, null);
assert.deepEqual([ladder.low, ladder.high], ["18", "22"]);
assert.deepEqual(ladder.up.map((r) => [r.level, r.edge]), [["warning", "24"], ["error", ""]]);
assert.deepEqual(ladder.down.map((r) => [r.level, r.edge]), [["warning", "16"], ["error", ""]]);
assert.deepEqual(toBands(ladder), stored);
assert.equal(problemOf(ladder), null);

// An older record stopping at 0: the gap below opens as a band at the Outside level.
const battery = toLadder([band(0, null, "nominal")], "error").ladder;
assert.deepEqual(toBands(battery), [band(null, 0, "error"), band(0, null, "nominal")]);

// No band nominal: the best is shown, and saved, as nominal.
const odd = toLadder([band(null, 5, "error"), band(5, null, "task")], "error");
assert.equal(odd.promoted.level, "task");
assert.deepEqual(toBands(odd.ladder).map((b) => b.level), ["error", "nominal"]);

// What stops a save.
const up = (rungs) => ({ ...ladder, up: rungs.map(([level, edge]) => ({ level, edge, message: "" })) });
assert.match(problemOf(up([["error", "24"], ["warning", ""]])), /worse/);
assert.match(problemOf(up([["warning", ""], ["error", ""]])), /Warning: up to what/);
assert.match(problemOf(up([["warning", "20"], ["error", ""]])), /22 must be below 20/);
assert.match(problemOf({ ...ladder, high: "" }), /top edge/);
assert.match(problemOf({ ...ladder, low: "1,5" }), /numbers/);

// The nudge: 22 raised to 23.
const raised = { ...ladder, high: "23" };
assert.equal(moved("22", "23"), 1);
assert.equal(moved("0.1", "0.3"), 0.2);
assert.equal(moved("22", ""), null);
const above = nudge(raised, "high", 1, false);
assert.deepEqual([above.down[0].edge, above.low, above.high, above.up[0].edge], ["16", "18", "23", "25"]);
const all = nudge(raised, "high", 1, true);
assert.deepEqual([all.down[0].edge, all.low, all.high, all.up[0].edge], ["17", "19", "23", "25"]);
"""


@pytest.mark.skipif(not node_strips_types(), reason="needs node 22.6+")
def test_ladder():
    run = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--input-type=module",
            "-e",
            CHECKS,
            LADDER.as_uri(),
        ],
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stdout + run.stderr
