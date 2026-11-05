// Talk's pure parts (common.ts): finding a doorbell's call sensor, and what the call says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { callSensor, callWords } from "./common.ts";
import type { Hass } from "../ha.ts";

const hass = {
  states: {},
  callService: async () => undefined,
  entities: {
    "camera.oak_door_high": { entity_id: "camera.oak_door_high", device_id: "d1", platform: "unifiprotect" },
    "camera.oak_door_low": { entity_id: "camera.oak_door_low", device_id: "d1", platform: "unifiprotect" },
    "sensor.oak_door_battery": { entity_id: "sensor.oak_door_battery", device_id: "d1", platform: "unifiprotect" },
    "sensor.oak_door_call": { entity_id: "sensor.oak_door_call", device_id: "d1", platform: "intercom_talkback", translation_key: "call" },
    "camera.barn": { entity_id: "camera.barn", device_id: "d2", platform: "unifiprotect" },
    "sensor.barn_other": { entity_id: "sensor.barn_other", device_id: "d2", platform: "intercom_talkback", translation_key: "other" },
  },
} as unknown as Hass;

test("the call sensor on the camera's own device, by platform and translation key", () => {
  assert.equal(callSensor(hass, "camera.oak_door_low"), "sensor.oak_door_call");
  assert.equal(callSensor(hass, "camera.barn"), undefined);
  assert.equal(callSensor(hass, "camera.unknown"), undefined);
  assert.equal(callSensor({ states: {} } as unknown as Hass, "camera.oak_door_low"), undefined);
});

test("the call's words, the same on every device", () => {
  const st = (state: string, attributes = {}) => ({ state, attributes });
  assert.equal(callWords(st("ringing")), "Ringing");
  assert.equal(callWords(st("answered", { answered_by: "Hall tablet" })), "Answered by Hall tablet");
  assert.equal(callWords(st("complete", { outcome: "missed" })), "Missed");
  assert.equal(callWords(st("complete", { outcome: "ended" })), "");
  assert.equal(callWords(st("idle")), "");
  assert.equal(callWords(undefined), "");
});
