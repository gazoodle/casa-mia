import assert from "node:assert/strict";
import { test } from "node:test";
import { chassis, limits, metered, phase, step } from "./meters.ts";

// An invented house: a three-phase meter on the supply and a single-phase one on a fan.
const sensor = (device: string, id: string, name: string, kind: string, state: string, unit: string) => ({ device, id: `sensor.${id}`, name, kind, state, unit });
const SENSORS = [
  sensor("supply", "supply_l1_voltage", "Supply L1 voltage", "voltage", "231.4", "V"),
  sensor("supply", "supply_l2_voltage", "Supply L2 voltage", "voltage", "238.2", "V"),
  sensor("supply", "supply_l3_voltage", "Supply L3 voltage", "voltage", "234.7", "V"),
  sensor("supply", "supply_l1_current", "Supply L1 current", "current", "12.4", "A"),
  sensor("supply", "supply_l2_current", "Supply L2 current", "current", "9.6", "A"),
  sensor("supply", "supply_l3_current", "Supply L3 current", "current", "unavailable", "A"),
  sensor("supply", "supply_l1_power", "Supply L1 power", "power", "1840", "W"),
  sensor("supply", "supply_total_power", "Supply total power", "power", "3.62", "kW"),
  sensor("supply", "supply_l1_pf", "Supply L1 power factor", "power_factor", "82", "%"),
  sensor("supply", "supply_import", "Supply import", "energy", "41250300", "Wh"),
  sensor("fan", "fan_voltage", "Fan voltage", "voltage", "229.6", "V"),
  sensor("fan", "fan_power", "Fan power", "power", "41.5", "W"),
  sensor("fan", "fan_today", "Fan today", "energy", "1.4", "kWh"),
  sensor("fan", "fan_signal", "Fan signal", "signal_strength", "-60", "dBm"),
];
const hass = (sensors = SENSORS) => ({
  callService: async () => undefined,
  devices: { supply: { name: "Supply" }, fan: { name: "Extractor fan", name_by_user: "Fan" }, bare: { name: "Bare" } },
  entities: Object.fromEntries(sensors.map((s) => [s.id, { device_id: s.device }])),
  states: Object.fromEntries(sensors.map((s) => [s.id, { state: s.state, attributes: { friendly_name: s.name, device_class: s.kind, unit_of_measurement: s.unit } }])),
});

test("a sensor's phase is in its name or id, as a word", () => {
  assert.equal(phase("Supply L2 voltage"), 2);
  assert.equal(phase("sensor.supply_l3_power"), 3);
  assert.equal(phase("Phase 1 current"), 1);
  assert.equal(phase("Total power"), 0);
  assert.equal(phase("Hall2 voltage"), 0);
  assert.equal(phase("L10 voltage"), 0);
});

test("a scale's top is the first of 1, 2, 5 that holds the reading", () => {
  assert.deepEqual([0.3, 1, 7.5, 12.4, 41.5, 1840].map(step), [0.5, 1, 10, 20, 50, 2000]);
  assert.equal(step(0), 1);
});

test("limits: the card's own, then the kind's scale, then a step that never comes back in", () => {
  assert.deepEqual(limits("voltage", [231.4, 238.2]), [210, 260]);
  assert.deepEqual(limits("voltage", [205, 262]), [210, 260]); // sagging or high, it is still the mains
  assert.deepEqual(limits("voltage", [118]), [105, 130]);
  assert.deepEqual(limits("voltage", [12.4]), [0, 20]); // not a mains voltage
  assert.deepEqual(limits("frequency", [50]), [45, 65]);
  assert.deepEqual(limits("current", [7.5, 12.4]), [0, 20]);
  assert.deepEqual(limits("current", [0.3], {}, [0, 20]), [0, 20]);
  assert.deepEqual(limits("power", [-1200, 300]), [-2000, 500]);
  assert.deepEqual(limits("current", [12.4], { max: 32 }), [0, 32]);
  assert.deepEqual(limits("voltage", [236], { min: 220 }), [220, 260]);
  assert.deepEqual(limits("current", []), [0, 1]);
});

test("a meter with phases has a strip for each, and the whole meter's readings apart", () => {
  const c = chassis(hass(), "supply", {}, new Map());
  assert.equal(c.name, "Supply");
  assert.deepEqual(c.strips.map((s) => [s.phase, s.meters.map((m) => m.title)]), [
    [1, ["L1 231 V", "L1 12.4 A", "L1 1.84 kW"]],
    [2, ["L2 238 V", "L2 9.6 A"]],
    [3, ["L3 235 V", "L3: not answering"]],
  ]);
  // The phases share a scale; one not answering is on it, with no reading.
  assert.deepEqual(c.strips.map((s) => s.meters[1]).map((m) => [m.lo, m.hi, m.value]), [[0, 20, 12.4], [0, 20, 9.6], [0, 20, undefined]]);
  // Kilowatts are read as watts, and shown in thousands once the scale reaches a thousand.
  assert.deepEqual(c.whole.map((m) => [m.title, m.lo, m.hi, m.unit]), [["3.62 kW", 0, 5, "kW"]]);
  assert.deepEqual(c.registers, [{ id: "sensor.supply_import", name: "import", kwh: 41250.3 }]);
});

test("a meter with no phases is one strip, named as its owner named it", () => {
  const c = chassis(hass(), "fan", {}, new Map());
  assert.equal(c.name, "Fan");
  assert.deepEqual(c.strips, []);
  assert.deepEqual(c.whole.map((m) => [m.title, m.lo, m.hi]), [["230 V", 210, 260], ["41.5 W", 0, 50]]);
  assert.deepEqual(c.registers.map((r) => r.kwh), [1.4]);
});

test("a card shows what it asks for, between its own limits", () => {
  const c = chassis(hass(), "supply", { show: ["power_factor", "current"], limits: { current: { max: 63 } } }, new Map());
  assert.deepEqual(c.strips[0].meters.map((m) => [m.title, m.lo, m.hi]), [["L1 12.4 A", 0, 63], ["L1 0.82", 0, 1]]);
  assert.deepEqual(c.registers, []);
});

test("a scale that has stepped out stays out while the card holds it", () => {
  const held = new Map<string, [number, number]>();
  const at = (watts: string) => chassis(hass(SENSORS.map((s) => (s.id === "sensor.fan_power" ? { ...s, state: watts } : s))), "fan", {}, held).whole[1];
  const scale = (watts: string) => [at(watts).hi, at(watts).unit];
  assert.deepEqual([scale("41.5"), scale("740"), scale("41.5")], [[50, "W"], [1, "kW"], [1, "kW"]]);
});

test("a chassis with nothing to draw says why", () => {
  assert.equal(chassis(hass(), "gone", {}, new Map()).fault, "This device is not in Home Assistant");
  assert.equal(chassis(hass(), "bare", {}, new Map()).fault, "Bare has no voltage, current, power, energy sensor to show");
});

test("a new card is offered the devices that measure both voltage and current", () => {
  assert.deepEqual(metered(hass()), ["supply"]);
});

// What Sensor Watch says of the supply's voltages: its bands, and that L2 is high.
const BANDS = [{ from: null, to: 216, level: "warning" as const }, { from: 216, to: 253, level: "nominal" as const }, { from: 253, to: null, level: "warning" as const }];
const watching = (level: "nominal" | "warning", message?: string) => ({ watched: true, kind: "numeric" as const, level, message, bands: BANDS });

test("a watched sensor's bands give its scale, and its level and message go with its meter", () => {
  const watches = new Map([["sensor.supply_l1_voltage", watching("nominal")], ["sensor.supply_l2_voltage", watching("warning", "Mains high")]]);
  const volts = chassis(hass(), "supply", {}, new Map(), watches).strips.map((s) => s.meters[0]);
  // The gauge's ends (197.5 to 271.5: the bands' edges, pushed out by half their span where a
  // band has no end), moved out to five steps of 20. L3 is not watched, and shares the scale.
  assert.deepEqual(volts.map((m) => [m.lo, m.hi]), [[180, 280], [180, 280], [180, 280]]);
  assert.deepEqual(volts.map((m) => [m.level, m.message]), [["nominal", undefined], ["warning", "Mains high"], [undefined, undefined]]);
});

test("the card's own limits come before Sensor Watch's, and bands are read in the sensor's own unit", () => {
  const watches = new Map([["sensor.supply_l1_voltage", watching("nominal")]]);
  assert.deepEqual(chassis(hass(), "supply", { limits: { voltage: { min: 200 } } }, new Map(), watches).strips[0].meters[0].lo, 200);
  // Bands in kW, on a sensor that reports kW: 0 to 6 kW is 0 to 6000 W, which five steps of 2 kW hold.
  const kw = new Map([["sensor.supply_total_power", { watched: true, bands: [{ from: 0, to: 4, level: "nominal" as const }, { from: 4, to: 6, level: "warning" as const }] }]]);
  assert.deepEqual(chassis(hass(), "supply", {}, new Map(), kw).whole.map((m) => [m.lo, m.hi, m.unit]), [[0, 10, "kW"]]);
});

test("a watch that is switched off, or not of the sensor's state, says nothing of its meter", () => {
  const off = new Map([["sensor.fan_voltage", { ...watching("warning"), disabled: true }]]);
  assert.equal(chassis(hass(), "fan", {}, new Map(), off).whole[0].level, undefined);
  const other = new Map([["sensor.fan_voltage", { ...watching("nominal"), attribute: "battery" }]]);
  assert.deepEqual([chassis(hass(), "fan", {}, new Map(), other).whole[0].lo, chassis(hass(), "fan", {}, new Map(), other).whole[0].hi], [210, 260]);
});
