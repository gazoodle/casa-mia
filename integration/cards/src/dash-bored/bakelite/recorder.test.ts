import assert from "node:assert/strict";
import { test } from "node:test";
import { plot } from "./recorder.ts";

const at = (t: number, on: boolean, level?: number, away = false) => ({ at: t, on, level, away });

test("a switch is drawn up while it is on and down while it is off", () => {
  assert.deepEqual(plot([at(0, false), at(50, true), at(75, false)], 0, 100, 0, 100), [[[0, 0], [0.5, 0], [0.5, 1], [0.75, 1], [0.75, 0], [1, 0]]]);
});

test("a level is drawn at its height, and never so low that on looks like off", () => {
  assert.deepEqual(plot([at(0, true, 50), at(50, true, 1)], 0, 100, 0, 100), [[[0, 0.5], [0.5, 0.5], [0.5, 0.08], [1, 0.08]]]);
  // A thermostat's target, on its own scale.
  assert.deepEqual(plot([at(0, true, 21)], 0, 100, 7, 35), [[[0, 0.5], [1, 0.5]]]);
});

test("the pen is lifted while a device is not answering, and what is before the strip is left out", () => {
  const runs = plot([at(-50, true), at(-10, false), at(20, false, undefined, true), at(60, true)], 0, 100, 0, 100);
  assert.deepEqual(runs, [[[0, 0], [0.2, 0]], [[0.6, 1], [1, 1]]]);
  assert.deepEqual(plot([], 0, 100, 0, 100), []);
});
