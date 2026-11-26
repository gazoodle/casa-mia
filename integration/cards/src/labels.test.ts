import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, FILES, OPTIONS, back, corner, family, footOf, keepPosition, labelsOf, nameSize, nudge } from "./labels.ts";

test("every setting has a default, and a commander saved without labels gets them", () => {
  assert.deepEqual(Object.keys(DEFAULTS), Object.keys(OPTIONS));
  assert.deepEqual(labelsOf(undefined), DEFAULTS);
  assert.equal(labelsOf({ tile_scale: 120 }).tile_scale, 120);
  assert.equal(labelsOf({ tile_scale: 120 }).main_scale, DEFAULTS.main_scale);
});

test("a name grows slowly with its place, with no floor or cap (as labels.py: name_px)", () => {
  // the owner's devices (2026-11-26), as labels.py's test has them: the tiles' names from
  // the smallest tile (a phone's, a small wall tablet's, a large commander's)
  assert.deepEqual([50, 59, 144, 178].map((side) => nameSize("tile", 100, side)), [11, 11, 16, 18]);
  // the main camera's by touch: a phone, a small wall tablet, a large one, its full screen
  assert.deepEqual([205, 550, 616, 1171, 1506].map((side) => nameSize("main", 100, side)), [12, 16, 16, 20, 21]);
  // with a mouse: a little smaller, and growing more slowly (a small card to a full screen)
  assert.deepEqual([455, 1066, 1800].map((side) => nameSize("main", 100, side, 1, true)), [13, 15, 16]);
  assert.equal(nameSize("main", 50, 206), 6); // % of the size worked out
  assert.equal(nameSize("tile", 200, 144), 32);
  assert.equal(nameSize("main", 100, 412, 2), 24); // a phone's, in pixels twice as fine
  assert.equal(nameSize("tile", 100, 120, 2), 23);
  assert.equal(nameSize("main", 100, 5000), 29); // a very large place: only a little more
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
