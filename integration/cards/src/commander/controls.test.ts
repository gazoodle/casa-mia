// A camera's controls on a full screen (app/web/src/cameras/controls.ts): their size,
// and what gives way where they don't fit.
import assert from "node:assert/strict";
import test from "node:test";
import { barFit, controlsAt, controlsStyle, pillHeight } from "../../../../app/web/src/cameras/controls.ts";

test("a size is a share of its place; one saved in px or by name is the share it was on a tablet", () => {
  assert.equal(controlsAt().size, 7);
  assert.equal(controlsAt({ size: 5 }).size, 5);
  assert.equal(controlsAt({ size: 40 }).size, 5); // 40 px of a tablet's 800
  assert.equal(controlsAt({ size: 56 }).size, 7);
  assert.deepEqual(["small", "medium", "large"].map((size) => controlsAt({ size }).size), [5, 7, 9]);
  assert.equal(controlsAt({ size: "huge" }).size, 7); // not a size there ever was
  assert.equal(controlsAt({ size: 96 }).size, 12); // held to the slider's range
});

test("a pill's height follows its place, between a floor and a cap", () => {
  const at = controlsAt({ size: 5 });
  assert.equal(pillHeight(at, [1280, 800]), 40); // a tablet's full screen
  assert.equal(pillHeight(at, [800, 1280]), 40); // either way up
  assert.equal(pillHeight(at, [850, 530]), 26.5); // its main area
  assert.equal(pillHeight(at, [390, 160]), 10); // the floor
  assert.equal(pillHeight(controlsAt({ size: 12 }), [3840, 2160]), 96); // the cap
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
  const small = controlsAt({ size: 5 });
  const large = controlsAt({ size: 7 });
  // room for all of it: three presets stand in the bar, four never do
  assert.deepEqual(barFit(small, [1280, 800], "bottom", names, three), { height: 40, names: true, fold: false });
  assert.equal(barFit(small, [1280, 800], "bottom", names, [...three, "Lawn"]).fold, true);
  // a narrower place, or larger pills: the presets fold first, the names stay
  assert.deepEqual(barFit(small, [700, 800], "bottom", names, three), { height: 35, names: true, fold: true });
  assert.deepEqual(barFit(large, [1280, 800], "bottom", names, three), { height: 56, names: true, fold: true });
  // no room for the names either: icons alone
  assert.deepEqual(barFit(large, [800, 1280], "bottom", names, three), { height: 56, names: false, fold: true });
  // down a side: names only while the bar is no more than its share of the width
  assert.equal(barFit(small, [1280, 800], "right", names, []).names, true);
  assert.equal(barFit(large, [500, 800], "right", names, []).names, false);
  // nothing to show fits anywhere
  assert.deepEqual(barFit(small, [100, 100], "top", [], []), { height: 10, names: true, fold: false });
});
