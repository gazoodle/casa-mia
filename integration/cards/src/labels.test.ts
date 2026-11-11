import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, FILES, OPTIONS, back, corner, family, footOf, labelsOf } from "./labels.ts";

test("every setting has a default, and a commander saved without labels gets them", () => {
  assert.deepEqual(Object.keys(DEFAULTS), Object.keys(OPTIONS));
  assert.deepEqual(labelsOf(undefined), DEFAULTS);
  assert.equal(labelsOf({ tile_size: 30 }).tile_size, 30);
  assert.equal(labelsOf({ tile_size: 30 }).main_size, DEFAULTS.main_size);
});

test("every font offered but the standard one has a file", () => {
  const offered = OPTIONS.font.options.map(([v]) => v).filter((v) => v !== "standard");
  assert.deepEqual(offered.sort(), Object.keys(FILES).sort());
});

test("the standard font is the browser's own; another is its own family", () => {
  assert.equal(family("standard"), "sans-serif");
  assert.equal(family("mono"), '"Casa Mia mono", sans-serif');
});

test("the background is the tint at its opacity", () => {
  assert.equal(back(labelsOf({ tint: "#ff8000", opacity: 25 })), "rgb(255 128 0 / 0.25)");
});

test("a corner is a top or a foot, and a side or the middle", () => {
  assert.deepEqual(corner("top-left"), { top: "10px", left: "10px", alignItems: "flex-start", "--cm-just": "flex-start" });
  assert.deepEqual(corner("bottom-right", 44), { bottom: "44px", right: "10px", alignItems: "flex-end", "--cm-just": "flex-end" });
  assert.equal(corner("top-centre").transform, "translateX(-50%)");
});

test("chips at the foot sit clear of the main camera's name", () => {
  const pill = labelsOf({ main_style: "pill", main_size: 20 });
  assert.equal(footOf(pill, "bottom-right"), 10); // beside the pill, as they always were
  assert.equal(footOf(pill, "bottom-left"), 44); // over it
  assert.equal(footOf(labelsOf({ main_style: "bar", main_size: 20 }), "bottom-right"), 44);
  assert.equal(footOf(labelsOf({ main_style: "none" }), "bottom-left"), 10);
});
