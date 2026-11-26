// Tuning a card's sizes on one device (tune.ts): the record's reference and where it is.
import assert from "node:assert/strict";
import test from "node:test";
import { reference, whereOf } from "./tune.ts";

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
