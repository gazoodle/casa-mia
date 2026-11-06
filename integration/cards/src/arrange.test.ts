// Arrange (tests/test_layout_cases.py runs this too).
import assert from "node:assert/strict";
import test from "node:test";
import { arrange, bestOf, type Ask } from "./arrange.ts";
import { PANELS } from "./layout.ts";

const cameras = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
const ask = (over: Partial<Ask>): Ask => ({ width: 1920, height: 1080, gap: 0, cameras: cameras(7), cell: "16:9", edges: ["bottom", "left", "right", "top"], ...over });

test("7 cameras, 16:9 tiles on a 16:9 picture: an L with nothing unused", () => {
  const list = arrange(ask({}));
  const best = list[bestOf(list)];
  assert.deepEqual(best.counts, { bottom: 4, left: 3 });
  assert.deepEqual(best.tile, [480, 270]);
  assert.equal(best.waste, 0);
  assert.equal(best.main_fit, "crop");
});

test("every option holds every camera once, biggest main camera first", () => {
  for (const cell of ["16:9", "4:3", "1:1"]) {
    const list = arrange(ask({ width: 1280, height: 800, gap: 4, cameras: cameras(12), cell }));
    assert.ok(list.length > 1, cell);
    for (const a of list) assert.deepEqual(PANELS.flatMap((p) => a.panels[p].cameras).sort(), cameras(12).sort());
    assert.deepEqual(list.map((a) => a.shown), list.map((a) => a.shown).sort((x, y) => y - x));
  }
});

test("only the edges allowed, filled in order", () => {
  const list = arrange(ask({ edges: ["top", "right"] }));
  for (const a of list) assert.ok(Object.keys(a.counts).every((p) => p === "right" || p === "top"));
  assert.ok(list.every((a) => a.counts.right));
});

test("one row or column per edge: never two", () => {
  const list = arrange(ask({ cameras: cameras(12), gap: 6, oneLine: true }));
  assert.ok(list.length > 0);
  assert.ok(list.every((a) => a.lines === 1));
  assert.ok(arrange(ask({ cameras: cameras(12), gap: 6 })).some((a) => a.lines === 2)); // allowed otherwise
});
