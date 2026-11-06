// Talk's pure parts (common.ts): finding a doorbell's call sensor, and what the call says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { callSensor, callWords } from "./common.ts";
import type { Hass } from "../ha.ts";

const cameras = (camera_entities: string[]) => ({ state: "idle", attributes: { camera_entities } });
const hass = {
  states: {
    "sensor.oak_door_call": cameras(["camera.oak_door_high", "camera.oak_door_low"]),
    // holds the barn camera, but isn't a call sensor
    "sensor.barn_other": cameras(["camera.barn"]),
  },
  callService: async () => undefined,
  entities: {
    "camera.oak_door_low": { entity_id: "camera.oak_door_low", platform: "unifiprotect" },
    "sensor.oak_door_call": { entity_id: "sensor.oak_door_call", platform: "intercom_talkback", translation_key: "call" },
    "camera.barn": { entity_id: "camera.barn", platform: "unifiprotect" },
    "sensor.barn_other": { entity_id: "sensor.barn_other", platform: "intercom_talkback", translation_key: "other" },
    // a call sensor not yet in HA's states
    "sensor.gate_call": { entity_id: "sensor.gate_call", platform: "intercom_talkback", translation_key: "call" },
  },
} as unknown as Hass;

test("the call sensor whose camera_entities holds the camera", () => {
  assert.equal(callSensor(hass, "camera.oak_door_low"), "sensor.oak_door_call");
  assert.equal(callSensor(hass, "camera.oak_door_high"), "sensor.oak_door_call");
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
