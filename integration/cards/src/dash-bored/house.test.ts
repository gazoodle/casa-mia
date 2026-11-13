// The survey of the house: which room and floor a device is in, and what it is called there.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDE, sighted, survey } from "./house.ts";

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

test("what Home Assistant isn't told is listed: no area, a shared name, no floor, no thermometer", () => {
  const h = hass(
    { "light.a": ["den", "Den"], "light.b": ["den", "Den Light"], "light.c": ["", "Stray lamp"], "light.d": ["attic", "Attic lamp"] },
    { den: { name: "Den" }, attic: { name: "Attic", floor_id: "up" } },
    { up: { name: "Upstairs", level: 1 } },
  );
  Object.assign(h.states, { "sensor.t": { state: "20", attributes: {} } });
  Object.assign(h.areas.attic, { temperature_entity_id: "sensor.t" });
  assert.deepEqual(survey(h, {}).gaps, [
    { kind: "loose", items: [{ id: "light.c", name: "Stray lamp" }] },
    { kind: "clash", items: [{ id: "light.a", name: "Den" }, { id: "light.b", name: "Den Light" }] },
    { kind: "floorless", items: [{ id: "den", name: "Den" }] },
    { kind: "cold", items: [{ id: "den", name: "Den" }] },
  ]);
});

test("the hide label takes an entity, a device's entities or an area's off the page, and a setting by its name is suspected", () => {
  const h = hass(
    { "light.a": ["den", "Lamp"], "light.b": ["den", "Glow"], "light.c": ["den", "Spot"], "light.d": ["shed", "Bulb"], "switch.e": ["den", "Pump relay"], "light.f": ["", "Status LED"] },
    { den: { name: "Den" }, shed: { name: "Shed", labels: [HIDE] } },
  );
  Object.assign(h.entities["light.a"], { labels: [HIDE] });
  Object.assign(h.entities["light.b"], { device_id: "strip" });
  Object.assign(h.entities["switch.e"], { platform: "esphome" });
  Object.assign(h, { devices: { strip: { area_id: "den", labels: [HIDE] } } });
  const found = survey(h, {});
  assert.deepEqual(found.rooms.map((r) => [r.name, r.devices.map((d) => d.id)]), [["Den", ["light.c", "switch.e"]]]);
  assert.deepEqual(found.gaps.slice(0, 2), [
    { kind: "loose", items: [{ id: "light.f", name: "Status LED" }] },
    { kind: "plumbing", items: [{ id: "light.f", name: "Status LED", via: undefined }, { id: "switch.e", name: "Pump relay", via: "esphome" }] },
  ]);
});

test("a sighting from the feed is named for its camera and put in the camera's room, and a hidden camera's is left out", () => {
  const h = hass({ "light.a": ["shed", "Lamp"] }, { shed: { name: "Shed" } });
  const camera = (id: string, device_id: string, camera: string) => {
    Object.assign(h.states, { [id]: { state: "unknown", attributes: { camera } } });
    Object.assign(h.entities, { [id]: { entity_id: id, device_id, platform: "casa_mia_dash_bored" } });
  };
  camera("image.shed", "cam", "camera.shed");
  camera("image.attic", "attic", "camera.attic"); // its camera is kept off the page
  camera("image.den", "den", "camera.den");
  Object.assign(h.entities, { "camera.attic": { entity_id: "camera.attic", labels: [HIDE] } });
  Object.assign(h, { devices: { cam: { area_id: "shed", name: "Shed camera" }, attic: { name: "Attic" }, den: { name: "G4", name_by_user: "Den" } } });

  const seen = (id: string, entity: string, more = {}) => ({ id, entity, camera: entity.replace("image", "camera"), kind: "person", at: 1000, changed: 1000, photo: true, ...more });
  const told = sighted(survey(h, {}), [
    seen("one", "image.shed", { changed: 1007 }), // its photograph was replaced seven seconds on
    seen("two", "image.attic"),
    seen("three", "image.den", { photo: false, at: 1060 }), // the camera did not answer
    seen("four", "image.gone"), // a camera no longer in the house
  ]);
  assert.deepEqual(told, [
    { id: "one", name: "Shed camera", room: "Shed", camera: "camera.shed", kind: "person", at: 1_000_000, photo: "/api/casa_mia_dash_bored/photo/one?v=1007" },
    { id: "three", name: "Den", room: undefined, camera: "camera.den", kind: "person", at: 1_060_000, photo: undefined },
  ]);
});
