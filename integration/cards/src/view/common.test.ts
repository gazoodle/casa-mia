// The Tablet Layout's switch to HA's own sections on a narrow screen (common.ts: narrow).
import { test } from "node:test";
import assert from "node:assert/strict";
import { NARROW_GIVE, narrow, narrowBelow, narrowOrder } from "./common.ts";

test("narrow below the threshold, with some give on the way back", () => {
  assert.equal(narrow(390, 600, false), true); // a phone
  assert.equal(narrow(1280, 600, false), false); // a tablet
  assert.equal(narrow(600, 600, false), false); // at the threshold: the Tablet Layout
  assert.equal(narrow(610, 600, true), true); // narrow already: a scrollbar going doesn't flip it
  assert.equal(narrow(600 + NARROW_GIVE, 600, true), false);
});

test("0 is never narrow; no width yet keeps what it was", () => {
  assert.equal(narrow(390, 0, false), false);
  assert.equal(narrow(390, 0, true), false);
  assert.equal(narrow(0, 600, true), true);
  assert.equal(narrow(0, 600, false), false);
});

test("the threshold: the view's, else 600", () => {
  assert.equal(narrowBelow({}), 600);
  assert.equal(narrowBelow({ narrow_below: 0 }), 0);
  assert.equal(narrowBelow({ narrow_below: 900 }), 900);
  assert.equal(narrowBelow({ narrow_below: -5 }), 0);
});

test("narrow, the sections go top, main, left, right, bottom, then those with no panel", () => {
  const places = ["bottom", undefined, "right", "main", "left", "top"];
  assert.deepEqual(
    [...places].sort((a, b) => Number(narrowOrder(a)) - Number(narrowOrder(b))),
    ["top", "main", "left", "right", "bottom", undefined],
  );
});
