// The Responsive layout against the cases the compositor's own solver passes
// (tests/test_responsive_cases.py writes them, and runs this too).
import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../../tests/responsive_cases.json" with { type: "json" };
import { DEFAULTS, EDGES, responsive, shapeOf, type Options } from "./responsive.ts";

type Case = { name: string; width: number; height: number; cameras: number; gap?: number; margin?: number; options?: Partial<Options>; main_shape?: number; scale?: number; expect: unknown };

for (const c of cases as Case[]) {
  test(c.name, () => {
    assert.deepEqual(responsive(c.width, c.height, c.gap ?? 4, c.margin ?? 0, c.cameras, c.options ?? {}, c.main_shape ?? null, c.scale ?? 1), c.expect);
  });
}

test("shapes as whole numbers, as Python reads them", () => {
  assert.deepEqual(shapeOf("16:9"), [16, 9]);
  assert.deepEqual(shapeOf(4 / 3), [1333, 1000]);
  assert.deepEqual(shapeOf(0.5625), [562, 1000]); // 562.5: halves go to the even number
});

test("the defaults are the options file's", () => {
  assert.deepEqual(DEFAULTS.edges, ["bottom", "right"]);
  assert.ok(DEFAULTS.edges.every((e) => (EDGES as string[]).includes(e)));
});
