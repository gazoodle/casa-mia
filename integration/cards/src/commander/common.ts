// The Camera Commander's types, constants and helpers, shared by the card and its editor.
import { type Fit, type Hass, heightFor, liveChannel, type Sharpness, type State } from "../ha.ts";
import { pyRound } from "../layout.ts";
import type { Commander } from "../placed.ts";
import type { Labels } from "../labels.ts";
import type { Corner } from "./motion.ts";
import type { Duplex } from "./talk-rules.ts";
import type { Control, ControlsAt } from "../../../../app/web/src/cameras/controls.ts";

export type Route = "auto" | "direct" | "ha";
export type Config = { type: string; entity?: string; tap_main?: "live" | "more-info" | "full" | "none"; route?: Route; away_sharpness?: Sharpness; live_main?: boolean;
  leave_after?: number;
  grid_options?: { rows?: number | string };
  /** The Security look, on or off (a template, later), and its tint ([r, g, b]), strength and darkness (%). */
  security_look?: boolean;
  look_tint?: [number, number, number];
  look_strength?: number;
  look_darkness?: number;
  /** Motion on a tile: a dot, its colour, size (px), pulse (s; 0 steady), how long it
   * stays after the motion (s) and its corner (motion.ts: MOTION). */
  motion_dot?: boolean;
  motion_colour?: [number, number, number];
  motion_size?: number;
  motion_pulse?: number;
  motion_linger?: number;
  motion_corner?: Corner;
  /** The card's own Talk button, where talk is offered (talk.ts). */
  talk_button?: boolean;
  /** full: the voice goes out from the answer; half: only while Hold to talk is held (talk-rules.ts). */
  duplex?: Duplex;
};
export type Card = {
  picture: string;
  layout: Commander & { labels?: Partial<Labels>; main_keep?: string; highlight?: Record<string, string | number>; debug?: { on?: boolean; colour?: string } };
  start: string;
  /** Each camera: its title, live page, channels smallest first, with their sizes, and
   * its controls with the edge they go along on a full screen (card.ts: full screen). */
  cameras: Record<string, { title: string; live: string; channels?: [string, number, number][]; controls?: Control[]; controls_at?: Partial<ControlsAt> }>;
  /** The compositor's Live main camera switch. */
  live_main?: boolean;
  /** This run of the app: when it changes, the app restarted and the stream with it. */
  run?: string;
};
/** The live main camera's lease (CLAUDE.md RULE FIVE): a channel is live only while a
 * frame of it was put on screen within LIVE_LEASE_MS, and a session that has shown none
 * LIVE_WAIT_MS after its start has failed. Nothing else renews it, and nothing has to
 * report a failure: a stall lapses by itself. */
export const LIVE_WAIT_MS = 10_000;
export const LIVE_LEASE_MS = 5_000;
/** HLS has longer to show its first frame: Home Assistant starts the stream when asked,
 * and the player fills a buffer before it plays: 8.5 s from a cold start in Safari (2026-11-11). */
export const LIVE_WAIT_HLS_MS = 20_000;

/** Why a live session has lapsed, from when it started and when it last put a frame on
 * screen (0: none yet); null while it holds. `wait` is how long its first frame may take. */
export function liveLapsed(startedAt: number, frameAt: number, now: number, wait = LIVE_WAIT_MS): string | null {
  if (frameAt) return now - frameAt < LIVE_LEASE_MS ? null : "the video stopped";
  return now - startedAt < wait ? null : "no video arrived";
}

/** How this device plays live video: WebRTC where it has it; else HLS where its browser
 * plays that by itself (the Home Assistant app for the Mac, whose web view has no WebRTC);
 * else "", and the main camera is the drawn one, as with live off. Trying WebRTC without
 * it only ever said "Live lost … ReferenceError" over a picture that was fine. */
export type LiveBy = "webrtc" | "hls" | "";
const playsHls = () => document.createElement("video").canPlayType("application/vnd.apple.mpegurl") !== "";
export const liveBy = (scope: object = globalThis, hls: () => boolean = playsHls): LiveBy =>
  "RTCPeerConnection" in scope ? "webrtc" : hls() ? "hls" : "";

/** A channel that failed is marked bad, and the mark is a lease too: it lapses at `until`
 * and the channel is tried again (docs/never-silently-stuck.md, the camera ladder). Each
 * failure in a row doubles the wait, from LIVE_RETRY_MS up to LIVE_RETRY_MAX_MS, so a
 * channel this device can never play costs one short try every ten minutes. `since` is
 * when its video was last seen (or first asked for), kept through the failures in a row,
 * for "Live lost … ago". The first frame after it removes the mark (live.ts). */
export type LiveMark = { since: number; until: number; fails: number; why: string };
export const LIVE_RETRY_MS = 30_000;
export const LIVE_RETRY_MAX_MS = 600_000;
export function liveMark(old: LiveMark | undefined, why: string, lostAt: number, now: number): LiveMark {
  const fails = (old?.fails ?? 0) + 1;
  return { since: old?.since ?? lostAt, until: now + Math.min(LIVE_RETRY_MAX_MS, LIVE_RETRY_MS * 2 ** (fails - 1)), fails, why };
}

/** A camera's channels in the order to try them live: the one that fits its place best
 * (ha.ts: liveChannel), then the smaller ones, largest first, then the larger ones. */
export function liveOrder(channels: [string, number, number][], place: [number, number], whole: boolean): string[] {
  const names = channels.map(([name]) => name);
  const fit = names.indexOf(liveChannel(channels, place, whole) ?? "");
  return [...names.slice(0, fit + 1).reverse(), ...names.slice(fit + 1)];
}

/** Which channels get a <video> now: `shown` is the best one putting frames on screen;
 * `tried` is the best one not marked bad that would be better than it, played unseen
 * until its first frame. So a working picture is never taken down to try a better one. */
export function livePlan(order: string[], live: (channel: string) => boolean, bad: (channel: string) => boolean): { shown?: string; tried?: string } {
  const shown = order.find(live);
  const better = shown === undefined ? order : order.slice(0, order.indexOf(shown));
  return { shown, tried: better.find((channel) => !bad(channel)) };
}

/** A while, as people say it: "12 s", "4 min", "2 h 5 min". */
export function ago(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  const m = Math.floor(s / 60) % 60;
  return `${Math.floor(s / 3600)} h${m ? ` ${m} min` : ""}`;
}
/** The picture failing is a lease (RULE FIVE): each error renews it, and it lapses this
 * long after the last one, longer than a retry takes (base.ts: refused), so a run of
 * failures reads as one. Nothing has to say the picture is back. */
export const PICTURE_DOWN_MS = 15_000;

/** What the card says while its picture fails: since when (the first error of this run)
 * and that it is retrying; null once no error has come for PICTURE_DOWN_MS. */
export function pictureDown(since: number, lastError: number, now: number): string | null {
  if (!lastError || now - lastError >= PICTURE_DOWN_MS) return null;
  return `Picture failing for ${ago(now - since)}: retrying`;
}

/** The picture as frames over a WebSocket (base.ts: followPicture): the stream's address
 * with .ws, on the page's own host. "" when the picture isn't a stream through Home
 * Assistant (direct, or none), which is the only place frames are served. */
export function framesAddress(picture: string, page: string): string {
  if (!picture.startsWith("/api/") || !picture.includes(".mjpg?")) return "";
  return new URL(picture.replace(".mjpg?", ".ws?"), page.replace(/^http/, "ws")).href;
}

/** The dashboard (or other page) shown: its path's first part, as a view's path may
 * change under a card (/lovelace becomes /lovelace/0); a card on another view of the
 * same dashboard is taken off the page. */
export const dashboard = () => location.pathname.split("/")[1] ?? "";
/** Seconds a card's stream goes on once it is out of sight (its dashboard left,
 * scrolled away), so a quick return (the back button) finds it still running. */
export const LEAVE_AFTER = 15;
/** This card's version: its script's ?v= (the integration loads it so), named in each
 * stream it asks for, so the server's log and table say which card is running. */
export const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
export const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// As the compositor's (compositor/common.py: MAX_PIXELS, MIN_SIDE, asked_size).
export const MAX_PIXELS = 2560 * 1600;
export const MIN_SIDE = 64;
export const SETTLE_MS = 400; // a size must hold this long before a new picture is asked for
export type Size = [w: number, h: number, scale: number];

/** The picture to ask for, for a box w x h CSS pixels: in device pixels, capped at
 * MAX_PIXELS (same shape; text and gaps then shrink with it), rounded to 8 so near sizes
 * share one picture. Null when too small to draw. */
export function askFor(w: number, h: number, dpr: number): Size | null {
  const k = Math.min(1, Math.sqrt(MAX_PIXELS / (w * dpr * h * dpr)));
  const [W, H] = [8 * pyRound((w * dpr * k) / 8), 8 * pyRound((h * dpr * k) / 8)];
  return Math.min(W, H) >= MIN_SIDE ? [W, H, Math.round(dpr * k * 100) / 100 || 1] : null;
}

// The token for pictures through Home Assistant, shared by every card on the page; asked
// again after half its life, or after a picture is refused (HA restarted, say).
let token: { value: Promise<string>; until: number } | null = null;
export function pictureToken(hass: Hass, fresh = false): Promise<string> {
  if (fresh || !token || Date.now() > token.until) {
    const value = hass.callWS({ type: "casa_mia_commander/picture_token" }).then((r: { token: string }) => r.token);
    token = { value, until: Date.now() + 12 * 3600_000 };
    value.catch(() => (token = null));
  }
  return token.value;
}

/** The commanders HA knows: their Main camera selects, by name. */
export function commanders(hass: Hass): { value: string; label: string }[] {
  return Object.entries(hass.states)
    .filter(([id, st]) => id.startsWith("select.") && st.attributes.card)
    .map(([id, st]) => ({ value: id, label: String(st.attributes.friendly_name ?? id) }));
}

/** The Casa Mia Intercom call sensors, from HA's entity registry by platform and
 * translation key, never by name. */
export function callSensors(hass: Hass): string[] {
  const entities = (hass.entities ?? {}) as Record<string, { entity_id: string; platform?: string; translation_key?: string }>;
  return Object.values(entities)
    .filter((e) => e.platform === "casa_mia_intercom" && e.translation_key === "call")
    .map((e) => e.entity_id);
}

/** A doorbell's call sensor: the one whose camera_entities attribute holds the camera. Not
 * by the camera's device: since HA 2026.8 a device belongs to one integration, so the
 * sensor is never on it. `sensors` lets a caller look the registry up once. */
export function callSensor(hass: Hass, camera: string, sensors = callSensors(hass)): string | undefined {
  return sensors.find((id) => (hass.states[id]?.attributes.camera_entities as string[] | undefined)?.includes(camera));
}

/** The camera to talk to for a call: the main camera when it is the doorbell's, else one
 * of the commander's own cameras that is, else the doorbell's first. Talk is a session of
 * its own (sound only), so the doorbell needn't be on screen. */
export function talkCamera(st: State | undefined, main: string, own: string[]): string | undefined {
  const cameras = (st?.attributes.camera_entities as string[] | undefined) ?? [];
  return cameras.includes(main) ? main : (cameras.find((c) => own.includes(c)) ?? cameras[0]);
}

/** Talk is offered: a doorbell with a call sensor, its main camera wanted live (playing
 * or not: Talk opens a session of its own with the microphone, so a tablet whose video
 * fails can still answer the door) or already talking, on a secure page (the browser
 * gives a microphone to no other), and not being edited. */
export function talkOffered(o: { sensor?: string; live: string; talking: string; secure: boolean; editing: boolean }): boolean {
  return Boolean(o.sensor && (o.live !== "" || o.talking) && o.secure && !o.editing);
}

/** What a call sensor's state says on the card, the same on every device: "Ringing",
 * "Answered by X", "Missed", or nothing (idle, or a call that ended). */
export function callWords(st?: State): string {
  if (st?.state === "ringing") return "Ringing";
  if (st?.state === "answered") return `Answered by ${st.attributes.answered_by ?? "someone"}`;
  if (st?.state === "complete" && st.attributes.outcome === "missed") return "Missed";
  return "";
}
/** When HA will end an answered call, as every device shows it: "Hangs up in 1:42" from
 * the call sensor's ends_at (amber in its last 30 s), "Held" while Hold to talk stops the
 * timer, or nothing (not answered, or an integration that doesn't time calls this way).
 * Worked out against this device's clock on each redraw; HA ends the call on its own. */
export function countdown(st: State | undefined, now: number): { text: string; warn: boolean } | null {
  if (st?.state !== "answered") return null;
  const ends = st.attributes.ends_at ? Date.parse(String(st.attributes.ends_at)) : NaN;
  if (Number.isNaN(ends)) return st.attributes.held ? { text: "Held", warn: false } : null;
  const s = Math.max(0, Math.ceil((ends - now) / 1000));
  return { text: `Hangs up in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, warn: s <= COUNTDOWN_WARN_S };
}
export const COUNTDOWN_WARN_S = 30;
/** A touch on the page restarts a full duplex call's timer in HA, said at most this often. */
export const TOUCH_EVERY_MS = 5_000;

/** How long a note about talk ("The call ended") stays on the card. */
export const TALK_NOTE_MS = 10_000;

/** px: a column narrower than this is a phone held upright, or a space as narrow. */
export const NARROW_COLUMN = 500;

/** The card's height where it sets its own (ha.ts: heightFor), for its width and shape.
 * A Responsive commander in a narrow column takes the room below it instead, when that is
 * more: it is laid out for whatever space it has, and a phone held upright has far more
 * height than a 16:9 strip of its width. (Until 2026.11.5-b13 it took the strip, where a
 * commander set for a wide tablet had no room for a tile beside its main camera.) A
 * card further down the page, with less room than its own shape, keeps its shape. */
export function columnHeight(fit: Pick<Fit, "mode" | "room">, width: number, shape: number, responsive: boolean): number | null {
  const own = heightFor(fit, width, shape);
  return responsive && fit.mode === "column" && width < NARROW_COLUMN && own !== null && fit.room > own ? fit.room : own;
}
