// A tile of Contraption. Every tile is 260 square and keeps one rule, at its edges: a duck
// comes in at the middle of one edge as the period starts and goes out at the middle of
// another as it ends. What happens in between is the tile's own business, and no two
// tiles do the same thing.
//
// Two rules for whoever draws one, which the bitmaps need (sprites.ts):
//   - Everything in `live` is inside a named part (`data-p`), or it is not drawn. An
//     element with a name has no transform of its own: the pose is the frame's.
//   - A part that turns says how it is to be made into bitmaps (`data-ring`, kit.ts).
import { clamp, esc, type Part } from "./kit.ts";

export const S = 260;

/** A device as a tile sees it. The page keeps one of these for each device and changes it
 * in place, so a tile can hold on to its own. `level` is in per cent. */
export type Dev = { id: string; name: string; kind: string; on: boolean; level: number; dims: boolean; colour?: string; group?: string };
/** What a tile is told each frame: how far through the period (0 to 1), which way the
 * duck goes this period (fixed as it comes in, so that it never jumps), and the time.
 * For a tile with several ways in or out: which way in this duck came by (`from`), which
 * way out it is to go (`to`), and how many periods the machine has run (`turn`). A duck
 * that came up out of the tile's hole has a `from` below nought (-1 for the first tunnel
 * that comes up there, -2 for the second), and one that is to go down it a `to` below
 * nought, likewise. */
export type Ctx = { p: number; on: boolean; dt: number; now: number; from: number; to: number; turn: number };
/** Where the duck is: and, if the tile wants, turned (`r`), squashed, or out of sight (`o` 0). */
export type At = { x: number; y: number; r?: number; sx?: number; sy?: number; o?: number; i?: number; u?: number };
/** Something that can work loose (faults.ts). `loop` is the way a cord goes round, and
 * `run` how far it has gone, in px, `t` seconds in. */
export type Fault = { kind: "oil" | "bolt"; at: [number, number] } | { kind: "cord"; loop: [number, number][]; run(t: number): number };
export type Tile = {
  // The edges it is drawn to go in and out by, of L, R, T and B: "LR" is in by the left and
  // out by the right. One with several ways says them either side of ">": "L>RTB" has
  // three ways out, ">T" none in (its ducks all come up out of its hole) and "L>" none out
  // (they all go down it). The layout mirrors a tile where the stream runs the other way.
  io: string;
  pit?: [number, number]; // where its hole is, for a tile that has one: a tunnel ends there
  device?: string; // the id of the device it shows, if it shows one
  still?: string; // what never moves
  live?: string; // what does
  span?: number; // how many tiles wide its drawing is (lights switched together)
  wide?: boolean; // its machine is shared by other tiles, so it runs on under a dust sheet
  steady?: boolean; // it keeps the period's own time
  faults?: Fault[];
  duck(c: Ctx): At;
  pose?(q: (name: string) => Part, c: Ctx): void;
  mode?(): boolean; // which way the duck is to go, where that is not just the device being on
};

/** The middle of each edge, where a duck crosses it. */
export const EDGE: Record<string, [number, number]> = { L: [0, S / 2], R: [S, S / 2], T: [S / 2, 0], B: [S / 2, S] };
/** A tile's ways in and out, as it is drawn or mirrored. */
export function edges(io: string, flip = false) {
  const [ins, outs] = io.includes(">") ? io.split(">") : [io[0], io[1]];
  const turned = (sides: string) => (flip ? sides.replace(/[LR]/g, (side) => (side === "L" ? "R" : "L")) : sides);
  return { ins: turned(ins), outs: turned(outs) };
}

/** Taking turns. The ducks that come into a tile in one period are numbered: those from
 * its ways in first, then those from its hole. Where they can go is numbered too: its
 * ways out first, then down its hole. Duck `slot` goes to place `dealt` of `n`, and the
 * turn moves everyone on by one each period. The flow (flow.ts) and the tiles that show
 * it (points.ts) both go by this. */
export const dealt = (slot: number, turn: number, n: number) => (slot + turn) % n;

type Frame = [p: number, x: number, y: number, hop?: number];
/** A way through a tile, as [p, x, y, hop]: straight from each point to the next, or over
 * a hop that high. Answers with where the duck is, which leg it is on (`i`) and how far
 * along it (`u`). */
export function track(...frames: Frame[]) {
  return (p: number) => {
    let i = 0;
    while (i < frames.length - 2 && p >= frames[i + 1][0]) i++;

    const [p0, x0, y0, hop = 0] = frames[i], [p1, x1, y1] = frames[i + 1];
    const u = clamp((p - p0) / (p1 - p0));
    return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - hop * Math.sin(Math.PI * u), i, u };
  };
}

/** 1 while `p` is from `a` up to `b`. */
export const between = (p: number, a: number, b: number) => (p >= a && p < b ? 1 : 0);

/** An electric lamp hung at x, y: the glass, and the glow that is the part `name`. */
export const lamp = (x: number, y: number, r: number, name: string) => ({
  still: `<path class="thin" d="M${x},${y - r - 30} V${y - r - 8}"/><rect class="brass" x="${x - 6}" y="${y - r - 8}" width="12" height="10"/>
    <circle class="glass" cx="${x}" cy="${y}" r="${r}"/><path class="thin" d="M${x - 5},${y - r} v${r - 4} l5,7 l5,-7 v${4 - r}"/>`,
  live: `<g class="shine" data-p="${name}"><circle cx="${x}" cy="${y}" r="${r * 1.6}"/></g>`,
});

/** A device's name and what it is doing: the page writes the second line (`data-cap`).
 * It belongs in a tile's still drawing, which is made a bitmap again when the words change. */
export const caption = (d: Dev, x: number, y: number) => `<text data-cap="${esc(d.id)}" x="${x}" y="${y}" text-anchor="middle">${esc(d.name)}<tspan class="state" x="${x}" dy="15"></tspan></text>`;

/** Something that turns about x, y as the part `name`. `ring` says how alike it looks as it turns (kit.ts). */
export const wheel = (x: number, y: number, name: string, inner: string, ring = "24") => `<g transform="translate(${x},${y})"><g data-p="${name}" data-ring="${ring}">${inner}</g></g>`;

/** A device that has stopped answering is still a tile the ducks must get through, or
 * everything after it would stop too. So its machine goes under a dust sheet, and a tube
 * is clamped across from the way in to the way out (`from` and `to`, as [x, y]).
 * `through(p)` is where the duck is in the tube. One drawing serves every tile. The page
 * writes the sign's second and third lines (`data-word`, `data-since`). */
export function broken(d: Dev, from: number[], to: number[]) {
  const through = (p: number): At => {
    const u = 1 - p;
    return { x: u * u * from[0] + 2 * u * p * 130 + p * p * to[0], y: u * u * from[1] + 2 * u * p * 130 + p * p * to[1], o: 0 };
  };
  const way = `M${from} Q130,130 ${to}`, half = through(0.5);
  // The sign goes in the corner the tube keeps clear of.
  const sx = half.x < 130 ? 186 : 74, sy = half.y < 130 ? 212 : 50;

  const art = `<g data-p="out">
    <path class="paper" d="M14,40 q40,-26 76,-8 q44,-30 84,-2 q40,-16 72,12 l4,196 q-34,14 -60,-2 q-30,16 -58,0 q-30,14 -60,-2 q-28,12 -62,0 z"/>
    <path class="thin" d="M90,32 q-8,60 6,110 M174,30 q10,80 -8,150 M60,120 q20,60 4,116 M214,90 q-12,70 6,140"/>
    <path class="tube" d="${way}"/><path class="bore" d="${way}"/><g data-p="lump"><circle class="paper" r="17"/></g>
    <g data-p="sign" data-sign="${esc(d.id)}"><g transform="translate(${sx},${sy}) rotate(-4)"><path d="M0,-28 V-40"/><rect class="label" x="-58" y="-28" width="116" height="56"/>
      <text text-anchor="middle" y="-8">${esc(d.name)}</text><text class="small" data-word text-anchor="middle" y="6"></text>
      <text class="small" data-since text-anchor="middle" y="19"></text></g></g></g>`;
  return { art, through };
}
