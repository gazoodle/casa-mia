// Arrange: a commander's cameras laid out for it as tiles around the main camera. The admin
// page's Arrange dialog uses it to write a commander's panels; it is not part of the layout
// engine, so the compositor has no twin of it. Each way of sharing the cameras between the
// edges gets the biggest tiles that fit, is laid out by the real engine (layout.ts) and is
// scored on what that gives, so what is offered is what is drawn.
import { layout, PANELS, ratio, type Panel, type PanelSettings, type Rect } from "./layout.ts";

/** The order the edges fill in unless another is asked for. */
export const ORDER: Panel[] = ["bottom", "left", "right", "top"];

/** How the tiles are sized. exact: all one size at the tile shape, the spare room shared
 * between them. best: all one size, each cropped by up to TRIM so they fill their edges.
 * vary: as best, then an edge's tiles grow to fill it where they can, at the thickness that
 * leaves the main camera nearest its own shape, so one edge's may differ in size from
 * another's (by VARY at most). */
export type Mode = "exact" | "best" | "vary";

export const TRIM = 0.1; // best, vary: the most cut off a camera (a tile's or the main one) to close a gap
const CROP = 0.06; // exact: the most cut off the main camera to fill its space; more: shown whole
const MAIN_LEAST = 0.15; // the least of the picture the main camera should show
const VARY = 2; // vary: the biggest tile's side over the smallest's, at most
const LINES = 3; // the most rows or columns of tiles on an edge
const SMALLER = [0.8, 0.65, 0.5, 0.4]; // tile sizes below the biggest that fit, as shares of it
const GAIN = 1.1; // a smaller size is offered only when the main camera shows this much more for it
const NEAR = 0.02; // as good as the least unused: within this much of it

export type Ask = {
  width: number;
  height: number;
  gap: number;
  margin?: number;
  cameras: string[]; // in order: the first go to the first edge
  cell: string; // the tiles' shape, width:height ("16:9")
  edges: Panel[]; // those it uses, in the order they fill; each holds at least one camera
  mode: Mode;
  oneLine?: boolean; // one row or column on each edge, never more
  shape?: number; // the main camera's (16:9)
};

export type Arrangement = {
  panels: Record<Panel, PanelSettings & { hidden: boolean }>;
  main_fit: "crop" | "fit";
  tile: [number, number]; // the smallest tile
  rects: Rect[]; // every tile
  trim: number; // the most cut off a camera to fill its tile
  waste: number; // the share of the picture neither main camera nor tile
  shown: number; // px² of the main camera shown
  lines: Lines;
  counts: Partial<Record<Panel, number>>;
  scale: number; // the tiles' size as a share of the biggest that fit; below 1 they leave room on their edges
};

type Count = [edge: Panel, cameras: number];
type Lines = [rows: number, columns: number];
type Sized = Pick<PanelSettings, "size" | "fit" | "cell" | "lines">;

const across = (p: Panel) => p === "top" || p === "bottom";
const area = (r: Rect) => r[2] * r[3];
const lost = (a: number, b: number) => 1 - Math.min(a, b) / Math.max(a, b); // the share cut off one shape to fill the other
const whole = (x: number) => Math.floor(x + 1e-6); // floor, but 479.9999999 (float error) is 480

/** Each edge's thickness, fit and tile shape with the cameras shared as `counts`, its tiles
 * `scale` of the biggest that fit. The rows run the picture's whole width and the columns
 * stand between them, as candidate anchors them. */
function sized(ask: Ask, counts: Count[], lines: Lines, lean: number, scale: number): [Panel, Sized][] {
  const g = ask.gap;
  const c = ratio(ask.cell);
  const m = ask.margin ?? 0;
  const [w, h] = [ask.width - 2 * m, ask.height - 2 * m];
  const of = (p: Panel) => lines[across(p) ? 0 : 1];
  const slots = ([p, k]: Count) => Math.ceil(k / of(p)); // the tiles along its fullest line
  const each = (span: number, n: number) => (span - (n - 1) * g) / n; // the length of each of n filling span
  const thick = (p: Panel, t: number) => of(p) * t + (of(p) - 1) * g;
  const cap = (p: Panel) => Math.floor(((across(p) ? h : w) * 45) / 100); // the engine's, on a panel in px (layout.ts `size`)
  const rows = counts.filter(([p]) => across(p));
  const columns = counts.filter(([p]) => !across(p));

  // One size for all, W × H. The widest a tile can be is set by the fullest row and the
  // tallest by the fullest column, which stands in what the rows (each H thick) leave.
  const stretch = ask.mode === "exact" || scale < 1 ? 1 : 1 + TRIM; // smaller tiles fill no edge, so keep their shape
  const band = lines[0] * rows.length; // the rows of tiles above and below the columns
  let W = Math.min(...rows.map((count) => each(w, slots(count))));
  let H = Math.min(...columns.map((count) => (h - band * g - (slots(count) - 1) * g) / (slots(count) + band)));
  if (!columns.length) H = W / c;
  if (!rows.length) W = H * c;
  if (rows.length) H = Math.min(H, each(cap(rows[0][0]), lines[0]));
  if (columns.length) W = Math.min(W, each(cap(columns[0][0]), lines[1]));
  [W, H] = [W * scale, H * scale];

  // No further from the tile shape than the mode allows: the longer side gives way, and its
  // edge keeps some spare room.
  W = Math.min(W, H * c * stretch);
  H = whole(Math.min(H, (W * stretch) / c));
  if (ask.mode === "exact" && Math.round(H * c) > whole(W)) H -= 1; // the engine rounds H's width up: a pixel too wide for the fullest row
  W = ask.mode === "exact" ? Math.round(H * c) : whole(W);
  const cell = ask.mode === "exact" ? ask.cell : `${W}:${H}`;
  const common = (p: Panel): Sized => ({ size: thick(p, across(p) ? H : W), fit: "squares_spread", cell, lines: of(p) });
  if (ask.mode !== "vary" || scale < 1) return counts.map(([p]) => [p, common(p)]);

  // vary: an edge's tiles grow to fill it, cropped by no more than TRIM, where that keeps
  // them within VARY of the common size; an edge that can't keeps the common size. The rows
  // go as near `lean` times the common thickness as that allows (0: thin, Infinity: thick),
  // and the columns then take the thickness that leaves the main camera nearest its shape.
  const fill = (count: Count, span: number, target: number): [Panel, Sized] => {
    const [p] = count;
    const along = each(span, slots(count));
    const [ideal, t, l] = across(p) ? [along / c, H, W] : [along * c, W, H];
    const grown = Math.round(Math.min(Math.max(target, ideal / (1 + TRIM)), ideal * (1 + TRIM)));
    const fills = grown <= t * VARY && along <= l * VARY && thick(p, grown) <= cap(p);
    return [p, fills ? { size: thick(p, grown), fit: "cover", lines: of(p) } : common(p)];
  };
  const filled = rows.map((count) => fill(count, w, H * lean));
  const left = h - filled.reduce((sum, [, made]) => sum + made.size + g, 0); // what the rows leave: the main camera's height
  const want = (w - left * (ask.shape ?? 16 / 9)) / columns.length - g; // a column this thick leaves the main camera its shape
  return [...filled, ...columns.map((count) => fill(count, left, each(want, lines[1])))];
}

/** One arrangement: the cameras shared between the edges as `counts` (in fill order), in
 * `lines` rows and columns (`lean`, `scale`: see sized); null when that leaves no tiles or
 * no main camera. */
function candidate(ask: Ask, counts: Count[], lines: Lines, lean: number, scale: number): Arrangement | null {
  const sizes = sized(ask, counts, lines, lean, scale);
  if (sizes.some(([, s]) => !(s.size > 0))) return null;

  const held = new Map<Panel, string[]>();
  let first = 0;
  for (const [p, k] of counts) {
    held.set(p, ask.cameras.slice(first, first + k));
    first += k;
  }
  const given = new Map(sizes);
  const panels = Object.fromEntries(
    PANELS.map((p) => {
      const edge = across(p) ? { anchor_left: true, anchor_right: true } : {};
      const plain = { cameras: held.get(p) ?? [], size: 0, unit: "px", fit: "squares_spread", cell: ask.cell, lines: 1, hidden: false };
      return [p, { ...plain, ...edge, ...given.get(p) }];
    }),
  ) as Arrangement["panels"];

  // laid out by the engine, and scored on what it gives
  const { width, height } = ask;
  const [, main, tiles] = layout({ width, height, gap: ask.gap, margin: ask.margin ?? 0, main_fit: "crop", ...panels });
  const rects = Object.values(tiles).flat();
  const [mw, mh] = [main[2], main[3]];
  if (mw <= 0 || mh <= 0 || rects.some((r) => r[2] <= 0 || r[3] <= 0)) return null;

  const shape = ask.shape ?? 16 / 9;
  const fit = lost(mw / mh, shape) > (ask.mode === "exact" ? CROP : TRIM); // too much to cut off: shown whole
  const shown = fit ? Math.min(mw, mh * shape) * Math.min(mh, mw / shape) : mw * mh;
  const waste = 1 - (shown + rects.reduce((s, r) => s + area(r), 0)) / (width * height);
  const least = rects.reduce((a, b) => (area(b) < area(a) ? b : a));
  const trim = Math.max(...rects.map((r) => lost(r[2] / r[3], ratio(ask.cell))));
  return { panels, main_fit: fit ? "fit" : "crop", tile: [least[2], least[3]], rects, trim, waste, shown, lines, counts: Object.fromEntries(counts), scale };
}

/** The arrangements worth offering on the edges asked for, the biggest main camera first
 * and the biggest tiles last. Every way of sharing the cameras is tried: so many on the rows
 * and the rest on the columns, opposite edges at most one apart (the extra to the one earlier
 * in fill order), in each number of rows and columns, with the biggest tiles that fit. Those
 * no other beats on both main camera and tile size are kept. Before them come the one with
 * the biggest main camera again, its tiles smaller than fit, for a main camera bigger still. */
export function arrange(ask: Ask): Arrangement[] {
  const n = ask.cameras.length;
  const set = ask.edges.slice(0, n); // with fewer cameras than edges, the first of them
  if (!set.length) return [];
  const rows = set.filter(across);
  const columns = set.filter((p) => !across(p));
  const split = (edges: Panel[], total: number): Count[] =>
    edges.map((p, i) => [p, Math.floor(total / edges.length) + (i < total % edges.length ? 1 : 0)]);

  const leans = ask.mode === "vary" ? [0, 1, Infinity] : [1];
  const found: Arrangement[] = [];
  const [from, to] = [columns.length ? rows.length : n, rows.length ? n - columns.length : 0];
  for (let r = from; r <= to; r++) {
    const shared = new Map([...split(rows, r), ...split(columns, n - r)]);
    const counts = set.map((p): Count => [p, shared.get(p)!]);
    // as many lines as an edge has cameras, at most: the engine gives it no more
    const upTo = (edges: Panel[]) => {
      const most = edges.length ? Math.min(ask.oneLine ? 1 : LINES, ...edges.map((p) => shared.get(p)!)) : 1;
      return Array.from({ length: most }, (_, i) => i + 1);
    };
    for (const a of upTo(rows))
      for (const b of upTo(columns))
        for (const lean of leans) {
          const made = candidate(ask, counts, [a, b], lean, 1);
          if (made) found.push(made);
        }
  }

  const percent = (a: Arrangement) => Math.round(a.waste * 100);

  // Preferences, each dropped when nothing meets it: something is always offered.
  const prefer = (list: Arrangement[], test: (a: Arrangement) => boolean) => {
    const kept = list.filter(test);
    return kept.length ? kept : list;
  };
  let kept = prefer(found, (a) => a.shown >= MAIN_LEAST * ask.width * ask.height);
  if (ask.mode === "vary") {
    const spread = (a: Arrangement) =>
      Math.max(...[2, 3].map((side) => Math.max(...a.rects.map((r) => r[side])) / Math.min(...a.rects.map((r) => r[side]))));
    kept = prefer(kept, (a) => a.trim <= TRIM + 0.01); // an uneven last line, or the engine's cap, stretches tiles
    kept = prefer(kept, (a) => spread(a) <= VARY);

    // of a sharing's three thicknesses, the one with the least unused (to the percent), and
    // of those the least cropped
    kept.sort((a, b) => percent(a) - percent(b) || a.trim - b.trim);
    const seen = new Set<string>();
    kept = kept.filter((a) => {
      const key = JSON.stringify([a.counts, a.lines]);
      return !seen.has(key) && seen.add(key);
    });
  }

  // The least unused first, so of two alike in main camera and tile size that one is kept.
  // Where sizes vary the smallest tile says less, so there one with less unused (to the
  // percent) is kept too.
  kept.sort((a, b) => a.waste - b.waste);
  const tile = (a: Arrangement) => a.tile[0] * a.tile[1];
  const unused = (a: Arrangement) => (ask.mode === "vary" ? percent(a) : 0);
  const front = kept.filter(
    (a, i) =>
      !kept.some(
        (b, j) =>
          b.shown >= a.shown &&
          tile(b) >= tile(a) &&
          unused(b) <= unused(a) &&
          (b.shown > a.shown || tile(b) > tile(a) || unused(b) < unused(a) || j < i),
      ),
  );
  front.sort((a, b) => b.shown - a.shown || tile(a) - tile(b));

  // Smaller tiles leave room on their edges, so only one arrangement is shrunk, and only
  // by sizes that each show GAIN more of the main camera than the last.
  const [first] = front;
  for (const scale of first ? SMALLER : []) {
    const made = candidate(ask, Object.entries(first.counts) as Count[], first.lines, 1, scale);
    if (made && made.shown >= front[0].shown * GAIN) front.unshift(made);
  }
  return front;
}

/** The one to start on: the biggest main camera among those with about the least unused,
 * of those whose tiles are as big as fit (the smaller sizes are there to step to). */
export function bestOf(list: Arrangement[]): number {
  const fitted = (a: Arrangement) => a.scale === 1;
  const least = Math.min(...list.filter(fitted).map((a) => a.waste));
  return Math.max(0, list.findIndex((a) => fitted(a) && a.waste <= least + NEAR));
}
