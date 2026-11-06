// The Talk tile's rules (common.ts): what it says for each call, the tile config it gives
// HA's tile card, and the config the editor saves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleaned, holdLook, talkLook, tileConfig, type Config } from "./common.ts";

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

test("a half duplex Answer tile says Answer and sends duplex: half", () => {
  const half = { ...base, duplex: "half" as const, commander: "select.gate_commander" };
  const t = tileConfig(half, st("idle"), ME);
  assert.equal(t.name, "Answer");
  assert.deepEqual(t.tap_action.casa_mia_commander, { talk: "toggle", duplex: "half", entity: "select.gate_commander" });
  assert.equal("duplex" in t, false);
  assert.equal(tileConfig(half, st("answered", { answered_by: ME }), ME).name, "Hang up");
  assert.equal(tileConfig({ ...half, name: "Gate" }, st("idle"), ME).name, "Gate");
});

test("Hold to talk: enabled only when silent, Live only when live, else greyed out", () => {
  assert.deepEqual(holdLook("silent"), { look: "hold", name: null, enabled: true });
  assert.deepEqual(holdLook("live"), { look: "live", name: "Live", enabled: true });
  for (const s of ["off", "connecting", "full"] as const) assert.deepEqual(holdLook(s), { look: "hold", name: null, enabled: false });
});

test("the Hold to talk tile: its name, icon and colour per state, and no taps", () => {
  const hold = { ...base, button: "hold" as const };
  const silent = tileConfig(hold, st("answered", { answered_by: ME }), ME, "silent");
  assert.deepEqual([silent.name, silent.icon, "color" in silent], ["Hold to talk", "mdi:microphone", false]);
  const live = tileConfig(hold, st("answered", { answered_by: ME }), ME, "live");
  assert.deepEqual([live.name, live.icon, live.color], ["Live", "mdi:microphone", "red"]);
  for (const s of ["off", "connecting", "full"] as const) {
    const t = tileConfig({ ...hold, color: "green" }, st("idle"), ME, s);
    assert.deepEqual([t.name, t.color], ["Hold to talk", "disabled"]);
  }
  const keyed = { ...hold, icons: { live: "mdi:account-voice" }, colors: { hold: "green", live: "orange" } };
  assert.equal(tileConfig(keyed, st("idle"), ME, "live").icon, "mdi:account-voice");
  assert.equal(tileConfig(keyed, st("idle"), ME, "live").color, "orange");
  assert.equal(tileConfig(keyed, st("idle"), ME, "silent").color, "green");
  for (const k of ["tap_action", "icon_tap_action", "hold_action", "double_tap_action"]) assert.deepEqual(silent[k], { action: "none" });
  assert.equal("button" in silent, false);
});

test("button and duplex at their defaults aren't saved", () => {
  assert.deepEqual(cleaned({ ...base, button: "answer", duplex: "full" }), base);
  assert.deepEqual(cleaned({ ...base, button: "hold" }), { ...base, button: "hold" });
});
