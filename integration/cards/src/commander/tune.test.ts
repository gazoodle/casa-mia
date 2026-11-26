// Tuning a card's sizes on one device (tune.ts): the record's reference and where it is.
import assert from "node:assert/strict";
import test from "node:test";
import { inUse, reference, whereOf } from "./tune.ts";

test("a record's reference is the date and time to the second and three letters", () => {
  const at = new Date(2026, 10, 27, 14, 32, 5);
  const ref = reference(at, () => 0.5);
  assert.equal(ref, "T-1127-143205-NNN");
  assert.match(reference(), /^T-\d{4}-\d{6}-[A-Z]{3}$/);
});

test("each place the card can be is tuned on its own", () => {
  assert.equal(whereOf(false, false), "page");
  assert.equal(whereOf(true, false), "commander full screen");
  assert.equal(whereOf(false, true), "page, main camera full screen");
  assert.equal(whereOf(true, true), "commander full screen, main camera full screen");
});

test("the controls follow the main name in use, until they are set by hand", () => {
  const rules = { tile: 11, main: 20, controls: 30, dot: 7 };
  assert.deepEqual(inUse(rules, {}), { main: 20, tile: 11, dot: 7, controls: 30, follow: true });
  // the main name set by hand: the controls go with it
  assert.deepEqual(inUse(rules, { main: 15 }), { main: 15, tile: 11, dot: 7, controls: 23, follow: true });
  // the controls set by hand: their own, whatever the main name
  assert.deepEqual(inUse(rules, { main: 15, controls: 40 }), { main: 15, tile: 11, dot: 7, controls: 40, follow: false });
});
