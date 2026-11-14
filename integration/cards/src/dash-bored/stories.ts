// The stories: what is true of the house that is worth reporting, most important first.
// They know nothing of wording. Each carries a `kind` (and a `variant` of it) for a voice
// to look up, the `vars` a voice's sentences are filled from, the one number that goes
// in the figure, and what the reader can do about it.
import type { Device, House, Sighting } from "./house.ts";

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
/** The call that puts a device the other way: on or off, open or closed, locked or unlocked. */
export const flip = (d: Device): Press => ({
  domain: d.kind,
  service: d.kind === "lock" ? (d.on ? "unlock" : "lock") : d.kind === "cover" ? (d.on ? "close_cover" : "open_cover") : d.on ? "turn_off" : "turn_on",
  ids: [d.id],
});
/** The call that sets a light's brightness or a cover's position, in per cent. A light
 * asked for nothing is switched off by name: not every light takes a brightness of 0. */
export const setting = (d: Device, level: number): Press =>
  d.kind === "cover"
    ? { domain: "cover", service: "set_cover_position", ids: [d.id], data: { position: level } }
    : level
      ? { domain: "light", service: "turn_on", ids: [d.id], data: { brightness_pct: level } }
      : { domain: "light", service: "turn_off", ids: [d.id] };
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
