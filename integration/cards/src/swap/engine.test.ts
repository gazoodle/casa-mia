// The engine against the cases the app's own engine passes (tests/test_swap_cases.py runs
// this too). Plain node: `node --experimental-strip-types --test src/swap/engine.test.ts`.
import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../../../tests/swap_cases.json" with { type: "json" };
import { Rules, type SwapRule } from "./engine.ts";

for (const c of cases) {
  test(c.name, () => {
    const rules = new Rules(c.rules as SwapRule[]);
    assert.equal(rules.out(c.text), c.expect);
    assert.deepEqual(
      rules.errors.map(([i]) => i),
      (c as { errors?: number[] }).errors ?? [],
    );
  });
}
