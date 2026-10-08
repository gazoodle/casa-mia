// The Tablet Layout's arithmetic (view.ts measures the page and applies it): where each
// panel's section goes in the view's 5 x 5 grid, from its `layout:` config, the room it has
// and which panels show. Pure, so tablet.test.ts locks it (tests/tablet_cases.json).
import { LAYOUT, layout, PANELS, type Rect, type Settings } from "./layout.ts";

export const PLACES = ["main", ...PANELS] as const;
export type Place = (typeof PLACES)[number];

/** A top or bottom panel sized to its cards. */
export const autoSized = (config: Record<string, any>, p: string) => (p === "top" || p === "bottom") && config[p]?.size === "auto";

/** The engine's settings for a `layout:` config at this size: each panel one item while its
 * section shows (it fills its panel), the main one too. A top or bottom panel of `size:
 * auto` is as tall as its cards (`natural`, px), given to the engine as its share. */
export function settingsOf(
  config: Record<string, any>,
  width: number,
  height: number,
  showing: (place: string) => boolean,
  natural: (place: string) => number = () => 0,
): Settings {
  const s: Record<string, unknown> = { width, height, aspects: {} };
  for (const [k, o] of Object.entries(LAYOUT.main)) s[k] = config[k] ?? (o as { default: unknown }).default;
  for (const p of PANELS) {
    const pc = config[p] ?? {};
    const size = autoSized(config, p) ? (height > 0 ? (natural(p) / height) * 100 : 0) : pc.size;
    s[p] = { ...LAYOUT.panels[p], ...pc, ...(size !== undefined && { size }), fit: "cover", lines: 1, cameras: !pc.hidden && showing(p) ? [p] : [] };
  }
  return s as Settings;
}

/** Where a panel's section goes: its grid column and row (CSS), and for a main panel with
 * a shape of its own (fit: fixed), its size, centred in the middle cell. */
export type Placed = { column: string; row: string; width?: number; height?: number; centred?: boolean };
export type Placement = {
  inset: number; // the grid's inset, px: the margin (none in edit mode, which has HA's own spacing)
  columns: string; // grid-template-columns
  rows: string; // grid-template-rows
  places: Record<Place, Placed | null>; // null: not shown
};

/** The view's grid for `config` in an area w x h CSS px, with the panels `showing` and the
 * size: auto panels' heights (`naturals`, px). Exact pixels; in edit mode, with HA's gaps
 * between them, columns in proportion and rows at least that tall. */
export function placePanels(
  config: Record<string, any>,
  [aw, ah]: [number, number],
  editing: boolean,
  showing: readonly string[],
  naturals: Record<string, number> = {},
): Placement {
  // The margin is the grid's inset, so the engine lays out inside it.
  const m = editing ? 0 : Math.max(0, Math.min(Math.trunc(Number(config.margin ?? 0)), Math.floor((Math.min(aw, ah) - 1) / 2)));
  const [w, h] = [aw - 2 * m, ah - 2 * m];
  const shows = (p: string) => showing.includes(p);
  const s = { ...settingsOf(config, w, h, shows, (p) => naturals[p] ?? 0), margin: 0 };
  const [, main, tiles] = layout(s, shows("main") ? "main" : null);
  const at = (p: (typeof PANELS)[number]) => tiles[p][0] ?? [0, 0, 0, 0];
  const [l, t, r, b] = [at("left")[2], at("top")[3], at("right")[2], at("bottom")[3]];
  const gap = s.gap;
  const xs = [0, l, l && l + gap, w - (r && r + gap), w - r, w]; // column lines
  const ys = [0, t, t && t + gap, h - (b && b + gap), h - b, h]; // row lines
  const tracks = (lines: number[], unit: (size: number) => string) => lines.slice(1).map((v, i) => unit(v - lines[i])).join(" ");
  // Each panel's cells by its part, not by matching its edges to the lines: a panel none
  // tall (an empty size: auto one) has lines that are the next one's too, yet in edit mode
  // it grows to hold HA's Add card. Top: row 1, bottom: row 5, the sides columns 1 and 5;
  // across each other as the engine anchors them (layout.ts: across, down), a side stopping
  // at a top or bottom that shows and is anchored over it.
  const anchored = (p: "top" | "bottom", end: "left" | "right") => Boolean(s[p][`anchor_${end}`]);
  const over = (p: "top" | "bottom", end: "left" | "right") => tiles[p].length > 0 && anchored(p, end);
  const across = (p: "top" | "bottom") => `${anchored(p, "left") ? 1 : 3} / ${anchored(p, "right") ? 6 : 4}`;
  const down = (end: "left" | "right") => `${over("top", end) ? 3 : 1} / ${over("bottom", end) ? 4 : 6}`;
  const cells: Record<(typeof PANELS)[number], { column: string; row: string }> = {
    top: { column: across("top"), row: "1 / 2" },
    bottom: { column: across("bottom"), row: "5 / 6" },
    left: { column: "1 / 2", row: down("left") },
    right: { column: "5 / 6", row: down("right") },
  };
  const places = {} as Record<Place, Placed | null>;
  for (const place of PLACES) {
    const rect: Rect | undefined = place === "main" ? (shows("main") ? main : undefined) : tiles[place]?.[0];
    if (!rect) places[place] = null;
    else if (place === "main") {
      // The middle cell; a main with a shape of its own (fit: fixed) is centred in it.
      const shaped = rect[2] < xs[3] - xs[2] || rect[3] < ys[3] - ys[2];
      places.main = { column: "3 / 4", row: "3 / 4", ...(shaped && { width: rect[2], centred: true, ...(!editing && { height: rect[3] }) }) };
    } else places[place] = cells[place];
  }
  return {
    inset: m,
    columns: tracks(xs, (n) => (editing ? `minmax(0, ${n}fr)` : `${n}px`)),
    rows: tracks(ys, (n) => (editing ? `minmax(${n}px, auto)` : `${n}px`)),
    places,
  };
}

/** What a view saw out of edit mode: the panels' area, the space above its header then
 * (none: no header), and its size: auto panels' heights. */
export type Seen = { shown?: [number, number]; top?: number; naturals: Record<string, number> };
const SEEN = new Map<string, Seen>();
/** A view's, by dashboard and view: kept outside the view, as saving its config (the
 * Tablet Layout dialog's OK) makes HA build a new one, in edit mode, which would otherwise
 * measure its panels with HA's editors in them. */
export function seenOut(dashboard: string, view: number): Seen {
  const key = `${dashboard}/${view}`;
  let seen = SEEN.get(key);
  if (!seen) SEEN.set(key, (seen = { naturals: {} }));
  return seen;
}
