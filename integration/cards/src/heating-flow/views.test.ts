import { test } from "node:test";
import assert from "node:assert/strict";
import type { Config, Readings } from "./common.ts";
import type { Look } from "./engine.ts";
import { heatPump } from "./heatpump.ts";
import { rooms } from "./rooms.ts";

const LOOK: Look = { pipes: "outline", markers: "chev", colours: "temp", readouts: "pill" };
const t = (v: number, e: string, stale?: string) => ({ v, unit: "°", dp: 1, e, stale });
const readings = (data: Readings["data"], flows: Readings["flows"], more: Partial<Readings> = {}): Readings =>
  ({ data, rooms: {}, flows, prio: "Heating", alarm: null, saltLow: false, ...more });

test("heat pump: each refrigerant reading named gets its callout; one not named is not drawn", () => {
  const c: Config = { type: "x", heat_pump: { refrigerant: { suction: "sensor.suction", liquid: "sensor.liquid" } } };
  const svg = heatPump(c, readings({ "sensor.suction": t(1.5, "sensor.suction"), "sensor.liquid": t(34, "sensor.liquid", "2 h") }, { comp: true }), LOOK);
  assert.match(svg, /SUCTION GAS/);
  assert.match(svg, /LIQUID<\/text><text[^>]*>— 2 h/);
  assert.doesNotMatch(svg, /HOT GAS/);
});

test("heat pump: the compressor's oil temperature sits beside its frequency, with its age when not current", () => {
  const c: Config = { type: "x", heat_pump: { compressor: "sensor.hz", oil: "sensor.oil" } };
  const hz = { v: 52, unit: " Hz", dp: 0, e: "sensor.hz" };
  assert.match(heatPump(c, readings({ "sensor.hz": hz, "sensor.oil": t(41.2, "sensor.oil") }, { comp: true }), LOOK), /Compressor · 52 Hz<tspan[^>]*> · oil 41\.2°/);
  assert.match(heatPump(c, readings({ "sensor.hz": hz, "sensor.oil": t(41.2, "sensor.oil", "5 h") }, { comp: true }), LOOK), /oil — 5 h/);
});

test("heat pump: making hot water, nothing flows back from the heating; the coil's return does", () => {
  const c: Config = { type: "x", dhw: { enabled: true } };
  const svg = heatPump(c, readings({}, { comp: true, hp_out: true, coil: true, heat: false }, { prio: "Hot water" }), LOOK);
  // Pipe ends run on by half their width, so a pipe from the boxes' edge (x 880) starts just past it.
  const fromBoxes = [...svg.matchAll(/animateMotion[^>]*path="M(\d+) (\d+)/g)].filter((m) => +m[1] >= 880).map((m) => +m[2]);
  assert.ok(!fromBoxes.includes(300), "no markers leave the Heating box");
  assert.ok(fromBoxes.includes(440), "the coil's return flows");
});

test("heat pump: in defrost the refrigerant runs backwards", () => {
  const c: Config = { type: "x", source: { type: "air" } };
  const fwd = heatPump(c, readings({}, { comp: true }), LOOK), back = heatPump(c, readings({}, { comp: true }, { prio: "Defrost" }), LOOK);
  const first = (s: string) => s.match(/animateMotion[^>]*path="([^"]+)"/)![1];
  assert.notEqual(first(fwd), first(back));
});

test("rooms: a room heating but more than a degree below its target is ringed amber and says by how much", () => {
  const c: Config = { type: "x", floor_1: { name: "Down", loops: ["binary_sensor.a", "binary_sensor.b"], rooms: ["climate.a", "climate.b"] } };
  const r = readings(
    { "binary_sensor.a": { v: 1, unit: "", dp: 0, e: "binary_sensor.a" }, "binary_sensor.b": { v: 0, unit: "", dp: 0, e: "binary_sensor.b" }, "climate.a": t(18.6, "climate.a"), "climate.b": t(17, "climate.b") },
    { heat: true, "binary_sensor.a": true, "binary_sensor.b": false },
    { rooms: { "climate.a": { name: "Snug", target: 21 }, "climate.b": { name: "Hall", target: 21 } } },
  );
  const svg = rooms(c, r, LOOK);
  assert.match(svg, /2\.4° below 21\.0°/);
  assert.match(svg, /1 of 2 loops open/);
  assert.equal([...svg.matchAll(/var\(--hf-warn\)/g)].length, 1, "the closed loop's cold room is not a fault");
});

test("rooms: no floors set says so", () => {
  assert.match(rooms({ type: "x" }, readings({}, {}), LOOK), /No floors set/);
});
