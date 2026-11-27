import assert from "node:assert/strict";
import test from "node:test";
import { actionOf, isOn, nameOf } from "./common.ts";

test("a tap toggles what can be toggled, opens the rest, and does as set", () => {
  assert.deepEqual(actionOf({ entity: "light.porch" }), { action: "toggle" });
  assert.deepEqual(actionOf({ entity: "cover.front_gate" }), { action: "toggle" });
  assert.deepEqual(actionOf({ entity: "lock.front_door" }), { action: "more-info" });
  assert.deepEqual(actionOf({ entity: "sensor.rain" }), { action: "more-info" });
  assert.deepEqual(actionOf({}), { action: "none" });
  const go = { action: "navigate", navigation_path: "/lovelace/home" };
  assert.deepEqual(actionOf({ entity: "light.porch", tap_action: go }), go);
});

test("on, open and unlocked light a button; off, closed and unknown don't", () => {
  for (const s of ["on", "open", "unlocked", "playing"]) assert.equal(isOn({ state: s, attributes: {} }), true, s);
  for (const s of ["off", "closed", "locked", "unavailable"]) assert.equal(isOn({ state: s, attributes: {} }), false, s);
  assert.equal(isOn(undefined), false);
});

test("its name: as set, else the entity's own, else its id, else none", () => {
  const hass = { states: { "light.porch": { state: "on", attributes: { friendly_name: "Porch" } } }, callService: async () => undefined };
  assert.equal(nameOf({ entity: "light.porch", name: "Lamp" }, hass), "Lamp");
  assert.equal(nameOf({ entity: "light.porch" }, hass), "Porch");
  assert.equal(nameOf({ entity: "light.gone" }, hass), "light.gone");
  assert.equal(nameOf({ icon: "mdi:home" }, hass), "");
});
