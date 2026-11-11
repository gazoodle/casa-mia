import { test } from "node:test";
import assert from "node:assert/strict";
import { type Band, DEFAULTS, along, arcPath, arcs, columns, due, levelColour, parts, reading, scale, since, stateColor, tidy, watchPath } from "./common.ts";

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

test("the eye asks Sensor Watch's page for an entity's watch in the address", () => {
  assert.equal(watchPath("sensor.loft_tablet_battery", 5), "/sensor-watch?watch=sensor.loft_tablet_battery&at=5");
  assert.equal(watchPath("sensor.a&b", 6), "/sensor-watch?watch=sensor.a%26b&at=6");
});

test("the Status sensor's icon takes its level's colour; nothing else does", () => {
  const entities = {
    "sensor.casa_mia_sensor_watch_status": { platform: "casa_mia_sensor_watch", translation_key: "status" },
    "sensor.casa_mia_sensor_watch_warnings": { platform: "casa_mia_sensor_watch", translation_key: "warning_count" },
  };
  const status = (state: string) => ({ entity_id: "sensor.casa_mia_sensor_watch_status", state });
  assert.equal(levelColour(status("warning"), entities), "var(--warning-color, #ffa600)");
  assert.equal(levelColour(status("nominal"), entities), "var(--success-color, #43a047)");
  assert.equal(levelColour(status("unavailable"), entities), undefined); // HA's own grey
  assert.equal(levelColour({ entity_id: "sensor.casa_mia_sensor_watch_warnings", state: "2" }, entities), undefined);
  assert.equal(levelColour(status("warning"), undefined), undefined);
});

// The gauge. A mains watch: open at both ends, as most are.
const MAINS: Band[] = [
  { from: null, to: 207, level: "critical" },
  { from: 207, to: 216, level: "warning" },
  { from: 216, to: 253, level: "nominal" },
  { from: 253, to: null, level: "warning" },
];

test("the gauge's arc ends come from the bands unless the card gives them", () => {
  // Edges 207 to 253: half their span more on each side, as both end bands go on for ever.
  assert.deepEqual(scale(MAINS), [184, 276]);
  assert.deepEqual(scale(MAINS, { min: 200 }), [200, 276]);
  assert.deepEqual(scale(MAINS, { min: 190, max: 270, unit: "%" }), [190, 270]);
  // Bands with ends of their own are shown as they are.
  const closed: Band[] = [{ from: 0, to: 20, level: "warning" }, { from: 20, to: 80, level: "nominal" }];
  assert.deepEqual(scale(closed), [0, 80]);
  // A percentage is 0 to 100 whatever its bands; so is a watch with no edges at all.
  assert.deepEqual(scale([{ from: null, to: 20, level: "task" }, { from: 20, to: null, level: "nominal" }], { unit: "%" }), [0, 100]);
  assert.deepEqual(scale([{ from: null, to: null, level: "nominal" }]), [0, 100]);
  // One edge only: half of it either side (a freezer at -15: -22.5 to -7.5).
  assert.deepEqual(scale([{ from: null, to: -15, level: "nominal" }, { from: -15, to: null, level: "warning" }]), [-22.5, -7.5]);
  assert.deepEqual(scale(closed, { min: 90 }), [90, 91]); // a min over the max: still an arc
});

test("each band's part of the gauge's arc, and where the needle points", () => {
  const ends = scale(MAINS);
  assert.deepEqual(arcs(MAINS, ends), [
    { from: 0, to: 0.25, level: "critical" },
    { from: 0.25, to: (216 - 184) / 92, level: "warning" },
    { from: (216 - 184) / 92, to: 0.75, level: "nominal" },
    { from: 0.75, to: 1, level: "warning" },
  ]);
  // A band wholly off the arc is left out; one partly off is cut at the end.
  assert.deepEqual(arcs(MAINS, [210, 250]), [
    { from: 0, to: 0.15, level: "warning" },
    { from: 0.15, to: 1, level: "nominal" },
  ]);
  assert.equal(along(230, ends), 0.5);
  assert.equal(along(100, ends), 0); // off the end: it stays there
  assert.equal(along(999, ends), 1);
  // The half circle, left to right over the top.
  assert.equal(arcPath(0, 1), "M 20.0 100.0 A 80 80 0 0 1 180.0 100.0");
  assert.equal(arcPath(0, 0.5), "M 20.0 100.0 A 80 80 0 0 1 100.0 20.0");
  assert.equal(tidy(207.00000000000003), "207");
  assert.equal(tidy(-22.5), "-22.5");
});

test("the number a gauge places is the one its watch reads", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const st = { state: "212.4", attributes: { battery: 31, due: "2026-10-13T12:00:00Z" } };
  assert.equal(reading(st, {}, now), 212.4);
  assert.equal(reading(st, { attribute: "battery" }, now), 31);
  assert.equal(reading(st, { attribute: "due", days_until: true }, now), 2);
  // No number to place: no needle.
  assert.equal(reading({ state: "unavailable" }, {}, now), undefined);
  assert.equal(reading({ state: "" }, {}, now), undefined);
  assert.equal(reading(st, { attribute: "none" }, now), undefined);
  assert.equal(reading(undefined, {}, now), undefined);
});
