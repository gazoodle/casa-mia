// The engine against the cases the compositor's own engine passes (tests/test_layout_cases.py
// runs this too). Plain node: `node --experimental-strip-types --test src/layout.test.ts`.
import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../../tests/layout_cases.json" with { type: "json" };
import { layout, pyRound, type Settings } from "./layout.ts";

for (const c of cases) {
  test(c.name, () => {
    const [size, main, tiles] = layout(c.cmd as unknown as Settings, c.main_camera);
    assert.deepEqual({ size, main, tiles }, c.expect);
  });
}

test("rounds as Python does", () => {
  assert.deepEqual([0.5, 1.5, 2.5, -0.5, 2.4, 2.6].map(pyRound), [0, 2, 2, 0, 2, 3]);
});
