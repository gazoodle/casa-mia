import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, FILES, OPTIONS, back, corner, family, footOf, keepPosition, labelsOf, nameSize, nudge } from "./labels.ts";

test("every setting has a default, and a commander saved without labels gets them", () => {
  assert.deepEqual(Object.keys(DEFAULTS), Object.keys(OPTIONS));
  assert.deepEqual(labelsOf(undefined), DEFAULTS);
  assert.equal(labelsOf({ tile_share: 20 }).tile_share, 20);
  assert.equal(labelsOf({ tile_share: 20 }).main_share, DEFAULTS.main_share);
});

test("a name is a share of its place, between a floor and a cap (as labels.py: name_px)", () => {
  assert.equal(nameSize("tile", 11, 144), 16);
  assert.equal(nameSize("main", 4, 500), 20);
  assert.equal(nameSize("tile", 11, 180), 20); // a larger tile, a larger name
  assert.equal(nameSize("tile", 11, 60), 11); // a phone's tile: the least that can be read
  assert.equal(nameSize("tile", 11, 5000), 22);
  assert.equal(nameSize("main", 4, 200), 13);
  assert.equal(nameSize("main", 4, 5000), 30);
  assert.equal(nameSize("tile", 11, 60, 2), 22); // in the picture's own pixels
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
  const pill = labelsOf({ main_style: "pill" });
  assert.equal(footOf(pill, "bottom-right", 20), 10); // beside the pill, as they always were
  assert.equal(footOf(pill, "bottom-left", 20), 44); // over it
  assert.equal(footOf(pill, "bottom-left", 10), 32); // a smaller name, less to clear
  assert.equal(footOf(labelsOf({ main_style: "bar" }), "bottom-right", 20), 44);
  assert.equal(footOf(labelsOf({ main_style: "none" }), "bottom-left", 20), 10);
});

test("a nudge moves a group across and down from its corner, and is nothing at first", () => {
  assert.deepEqual(nudge(DEFAULTS, "talk_status"), { transform: "translate(0px, 0px)" });
  assert.deepEqual(nudge(labelsOf({ talk_buttons_x: -12, talk_buttons_y: 30 }), "talk_buttons"), { transform: "translate(-12px, 30px)" });
});

test("a cropped main camera is cropped about the part to keep", () => {
  assert.equal(keepPosition(undefined), "50% 50%");
  assert.equal(keepPosition("top-left"), "0% 0%");
  assert.equal(keepPosition("bottom"), "50% 100%");
  assert.equal(keepPosition("right"), "100% 50%");
});
