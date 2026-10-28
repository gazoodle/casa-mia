import { test } from "node:test";
import assert from "node:assert/strict";
import { type Config, ago, entitiesOf, floorsOf, priorityOf, readAll, reading } from "./common.ts";

const NOW = Date.parse("2026-10-28T03:00:00Z");
const st = (state: string, unit = "", minutesAgo = 1) => ({ state, attributes: unit ? { unit_of_measurement: unit } : {}, last_changed: new Date(NOW - minutesAgo * 60e3).toISOString() });

test("a reading takes HA's unit and precision (or the state's own decimals); on and off are 1 and 0", () => {
  assert.deepEqual(reading(st("38.44", "°C"), "sensor.s", undefined, NOW), { v: 38.44, unit: "°", dp: 2, e: "sensor.s" });
  assert.equal(reading(st("38.44", "°C"), "sensor.s", 1, NOW).dp, 1);
  assert.equal(reading(st("1.6", "kW"), "sensor.p", undefined, NOW).dp, 1);
  assert.equal(reading(st("52", "Hz"), "sensor.hz", 0, NOW).unit, " Hz");
  assert.equal(reading(st("on"), "binary_sensor.p", undefined, NOW).v, 1);
  assert.equal(reading(st("off"), "binary_sensor.p", undefined, NOW).v, 0);
});

test("unavailable or missing is not current, and says for how long; a steady sensor, however quiet, is current", () => {
  assert.equal(reading(st("unavailable", "°C", 23), "sensor.s", undefined, NOW).stale, "23 min");
  assert.equal(reading(undefined, "sensor.gone", undefined, NOW).stale, "missing");
  assert.equal(reading(st("0", "Hz", 10 * 60), "sensor.idle_pump", undefined, NOW).stale, undefined); // idle all night
  assert.equal(ago(5 * 3600e3), "5 h");
});

test("the priority is read from whatever the controller calls it", () => {
  assert.equal(priorityOf("Heating"), "Heating");
  assert.equal(priorityOf("hot_water"), "Hot water");
  assert.equal(priorityOf("DHW"), "Hot water");
  assert.equal(priorityOf("Off"), "Off");
  assert.equal(priorityOf("unavailable"), "Unknown");
});

test("the options name their entities; floors count only when configured, lowest first", () => {
  const c: Config = { type: "x", heating: { supply_plant: ["sensor.a", "sensor.b"] }, floor_1: { name: "Down" }, floor_3: {}, tap_action: { entity: "light.not_mine" } };
  assert.deepEqual(entitiesOf(c), ["sensor.a", "sensor.b"]);
  assert.deepEqual(floorsOf(c).map((f) => f.name), ["Down"]);
});

const CONFIG: Config = {
  type: "custom:casa-mia-heating-flow",
  source: { type: "borehole", pump: "sensor.brine_pump" },
  heat_pump: { priority: "sensor.priority", compressor: "sensor.hz", alarm: "sensor.alarm" },
  floor_1: { name: "Down", loops: ["binary_sensor.kitchen", "binary_sensor.hall"] },
  water: { softener: true, salt_low: "binary_sensor.salt", storage: true, inlet: "binary_sensor.inlet", pumps: ["sensor.p1"], meter: "sensor.meter" },
};
const states = (over: Record<string, ReturnType<typeof st>>) => ({
  states: {
    "sensor.brine_pump": st("62", "%"), "sensor.priority": st("Heating"), "sensor.hz": st("52", "Hz"), "sensor.alarm": st("No alarm"),
    "binary_sensor.kitchen": st("on"), "binary_sensor.hall": st("off"), "binary_sensor.salt": st("off"), "binary_sensor.inlet": st("off"),
    "sensor.p1": st("0", "Hz"), "sensor.meter": st("0", "L/min"), ...over,
  },
});

test("what flows follows the priority, the pumps and the actuators", () => {
  const r = readAll(states({}), CONFIG, NOW);
  assert.equal(r.prio, "Heating");
  assert.ok(r.flows.heat && r.flows.brine && r.flows.comp && !r.flows.coil);
  assert.ok(r.flows["binary_sensor.kitchen"] && !r.flows["binary_sensor.hall"]);
  assert.equal(r.alarm, null);
  const dhw = readAll(states({ "sensor.priority": st("Hot water") }), CONFIG, NOW);
  assert.ok(dhw.flows.coil && !dhw.flows.heat && !dhw.flows["binary_sensor.kitchen"]);
});

test("a stopped brine pump while the compressor runs shows as no brine flow, with the compressor on", () => {
  const r = readAll(states({ "sensor.brine_pump": st("0", "%") }), CONFIG, NOW);
  assert.ok(r.flows.comp && !r.flows.brine);
});

test("water: the storage pumps say soft water is in use; the meter, while not filling, says the hard tap", () => {
  const r = readAll(states({ "sensor.p1": st("42", "Hz"), "sensor.meter": st("4.1", "L/min") }), CONFIG, NOW);
  assert.ok(r.flows.soft && r.flows.hard && !r.flows.fill);
  const filling = readAll(states({ "binary_sensor.inlet": st("on"), "sensor.meter": st("12", "L/min") }), CONFIG, NOW);
  assert.ok(filling.flows.fill && filling.flows.mains && !filling.flows.hard);
});

test("an alarm and low salt are said; a quiet alarm is not", () => {
  const r = readAll(states({ "sensor.alarm": st("Low brine flow"), "binary_sensor.salt": st("on") }), CONFIG, NOW);
  assert.equal(r.alarm, "Low brine flow");
  assert.ok(r.saltLow);
  assert.equal(readAll(states({ "sensor.p1": st("unavailable", "Hz", 40) }), CONFIG, NOW).data["sensor.p1"].stale, "40 min");
});
