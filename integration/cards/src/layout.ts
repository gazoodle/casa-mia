// The layout engine, line for line the compositor's (app/src/casa_mia/modules/compositor.py:
// commander_layout and its helpers), so a commander and a Tablet Layout lay out alike. Both
// are checked against tests/layout_cases.json: change one, change the other. Python's
// rounding is kept (round half to even, int() towards zero, // down), or a pixel drifts.
import LAYOUT from "../../../app/src/casa_mia/layout.json" with { type: "json" };

export { LAYOUT };
export type Rect = [x: number, y: number, w: number, h: number];
export const PANELS = ["left", "top", "right", "bottom"] as const;
export type Panel = (typeof PANELS)[number];
export const STACKS = ["stack", "reverse", "centre"];

export type PanelSettings = {
  cameras: string[]; // what it holds, by key (a commander's cameras, a layout's cards)
  size: number;
  unit?: string; // of size: % (the default) or px
  fit?: string;
  lines?: number;
  anchor_left?: boolean;
  anchor_right?: boolean;
};
export type Settings = {
  width: number;
  height: number;
  gap: number;
  margin?: number;
  scale?: number; // px sizes grow by it, as the gap and margin do
  main_fit?: string;
  main_width?: number;
  main_ratio?: string | number;
  panel_min?: number;
  aspects?: Record<string, number>; // key -> its shape (width / height)
} & Record<Panel, PanelSettings>;

/** Python's round(): halves to the even neighbour. */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  return d > 0.5 ? f + 1 : d < 0.5 ? f : f % 2 === 0 ? f : f + 1;
}
const floorDiv = (a: number, b: number) => Math.floor(a / b);

/** n tiles in a line filling rect: down a column, or across a row. */
function line(rect: Rect, n: number, down: boolean, gap: number): Rect[] {
  const [x, y, w, h] = rect;
  const span = down ? h : w;
  const edges = Array.from({ length: n + 1 }, (_, i) => pyRound((i * (span - (n - 1) * gap)) / n + i * gap));
  const cells = Array.from({ length: n }, (_, i): [number, number] => [
    edges[i],
    edges[i + 1] - edges[i] - (i < n - 1 ? gap : 0),
  ]);
  cells[n - 1] = [cells[n - 1][0], span - cells[n - 1][0]];
  return cells.map(([a, b]): Rect => (down ? [x, y + a, w, b] : [x + a, y, b, h]));
}

/** Tiles at their own shapes in a line, edge to edge: from the start (stack), against the
 * end (reverse) or in the middle (centre); too long for rect, all shrink alike. */
function stack(rect: Rect, shapes: number[], down: boolean, gap: number, place: string): Rect[] {
  const [x, y, w, h] = rect;
  const [across, span] = down ? [w, h] : [h, w];
  let lengths = shapes.map((a) => (down ? across / a : across * a));
  const room = span - gap * (shapes.length - 1);
  const sum = lengths.reduce((s, n) => s + n, 0);
  const scale = sum > 0 && room > 0 ? Math.min(1.0, room / sum) : 0.0;
  const side = Math.trunc(across * scale);
  lengths = lengths.map((n) => Math.trunc(n * scale));
  const total = lengths.reduce((s, n) => s + n, 0) + gap * (shapes.length - 1);
  let at = place === "reverse" ? span - total : place === "centre" ? floorDiv(span - total, 2) : 0;
  const off = floorDiv(across - side, 2);
  return lengths.map((n): Rect => {
    const r: Rect = down ? [x + off, y + at, side, n] : [x + at, y + off, n, side];
    at += n + gap;
    return r;
  });
}

/** n tiles in `lines` lines filling rect: columns (down) or rows (across), the first lines
 * taking one more when they don't share evenly. */
function lines(rect: Rect, n: number, count: number, down: boolean, gap: number, shapes: number[] | null, place: string): Rect[] {
  count = Math.max(1, Math.min(count, n));
  const strips = line(rect, count, !down, gap);
  const out: Rect[] = [];
  let first = 0;
  strips.forEach((strip, i) => {
    const k = Math.floor(n / count) + (i < n % count ? 1 : 0);
    out.push(...(shapes === null ? line(strip, k, down, gap) : stack(strip, shapes.slice(first, first + k), down, gap, place)));
    first += k;
  });
  return out;
}

/** A shape as a number: 1.78, "1.78", "16:9" or "16/9" (width over height). */
export function ratio(value: unknown): number {
  let n: number;
  if (typeof value === "number") n = value;
  else {
    const [a, b] = String(value).trim().replace("/", ":").split(":");
    n = b !== undefined ? Number(a) / Number(b) : Number(a);
  }
  if (!(n > 0)) throw new Error(`not a shape: ${value}`);
  return n;
}

const def = (key: keyof typeof LAYOUT.main) => LAYOUT.main[key].default;

/** The main item's shape when it sets its own size (own, fixed), else null. */
export function mainShape(s: Settings, main: string | null): number | null {
  const fit = s.main_fit ?? def("main_fit");
  if (fit === "fixed") return ratio(s.main_ratio ?? def("main_ratio"));
  if (fit === "own") return Number((s.aspects ?? {})[main ?? ""] || 16 / 9);
  return null;
}

/** Canvas size, the main area, and each panel's tile rects: see commander_layout. */
export function layout(s: Settings, main: string | null = null): [[number, number], Rect, Record<Panel, Rect[]>] {
  const { width: w, height: h, gap } = s;
  const m = Math.max(0, Math.min(Math.trunc(Number(s.margin ?? 0)), floorDiv(Math.min(w, h) - 1, 2)));
  if (m) {
    const [, area, tiles] = layout({ ...s, width: w - 2 * m, height: h - 2 * m, margin: 0 }, main);
    const moved = (r: Rect): Rect => [r[0] + m, r[1] + m, r[2], r[3]];
    return [[w, h], moved(area), Object.fromEntries(PANELS.map((p) => [p, tiles[p].map(moved)])) as Record<Panel, Rect[]>];
  }
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
    const smallest = Number(s.panel_min ?? def("panel_min"));
    const kept = (of: number, a: Panel, b: Panel) => (Number(has(a)) + Number(has(b))) * (pyRound((of * smallest) / 100) + gap);
    const mostW = w - kept(w, "left", "right");
    const mostH = h - kept(h, "top", "bottom");
    mw = Math.min(pyRound((w * Number(s.main_width ?? def("main_width"))) / 100), mostW);
    mh = pyRound(mw / shape);
    if (mh > mostH) [mh, mw] = [mostH, pyRound(mostH * shape)];
    const share = (space: number, a: Panel, b: Panel): [number, number] => {
      const [ha, hb] = [has(a), has(b)];
      const room = Math.max(space - gap * (Number(ha) + Number(hb)), 0);
      if (ha && hb) return [floorDiv(room, 2), room - floorDiv(room, 2)];
      return ha ? [room, 0] : hb ? [0, room] : [0, 0];
    };
    [left, right] = share(w - mw, "left", "right");
    [top, bottom] = share(h - mh, "top", "bottom");
  }
  const x0 = left + (left ? gap : 0);
  const x1 = w - right - (right ? gap : 0);
  const y0 = top + (top ? gap : 0);
  const y1 = h - bottom - (bottom ? gap : 0);
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
  const shapes = (p: Panel) =>
    STACKS.includes(s[p].fit ?? "") ? s[p].cameras.map((e) => Number((s.aspects ?? {})[e] || 16 / 9)) : null;
  const tiles = Object.fromEntries(
    PANELS.map((p) => [
      p,
      has(p)
        ? lines(areas[p], s[p].cameras.length, Math.trunc(Number(s[p].lines ?? 1)), p === "left" || p === "right", gap, shapes(p), s[p].fit ?? "cover")
        : [],
    ]),
  ) as Record<Panel, Rect[]>;
  let mainArea: Rect = [x0, y0, x1 - x0, y1 - y0];
  if (shape !== null) {
    mw = Math.min(mw, x1 - x0);
    mh = Math.min(mh, y1 - y0);
    mainArea = [x0 + floorDiv(x1 - x0 - mw, 2), y0 + floorDiv(y1 - y0 - mh, 2), mw, mh];
  }
  return [[w, h], mainArea, tiles];
}
