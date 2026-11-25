// Dash-Bored's view of the house: rooms and the devices in them, read from what every
// Home Assistant page already holds (areas, the entity and device lists, the states).
// In two steps, so that neither is done more often than it must be. `survey` reads the
// registries: which entities are shown, in which room. `read` reads the states of those
// entities alone.
import { choices, type Choice } from "./choices.ts";
import type { Hass } from "../ha.ts";

export type Kind = "light" | "switch" | "cover" | "lock" | "climate" | "media_player" | "camera" | "fan" | "valve" | "vacuum" | "lawn_mower" | "water_heater" | "humidifier" | "siren" | "alarm_control_panel";
export type Device = {
  id: string;
  name: string;
  kind: Kind;
  on: boolean; // each kind's own way of being on (ON below): a lock is when locked, a cover when not closed, a vacuum when cleaning, an alarm when set
  phase?: string; // a state between on and off that is worth its own words (PHASES): a vacuum returning, an alarm sounding
  level?: number; // in per cent (a light's brightness, a cover's position, a fan's speed, a target humidity) or degrees (DEGREES: a target temperature)
  dims: boolean; // its level can be set from the page: a dimmable light, a cover that takes a position, a thermostat's target, a player's volume
  span: Span; // what its level runs over
  temp?: number; // a thermostat's or a water heater's own reading
  title?: string; // what a player is playing
  picture?: string; // a camera's latest picture, as an address
  away: boolean; // unavailable
  since: number; // ms: when it came to this state
  guarded: boolean; // never operated by a tap on a sentence: see GUARDED
  room: string;
  // A camera that Casa Mia's app lists, where it has them (Lens below):
  zoom?: { id: string; level: number; span: Span }; // its zoom, while the number entity is answering
  presets?: Preset[]; // where it can be turned to
  controls?: Control[]; // what belongs with what it sees: a gate, a light
  choices?: Choice[]; // its settings that are a choice from a list (choices.ts): a mode, a source, an effect
};
/** A place a camera can be turned to, as the call that turns it there. */
export type Preset = { name: string; action: string; data: Record<string, unknown> };
/** Something that belongs with what a camera sees. One of the kinds a room shows is a
 * `device` like any other; anything else (a button, a script) is only pressed. */
export type Control = { id: string; name: string; away: boolean; device?: Device };
/** A camera as Casa Mia's app has it (its Cameras page), where that is installed: its
 * integration feeds them (family.ts). `entity` is the stream its tiles use, `medium` and
 * `high` its other streams, `zoom` a number entity. Such a camera is shown in place of
 * the one found in Home Assistant, under the title it was given there (owner, 2026-11-16). */
export type Lens = { entity: string; title: string; medium?: string; high?: string; zoom?: string; presets: Preset[]; controls: { entity: string; name: string }[] };
/** What a level runs over: its ends, the step of its scale, and what one vote in its poll moves it by. */
export type Span = { min: number; max: number; step: number; vote: number };
/** A scene: what it is called where it is shown (`name`, without its room's or its floor's
 * name), its whole name, and when Home Assistant last set it (ms; 0 if it never has). A
 * scene of the house's may be a floor's: `floor` is that floor's name. */
export type Scene = { id: string; name: string; full: string; at: number; floor?: string };
export type Room = { id: string; name: string; floor?: string; temp?: number; target?: number; humidity?: number; devices: Device[]; scenes: Scene[] };
export type Appliance = { id: string; name: string; room: string; kw: number };
/** Something a camera saw that was worth a photograph. `kind` is alarm, doorbell, person,
 * vehicle or animal; `photo` is its photograph's address. */
export type Sighting = { id: string; camera: string; name: string; room?: string; kind: string; at: number; photo?: string };
/** A sighting as the integration's feed tells it (sightings.py), its times in seconds:
 * `entity` is the camera's Last sighting entity, `changed` when its photograph last was. */
export type Seen = { id: string; entity: string; camera: string; kind: string; at: number; changed: number; photo: boolean; photo_url?: string };
/** One of the household: where Home Assistant has them ("home", "not_home", or the name
 * of a zone), and since when. */
export type Person = { id: string; name: string; place: string; since: number };
export type House = {
  rooms: Room[];
  strays: Device[]; // lights in no room: on no room's card, but in the house's count of lights (`lights` below)
  people: Person[];
  gaps: Gap[];
  scenes: Scene[]; // the house's own and its floors': a room's are with the room (`scenes` below is all of them)
  appliances: Appliance[];
  outside?: { temp: number; humidity?: number; sky: string; id: string; daily: boolean }; // sky: Home Assistant's word for the weather now; daily: its entity gives a forecast by the day
  kw?: number;
};
/** What Home Assistant doesn't know about the house, that an automatic dashboard needs:
 * devices in no area, areas on no floor (in a house that has floors), devices in one room
 * whose names shorten to the same thing, and rooms with nothing to tell their temperature.
 * `plumbing` is a guess: things shown as devices that by their names are settings or
 * indicators, each with the integration it comes from (`via`), since that is where it is
 * best put right. An item is an entity, or for `floorless` and `cold` an area. */
export type Gap = { kind: "loose" | "plumbing" | "clash" | "floorless" | "cold"; items: { id: string; name: string; via?: string }[] };
/** What a page is told about reading the house, all of it optional. A card's own: a
 * weather entity, a whole-house power sensor, and `floors` and `rooms`, which show only
 * those and in that order. The house's, set once in the integration and fed to every page
 * (settings.py): `floor_order` and `room_order`, which leave nothing out. A floor or a
 * room is named by its id or by its name. `entity`: that one entity and nothing else, for
 * a card that shows one (console/cards.ts). `cameras` is no option of a card's either: Casa
 * Mia's cameras, from its feed. `sample` is no option of a card's: an element
 * sets it for itself while Home Assistant's card picker shows it (family.ts), and the
 * house is then cut down to a specimen (`specimen` below). */
export type Options = { weather?: string; power?: string; floors?: string[]; rooms?: string[]; floor_order?: string[]; room_order?: string[]; reload_when_idle?: boolean; entity?: string; cameras?: Lens[]; sample?: boolean };

type Found = { id: string; kind: Kind; name: string; full: string; guarded: boolean; power?: string; lens?: Lens; controls?: { id: string; name: string; found?: Found }[] };
type FoundScene = { id: string; name: string; full: string; floor?: string };
type FoundRoom = { id: string; name: string; floor?: string; floorId?: string; level: number; temp?: string; humidity?: string; climate?: string; devices: Found[]; scenes: FoundScene[] };
type FoundSighting = { id: string; name: string; room?: string };
export type Survey = { rooms: FoundRoom[]; strays: Found[]; people: string[]; sightings: FoundSighting[]; gaps: Gap[]; scenes: FoundScene[]; weather?: string; power?: string; watched: string[] };

const FORECAST_DAILY = 1; // a weather entity's supported_features bit for a forecast by the day
/** A day of the forecast: its start, Home Assistant's word for its weather, and its high and low. */
export type Day = { at: number; sky: string; high: number; low?: number };
const DAYS = 4; // how many the pages print

/** The days of a forecast as Home Assistant's weather/subscribe_forecast sends it, the
 * first DAYS of those that have a temperature. */
export function days(forecast: unknown): Day[] {
  const list = Array.isArray(forecast) ? forecast : [];
  return list
    .filter((f) => typeof f?.temperature === "number" && Date.parse(f.datetime))
    .slice(0, DAYS)
    .map((f) => ({ at: Date.parse(f.datetime), sky: String(f.condition ?? ""), high: f.temperature, low: typeof f.templow === "number" ? f.templow : undefined }));
}

/** The id of the label that keeps a thing off these pages: on an entity, its device or
 * its area. The integration makes the label, "Dash-Bored hide" (const.py HIDE_LABEL). */
export const HIDE = "dash_bored_hide";
const OURS = "casa_mia_dash_bored"; // the integration: its image entities are the cameras that are photographed
// ponytail: names in English that mark a setting or an indicator, not a thing in a room.
// A guess, and only ever shown as one; a list per language if this is ever translated.
const PLUMBING = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i;
// What a thing is called when its name says no more than its room: "Kitchen" alone is "Light".
const NOUN: Partial<Record<Kind, string>> = { climate: "thermostat", media_player: "player", lawn_mower: "mower", water_heater: "water heater", alarm_control_panel: "alarm" };
/** The kinds whose level is a temperature, in degrees; every other level is in per cent. */
export const DEGREES: ReadonlySet<string> = new Set(["climate", "water_heater"]);
// These never move because a finger brushed a sentence, and to unlock, open or sound one
// takes two presses in its clipping: a lock, a valve (water or gas), a siren.
const GUARDED_KINDS = new Set(["lock", "valve", "siren"]);
// So are these classes of cover: a garage door, a gate, a door.
const GUARDED = new Set(["garage", "gate", "door"]);

/** "Kitchen Ceiling Light" in the kitchen is "Ceiling": the room and the kind of thing are
 * said by where it is shown. "Landing - Left" is "Left", and "Kitchen" alone is "Light". */
function short(name: string, room: string, kind: Kind): string {
  const rest = (after(name, room) ?? name).replace(kind === "light" ? /\s+lights?$/i : kind === "switch" ? /\s+switch$/i : /$^/, "");
  const noun = NOUN[kind] ?? kind;
  return capital(!rest || new RegExp(`^${noun}s?$`, "i").test(rest) ? noun : rest);
}
const capital = (word: string) => word[0].toUpperCase() + word.slice(1);

/** What is left of a name that begins with a place's name, less the punctuation between
 * them: nothing, if it does not begin with it. "Kitchenette lamp" is not in the kitchen:
 * the place's name must end where a word does. */
function after(name: string, place: string): string | undefined {
  const rest = name.slice(place.length);
  if (!place || !name.toLowerCase().startsWith(place.toLowerCase()) || /^[a-z0-9]/i.test(rest)) return undefined;
  return rest.replace(/^[\s\-–—:,.]+/, "");
}

export function survey(hass: Hass, options: Options): Survey {
  const rooms = new Map<string, FoundRoom>();
  const scenes: { id: string; name: string; area?: string }[] = [];
  const lenses = new Map<Found, { device: string; name: string }>(); // a camera -> its device, and that device's name
  const photographed = new Set<string>(); // the cameras whose sightings are photographed
  const people: string[] = [];
  const sightings: FoundSighting[] = [];
  const meters = new Map<string, string>(); // device id -> its power sensor
  const owner = new Map<Found, string>(); // a switch -> its device id
  let weather = options.weather;
  const loose: Gap["items"] = [];
  const strays: Found[] = [];
  const clash: Gap["items"] = [];
  const plumbing: Gap["items"] = [];
  const hidden = (thing?: { labels?: string[] }) => !!thing?.labels?.includes(HIDE);
  // Casa Mia's cameras, by each of their streams and by their device.
  const mine = new Map<string, Lens>();
  const lensed = new Map<string, Lens>();
  for (const cam of options.cameras ?? []) {
    for (const id of [cam.entity, cam.medium, cam.high]) if (id) mine.set(id, cam);
    const device = hass.entities?.[cam.entity]?.device_id;
    if (device) lensed.set(device, cam);
  }
  const guards = (domain: string, state: { attributes: Record<string, any> }) => GUARDED_KINDS.has(domain) || (domain === "cover" && GUARDED.has(state.attributes.device_class));

  for (const entry of Object.values<any>(hass.entities ?? {})) {
    const id: string = entry.entity_id;
    const state = hass.states[id];
    // A card for one entity reads that one alone. It was chosen by name, so it is shown
    // even where the rest of the house would leave it out: hidden, or in no room.
    const alone = id === options.entity;
    if (options.entity && !alone) continue;
    // Hidden, or a device's settings and diagnostics: not for a dashboard.
    if (!state || (!alone && (entry.hidden || entry.entity_category))) continue;

    const domain = id.split(".")[0];
    if (domain === "weather" && (!weather || id === "weather.home") && !options.weather) weather = id;
    if (domain === "sensor" && state.attributes.device_class === "power" && entry.device_id) meters.set(entry.device_id, id);

    const device = hass.devices?.[entry.device_id];
    const area = hass.areas?.[entry.area_id ?? device?.area_id];
    if (!alone && (hidden(entry) || hidden(device) || hidden(area))) continue;
    if (domain === "person") people.push(id);
    // A scene is kept off the page by the label as a device is: on itself or on its area.
    // (Until 2026.11.9-b9 the label did nothing on a scene.)
    if (domain === "scene") scenes.push({ id, name: state.attributes.friendly_name ?? entry.name ?? id, area: alone ? undefined : area?.area_id });
    // A sighting is named for its camera, and a camera kept off the page takes it along.
    if (domain === "image" && entry.platform === OURS && !hidden(hass.entities[state.attributes.camera])) {
      sightings.push({ id, name: device?.name_by_user ?? device?.name ?? id, room: area?.name });
      photographed.add(state.attributes.camera);
    }
    if (KINDS.has(domain)) {
      const name: string = state.attributes.friendly_name ?? entry.name ?? id;
      if (!area) loose.push({ id, name });
      // A light in no room is still a light on in the house: the Gazette once said 7 lights
      // were on when 8 were, and its button to turn them off left the eighth on.
      if (!area && !alone && domain === "light") strays.push({ id, kind: "light", name, full: name, guarded: false });
      if (PLUMBING.test(name)) plumbing.push({ id, name, via: entry.platform });
    }
    if (!KINDS.has(domain) || (!area && !alone)) continue;
    // One entity's card shows no room round it: a room of no name, with no sensors to watch.
    const at: string = alone ? "" : area.area_id;
    if (alone) rooms.set(at, { id: at, name: "", level: Infinity, devices: [], scenes: [] });
    if (!rooms.has(at)) {
      const floor = hass.floors?.[area.floor_id];
      rooms.set(at, { id: at, name: area.name, floor: floor?.name, floorId: floor?.floor_id, level: floor ? (floor.level ?? 0) : Infinity, temp: area.temperature_entity_id ?? undefined, humidity: area.humidity_entity_id ?? undefined, devices: [], scenes: [] });
    }
    const room = rooms.get(at)!;

    // A thermostat is a device in its room, and the first of them tells the room's temperature.
    if (domain === "climate") room.climate ??= id;
    const full: string = state.attributes.friendly_name ?? entry.name ?? id;
    const found: Found = {
      id,
      kind: domain as Kind,
      // Shown alone, a thing has no room's plate to say the rest of its name.
      name: alone ? full : short(full, area.name, domain as Kind),
      full,
      guarded: guards(domain, state),
    };
    room.devices.push(found);
    if (domain === "switch" && entry.device_id) owner.set(found, entry.device_id);
    if (domain === "camera" && device && !alone) lenses.set(found, { device: entry.device_id, name: device.name_by_user ?? device.name ?? full });
  }
  // A camera that sends several streams is several camera entities on one device (high,
  // medium and low resolution), and each was a screen: a room had three screens for each
  // camera (seen 2026-11-16). One is kept for each device, named for the device: the one
  // whose sightings are photographed (what it saw is told by that entity), or else the
  // stream Casa Mia's app uses, or else the first by its id.
  // ponytail: a device with two lenses that look at different things shows one of them.
  // If that is ever wanted, tell them apart by their stream's size, not by their names.
  const rank = (d: Found) => (photographed.has(d.id) ? 2 : 0) + (mine.get(d.id)?.entity === d.id ? 1 : 0);
  for (const room of rooms.values()) {
    const kept = new Map<string, Found>();
    for (const d of [...room.devices].sort((a, b) => a.id.localeCompare(b.id))) {
      const lens = lenses.get(d);
      if (!lens) continue;
      const was = kept.get(lens.device);
      if (!was || rank(d) > rank(was)) kept.set(lens.device, d);
    }
    const shared = new Set([...lenses].filter(([d, lens]) => kept.get(lens.device) !== d && room.devices.includes(d)).map(([, lens]) => lens.device));
    room.devices = room.devices.filter((d) => !lenses.has(d) || kept.get(lenses.get(d)!.device) === d);
    for (const device of shared) {
      const d = kept.get(device)!;
      d.full = lenses.get(d)!.name;
      d.name = short(d.full, room.name, "camera");
    }
    // A camera that Casa Mia's app lists is that camera: its title, and what goes with it.
    // A control is whatever entity was chosen for it, shown or not; one that is gone from
    // Home Assistant is left out.
    for (const d of room.devices) {
      const cam = d.kind === "camera" ? (mine.get(d.id) ?? lensed.get(lenses.get(d)?.device ?? "")) : undefined;
      if (!cam) continue;
      d.lens = cam;
      d.full = cam.title;
      d.name = short(cam.title, room.name, "camera");
      d.controls = cam.controls.flatMap((c) => {
        const state = hass.states[c.entity];
        if (!state) return [];
        const domain = c.entity.split(".")[0];
        const name: string = c.name || state.attributes.friendly_name || c.entity;
        return [{ id: c.entity, name, found: KINDS.has(domain) ? { id: c.entity, kind: domain as Kind, name, full: name, guarded: guards(domain, state) } : undefined }];
      });
    }
  }
  // A switch with a power sensor on the same device is a smart plug: its load is news.
  // A device with several switches is something else (a controller, a car), and its
  // power is not any one switch's: each of five once claimed the same 4.9 kW.
  const switches = new Map<string, number>();
  for (const device of owner.values()) switches.set(device, (switches.get(device) ?? 0) + 1);
  for (const [found, device] of owner) if (switches.get(device) === 1) found.power = meters.get(device);

  // Where a floor or a room stands in a list that names it by id or by name: last, if it doesn't.
  const place = (list: string[] | undefined, id?: string, name?: string) => {
    const at = (list ?? []).findIndex((x) => x === id || (!!name && x.toLowerCase() === name.toLowerCase()));
    return at < 0 ? Infinity : at;
  };
  const { floors, rooms: chosen } = options;
  const floorAt = (r: FoundRoom) => place(floors ?? options.floor_order, r.floorId, r.floor);
  const roomAt = (r: FoundRoom) => place(chosen ?? options.room_order, r.id, r.name);
  // The floors in the order asked for, then the rest from the lowest up, then the rooms on
  // no floor. On a floor, the rooms asked for first, then the rest by name. A difference
  // of two that are both unplaced is not a number, and falls through to the next.
  const kept = [...rooms.values()]
    .filter((r) => (r.devices.length || r.temp) && (!floors || floorAt(r) < Infinity) && (!chosen || roomAt(r) < Infinity))
    .sort((a, b) => floorAt(a) - floorAt(b) || a.level - b.level || (a.floor ?? "").localeCompare(b.floor ?? "") || roomAt(a) - roomAt(b) || a.name.localeCompare(b.name));
  for (const room of kept) {
    // Two devices that shorten to the same name ("Light" and "Light") keep their own.
    const times = new Map<string, number>();
    for (const d of room.devices) times.set(d.name, (times.get(d.name) ?? 0) + 1);
    for (const d of room.devices) {
      if (times.get(d.name)! === 1) continue;
      d.name = d.full;
      clash.push({ id: d.id, name: d.full });
    }
  }
  for (const room of kept) room.devices.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  // A scene is its room's if it is in that room's area or its name begins with the room's
  // name ("Kitchen - Dining" is the kitchen's "Dining"); or else its floor's, by its name
  // ("First floor all off"); or else the house's. The longest name that fits is the one:
  // "Barn Loft New" is the barn loft's, not the barn's. Why: on a big house the scenes were
  // one block at the top of the Console, over 2,000 px tall before the first room (measured 2026-11-16).
  const longest = <T>(list: T[], name: (item: T) => string) => [...list].sort((a, b) => name(b).length - name(a).length);
  const byName = longest(kept, (r) => r.name);
  const floorNames = longest([...new Set(kept.flatMap((r) => (r.floor ? [r.floor] : [])))], (f) => f);
  const housed: FoundScene[] = [];
  for (const s of scenes.sort((a, b) => a.name.localeCompare(b.name))) {
    const room = kept.find((r) => r.id === s.area) ?? byName.find((r) => after(s.name, r.name) !== undefined);
    const floor = room ? undefined : floorNames.find((f) => after(s.name, f) !== undefined);
    const rest = after(s.name, room?.name ?? floor ?? "");
    (room?.scenes ?? housed).push({ id: s.id, name: rest ? capital(rest) : s.name, full: s.name, floor });
  }
  // A card of chosen floors or rooms counts the lights in those alone.
  const loosed = floors || chosen ? [] : strays;
  const watched = kept.flatMap((r) => [r.temp, r.humidity, r.climate, ...r.devices.flatMap((d) => [d.id, d.power, d.lens?.zoom, ...(d.controls ?? []).map((c) => c.id)])]);
  const areas = (list: FoundRoom[]) => list.map((r) => ({ id: r.id, name: r.name }));
  const gaps: Gap[] = [
    { kind: "loose", items: loose },
    { kind: "plumbing", items: plumbing.sort((a, b) => (a.via ?? "").localeCompare(b.via ?? "") || a.name.localeCompare(b.name)) },
    { kind: "clash", items: clash },
    { kind: "floorless", items: kept.some((r) => r.floor) ? areas(kept.filter((r) => !r.floor)) : [] },
    { kind: "cold", items: areas(kept.filter((r) => !r.temp && !r.climate)) },
  ];
  const found: Survey = {
    rooms: kept,
    strays: loosed,
    people,
    sightings,
    gaps: gaps.filter((g) => g.items.length),
    scenes: housed,
    weather,
    power: options.power,
    // The one entity is watched whatever it is: a sensor is no device, but its card shows it.
    watched: [...new Set([...watched, ...loosed.map((d) => d.id), ...scenes.map((s) => s.id), ...people, weather, options.power, options.entity])].filter((id): id is string => !!id),
  };
  return options.sample ? specimen(found) : found;
}

const SPECIMEN = 4; // devices, and SCENES scenes, in the card picker's specimen
const SCENES = 2;
/** The house cut down to a specimen, for Home Assistant's card picker, which shows every
 * card at once in a narrow column: a whole house there was over 7,000 px tall for each
 * family (measured 2026-11-16). One room, the one with the most kinds of thing in it, and
 * SPECIMEN of its devices, one of each kind before a second of any. No gaps or sightings: a
 * specimen shows the look, not the house's news. */
function specimen(found: Survey): Survey {
  const kinds = (r: FoundRoom) => new Set(r.devices.map((d) => d.kind)).size;
  const room = found.rooms.reduce<FoundRoom | undefined>((best, r) => (!best || kinds(r) > kinds(best) ? r : best), undefined);
  if (!room) return found;

  const firsts = room.devices.filter((d, at) => room.devices.findIndex((o) => o.kind === d.kind) === at);
  const devices = [...firsts, ...room.devices.filter((d) => !firsts.includes(d))].slice(0, SPECIMEN);
  const scenes = found.scenes.filter((s) => !s.floor).slice(0, SCENES);
  const mine = room.scenes.slice(0, SCENES);
  const watched = [room.temp, room.humidity, room.climate, ...devices.flatMap((d) => [d.id, d.power]), ...[...scenes, ...mine].map((s) => s.id), ...found.people, found.weather, found.power];
  return { ...found, rooms: [{ ...room, devices, scenes: mine }], strays: [], sightings: [], gaps: [], scenes, watched: watched.filter((id): id is string => !!id) };
}

// Each kind's own way of being on, of having a level, and of letting it be set.
const is = (on: string) => (state: string) => state === on;
const not = (off: string) => (state: string) => state !== off;
const ON: Record<Kind, (state: string) => boolean> = {
  light: is("on"), switch: is("on"), lock: is("locked"), cover: not("closed"), climate: not("off"), media_player: is("playing"), camera: () => false,
  fan: is("on"), valve: not("closed"), vacuum: is("cleaning"), lawn_mower: is("mowing"), water_heater: not("off"), humidifier: is("on"), siren: is("on"),
  alarm_control_panel: (state) => state.startsWith("armed"),
};
const KINDS = new Set(Object.keys(ON));
// The states between on and off that a voice has words for.
const RESTING = ["docked", "returning", "paused", "error"];
const PHASES: Partial<Record<Kind, string[]>> = { vacuum: RESTING, lawn_mower: RESTING, alarm_control_panel: ["triggered", "pending", "arming"] };
// The attribute a level is read from, and how it becomes what the page tells.
const LEVEL: Partial<Record<Kind, [attribute: string, told: (raw: number) => number]>> = {
  light: ["brightness", (raw) => Math.round((raw / 255) * 100)],
  cover: ["current_position", (raw) => raw],
  climate: ["temperature", (raw) => raw],
  media_player: ["volume_level", (raw) => Math.round(raw * 100)],
  fan: ["percentage", (raw) => raw],
  valve: ["current_position", (raw) => raw],
  water_heater: ["temperature", (raw) => raw],
  humidifier: ["humidity", (raw) => raw],
};
/** Whether a kind has a level at all. */
export const levelled = (kind: Kind) => kind in LEVEL;
// A light with a colour mode other than on/off has a brightness. The numbers are Home
// Assistant's feature flags: a cover's SET_POSITION, a thermostat's and a water heater's
// TARGET_TEMPERATURE, a player's VOLUME_SET, a fan's SET_SPEED. A humidifier's target can
// always be set. (A valve is guarded, so its position is told and not set.)
const DIMS: Partial<Record<Kind, (attributes: Record<string, any>) => boolean>> = {
  light: (a) => (a.supported_color_modes ?? []).some((mode: string) => mode !== "onoff"),
  cover: (a) => !!(a.supported_features & 4),
  climate: (a) => !!(a.supported_features & 1),
  media_player: (a) => !!(a.supported_features & 4),
  fan: (a) => !!(a.supported_features & 1),
  water_heater: (a) => !!(a.supported_features & 1),
  humidifier: () => true,
};
const PER_CENT: Span = { min: 0, max: 100, step: 1, vote: 10 };
const SPAN: Partial<Record<Kind, (attributes: Record<string, any>) => Span>> = {
  climate: (a) => ({ min: a.min_temp ?? 7, max: a.max_temp ?? 35, step: a.target_temp_step ?? 0.5, vote: 0.5 }),
  water_heater: (a) => ({ min: a.min_temp ?? 30, max: a.max_temp ?? 70, step: a.target_temp_step ?? 1, vote: 1 }),
  humidifier: (a) => ({ min: a.min_humidity ?? 0, max: a.max_humidity ?? 100, step: 1, vote: 5 }),
  media_player: () => ({ ...PER_CENT, vote: 5 }),
};
const span = (kind: Kind, a: Record<string, any>): Span => SPAN[kind]?.(a) ?? PER_CENT;

/** How a device stands, by one of its states: the one it is in now, or one from its history. */
export function standing(kind: Kind, state?: { state: string; attributes: Record<string, any> }): { on: boolean; phase?: string; level?: number; away: boolean } {
  const away = !state || state.state === "unavailable";
  const on = !away && ON[kind](state.state);
  const [attribute, told] = LEVEL[kind] ?? [];
  const raw = attribute && state?.attributes[attribute];
  return { on, phase: state && PHASES[kind]?.includes(state.state) ? state.state : undefined, level: typeof raw === "number" && told ? told(raw) : undefined, away };
}

export function read(found: Survey, hass: Hass): House {
  const number = (id?: string) => {
    const state = id ? hass.states[id] : undefined;
    const value = Number(state?.state);
    return state && state.state !== "" && Number.isFinite(value) ? value : undefined;
  };
  // Watts or kilowatts, as kilowatts.
  const kilowatts = (id?: string) => {
    const value = number(id);
    return value === undefined ? undefined : hass.states[id!].attributes.unit_of_measurement === "kW" ? value : value / 1000;
  };
  const appliances: Appliance[] = [];
  // A camera's zoom is a number entity: its level and its span are that entity's own.
  const zoom = (id?: string): Device["zoom"] => {
    const level = number(id);
    const a = id ? (hass.states[id]?.attributes ?? {}) : {};
    return level === undefined ? undefined : { id: id!, level, span: { min: a.min ?? 0, max: a.max ?? 100, step: a.step ?? 1, vote: a.step ?? 1 } };
  };
  const device = (d: Found, room: string): Device => {
    const state = hass.states[d.id];
    const { on, phase, level, away } = standing(d.kind, state);
    const a = state?.attributes ?? {};
    // A guarded cover is not set from the page either.
    const dims = !d.guarded && !!DIMS[d.kind]?.(a);

    const kw = on ? kilowatts(d.power) : undefined;
    if (kw !== undefined && kw >= 1) appliances.push({ id: d.id, name: d.name, room, kw });
    return { id: d.id, name: d.name, kind: d.kind, on, phase, level, dims, span: span(d.kind, a), temp: DEGREES.has(d.kind) && typeof a.current_temperature === "number" ? a.current_temperature : undefined,
      title: d.kind === "media_player" && on ? [a.media_title, a.media_artist].filter(Boolean).join(", ") || undefined : undefined, picture: d.kind === "camera" ? a.entity_picture : undefined, away, since: Date.parse(state?.last_changed ?? "") || 0, guarded: d.guarded, room, choices: choices(d.kind, state),
      ...(d.lens ? { zoom: zoom(d.lens.zoom), presets: d.lens.presets, controls: (d.controls ?? []).map((c): Control => ({ id: c.id, name: c.name, away: (hass.states[c.id]?.state ?? "unavailable") === "unavailable", device: c.found && device(c.found, room) })) } : {}) };
  };

  // A scene's state is when Home Assistant last set it. One that is gone from the states is left out.
  const scene = (s: FoundScene): Scene[] => (hass.states[s.id] ? [{ ...s, at: Date.parse(hass.states[s.id].state) || 0 }] : []);
  const rooms = found.rooms.map((room): Room => {
    const climate = room.climate ? hass.states[room.climate] : undefined;
    const set = climate?.attributes.temperature;
    const devices = room.devices.map((d) => device(d, room.name));
    return {
      id: room.id,
      name: room.name,
      floor: room.floor,
      temp: number(room.temp) ?? (typeof climate?.attributes.current_temperature === "number" ? climate.attributes.current_temperature : undefined),
      // A thermostat that is off is asking for nothing.
      target: climate && climate.state !== "off" && typeof set === "number" ? set : undefined,
      humidity: number(room.humidity),
      devices,
      scenes: room.scenes.flatMap(scene),
    };
  });

  const sky = found.weather ? hass.states[found.weather] : undefined;
  // Somebody Home Assistant has lost sight of is in no place to announce.
  const people = found.people.flatMap((id): Person[] => {
    const state = hass.states[id];
    return state && state.state !== "unavailable" && state.state !== "unknown" ? [{ id, name: state.attributes.friendly_name ?? id, place: state.state, since: Date.parse(state.last_changed ?? "") || 0 }] : [];
  });
  return {
    rooms,
    strays: found.strays.map((d) => device(d, "")),
    people,
    gaps: found.gaps,
    scenes: found.scenes.flatMap(scene),
    appliances,
    outside: typeof sky?.attributes.temperature === "number" ? { temp: sky.attributes.temperature, humidity: sky.attributes.humidity, sky: sky.state, id: found.weather!, daily: !!(sky.attributes.supported_features & FORECAST_DAILY) } : undefined,
    kw: kilowatts(found.power),
  };
}

/** The feed's sightings as the page tells them: named for their camera, in its room. One
 * whose camera is kept off the page, or is no longer in the house, is left out. */
export function sighted(found: Survey, feed: Seen[]): Sighting[] {
  const cameras = new Map(found.sightings.map((s) => [s.id, s]));
  return feed.flatMap((s): Sighting[] => {
    const camera = cameras.get(s.entity);
    // Its address as the feed signed it for this login (the photographs need one); a
    // photograph replaced comes with a new one, so the browser fetches it.
    const photo = s.photo ? s.photo_url : undefined;
    return camera ? [{ id: s.id, camera: s.camera, name: camera.name, room: camera.room, kind: s.kind, at: s.at * 1000, photo }] : [];
  });
}

/** Every light in the house that is answering: those in its rooms, and those in none. */
export const lights = (house: House): Device[] => [...house.rooms.flatMap((r) => r.devices), ...house.strays].filter((d) => d.kind === "light" && !d.away);

/** Every scene in the house under its whole name: the house's, its floors' and its rooms'. */
export const scenes = (house: House): Scene[] => [...house.scenes, ...house.rooms.flatMap((r) => r.scenes)].map((s) => ({ ...s, name: s.full }));
