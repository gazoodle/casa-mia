// The survey of the house: which room and floor a device is in, and what it is called there.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDE, read, scenes, sighted, survey } from "./house.ts";

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

test("the floors and rooms come in the order asked for, and a card may show only some", () => {
  const h = hass(
    { "light.a": ["attic", "Attic"], "light.b": ["hall", "Hall"], "light.c": ["kitchen", "Kitchen"], "light.d": ["cellar", "Cellar"], "light.e": ["shed", "Shed"] },
    { attic: { name: "Attic", floor_id: "top" }, hall: { name: "Hall", floor_id: "ground" }, kitchen: { name: "Kitchen", floor_id: "ground" }, cellar: { name: "Cellar", floor_id: "below" }, shed: { name: "Shed" } },
    { top: { floor_id: "top", name: "Top floor", level: 2 }, ground: { floor_id: "ground", name: "Ground floor", level: 0 }, below: { floor_id: "below", name: "Basement", level: -1 } },
  );
  const order = (options: Parameters<typeof survey>[1]) => survey(h, options).rooms.map((r) => r.id);
  assert.deepEqual(order({}), ["cellar", "hall", "kitchen", "attic", "shed"]);

  // The house's order leaves nothing out: the ground floor first with the kitchen leading
  // it, then the floors not named from the lowest up. A name does as well as an id.
  assert.deepEqual(order({ floor_order: ["ground"], room_order: ["Kitchen"] }), ["kitchen", "hall", "cellar", "attic", "shed"]);

  // A card's own lists show only what they name, and come before the house's.
  assert.deepEqual(order({ floors: ["top", "ground"], floor_order: ["below"] }), ["attic", "hall", "kitchen"]);
  assert.deepEqual(order({ rooms: ["shed", "kitchen"], room_order: ["hall"] }), ["kitchen", "shed"]);
});

test("a ZenOS-AI house's Kata sensor is found by its label and watched with the agent's name, unless it is hidden", () => {
  const h = hass({ "light.a": ["den", "Lamp"], "sensor.katas": ["", "Katas"] }, { den: { name: "Den" } });
  Object.assign(h.entities["sensor.katas"], { labels: ["zen_kata_cabinet"] });
  const found = survey(h, {});
  assert.equal(found.desk, "sensor.katas");
  assert.ok(found.watched.includes("sensor.katas") && found.watched.includes("input_text.zenos_persona_name"));
  Object.assign(h.entities["sensor.katas"], { labels: ["zen_kata_cabinet", HIDE] });
  assert.equal(survey(h, {}).desk, undefined);
});

test("a card for one entity surveys it alone, by its full name, even when hidden or in no room, and watches nothing else", () => {
  const h = hass({ "light.a": ["den", "Den Lamp"], "light.b": ["den", "Den Spot"], "light.c": ["", "Stray lamp"] }, { den: { name: "Den" } });
  Object.assign(h.states, { "sensor.t": { state: "20", attributes: {} }, "sensor.out": { state: "9", attributes: { device_class: "temperature" } } });
  Object.assign(h.areas.den, { temperature_entity_id: "sensor.t" });
  Object.assign(h.entities["light.a"], { labels: [HIDE] });
  const one = (entity: string) => survey(h, { entity });
  assert.deepEqual(one("light.a").rooms.map((r) => [r.name, r.temp, r.devices.map((d) => [d.id, d.name])]), [["", undefined, [["light.a", "Den Lamp"]]]]);
  assert.deepEqual(one("light.a").watched, ["light.a"]);
  assert.deepEqual(one("light.c").rooms.map((r) => r.devices.map((d) => d.name)), [["Stray lamp"]]);
  // A sensor is no device: it is only watched, for its meter.
  assert.deepEqual([one("sensor.out").rooms, one("sensor.out").watched], [[], ["sensor.out"]]);
});

test("for the card picker the house is cut to a specimen: the room with the most kinds of thing, four devices, one of each kind first", () => {
  const h = hass(
    { "light.a": ["den", "Den Lamp"], "light.b": ["den", "Den Spot"], "light.c": ["den", "Den Strip"], "light.d": ["den", "Den Desk"], "switch.e": ["den", "Den Fan"], "cover.f": ["den", "Den Blind"], "light.g": ["hall", "Hall Lamp"] },
    { den: { name: "Den" }, hall: { name: "Hall" } },
  );
  const s = survey(h, { sample: true });
  assert.deepEqual(s.rooms.map((r) => r.name), ["Den"]);
  assert.deepEqual(s.rooms[0].devices.map((d) => d.kind), ["cover", "light", "switch", "light"]);
  assert.ok(!s.watched.includes("light.g") && s.watched.includes("cover.f"));
  assert.deepEqual(s.gaps, []);
  // Whole, without it.
  assert.equal(survey(h, {}).rooms.length, 2);
});

test("a scene is its room's by its area or its name, or its floor's, or the house's, and the label hides it", () => {
  const h = hass(
    {
      "light.a": ["barn", "Barn Light"],
      "light.b": ["loft", "Barn Loft Light"],
      "light.c": ["snug", "Snug Light"],
      "scene.one": ["", "Barn - All Off"],
      "scene.two": ["", "Barn Loft New"],
      "scene.three": ["snug", "Film night"],
      "scene.four": ["", "Upstairs all off"],
      "scene.five": ["", "Barnyard party"],
      "scene.six": ["", "Barn"],
      "scene.seven": ["", "Barn Hidden"],
    },
    { barn: { name: "Barn" }, loft: { name: "Barn Loft" }, snug: { name: "Snug", floor_id: "up" } },
    { up: { floor_id: "up", name: "Upstairs", level: 1 } },
  );
  (h.entities as any)["scene.seven"].labels = [HIDE];
  for (const id of Object.keys(h.states)) if (id.startsWith("scene.")) (h.states as any)[id].state = id === "scene.one" ? "2026-11-16T10:00:00+00:00" : "unknown";
  const found = survey(h as any, {});
  const room = (name: string) => found.rooms.find((r) => r.name === name)!.scenes.map((s) => [s.id, s.name]);
  // A room's name on its own is no name for a scene: it keeps its whole name.
  assert.deepEqual(room("Barn"), [["scene.six", "Barn"], ["scene.one", "All Off"]]);
  // The longest room name that fits is the room.
  assert.deepEqual(room("Barn Loft"), [["scene.two", "New"]]);
  assert.deepEqual(room("Snug"), [["scene.three", "Film night"]]);
  // "Barnyard" is not the barn; the floor's scene says which floor.
  assert.deepEqual(found.scenes, [{ id: "scene.five", name: "Barnyard party", full: "Barnyard party", floor: undefined }, { id: "scene.four", name: "All off", full: "Upstairs all off", floor: "Upstairs" }]);
  assert.ok(found.watched.includes("scene.one") && !found.watched.includes("scene.seven"));

  const house = read(found, h as any);
  assert.deepEqual(house.rooms.find((r) => r.name === "Barn")!.scenes.map((s) => s.at), [0, Date.parse("2026-11-16T10:00:00+00:00")]);
  assert.deepEqual(scenes(house).map((s) => s.name).sort(), ["Barn", "Barn - All Off", "Barn Loft New", "Barnyard party", "Film night", "Upstairs all off"]);
});

test("a camera with several streams is one camera, named for its device: the photographed one if there is one", () => {
  const h = hass(
    {
      "camera.drive_high": ["drive", "Drive cam High resolution channel"],
      "camera.drive_low": ["drive", "Drive cam Low resolution channel"],
      "camera.gate_high": ["drive", "Gate cam High resolution channel"],
      "camera.gate_low": ["drive", "Gate cam Low resolution channel"],
      "camera.lone": ["drive", "Drive Shed"],
      "image.gate": ["drive", "Gate cam Last sighting"],
    },
    { drive: { name: "Drive" } },
  );
  const on = (id: string, device_id: string) => Object.assign((h.entities as any)[id], { device_id });
  on("camera.drive_high", "d1"), on("camera.drive_low", "d1"), on("camera.gate_high", "d2"), on("camera.gate_low", "d2"), on("camera.lone", "d3"), on("image.gate", "d2");
  (h.entities as any)["image.gate"].platform = "casa_mia_dash_bored";
  (h.states as any)["image.gate"].attributes.camera = "camera.gate_low";
  (h as any).devices = { d1: { name: "Drive cam" }, d2: { name: "Gate cam" }, d3: { name: "Shed cam" } };
  const found = survey(h as any, {});
  // The first by id; the one whose sightings are photographed; and one alone keeps its own name.
  assert.deepEqual(found.rooms[0].devices.map((d) => [d.id, d.name]), [["camera.drive_high", "Cam"], ["camera.gate_low", "Gate cam"], ["camera.lone", "Shed"]]);
});

test("a camera that Casa Mia lists is shown in place of the one found: its stream, its title, its zoom, presets and controls", () => {
  const h = hass(
    {
      "camera.drive_high": ["drive", "Drive cam High resolution channel"],
      "camera.drive_low": ["drive", "Drive cam Low resolution channel"],
      "camera.gate_high": ["drive", "Gate cam High resolution channel"],
      "camera.gate_low": ["drive", "Gate cam Low resolution channel"],
      "camera.lone": ["drive", "Drive Shed"],
      "image.gate": ["drive", "Gate cam Last sighting"],
      "lock.side": ["hall", "Side door"],
    },
    { drive: { name: "Drive" }, hall: { name: "Hall" } },
  );
  const on = (id: string, device_id: string) => Object.assign((h.entities as any)[id], { device_id });
  on("camera.drive_high", "d1"), on("camera.drive_low", "d1"), on("camera.gate_high", "d2"), on("camera.gate_low", "d2"), on("camera.lone", "d3"), on("image.gate", "d2");
  (h.entities as any)["image.gate"].platform = "casa_mia_dash_bored";
  (h.states as any)["image.gate"].attributes.camera = "camera.gate_high";
  (h as any).devices = { d1: { name: "Drive cam" }, d2: { name: "Gate cam" }, d3: { name: "Shed cam" } };
  // What goes with a camera need be in no room, nor a kind of thing a room shows.
  Object.assign(h.states, { "number.drive_zoom": { state: "3", attributes: { min: 1, max: 8, step: 0.5 } }, "button.gate": { state: "unknown", attributes: { friendly_name: "Gate opener" } } });
  const preset = { name: "Road", action: "unifiprotect.ptz_goto_preset", data: { device_id: "d1", preset: "Road" } };
  const cameras = [
    { entity: "camera.drive_low", title: "Front drive", zoom: "number.drive_zoom", presets: [preset], controls: [{ entity: "button.gate", name: "" }, { entity: "lock.side", name: "Side" }, { entity: "switch.gone", name: "Gone" }] },
    // Listed by one stream only: it is still the camera whose other stream is photographed.
    { entity: "camera.gate_low", title: "The gate", presets: [], controls: [] },
  ];

  const found = survey(h as any, { cameras });
  // Casa Mia's stream, not the first by id; the photographed stream, under Casa Mia's title; one it does not list is as it was.
  assert.deepEqual(found.rooms[0].devices.map((d) => [d.id, d.name]), [["camera.drive_low", "Front drive"], ["camera.lone", "Shed"], ["camera.gate_high", "The gate"]]);
  for (const id of ["number.drive_zoom", "button.gate", "lock.side"]) assert.ok(found.watched.includes(id), id);

  const [drive, lone, gate] = read(found, h as any).rooms[0].devices;
  assert.deepEqual(drive.zoom, { id: "number.drive_zoom", level: 3, span: { min: 1, max: 8, step: 0.5, vote: 0.5 } });
  assert.deepEqual(drive.presets, [preset]);
  // A control gone from Home Assistant is left out; a lock among them is a device, and guarded.
  assert.deepEqual(drive.controls!.map((c) => [c.id, c.name, c.device?.kind, c.device?.guarded]), [["button.gate", "Gate opener", undefined, undefined], ["lock.side", "Side", "lock", true]]);
  assert.deepEqual([gate.zoom, gate.presets, gate.controls], [undefined, [], []]);
  assert.equal(lone.presets, undefined);
});

test("a device's choices: a thermostat's mode is its state, a player's source an attribute, and one option is no choice", async () => {
  const { choices, choosing, worded } = await import("./choices.ts");
  const stat = { state: "heat", attributes: { hvac_modes: ["off", "heat", "heat_cool"], preset_modes: ["eco"], fan_modes: ["low", "high"], fan_mode: "low" } };
  assert.deepEqual(choices("climate", stat).map((c) => [c.what, c.options, c.now]), [["Mode", ["off", "heat", "heat_cool"], "heat"], ["Fan", ["low", "high"], "low"]]);
  const [mode] = choices("climate", stat);
  assert.deepEqual(choosing("climate.hall", mode, "heat_cool"), { domain: "climate", service: "set_hvac_mode", ids: ["climate.hall"], data: { hvac_mode: "heat_cool" } });
  assert.equal(worded("heat_cool"), "heat cool");

  const player = { state: "playing", attributes: { source_list: ["Radio", "Line in"], source: "Radio" } };
  assert.deepEqual(choices("media_player", player).map((c) => [c.what, c.now]), [["Source", "Radio"]]);
  // A light's effect is chosen by turning the light on with it. None stands when none is running.
  const [effect] = choices("light", { state: "on", attributes: { effect_list: ["colorloop", "blink"], effect: null } });
  assert.equal(effect.now, undefined);
  assert.deepEqual(choosing("light.shelf", effect, "blink"), { domain: "light", service: "turn_on", ids: ["light.shelf"], data: { effect: "blink" } });
  // Nothing for a kind with none, an entity that is away, or one that is gone.
  assert.deepEqual(choices("lock", { state: "locked", attributes: {} }), []);
  assert.deepEqual(choices("climate", { ...stat, state: "unavailable" }), []);
  assert.deepEqual(choices("climate", undefined), []);
});
