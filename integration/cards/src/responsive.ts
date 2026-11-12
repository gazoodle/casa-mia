// The Camera Commander's Responsive layout, line for line the compositor's
// (app/src/casa_mia/modules/compositor/responsive.py, which says how it works and why).
// Both are checked against tests/responsive_cases.json: change one, change the other.
// Whole numbers throughout, as there: every product here stays far below 2^53, so the
// divisions are exact and the two engines can't round apart.
import LAYOUT from "../../../app/src/casa_mia/layout.json" with { type: "json" };
import { pyRound, type Rect } from "./layout.ts";

export type Shape = [w: number, h: number];
export type Edge = "bottom" | "right" | "left" | "top";
export type Options = {
  main_least: number;
  main_most: number;
  tile_loss: number;
  tile_min: number;
  tile_shape: string;
  edges: string[];
  edges_tall: string[] | null;
  main_other: string;
  cant_fit: string;
};
/** A commander laid out: see the compositor's `responsive`. */
export type Laid = {
  size: [number, number];
  main: Rect;
  main_how: "cover" | "contain";
  tiles: Rect[];
  more: Rect | null;
  dropped: number;
  gave: string[];
  grid: [cols: number, rows: number, mc: number, mr: number];
};

export const OPTIONS = LAYOUT.responsive;
export const DEFAULTS = Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default])) as unknown as Options;
export const EDGES: Edge[] = ["bottom", "right", "left", "top"];
export const MAIN_SHAPE: Shape = [16, 9];
export const WHOLE_OVER = 50;
const MOST_LINES = 24;

const div = (a: number, b: number) => Math.floor(a / b);

/** A shape as whole numbers: "16:9", or a number (1.333 is 1333 : 1000). */
export function shapeOf(value: string | number): Shape {
  if (typeof value === "string" && value.includes(":")) {
    const [a, b] = value.split(":");
    return [Math.trunc(Number(a)), Math.trunc(Number(b))];
  }
  return [pyRound(Number(value) * 1000), 1000];
}

/** How much of a picture of `shape` is cut off to fill w x h, per mille. */
function lostIn(w: number, h: number, shape: Shape): number {
  const [a, b] = [w * shape[1], h * shape[0]];
  return 1000 - div(1000 * Math.min(a, b), Math.max(a, b));
}

/** The area a picture of `shape` takes, shown whole in w x h. */
const whole = (w: number, h: number, shape: Shape) => Math.min(w, div(h * shape[0], shape[1])) * Math.min(h, div(w * shape[1], shape[0]));

/** How many of the `free` lines beside the block go before it; null: none may. */
function before(free: number, first: string, last: string, edges: string[]): number | null {
  if (!free) return 0;
  if (edges.includes(first) && edges.includes(last)) return edges.indexOf(first) < edges.indexOf(last) ? div(free + 1, 2) : div(free, 2);
  if (edges.includes(first)) return free;
  return edges.includes(last) ? 0 : null;
}

type Grid = [cols: number, rows: number, mc: number, mr: number, left: number, top: number, cw: number, ch: number];
const found = new Map<string, Grid | null>(); // kept: a size is asked for again and again

/** The best grid for a space w x h, or null when the limits allow none. */
function best(w: number, h: number, gap: number, tiles: number, tile: Shape, main: Shape, loss: number, tileMin: number, least: number, most: number, edges: string[]): Grid | null {
  const asked = JSON.stringify([w, h, gap, tiles, tile, main, loss, tileMin, least, most, edges]);
  const kept = found.get(asked);
  if (kept !== undefined) return kept;

  const biggest = whole(w, h, main);
  let key: number[] | null = null;
  let grid: Grid | null = null;
  for (let cols = 1; cols <= MOST_LINES; cols++) {
    const wide = div(w - (cols - 1) * gap, cols);
    if (wide < tileMin) break;
    for (let rows = 1; rows <= MOST_LINES; rows++) {
      let [cw, ch] = [wide, div(h - (rows - 1) * gap, rows)];
      if (ch < 1) break;
      if (cw * tile[1] * (100 - loss) > ch * tile[0] * 100) cw = div(ch * tile[0] * 100, tile[1] * (100 - loss));
      else if (cw * tile[1] * 100 < ch * tile[0] * (100 - loss)) ch = div(cw * tile[1] * 100, tile[0] * (100 - loss));
      if (cw < tileMin || ch < 1) continue;
      const tileLost = lostIn(cw, ch, tile);

      for (let mc = 2; mc <= cols; mc++) {
        const left = before(cols - mc, "left", "right", edges);
        if (left === null) continue;
        for (let mr = 2; mr <= rows; mr++) {
          const top = before(rows - mr, "top", "bottom", edges);
          const room = cols * rows - mc * mr;
          if (top === null || !room) continue;
          const [bw, bh] = [mc * cw + (mc - 1) * gap, mr * ch + (mr - 1) * gap];
          const lost = lostIn(bw, bh, main);
          const shown = bw * bh;
          if (lost > Math.max(loss * 10, WHOLE_OVER) || shown * 100 < least * biggest) continue;

          const dropped = room >= tiles ? 0 : tiles - (room - 1);
          const used = Math.min(tiles, room);
          const unused = w * h - used * cw * ch - shown;
          const over = Math.max(0, shown * 100 - most * biggest);
          const cost = div(unused * 1_000_000, w * h) + 500 * tileLost + 500 * lost + div(over * 9_000, w * h);
          const k = [dropped, cost, -cw * ch, cols, rows, mc, mr];
          if (key === null || earlier(k, key)) [key, grid] = [k, [cols, rows, mc, mr, left, top, cw, ch]];
        }
      }
    }
  }
  if (found.size >= 512) found.clear();
  found.set(asked, grid);
  return grid;
}

/** Whether a comes before b, as Python orders tuples. */
function earlier(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** The tiles' cells in the order they fill: an edge at a time, each across then down. A
 * cell where two edges meet is the later edge's (see the compositor's). */
function cells([cols, rows, mc, mr, left, top]: Grid, edges: string[]): [number, number][] {
  const on: Record<string, (c: number, r: number) => boolean> = {
    left: (c) => c < left,
    right: (c) => c >= left + mc,
    top: (_, r) => r < top,
    bottom: (_, r) => r >= top + mr,
  };
  const out: [number, number][] = [];
  edges.forEach((edge, i) => {
    const later = edges.slice(i + 1);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if (on[edge](c, r) && !later.some((e) => on[e](c, r))) out.push([c, r]);
  });
  return out;
}

/** A commander of `cameras` cameras laid out in width x height: see the compositor's. */
export function responsive(width: number, height: number, gap: number, margin: number, cameras: number, options: Partial<Options> = {}, mainShape: number | null = null, scale = 1): Laid {
  const o = { ...DEFAULTS, ...options };
  const m = Math.max(0, Math.min(Math.trunc(margin), div(Math.min(width, height) - 1, 2)));
  const [w, h] = [width - 2 * m, height - 2 * m];
  const tall = h > w && o.edges_tall !== null ? o.edges_tall : o.edges;
  let edges = [...new Set(tall.filter((e) => (EDGES as string[]).includes(e)))];
  const own = mainShape ? shapeOf(mainShape) : MAIN_SHAPE;
  const main = o.main_other === "follow" ? own : MAIN_SHAPE;
  const tiles = cameras > 1 ? cameras : 0;
  const tileMin = Math.max(1, pyRound(o.tile_min * scale));
  const solve = (among: string[], least: number, smallest: number) =>
    best(w, h, gap, tiles, shapeOf(o.tile_shape), main, Math.trunc(o.tile_loss), smallest, least, Math.trunc(o.main_most), among);

  // What gives way, in order (see the compositor's): the main camera's least, then the
  // smallest tile too; at each, the listed edges first, then others added one at a time,
  // and edges that find no fit are taken off again.
  const listed = edges;
  let gave: string[] = [];
  let grid = tiles ? solve(edges, Math.trunc(o.main_least), tileMin) : null;
  if (grid === null && tiles && o.cant_fit === "find") {
    const steps: [number, number, string[]][] = [
      [Math.trunc(o.main_least), tileMin, []],
      [0, tileMin, ["main_least"]],
      [0, 1, ["main_least", "tile_min"]],
    ];
    for (const [least, smallest, given] of steps) {
      [edges, gave] = [listed, given];
      if ((grid = solve(edges, least, smallest))) break;
      for (const edge of EDGES.filter((e) => !listed.includes(e))) {
        [edges, gave] = [[...edges, edge], ["edges", ...given]];
        if ((grid = solve(edges, least, smallest))) break;
      }
      if (grid) break;
    }
  }

  if (grid === null)
    return {
      size: [width, height],
      main: [m, m, w, h],
      main_how: lostIn(w, h, own) <= WHOLE_OVER ? "cover" : "contain",
      tiles: [],
      more: null,
      dropped: tiles,
      gave: tiles ? [...gave, "main_alone"] : [],
      grid: [1, 1, 1, 1],
    };

  const [cols, rows, mc, mr, left, top, cw, ch] = grid;
  const x0 = m + div(w - (cols * cw + (cols - 1) * gap), 2);
  const y0 = m + div(h - (rows * ch + (rows - 1) * gap), 2);
  const [bw, bh] = [mc * cw + (mc - 1) * gap, mr * ch + (mr - 1) * gap];
  const places = cells(grid, edges).map(([c, r]): Rect => [x0 + c * (cw + gap), y0 + r * (ch + gap), cw, ch]);
  const dropped = places.length >= tiles ? 0 : tiles - (places.length - 1);
  const shown = tiles - dropped;

  const bars = o.main_other === "whole" && lostIn(bw, bh, own) > WHOLE_OVER;
  return {
    size: [width, height],
    main: [x0 + left * (cw + gap), y0 + top * (ch + gap), bw, bh],
    main_how: bars ? "contain" : "cover",
    tiles: places.slice(0, shown),
    more: dropped ? places[shown] : null,
    dropped,
    gave,
    grid: [cols, rows, mc, mr],
  };
}
