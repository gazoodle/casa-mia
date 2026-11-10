// Arrange (tests/test_layout_cases.py runs this too).
import assert from "node:assert/strict";
import test from "node:test";
import { arrange, bestOf, ORDER, TRIM, type Ask, type Mode } from "./arrange.ts";
import { PANELS, type Panel } from "./layout.ts";

const MODES: Mode[] = ["exact", "best", "vary"];
const cameras = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
const ask = (over: Partial<Ask>): Ask => ({ width: 1920, height: 1080, gap: 0, cameras: cameras(7), cell: "16:9", edges: ["bottom", "left"], mode: "exact", ...over });
const best = (over: Partial<Ask>) => {
  const list = arrange(ask(over));
  return list[bestOf(list)];
};

test("7 cameras, 16:9 tiles on a 16:9 picture: an L with nothing unused", () => {
  for (const mode of MODES) {
    const a = best({ mode });
    assert.deepEqual(a.counts, { bottom: 4, left: 3 }, mode);
    assert.deepEqual(a.tile, [480, 270], mode);
    assert.equal(a.waste, 0, mode);
    assert.equal(a.main_fit, "crop", mode);
  }
});

test("every option holds every camera once, biggest main camera first", () => {
  for (const mode of MODES)
    for (const cell of ["16:9", "4:3", "1:1"]) {
      const list = arrange(ask({ width: 1280, height: 800, gap: 4, cameras: cameras(12), cell, edges: ORDER, mode }));
      assert.ok(list.length > 1, `${mode} ${cell}`);
      for (const a of list) assert.deepEqual(PANELS.flatMap((p) => a.panels[p].cameras).sort(), cameras(12).sort());
      assert.deepEqual(list.map((a) => a.shown), list.map((a) => a.shown).sort((x, y) => y - x));
    }
});

test("every edge asked for is used and no other, the first cameras on the first edge", () => {
  for (const mode of MODES)
    for (const edges of [["top", "right"], ["right", "bottom", "top"], ["left"], ORDER] as Panel[][]) {
      const list = arrange(ask({ edges, mode }));
      assert.ok(list.length > 0, `${mode} ${edges}`);
      for (const a of list) {
        assert.deepEqual(Object.keys(a.counts).sort(), [...edges].sort());
        assert.equal(a.panels[edges[0]].cameras[0], "c0");
        assert.deepEqual(edges.flatMap((p) => a.panels[p].cameras), cameras(7)); // in fill order
      }
    }
});

test("no top or bottom: the left and right hold them all", () => {
  for (const mode of MODES)
    for (const a of arrange(ask({ edges: ["left", "right"], mode }))) assert.deepEqual(a.counts, { left: 4, right: 3 });
});

test("many cameras on one edge are still arranged, however small", () => {
  for (const mode of MODES)
    for (const p of PANELS) {
      const list = arrange(ask({ cameras: cameras(16), edges: [p], oneLine: true, mode }));
      assert.ok(list.length > 0, `${mode} ${p}`);
      for (const a of list) assert.equal(a.rects.length, 16);
    }
});

test("one way to share the cameras: smaller tiles still give a bigger main camera to step to", () => {
  for (const mode of MODES)
    for (const edges of [["left", "right"], ["right"]] as Panel[][]) {
      const list = arrange(ask({ cameras: cameras(5), gap: 4, edges, oneLine: true, mode }));
      assert.ok(list.length > 2, `${mode} ${edges}: ${list.length}`);
      const tiles = list.map((a) => a.tile[0]);
      assert.deepEqual(tiles, [...tiles].sort((x, y) => x - y)); // the biggest tiles last
      assert.equal(bestOf(list), list.length - 1); // and it starts on those, which fit their edges
    }
});

test("9 cameras on three edges: sizes vary fills the picture where one size can't", () => {
  const [fitted, vary] = (["best", "vary"] as Mode[]).map((mode) => best({ cameras: cameras(9), gap: 4, edges: ["bottom", "left", "right"], oneLine: true, mode }));
  assert.ok(fitted.waste > 0.1);
  assert.ok(vary.waste < 0.02);
  assert.equal(vary.main_fit, "crop");
});

test("fewer cameras than edges: the first edges, one each", () => {
  assert.deepEqual(best({ cameras: cameras(2), edges: ["right", "top", "bottom"] }).counts, { right: 1, top: 1 });
  assert.deepEqual(arrange(ask({ cameras: [] })), []);
  assert.deepEqual(arrange(ask({ edges: [] })), []);
});

test("one row or column per edge: never more", () => {
  const one = arrange(ask({ cameras: cameras(12), gap: 6, edges: ORDER, oneLine: true }));
  assert.ok(one.length > 0);
  assert.ok(one.every((a) => a.lines[0] === 1 && a.lines[1] === 1));
  const more = arrange(ask({ cameras: cameras(12), gap: 6, edges: ["bottom"] }));
  assert.ok(more.some((a) => a.lines[0] > 1)); // allowed otherwise
});

test("opposite edges at most one camera apart, the extra to the one earlier in fill order", () => {
  for (const n of [5, 9, 12, 15]) {
    for (const a of arrange(ask({ cameras: cameras(n), gap: 6, edges: ORDER, oneLine: false }))) {
      const c = a.counts as Record<Panel, number>;
      assert.ok(c.bottom - c.top === 0 || c.bottom - c.top === 1, `${n}: ${JSON.stringify(c)}`);
      assert.ok(c.left - c.right === 0 || c.left - c.right === 1, `${n}: ${JSON.stringify(c)}`);
    }
  }
  assert.deepEqual(best({ cameras: cameras(5), edges: ["top", "bottom"] }).counts, { top: 3, bottom: 2 });
});

test("exact and best: every tile one size; best crops no camera by more than its limit", () => {
  for (const mode of ["exact", "best"] as Mode[])
    for (const n of [5, 8, 11])
      for (const a of arrange(ask({ width: 1280, height: 800, gap: 4, cameras: cameras(n), edges: ["bottom", "left", "right"], mode }))) {
        const sizes = new Set(a.rects.map((r) => `${r[2]}x${r[3]}`));
        assert.equal(sizes.size, 1, `${mode} ${n}: ${[...sizes]}`);
        assert.ok(a.trim <= (mode === "best" ? TRIM + 0.01 : 0.01), `${mode} ${n}: ${a.trim}`);
      }
});

test("8 cameras on an L: best fit leaves less unused than the exact shape, sizes vary none", () => {
  const [exact, fitted, vary] = MODES.map((mode) => best({ cameras: cameras(8), mode }));
  assert.ok(exact.waste > 0.03);
  assert.ok(fitted.waste < exact.waste);
  assert.ok(vary.waste < 0.001);
});

test("more than one to step between, on two edges or more", () => {
  for (const mode of MODES)
    for (const n of [5, 6, 8, 9, 10, 13]) {
      const list = arrange(ask({ cameras: cameras(n), gap: 4, oneLine: true, mode }));
      assert.ok(list.length > 1, `${mode} ${n}: ${list.length}`);
    }
});
