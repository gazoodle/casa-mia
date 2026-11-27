// The Camera Commander card's clips (clips-dialog.ts): a camera's recordings in UniFi
// Protect's media library, one kind and one day at a time, and a clip's address to play
// (docs/design/commander-detections.md, step 3). Only Home Assistant's public websocket
// commands: media_source/browse_media, media_source/resolve_media and auth/sign_path.
// Nothing fetches by itself (RULE FOUR): the cameras' folders are looked up once per page
// load, and the rest when the dialog is opened or asked for an earlier day.
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

/** Today where Home Assistant is, not where this browser is. */
export function today(zone: string | undefined, now = Date.now()): Day {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

export function before({ y, m, d }: Day): Day {
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** The next day the list shows: today, then at each Earlier the day before the last. */
export const nextDay = (shown: Day[], zone: string | undefined, now = Date.now()): Day =>
  shown.length ? before(shown[shown.length - 1]) : today(zone, now);

/** A day as its heading says it, in this browser's language. */
export const dayName = ({ y, m, d }: Day): string =>
  new Date(Date.UTC(y, m - 1, d)).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

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
