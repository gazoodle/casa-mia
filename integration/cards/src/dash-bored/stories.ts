// The stories: what is true of the house that is worth reporting, most important first.
// They know nothing of wording. Each carries a `kind` (and a `variant` of it) for a voice
// to look up, the `vars` a voice's sentences are filled from, the one number that goes
// in the figure, and what the reader can do about it.
import type { Device, House, Kind, Person, Sighting } from "./house.ts";

/** One of Sensor Watch's alerts, as Dash-Bored's integration feeds it (alerts.py). */
export type Alert = {
  entity_id: string;
  name: string;
  level: string;
  value?: unknown;
  unit?: string | null;
  message?: string | null;
  area?: string | null;
  escalated: boolean;
  at: number; // ms: when this level was reported
  began: number; // ms: when the trouble started
  flavour?: string; // what sort of sensor: see flavourOf
};
/** A service call that would put the story right. */
export type Press = { domain: string; service: string; ids: string[]; data?: Record<string, unknown> };
// The service that puts each kind the other way: [when it is on, when it is off]. A
// camera has neither.
const FLIP: Partial<Record<Kind, [string, string]>> = {
  lock: ["unlock", "lock"], cover: ["close_cover", "open_cover"], media_player: ["media_pause", "media_play"],
  valve: ["close_valve", "open_valve"], vacuum: ["return_to_base", "start"], lawn_mower: ["dock", "start_mowing"],
};
/** The call that puts a device the other way: on or off, open or closed, locked or
 * unlocked, playing or paused. */
export const flip = (d: Device): Press => ({ domain: d.kind, service: (FLIP[d.kind] ?? ["turn_off", "turn_on"])[d.on ? 0 : 1], ids: [d.id] });
// The service that sets each kind's level, and what it calls the level.
const SET: Partial<Record<Kind, [service: string, data: (level: number) => Record<string, unknown>]>> = {
  light: ["turn_on", (level) => ({ brightness_pct: level })],
  cover: ["set_cover_position", (level) => ({ position: level })],
  climate: ["set_temperature", (level) => ({ temperature: level })],
  media_player: ["volume_set", (level) => ({ volume_level: level / 100 })],
  fan: ["set_percentage", (level) => ({ percentage: level })],
  water_heater: ["set_temperature", (level) => ({ temperature: level })],
  humidifier: ["set_humidity", (level) => ({ humidity: level })],
};
/** The call that sets a device's level: a light's brightness, a cover's position, a
 * player's volume, a thermostat's target. A light asked for nothing is switched off by
 * name: not every light takes a brightness of 0. */
export function setting(d: Device, level: number): Press {
  if (d.kind === "light" && !level) return { domain: "light", service: "turn_off", ids: [d.id] };
  const [service, data] = SET[d.kind]!;
  return { domain: d.kind, service, ids: [d.id], data: data(level) };
}
export type Story = {
  kind: string;
  variant: string;
  flavour: string;
  id: string;
  rank: number;
  vars: Record<string, string>;
  figure: [string, string];
  press?: Press;
  photo?: string; // a photograph's address
  see?: string; // the entity whose dialog shows more: the camera that took it
};

/** A song somebody loved or loathed, as the integration's feed tells it (personal.py), its
 * time in seconds. */
export type Rated = { kind: "love" | "loathe" | "clear"; name: string; title: string; artist: string; at: number };
/** What a player played, as the integration's feed tells it (playing.py), its time in
 * seconds. `show` is a programme or a film, not a song. */
export type Played = { id: string; entity_id: string; title: string; artist: string; show: boolean; at: number };
/** A line of the celebrity column: what was played and where, whether it is on now, and
 * what people have said of it. */
export type Billing = { id: string; at: number; kind: "song" | "show"; live: boolean; vars: Record<string, string>; marks: Rated[] };
const BILL = 6; // how many the column holds
const TOGETHER = 60; // seconds: players that began the same thing within this are playing it together

const lower = (text: string) => text.trim().toLowerCase();
// The same song: its title, and its artist where both name one.
const same = (a: { title: string; artist: string }, b: { title: string; artist: string }) => lower(a.title) === lower(b.title) && (!a.artist || !b.artist || lower(a.artist) === lower(b.artist));

/** What each person thinks of each song now: their latest word on it, and nothing where
 * that was to take the rating away. */
export function verdicts(rated: Rated[]): Rated[] {
  const latest = new Map<string, Rated>();
  for (const r of [...rated].sort((a, b) => a.at - b.at)) latest.set(`${lower(r.name)}\n${lower(r.title)}\n${lower(r.artist)}`, r);
  return [...latest.values()].filter((r) => r.kind !== "clear");
}

/** The celebrity column, newest first: the last things the house's players played, each
 * with what was said of it. A player the page does not show is left out, and players
 * that began the same thing together (a group of speakers) are one line, with its rooms. */
export function billing(played: Played[], rated: Rated[], devices: Map<string, Device>): Billing[] {
  const said = verdicts(rated);
  const newest = new Map<string, string>(); // by player: the last thing it played
  for (const p of [...played].sort((a, b) => a.at - b.at)) newest.set(p.entity_id, p.id);
  const bill: (Billing & { rooms: string[] })[] = [];
  for (const p of [...played].sort((a, b) => b.at - a.at)) {
    const d = devices.get(p.entity_id);
    if (!d) continue;
    // A device's title is the song and its artist (house.ts), so it begins with the song's.
    const live = d.on && newest.get(d.id) === p.id && (!d.title || lower(d.title).startsWith(lower(p.title)));
    const room = d.room.toLowerCase();
    const with_ = bill.find((b) => b.live === live && b.vars.title === p.title && b.vars.artist === p.artist && b.at - p.at * 1000 < TOGETHER * 1000);
    if (with_) {
      if (!with_.rooms.includes(room)) with_.rooms.unshift(room);
      with_.vars.room = with_.rooms.length > 1 ? `${with_.rooms.slice(0, -1).join(", ")} and ${with_.rooms.at(-1)}` : room;
    } else bill.push({ id: d.id, at: p.at * 1000, kind: p.show ? "show" : "song", live, rooms: [room], vars: { title: p.title, artist: p.artist, name: d.name, room }, marks: p.show ? [] : said.filter((r) => same(r, p)) });
  }
  return bill.slice(0, BILL);
}
/** A line for the Personal column: somebody came home, left or reached a zone, or rated a song. */
export type Notice = { kind: "home" | "left" | "zone" | "love" | "loathe"; at: number; vars: Record<string, string> };
const PERSONAL = 12 * 3_600_000; // ms: how long an announcement stays in the column
const NOTICES = 8; // and how many it holds

/** The Personal column, newest first: each person's latest coming or going, and the
 * songs that were rated. */
export function personal(people: Person[], rated: Rated[], now: number): Notice[] {
  const moves = people.map((p): Notice => ({ kind: p.place === "home" ? "home" : p.place === "not_home" ? "left" : "zone", at: p.since, vars: { name: p.name, place: p.place } }));
  const songs = verdicts(rated).map((r): Notice => ({ kind: r.kind as Notice["kind"], at: r.at * 1000, vars: { name: r.name, title: r.title, artist: r.artist } }));
  return [...moves, ...songs].filter((n) => n.at && now - n.at < PERSONAL).sort((a, b) => b.at - a.at).slice(0, NOTICES);
}

export const NOMINAL = "nominal";
/** How long a sensor that is right again stays in the paper. */
export const RECOVERED = 600_000;
// Sensor Watch's levels above nominal, by how far up the page each belongs.
const RANK: Record<string, number> = { critical: 100, error: 95, warning: 70, task: 40 };
// What a camera saw (image.py's kinds): an alarm heard beside trouble, somebody at the
// door above what is left on, a passing cat below it.
const SEEN: Record<string, number> = { alarm: 92, doorbell: 80, person: 62, vehicle: 42, animal: 41 };
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export const clock = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
export const cap = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text);

/** A count, every way a sentence might want it: {n} lights, {N} light{s} burn{v}. */
export function counted(n: number): Record<string, string> {
  const word = NUM[n] ?? String(n);
  return { n: String(n), N: cap(word), n_word: word, s: n === 1 ? "" : "s", v: n === 1 ? "s" : "" };
}

/** A sensor's device class, as the sort of trouble it reports. */
export function flavourOf(deviceClass: unknown): string {
  const sorts: Record<string, string> = { temperature: "temperature", moisture: "moisture", door: "opening", window: "opening", opening: "opening", garage_door: "opening", battery: "battery", smoke: "smoke" };
  return sorts[String(deviceClass)] ?? "";
}

/** A measured value with its unit; nothing for a sensor that is only on or off. */
function reading(alert: Alert): string {
  const measured = typeof alert.value === "number" || (typeof alert.value === "string" && alert.value.trim() !== "" && Number.isFinite(Number(alert.value)));
  return measured ? `${alert.value}${alert.unit ? ` ${alert.unit}` : ""}` : "";
}

export function stories(house: House, alerts: Alert[], now: number, sightings: Sighting[] = []): Story[] {
  const out: Story[] = [];
  const add = (story: Omit<Story, "variant" | "flavour"> & { variant?: string; flavour?: string }) => out.push({ variant: "", flavour: "", ...story });
  const devices = house.rooms.flatMap((r) => r.devices);

  for (const a of alerts) {
    const vars = { name: a.name, area: (a.area ?? "house").toLowerCase(), message: a.message || `${cap(a.level)}.`, reading: reading(a), since: clock(a.began), escalated: a.escalated ? "yes" : "" };
    const figure: [string, string] = reading(a) ? [reading(a), a.area ?? a.name] : [cap(a.level), a.name];
    if (a.level !== NOMINAL) add({ kind: "alert", variant: a.level, flavour: a.flavour, id: a.entity_id, rank: RANK[a.level] ?? 70, vars, figure });
    else if (now - a.at < RECOVERED) add({ kind: "recovered", id: a.entity_id + ".ok", rank: 45, vars: { ...vars, minutes: String(Math.max(1, Math.round((a.at - a.began) / 60_000))) }, figure });
  }

  // A sighting is news for as long as a recovery is. A camera has one story: the most
  // pressing thing it saw in that time, and of those the latest. So the animal a camera
  // reports a moment after a person does not take the person's place.
  const best = new Map<string, Sighting>();
  for (const s of sightings) {
    if (now - s.at >= RECOVERED || !(s.kind in SEEN)) continue;
    const held = best.get(s.camera);
    if (!held || SEEN[s.kind] > SEEN[held.kind] || (SEEN[s.kind] === SEEN[held.kind] && s.at > held.at)) best.set(s.camera, s);
  }
  // Newest first: where several rank alike, that is the order they are told in.
  for (const s of [...best.values()].sort((a, b) => b.at - a.at))
    add({ kind: "sighting", variant: s.kind, id: "sighting." + s.camera, rank: SEEN[s.kind], vars: { name: s.name, room: (s.room ?? "house").toLowerCase(), at: clock(s.at) }, figure: [clock(s.at), s.name], photo: s.photo, see: s.camera });

  for (const d of devices) {
    if (d.kind === "lock" && !d.on && !d.away)
      add({ kind: "unlocked", id: d.id, rank: 90, vars: { name: d.name, room: d.room }, figure: ["Open", d.name], press: { domain: "lock", service: "lock", ids: [d.id] } });
  }

  // An alarm that is sounding leads the paper, above any sensor.
  for (const d of devices) if (d.phase === "triggered") add({ kind: "triggered", id: d.id, rank: 110, vars: { name: d.name, room: d.room.toLowerCase() }, figure: ["Alarm", d.room] });

  // Devices that have stopped answering: a fault nobody knows about can't be fixed.
  const away = devices.filter((d) => d.away);
  if (away.length) {
    const named = away.slice(0, 3).map((d) => `${d.room} ${d.name.toLowerCase()}`).join(", ");
    add({ kind: "offline", id: "offline", rank: 65, figure: [String(away.length), "not answering"],
      vars: { ...counted(away.length), names: away.length > 3 ? `${named} and ${away.length - 3} more` : named, since: clock(Math.min(...away.map((d) => d.since))) } });
  }

  for (const a of house.appliances)
    add({ kind: "appliance", id: "load." + a.id, rank: 55, vars: { name: a.name, room: a.room, kw: a.kw.toFixed(1) }, figure: [a.kw.toFixed(1), "kilowatts"], press: { domain: "switch", service: "turn_off", ids: [a.id] } });

  const lights = devices.filter((d) => d.kind === "light" && !d.away);
  const lit = lights.filter((d) => d.on);
  if (lights.length) {
    // Ablaze is most of the lights in the house, not merely several.
    const kind = lit.length >= 7 && lit.length * 2 >= lights.length ? "ablaze" : lit.length ? "lights" : "dark";
    add({ kind, id: kind, rank: { ablaze: 60, lights: 30, dark: 35 }[kind], vars: counted(lit.length), figure: [String(lit.length), lit.length === 1 ? "light on" : "lights on"],
      press: lit.length ? { domain: "light", service: "turn_off", ids: lit.map((d) => d.id) } : undefined });
  }

  for (const room of house.rooms) {
    if (room.temp !== undefined && room.target !== undefined && room.temp < room.target - 0.8)
      add({ kind: "cold", id: "cold." + room.id, rank: 25, vars: { room: room.name, temp: room.temp.toFixed(1), short: (room.target - room.temp).toFixed(1) }, figure: [room.temp.toFixed(1) + "°", room.name] });
  }
  if (house.kw !== undefined) add({ kind: "power", id: "power", rank: 20, vars: { kw: house.kw.toFixed(2) }, figure: [house.kw.toFixed(2), "kilowatts"] });
  if (house.outside) {
    const { temp, humidity } = house.outside;
    add({ kind: "weather", variant: temp < 5 ? "freezing" : temp < 12 ? "cold" : temp > 24 ? "hot" : "mild", id: "weather", rank: 10,
      vars: { temp: temp.toFixed(1) }, figure: [temp.toFixed(1) + "°", typeof humidity === "number" ? `${humidity}% humidity` : "outside"] });
  }
  // With nothing else to say there is still a front page.
  if (!out.length) add({ kind: "quiet", id: "quiet", rank: 1, vars: counted(devices.length), figure: [String(house.rooms.length), house.rooms.length === 1 ? "room" : "rooms"] });

  return out.sort((a, b) => b.rank - a.rank);
}
