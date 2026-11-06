// Talk's pure parts (common.ts): finding a doorbell's call sensor, and what the call says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { callSensor, callWords, countdown, talkOffered } from "./common.ts";
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

test("Talk offered once the live session starts, before it plays", () => {
  const ask = { sensor: "sensor.oak_door_call", live: "camera.oak_door_low", talking: "", secure: true, editing: false };
  assert.equal(talkOffered(ask), true); // liveOn set, no frame played yet
  assert.equal(talkOffered({ ...ask, live: "" }), false); // no session, or it failed
  assert.equal(talkOffered({ ...ask, live: "", talking: "camera.oak_door_low" }), true);
  assert.equal(talkOffered({ ...ask, sensor: undefined }), false);
  assert.equal(talkOffered({ ...ask, secure: false }), false);
  assert.equal(talkOffered({ ...ask, editing: true }), false);
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

test("the countdown to HA ending the call, the same on every device", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const answered = (attributes: Record<string, unknown>) => ({ state: "answered", attributes });
  assert.deepEqual(countdown(answered({ ends_at: "2026-11-06T12:01:42+00:00" }), now), { text: "Hangs up in 1:42", warn: false });
  assert.deepEqual(countdown(answered({ ends_at: "2026-11-06T12:00:30+00:00" }), now), { text: "Hangs up in 0:30", warn: true });
  assert.deepEqual(countdown(answered({ ends_at: "2026-11-06T12:00:00.400+00:00" }), now), { text: "Hangs up in 0:01", warn: true });
  assert.deepEqual(countdown(answered({ ends_at: "2026-11-06T11:59:00+00:00" }), now), { text: "Hangs up in 0:00", warn: true });
  assert.deepEqual(countdown(answered({ ends_at: null, held: true }), now), { text: "Held", warn: false });
  // a hold past its cap: the timer runs again, and the countdown shows
  assert.deepEqual(countdown(answered({ ends_at: "2026-11-06T12:02:00+00:00", held: true }), now), { text: "Hangs up in 2:00", warn: false });
  assert.equal(countdown(answered({ answered_by: "Hall tablet" }), now), null); // an integration without the timer
  assert.equal(countdown({ state: "ringing", attributes: { ends_at: "2026-11-06T12:01:00+00:00" } }, now), null);
  assert.equal(countdown(undefined, now), null);
});
