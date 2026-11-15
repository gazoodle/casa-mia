import assert from "node:assert/strict";
import { test } from "node:test";
import { panel } from "./kit.ts";

test("a display has the same cells whatever it shows", () => {
  // A thermostat from 7 to 35 degrees: two figures, a point and a decimal place.
  assert.equal(panel("21.5", "°", [7, 35]), "21.5°");
  assert.equal(panel("21", "°", [7, 35]), "21.0°");
  assert.equal(panel("7", "°", [7, 35]), " 7.0°");
  // Off, it is dark, and as wide.
  assert.equal(panel("", "°", [7, 35]), "  . °");
  // A scale that goes below nothing has a place for the minus.
  assert.equal(panel("-5", "°", [-10, 30]), " -5.0°");
  assert.equal(panel("30", "°", [-10, 30]), " 30.0°");
  // Per cent has no decimal place, and room for a hundred.
  assert.equal(panel("45", "%", [0, 100]), " 45%");
  assert.equal(panel("100", "%", [0, 100]), "100%");
});
