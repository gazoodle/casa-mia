import { createContext } from "react";
import { api } from "../api";
import { CameraIcon } from "../icons";
import LAYOUT from "../../../src/casa_mia/layout.json";

// The layout options' labels, help and defaults, shared with the Tablet Layout.
export const L = LAYOUT.main;

export const P = LAYOUT.panel;

export const help = (o: { help?: string }) => o.help?.replaceAll("{item}", "camera");

export const { get, post, put } = api("camera-dashboard");

export const HEAD = {
  icon: <CameraIcon />,
  title: "Camera Dashboard",
  blurb: "The cameras, the commander that shows them, and its dashboard.",
};

export type Control = { entity: string; name?: string; icon?: string };

export type Preset = string | { preset: string; label?: string };

export type Ptz = { action: string; data: Record<string, string>; presets: Preset[] };

export type Camera = {
  title: string;
  medium?: string;
  high?: string;
  zoom?: string;
  live?: string;
  ptz?: Ptz;
  controls?: Control[];
};

export type Highlight = { colour: string; width: number; blur: number; pulse: number; style: "breathe" | "ripple" };

export const HIGHLIGHT: Highlight = { colour: "#7bd1a0", width: 2, blur: 13, pulse: 1.8, style: "breathe" };

export const MOTION = { hold: 10, back: 30, pause: 120 };

export type Debug = { on: boolean; dim: number; corner: number; width: number; colour: string };

export const DEBUG: Debug = { on: false, dim: 20, corner: 40, width: 2, colour: "#ffd60a" };

/** A shape, width over height: a number (1.78) or a ratio as written ("16:9"). */
export type Shape = number | string;

export type Panel = {
  cameras: string[];
  size: number;
  /** Of size: % of the picture's width (left, right) or height (top, bottom), or px. */
  unit?: "%" | "px";
  /** Fill (cover) or Whole (contain) equal tiles; or each camera at its own shape, edge to
   * edge, from the start (stack), against the end (reverse) or in the middle (centre). */
  fit: "cover" | "contain" | "stack" | "reverse" | "centre";
  /** Top and bottom: run to the view's edge at that end (the side panel stops at them). */
  anchor_left?: boolean;
  anchor_right?: boolean;
  /** Rows (top, bottom) or columns (left, right) its cameras are shared between. */
  lines?: number;
  /** Off the view: no room, no tiles; its cameras kept for when it is shown again. */
  hidden?: boolean;
};

export const PANELS = ["left", "top", "right", "bottom"] as const;

export type Commander = {
  /** Its page's title on the dashboard; as a slug, the page's address. */
  name: string;
  /** Never changes: its device in the integration. "": the first there was. */
  id?: string;
  /** A page of its own on the dashboard; off: only drawn, for elsewhere (a card to come). */
  page?: boolean;
  width: number;
  height: number;
  gap: number;
  margin?: number;
  main: string;
  /** own and fixed: the main camera is main_width % wide; the panels take the rest. */
  main_fit: "fit" | "fill" | "crop" | "own" | "fixed";
  main_width?: number;
  main_ratio?: Shape;
  /** own, fixed: the % of the picture a panel with cameras keeps beside the main camera. */
  panel_min?: number;
  /** Seconds: a camera picture older than this is marked Stale. */
  stale?: number;
  /** The outline on the main camera's tile, drawn by the browser on the dashboard. */
  highlight?: Highlight;
  /** Debug options: the picture dimmed, corner Ls and diagonals, its ID and draw time. */
  debug?: Debug;
  /** Track motion (done by the integration), seconds. back 0: stays on the motion camera. */
  motion?: { hold: number; back: number; pause: number };
} & Record<(typeof PANELS)[number], Panel>;

export type Store = {
  dashboard: string;
  title: string;
  home: string;
  help: string;
  nav_style: "badges" | "tiles";
  theme: string;
  placeholder: string;
  portrait_query: string;
  phone_query: string;
  wall_users: string[];
  live_card: string;
  hi_live_card: string;
  compositor_host: string;
  cameras: Record<string, Camera>;
  /** In order: the dashboard's first pages. Always at least one. */
  commanders: Commander[];
};

export type View = {
  store: Store;
  problems: string[];
  error: string | null;
  changed: boolean;
  deployed: string | null;
  preview_dashboard: string;
  /** When the preview dashboard was last deployed; null when there is none. */
  previewed: string | null;
  /** When the config the last preview deploy replaced was kept; null when none is. */
  preview_backup: string | null;
  /** How many older versions of the live dashboard are kept, and the most it can be. */
  keep: number;
  max_keep: number;
  /** What a blank new commander starts as. */
  empty_commander: Commander;
  compositor: { live: boolean; draft: boolean; host: string | null };
};

export type HACamera = { entity: string; name: string; device_id: string | null; medium?: string; high?: string; zoom?: string };

export type HAUser = { id: string; name: string; is_active: boolean };

export type HA = {
  cameras?: HACamera[];
  users?: HAUser[];
  entities?: { entity: string; name: string; state?: string }[];
  /** Each commander's (by id) Main camera select in the integration, which its taps set. */
  commander_selects?: Record<string, string>;
  /** Each commander's Track motion switch. */
  commander_switches?: Record<string, string>;
  /** Each camera's motion sensor (for the commander's Track motion), where it has one. */
  motion?: Record<string, string>;
  /** What the saved draft needs that Home Assistant seems to lack. */
  warnings?: string[];
  error: string | null;
};

export type Backup = { name: string; url_path: string; saved: string };

export const CARDS: [string, string][] = [
  ["picture-entity", "Picture entity (built in)"],
  ["webrtc-camera", "WebRTC camera (custom)"],
  ["advanced-camera-card", "Advanced camera card (custom)"],
];

/** How often the camera thumbnails are fetched again. */
export const THUMB_EVERY_MS = 5 * 60_000;

/** Which round of thumbnails to show: bumped every THUMB_EVERY_MS. */
export const ThumbRound = createContext(0);

/** Home Assistant's entities, for the entity fields. */
export const Entities = createContext<{ entity: string; name: string; state?: string }[]>([]);

export const DEFAULT_PTZ: Ptz = { action: "unifiprotect.ptz_goto_preset", data: {}, presets: [] };

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
