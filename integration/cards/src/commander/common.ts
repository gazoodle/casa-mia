// The Camera Commander's types, constants and helpers, shared by the card and its editor.
import { type Hass, type Sharpness } from "../ha.ts";
import { pyRound, type Settings } from "../layout.ts";
import type { Corner } from "./motion.ts";

export type Route = "auto" | "direct" | "ha";
export type Config = { type: string; entity?: string; tap_main?: "live" | "more-info" | "none"; route?: Route; away_sharpness?: Sharpness; live_main?: boolean;
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
};
export type Card = {
  picture: string;
  layout: Settings & { highlight?: Record<string, string | number>; debug?: { on?: boolean; colour?: string } };
  start: string;
  /** Each camera: its title, live page, and channels smallest first, with their sizes. */
  cameras: Record<string, { title: string; live: string; channels?: [string, number, number][] }>;
  /** The compositor's Live main camera switch. */
  live_main?: boolean;
  /** This run of the app: when it changes, the app restarted and the stream with it. */
  run?: string;
};
export const LIVE_WAIT_MS = 10_000; // a live main camera not playing by then gives way to the picture
/** Live main cameras failed in a row before a card stops trying (until its page reloads):
 * each try and each failure changes its picture, a new stream each time. */
export const LIVE_GIVE_UP = 2;
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
