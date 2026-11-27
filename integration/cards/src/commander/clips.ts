// The Camera Commander card's clips (clips-dialog.ts): a camera's recordings in UniFi
// Protect's media library, one kind and one day at a time, and a clip's address to play
// (docs/design/commander-detections.md, step 3). Only Home Assistant's public websocket
// commands: media_source/browse_media, media_source/resolve_media and auth/sign_path.
// Nothing fetches on a timer (RULE FOUR): the cameras' folders are looked up once per page
// load, and the rest when the dialog is opened or the end of its list comes into view
// (owner, 2026-11-27), stopping by itself after EMPTY_STOP empty days in a row.
import type { Hass } from "../ha.ts";
import { KINDS } from "./detect.ts";

export const ROOT = "media-source://unifiprotect";

/** How long a signed thumbnail's address works: as long as Home Assistant signs a resolved
 * clip's (a day), so one loaded late (lazily, scrolled to) still loads. */
const SIGNED_S = 24 * 3600;

/** One entry in Home Assistant's media browser. */
export type Media = { title: string; media_content_id: string; thumbnail?: string | null; children?: Media[] };

/** What went wrong, as Home Assistant (or the browser) said it. */
export const reason = (err: unknown): string => (err as { message?: string })?.message ?? String(err);

const browse = (hass: Hass, id: string): Promise<Media> => hass.callWS({ type: "media_source/browse_media", media_content_id: id });
const deviceOf = (hass: Hass, entity: string): string => hass.entities?.[entity]?.device_id ?? "";

/** Every camera's folder, by device. A folder names its camera only in its thumbnail
 * (/api/camera_proxy/<entity id>), and the commander's camera may be another channel of
 * it, so they are matched on the device, never the entity id or the name. The root lists
 * the consoles (<nvr>:browse), or, with one, is that console and lists its cameras. */
async function browseFolders(hass: Hass): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const take = (folders: Media[]) => {
    for (const f of folders) {
      const device = deviceOf(hass, f.thumbnail?.match(/\/api\/camera_proxy\/([^/?]+)/)?.[1] ?? "");
      if (device) found.set(device, f.media_content_id);
    }
  };

  const root = await browse(hass, ROOT);
  take(root.children ?? []);
  const consoles = (root.children ?? []).filter((c) => c.media_content_id.endsWith(":browse"));
  for (const nvr of await Promise.all(consoles.map((c) => browse(hass, c.media_content_id)))) take(nvr.children ?? []);
  return found;
}

/** Which cameras have recordings. Looked up once per page load (FOLDERS); a failure is not
 * kept, so the next opening of the dialog asks again. */
export class Folders {
  /** Device id → its camera's folder, once looked up. */
  known?: Map<string, string>;
  private asked?: Promise<Map<string, string>>;
  private tried = false;

  all(hass: Hass): Promise<Map<string, string>> {
    this.asked ??= browseFolders(hass).then(
      (found) => (this.known = found),
      (err) => {
        this.asked = undefined;
        throw err;
      },
    );
    return this.asked;
  }

  /** The camera's folder, "" for none. */
  async of(hass: Hass, camera: string): Promise<string> {
    return (await this.all(hass)).get(deviceOf(hass, camera)) ?? "";
  }

  /** Whether a press on the camera's name opens its recordings: never for a camera that
   * isn't Protect's (only its media library is handled), nor one known to have no folder.
   * Until it is known, yes: the first call looks (`again` redraws with the answer), and
   * while the answer is a failure the dialog says so, and looks again. A redraw never
   * does: that would be a poll. */
  offered(hass: Hass, camera: string, again: () => void): boolean {
    if (hass.entities?.[camera]?.platform !== "unifiprotect") return false;
    if (this.known) return this.known.has(deviceOf(hass, camera));
    if (!this.tried) {
      this.tried = true;
      this.all(hass).then(again, (err) => console.warn(`casa-mia: UniFi Protect's recordings could not be listed: ${reason(err)}`));
    }
    return true;
  }
}

export const FOLDERS = new Folders();

/** A day as Protect's media library names one: in Home Assistant's time zone, unpadded. */
export type Day = { y: number; m: number; d: number };

/** The day it is at `at` where Home Assistant is, not where this browser is. */
export function dayAt(zone: string | undefined, at = Date.now()): Day {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

export function before({ y, m, d }: Day): Day {
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** The next day the list shows: today, then each time the day before the last. */
export const nextDay = (shown: Day[], zone: string | undefined, now = Date.now()): Day =>
  shown.length ? before(shown[shown.length - 1]) : dayAt(zone, now);

/** A day as its heading says it, in this browser's language. */
export const dayName = ({ y, m, d }: Day): string =>
  new Date(Date.UTC(y, m - 1, d)).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** When something was, as a chip says it, where Home Assistant is (as the caption's clock):
 * the time today, "yesterday" and the time, the weekday and time within the week, else
 * the date. `lang`: this browser's language unless given. */
export function whenSaid(at: number, zone: string | undefined, now: number, lang?: string): string {
  const utc = ({ y, m, d }: Day) => Date.UTC(y, m - 1, d);
  const days = Math.round((utc(dayAt(zone, now)) - utc(dayAt(zone, at))) / 86_400_000);
  const say = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang, { timeZone: zone, ...o }).format(at);
  const time = say({ hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return time;
  if (days === 1) return `yesterday ${time}`;
  if (days < 7) return `${say({ weekday: "short" })} ${time}`;
  return say({ day: "numeric", month: "short" });
}

/** The kinds of recording, one shown at a time (decided: the items carry no time a merged
 * list could be sorted on). Never Protect's `all`: one console passed its 1,000 events of
 * all kinds in a day. Doorbell only for a camera with a doorbell event entity. */
export const SHELVES = [
  { kind: "smart", label: "Detections", icon: "mdi:account-eye" },
  { kind: "ring", label: "Doorbell", icon: KINDS.ring.icon },
  { kind: "audio", label: "Sounds", icon: "mdi:volume-high" },
  { kind: "motion", label: "Motion", icon: "mdi:motion-sensor" },
] as const;
export type Shelf = (typeof SHELVES)[number]["kind"];

/** The kind of recording a detection is found under (KINDS' shelf; objects and anything
 * not known under Detections), for a chip to open the dialog on. */
export const shelfOf = (kind: string): Shelf => KINDS[kind]?.shelf ?? "smart";

/** One day of the list: its clips once listed, or why they couldn't be, and whether
 * Protect's list of it was cut short. */
export type Shown = { day: Day; clips?: Clip[]; failed?: string; cut?: boolean };

/** How many empty days in a row the list goes back by itself before it stops: a quiet
 * camera would otherwise be fetched back to its first day. Look further back goes on. */
export const EMPTY_STOP = 7;

/** The empty days at the end of the list, counted from `from` (where Look further back
 * was pressed). */
export function emptyRun(days: Shown[], from: number): number {
  let run = 0;
  for (let i = days.length - 1; i >= from && days[i].clips?.length === 0; i--) run++;
  return run;
}

/** Whether the list fetches the day before by itself: none still loading, none failed
 * (that one waits for Try again), and fewer than EMPTY_STOP empty days in a row. */
export const goesOn = (days: Shown[], from: number): boolean =>
  days.every((s) => s.clips && !s.failed) && emptyRun(days, from) < EMPTY_STOP;

/** The list as drawn: each day with clips (or loading, or failed) under its heading, and
 * each run of empty days as one line. */
export type Part = { shown: Shown } | { empty: Day[] };
export function parts(days: Shown[]): Part[] {
  const out: Part[] = [];
  for (const shown of days) {
    const last = out[out.length - 1];
    if (shown.clips?.length !== 0) out.push({ shown });
    else if (last && "empty" in last) last.empty.push(shown.day);
    else out.push({ empty: [shown.day] });
  }
  return out;
}

/** A run of empty days (newest first), said in one line. */
export const nothingOn = (days: Day[]): string =>
  days.length === 1 ? `Nothing recorded on ${dayName(days[0])}` : `Nothing recorded from ${dayName(days[days.length - 1])} to ${dayName(days[0])}`;

export const dayId = (folder: string, kind: Shelf, { y, m, d }: Day): string => `${folder}:${kind}:range:${y}:${m}:${d}`;

/** One recording: what its tile says, and the icon of a kind it starts with ("" for none). */
export type Clip = { id: string; thumb: string; what: string; when: string; icon: string };

/** Protect titles an event `<date> <time> <length> <what>`, the date and time in the
 * server's locale, so they are shown as written and never read. `<what>` is one of these. */
const WHAT = /(Ring Event|Motion Event|(?:Object|Audio) Detection - .*)$/;

export function clipOf(item: Media): Clip {
  const found = item.title.match(WHAT);
  const what = found ? found[1].replace(/^(?:Object|Audio) Detection - /, "") : item.title;
  const known = Object.values(KINDS).find((k) => what.toLowerCase().startsWith(k.label.toLowerCase()));
  return { id: item.media_content_id, thumb: item.thumbnail ?? "", what, when: found ? item.title.slice(0, found.index).trim() : "", icon: known?.icon ?? "" };
}

/** A camera's recordings of one kind on one day, newest first (Protect lists a day oldest
 * first), each thumbnail's address signed, so an <img> loads it with no login. */
export async function dayClips(hass: Hass, folder: string, kind: Shelf, day: Day): Promise<Clip[]> {
  const listed = await browse(hass, dayId(folder, kind, day));
  const clips = (listed.children ?? []).map(clipOf).reverse();
  return Promise.all(
    clips.map(async (c) => (c.thumb ? { ...c, thumb: (await hass.callWS({ type: "auth/sign_path", path: c.thumb, expires: SIGNED_S })).path } : c)),
  );
}

/** Whether Protect's list of the day was cut short. Its integration asks the console for at
 * most its "max media" events (1,000 unless changed) across all the console's cameras, and
 * only then keeps the one camera's, so only the all-cameras folder's title can say so
 * (`… (1000 TRUNCATED)`). It counts what it lists, so for Motion, whose events paired with
 * a detection it leaves out, a list cut short can go unsaid. */
export async function truncated(hass: Hass, folder: string, kind: Shelf, day: Day): Promise<boolean> {
  const all = folder.replace(/:[^:]+$/, ":all");
  return (await browse(hass, dayId(all, kind, day))).title.includes("TRUNCATED");
}

/** A clip's address to play, signed by Home Assistant, so a <video> loads it with no login. */
export async function resolve(hass: Hass, id: string): Promise<string> {
  return (await hass.callWS({ type: "media_source/resolve_media", media_content_id: id })).url;
}

/** A clip fetched whole, for a player that won't play it from its address (Protect's server
 * ignores Range, so it is the whole file either way). `got` hears each piece arrive, with
 * the size when the server says it (else 0). */
export async function download(url: string, signal: AbortSignal, got: (bytes: number, of: number) => void): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`the server answered ${res.status} ${res.statusText}`.trim());
  const of = Number(res.headers.get("content-length")) || 0;
  const parts: Uint8Array[] = [];
  let bytes = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got((bytes += value.length), of);
  }
  return new Blob(parts as BlobPart[], { type: res.headers.get("content-type") || "video/mp4" });
}
