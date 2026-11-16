import assert from "node:assert/strict";
import { test } from "node:test";
import { columns, laid, racks, tall } from "./balance.ts";

const room = (knobs: number, dollies = 0, meter = false, alarms = 0, tvs = 0, selectors: number[] = [], knives = 0) => ({ knobs, dollies, meter, alarms, tvs, selectors, knives });
const wide = (rooms: ReturnType<typeof room>[], across: number) => laid(rooms, across).map((p) => p.wide);

test("a house of small rooms keeps every chassis one wide, in one row", () => {
  assert.deepEqual(laid([room(1), room(1), room(0, 1), room(0, 0, true)], 5).map((p) => [p.wide, p.first, p.under]), [[1, true, false], [1, false, false], [1, false, false], [1, false, false]]);
  assert.deepEqual(laid([], 5), []);
});

test("how tall a room's controls are follows the stylesheet's sizes", () => {
  // A meter and two knobs share a row at three wide, and stand in a column at one.
  assert.equal(tall(room(2, 0, true), 3), 185);
  assert.equal(tall(room(2, 0, true), 1), 497);
  // An alarm is too wide to share a one-wide chassis's row.
  assert.equal(tall(room(0, 1, false, 1), 1), 296);
  // A selector switch is as tall as its stops need; a lone scene has a knife switch.
  assert.equal(tall(room(0, 0, false, 0, 0, [4]), 1), 184);
  assert.equal(tall(room(0, 0, false, 0, 0, [], 1), 1), 166);
  // A chassis may be as wide as the panel: nine knobs stand in one row at six columns.
  assert.equal(tall(room(9), 6), 156);
});

test("a room with many controls is widened, and no row is taller for a room that is not in it", () => {
  // By the rule this replaced, the first room's height at three wide was the limit for
  // them all, and the second stood eleven controls in a column.
  const rooms = [room(12, 33), room(6, 5), room(0, 1)];
  const placed = laid(rooms, 5);
  assert.equal(placed[0].wide, 5);
  assert.ok(placed[1].first && placed[1].wide > 1);
  // Two rooms of one switch stand one under the other beside a room that is taller than both
  // (a meter, a knob and an alarm in one column), unless the second begins a floor.
  const small = [room(0, 1), room(0, 1), room(1, 0, true, 1)];
  assert.deepEqual(laid(small, 2).map((p) => p.under), [false, true, false]);
  assert.deepEqual(laid(small, 2, (i) => i === 1).map((p) => p.under), [false, false, false]);
  // The two small ones are 504 px together and the big one 631: the 115 px under them has a blanking plate, and the big one has none.
  assert.deepEqual(racks(small, laid(small, 2)).map((bay) => [bay.things, bay.blank]), [[[0, 1], true], [[2], false]]);
  // With less to spare than a plate needs, there is none: a knob beside a switch is 30 px taller.
  assert.deepEqual(racks([room(1), room(0, 1)], laid([room(1), room(0, 1)], 5)).map((bay) => bay.blank), [false, false]);
  assert.ok(wide(rooms, 7)[0] >= 5);
});

test("a panel has as many columns as fit across it, and never none", () => {
  assert.deepEqual([100, 332, 344, 980, 1236].map(columns), [1, 2, 2, 5, 7]);
});
