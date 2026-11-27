// The Camera Commander card's own styles (styles.ts). They import lit, so this runs in the
// Frontend job (npm test), not in the Python job's run of the layout tests, which has no
// npm ci (tests/test_layout_cases.py).
import assert from "node:assert/strict";
import test from "node:test";
import { styles } from "./styles.ts";

// Home Assistant's ha-card animates every property ("transition: all 0.3s ease-out"), so
// a height the sizing rule (ha.ts: heightFor) sets was grown into over 0.3 s, with a
// picture asked for on the way.
test("the commander's height is set at once, never animated by ha-card's transition", () => {
  const rules = styles.map((s) => s.cssText).join("\n");
  assert.match(rules, /\n\s*ha-card \{[^}]*transition: none;/);
});
