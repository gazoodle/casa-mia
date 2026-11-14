import assert from "node:assert/strict";
import { test } from "node:test";
import { read, survey } from "./house.ts";
import { RECOVERED, flip, personal, setting, stories, type Alert } from "./stories.ts";
import { VOICES, announce, clause, poll, tell, words } from "./voices.ts";

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
    "climate.kitchen": state("heat", { friendly_name: "Kitchen Thermostat", temperature: 21, current_temperature: 19.5 }),
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
  assert.deepEqual(kitchen.devices.map((d) => [d.name, d.kind, d.on, d.level]), [["Thermostat", "climate", true, 21], ["Ceiling", "light", true, 80], ["Counter", "light", false, undefined], ["Kettle", "switch", true, undefined]]);
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
  assert.deepEqual(kinds({ rooms: [], scenes: [], appliances: [] }), ["quiet"]);
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

const seen = (kind: string, at = 1000, camera = "camera." + kind) => ({ id: `${camera}.${at}`, camera, name: "Shed camera", room: "Shed", kind, at, photo: "/photo" });

test("a sighting is news with its photograph for ten minutes, a caller above what is left on and a cat below", () => {
  // A kind this page does not know (a newer integration's) is left out, not guessed at.
  const told = stories(house(), [], 2000, ["animal", "doorbell", "person", "gust"].map((kind) => seen(kind)));
  assert.deepEqual(told.map((s) => (s.kind === "sighting" ? s.variant : s.kind)), ["doorbell", "person", "appliance", "animal", "lights", "cold", "weather"]);
  assert.deepEqual([told[0].photo, told[0].see, told[0].figure[1]], ["/photo", "camera.doorbell", "Shed camera"]);
  assert.equal(stories(house(), [], 1000 + RECOVERED, [seen("person")]).some((s) => s.kind === "sighting"), false);
});

test("a camera has one story: the most pressing thing it saw, and of those the latest", () => {
  const told = (sightings: ReturnType<typeof seen>[]) => stories(house(), [], 5000, sightings).filter((s) => s.kind === "sighting").map((s) => [s.variant, s.vars.at, s.see]);
  const at = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
  // The animal a camera reports after a person does not take the person's place.
  assert.deepEqual(told([seen("person", 1000, "camera.a"), seen("animal", 3000, "camera.a")]), [["person", at(1000), "camera.a"]]);
  // Two people on one camera are the later one; two cameras are two stories, the newest first.
  assert.deepEqual(told([seen("person", 1000, "camera.a"), seen("person", 2000, "camera.a"), seen("person", 4000, "camera.b")]).map((s) => s[2]), ["camera.b", "camera.a"]);
  assert.equal(stories(house(), [], 5000, [seen("person", 1000, "camera.a"), seen("person", 2000, "camera.a")]).find((s) => s.kind === "sighting")!.id, "sighting.camera.a");
});

test("every voice can tell every story and describe every device, with nothing left unfilled", () => {
  const troubled = house({
    "lock.front_door": state("unlocked", { friendly_name: "Front door" }),
    "light.kitchen_counter": state("unavailable", { friendly_name: "Kitchen Counter" }),
    "cover.garage": state("open", { friendly_name: "Garage door", device_class: "garage", current_position: 40 }),
  });
  const alerts = ["critical", "error", "warning", "task", "nominal"].map((level, i) => raised(level, { entity_id: `sensor.s${i}`, escalated: i === 0, flavour: i ? "" : "temperature" }));
  const dark = house({ "light.kitchen_ceiling": state("off", { friendly_name: "Kitchen Ceiling" }) });
  const sights = ["alarm", "doorbell", "person", "vehicle", "animal"].map((kind) => seen(kind));
  const all = [...stories(troubled, alerts, 2000), ...stories(dark, [], 2000, sights).filter((s) => s.kind === "sighting"), ...stories(dark, [], 2000), ...stories({ rooms: [], scenes: [], appliances: [] }, [], 2000), ...["freezing", "hot", "mild"].map((variant) => ({ ...stories(dark, [], 2000).find((s) => s.kind === "weather")!, variant }))];

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
  const device = (name: string, kind: "light" | "cover") => ({ id: "x", name, kind, on: true, dims: false, span: { min: 0, max: 100, step: 1, vote: 10 }, away: false, since: 0, guarded: false, room: "Den" });
  assert.equal(words(VOICES.broadsheet, device("Ann's lamp", "light")), "ann's lamp is lit");
  assert.equal(words(VOICES.broadsheet, device("Blinds - left", "cover")), "the blinds - left are open");
});

test("a level can be set on a dimmable light and a cover that takes a position, and never on a guarded one", () => {
  const h = house({
    "light.kitchen_ceiling": state("on", { friendly_name: "Kitchen Ceiling", brightness: 204, supported_color_modes: ["brightness"] }),
    "light.kitchen_counter": state("off", { friendly_name: "Kitchen Counter", supported_color_modes: ["onoff"] }),
    "cover.garage": state("open", { friendly_name: "Garage door", device_class: "garage", supported_features: 15, current_position: 100 }),
  });
  const [ceiling, counter] = h.rooms[1].devices.filter((d) => d.kind === "light");
  assert.deepEqual([ceiling.dims, counter.dims, h.rooms[0].devices[0].dims], [true, false, false]);

  // The level is the clause's own piece, in each paper's way of saying it.
  assert.deepEqual(clause(VOICES.broadsheet, ceiling), ["the ceiling light burns at ", "80 per cent", ""]);
  assert.deepEqual(clause(VOICES.tabloid, { ...ceiling, kind: "cover", name: "Blind", level: 30 }), ["blind ", "30%", " open"]);
  assert.deepEqual(clause(VOICES.broadsheet, counter), ["the counter light is out", "", ""]);
  // Every paper has a poll for each kind that has a level.
  assert.equal(poll(VOICES.broadsheet, ceiling).ask, "Readers are invited to say whether the ceiling light is too bright.");
  for (const voice of Object.values(VOICES)) for (const kind of ["light", "cover"] as const) assert.ok(poll(voice, { ...ceiling, kind }).less);

  assert.deepEqual(setting(ceiling, 40), { domain: "light", service: "turn_on", ids: ["light.kitchen_ceiling"], data: { brightness_pct: 40 } });
  assert.deepEqual(setting(ceiling, 0), { domain: "light", service: "turn_off", ids: ["light.kitchen_ceiling"] });
  assert.deepEqual(setting({ ...ceiling, kind: "cover", id: "cover.blind" }, 0), { domain: "cover", service: "set_cover_position", ids: ["cover.blind"], data: { position: 0 } });
});

test("a device is put the other way by its own kind of call, and every paper has a word for each", () => {
  const [garage, front] = house().rooms[0].devices;
  const [ceiling, counter] = house().rooms[1].devices.filter((d) => d.kind === "light");
  assert.deepEqual([front, garage, ceiling, counter].map((d) => flip(d).service), ["unlock", "open_cover", "turn_off", "turn_on"]);
  assert.deepEqual(flip({ ...front, on: false }), { domain: "lock", service: "lock", ids: ["lock.front_door"] });
  for (const voice of Object.values(VOICES)) for (const kind of ["light", "switch", "cover", "lock"]) for (const state of ["on", "off"]) assert.ok(voice.acts[`${kind}.${state}`]);
});

test("a thermostat, a player and a camera are devices in their rooms, each with its own level and calls", () => {
  const h = hass({
    "climate.kitchen": state("heat", { friendly_name: "Kitchen Thermostat", temperature: 21, current_temperature: 19.5, supported_features: 1, min_temp: 7, max_temp: 30 }),
    "media_player.kitchen": state("playing", { friendly_name: "Kitchen Radio", volume_level: 0.4, supported_features: 4, media_title: "Night Train", media_artist: "The Sleepers" }),
    "camera.kitchen": state("idle", { friendly_name: "Kitchen Camera", entity_picture: "/api/camera_proxy/camera.kitchen?token=x" }),
  });
  for (const id of ["media_player.kitchen", "camera.kitchen"]) (h.entities as Record<string, object>)[id] = { entity_id: id, area_id: "kitchen" };
  const kitchen = read(survey(h, {}), h).rooms[1];
  const by = Object.fromEntries(kitchen.devices.map((d) => [d.kind, d]));

  assert.deepEqual([by.climate.name, by.climate.on, by.climate.level, by.climate.temp, by.climate.dims], ["Thermostat", true, 21, 19.5, true]);
  assert.deepEqual(by.climate.span, { min: 7, max: 30, step: 0.5, vote: 0.5 });
  assert.deepEqual(clause(VOICES.broadsheet, by.climate), ["the thermostat is set to ", "21°", ""]);
  assert.deepEqual(setting(by.climate, 20.5), { domain: "climate", service: "set_temperature", ids: ["climate.kitchen"], data: { temperature: 20.5 } });
  // The room's own temperature still comes from its sensor, and its target from the thermostat.
  assert.deepEqual([kitchen.temp, kitchen.target], [19.6, 21]);

  assert.deepEqual([by.media_player.name, by.media_player.on, by.media_player.level, by.media_player.title, by.media_player.span.vote], ["Radio", true, 40, "Night Train, The Sleepers", 5]);
  assert.equal(words(VOICES.tabloid, by.media_player), "radio BLARING at 40%");
  assert.deepEqual(setting(by.media_player, 35).data, { volume_level: 0.35 });
  assert.equal(flip(by.media_player).service, "media_pause");

  assert.deepEqual([by.camera.on, by.camera.dims, by.camera.picture], [false, false, "/api/camera_proxy/camera.kitchen?token=x"]);
  assert.equal(words(VOICES.broadsheet, by.camera), "the camera keeps watch");
  assert.equal(words(VOICES.broadsheet, { ...by.camera, name: "Entrance" }), "the entrance camera keeps watch");
  // Every paper words every kind, on and off, and has a poll for each that has a level.
  for (const voice of Object.values(VOICES)) {
    // A camera is never on.
    for (const d of kitchen.devices) for (const on of d.kind === "camera" ? [false] : [true, false]) assert.ok(words(voice, { ...d, on }), `${d.kind} ${on}`);
    for (const kind of ["climate", "media_player"] as const) assert.ok(poll(voice, { ...by[kind], kind }).ask);
  }
});

test("the Personal column: each person's latest coming or going and the songs rated, newest first, for twelve hours", () => {
  const person = (place: string, at: string, friendly_name: string) => ({ state: place, attributes: { friendly_name }, last_changed: at });
  const h = hass({
    "person.ann": person("home", "2026-11-13T18:02:00Z", "Ann"),
    "person.ben": person("not_home", "2026-11-13T08:15:00Z", "Ben"),
    "person.cat": person("Work", "2026-11-13T09:00:00Z", "Cat"),
    "person.dan": person("unknown", "2026-11-13T17:00:00Z", "Dan"),
  });
  for (const id of ["person.ann", "person.ben", "person.cat", "person.dan"]) (h.entities as Record<string, object>)[id] = { entity_id: id };
  const people = read(survey(h, {}), h).people;
  assert.deepEqual(people.map((p) => p.name), ["Ann", "Ben", "Cat"]);

  const at = (time: string) => Date.parse(time) / 1000;
  const rated = [
    { kind: "love" as const, name: "Ann", title: "Night Train", artist: "The Sleepers", at: at("2026-11-13T18:30:00Z") },
    { kind: "loathe" as const, name: "Ben", title: "Old Song", artist: "", at: at("2026-11-13T12:00:00Z") },
  ];
  // At 19:00 Ben's leaving at 08:15 is nearly eleven hours old, and still in; at 21:00 it has gone.
  const column = personal(people, rated, Date.parse("2026-11-13T19:00:00Z"));
  assert.deepEqual(column.map((n) => announce(VOICES.broadsheet, n)), [
    "Ann wishes it known that “Night Train” by The Sleepers is greatly to their liking.",
    "Ann has arrived home.",
    "Ben begs that “Old Song” be played no more.",
    "Cat has arrived at Work.",
    "Ben has left the house.",
  ]);
  assert.equal(personal(people, rated, Date.parse("2026-11-13T21:00:00Z")).length, 3);
  for (const voice of Object.values(VOICES)) for (const n of column) assert.ok(announce(voice, n));
});

test("fans, valves, robots, water heaters, humidifiers, sirens and alarms are devices too, each in its own way", () => {
  const things: Record<string, ReturnType<typeof state>> = {
    "fan.hall": state("on", { friendly_name: "Hall Fan", percentage: 60, supported_features: 1 }),
    "valve.hall": state("open", { friendly_name: "Hall Sprinkler", current_position: 50, supported_features: 7 }),
    "vacuum.hall": state("docked", { friendly_name: "Hall Vacuum" }),
    "lawn_mower.hall": state("mowing", { friendly_name: "Hall Mower" }),
    "water_heater.hall": state("eco", { friendly_name: "Hall Cylinder", temperature: 55, current_temperature: 48, supported_features: 1, min_temp: 40, max_temp: 65 }),
    "humidifier.hall": state("on", { friendly_name: "Hall Humidifier", humidity: 45, min_humidity: 30, max_humidity: 70 }),
    "siren.hall": state("off", { friendly_name: "Hall Siren" }),
    "alarm_control_panel.hall": state("triggered", { friendly_name: "Security" }),
  };
  const h = hass(things);
  for (const id of Object.keys(things)) (h.entities as Record<string, object>)[id] = { entity_id: id, area_id: "hall" };
  const house = read(survey(h, {}), h);
  const by = Object.fromEntries(house.rooms[0].devices.map((d) => [d.kind, d]));
  const said = (kind: string) => words(VOICES.broadsheet, by[kind]);

  // A fan and a humidifier are like a light: on or off, with a level that can be set.
  assert.deepEqual([by.fan.on, by.fan.level, by.fan.dims, said("fan")], [true, 60, true, "the fan turns at 60 per cent"]);
  assert.deepEqual(setting(by.fan, 30), { domain: "fan", service: "set_percentage", ids: ["fan.hall"], data: { percentage: 30 } });
  assert.deepEqual([by.humidifier.level, by.humidifier.dims, by.humidifier.span], [45, true, { min: 30, max: 70, step: 1, vote: 5 }]);
  assert.deepEqual(setting(by.humidifier, 50).data, { humidity: 50 });

  // A water heater is like a thermostat: its level is a temperature.
  assert.deepEqual([by.water_heater.on, by.water_heater.temp, by.water_heater.span.vote, said("water_heater")], [true, 48, 1, "the cylinder is set to 55°"]);
  assert.deepEqual(setting(by.water_heater, 60), { domain: "water_heater", service: "set_temperature", ids: ["water_heater.hall"], data: { temperature: 60 } });

  // A valve and a siren are guarded, as a garage door is: told, and never set by a scale.
  assert.deepEqual([by.valve.guarded, by.valve.dims, said("valve"), flip(by.valve).service], [true, false, "the sprinkler stands 50 per cent open", "close_valve"]);
  assert.deepEqual([by.siren.guarded, said("siren"), flip(by.siren).service], [true, "the siren is silent", "turn_on"]);

  // A robot's phases have words of their own.
  assert.deepEqual([by.vacuum.on, by.vacuum.phase, said("vacuum"), flip(by.vacuum).service], [false, "docked", "the vacuum is docked", "start"]);
  assert.deepEqual([by.lawn_mower.on, said("lawn_mower"), flip(by.lawn_mower).service], [true, "the mower is mowing", "dock"]);

  // An alarm that is sounding leads the paper, and no paper has a button for an alarm.
  assert.equal(said("alarm_control_panel"), "the security alarm is sounding");
  const lead = stories(house, [], 0)[0];
  assert.deepEqual([lead.kind, tell(VOICES.broadsheet, lead, 0).head], ["triggered", "The alarm is sounding"]);

  for (const voice of Object.values(VOICES)) {
    for (const d of Object.values(by)) {
      for (const phase of [undefined, "docked", "returning", "paused", "error", "triggered", "pending", "arming"]) for (const on of [true, false]) assert.ok(words(voice, { ...d, on, phase }), `${d.kind} ${on} ${phase}`);
      if (d.dims) assert.ok(poll(voice, d).ask, d.kind);
      assert.equal(`${d.kind}.on` in voice.acts && `${d.kind}.off` in voice.acts, d.kind !== "alarm_control_panel", d.kind);
    }
    assert.ok(tell(voice, lead, 0).deck);
  }
});
