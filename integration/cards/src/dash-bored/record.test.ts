// The record: a device's history as changes, and when it was on.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chronicle, lit } from "./record.ts";

test("the history is one change for each time the device came to stand differently", () => {
  const rows = [
    { s: "off", lu: 100 },
    { s: "on", a: { brightness: 255 }, lu: 200 },
    { s: "on", a: { brightness: 255, effect: "none" }, lu: 250 }, // nothing the page tells changed
    { s: "on", a: { brightness: 102 }, lu: 300 },
    { s: "unavailable", lu: 400 },
  ];
  assert.deepEqual(chronicle("light", rows), [
    { at: 100_000, on: false, phase: undefined, level: undefined, away: false },
    { at: 200_000, on: true, phase: undefined, level: 100, away: false },
    { at: 300_000, on: true, phase: undefined, level: 40, away: false },
    { at: 400_000, on: false, phase: undefined, level: undefined, away: true },
  ]);
  // A lock is on when locked, and a cover when not closed.
  assert.deepEqual(chronicle("lock", [{ s: "locked", lu: 1 }, { s: "unlocked", lu: 2 }]).map((c) => c.on), [true, false]);
  // A robot's day is told by its phases, and a state that is only on its way is no change.
  assert.deepEqual(chronicle("vacuum", [{ s: "docked", lu: 1 }, { s: "cleaning", lu: 2 }, { s: "returning", lu: 3 }, { s: "docked", lu: 4 }]).map((c) => [c.on, c.phase]), [[false, "docked"], [true, undefined], [false, "returning"], [false, "docked"]]);
  assert.deepEqual(chronicle("cover", [{ s: "open", a: { current_position: 30 }, lu: 1 }])[0], { at: 1000, on: true, phase: undefined, level: 30, away: false });
});

test("when it was on, as parts of the span: cut off at its ends, and running to now if it still is", () => {
  const change = (at: number, on: boolean) => ({ at, on, away: false });
  assert.deepEqual(lit([change(0, true), change(50, false), change(150, true)], 100, 200), [[50, 50]]);
  assert.deepEqual(lit([change(50, true), change(125, false)], 100, 200), [[0, 25]]);
  assert.deepEqual(lit([change(100, false)], 100, 200), []);
});
