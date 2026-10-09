// Which tiles show a motion dot, and for how long (motion.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Motion } from "./motion.ts";

const at = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000).toISOString();
const hass = (states: Record<string, [string, number]>) => ({
  states: Object.fromEntries(Object.entries(states).map(([id, [state, ago]]) => [id, { state, attributes: {}, last_changed: at(ago) }])),
  callService: async () => undefined,
});
const sensors = { "camera.drive": "binary_sensor.drive_motion", "camera.gate": "binary_sensor.gate_motion" };
const config = { type: "custom:casa-mia-commander", motion_linger: 10 };

test("a dot while the sensor is on, and lingering after", () => {
  const m = new Motion();
  let woken = 0;
  let seen = m.seen(hass({ "binary_sensor.drive_motion": ["on", 3], "binary_sensor.gate_motion": ["off", 60] }), sensors, config, () => woken++);
  assert.deepEqual([...seen.keys()], ["camera.drive"]); // the gate's ended long ago
  assert.equal(seen.get("camera.drive")!.until, undefined);
  const began = seen.get("camera.drive")!.since;
  // it stops: still shown for the linger, saying when it began and ended
  seen = m.seen(hass({ "binary_sensor.drive_motion": ["off", 2], "binary_sensor.gate_motion": ["off", 60] }), sensors, config, () => woken++);
  assert.equal(seen.get("camera.drive")!.since, began);
  assert.ok(seen.get("camera.drive")!.until! > began!);
  m.stop();
  // past the linger, or with the dot off: none
  assert.equal(m.seen(hass({ "binary_sensor.drive_motion": ["off", 11] }), sensors, config, () => woken++).size, 0);
  assert.equal(m.seen(hass({ "binary_sensor.drive_motion": ["on", 1] }), sensors, { ...config, motion_dot: false }, () => woken++).size, 0);
  assert.equal(woken, 0);
});
