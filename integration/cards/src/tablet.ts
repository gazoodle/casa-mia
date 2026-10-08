// The Tablet Layout's arithmetic (view.ts measures the page and applies it): where each
// section goes in the view's grid, from its `view_layout:` and the view's `layout:`, the room
// it has and which sections show. Pure, so tablet.test.ts locks it (tests/tablet_cases.json).
//
// Layers, as an onion: layer 1 is the view's top, left, right and bottom panels round a
// middle; layer 2 the same inside that middle, and so on to LAYERS; the main panel is the
// innermost middle. A layer's panels' options are its `layout:` (layer 1) or that of its
// `inner` (each layer the one inside the last); the rest of `layout:` (gap, margin, the main
// panel's fit) is the view's, once. Each panel is a stack of the sections that name it
// (`view_layout: {panel: top, layer: 2}`), in the view's order: top and bottom side by side,
// left and right one under the other.
//
// Spacing, as HTML's box model: the margin round the whole (one value, or each side); the
// gaps, each the view's `gap` unless it has its own: between an edge and its middle (the
// edge's `gap`), and between two panels of an edge (the first one's `gap_after`); a panel's
// padding is its own (view.ts). A gap is there only while what makes it shows (its edge, or
// both its panels), and with it any line in it (gapLines: an edge's `line`, a panel's
// `line_after`). The edges and middle are laid out here (frame), as the shared engine
// (layout.ts) would, but with each edge's own gap.
import { LAYOUT, mainShape, type Panel, PANELS, pyRound, type Rect, type Settings } from "./layout.ts";

export const PLACES = ["main", ...PANELS] as const;
export type Place = (typeof PLACES)[number];
export const LAYERS = 4;

/** A section's panel: its `view_layout:`, else (a view from before panel stacks) by position,
 * the first five main, left, top, right, bottom. Null: no panel (not shown). */
export function placeOf(section: any, n: number): { layer: number; place: Place } | null {
  const v = section?.view_layout;
  if (v?.panel === undefined) return n < PLACES.length ? { layer: 1, place: PLACES[n] } : null;
  const layer = Number(v.layer ?? 1);
  return PLACES.includes(v.panel) && Number.isInteger(layer) && layer >= 1 && layer <= LAYERS ? { layer, place: v.panel } : null;
}

/** Layer k's panels' options in a `layout:` (1: the layout itself, then each `inner` in turn). */
export function layerOf(config: Record<string, any>, k: number): Record<string, any> {
  let c = config;
  for (let i = 1; i < k; i++) c = c?.inner ?? {};
  return c ?? {};
}

/** `config` with layer k's options changed by `change`. */
export function withLayer(config: Record<string, any>, k: number, change: (c: Record<string, any>) => Record<string, any>): Record<string, any> {
  return k <= 1 ? change(config) : { ...config, inner: withLayer(config.inner ?? {}, k - 1, change) };
}

/** The sections of `where` in n's stack (its layer's panel), n among them; main: n alone. */
export function stackOf(where: readonly ({ layer: number; place: Place } | null)[], n: number): number[] {
  const w = where[n];
  if (!w || w.place === "main") return w ? [n] : [];
  return where.flatMap((v, i) => (v && v.layer === w.layer && v.place === w.place ? [i] : []));
}

const TITLES: Record<Place, string> = { main: "Main", left: "Left", top: "Top", right: "Right", bottom: "Bottom" };
/** A section's name (its chip in edit mode): its panel, its layer past the first, and where
 * it is in a stack of more than one. */
export function panelName(where: readonly ({ layer: number; place: Place } | null)[], n: number): string {
  const w = where[n];
  if (!w) return "";
  const stack = stackOf(where, n);
  return `${w.layer > 1 && w.place !== "main" ? `L${w.layer} ` : ""}${TITLES[w.place]}${stack.length > 1 ? ` ${stack.indexOf(n) + 1}` : ""}`;
}

/** A section as the edit surface orders them (view.ts: cmRestack): the view's section
 * it is (null: a new one) and its panel. */
export type Draft = { from: number | null; layer: number; place: Place };

/** The view's sections (`old`) as `drafts` order them, each naming its panel (as positions
 * move), a new one empty; those of no panel after them. As they were when nothing moved. */
export function restack(old: readonly any[], drafts: readonly Draft[]): any[] {
  const was = draftsOf(old);
  if (drafts.length === was.length && drafts.every((d, i) => d.from === was[i].from)) return [...old];
  return [
    ...drafts.map((d) => {
      const s = d.from === null ? { type: "grid", cards: [] } : old[d.from];
      const { layer: _, ...vl } = s.view_layout ?? {};
      return { ...s, view_layout: { ...vl, panel: d.place, ...(d.layer > 1 && { layer: d.layer }) } };
    }),
    ...old.filter((s, n) => !placeOf(s, n)),
  ];
}

/** The view's sections as drafts (each its own, in order). */
export const draftsOf = (sections: readonly any[]): Draft[] =>
  sections.flatMap((s, n) => {
    const at = placeOf(s, n);
    return at ? [{ from: n, ...at }] : [];
  });

/** A panel sized to its cards (`size: auto`): a top or bottom one as tall as them, a left or
 * right one as wide. */
export const autoSized = (config: Record<string, any>, p: string) => p !== "main" && config[p]?.size === "auto";

/** How many of HA's card columns a section's cards take, each by its grid options (columns:
 * 12 if not set, full: 12, within its min_ and max_columns): side by side (`across`, top
 * and bottom) all of them, else the widest. None: no cards. */
export function cardColumns(cards: readonly { columns?: number | string; min_columns?: number; max_columns?: number }[], across: boolean): number {
  const each = cards.map((o) => {
    const c = typeof o.columns === "number" ? o.columns : 12;
    return Math.min(o.max_columns ?? Infinity, Math.max(o.min_columns ?? 0, c));
  });
  return across ? each.reduce((t, c) => t + c, 0) : Math.max(0, ...each);
}

/** n card columns' width, px, in a view `width` wide of `columns` sections: HA's own, 12
 * card columns a section, `gap` between them. */
export const cardsWidth = (n: number, width: number, columns: number, gap = 8) =>
  n > 0 ? Math.max(0, Math.round((n * (width + gap)) / (12 * columns) - gap)) : 0;

/** The engine's settings for a layer's config at this size: each panel one item while a
 * section of it shows (they fill it), the main one too; a hidden edge none, unless `keep`
 * (edit mode, which shows it to be shown again). A panel of `size: auto` is as tall (top,
 * bottom) or wide (left, right) as its cards (`natural`, px), given to the engine as its
 * share. */
function settingsOf(
  config: Record<string, any>,
  width: number,
  height: number,
  showing: (place: string) => boolean,
  natural: (place: string) => number,
  keep: boolean,
): Settings {
  const s: Record<string, unknown> = { width, height, aspects: {} };
  for (const [k, o] of Object.entries(LAYOUT.main)) s[k] = config[k] ?? (o as { default: unknown }).default;
  for (const p of PANELS) {
    const pc = config[p] ?? {};
    const of = p === "top" || p === "bottom" ? height : width;
    const size = autoSized(config, p) ? (of > 0 ? (natural(p) / of) * 100 : 0) : pc.size;
    s[p] = { ...LAYOUT.panels[p], ...pc, ...(size !== undefined && { size }), fit: "cover", lines: 1, cameras: (keep || !pc.hidden) && showing(p) ? [p] : [] };
  }
  return s as Settings;
}

/** A view's section, as the view sees it: its panel, whether it shows, and what sets its
 * length along its stack: fixed, `share`, a top or bottom one's part of the panel (its Width,
 * column_span, of the view's max_columns), or `length`, a left or right one's, px
 * (row_span); else `size` (its `view_layout: {length}`): `fill`, a share of what the others
 * leave, or `cards`, its cards: `wide` (a top or bottom one's, px) or `tall` (a left or
 * right one's); without one, one alone fills and one of more is as its cards. `hold`: held
 * against the end of its edge (`view_layout: {hold: end}`). Its cards also size a panel of
 * size: auto: a top or bottom as its tallest, a left or right as its widest. */
export type Section = {
  layer: number;
  place: Place;
  shows: boolean;
  share?: number;
  length?: number;
  size?: "fill" | "cards";
  hold?: boolean;
  gapAfter?: number; // its own gap to the next along its edge (`view_layout: {gap_after}`)
  tall?: number;
  wide?: number;
};

/** One value for every side, or each its own (`{top, right, bottom, left}`, those left out
 * none): a margin or a padding, as [top, right, bottom, left] px. */
export const SIDES = ["top", "right", "bottom", "left"] as const;
export type Side = (typeof SIDES)[number];
export type Sides = number | Partial<Record<Side, number>>;
export function sides(v: unknown): [number, number, number, number] {
  const px = (n: unknown) => Math.max(0, Math.trunc(Number(n) || 0));
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return [px(o.top), px(o.right), px(o.bottom), px(o.left)];
  }
  return [px(v), px(v), px(v), px(v)];
}

/** A spacing setting that may be left out: its own value, else `otherwise`. */
const spacing = (v: unknown, otherwise: number) => (v === undefined || v === null || v === "" ? otherwise : Math.max(0, Number(v) || 0));

/** The view's gap, and layer k's: each edge's to its middle (its own, else the view's). */
function gapsOf(config: Record<string, any>, k: number) {
  const own = layerOf(config, k);
  const gap = Number(config.gap ?? LAYOUT.main.gap.default);
  return { gap, middle: Object.fromEntries(PANELS.map((p) => [p, spacing(own[p]?.gap, gap)])) as Record<Panel, number> };
}

/** Where a stack's panels go along an edge `length` long: each one's start and length, whole
 * px, from the edge's start. Each fixed (its share of the room, top and bottom, or its
 * length, left and right), filling (what the others leave, alike), or as its cards (as wide
 * or tall; a top or bottom one without cards: one of the view's `columns`, HA's own default
 * Width); without a setting, one alone fills. Too long: all but those filling shrink alike.
 * In order from the start, those held after them against the end; room over (none filling)
 * goes between, the others `arrange`d in what is left: from the start, centred, or against
 * the held ones (end). */
export function split(
  length: number,
  gap: number,
  items: readonly Section[],
  across: boolean,
  columns = 4,
  arrange = "start",
): { at: number; length: number }[] {
  const n = items.length;
  const ids = items.map((_, i) => i);
  const [free, held] = [ids.filter((i) => !items[i].hold), ids.filter((i) => items[i].hold)];
  const after = (i: number) => items[i].gapAfter ?? gap; // to the next along it
  const gaps = (is: number[]) => is.slice(0, -1).reduce((t, i) => t + after(i), 0);
  const room = Math.max(0, length - gaps([...free, ...held]));
  const fixed = (it: Section) => (across ? it.share !== undefined : it.length !== undefined);
  const fills = (it: Section) => !fixed(it) && (it.size === "fill" || (it.size === undefined && n === 1));
  const own = items.map((it) =>
    fills(it) ? 0 : across ? (it.share !== undefined ? room * it.share : it.wide || room / columns) : (it.length ?? it.tall ?? 0),
  );
  const total = own.reduce((t, v) => t + v, 0);
  const filling = items.filter(fills).length;
  const scale = total > room ? room / total : 1;
  const want = own.map((v, i) => (fills(items[i]) ? Math.max(0, room - total) / filling : v * scale));
  const span = (is: number[]) => is.reduce((t, i) => t + want[i], 0) + gaps(is);
  // The held ones against the end; the others in what is left, as arranged.
  const tail = held.length ? span(held) + (free.length ? after(free[free.length - 1]) : 0) : 0;
  const left = length - tail - span(free);
  const lead = filling ? 0 : arrange === "end" ? left : arrange === "centre" ? left / 2 : 0;
  const at: number[] = [];
  let x = Math.max(0, lead);
  for (const i of free) [at[i], x] = [x, x + want[i] + after(i)];
  x = length - (held.length ? span(held) : 0);
  for (const i of held) [at[i], x] = [x, x + want[i] + after(i)];
  // Each rounded where it starts and ends, so they meet as they should.
  return ids.map((i) => {
    const a = Math.round(at[i]);
    return { at: a, length: Math.round(at[i] + want[i]) - a };
  });
}

const floorDiv = (a: number, b: number) => Math.floor(a / b);

/** A layer's edges and middle in its box (`s`: width, height), as the shared engine lays out
 * one item a panel (layout.ts: layout, line for line), but each edge with its own gap to
 * the middle (`gaps`). An edge with nothing showing: none. */
function frame(s: Settings, gaps: Record<Panel, number>, main: string | null): { mid: Rect; edges: Record<Panel, Rect | null> } {
  const { width: w, height: h } = s;
  const shape = mainShape(s, main);
  const has = (p: Panel) => s[p].cameras.length > 0;
  const size = (p: Panel, of: number) =>
    !has(p) ? 0 : s[p].unit === "px" ? Math.min(pyRound(s[p].size * (s.scale ?? 1)), floorDiv(of * 45, 100)) : pyRound((of * s[p].size) / 100);
  const anchored = (p: Panel, end: "left" | "right") => {
    const key = `anchor_${end}` as const;
    return Boolean(s[p][key] ?? (LAYOUT.panels[p] as Record<string, unknown>)[key]);
  };
  let left: number, right: number, top: number, bottom: number;
  let mw = 0, mh = 0;
  if (shape === null) {
    [left, right, top, bottom] = [size("left", w), size("right", w), size("top", h), size("bottom", h)];
  } else {
    const smallest = Number(s.panel_min ?? LAYOUT.main.panel_min.default);
    const kept = (of: number, a: Panel, b: Panel) =>
      (has(a) ? pyRound((of * smallest) / 100) + gaps[a] : 0) + (has(b) ? pyRound((of * smallest) / 100) + gaps[b] : 0);
    const mostW = w - kept(w, "left", "right");
    const mostH = h - kept(h, "top", "bottom");
    mw = Math.min(pyRound((w * Number(s.main_width ?? LAYOUT.main.main_width.default)) / 100), mostW);
    mh = pyRound(mw / shape);
    if (mh > mostH) [mh, mw] = [mostH, pyRound(mostH * shape)];
    const share = (space: number, a: Panel, b: Panel): [number, number] => {
      const [ha, hb] = [has(a), has(b)];
      const room = Math.max(space - (ha ? gaps[a] : 0) - (hb ? gaps[b] : 0), 0);
      if (ha && hb) return [floorDiv(room, 2), room - floorDiv(room, 2)];
      return ha ? [room, 0] : hb ? [0, room] : [0, 0];
    };
    [left, right] = share(w - mw, "left", "right");
    [top, bottom] = share(h - mh, "top", "bottom");
  }
  const x0 = left + (left ? gaps.left : 0);
  const x1 = w - right - (right ? gaps.right : 0);
  const y0 = top + (top ? gaps.top : 0);
  const y1 = h - bottom - (bottom ? gaps.bottom : 0);
  const across = (p: Panel, y: number, height: number): Rect => {
    const a = anchored(p, "left") ? 0 : x0;
    const b = anchored(p, "right") ? w : x1;
    return [a, y, b - a, height];
  };
  const down = (x: number, width: number, end: "left" | "right"): Rect => {
    const a = top && anchored("top", end) ? y0 : 0;
    const b = bottom && anchored("bottom", end) ? y1 : h;
    return [x, a, width, b - a];
  };
  const areas: Record<Panel, Rect> = {
    top: across("top", 0, top),
    bottom: across("bottom", h - bottom, bottom),
    left: down(0, left, "left"),
    right: down(w - right, right, "right"),
  };
  let mid: Rect = [x0, y0, x1 - x0, y1 - y0];
  if (shape !== null) {
    mw = Math.min(mw, x1 - x0);
    mh = Math.min(mh, y1 - y0);
    mid = [x0 + floorDiv(x1 - x0 - mw, 2), y0 + floorDiv(y1 - y0 - mh, 2), mw, mh];
  }
  return { mid, edges: Object.fromEntries(PANELS.map((p) => [p, has(p) ? areas[p] : null])) as Record<Panel, Rect | null> };
}

/** Where a section goes: its grid column and row (CSS) and its rect (px, in the grid), and for
 * a main panel with a shape of its own (fit: fixed), its size, centred in its cell. */
export type Placed = { column: string; row: string; rect: Rect; width?: number; height?: number; centred?: boolean };
export type Placement = {
  inset: [number, number, number, number]; // the margin, px, top, right, bottom, left: inside the area (the grid's inset); in edit mode round the grid, outside it
  canvas: [number, number]; // the grid's size, px: the area less the margin; in edit mode less its sides of up to SQUEEZE only (layers: more)
  columns: string; // grid-template-columns
  rows: string; // grid-template-rows
  places: (Placed | null)[]; // each section's, in the view's order; null: not shown
  boxes: Rect[]; // each layer's room, px, in the grid
  gaps: Gap[]; // each gap there is (what makes it shows)
};

/** A gap: whose it is (an edge's, to its middle, or a panel's, after it along its edge), how
 * big it is set to be, which way it runs (`across`: a band left to right, so its line too),
 * and where: its grid lines (1-based, as Placed) and its rect (px, in the grid). */
export type Gap = {
  id: string;
  edge?: { layer: number; place: Panel };
  after?: number; // the section it is after
  size: number;
  across: boolean;
  column: [number, number];
  row: [number, number];
  rect: Rect;
};

/** A grid's lines one way: kept in order as they are added, each between two others. */
type Line = { at: number };
function lines() {
  const list: Line[] = [];
  return {
    /** A line at `at` (px) after `lo` and before `hi`, after any there at or before it. */
    add(at: number, lo?: Line, hi?: Line): Line {
      const line = { at };
      let i = lo ? list.indexOf(lo) + 1 : list.length;
      const j = hi ? list.indexOf(hi) : list.length;
      while (i < j && list[i].at <= at) i++;
      list.splice(i, 0, line);
      return line;
    },
    n: (line: Line) => list.indexOf(line) + 1,
    tracks: (unit: (size: number) => string) =>
      list
        .slice(1)
        .map((l, i) => unit(l.at - list[i].at))
        .join(" "),
  };
}

/** In edit mode, a margin side of up to this (px) is inside the area, as out of it; more,
 * round it. */
export const SQUEEZE = 25;

/** How many layers `sections` make (1 without any inner one). */
export const depthOf = (sections: readonly ({ layer: number; place: Place } | null)[]) =>
  Math.max(1, ...sections.flatMap((s) => (s && s.place !== "main" ? [s.layer] : [])));

/** The view's grid for `config` in an area w x h CSS px, for its `sections` (null: no panel)
 * and its max_columns (`columns`). Exact pixels; in edit mode, with HA's gaps between them,
 * columns in proportion and rows at least that tall. In edit mode with layers it grows
 * outwards, so each has room to edit: the innermost layer has the area, as if it were the
 * only one, and each outer one's edges are round it at the size they have out of edit mode
 * (the canvas, more than the area: the view scrolls). In edit mode the margin is round the
 * grid, outside it, so it takes no room from the panels (the view scrolls), and a hidden
 * edge takes its room as if it showed (it is shown, to be shown again). With `fit` (edit
 * mode of an empty view), all of it fits the area instead, no scrolling: no growing
 * outwards, every margin inside it, its rows shares of the area's height (never less than
 * what they hold). */
export function placePanels(
  config: Record<string, any>,
  area: [number, number],
  editing: boolean,
  sections: readonly (Section | null)[],
  columns = 4,
  fit = false,
): Placement {
  const depth = depthOf(sections);
  if (!editing || depth < 2 || fit) return place(config, area, editing, sections, columns, editing, fit);
  const seen = place(config, area, false, sections, columns, true);
  if (seen.boxes.length < depth) return place(config, area, editing, sections, columns);
  let fixed = config;
  for (let k = 1; k < depth; k++) {
    const [o, i] = [seen.boxes[k - 1], seen.boxes[k]];
    const { middle } = gapsOf(config, k);
    const less = (d: number, p: Panel) => (d > 0 ? d - middle[p] : 0); // an edge, from its room and its gap
    const px: Record<string, number> = {
      left: less(i[0] - o[0], "left"),
      top: less(i[1] - o[1], "top"),
      right: less(o[0] + o[2] - i[0] - i[2], "right"),
      bottom: less(o[1] + o[3] - i[1] - i[3], "bottom"),
    };
    fixed = withLayer(fixed, k, (c) => ({ ...c, ...Object.fromEntries(PANELS.map((p) => [p, { ...c[p], size: px[p], unit: "px" }])) }));
  }
  const inner = seen.boxes[depth - 1];
  // The area, and round it what the outer layers took out of edit mode.
  return place(fixed, [area[0] + seen.canvas[0] - inner[2], area[1] + seen.canvas[1] - inner[3]], true, sections, columns);
}

function place(
  config: Record<string, any>,
  [aw, ah]: [number, number],
  editing: boolean,
  sections: readonly (Section | null)[],
  columns: number,
  keep = editing, // hidden edges placed
  fit = false, // edit mode, fitting the area
): Placement {
  // The margin is the grid's inset, so the panels are laid out inside it; in edit mode a side
  // of more than SQUEEZE round it (the view scrolls), one of less inside, as out of it, so a
  // view of small margins still fits. Each side at most half the shorter one, less one.
  const cap = Math.max(0, Math.floor((Math.min(aw, ah) - 1) / 2));
  const m = sides(config.margin).map((v) => Math.min(v, cap)) as [number, number, number, number];
  const inside = m.map((v) => (!editing || fit || v <= SQUEEZE ? v : 0));
  const [w, h] = [aw - inside[1] - inside[3], ah - inside[0] - inside[2]];
  const depth = depthOf(sections);
  const main = sections.findIndex((s) => s?.place === "main" && s.shows);
  const [X, Y] = [lines(), lines()];
  const cells: ({ col: [Line, Line]; row: [Line, Line]; rect?: Rect; width?: number; height?: number; centred?: boolean } | undefined)[] = [];
  const boxes: Rect[] = [];
  const bands: { id: string; edge?: Gap["edge"]; after?: number; size: number; across: boolean; col: [Line, Line]; row: [Line, Line] }[] = [];
  let [x0, x5, y0, y5] = [X.add(0), X.add(w), Y.add(0), Y.add(h)]; // the layer's room
  for (let k = 1; k <= depth; k++) {
    const box: Rect = [x0.at, y0.at, x5.at - x0.at, y5.at - y0.at];
    boxes.push(box);
    const mine = (p: string) => sections.flatMap((s, n) => (s && s.layer === k && s.place === p && s.shows ? [n] : []));
    const inner = sections.some((s) => s?.shows && s.place !== "main" && s.layer > k);
    const shows = (p: string) => (p === "main" ? main >= 0 || (k < depth && inner) : mine(p).length > 0);
    const natural = (p: string) => Math.max(0, ...mine(p).map((n) => (p === "top" || p === "bottom" ? sections[n]!.tall : sections[n]!.wide) ?? 0));
    const own = layerOf(config, k);
    const lc = { ...config, ...Object.fromEntries(PANELS.map((p) => [p, own[p]])), ...(k < depth && { main_fit: "fit" }) };
    const s = { ...settingsOf(lc, box[2], box[3], shows, natural, keep), margin: 0 };
    const gaps = gapsOf(config, k);
    const { mid, edges } = frame(s, gaps.middle, shows("main") ? "main" : null);
    const at = (p: Panel) => edges[p] ?? [0, 0, 0, 0];
    const [l, t, r, b] = [at("left")[2], at("top")[3], at("right")[2], at("bottom")[3]];
    const g = gaps.middle;
    // Panel, gap, middle, gap, panel each way.
    const x1 = X.add(x0.at + l, x0, x5);
    const x2 = X.add(x0.at + (l && l + g.left), x1, x5);
    const x3 = X.add(x5.at - (r && r + g.right), x2, x5);
    const x4 = X.add(x5.at - r, x3, x5);
    const y1 = Y.add(y0.at + t, y0, y5);
    const y2 = Y.add(y0.at + (t && t + g.top), y1, y5);
    const y3 = Y.add(y5.at - (b && b + g.bottom), y2, y5);
    const y4 = Y.add(y5.at - b, y3, y5);
    // Each panel's cells by its part, not by matching its edges to the lines: a panel none
    // tall (an empty size: auto one) has lines that are the next one's too, yet in edit mode
    // it grows to hold HA's Add card. Top: the first row, bottom: the last, the sides the
    // first and last columns; across each other as the engine anchors them (layout.ts:
    // across, down), a side stopping at a top or bottom that shows and is anchored over it.
    const anchored = (p: "top" | "bottom", end: "left" | "right") => Boolean(s[p][`anchor_${end}`]);
    const over = (p: "top" | "bottom", end: "left" | "right") => edges[p] !== null && anchored(p, end);
    const spans: Record<(typeof PANELS)[number], { cross: [Line, Line]; along: [Line, Line] }> = {
      top: { cross: [y0, y1], along: [anchored("top", "left") ? x0 : x2, anchored("top", "right") ? x5 : x3] },
      bottom: { cross: [y4, y5], along: [anchored("bottom", "left") ? x0 : x2, anchored("bottom", "right") ? x5 : x3] },
      left: { cross: [x0, x1], along: [over("top", "left") ? y2 : y0, over("bottom", "left") ? y3 : y5] },
      right: { cross: [x4, x5], along: [over("top", "right") ? y2 : y0, over("bottom", "right") ? y3 : y5] },
    };
    for (const p of PANELS) {
      if (!edges[p]) continue;
      const across = p === "top" || p === "bottom";
      const L = across ? X : Y;
      const { cross, along } = spans[p];
      const [start, end] = along;
      const ns = mine(p);
      const parts = split(end.at - start.at, gaps.gap, ns.map((n) => sections[n]!), across, columns, own[p]?.arrange);
      // In the order they lie along it (held ones after the others), each its lines.
      const order = ns.map((_, i) => i).sort((a, b) => parts[a].at - parts[b].at);
      let last = start;
      const lain: [number, Line, Line][] = [];
      order.forEach((i, j) => {
        const [from, to] = [start.at + parts[i].at, start.at + parts[i].at + parts[i].length];
        const a = j === 0 && from === start.at ? start : L.add(from, last, end);
        const z = j === order.length - 1 && to === end.at ? end : L.add(to, a, end);
        cells[ns[i]] = across ? { col: [a, z], row: cross } : { col: cross, row: [a, z] };
        lain.push([ns[i], a, z]);
        last = z;
      });
      // Its gap to the middle (while it has any depth), along it; those between its panels
      // (none wide too: they are there, to be set).
      const deep = cross[1].at > cross[0].at;
      const inside: Record<Panel, [Line, Line]> = { top: [y1, y2], bottom: [y3, y4], left: [x1, x2], right: [x3, x4] };
      if (deep)
        bands.push({
          id: `${k}.${p}`,
          edge: { layer: k, place: p },
          size: g[p],
          across,
          ...(across ? { col: along, row: inside[p] } : { col: inside[p], row: along }),
        });
      lain.slice(1).forEach(([, a], j) => {
        const [n, , z] = lain[j];
        bands.push({ id: `after.${n}`, after: n, size: sections[n]!.gapAfter ?? gaps.gap, across: !across, ...(across ? { col: [z, a], row: cross } : { col: cross, row: [z, a] }) });
      });
    }
    if (k < depth) {
      if (!mid) break; // nothing inside shows
      [x0, x5, y0, y5] = [x2, x3, y2, y3];
    } else if (main >= 0 && mid) {
      // The middle cell; a main with a shape of its own (fit: fixed) is centred in it.
      const rect: Rect = [box[0] + mid[0], box[1] + mid[1], mid[2], mid[3]];
      const shaped = mid[2] < x3.at - x2.at || mid[3] < y3.at - y2.at;
      cells[main] = { col: [x2, x3], row: [y2, y3], rect, ...(shaped && { width: mid[2], centred: true, ...(!editing && { height: mid[3] }) }) };
    }
  }
  return {
    inset: m,
    canvas: [w, h],
    // In edit mode in proportion, but never narrower than what they hold needs (view.ts: a
    // panel's least, for HA's editors).
    columns: X.tracks((n) => (editing ? `minmax(auto, ${n}fr)` : `${n}px`)),
    rows: Y.tracks((n) => (fit ? `minmax(auto, ${n}fr)` : editing ? `minmax(${n}px, auto)` : `${n}px`)),
    places: sections.map((_, n) => {
      const c = cells[n];
      if (!c) return null;
      const { col, row, rect, ...rest } = c;
      return {
        column: `${X.n(col[0])} / ${X.n(col[1])}`,
        row: `${Y.n(row[0])} / ${Y.n(row[1])}`,
        rect: rect ?? [col[0].at, row[0].at, col[1].at - col[0].at, row[1].at - row[0].at],
        ...rest,
      };
    }),
    boxes,
    gaps: bands.map(({ col, row, ...b }) => ({
      ...b,
      column: [X.n(col[0]), X.n(col[1])],
      row: [Y.n(row[0]), Y.n(row[1])],
      rect: [col[0].at, row[0].at, col[1].at - col[0].at, row[1].at - row[0].at],
    })),
  };
}

/** A line in a gap (an edge's `line`, a panel's `line_after`): its width (px, 1 if not
 * set), colour (CSS, or [r, g, b]; black), style (solid, dashed, dotted, double), its knock
 * (px across from the gap's middle) and how far it runs past each end (`extend_start` at the
 * top or left, `extend_end` at the bottom or right; less than none: stops short). It takes
 * no room. */
export type GapLine = {
  width?: number;
  color?: string | number[];
  style?: "solid" | "dashed" | "dotted" | "double";
  knock?: number;
  extend_start?: number;
  extend_end?: number;
};
/** A line to draw, px in the grid (of the gap `id`). */
export type Drawn = { id: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number; style: string };

/** The lines in `gaps` (`lineOf` each, none: no line), each along its gap's middle, knocked
 * across and run past or short of its ends; `rectOf` where each gap is (its rect if not). */
export function gapLines(gaps: readonly Gap[], lineOf: (g: Gap) => GapLine | undefined, rectOf: (g: Gap) => Rect = (g) => g.rect): Drawn[] {
  return gaps.flatMap((g) => {
    const l = lineOf(g);
    if (!l) return [];
    const [x, y, w, h] = rectOf(g);
    const [knock, s0, s1] = [Number(l.knock) || 0, Number(l.extend_start) || 0, Number(l.extend_end) || 0];
    const color = Array.isArray(l.color) ? `rgb(${l.color.join(", ")})` : (l.color ?? "#000");
    const base = { id: g.id, color, width: l.width === undefined ? 1 : Math.max(0, Number(l.width) || 0), style: l.style ?? "solid" };
    return g.across
      ? [{ ...base, x1: x - s0, y1: y + h / 2 + knock, x2: x + w + s1, y2: y + h / 2 + knock }]
      : [{ ...base, x1: x + w / 2 + knock, y1: y - s0, x2: x + w / 2 + knock, y2: y + h + s1 }];
  });
}

/** What a view saw out of edit mode: the panels' area, the space above its header then
 * (none: no header), and how tall its sections' cards were (by position). */
export type Seen = { shown?: [number, number]; top?: number; naturals: Record<string, number> };
const SEEN = new Map<string, Seen>();
/** A view's, by dashboard and view: kept outside the view, as saving its config (the
 * options' Save) makes HA build a new one, in edit mode, which would otherwise
 * measure its panels with HA's editors in them. */
export function seenOut(dashboard: string, view: number): Seen {
  const key = `${dashboard}/${view}`;
  let seen = SEEN.get(key);
  if (!seen) SEEN.set(key, (seen = { naturals: {} }));
  return seen;
}
