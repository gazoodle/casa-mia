import assert from "node:assert/strict";
import { test } from "node:test";
import { sampled } from "./recorder.ts";

test("a column shows how the device stood at its middle, and nothing where it was not answering", () => {
  // Off for the first quarter of the day, then half way up to three quarters; then not answering.
  const runs: [number, number][][] = [[[0, 0], [0.25, 0], [0.25, 0.5], [0.75, 0.5]]];
  assert.deepEqual(sampled(runs, 4), [0, 0.5, 0.5, undefined]);
  // A change inside a column counts for it only if it covers the column's middle.
  assert.deepEqual(sampled([[[0.1, 1], [0.2, 1]]], 4), [1, undefined, undefined, undefined]);
  assert.deepEqual(sampled([[[0.13, 1], [0.2, 1]]], 4), [undefined, undefined, undefined, undefined]);
  // A second run starts again after a gap.
  assert.deepEqual(sampled([[[0, 1], [0.25, 1]], [[0.5, 0.2], [1, 0.2]]], 4), [1, undefined, 0.2, 0.2]);
});
