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
  /** The party lock, while it is on for this group. */
  party: Party | null;
};
/** A party: since when, what was put back (the newest first; `failed` when it couldn't be),
 * and since when a song moved in another app isn't being noticed (none while it is). */
export type Party = { since: string; undone: { at: string; what: string; failed: boolean }[]; unwatched: string | null };
export type House = { groups: Group[]; rooms: Record<string, Room> };
export type Favourite = {
  folder: string;
  title: string;
  /** A station: it plays now and leaves the queue alone. */
  live: boolean;
  /** One of Sonos's own playlists, which can be deleted. */
  playlist: boolean;
  /** Who it is by, where a search or a place being browsed says. */
  by?: string;
  /** A favourite can always be played; something found may only hold more to open. */
  can_play?: boolean;
  can_expand?: boolean;
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

/** What one source of a search found, or why it found nothing. */
export type Source = { name: string; items: Favourite[]; why: string | null };

/** Search the music library and Spotify together, for the group `room` is in. */
export function search(hass: Asking, room: string, query: string): Promise<{ sources: Source[] }> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/search`, entity_id: room, query });
}

/** What is in one place of what a speaker can play: the top when `at` is none. */
export function browse(hass: Asking, room: string, at?: Favourite): Promise<{ title: string; items: Favourite[] }> {
  const where = at ? { media_content_type: at.media_content_type, media_content_id: at.media_content_id } : {};
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/browse`, entity_id: room, ...where });
}

/** Keep the order the page's players were dragged into, for every screen in the house. The
 * house comes again, in that order, by the feed. */
export function arrange(hass: Asking, rooms: string[]): Promise<unknown> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/order`, rooms });
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

/** Whether a group is muted: every one of its rooms is. */
export const muted = (house: House, group: Group): boolean => group.rooms.length > 0 && group.rooms.every((r) => house.rooms[r]?.muted);

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

/** A time of day, as 21:05. */
export const clock = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

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
