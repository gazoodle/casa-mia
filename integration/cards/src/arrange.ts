// Arrange: a commander's cameras laid out for it, as tiles all of one size around the main
// camera, with as little of the picture unused as can be. The admin page's Arrange dialog
// uses it to write a commander's panels; it is not part of the layout engine, so the
// compositor has no twin of it. Each candidate is laid out by the real engine (layout.ts)
// and scored on what it gives, so what is offered is what is drawn.
import { layout, ratio, type Panel, type PanelSettings, type Rect, type Settings } from "./layout.ts";

/** The order the edges fill in: a row along the bottom first, then the sides, then the top. */
export const ORDER: Panel[] = ["bottom", "left", "right", "top"];
const CROP = 0.06; // the most of the main camera cut off to fill its space; more: shown whole
const SLACK = 0.15; // offered only within this much more of the picture unused than the best
const LEAST = 0.1; // the thinnest tile, as a share of the picture's shorter side
const MAIN_LEAST = 0.2; // the least of the picture the main camera shows

export type Ask = {
  width: number;
  height: number;
  gap: number;
  margin?: number;
  cameras: string[]; // in order: the first fill the first edge
  cell: string; // the tiles' shape, width:height ("16:9")
  edges: Panel[]; // those it may use
  oneLine?: boolean; // one row or column on each edge, never two
  shape?: number; // the main camera's (16:9)
};

export type Arrangement = {
  panels: Record<Panel, PanelSettings & { hidden: boolean }>;
  main_fit: "crop" | "fit";
  main: Rect;
  tile: [number, number];
  rects: Rect[]; // every tile
  waste: number; // the share of the picture neither main camera nor tile
  shown: number; // px² of the main camera shown
  lines: number;
  counts: Partial<Record<Panel, number>>;
};

const across = (p: Panel) => p === "top" || p === "bottom";

/** The edges in use, growing in fill order: the first allowed, the first two, and so on. */
function edgeSets(edges: Panel[]): Panel[][] {
  const allowed = ORDER.filter((p) => edges.includes(p));
  return allowed.map((_, i) => allowed.slice(0, i + 1));
}

/** One arrangement: tiles `t` px tall in `lines` lines on each of `set`, the cameras
 * filling the edges in order; null when they don't all fit or an edge would be empty. */
function candidate(ask: Ask, set: Panel[], lines: number, t: number): Arrangement | null {
  const { width, height, gap } = ask;
  const cell = ratio(ask.cell);
  const m = ask.margin ?? 0;
  const [w, h] = [width - 2 * m, height - 2 * m];
  const cw = Math.round(t * cell);
  const thick = (p: Panel) => lines * (across(p) ? t : cw) + (lines - 1) * gap;
  const rows = set.filter(across);
  const columnSpan = h - rows.reduce((s, p) => s + thick(p) + gap, 0);
  const perLine = (p: Panel) => Math.floor(((across(p) ? w : columnSpan) + gap) / ((across(p) ? cw : t) + gap));

  // the cameras, edge by edge in order
  const counts: Partial<Record<Panel, number>> = {};
  let left = ask.cameras.length;
  for (const p of set) {
    counts[p] = Math.min(left, lines * perLine(p));
    left -= counts[p]!;
    if (!counts[p]) return null;
  }
  if (left) return null;

  let first = 0;
  const panels = Object.fromEntries(
    (["left", "top", "right", "bottom"] as Panel[]).map((p) => {
      const n = counts[p] ?? 0;
      const cameras = ask.cameras.slice(first, first + n);
      first += n;
      const edge = across(p) ? { anchor_left: true, anchor_right: true } : {};
      return [p, { cameras, size: n ? thick(p) : 0, unit: "px", fit: "squares_spread", cell: ask.cell, lines, hidden: false, ...edge }];
    }),
  ) as Arrangement["panels"];

  // laid out by the engine, and scored on what it gives
  const settings: Settings = { width, height, gap, margin: m, main_fit: "crop", ...panels };
  const [, main, tiles] = layout(settings);
  const all = Object.values(tiles).flat();
  const [tw, th] = [Math.min(...all.map((r) => r[2])), Math.min(...all.map((r) => r[3]))];
  if (Math.min(tw, th) < LEAST * Math.min(w, h) || main[2] <= 0 || main[3] <= 0) return null;
  const shape = ask.shape ?? 16 / 9;
  const [mw, mh] = [main[2], main[3]];
  const cut = 1 - Math.min(mw / mh, shape) / Math.max(mw / mh, shape);
  const shown = cut <= CROP ? mw * mh : Math.min(mw, mh * shape) * Math.min(mh, mw / shape);
  const waste = 1 - (shown + all.reduce((s, r) => s + r[2] * r[3], 0)) / (width * height);
  if (shown < MAIN_LEAST * width * height) return null;
  return { panels, main_fit: cut <= CROP ? "crop" : "fit", main, tile: [tw, th], rects: all, waste, shown, lines, counts };
}

/** The arrangements worth offering, the biggest main camera first and the biggest tiles
 * last: for each way of sharing the cameras between the edges, its tile size with the least
 * unused; then only those no other beats on both main camera and tile size. */
export function arrange(ask: Ask): Arrangement[] {
  if (!ask.cameras.length) return [];
  const best = new Map<string, Arrangement>();
  const most = Math.min(ask.height, ask.width / ratio(ask.cell));
  for (const set of edgeSets(ask.edges))
    for (const lines of ask.oneLine ? [1] : [1, 2])
      for (let t = 8; t <= most; t++) {
        const a = candidate(ask, set, lines, t);
        if (!a) continue;
        const key = `${lines} ${JSON.stringify(a.counts)}`;
        const had = best.get(key);
        if (!had || a.waste < had.waste - 1e-9 || (Math.abs(a.waste - had.waste) < 1e-9 && a.shown > had.shown)) best.set(key, a);
      }

  const found = [...best.values()];
  const least = Math.min(...found.map((a) => a.waste));
  const kept = found.filter((a) => a.waste <= least + SLACK);
  const front = kept.filter(
    (a) => !kept.some((b) => b !== a && shownOf(b) >= shownOf(a) && tileOf(b) >= tileOf(a) && (shownOf(b) > shownOf(a) || tileOf(b) > tileOf(a))),
  );
  return front.sort((a, b) => shownOf(b) - shownOf(a));
}

const tileOf = (a: Arrangement) => a.tile[0] * a.tile[1];
const shownOf = (a: Arrangement) => a.shown;

/** The one to start on: the least of the picture unused, the bigger main camera on a tie. */
export function bestOf(list: Arrangement[]): number {
  let at = 0;
  list.forEach((a, i) => {
    if (a.waste < list[at].waste - 1e-9) at = i;
  });
  return at;
}
