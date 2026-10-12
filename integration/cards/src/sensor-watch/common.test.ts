import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, columns, due, parts, since, stateColor } from "./common.ts";

test("how long a level has stood", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  assert.equal(since("2026-10-11T11:59:30Z", now), "now");
  assert.equal(since("2026-10-11T11:56:00Z", now), "4 min");
  assert.equal(since("2026-10-11T09:00:00Z", now), "3 h");
  assert.equal(since("2026-10-09T12:00:00Z", now), "2 d");
  assert.equal(since("2026-10-11T12:05:00Z", now), "now"); // a clock a little ahead
});

test("a row's columns follow what it shows, in its order", () => {
  assert.equal(columns(DEFAULTS.show), "72px minmax(0, 1fr) auto auto");
  assert.equal(columns(["icon", "name", "value", "level", "message"]), "24px minmax(0, 1fr) auto 72px");
  assert.deepEqual(parts(["since", "message", "icon", "name"]), ["since", "what", "icon"]);
  assert.equal(columns(["message", "value"]), "minmax(0, 1fr) auto"); // the name and message share one
  assert.equal(columns(["level", "since"]), "72px auto");
});

test("a due date reads as a day, or the days left", () => {
  assert.match(due("2026-10-25T00:00:00+00:00", "12.5"), /25/);
  assert.equal(due(undefined, "1.5"), "1.5 days");
  assert.equal(due("unavailable", null), "");
});

test("a state's colour falls back from device class to domain to active or not", () => {
  assert.equal(
    stateColor("binary_sensor.door", "on", "door"),
    "var(--state-binary_sensor-door-on-color, var(--state-binary_sensor-on-color, var(--state-binary_sensor-active-color, var(--state-icon-color))))",
  );
  assert.equal(stateColor("light.lamp", "off"), "var(--state-light-off-color, var(--state-light-inactive-color, var(--state-inactive-color)))");
});
