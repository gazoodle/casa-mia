import assert from "node:assert/strict";
import { test } from "node:test";
import { read, survey } from "./house.ts";
import { RECOVERED, stories, type Alert } from "./stories.ts";
import { VOICES, tell, words } from "./voices.ts";

// An invented house, as Home Assistant's page would hold it.
const state = (value: string, attributes: Record<string, unknown> = {}) => ({ state: value, attributes, last_changed: "2026-11-13T18:00:00Z" });
function hass(over: Record<string, ReturnType<typeof state>> = {}) {
  const states: Record<string, ReturnType<typeof state>> = {
    "light.kitchen_ceiling": state("on", { friendly_name: "Kitchen Ceiling", brightness: 204 }),
    "light.kitchen_counter": state("off", { friendly_name: "Kitchen Counter" }),
    "switch.kettle": state("on", { friendly_name: "Kettle" }),
    "sensor.kettle_power": state("2200", { device_class: "power", unit_of_measurement: "W" }),
    "sensor.kettle_signal": state("-60", { friendly_name: "Kettle signal" }),
    "lock.front_door": state("locked", { friendly_name: "Front door" }),
    "cover.garage": state("closed", { friendly_name: "Garage door", device_class: "garage" }),
    "light.hidden": state("on", { friendly_name: "Hidden" }),
    "climate.kitchen": state("heat", { temperature: 21, current_temperature: 19.5 }),
    "sensor.kitchen_temp": state("19.6"),
    "scene.evening": state("unknown", { friendly_name: "Evening" }),
    "weather.home": state("cloudy", { temperature: 9.3, humidity: 81 }),
    ...over,
  };
  const entry = (entity_id: string, more: object = {}) => [entity_id, { entity_id, ...more }];
  return {
    states,
    callService: async () => undefined,
    areas: { kitchen: { area_id: "kitchen", name: "Kitchen", temperature_entity_id: "sensor.kitchen_temp" }, hall: { area_id: "hall", name: "Hall" } },
    devices: { plug: { area_id: "kitchen" } },
    entities: Object.fromEntries([
      entry("light.kitchen_ceiling", { area_id: "kitchen" }), entry("light.kitchen_counter", { area_id: "kitchen" }),
      entry("switch.kettle", { device_id: "plug" }), entry("sensor.kettle_power", { device_id: "plug" }),
      entry("sensor.kettle_signal", { device_id: "plug", entity_category: "diagnostic" }),
      entry("lock.front_door", { area_id: "hall" }), entry("cover.garage", { area_id: "hall" }),
      entry("light.hidden", { area_id: "hall", hidden: true }), entry("climate.kitchen", { area_id: "kitchen" }),
      entry("sensor.kitchen_temp", { area_id: "kitchen" }), entry("scene.evening"), entry("weather.home"),
    ]),
  };
}
const house = (over = {}) => { const h = hass(over); return read(survey(h, {}), h); };
const raised = (level: string, more: Partial<Alert> = {}): Alert =>
  ({ entity_id: "sensor.freezer", name: "Freezer", level, value: -4, unit: "°C", message: "The freezer is thawing.", area: "Kitchen", escalated: false, at: 1000, began: 1000, flavour: "temperature", ...more });

test("the house is read from areas, with names shortened and settings left out", () => {
  const h = house();
  assert.deepEqual(h.rooms.map((r) => r.name), ["Hall", "Kitchen"]);
  const kitchen = h.rooms[1];
  assert.deepEqual(kitchen.devices.map((d) => [d.name, d.kind, d.on, d.level]), [["Ceiling", "light", true, 80], ["Counter", "light", false, undefined], ["Kettle", "switch", true, undefined]]);
  assert.equal(kitchen.temp, 19.6);
  assert.equal(kitchen.target, 21);
  assert.deepEqual(h.scenes, [{ id: "scene.evening", name: "Evening" }]);
  assert.deepEqual(h.outside, { temp: 9.3, humidity: 81 });
  // A plug drawing a kilowatt or more is an appliance at work.
  assert.deepEqual(h.appliances, [{ id: "switch.kettle", name: "Kettle", room: "Kitchen", kw: 2.2 }]);
});

test("a lock and a garage door are guarded, so a tap on a sentence never moves them", () => {
  const hall = house().rooms[0];
  assert.deepEqual(hall.devices.map((d) => [d.name, d.guarded]), [["Garage door", true], ["Front door", true]]);
  assert.equal(house().rooms[1].devices.every((d) => !d.guarded), true);
});

test("only the states of what is shown are watched", () => {
  const h = hass();
  const watched = survey(h, {}).watched;
  assert.equal(watched.includes("light.kitchen_ceiling") && watched.includes("sensor.kettle_power"), true);
  assert.equal(watched.includes("light.hidden") || watched.includes("sensor.kettle_signal"), false);
});

test("what matters most leads", () => {
  const kinds = (h = house(), alerts: Alert[] = [], now = 2000) => stories(h, alerts, now).map((s) => s.kind);
  assert.deepEqual(kinds(), ["appliance", "lights", "cold", "weather"]);
  // A house with nothing to report still has a front page.
  assert.deepEqual(kinds({ rooms: [], sightings: [], scenes: [], appliances: [] }), ["quiet"]);
  assert.equal(kinds(house({ "lock.front_door": state("unlocked", { friendly_name: "Front door" }) }))[0], "unlocked");
  assert.equal(kinds(house({ "lock.front_door": state("unlocked", { friendly_name: "Front door" }) }), [raised("critical")])[0], "alert");
  // A warning is below an unlocked door; a job to do is below a kettle.
  assert.deepEqual(kinds(house(), [raised("warning")]).slice(0, 2), ["alert", "appliance"]);
  assert.deepEqual(kinds(house(), [raised("task")]).slice(0, 2), ["appliance", "alert"]);
});

test("a sensor put right is news for ten minutes, then gone", () => {
  const mended = raised("nominal", { at: 5000, began: 1000 });
  assert.equal(stories(house(), [mended], 6000).some((s) => s.kind === "recovered"), true);
  assert.equal(stories(house(), [mended], 5000 + RECOVERED).some((s) => s.kind === "recovered"), false);
});

test("a device that stops answering is a story, and is not counted as on or off", () => {
  const h = house({ "light.kitchen_ceiling": state("unavailable", { friendly_name: "Kitchen Ceiling" }) });
  const offline = stories(h, [], 2000).find((s) => s.kind === "offline")!;
  assert.equal(offline.vars.names, "Kitchen ceiling");
  assert.equal(stories(h, [], 2000).some((s) => s.kind === "dark"), true);
});

test("the remedies are the safe ones", () => {
  const h = house({ "lock.front_door": state("unlocked", { friendly_name: "Front door" }) });
  const press = Object.fromEntries(stories(h, [], 2000).filter((s) => s.press).map((s) => [s.kind, s.press]));
  assert.deepEqual(press.unlocked, { domain: "lock", service: "lock", ids: ["lock.front_door"] });
  assert.deepEqual(press.lights, { domain: "light", service: "turn_off", ids: ["light.kitchen_ceiling"] });
  assert.deepEqual(press.appliance, { domain: "switch", service: "turn_off", ids: ["switch.kettle"] });
});

const seen = (kind: string, at = 1000) => ({ id: "image." + kind, camera: "camera.shed", name: "Shed camera", room: "Shed", kind, at, photo: "/photo" });

test("a sighting is news with its photograph for ten minutes, a caller above what is left on and a cat below", () => {
  const h = { ...house(), sightings: ["animal", "doorbell", "person", "gust"].map((kind) => seen(kind)) };
  const told = stories(h, [], 2000);
  // A kind this page does not know (a newer integration's) is left out, not guessed at.
  assert.deepEqual(told.map((s) => (s.kind === "sighting" ? s.variant : s.kind)), ["doorbell", "person", "appliance", "animal", "lights", "cold", "weather"]);
  assert.deepEqual([told[0].photo, told[0].see, told[0].figure[1]], ["/photo", "camera.shed", "Shed camera"]);
  assert.equal(stories(h, [], 1000 + RECOVERED).some((s) => s.kind === "sighting"), false);
});

test("every voice can tell every story and describe every device, with nothing left unfilled", () => {
  const troubled = house({
    "lock.front_door": state("unlocked", { friendly_name: "Front door" }),
    "light.kitchen_counter": state("unavailable", { friendly_name: "Kitchen Counter" }),
    "cover.garage": state("open", { friendly_name: "Garage door", device_class: "garage", current_position: 40 }),
  });
  const alerts = ["critical", "error", "warning", "task", "nominal"].map((level, i) => raised(level, { entity_id: `sensor.s${i}`, escalated: i === 0, flavour: i ? "" : "temperature" }));
  const dark = house({ "light.kitchen_ceiling": state("off", { friendly_name: "Kitchen Ceiling" }) });
  const sights = { ...dark, sightings: ["alarm", "doorbell", "person", "vehicle", "animal"].map((kind) => seen(kind)) };
  const all = [...stories(troubled, alerts, 2000), ...stories(sights, [], 2000).filter((s) => s.kind === "sighting"), ...stories(dark, [], 2000), ...stories({ rooms: [], sightings: [], scenes: [], appliances: [] }, [], 2000), ...["freezing", "hot", "mild"].map((variant) => ({ ...stories(dark, [], 2000).find((s) => s.kind === "weather")!, variant }))];

  for (const [id, voice] of Object.entries(VOICES)) {
    for (const story of all) for (const turn of [0, 1, 2]) {
      const told = tell(voice, story, turn);
      assert.ok(told.head && told.deck, `${id} ${story.kind}`);
      assert.doesNotMatch(Object.values(told).join(" "), /[{}]|undefined/, `${id} ${story.kind}.${story.variant}`);
    }
    for (const d of [...troubled.rooms, ...dark.rooms].flatMap((r) => r.devices)) assert.doesNotMatch(words(voice, d), /[{}]|undefined|^$/, `${id} ${d.id}`);
  }
  assert.equal(tell(VOICES.tabloid, stories(troubled, alerts, 2000)[0], 0).head, "Meltdown!");
  // A sensor that is only on or off has no reading to quote, so none is quoted.
  const [fault] = stories(dark, [raised("error", { name: "Boiler fault", value: "on", unit: null, message: "Problem reported", area: null })], 2000);
  assert.deepEqual(fault.figure, ["Error", "Boiler fault"]);
  assert.equal(tell(VOICES.broadsheet, fault, 0).body, `The trouble in the house dates from ${fault.vars.since}.`);
  assert.equal(tell(VOICES.tabloid, fault, 0).deck, "Boiler fault: Problem reported");
  assert.match(tell(VOICES.broadsheet, stories(troubled, alerts, 2000)[0], 0).body, /worsened/);
});

test("a name with an owner takes no article, and a plural before a dash is still plural", () => {
  const device = (name: string, kind: "light" | "cover") => ({ id: "x", name, kind, on: true, away: false, since: 0, guarded: false, room: "Den" });
  assert.equal(words(VOICES.broadsheet, device("Ann's lamp", "light")), "ann's lamp is lit");
  assert.equal(words(VOICES.broadsheet, device("Blinds - left", "cover")), "the blinds - left are open");
});
