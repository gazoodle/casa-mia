// The Over layer's options and their defaults, shared by the card and its editor.
import type { CardConfig } from "../ha.ts";

export const TYPE = "custom:casa-mia-over-layer";

export type Mode = "float" | "full" | "scroll";
export type Cover = "view" | "window";
/** Where the card sits in what the layer covers (float; scroll: the top row only). */
export type Anchor = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export const ANCHORS: Anchor[][] = [
  ["top-left", "top", "top-right"],
  ["left", "center", "right"],
  ["bottom-left", "bottom", "bottom-right"],
];
export type Config = CardConfig & {
  card?: CardConfig; // the one card it holds
  mode?: Mode; // float: where it's anchored; full: filling what it covers; scroll: at the top, scrolling with the view
  cover?: Cover; // the view only, or the whole window (sidebar and header too)
  block?: boolean; // the backdrop takes every tap: what's beneath can be seen, not touched
  backdrop_color?: [number, number, number];
  backdrop_opacity?: number; // %
  backdrop_blur?: number; // px
  width?: number; // px, the card's width when it floats or scrolls
  anchor?: Anchor; // float: any of the nine; scroll: the top row
  offset_x?: number; // px in from the left or right edge it is anchored to
  offset_y?: number; // px in from the top or bottom edge it is anchored to
};

/** Each option's default: shown in the editor, and never saved. */
export const DEFAULTS = {
  mode: "float" as Mode,
  cover: "view" as Cover,
  block: true,
  backdrop_color: [0, 0, 0] as [number, number, number],
  backdrop_opacity: 40,
  backdrop_blur: 0,
  width: 480,
  anchor: "center" as Anchor,
  offset_x: 16,
  offset_y: 16,
};

export const withDefaults = (c: Config) => ({ ...DEFAULTS, ...c });

/** An anchor's row and column in ANCHORS; an unknown one (a typo in YAML) is the centre. */
function cell(anchor: Anchor): [number, number] {
  const row = ANCHORS.findIndex((r) => r.includes(anchor));
  return row < 0 ? [1, 1] : [row, ANCHORS[row].indexOf(anchor)];
}

/** Scroll with the view has the top row only: an anchor lower down moves to the top. */
export function anchorFor(mode: Mode, anchor: Anchor): Anchor {
  const [row, column] = cell(anchor);
  return ANCHORS[mode === "scroll" ? 0 : row][column];
}

/** The card's place in the layer (a flex box): `justify` across, `align` down. */
export function placement(anchor: Anchor): { justify: string; align: string } {
  const [row, column] = cell(anchor);
  const at = ["flex-start", "center", "flex-end"];
  return { justify: at[column], align: at[row] };
}

/** What the badge says in edit mode: "Over layer · float · the view". */
export function badge(c: Config): string {
  const o = withDefaults(c);
  const anchor = anchorFor(o.mode, o.anchor);
  const where = o.mode === "full" || anchor === "center" || (o.mode === "scroll" && anchor === "top") ? "" : ` ${anchor}`;
  const mode = { float: "float", full: "full screen", scroll: "scroll with the view" }[o.mode] + where;
  return `Over layer · ${mode} · ${o.cover === "window" ? "the whole window" : "the view"}${o.block ? "" : " · taps pass through"}`;
}
