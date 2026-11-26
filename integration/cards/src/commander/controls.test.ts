// A camera's controls on a full screen (app/web/src/cameras/controls.ts): their size,
// and what gives way where they don't fit.
import assert from "node:assert/strict";
import test from "node:test";
import { barFit, controlsAt, controlsStyle, pillHeight, zoomOf, zoomPct, zoomStep } from "../../../../app/web/src/cameras/controls.ts";

test("a size is a height in px; one saved as a share or by name is the height it was on a tablet", () => {
  assert.equal(controlsAt().size, 44);
  assert.equal(controlsAt({ size: 40 }).size, 40);
  assert.equal(controlsAt({ size: 5 }).size, 40); // 5% of a tablet's 800 (2026.11.14-b8)
  assert.equal(controlsAt({ size: 7 }).size, 56);
  assert.deepEqual(["small", "medium", "large"].map((size) => controlsAt({ size }).size), [40, 56, 72]);
  assert.equal(controlsAt({ size: "huge" }).size, 44); // not a size there ever was
  assert.equal(controlsAt({ size: 96 }).size, 72); // held to the slider's range
  assert.equal(controlsAt({ size: 24 }).size, 32);
});

test("a pill is its size where there is room, smaller in a small place, never under the floor", () => {
  const at = controlsAt({ size: 40 });
  assert.equal(pillHeight(at, [1280, 800]), 40); // a tablet's full screen
  assert.equal(pillHeight(at, [800, 1280]), 40); // either way up
  assert.equal(Math.round(pillHeight(at, [850, 530])), 35); // its main area
  assert.equal(pillHeight(at, [390, 220]), 32); // a phone's main area: the floor
  assert.equal(pillHeight(at, [2560, 1400]), 40); // a very large place: never more
  assert.equal(pillHeight(controlsAt({ size: 72 }), [390, 220]), 32);
});

test("with a mouse a pill is never finger-sized, however large the place", () => {
  assert.equal(pillHeight(controlsAt({ size: 40 }), [2560, 1400], true), 34);
  assert.equal(pillHeight(controlsAt({ size: 72 }), [2560, 1400], true), 34);
  assert.equal(pillHeight(controlsAt({ size: 32 }), [2560, 1400], true), 32);
  assert.equal(pillHeight(controlsAt({ size: 40 }), [390, 220], true), 32);
});

test("a pill is the style guide's chip at its height: 22 px high has 10 px text and ends", () => {
  const look = controlsStyle(controlsAt(), 22);
  assert.equal(look["--cm-pill-height"], "22px");
  assert.equal(look["--cm-pill-font"], "10px");
  assert.equal(look["--cm-pill-pad"], "10px");
  assert.equal(look["--cm-pill-gap"], "4px");
  assert.equal(controlsStyle(controlsAt(), 80, 0.5)["--cm-pill-font"], "18.18px");
});

test("what doesn't fit gives way: the presets behind PTZ, then the names", () => {
  const names = ["Sound off", "Gate light", "Gate"];
  const three = ["Gate", "Drive", "Door"];
  const small = controlsAt({ size: 40 });
  const large = controlsAt({ size: 56 });
  // room for all of it: three presets stand in the bar, four never do
  assert.deepEqual(barFit(small, [1280, 800], "bottom", names, three), { height: 40, names: true, fold: false });
  assert.equal(barFit(small, [1280, 800], "bottom", names, [...three, "Lawn"]).fold, true);
  // a narrower place, or larger pills: the presets fold first, the names stay
  assert.deepEqual(barFit(small, [700, 800], "bottom", names, three), { height: 40, names: true, fold: true });
  assert.deepEqual(barFit(large, [1280, 800], "bottom", names, three), { height: 56, names: true, fold: true });
  // a phone's main area: the pills stay at the floor, so the names go
  assert.deepEqual(barFit(small, [390, 220], "bottom", names, three), { height: 32, names: false, fold: true });
  // down a side: names only while the bar is no more than its share of the width
  assert.equal(barFit(small, [1280, 800], "right", names, []).names, true);
  assert.equal(barFit(small, [500, 800], "right", names, []).names, false);
  // nothing to show fits anywhere
  assert.deepEqual(barFit(small, [100, 100], "top", [], []), { height: 32, names: true, fold: false });
});

test("a zoom steps a tenth of its range a tap, in whole steps of its entity, within its range", () => {
  const z = zoomOf("40", { min: 0, max: 100, step: 1 })!;
  assert.equal(z.step, 10);
  assert.equal(zoomStep(z, 40, 1), 50);
  assert.equal(zoomStep(z, 95, 1), 100);
  assert.equal(zoomStep(z, 5, -1), 0);
  assert.equal(zoomPct(z, 40), 40);
  // a range that isn't 0 to 100, with a fine step: the level is a share of the range
  const fine = zoomOf("2.5", { min: 1, max: 5, step: 0.1 })!;
  assert.equal(zoomStep(fine, 2.5, 1), 2.9);
  assert.equal(zoomPct(fine, 3), 50);
  // an entity whose own step is larger than a tenth keeps its own
  assert.equal(zoomOf("1", { min: 0, max: 4, step: 1 })!.step, 1);
});

test("a zoom with no level now, or no range, is none: its button says so", () => {
  assert.equal(zoomOf("unavailable", { min: 0, max: 100 }), null);
  assert.equal(zoomOf("", { min: 0, max: 100 }), null);
  assert.equal(zoomOf("3", { min: 5, max: 5 }), null);
  assert.equal(zoomOf("30", {})!.max, 100); // a number's own defaults
});
