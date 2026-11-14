import assert from "node:assert/strict";
import { test } from "node:test";
import { tall, widths } from "./balance.ts";

const room = (knobs: number, dollies = 0, meter = false, alarms = 0) => ({ knobs, dollies, meter, alarms });

test("a house of small rooms keeps every chassis one wide", () => {
  assert.deepEqual(widths([room(1), room(2), room(0, 2), room(0, 0, true)]), [1, 1, 1, 1]);
  assert.deepEqual(widths([]), []);
});

test("a room with many controls is widened, and the others only as far as its height", () => {
  const rooms = [room(8, 5, true), room(4, 2), room(2, 1), room(1)];
  const wide = widths(rooms);
  assert.deepEqual(wide, [3, 2, 1, 1]);
  // A meter and two knobs share a row at three wide, and stand in a column at one.
  assert.equal(tall(room(2, 0, true), 3), 150);
  assert.equal(tall(room(2, 0, true), 1), 430);
  // An alarm is too wide to share a one-wide chassis's row.
  assert.equal(tall(room(0, 1, false, 1), 1), 270);
  // Nothing is taller than the biggest room is at its widest.
  const limit = tall(rooms[0], 3);
  rooms.forEach((r, i) => assert.ok(tall(r, wide[i]) <= limit));
});
