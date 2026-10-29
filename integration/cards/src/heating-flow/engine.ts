// The Heating Flow card's drawing engine: SVG as text, with no DOM, so it runs under the
// card tests' plain Node.
//
// A pipe is a polyline with rounded bends. Temperature sensors sit at points along it, and
// their readings are the stops of its colour gradient: colour shows temperature, and the
// moving chevrons show only flow. A reading that is not current drops out of the gradient,
// and its readout shows how long it has been missing (nothing fails silently).

/** One reading: its value, unit and precision, its entity, and, when not current, for how long. */
export type Reading = { v: number; unit: string; dp: number; e: string; stale?: string; text?: string };
export type Look = { pipes: "outline" | "glass" | "conduit" | "neon"; markers: "chev" | "arrow" | "bub"; colours: "temp" | "circuit"; readouts: "pill" | "text" };
/** An area, left to right: [key, x0, x1, label, its background colour variable]. */
export type Area = [string, number, number, string, string];
export type Sensor = { k: string; f?: number; at?: [number, number]; area?: string; show?: boolean };
export type Pipe = {
  pts: [number, number][];
  circ: string;
  w?: number;
  r?: number;
  z?: number;
  flow?: string;
  speed?: string;
  rev?: boolean;
  hops?: [number, number, "h" | "v"][];
  sensors?: Sensor[];
};

export const STOPS: [number, string][] = [[-5, "#3b47c9"], [5, "#2f86e0"], [15, "#2fbfd0"], [25, "#43c08a"], [35, "#e2c22e"], [45, "#f2902a"], [55, "#e8492f"], [65, "#b31e3d"]];
export const CIRCUIT: Record<string, string> = { brine: "#3b6fe0", pvt: "#f0a020", heat: "#e5443a", dhw: "#a652d6", hot: "#d6457f", cold: "#38b8e0", ref: "#7f8ea6" };
export const OFF = "#9aa3b2";

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (v: number[]) => "#" + v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, f: number) => toHex(hex(a).map((v, k) => v + (hex(b)[k] - v) * f));
export function ramp(t: number): string {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++)
    if (t <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
      return mix(ca, cb, (t - a) / (b - a));
    }
  return STOPS[STOPS.length - 1][1];
}

/** Text from config or entities, safe inside SVG. */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---- Geometry ----------------------------------------------------------------------------

type Seg = { ax: number; ay: number; bx: number; by: number; L: number; s0: number; ux: number; uy: number; k0: number; k1: number };

export function geometry(pts: [number, number][], r: number): { segs: Seg[]; total: number } {
  const segs: Seg[] = [];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, L, s0: s, ux: (bx - ax) / L, uy: (by - ay) / L, k0: 0, k1: 0 });
    s += L;
  }
  // Each bend is cut back by up to r on both sides and drawn as a curve.
  for (let i = 0; i < segs.length - 1; i++) segs[i].k1 = segs[i + 1].k0 = Math.min(r, segs[i].L / 2, segs[i + 1].L / 2);
  return { segs, total: s };
}

/** Square ends: each end runs on by e, so a pipe that ends on another reaches its far wall
 * (a tee) and two that meet at a corner close it. */
export function capped(pts: [number, number][], e: number): [number, number][] {
  const a = pts.slice(), n = pts.length;
  const run = ([x0, y0]: number[], [x1, y1]: number[]): [number, number] => {
    const L = Math.hypot(x1 - x0, y1 - y0);
    return [x1 + ((x1 - x0) / L) * e, y1 + ((y1 - y0) / L) * e];
  };
  a[0] = run(pts[1], pts[0]);
  a[n - 1] = run(pts[n - 2], pts[n - 1]);
  return a;
}

/** The drawn path's length: the straights, and each bend's curve measured in steps. */
export function drawnLength(segs: Seg[]): number {
  let L = 0;
  segs.forEach((g, i) => {
    L += g.L - g.k0 - g.k1;
    if (!g.k1) return;
    const n = segs[i + 1], p0 = [g.bx - g.ux * g.k1, g.by - g.uy * g.k1], p2 = [n.ax + n.ux * n.k0, n.ay + n.uy * n.k0];
    let [px, py] = p0;
    for (let t = 0.1; t <= 1.0001; t += 0.1) {
      const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * g.bx + t * t * p2[0], y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * g.by + t * t * p2[1];
      L += Math.hypot(x - px, y - py);
      [px, py] = [x, y];
    }
  });
  return L;
}

/** Distance along the pipe of a point on it. */
function sOf(segs: Seg[], [x, y]: [number, number]): number {
  for (const g of segs) {
    const t = (x - g.ax) * g.ux + (y - g.ay) * g.uy;
    if (t >= -0.5 && t <= g.L + 0.5 && Math.hypot(g.ax + g.ux * t - x, g.ay + g.uy * t - y) < 1) return g.s0 + t;
  }
  return 0;
}

export function pointAt(segs: Seg[], s: number) {
  for (const g of segs)
    if (s <= g.s0 + g.L || g === segs[segs.length - 1]) {
      const t = Math.min(Math.max(s - g.s0, 0), g.L);
      return { x: g.ax + g.ux * t, y: g.ay + g.uy * t, horiz: Math.abs(g.uy) < 1e-6 };
    }
  return { x: 0, y: 0, horiz: true };
}

/** The temperature at s, between the stops either side (held flat beyond the ends). */
export function tempAt(stops: [number, number][], s: number): number | null {
  if (!stops.length) return null;
  if (s <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (s <= stops[i][0]) {
      const [s0, t0] = stops[i - 1], [s1, t1] = stops[i];
      return t0 + ((t1 - t0) * (s - s0)) / (s1 - s0 || 1);
    }
  return stops[stops.length - 1][1];
}

/** Where along the pipe each sensor sits: a fraction (f), a point (at), or spread evenly over
 * the stretch of the pipe inside an area (area), in the order they are listed. */
export function place(sensors: Sensor[], segs: Seg[], total: number, rev: boolean | undefined, areas: Area[]) {
  const byArea: Record<string, Sensor[]> = {};
  sensors.forEach((x) => x.area && (byArea[x.area] ||= []).push(x));
  const span: Record<string, [number, number]> = {};
  for (const name in byArea) {
    const a = areas.find((z) => z[0] === name);
    let lo = Infinity, hi = -Infinity;
    for (let s = 0; a && s <= total; s += 2) {
      const pt = pointAt(segs, s);
      if (pt.x >= a[1] && pt.x < a[2]) [lo, hi] = [Math.min(lo, s), Math.max(hi, s)];
    }
    span[name] = lo <= hi ? [lo, hi] : [0, total];
  }
  return sensors.map((x) => {
    if (x.area) {
      const list = byArea[x.area], [lo, hi] = span[x.area];
      return { ...x, s: lo + ((list.indexOf(x) + 1) * (hi - lo)) / (list.length + 1) };
    }
    return { ...x, s: x.at ? sOf(segs, x.at) : (rev ? 1 - (x.f ?? 0) : (x.f ?? 0)) * total };
  });
}
