// The survey of the house: which room and floor a device is in, and what it is called there.
import assert from "node:assert/strict";
import { test } from "node:test";
import { survey } from "./house.ts";

const named = (friendly_name: string) => ({ state: "off", attributes: { friendly_name } });

function hass(names: Record<string, [string, string]>, areas: Record<string, { name: string; floor_id?: string }>, floors = {}) {
  const ids = Object.keys(names);
  return {
    states: Object.fromEntries(ids.map((id) => [id, named(names[id][1])])),
    entities: Object.fromEntries(ids.map((id) => [id, { entity_id: id, area_id: names[id][0] }])),
    areas: Object.fromEntries(Object.entries(areas).map(([id, a]) => [id, { area_id: id, ...a }])),
    floors,
    callService: async () => undefined,
  };
}

test("a device is named without its room, its kind or the punctuation between them, unless two would then share a name", () => {
  const found = survey(
    hass(
      {
        "light.a": ["landing", "Landing - Left"],
        "light.b": ["landing", "Landing Ceiling Light"],
        "light.c": ["landing", "Landing"],
        "light.d": ["landing", "Landingside lamp"],
        "switch.e": ["landing", "Landing: Heater switch"],
        "cover.f": ["landing", "Blind"],
        "light.g": ["landing", "Landing Light"],
        "light.h": ["landing", "Step"],
        "switch.i": ["landing", "Landing Step"],
      },
      { landing: { name: "Landing" } },
    ),
    {},
  );
  assert.deepEqual(Object.fromEntries(found.rooms[0].devices.map((d) => [d.id, d.name])), {
    "light.a": "Left",
    "light.b": "Ceiling",
    "light.c": "Landing",
    "light.d": "Landingside lamp",
    "switch.e": "Heater",
    "cover.f": "Blind",
    "light.g": "Landing Light",
    "light.h": "Step",
    "switch.i": "Landing Step",
  });
});

test("rooms come by floor from the lowest up, and those on no floor come last", () => {
  const found = survey(
    hass(
      { "light.a": ["attic", "Attic"], "light.b": ["shed", "Shed"], "light.c": ["hall", "Hall"], "light.d": ["cellar", "Cellar"], "light.e": ["den", "Den"] },
      { attic: { name: "Attic", floor_id: "up" }, shed: { name: "Shed" }, hall: { name: "Hall", floor_id: "ground" }, cellar: { name: "Cellar", floor_id: "down" }, den: { name: "Den", floor_id: "ground" } },
      { up: { name: "Upstairs", level: 1 }, ground: { name: "Ground floor", level: 0 }, down: { name: "Basement", level: -1 } },
    ),
    {},
  );
  assert.deepEqual(found.rooms.map((r) => [r.name, r.floor]), [["Cellar", "Basement"], ["Den", "Ground floor"], ["Hall", "Ground floor"], ["Attic", "Upstairs"], ["Shed", undefined]]);
});

test("a power sensor is a switch's own only when it is the device's one switch", () => {
  const h = hass({ "switch.kettle": ["den", "Kettle"], "switch.pump": ["den", "Pump"], "switch.valve": ["den", "Valve"] }, { den: { name: "Den" } });
  const meter = { state: "2000", attributes: { friendly_name: "Power", device_class: "power" } };
  Object.assign(h.states, { "sensor.plug_power": meter, "sensor.plant_power": meter });
  Object.assign(h.entities, { "sensor.plug_power": { entity_id: "sensor.plug_power", device_id: "plug" }, "sensor.plant_power": { entity_id: "sensor.plant_power", device_id: "plant" } });
  Object.assign(h.entities["switch.kettle"], { device_id: "plug" });
  Object.assign(h.entities["switch.pump"], { device_id: "plant" });
  Object.assign(h.entities["switch.valve"], { device_id: "plant" });
  assert.deepEqual(survey(h, {}).rooms[0].devices.map((d) => [d.id, d.power]), [["switch.kettle", "sensor.plug_power"], ["switch.pump", undefined], ["switch.valve", undefined]]);
});
