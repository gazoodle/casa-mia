/** Camera Commander: the commanders that show the cameras, their types and API. */

import { api } from "../api";
import type { Camera, HAEntity } from "../cameras";
import { CommanderIcon } from "../icons";
import LAYOUT from "../../../src/casa_mia/layout.json";

// The layout options' labels, help and defaults, shared with the Tablet Layout.
export const L = LAYOUT.main;

export const P = LAYOUT.panel;

export const help = (o: { help?: string }) => o.help?.replaceAll("{item}", "camera");

export const { get, post, put } = api("commander");

export const HEAD = {
  icon: <CommanderIcon />,
  title: "Camera Commander",
  module: "commander",
  blurb: "The commanders: each a main camera framed by panels of cameras, one live picture for the card and the dashboard.",
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

/** What the commander editor works on: the commanders, and the cameras they show. */
export type Edits = { commanders: Commander[]; cameras: Record<string, Camera> };

export type View = {
  store: { commanders: Commander[]; compositor_host: string };
  cameras: Record<string, Camera>;
  problems: string[];
  error: string | null;
  /** What a blank new commander starts as. */
  empty_commander: Commander;
  /** The pictures' address: the compositor host set here, else this box's. */
  host: string | null;
  /** Whether the live compositor runs. */
  compositor: boolean;
};

export type HA = {
  /** Each commander's (by id) Main camera select in the integration, which its taps set. */
  commander_selects?: Record<string, string>;
  /** Each commander's Track motion switch. */
  commander_switches?: Record<string, string>;
  /** Those entities' states. */
  entities?: HAEntity[];
  error: string | null;
};
