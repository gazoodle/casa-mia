import assert from "node:assert/strict";
import { test } from "node:test";
import { WHOLE, zoomed } from "./zoom.ts";

test("a photograph zooms about the fingers, and never leaves a gap in its box", () => {
  // A box 400 by 300. Zooming twice about a point 100 right of the middle keeps that
  // point of the picture where it was: it moves 100 left to make up for doubling.
  const near = zoomed(WHOLE, 2, 100, 0, 0, 0, 400, 300, 6);
  assert.deepEqual(near, { s: 2, x: -100, y: 0 });

  // A drag moves it, as far as its edge and no further.
  assert.deepEqual(zoomed(near, 1, 0, 0, 40, -20, 400, 300, 6), { s: 2, x: -60, y: -20 });
  assert.deepEqual(zoomed(near, 1, 0, 0, -900, 900, 400, 300, 6), { s: 2, x: -200, y: 150 });

  // It can't be made smaller than its box, and the whole picture sits in the middle.
  assert.deepEqual(zoomed(near, 0.1, 150, 90, 0, 0, 400, 300, 6), WHOLE);
  assert.equal(zoomed(WHOLE, 100, 0, 0, 0, 0, 400, 300, 6).s, 6);
});

test("a picture narrower than its box is held by its own edges, not the box's", () => {
  // A picture 400 by 100 in a box 400 by 300 (a wide camera on an upright screen), enlarged
  // twice: 200 high, still inside the box's 300, so it can't be moved up or down at all,
  // and 800 wide, so it can be moved 200 either way.
  const near = zoomed(WHOLE, 2, 0, 0, 0, 0, 400, 300, 6, 400, 100);
  assert.deepEqual(near, { s: 2, x: 0, y: 0 });
  assert.deepEqual(zoomed(near, 1, 0, 0, 900, 900, 400, 300, 6, 400, 100), { s: 2, x: 200, y: 0 });
  assert.deepEqual(zoomed(near, 1, 0, 0, -900, -900, 400, 300, 6, 400, 100), { s: 2, x: -200, y: 0 });
});
