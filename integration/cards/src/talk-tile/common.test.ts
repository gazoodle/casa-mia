// The Talk tile's rules (common.ts): what it says for each call, the tile config it gives
// HA's tile card, and the config the editor saves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleaned, talkLook, tileConfig, type Config } from "./common.ts";

const st = (state: string, attributes: Record<string, unknown> = {}) => ({ state, attributes });
const ME = "Hall tablet";

test("each call's look, by this tablet's user", () => {
  assert.deepEqual(talkLook(st("answered", { answered_by: ME }), ME), { look: "hang_up", name: "Hang up" });
  assert.deepEqual(talkLook(st("answered", { answered_by: "Den tablet" }), ME), { look: "answered_elsewhere", name: "Answered by Den tablet" });
  assert.deepEqual(talkLook(st("ringing"), ME), { look: "ringing", name: null });
  assert.deepEqual(talkLook(st("idle"), ME), { look: "talk", name: null });
  assert.deepEqual(talkLook(st("complete", { outcome: "missed" }), ME), { look: "talk", name: null });
});

test("unavailable, or no sensor at all: Talk", () => {
  assert.deepEqual(talkLook(st("unavailable"), ME), { look: "talk", name: null });
  assert.deepEqual(talkLook(undefined, ME), { look: "talk", name: null });
});

test("answered with no answered_by: never Hang up", () => {
  assert.deepEqual(talkLook(st("answered"), ME), { look: "answered_elsewhere", name: "Answered by someone" });
  assert.deepEqual(talkLook(st("answered"), undefined), { look: "answered_elsewhere", name: "Answered by someone" });
});

const base: Config = { type: "custom:casa-mia-talk-tile", entity: "sensor.gate_call", vertical: true };

test("the tile: passed through, with the name, icon, colour and tap from the call", () => {
  const t = tileConfig(base, st("idle"), ME);
  assert.deepEqual(t, {
    type: "tile",
    entity: "sensor.gate_call",
    vertical: true,
    name: "Talk",
    icon: "mdi:microphone",
    tap_action: { action: "fire-dom-event", casa_mia_commander: { talk: "toggle" } },
    icon_tap_action: { action: "fire-dom-event", casa_mia_commander: { talk: "toggle" } },
  });
  const c = tileConfig({ ...base, commander: "select.gate_commander" }, st("idle"), ME);
  assert.deepEqual(c.tap_action.casa_mia_commander, { talk: "toggle", entity: "select.gate_commander" });
  assert.equal("commander" in c, false);
});

test("name replaces Talk only", () => {
  const named = { ...base, name: "Gate" };
  assert.equal(tileConfig(named, st("idle"), ME).name, "Gate");
  assert.equal(tileConfig(named, st("ringing"), ME).name, "Gate");
  assert.equal(tileConfig(named, st("answered", { answered_by: ME }), ME).name, "Hang up");
  assert.equal(tileConfig(named, st("answered", { answered_by: "Den tablet" }), ME).name, "Answered by Den tablet");
});

test("icons: icon in every state, else the state's own, else the default", () => {
  assert.equal(tileConfig(base, st("ringing"), ME).icon, "mdi:bell-ring");
  assert.equal(tileConfig({ ...base, icons: { ringing: "mdi:doorbell" } }, st("ringing"), ME).icon, "mdi:doorbell");
  assert.equal(tileConfig({ ...base, icons: { ringing: "mdi:doorbell" } }, st("idle"), ME).icon, "mdi:microphone");
  assert.equal(tileConfig({ ...base, icon: "mdi:gate", icons: { ringing: "mdi:doorbell" } }, st("ringing"), ME).icon, "mdi:gate");
});

test("colours: the state's own, else color, else the tile's own colouring", () => {
  const coloured = { ...base, colors: { hang_up: "red" } };
  assert.equal(tileConfig(coloured, st("answered", { answered_by: ME }), ME).color, "red");
  assert.equal("color" in tileConfig(coloured, st("idle"), ME), false);
  assert.equal(tileConfig({ ...coloured, color: "#33aa66" }, st("idle"), ME).color, "#33aa66");
  assert.equal(tileConfig({ ...coloured, color: "#33aa66" }, st("answered", { answered_by: ME }), ME).color, "red");
});

test("a tap_action replaces the default, and the icon's follows it", () => {
  const nav = { action: "navigate", navigation_path: "/lovelace/gate" };
  const t = tileConfig({ ...base, tap_action: nav }, st("idle"), ME);
  assert.deepEqual([t.tap_action, t.icon_tap_action], [nav, nav]);
  const more = { action: "more-info" };
  assert.deepEqual(tileConfig({ ...base, tap_action: nav, icon_tap_action: more }, st("idle"), ME).icon_tap_action, more);
});

test("the editor saves only what was set", () => {
  const fromForm = {
    ...base,
    vertical: false,
    hide_state: false,
    features_position: "bottom",
    name: "",
    icon: undefined,
    colors: { hang_up: "red", ringing: undefined },
    icons: {},
  } as Config;
  assert.deepEqual(cleaned(fromForm), { type: base.type, entity: base.entity, colors: { hang_up: "red" } });
  const set = { ...base, features_position: "inline", hide_state: true, colors: { ringing: "amber" } };
  assert.deepEqual(cleaned(set), set);
});
