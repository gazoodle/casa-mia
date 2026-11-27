// A camera's controls on a full screen (app/web/src/cameras/controls.ts): their size,
// and what gives way where they don't fit.
import assert from "node:assert/strict";
import test from "node:test";
import { controlsAt, foldPresets, previewStyle, twoTaps, zoomOf, zoomPct, zoomStep } from "../../../../app/web/src/cameras/controls.ts";

test("a lock, a valve, a siren and a garage door, gate or door take two taps, unless a camera's control says otherwise", () => {
  for (const entity of ["lock.front", "valve.mains", "siren.yard"]) assert.equal(twoTaps({ entity }), true, entity);
  for (const kind of ["garage", "gate", "door"]) assert.equal(twoTaps({ entity: "cover.c" }, kind), true, kind);
  assert.equal(twoTaps({ entity: "cover.blind" }, "blind"), false);
  assert.equal(twoTaps({ entity: "cover.blind" }), false);
  assert.equal(twoTaps({ entity: "switch.gate" }), false);
  // set on the Cameras page: either way
  assert.equal(twoTaps({ entity: "switch.gate", confirm: true }), true);
  assert.equal(twoTaps({ entity: "lock.front", confirm: false }), false);
});

test("controls have no size of their own, and go down the right from the top unless a camera says otherwise", () => {
  assert.deepEqual(controlsAt(), { landscape: "right", portrait: "right", align: "start", opacity: 45 });
  // a size saved before: dropped; a background kept
  assert.deepEqual(controlsAt({ size: 72, opacity: 30, landscape: "bottom" } as never), { landscape: "bottom", portrait: "right", align: "start", opacity: 30 });
});

test("the Cameras page previews the style guide's chip at its screen's scale", () => {
  const look = previewStyle(controlsAt(), 0.5);
  assert.equal(look["--cm-chip-height"], "11px");
  assert.equal(look["--cm-chip-font"], "5px");
  assert.equal(look["--cm-chip-end"], "11px");
  assert.equal(previewStyle(controlsAt({ align: "end" }), 1)["--cm-chip-align"], "flex-end");
  assert.equal(previewStyle(controlsAt({ opacity: 30 }), 1)["--cm-chip-alpha"], "30%");
});

test("only the presets give way, behind PTZ: the chips always keep their names", () => {
  const names = ["Full", "Sound off", "Gate light", "Gate"];
  const three = ["Gate", "Drive", "Door"];
  // a tablet's full screen: all of it; more than three presets never stand inline
  assert.equal(foldPresets([1280, 800], "top", names, three), false);
  assert.equal(foldPresets([1280, 800], "top", names, [...three, "Lawn"]), true);
  // a phone's main area: seven chips don't fit along its top, nor down its side
  assert.equal(foldPresets([376, 205], "top", names, three), true);
  assert.equal(foldPresets([376, 205], "right", names, three), true);
  // down a tablet's side they do
  assert.equal(foldPresets([905, 550], "right", names, three), false);
  // no presets: nothing to fold
  assert.equal(foldPresets([100, 100], "top", names, []), false);
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
