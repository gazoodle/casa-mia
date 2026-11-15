import assert from "node:assert/strict";
import { test } from "node:test";
import { cornered } from "./shell.ts";

test("the page's corner is its top right, and no more", () => {
  // A page 1000 wide whose top is at 0.
  assert.equal(cornered(990, 10, 1000, 0), true);
  assert.equal(cornered(881, 119, 1000, 0), true);
  assert.equal(cornered(880, 10, 1000, 0), false);
  assert.equal(cornered(990, 120, 1000, 0), false);
  assert.equal(cornered(10, 10, 1000, 0), false);
  // Beside a sidebar the page ends where it ends, not where the window does.
  assert.equal(cornered(1010, 10, 1000, 0), false);
});
