// What Jukebox's page, players and card share: the house's music as the integration sends
// it (its house.py), the feed they follow and the one way they ask for anything (its
// feed.py). Nothing here talks to a speaker or to Home Assistant's media players directly:
// everything goes through Jukebox, so it knows which changes were its own.
//
// One room isn't Home Assistant's: the device the page is on (phone.ts), which is put into
// the house here and answers for itself what is asked of it.
import { PHONE, phone } from "./phone.ts";

export { PHONE };
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
  /** What Love it or Loathe it last did to this player, where it is installed. */
  love: Love | null;
  /** On a station: the cover of the song it is playing, found on Spotify. `picture` is
   * then the station's own, and is shown on the cover as a badge. */
  cover?: string | null;
  /** The Sonos playlist (`SQ:3`) this queue was loaded from or last saved as, from Jukebox. */
  source?: string | null;
  /** This device's own room only (phone.ts): something that went wrong there, to say. */
  trouble?: string;
};
/** Love it or Loathe it's account of a player (its Last match sensor's `players`): what it
 * did (empty while it is doing it), why, when, and whether that is still in force; `next`
 * when a return from another station is waiting on something. */
export type Love = { did: string; why: string; because?: string; at: string; now: boolean; next?: string };
/** A party: since when, what was put back (the newest first; `failed` when it couldn't be),
 * and since when a song moved in another app isn't being noticed (none while it is). */
export type Party = { since: string; undone: { at: string; what: string; failed: boolean }[]; unwatched: string | null; /** The screens may change the music. */ open: boolean };
/** `me` is this login's part while a party is on (the integration's may.py): a host runs
 * it, a screen may change the music once a host lets the screens, anyone else only looks. */
export type House = { groups: Group[]; rooms: Record<string, Room>; me: "host" | "screen" | "other"; /** This login may save, change and delete playlists now. */ curates?: boolean; /** This login may have Spotify's player on its own device. */ spotify?: boolean };

/** Whether this login can't change this group's music now: a party is on and it is neither
 * a host nor a screen that has been let. Jukebox itself refuses; this is so the page says. */
/** Whether this login may save, change and delete playlists now: the people who look
 * after the music always, and the house's own screens while no party is on. */
export const curates = (house?: House): boolean => house?.curates ?? house?.me === "host";
export const shut = (house: House, group: Group): boolean => !!group.party && house.me !== "host" && !(house.me === "screen" && group.party.open);

/** How long what Love it or Loathe it did stays on the big player after it is over. */
const LATELY = 10 * 60_000;

/** What to say of Love it or Loathe it on a player: what it did and why, while that is in
 * force and for a while after (a skip is over at once, and still wants explaining). */
export function loved(group: Group, now: number): { text: string; over: boolean } | undefined {
  const love = group.love;
  if (!love || (!love.now && now - Date.parse(love.at) > LATELY)) return undefined;
  // One sentence a person would say: "Muted until the next track, because “Last
  // Christmas” by Wham! is in the loathed group “Christmas”."
  const did = love.did || "Changing this player";
  const said = love.because ? `${did}, because ${love.because}.` : `${did}. ${love.why}.`;
  return { text: love.next ? `${said} ${love.next}.` : said, over: !love.now };
}
export type Favourite = {
  /** A Sonos playlist's tile: the covers of the first albums in it. */
  pictures?: string[];
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
export type Song = { title: string; artist: string; album: string; duration: number | null; picture?: string | null; /** Where it is from: the music library, Spotify, or another service. */ source?: string };
/** Home Assistant's `hass`, for its connection. */
type Asking = { connection?: any; [key: string]: any };

/** Follow the house's music until the function returned is called. `heard` gets none,
 * with the reason, when Home Assistant refuses (Jukebox isn't set up). */
export function follow(conn: any, heard: (house: House | undefined, why?: string) => void): () => void {
  // The house as Jukebox sent it, told again with this device's room in it whenever
  // that room changes.
  let last: House | undefined;
  const tell = () => last && heard(phone.within(last));
  const off: Promise<() => void> = conn.subscribeMessage((house: House) => ((last = house), tell()), { type: `${DOMAIN}/house` });
  off.catch((err: any) => heard(undefined, err?.code === "unknown_command" ? "Jukebox isn't set up in Home Assistant" : (err?.message ?? String(err))));
  const quit = phone.listen(tell);
  // Nothing to stop if it was refused, or the connection has gone.
  return () => (quit(), void off.then((stop) => stop()).catch(() => undefined));
}

/** Ask Jukebox itself something about a room. For this device, which is no room of
 * Home Assistant's, through a Sonos room: the favourites, the library and a playlist's
 * songs are read from a speaker. */
function send(hass: Asking, type: string, room: string, more: object = {}): Promise<any> {
  if (room === PHONE) phone.wake(hass);
  const entity = room === PHONE ? phone.speaker() : room;
  if (!entity) return Promise.reject(new Error("No Sonos speaker is answering, and the music is listed by one"));
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/${type}`, entity_id: entity, ...more });
}

/** What was listed, remembered for this device's room: it is asked to play a thing by
 * its address alone, and shows it by the title and picture it was listed with. */
const noted = (items: Favourite[]): Favourite[] => (phone.seen(items), items);

/** Ask Jukebox to do one thing for the group `room` is in. Rejects with the reason.
 * This device's room does it itself, but for a change to a Sonos playlist, which is
 * the house's and not a room's. */
export function ask(hass: Asking, action: string, room: string, data: object = {}): Promise<unknown> {
  if (room === PHONE && !action.startsWith("playlist_")) return phone.do(hass, action, data);
  return send(hass, "do", room, { action, ...data });
}

export function favourites(hass: Asking, room: string): Promise<Favourite[]> {
  return send(hass, "favourites", room).then(noted);
}

/** The queue of the group `room` is in: its songs in order (the first few hundred), and how
 * many there are in all. */
/** The queue of the group a room is in, or the songs of a Sonos playlist (`SQ:3`). */
export function queue(hass: Asking, room: string, playlist?: string): Promise<{ songs: Song[]; total: number }> {
  if (room === PHONE && !playlist) return phone.wake(hass), phone.queue();
  return send(hass, "queue", room, playlist ? { playlist } : {});
}

/** What one source of a search found, or why it found nothing. */
export type Source = { name: string; items: Favourite[]; why: string | null };

/** Search the music library and Spotify together, for the group `room` is in. */
export function search(hass: Asking, room: string, query: string): Promise<{ sources: Source[] }> {
  return send(hass, "search", room, { query }).then((found: { sources: Source[] }) => (found.sources.forEach((source) => noted(source.items)), found));
}

/** What is in one place of what a speaker can play: the top when `at` is none. */
export function browse(hass: Asking, room: string, at?: Favourite): Promise<{ title: string; items: Favourite[] }> {
  const where = at ? { media_content_type: at.media_content_type, media_content_id: at.media_content_id } : {};
  return send(hass, "browse", room, where).then((found: { title: string; items: Favourite[] }) => (noted(found.items), found));
}

/** Keep the order the page's players were dragged into, for every screen in the house. The
 * house comes again, in that order, by the feed. */
export function arrange(hass: Asking, rooms: string[]): Promise<unknown> {
  return hass.connection.sendMessagePromise({ type: `${DOMAIN}/order`, rooms: rooms.filter((room) => room !== PHONE) });
}

/** What a button of the dashboard's own asks of Jukebox, by Home Assistant's
 * fire-dom-event action (opens.ts): the room whose big player to open, and which of its
 * `tabs` to show. None when the action isn't for Jukebox; the complaint, in words to show,
 * when it is and can't be followed. */
export function wanted(detail: any, tabs: readonly string[]): { room: string; tab?: string } | string | undefined {
  const order = detail?.casa_mia_jukebox;
  if (order === undefined) return undefined;
  if (typeof order?.room !== "string" || !order.room) return "this button's action names no room: give casa_mia_jukebox a room, such as media_player.kitchen";
  if (order.tab !== undefined && !tabs.includes(order.tab)) return `this button's action asks for "${order.tab}", which isn't one of ${tabs.join(", ")}`;
  return { room: order.room, tab: order.tab };
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

/** Whether a group has a volume to set from here: this device's own room has none, as a
 * page can't set a phone's. */
export const loud = (house: House, group: Group): boolean => group.rooms.some((r) => typeof house.rooms[r]?.volume === "number");

/** Whether a group is muted: every one of its rooms is. */
export const muted = (house: House, group: Group): boolean => group.rooms.length > 0 && group.rooms.every((r) => house.rooms[r]?.muted);

/** What a micro player marks on a group's picture. `current` is whether the house shown is
 * known to be as it is now: without that nothing is claimed of the music, as moving bars
 * over a house that is no longer heard from would say it plays when nobody knows. */
export type Standing = "trouble" | "quiet" | "paused" | "muted" | "playing";
export function standing(house: House, group: Group, current: boolean): Standing {
  if (!current || group.trouble) return "trouble";
  if (group.quiet || group.kind === "nothing") return "quiet";
  if (group.state !== "playing") return "paused";
  return muted(house, group) ? "muted" : "playing";
}

/** The two lines a player shows for what a group is playing. */
export function playing(group: Group): { title: string; by: string } {
  const named = { tv: "Television", line_in: "Line-in", nothing: "Nothing playing" } as Record<string, string>;
  if (group.kind in named) return { title: group.title || named[group.kind], by: "" };
  // A stream that gives neither a title nor a station's name is still playing: say so.
  if (group.kind === "radio") return { title: group.title || group.channel || "Playing, but the speaker gives no title", by: group.artist || (group.title && group.title !== group.channel ? group.channel : "") };
  return { title: group.title || "Playing, but the speaker gives no title", by: group.artist };
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
