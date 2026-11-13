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
  away: boolean; // unavailable
  since: number; // ms: when it came to this state
  guarded: boolean; // never operated by a tap on a sentence: see GUARDED
  room: string;
};
export type Room = { id: string; name: string; floor?: string; temp?: number; target?: number; humidity?: number; devices: Device[] };
export type Appliance = { id: string; name: string; room: string; kw: number };
export type House = {
  rooms: Room[];
  scenes: { id: string; name: string }[];
  appliances: Appliance[];
  outside?: { temp: number; humidity?: number };
  kw?: number;
};
/** The card's options: a weather entity and a whole-house power sensor, both optional. */
export type Options = { weather?: string; power?: string };

type Found = { id: string; kind: Kind; name: string; full: string; guarded: boolean; power?: string };
type FoundRoom = { id: string; name: string; floor?: string; level: number; temp?: string; humidity?: string; climate?: string; devices: Found[] };
export type Survey = { rooms: FoundRoom[]; scenes: string[]; weather?: string; power?: string; watched: string[] };

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
  const meters = new Map<string, string>(); // device id -> its power sensor
  const owner = new Map<Found, string>(); // a switch -> its device id
  let weather = options.weather;

  for (const entry of Object.values<any>(hass.entities ?? {})) {
    const id: string = entry.entity_id;
    const state = hass.states[id];
    // Hidden, or a device's settings and diagnostics: not for a dashboard.
    if (!state || entry.hidden || entry.entity_category) continue;

    const domain = id.split(".")[0];
    if (domain === "scene") scenes.push(id);
    if (domain === "weather" && (!weather || id === "weather.home") && !options.weather) weather = id;
    if (domain === "sensor" && state.attributes.device_class === "power" && entry.device_id) meters.set(entry.device_id, id);

    const area = hass.areas?.[entry.area_id ?? hass.devices?.[entry.device_id]?.area_id];
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
    for (const d of room.devices) if (times.get(d.name)! > 1) d.name = d.full;
  }
  for (const room of kept) room.devices.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  const watched = kept.flatMap((r) => [r.temp, r.humidity, r.climate, ...r.devices.flatMap((d) => [d.id, d.power])]);
  return {
    rooms: kept,
    scenes: scenes.sort(),
    weather,
    power: options.power,
    watched: [...watched, ...scenes, weather, options.power].filter((id): id is string => !!id),
  };
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
      const away = !state || state.state === "unavailable";
      const on = !away && (d.kind === "lock" ? state.state === "locked" : d.kind === "cover" ? state.state !== "closed" : state.state === "on");
      const raw = d.kind === "light" ? state?.attributes.brightness : d.kind === "cover" ? state?.attributes.current_position : undefined;
      const level = typeof raw !== "number" ? undefined : d.kind === "light" ? Math.round((raw / 255) * 100) : raw;

      const kw = on ? kilowatts(d.power) : undefined;
      if (kw !== undefined && kw >= 1) appliances.push({ id: d.id, name: d.name, room: room.name, kw });
      return { id: d.id, name: d.name, kind: d.kind, on, level, away, since: Date.parse(state?.last_changed ?? "") || 0, guarded: d.guarded, room: room.name };
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
    scenes: found.scenes.filter((id) => hass.states[id]).map((id) => ({ id, name: hass.states[id].attributes.friendly_name ?? id })),
    appliances,
    outside: typeof sky?.attributes.temperature === "number" ? { temp: sky.attributes.temperature, humidity: sky.attributes.humidity } : undefined,
    kw: kilowatts(found.power),
  };
}
