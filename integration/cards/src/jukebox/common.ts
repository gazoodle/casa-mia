// What Jukebox's page, players and card share: the house's music as the integration sends
// it (its house.py), the feed they follow and the one way they ask for anything (its
// feed.py). Nothing here talks to a speaker or to Home Assistant's media players directly:
// everything goes through Jukebox, so it knows which changes were its own.
const DOMAIN = "casa_mia_jukebox";
export const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
export const CARDS_VERSION = `${DOMAIN}/cards`;

export type Room = { name: string; volume: number | null; muted: boolean; available: boolean };
export type Group = {
  /** The coordinator's entity, which stands for the group. */
  id: string;
  rooms: string[];
  state: "playing" | "paused";
  kind: "queue" | "radio" | "tv" | "line_in" | "nothing";
  /** One room alone, playing nothing. */
  quiet: boolean;
  title: string;
  artist: string;
  album: string;
  channel: string;
  picture: string | null;
  duration: number | null;
  position: number | null;
  /** When `position` was true, as an ISO time. */
  position_at: string | null;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  queue_size: number | null;
  queue_position: number | null;
};
export type House = { groups: Group[]; rooms: Record<string, Room> };
export type Favourite = {
  folder: string;
  title: string;
  /** A station: it plays now and leaves the queue alone. */
  live: boolean;
  picture: string | null;
  media_content_id: string;
  media_content_type: string;
};
/** One song of a queue. */
export type Song = { title: string; artist: string; album: string; duration: number | null };
/** Home Assistant's `hass`, for its connection. */
type Asking = { connection?: any; [key: string]: any };

/** Follow the house's music until the function returned is called. `heard` gets none,
 * with the reason, when Home Assistant refuses (Jukebox isn't set up). */
export function follow(conn: any, heard: (house: House | undefined, why?: string) => void): () => void {
  const off: Promise<() => void> = conn.subscribeMessage((house: House) => heard(house), { type: `${DOMAIN}/house` });
  off.catch((err: any) => heard(undefined, err?.code === "unknown_command" ? "Jukebox isn't set up in Home Assistant" : (err?.message ?? String(err))));
  // Nothing to stop if it was refused, or the connection has gone.
  return () => void off.then((stop) => stop()).catch(() => undefined);
}

/** Ask Jukebox to do one thing for the group `room` is in. Rejects with the reason. */
export function ask(hass: Asking, action: string, room: string, data: object = {}): Promise<unknown> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/do`, action, entity_id: room, ...data });
}

export function favourites(hass: Asking, room: string): Promise<Favourite[]> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/favourites`, entity_id: room });
}

/** The queue of the group `room` is in: its songs in order (the first few hundred), and how
 * many there are in all. */
export function queue(hass: Asking, room: string): Promise<{ songs: Song[]; total: number }> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/queue`, entity_id: room });
}

/** Why a failure happened, in words to show. */
export const reason = (err: any): string => err?.message ?? String(err);

export const groupOf = (house: House, room: string): Group | undefined => house.groups.find((g) => g.rooms.includes(room));

/** A group's rooms, as "Den + Snug". */
export const names = (house: House, group: Group): string => group.rooms.map((r) => house.rooms[r]?.name ?? r).join(" + ");

/** What a group's one volume slider shows: its rooms' average. */
export function average(house: House, group: Group): number {
  const known = group.rooms.map((r) => house.rooms[r]?.volume).filter((v): v is number => typeof v === "number");
  return known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : 0;
}

/** The two lines a player shows for what a group is playing. */
export function playing(group: Group): { title: string; by: string } {
  const named = { tv: "Television", line_in: "Line-in", nothing: "Nothing playing" } as Record<string, string>;
  if (group.kind in named) return { title: group.title || named[group.kind], by: "" };
  if (group.kind === "radio") return { title: group.title || group.channel, by: group.artist || (group.title && group.title !== group.channel ? group.channel : "") };
  return { title: group.title, by: group.artist };
}

/** How far into a song a group is at `now` (ms): the speaker says where it was and when,
 * and a song that is playing has moved on since. None for what has no length. */
export function position(group: Group, now: number): number | null {
  if (typeof group.position !== "number" || !group.duration) return null;
  const since = group.state === "playing" && group.position_at ? Math.max(0, (now - Date.parse(group.position_at)) / 1000) : 0;
  return Math.min(group.duration, Math.floor(group.position + since));
}

export const mmss = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Two colours for a title, the same every time: the artwork of what has no picture, and
 * the light behind the big player. */
export function colours(text: string): [string, string] {
  let hash = 0;
  for (const c of text) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return [`hsl(${hue} 72% 56%)`, `hsl(${(hue + 70) % 360} 62% 30%)`];
}

export const initials = (text: string): string =>
  text
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

/** For a slider being dragged: sends the value it is given, one at a time, and after each
 * the newest that came meanwhile, so a speaker isn't sent every step of the drag. */
export function latest<T>(send: (value: T) => Promise<unknown>, failed: (err: unknown) => void): (value: T) => void {
  let busy = false;
  let waiting: { value: T } | undefined;
  const go = (value: T): void => {
    if (busy) return void (waiting = { value });
    busy = true;
    send(value)
      .catch(failed)
      .finally(() => {
        busy = false;
        const next = waiting;
        waiting = undefined;
        if (next) go(next.value);
      });
  };
  return go;
}
