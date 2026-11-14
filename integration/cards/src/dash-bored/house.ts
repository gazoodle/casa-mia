// Dash-Bored's view of the house: rooms and the devices in them, read from what every
// Home Assistant page already holds (areas, the entity and device lists, the states).
// In two steps, so that neither is done more often than it must be. `survey` reads the
// registries: which entities are shown, in which room. `read` reads the states of those
// entities alone.
import type { Hass } from "../ha.ts";

export type Kind = "light" | "switch" | "cover" | "lock";
export type Device = {
  id: string;
  name: string;
  kind: Kind;
  on: boolean; // a lock is on when locked, a cover when not closed
  level?: number; // per cent: a light's brightness, a cover's position
  dims: boolean; // its level can be set from the page: a dimmable light, a cover that takes a position
  away: boolean; // unavailable
  since: number; // ms: when it came to this state
  guarded: boolean; // never operated by a tap on a sentence: see GUARDED
  room: string;
};
export type Room = { id: string; name: string; floor?: string; temp?: number; target?: number; humidity?: number; devices: Device[] };
export type Appliance = { id: string; name: string; room: string; kw: number };
/** Something a camera saw that was worth a photograph. `kind` is alarm, doorbell, person,
 * vehicle or animal; `photo` is its photograph's address. */
export type Sighting = { id: string; camera: string; name: string; room?: string; kind: string; at: number; photo?: string };
/** A sighting as the integration's feed tells it (sightings.py), its times in seconds:
 * `entity` is the camera's Last sighting entity, `changed` when its photograph last was. */
export type Seen = { id: string; entity: string; camera: string; kind: string; at: number; changed: number; photo: boolean };
export type House = {
  rooms: Room[];
  gaps: Gap[];
  scenes: { id: string; name: string }[];
  appliances: Appliance[];
  outside?: { temp: number; humidity?: number };
  kw?: number;
};
/** What Home Assistant doesn't know about the house, that an automatic dashboard needs:
 * devices in no area, areas on no floor (in a house that has floors), devices in one room
 * whose names shorten to the same thing, and rooms with nothing to tell their temperature.
 * `plumbing` is a guess: things shown as devices that by their names are settings or
 * indicators, each with the integration it comes from (`via`), since that is where it is
 * best put right. An item is an entity, or for `floorless` and `cold` an area. */
export type Gap = { kind: "loose" | "plumbing" | "clash" | "floorless" | "cold"; items: { id: string; name: string; via?: string }[] };
/** The card's options: a weather entity and a whole-house power sensor, both optional. */
export type Options = { weather?: string; power?: string };

type Found = { id: string; kind: Kind; name: string; full: string; guarded: boolean; power?: string };
type FoundRoom = { id: string; name: string; floor?: string; level: number; temp?: string; humidity?: string; climate?: string; devices: Found[] };
type FoundSighting = { id: string; name: string; room?: string };
export type Survey = { rooms: FoundRoom[]; sightings: FoundSighting[]; gaps: Gap[]; scenes: string[]; weather?: string; power?: string; watched: string[] };

/** The id of the label that keeps a thing off these pages: on an entity, its device or
 * its area. The integration makes the label, "Dash-Bored hide" (const.py HIDE_LABEL). */
export const HIDE = "dash_bored_hide";
const OURS = "casa_mia_dash_bored"; // the integration: its image entities are the cameras that are photographed
// ponytail: names in English that mark a setting or an indicator, not a thing in a room.
// A guess, and only ever shown as one; a list per language if this is ever translated.
const PLUMBING = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i;
const KINDS = new Set(["light", "switch", "cover", "lock"]);
// A lock, a garage door or a gate must not move because a finger brushed a sentence.
// These open Home Assistant's own dialog instead.
const GUARDED = new Set(["garage", "gate", "door"]);

/** "Kitchen Ceiling Light" in the kitchen is "Ceiling": the room and the kind of thing are
 * said by where it is shown. "Landing - Left" is "Left", and "Kitchen" alone is "Light". */
function short(name: string, room: string, kind: Kind): string {
  const after = name.slice(room.length);
  // "Kitchenette lamp" is not in the kitchen: the room's name must end where a word does.
  const inRoom = name.toLowerCase().startsWith(room.toLowerCase()) && !/^[a-z0-9]/i.test(after);
  const rest = (inRoom ? after.replace(/^[\s\-–—:,.]+/, "") : name).replace(kind === "light" ? /\s+lights?$/i : kind === "switch" ? /\s+switch$/i : /$^/, "");
  const left = !rest || new RegExp(`^${kind}s?$`, "i").test(rest) ? kind : rest;
  return left[0].toUpperCase() + left.slice(1);
}

export function survey(hass: Hass, options: Options): Survey {
  const rooms = new Map<string, FoundRoom>();
  const scenes: string[] = [];
  const sightings: FoundSighting[] = [];
  const meters = new Map<string, string>(); // device id -> its power sensor
  const owner = new Map<Found, string>(); // a switch -> its device id
  let weather = options.weather;
  const loose: Gap["items"] = [];
  const clash: Gap["items"] = [];
  const plumbing: Gap["items"] = [];
  const hidden = (thing?: { labels?: string[] }) => !!thing?.labels?.includes(HIDE);

  for (const entry of Object.values<any>(hass.entities ?? {})) {
    const id: string = entry.entity_id;
    const state = hass.states[id];
    // Hidden, or a device's settings and diagnostics: not for a dashboard.
    if (!state || entry.hidden || entry.entity_category) continue;

    const domain = id.split(".")[0];
    if (domain === "scene") scenes.push(id);
    if (domain === "weather" && (!weather || id === "weather.home") && !options.weather) weather = id;
    if (domain === "sensor" && state.attributes.device_class === "power" && entry.device_id) meters.set(entry.device_id, id);

    const device = hass.devices?.[entry.device_id];
    const area = hass.areas?.[entry.area_id ?? device?.area_id];
    if (hidden(entry) || hidden(device) || hidden(area)) continue;
    // A sighting is named for its camera, and a camera kept off the page takes it along.
    if (domain === "image" && entry.platform === OURS && !hidden(hass.entities[state.attributes.camera]))
      sightings.push({ id, name: device?.name_by_user ?? device?.name ?? id, room: area?.name });
    if (KINDS.has(domain)) {
      const name: string = state.attributes.friendly_name ?? entry.name ?? id;
      if (!area) loose.push({ id, name });
      if (PLUMBING.test(name)) plumbing.push({ id, name, via: entry.platform });
    }
    if (!area || (domain !== "climate" && !KINDS.has(domain))) continue;
    if (!rooms.has(area.area_id)) {
      const floor = hass.floors?.[area.floor_id];
      rooms.set(area.area_id, { id: area.area_id, name: area.name, floor: floor?.name, level: floor ? (floor.level ?? 0) : Infinity, temp: area.temperature_entity_id ?? undefined, humidity: area.humidity_entity_id ?? undefined, devices: [] });
    }
    const room = rooms.get(area.area_id)!;

    if (domain === "climate") room.climate ??= id;
    else {
      const full: string = state.attributes.friendly_name ?? entry.name ?? id;
      const found: Found = {
        id,
        kind: domain as Kind,
        name: short(full, area.name, domain as Kind),
        full,
        guarded: domain === "lock" || GUARDED.has(state.attributes.device_class),
      };
      room.devices.push(found);
      if (domain === "switch" && entry.device_id) owner.set(found, entry.device_id);
    }
  }
  // A switch with a power sensor on the same device is a smart plug: its load is news.
  // A device with several switches is something else (a controller, a car), and its
  // power is not any one switch's: each of five once claimed the same 4.9 kW.
  const switches = new Map<string, number>();
  for (const device of owner.values()) switches.set(device, (switches.get(device) ?? 0) + 1);
  for (const [found, device] of owner) if (switches.get(device) === 1) found.power = meters.get(device);

  // By floor from the lowest up, then the rooms that are on no floor.
  const kept = [...rooms.values()].filter((r) => r.devices.length || r.temp).sort((a, b) => a.level - b.level || (a.floor ?? "").localeCompare(b.floor ?? "") || a.name.localeCompare(b.name));
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
  const watched = kept.flatMap((r) => [r.temp, r.humidity, r.climate, ...r.devices.flatMap((d) => [d.id, d.power])]);
  const areas = (list: FoundRoom[]) => list.map((r) => ({ id: r.id, name: r.name }));
  const gaps: Gap[] = [
    { kind: "loose", items: loose },
    { kind: "plumbing", items: plumbing.sort((a, b) => (a.via ?? "").localeCompare(b.via ?? "") || a.name.localeCompare(b.name)) },
    { kind: "clash", items: clash },
    { kind: "floorless", items: kept.some((r) => r.floor) ? areas(kept.filter((r) => !r.floor)) : [] },
    { kind: "cold", items: areas(kept.filter((r) => !r.temp && !r.climate)) },
  ];
  return {
    rooms: kept,
    sightings,
    gaps: gaps.filter((g) => g.items.length),
    scenes: scenes.sort(),
    weather,
    power: options.power,
    watched: [...watched, ...scenes, weather, options.power].filter((id): id is string => !!id),
  };
}

/** How a device stands, by one of its states: the one it is in now, or one from its history. */
export function standing(kind: Kind, state?: { state: string; attributes: Record<string, any> }): { on: boolean; level?: number; away: boolean } {
  const away = !state || state.state === "unavailable";
  const on = !away && (kind === "lock" ? state.state === "locked" : kind === "cover" ? state.state !== "closed" : state.state === "on");
  const raw = kind === "light" ? state?.attributes.brightness : kind === "cover" ? state?.attributes.current_position : undefined;
  const level = typeof raw !== "number" ? undefined : kind === "light" ? Math.round((raw / 255) * 100) : raw;
  return { on, level, away };
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

  const rooms = found.rooms.map((room): Room => {
    const climate = room.climate ? hass.states[room.climate] : undefined;
    const set = climate?.attributes.temperature;
    const devices = room.devices.map((d): Device => {
      const state = hass.states[d.id];
      const { on, level, away } = standing(d.kind, state);
      // A light with a colour mode other than on/off has a brightness; 4 is a cover's
      // SET_POSITION feature. A guarded cover is not set from the page either.
      const modes: string[] = state?.attributes.supported_color_modes ?? [];
      const dims = !d.guarded && (d.kind === "light" ? modes.some((mode) => mode !== "onoff") : d.kind === "cover" && !!(state?.attributes.supported_features & 4));

      const kw = on ? kilowatts(d.power) : undefined;
      if (kw !== undefined && kw >= 1) appliances.push({ id: d.id, name: d.name, room: room.name, kw });
      return { id: d.id, name: d.name, kind: d.kind, on, level, dims, away, since: Date.parse(state?.last_changed ?? "") || 0, guarded: d.guarded, room: room.name };
    });
    return {
      id: room.id,
      name: room.name,
      floor: room.floor,
      temp: number(room.temp) ?? (typeof climate?.attributes.current_temperature === "number" ? climate.attributes.current_temperature : undefined),
      // A thermostat that is off is asking for nothing.
      target: climate && climate.state !== "off" && typeof set === "number" ? set : undefined,
      humidity: number(room.humidity),
      devices,
    };
  });

  const sky = found.weather ? hass.states[found.weather] : undefined;
  return {
    rooms,
    gaps: found.gaps,
    scenes: found.scenes.filter((id) => hass.states[id]).map((id) => ({ id, name: hass.states[id].attributes.friendly_name ?? id })),
    appliances,
    outside: typeof sky?.attributes.temperature === "number" ? { temp: sky.attributes.temperature, humidity: sky.attributes.humidity } : undefined,
    kw: kilowatts(found.power),
  };
}

/** The feed's sightings as the page tells them: named for their camera, in its room. One
 * whose camera is kept off the page, or is no longer in the house, is left out. */
export function sighted(found: Survey, feed: Seen[]): Sighting[] {
  const cameras = new Map(found.sightings.map((s) => [s.id, s]));
  return feed.flatMap((s): Sighting[] => {
    const camera = cameras.get(s.entity);
    // A photograph that is replaced keeps its address: `changed` makes the browser fetch the new one.
    const photo = s.photo ? `/api/${OURS}/photo/${s.id}?v=${s.changed}` : undefined;
    return camera ? [{ id: s.id, camera: s.camera, name: camera.name, room: camera.room, kind: s.kind, at: s.at * 1000, photo }] : [];
  });
}
