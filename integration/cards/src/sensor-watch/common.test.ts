import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, appPanel, columns, due, levelColour, openNote, parts, since, stateColor } from "./common.ts";

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

test("the eye finds the app's panel and leaves its page a note", () => {
  const panels = {
    lovelace: { url_path: "lovelace", config: { mode: "storage" } },
    other: { url_path: "abc_casa_mia_extra", config: { addon: "abc_casa_mia_extra" } },
    mine: { url_path: "5c53de3b_casa_mia", config: { addon: "5c53de3b_casa_mia" } },
  };
  assert.equal(appPanel(panels)?.url_path, "5c53de3b_casa_mia");
  assert.equal(appPanel({ l: { url_path: "local_casa_mia", config: { addon: "local_casa_mia" } } })?.url_path, "local_casa_mia");
  assert.equal(appPanel({ lovelace: panels.lovelace }), undefined);
  assert.equal(appPanel(undefined), undefined);
  assert.deepEqual(JSON.parse(openNote("sensor.loft_tablet_battery", 5)), { hash: "#/sensor-watch?watch=sensor.loft_tablet_battery&at=5", at: 5 });
});

test("the Status sensor's icon takes its level's colour; nothing else does", () => {
  const entities = {
    "sensor.casa_mia_sensor_watch_status": { platform: "casa_mia", translation_key: "sensor_watch_status" },
    "sensor.casa_mia_sensor_watch_warnings": { platform: "casa_mia", translation_key: "sensor_watch_warning_count" },
  };
  const status = (state: string) => ({ entity_id: "sensor.casa_mia_sensor_watch_status", state });
  assert.equal(levelColour(status("warning"), entities), "var(--warning-color, #ffa600)");
  assert.equal(levelColour(status("nominal"), entities), "var(--success-color, #43a047)");
  assert.equal(levelColour(status("unavailable"), entities), undefined); // HA's own grey
  assert.equal(levelColour({ entity_id: "sensor.casa_mia_sensor_watch_warnings", state: "2" }, entities), undefined);
  assert.equal(levelColour(status("warning"), undefined), undefined);
});
