// A camera's controls on a full screen (app/web/src/cameras/controls.ts): their size,
// and what gives way where they don't fit.
import assert from "node:assert/strict";
import test from "node:test";
import { barFit, controlsAt, controlsStyle, zoomOf, zoomPct, zoomStep } from "../../../../app/web/src/cameras/controls.ts";

test("controls have no size of their own, and sit top right unless a camera says otherwise", () => {
  assert.deepEqual(controlsAt(), { landscape: "top", portrait: "top", align: "end", opacity: 60 });
  assert.equal("size" in controlsAt({ size: 72 } as never), false); // a size saved before: dropped
  assert.equal(controlsAt({ landscape: "bottom" }).landscape, "bottom");
});

test("a pill is the main camera's name pill at the name's size", () => {
  const look = controlsStyle(controlsAt(), 20);
  assert.equal(look["--cm-pill-height"], "28px");
  assert.equal(look["--cm-pill-font"], "20px");
  assert.equal(look["--cm-pill-pad"], "10px");
  assert.equal(controlsStyle(controlsAt(), 20, 0.5)["--cm-pill-font"], "10px");
});

test("what doesn't fit gives way: the presets behind PTZ, then the names", () => {
  const names = ["Sound off", "Gate light", "Gate"];
  const three = ["Gate", "Drive", "Door"];
  // a tablet's full screen (a name of 25 px): all of it, and four presets never stand inline
  assert.deepEqual(barFit(25, [1280, 800], "top", names, three), { height: 35, names: true, fold: false });
  assert.equal(barFit(25, [1280, 800], "top", names, [...three, "Lawn"]).fold, true);
  // a narrower place: the presets fold first, the names stay
  assert.deepEqual(barFit(20, [700, 550], "top", names, three), { height: 28, names: true, fold: true });
  // a phone's main area (13 px): the names fit; a narrower one still, icons alone
  assert.equal(barFit(13, [378, 206], "top", names, three).names, true);
  assert.equal(barFit(22, [250, 300], "top", names, three).names, false);
  // down a side: names only while the bar is no more than its share of the width
  assert.equal(barFit(25, [1280, 800], "right", names, []).names, true);
  assert.equal(barFit(25, [500, 800], "right", names, []).names, false);
  // nothing to show fits anywhere
  assert.deepEqual(barFit(10, [100, 100], "top", [], []), { height: 14, names: true, fold: false });
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
