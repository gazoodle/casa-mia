// Where everything in a commander's picture is (placed.ts): the same in both modes for
// whatever reads it, and the same as the compositor's (tests/test_commander_responsive.py).
import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../../tests/layout_cases.json" with { type: "json" };
import { layout, type Settings } from "./layout.ts";
import { camerasOf, placed, type Commander } from "./placed.ts";
import { responsive } from "./responsive.ts";

const fixed = () => JSON.parse(JSON.stringify(cases[0].cmd)) as Commander; // three cameras each side
const CAMS = Array.from({ length: 14 }, (_, i) => `camera.c${i}`);
const resp = (over: Record<string, unknown> = {}, n = 14): Commander => ({ ...fixed(), width: 1100, height: 560, mode: "responsive", responsive: { cameras: CAMS.slice(0, n), ...over } });

test("a fixed commander: its panels' tiles, as the engine places them", () => {
  const s = fixed();
  s.left.fit = "contain";
  const [size, main, rects] = layout(s as Settings, "left1");
  const p = placed(s, "left1");
  assert.deepEqual([p.size, p.main, p.mainHow, p.more, p.gave], [size, main, "contain", null, []]);
  assert.deepEqual(p.tiles.map((t) => t.camera), [...s.left.cameras, ...s.top.cameras, ...s.right.cameras, ...s.bottom.cameras]);
  assert.deepEqual(p.tiles.filter((t) => t.where === "left").map((t) => t.rect), rects.left);
  assert.deepEqual(new Set(p.tiles.filter((t) => t.where === "left").map((t) => t.how)), new Set(["contain"]));
  assert.deepEqual(new Set(p.tiles.filter((t) => t.where === "bottom").map((t) => t.how)), new Set(["cover"]));
  assert.equal(placed({ ...s, main_fit: "fill" }).mainHow, "fill");
  assert.equal(placed({ ...s, main_fit: "crop" }).mainHow, "cover");
});

test("a Responsive commander: the solver's places, its cameras put to its tiles in order", () => {
  const s = resp();
  const want = responsive(1100, 560, s.gap, 0, 14);
  const p = placed(s, CAMS[3]);
  assert.deepEqual([p.size, p.main, p.mainHow], [[1100, 560], want.main, "cover"]);
  assert.deepEqual(p.tiles.map((t) => [t.camera, t.rect]), CAMS.map((e, i) => [e, want.tiles[i]]));
  assert.ok(p.tiles.every((t) => t.where === "tiles" && t.how === "cover"));
  assert.deepEqual(placed(s, CAMS[0]), placed(s, CAMS[9])); // nothing moves with the main camera
});

test("its cameras are its own list, not its panels'", () => {
  assert.deepEqual(camerasOf(resp()), CAMS);
  assert.equal(camerasOf(fixed()).length, 12);
});

test("cameras there is no room for are in more", () => {
  const many = Array.from({ length: 32 }, (_, i) => `camera.m${i}`);
  const p = placed({ ...resp(), width: 393, height: 700, responsive: { cameras: many } });
  assert.ok(p.more && p.more.count === 32 - p.tiles.length && p.more.count > 0);
  assert.deepEqual(p.tiles.map((t) => t.camera), many.slice(0, p.tiles.length));
});

test("the main camera's own shape reaches the solver, and the scale the smallest tile", () => {
  const s = { ...resp({ main_other: "whole" }), aspects: { [CAMS[0]]: 4 / 3 } };
  assert.equal(placed(s, CAMS[0]).mainHow, "contain");
  assert.equal(placed(s, CAMS[1]).mainHow, "contain"); // its block is 7% off 16:9: bars
  const twice = placed({ ...resp(), width: 2200, height: 1120, gap: 8, scale: 2 });
  assert.equal(twice.tiles.length, placed(resp()).tiles.length);
  assert.ok(Math.abs(twice.tiles[0].rect[2] - 2 * placed(resp()).tiles[0].rect[2]) <= 4);
});
