// Contraption's kit: what every tile is drawn and moved with. A tile is written as an SVG
// drawing whose moving parts have names (`data-p`). The drawing is made into bitmaps once
// (sprites.ts), and from then on a part is this record: where it is, how far it has
// turned and how much of it shows. A tile's pose writes to its parts with `move`, `turn`,
// `show` and `draw`, and a frame only places them (stage.ts). Nothing here touches the page.
import { hash } from "../digs/world.ts";

export { hash };

/** A matrix as the canvas takes it: a, b, c, d, e, f. */
export type Mat = [number, number, number, number, number, number];
export type Box = [x: number, y: number, w: number, h: number];
/** Where a bitmap is in the atlas, in px. */
export type Slot = { page: HTMLCanvasElement; x: number; y: number; w: number; h: number };
/** One bitmap: a drawing and the box it is seen through, in the drawing's units. `from`
 * is the element it was made from, for one that is made again when its words or its
 * colour change: such a drawing carries its device's id, so it is never the same as
 * another's and shares no bitmap. `wob` has the engraving's wobble. */
export type Piece = { markup: string; box: Box; at?: Slot; from?: Element; wob?: boolean };
/** How a part that turns was made into bitmaps: from `lo` degrees over `span`, and
 * whether it comes round again (a wheel) or stops at its ends (a lever). */
export type Ring = { lo: number; span: number; wrap: boolean };

export type Part = {
  name: string;
  m: Mat; // how its own space sits in its parent part's, before any pose
  kids: Part[];
  looks: Piece[]; // none: it only holds its kids, or is a line. One: placed as it is. More: one for each angle of `ring`
  ring?: Ring;
  line?: number; // a line the pose draws (`d`): its width, as a share of the skin's
  d: string;
  x: number; y: number; // moved by
  deg: number; cx: number; cy: number; // turned by, about
  sx: number; sy: number; // squashed by
  o: number; // how much it shows: 0 is not drawn at all, nor are its kids
};

export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const pick = <T>(id: string, list: T[]) => list[hash(id) % list.length];
/** Towards `to` at a steady rate, `step` at a time. */
export const toward = (x: number, to: number, step: number) => (x < to ? Math.min(to, x + step) : Math.max(to, x - step));

/** A soft spring towards `target`, so things overshoot and settle as if on a rope. */
export function spring(s: { x: number; v: number }, target: number, dt: number, k = 70, c = 9) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
  if (Math.abs(target - s.x) < 0.001 && Math.abs(s.v) < 0.001) Object.assign(s, { x: target, v: 0 });
  return s.x;
}

export const move = (p: Part, x: number, y: number) => void Object.assign(p, { x, y });
export const turn = (p: Part, deg: number, cx = 0, cy = 0) => void Object.assign(p, { deg, cx, cy });
export const show = (p: Part, o: number) => void (p.o = o);
/** A line part's shape for this frame, as an SVG path. */
export const draw = (p: Part, d: string) => void (p.d = d);

/** Names in a drawing are the house's own: they go in as text, never as markup. */
export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** A cog of `n` teeth, turned as the part `name`. Its hub turns with it: everything in a
 * tile's moving layer has to be inside a part, or it is not drawn. */
export function cog(x: number, y: number, r: number, n: number, name: string) {
  let teeth = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    teeth += `M${(c * r).toFixed(1)},${(s * r).toFixed(1)} L${(c * (r + 3.5)).toFixed(1)},${(s * (r + 3.5)).toFixed(1)} `;
  }
  return `<g transform="translate(${x},${y})"><g data-p="${name}" data-ring="24"><circle class="fill" r="${r}"/>
    <path d="${teeth}M0,0 L${r - 3},0"/><circle class="solid" r="1.8"/></g></g>`;
}

/** Lazy tongs `len` long along x, of `n` crossings whose bars are `arm` long: they get
 * wider as they close, as real ones do. */
export function scissor(len: number, n: number, arm: number) {
  const seg = len / n, w = Math.sqrt(Math.max(0, arm * arm - seg * seg)) / 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i * seg).toFixed(1), b = ((i + 1) * seg).toFixed(1), u = w.toFixed(1);
    d += `M${a},-${u} L${b},${u} M${a},${u} L${b},-${u} `;
  }
  return d;
}

/** A after B: what B does, then what A does. */
export const mul = (A: Mat, B: Mat): Mat => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];

/** A part's pose as a matrix: squashed, then turned about its pivot, then moved. */
export function posed(p: Part): Mat {
  const a = (p.deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  return [cos * p.sx, sin * p.sx, -sin * p.sy, cos * p.sy, p.x + p.cx - cos * p.cx + sin * p.cy, p.y + p.cy - sin * p.cx - cos * p.cy];
}

/** How a matrix turns and mirrors, for choosing a bitmap that was turned ahead of time:
 * `deg` is the angle of the bitmap to take, `flip` -1 if it is then to be mirrored left
 * to right, and `sx` and `sy` how big it is to be drawn. A mirrored part's bitmap is the
 * one turned the other way, since the mirror turns it back. */
export function facing(m: Mat) {
  const flip = m[0] * m[3] - m[1] * m[2] < 0 ? -1 : 1;
  const deg = (Math.atan2(flip * m[1], flip * m[0]) * 180) / Math.PI;
  return { deg: flip * deg, flip, sx: Math.hypot(m[0], m[1]), sy: Math.hypot(m[2], m[3]) };
}

/** Which of a ring's bitmaps shows a part turned `deg`. */
export function chosen(ring: Ring, steps: number, deg: number) {
  if (!ring.wrap) return clamp(Math.round(((deg - ring.lo) / ring.span) * (steps - 1)), 0, steps - 1);
  const round = (((deg - ring.lo) % ring.span) + ring.span) % ring.span;
  return Math.round((round / ring.span) * steps) % steps;
}

/** What `data-ring` says: "24" is 24 bitmaps round the circle, "90:6" six round a quarter
 * of it (a wheel of four spokes looks the same every quarter turn), and "-10..55:27" is 27
 * from -10 to 55 degrees, for a part that swings between two ends. */
export function ringOf(spec: string): { ring: Ring; steps: number } {
  const [range, count] = spec.includes(":") ? spec.split(":") : ["360", spec];
  const [lo, hi] = range.includes("..") ? range.split("..").map(Number) : [0, Number(range)];
  return { ring: { lo, span: hi - lo, wrap: !range.includes("..") }, steps: Number(count) };
}
