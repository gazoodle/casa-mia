// Digs' first texture pack, 4²: a block is sixteen texels square. Every texture, figure
// and letter is made here from a seeded pattern, so the page needs no pictures and holds
// nothing from any game. Each is painted when it is first asked for, and kept.
import { html } from "lit";
import { hash, rng } from "./world.ts";

type Paint = (x: number, y: number, r: () => number) => string | null;

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * k))).join()})`;
};
// A colour a step or two lighter or darker, in four steps as pixel art has.
const j = (hex: string, r: () => number, a = 0.1) => shade(hex, 1 + (Math.floor(r() * 4) - 1.5) * a);
const edge = (x: number, y: number, w = 16, h = 16) => x === 0 || y === 0 || x === w - 1 || y === h - 1;
const WOOD = "#b98a4e", DARK = "#7d5a30", GREY = "#868686", SKIN = "#e0b088", INK = "#2a2018";

/** How far a texel is from a point. */
const round = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);
const plank = (hex: string): Paint => (x, y, r) => (y % 4 === 3 || x === ((y >> 2) * 7 + 3) % 16 ? shade(hex, 0.7) : j(hex, r, 0.06));
// A lantern on a post out of doors: panes in a frame, lit from within.
const lantern = (frame: string, grid: string, inner: string, a: number): Paint => (x, y, r) => (edge(x, y) ? frame : x % 5 === 0 || y % 5 === 0 ? grid : j(inner, r, a));
// A pendant hung from the ceiling: a cord, a shade that widens to its rim, and a bulb under it.
const pendant = (on: boolean): Paint => (x, y, r) => {
  const mid = Math.abs(x - 7.5);
  if (y < 5) return mid < 1 ? "#3a2a18" : null;
  if (y < 10) return mid < 2.5 + (y - 5) * 1.2 ? (y === 9 ? (on ? "#8a5a1c" : "#3a2410") : j(on ? "#c8963a" : "#5a3c1c", r, 0.08)) : null;
  if (y < 12) return mid < 2 ? (on ? (y === 10 ? "#fff8d8" : "#ffe9a0") : "#8a8a80") : null;
  return on && y === 12 && mid < 2 ? "rgba(255,233,160,.5)" : null;
};
// A machine with a window in its front, a stove with a fire in its mouth, and a block with a lamp in it.
const machine = (on: boolean): Paint => (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : x > 3 && x < 12 && y > 5 && y < 13 ? (on ? j("#ffb030", r, 0.2) : "#26262a") : y < 3 ? shade(GREY, 1.15) : j("#7c7f86", r, 0.06));
const stove = (on: boolean): Paint => (x, y, r) =>
  x > 3 && x < 12 && y > 7 && y < 14 ? (on ? (r() < 0.35 ? "#ffe45c" : j("#e8641e", r, 0.2)) : "#1c1a18") : y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 0 ? shade(GREY, 0.6) : j("#77706a", r, 0.07);
const beacon = (on: boolean): Paint => (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : Math.hypot(x - 7.5, y - 7.5) < 4.5 ? (on ? j("#e02c3c", r, 0.2) : "#4a2226") : j("#7c7f86", r, 0.06));
// A lever on its plate: thrown to the right with a lit tip when on.
const lever = (on: boolean): Paint => (x, y) => {
  if (y > 11) return x > 2 && x < 13 ? shade(GREY, y === 12 ? 1 : 0.7) : null;
  const at = on ? 8 + (11 - y) / 2 : 7 - (11 - y) / 2;
  if (y < 3 || Math.abs(x - at) > 1) return null;
  return y < 5 ? (on ? "#e02c3c" : "#5a3a3a") : DARK;
};
const chandelier = (glow: string): Paint => (x, y) =>
  (x === 7 || x === 8) && y < 6 ? "#4a3016" : y > 5 && y < 9 && x > 0 && x < 15 ? "#a8742a" : y > 8 && y < 14 && x % 4 > 0 && x % 4 < 3 && x > 0 && x < 15 ? glow : null;
/** A figure's build, in texels: how tall in all, how many rows the head and the body
 * take (the legs have the rest), half its width facing us, and how far apart its feet go
 * in a stride. A grown-up's is the figure Digs has always drawn; a child and a toddler
 * are drawn at the same texel size, shorter, never the grown figure shrunk (which would
 * give it texels of uneven sizes). Which one a person is comes from Casa Mia's People
 * (household.py), by the band their age falls in. */
export type Build = { h: number; head: number; body: number; half: number; stride: number };
export const BUILDS = {
  grown: { h: 32, head: 8, body: 12, half: 4, stride: 4 },
  child: { h: 24, head: 7, body: 8, half: 3, stride: 3 },
  toddler: { h: 20, head: 7, body: 6, half: 3, stride: 2 },
  // A baby sits or crawls (`baby` below): only its height is used.
  baby: { h: 12, head: 6, body: 4, half: 3, stride: 0 },
} satisfies Record<string, Build>;
export type Shape = keyof typeof BUILDS;

// A person, facing us: the standing frame. The eyes are either side of the middle.
const facing = (b: Build, hair: string, top: string, legs: string): Paint => (x, y) => {
  const [l, r, waist] = [8 - b.half, 7 + b.half, b.head + b.body];
  if (y < b.head) return x < l || x > r ? null : y < 3 ? hair : y === b.head >> 1 && (x === 6 || x === 9) ? INK : SKIN;
  if (y < waist) return x >= l && x <= r ? top : x >= l - 2 && x <= r + 2 ? (y < waist - 2 ? shade(top, 0.85) : SKIN) : null;
  return x < l || x > r ? null : y >= b.h - 2 ? INK : x === 7 || x === 8 ? shade(legs, 0.8) : legs;
};
// Walking to the right, seen from the side: `stride` texels between the feet (one leg
// forward, then the other) and the near arm swung the other way. Flipped to walk left.
const walking = (b: Build, hair: string, top: string, legs: string, stride: number): Paint => (x, y) => {
  const [l, r, waist] = [9 - b.half, 6 + b.half, b.head + b.body];
  if (y < b.head) return x < l || x > r ? null : y < 3 || (x < l + 2 && y < b.head - 2) ? hair : y === b.head >> 1 && x === r - 1 ? INK : SKIN;
  if (y < waist) {
    const arm = 7.5 - (stride * (y - b.head)) / (b.body * 2); // the arm swings against the near leg
    if (Math.abs(x - arm) < 1 && y > b.head) return y >= waist - 2 ? SKIN : shade(top, 0.8);
    return x >= l && x <= r ? top : null;
  }
  const k = (stride * (y - waist)) / (b.h - waist - 1);
  const [near, far] = [7.5 + k / 2, 7.5 - k / 2];
  const on = (c: number) => Math.abs(x - c) < 1.3;
  return on(near) ? (y >= b.h - 2 ? INK : legs) : on(far) ? (y >= b.h - 2 ? INK : shade(legs, 0.75)) : null;
};
// Climbing, seen from behind: one hand up and the other knee raised, then the other way.
const climbing = (b: Build, hair: string, top: string, legs: string, left: boolean): Paint => (x, y) => {
  const [l, r, waist] = [8 - b.half, 7 + b.half, b.head + b.body];
  if ((x >= l - 2 && x < l) || (x > r && x <= r + 2)) {
    const sleeve = shade(top, 0.85);
    // The raised arm reaches for the rung over the head; the other hangs.
    if (left === x < l) return y > 0 && y < Math.round(b.head + (b.body * 2) / 3) ? (y < 3 ? SKIN : sleeve) : null;
    return y > b.head && y < waist ? (y >= waist - 2 ? SKIN : sleeve) : null;
  }
  if (x < l || x > r) return null;
  if (y < b.head) return y < b.head - 2 ? hair : SKIN;
  if (y < waist) return top;
  const raised = left ? x > 7 : x < 8;
  return raised && y > b.h - 5 ? null : y > (raised ? b.h - 7 : b.h - 3) ? INK : legs;
};
// A baby, sitting facing us: a tuft of hair, its arms at its sides and its legs out in front.
const sitting = (hair: string, top: string, legs: string): Paint => (x, y) => {
  if (y < 6) return x < 5 || x > 10 ? null : y === 0 ? (x === 7 || x === 8 ? hair : null) : y === 1 ? hair : y === 3 && (x === 6 || x === 9) ? INK : SKIN;
  if (y < 10) return x >= 5 && x <= 10 ? top : (x === 4 || x === 11) && y > 6 ? SKIN : null;
  return x >= 3 && x <= 12 ? (x < 5 || x > 10 ? SKIN : legs) : null;
};
// A baby crawling to the right, seen from the side: its back level, its head up, and one
// hand and the other knee forward (`reach` 1), then back (-1). Flipped to crawl left.
const crawling = (hair: string, top: string, legs: string, reach: number): Paint => (x, y) => {
  if (y >= 2 && y <= 7 && x >= 10 && x <= 14) return y === 2 || (x <= 11 && y <= 4) ? hair : y === 4 && x === 13 ? INK : SKIN;
  if (y >= 5 && y <= 8 && x >= 3 && x <= 10) return top;
  if (y < 9) return null;
  // An arm from the shoulder and a thigh from the hip, each slanting down to the floor.
  const along = (from: number, to: number) => Math.abs(x - (from + ((to - from) * (y - 8)) / 3)) < 1;
  if (along(10.5, 11 + reach)) return y === 11 ? SKIN : shade(top, 0.85);
  if (along(4.5, 4 - reach)) return legs;
  return y === 11 && x < 4 - reach && x >= 1 - reach ? shade(legs, 0.8) : null;
};
// A paper party hat for a birthday, worn over the head: stripes, and a bobble on top.
const hat: Paint = (x, y) => {
  const mid = Math.abs(x - 7.5);
  if (y < 2) return mid < 1 ? "#fff" : null;
  return mid < (y - 1) * 0.55 + 0.5 ? ((x + y) % 4 < 2 ? "#e02c3c" : "#ffd83a") : null;
};
// A spotlight set in the ceiling: a ring with its lamp under it, and a faint beam when it is on.
const spot = (on: boolean): Paint => (x, y) => {
  const mid = Math.abs(x - 7.5);
  if (y < 2) return mid < 4 ? (y === 0 || mid > 3 ? "#7c7f86" : "#b9bcc4") : null;
  if (y === 2) return mid < 2.5 ? (on ? "#fff8d8" : "#5a5a5a") : null;
  return on && y < 9 && mid < 1.5 + (y - 3) * 0.6 ? "rgba(255,240,190,.22)" : null;
};
// A strip of light along the top of the wall, under the ceiling.
const strip = (on: boolean): Paint => (_x, y) => (y === 1 ? "#7c7f86" : y === 2 ? (on ? "#fff3c0" : "#6a6a66") : on && y === 3 ? "rgba(255,233,160,.45)" : null);
// A standing lamp, two blocks tall: a shade that widens to its rim, a pole and a foot.
const standing = (on: boolean): Paint => (x, y, r) => {
  const mid = Math.abs(x - 7.5);
  if (y > 1 && y < 11) return mid < 2.5 + (y - 2) * 0.5 ? (y === 10 ? (on ? "#d8a43a" : "#8a8478") : j(on ? "#ffe9a0" : "#c9c2b4", r, 0.05)) : null;
  if (y === 11) return mid < 2 ? (on ? "#fff8d8" : "#3a2a18") : null;
  if (y > 11 && y < 29) return mid < 1 ? "#3a2a18" : null;
  return y > 28 && y < 31 && mid < 4 ? "#3a2a18" : null;
};
const FRAMES = 7; // standing, four of walking, two of climbing: one strip, a block wide each
const person = (shape: Shape, hair: string, top: string, legs: string): Paint => {
  const b = BUILDS[shape];
  // A baby's strip has the same seven places: sitting, four of a crawl, and sitting
  // where the climb would be, as a baby takes no ladder.
  const frames =
    shape === "baby"
      ? [sitting(hair, top, legs), ...[1, 0, -1, 0].map((reach) => crawling(hair, top, legs, reach)), sitting(hair, top, legs), sitting(hair, top, legs)]
      : [facing(b, hair, top, legs), ...[b.stride, 0, -b.stride, 0].map((stride) => walking(b, hair, top, legs, stride)), climbing(b, hair, top, legs, true), climbing(b, hair, top, legs, false)];
  return (x, y, r) => frames[x >> 4](x & 15, y, r);
};
const bitmap = (rows: string[], colour: string): [number, number, Paint] => [rows[0].length, rows.length, (x, y) => (rows[y][x] === "#" ? colour : null)];
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."], BOLT = ["..##", ".##.", "####", ".##.", "##..", "#..."];
const cloud = (hex: string): Paint => (x, y) => (y > 4 && y < 10 && x > 1 && x < 14 && !(y === 5 && (x < 5 || x > 10)) ? hex : null);

// A crack that wanders down a block: a guarded block's after its first hit, and a block's that is not answering.
const crack = (() => {
  const r = rng(11), at = new Set<string>();
  let x = 8;
  for (let y = 0; y < 32; y++) {
    x += Math.floor(r() * 3) - 1;
    at.add(`${x},${y}`);
    if (y % 9 === 4) at.add(`${x + 1},${y}`).add(`${x + 2},${y - 1}`);
  }
  return (x: number, y: number) => at.has(`${x},${y}`);
})();

// Each texture: how many texels across and down, and what colour each is (null: nothing there).
const PAINTS: Record<string, [number, number, Paint]> = {
  dirt: [16, 16, (_x, _y, r) => j("#7a5536", r)],
  grass: [16, 16, (_x, y, r) => (y < 3 + ((r() * 3) | 0) ? j("#5aa13c", r) : j("#7a5536", r))],
  stone: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) * 5) % 8 === 0 ? shade(GREY, 0.72) : j(GREY, r, 0.07))],
  ore: [16, 16, (x, y, r) => (r() < 0.1 && !edge(x, y) ? "#e0913a" : j(GREY, r, 0.08))],
  plank: [16, 16, plank(WOOD)],
  beam: [16, 16, plank(DARK)],
  wall: [16, 16, (_x, _y, r) => j("#9c927c", r, 0.04)],
  roof: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 0 ? shade("#9a3b2e", 0.65) : j("#9a3b2e", r, 0.08))],
  brick: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 7 ? "#c9c2b4" : j("#a4553c", r, 0.08))],
  trunk: [16, 16, (x) => shade("#6b4a2b", 1 + (((x * 37) % 5) - 2) * 0.08)],
  leaves: [16, 16, (_x, _y, r) => (r() < 0.1 ? null : j("#3f7d2c", r, 0.16))],
  water: [16, 16, (_x, y, r) => (y % 5 === 1 && r() < 0.6 ? "#7fa8f0" : j("#3a6fd8", r, 0.05))],
  post: [16, 16, (x, _y, r) => (x > 5 && x < 10 ? j(DARK, r, 0.08) : null)],
  ladder: [16, 16, (x, y) => (x === 2 || x === 3 || x === 12 || x === 13 || (y % 4 === 1 && x > 1 && x < 14) ? "#8a6536" : null)],
  board: [16, 16, (x, y, r) => (edge(x, y) ? shade(WOOD, 0.55) : j(WOOD, r, 0.05))],
  glass: [16, 32, (x, y) => (edge(x, y, 16, 32) || y === 15 ? "#dff1ff" : (x + y) % 16 === 8 && x > 2 && x < 8 ? "rgba(255,255,255,.8)" : "rgba(170,215,255,.25)")],
  slat: [16, 16, (_x, y) => (y % 3 === 2 ? shade("#e8e0c8", 0.7) : "#e8e0c8")],
  lampOff: [16, 16, pendant(false)],
  lampOn: [16, 16, pendant(true)],
  spotOff: [16, 16, spot(false)],
  spotOn: [16, 16, spot(true)],
  stripOff: [16, 16, strip(false)],
  stripOn: [16, 16, strip(true)],
  standingOff: [16, 32, standing(false)],
  standingOn: [16, 32, standing(true)],
  lanternOff: [16, 16, lantern("#4a3016", "#4f3a1c", "#7a5a2a", 0.06)],
  lanternOn: [16, 16, lantern("#a8742a", "#e0a93a", "#ffe9a0", 0.05)],
  machOff: [16, 16, machine(false)],
  machOn: [16, 16, machine(true)],
  stoveOff: [16, 16, stove(false)],
  stoveOn: [16, 16, stove(true)],
  alarmOff: [16, 16, beacon(false)],
  alarmOn: [16, 16, beacon(true)],
  leverOff: [16, 16, lever(false)],
  leverOn: [16, 16, lever(true)],
  // A ring of lamps on a chain, for a room with too many lights for a lamp each; and a chest, which opens the room's list.
  chandelierOff: [16, 16, chandelier("#7a5a2a")],
  chandelierOn: [16, 16, chandelier("#ffe9a0")],
  chest: [16, 16, (x, y, r) => (y < 2 ? null : edge(x, y - 2, 16, 14) || y === 7 ? shade(DARK, 0.6) : x > 6 && x < 9 && y > 5 && y < 10 ? "#e6c65a" : j(WOOD, r, 0.07))],
  // A camera's picture frame, three blocks by two: the picture is drawn into the dark, over a plate for its name.
  frame: [48, 32, (x, y, r) => (x < 2 || x > 45 || y < 2 || y > 29 || y === 24 ? j(DARK, r, 0.1) : y > 24 ? "#3a2a18" : "#16161a")],
  camera: [16, 16, (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : Math.hypot(x - 7.5, y - 7.5) < 2 ? "#7fa8f0" : Math.hypot(x - 7.5, y - 7.5) < 5 ? "#16161a" : j("#b9bcc4", r, 0.05))],
  door: [16, 32, (x, y, r) => (x < 1 || x > 14 || y < 1 ? "#5e3d18" : ((x > 2 && x < 7) || (x > 8 && x < 13)) && y > 3 && y < 10 ? "rgba(190,225,255,.6)" : x > 10 && x < 13 && y > 16 && y < 19 ? "#e6c65a" : y === 14 || y === 30 ? "#5e3d18" : j("#9a6a34", r, 0.06))],
  doorOpen: [16, 32, (x, _y, r) => (x < 3 ? j("#9a6a34", r, 0.06) : null)],
  dead: [16, 16, (x, y, r) => (crack(x, y) || crack(15 - x, y + 16) ? "#1c1c1c" : edge(x, y) ? shade(GREY, 0.45) : j("#5a5a5a", r, 0.05))],
  crack: [16, 32, (x, y) => (crack(x, y) ? "rgba(20,10,0,.85)" : null)],
  ghost: [16, 16, (x, y) => (edge(x, y) && (x + y) % 2 ? "rgba(255,255,255,.45)" : null)],
  ember: [16, 16, (x, y, r) => (edge(x, y) ? "#8a2c14" : r() < 0.3 ? "#ffe45c" : j("#e8641e", r, 0.15))],
  rain: [16, 16, (_x, _y, r) => (r() < 0.04 ? "rgba(200,220,255,.85)" : null)],
  snow: [16, 16, (_x, _y, r) => (r() < 0.03 ? "#fff" : null)],
  heart: bitmap(HEART, "#e02c3c"),
  heart0: bitmap(HEART, "rgba(0,0,0,.5)"),
  bolt: bitmap(BOLT, "#ffd83a"),
  bolt0: bitmap(BOLT, "rgba(0,0,0,.5)"),
  // The prank (prank.ts): an imp with horns and a tail, the hole its crate leaves, and the bot that mends it.
  imp: [16, 16, (x, y) => ((y < 3 && (x === 4 || x === 11)) || (y === 1 && (x === 5 || x === 10)) ? "#5a1420" : y > 2 && y < 9 && x > 3 && x < 12 ? (y === 5 && (x === 6 || x === 9) ? "#ffe45c" : y === 7 && x > 5 && x < 10 ? "#2a0a10" : "#c8323c")
    : y > 8 && y < 14 && x > 4 && x < 11 ? "#a02630" : y > 13 && (x === 5 || x === 6 || x === 9 || x === 10) ? "#5a1420" : (y === 11 && x > 10 && x < 14) || (x === 13 && y > 8 && y < 11) || (y === 8 && x > 12) ? "#5a1420" : null)],
  // Our own crate: a bundle of red sticks tied with a paper band, with a fuse. Drawn here from nothing; no game's block.
  tnt: [16, 16, (x, y) => (y < 3 ? ((x === 8 && y > 0) || (x === 9 && y === 0) ? "#2a2018" : null)
    : y > 4 && y < 12 ? (y > 5 && y < 11 && x > 1 && x < 14 && (x - 2) % 4 < 3 && Number("72222 65555 72222".split(" ")[(x - 2) >> 2][y - 6]) & (4 >> ((x - 2) % 4)) ? "#2a2018" : "#f0e6c8")
    : x % 4 === 3 ? "#7a1418" : y === 3 || y === 15 ? "#a01c22" : x % 4 === 0 ? "#e85a50" : "#d0282e")],
  hat: [16, 8, hat],
  hole: [16, 16, (x, y, r) => (edge(x, y) && r() < 0.5 ? null : r() < 0.12 ? "#3a3632" : "#16141a")],
  bot: [16, 16, (x, y) => (y === 0 && x > 2 && x < 13 ? "#b9bcc4" : y < 3 && (x === 7 || x === 8) ? "#5a5d66" : y > 2 && y < 11 && x > 3 && x < 12 ? (y > 4 && y < 8 && x > 5 && x < 10 ? "#5ad8ff" : edge(x - 4, y - 3, 8, 8) ? "#5a5d66" : "#9a9da6")
    : y > 10 && y < 15 && (x === 5 || x === 10) ? "#5a5d66" : (y === 14 && x > 3 && x < 12) || (y > 11 && x > 11 && x < 15 && x - y === 0) ? "#ffd83a" : null)],
  // The sun and the moon, two blocks across: as round as texels let them be. The moon has its dark limb and three craters.
  sun: [32, 32, (x, y) => (round(x, y, 15.5, 15.5) > 15.6 ? null : round(x, y, 15.5, 15.5) > 12 ? "#ffd020" : "#ffe45c")],
  moon: [32, 32, (x, y) => (round(x, y, 15.5, 15.5) > 15.6 ? null : round(x, y, 11, 12) > 16 ? "#b9c3da" : [[10, 10, 3], [21, 17, 3.5], [13, 23, 2.2]].some(([cx, cy, r]) => round(x, y, cx, cy) < r) ? "#cbd3e6" : "#e3e9f6")],
  // The forecast's pictures, over each sign.
  skySun: [16, 16, (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 4.5 ? "#ffe45c" : (x === 7 || x === 8 || y === 7 || y === 8) && Math.hypot(x - 7.5, y - 7.5) > 6 ? "#ffd020" : null)],
  skyCloud: [16, 16, cloud("#f2f4f8")],
  skyRain: [16, 16, (x, y) => cloud("#aab4c4")(x, y, Math.random) ?? (y > 10 && y < 15 && (x + y) % 4 === 0 && x > 2 && x < 14 ? "#7fa8f0" : null)],
  skySnow: [16, 16, (x, y) => cloud("#d8dee8")(x, y, Math.random) ?? (y > 10 && y < 15 && y % 2 === 1 && (x + y) % 4 === 0 && x > 2 && x < 14 ? "#fff" : null)],
};
// The figures' clothes, by a person's name: hair, top and legs.
const HAIR = ["#5a2d1a", "#c9c2b4", "#2a2018", "#d8a43a", "#8a3a1c"], TOPS = ["#e0913a", "#7a4fa8", "#3a6fd8", "#b8323a", "#3f7d2c", "#2a9d8f"], LEGS = ["#3f6d4c", "#4a5a78", "#5a4632", "#33343c"];

const canvases = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();

function painted(name: string, w: number, h: number, paint: Paint) {
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = canvas.getContext("2d")!;
  const r = rng(hash(name));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const colour = paint(x, y, r);
      if (!colour) continue;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  canvases.set(name, canvas);
  return canvas;
}

/** A texture by its name, as a canvas to draw from. */
export const texture = (name: string) => canvases.get(name) ?? painted(name, ...PAINTS[name]);

const kept = (key: string, make: () => HTMLCanvasElement) => {
  let url = urls.get(key);
  if (!url) urls.set(key, (url = make().toDataURL()));
  return url;
};
/** A texture as a CSS background. */
export const bg = (name: string) => `url(${kept(name, () => texture(name))})`;
/** A person's clothes by their name: hair, top and legs. The shifts are unsigned: `>>`
 * made a name whose hash is 2³¹ or more pick from before the start of a list, and the
 * figure that then had no colour stopped Digs drawing at all (2026.11.11-b3, on a tablet). */
export function dress(name: string): [hair: string, top: string, legs: string] {
  const n = hash(name);
  return [HAIR[n % HAIR.length], TOPS[(n >>> 3) % TOPS.length], LEGS[(n >>> 6) % LEGS.length]];
}

/** A person's figure as a CSS background, dressed by their name and of the `shape` their
 * age gives them: a strip of FRAMES frames, each sixteen texels wide and as tall as the
 * build (styles.ts steps through them). */
export function figure(name: string, shape: Shape = "grown") {
  const key = `who:${shape}:${name}`;
  return `url(${kept(key, () => painted(key, 16 * FRAMES, BUILDS[shape].h, person(shape, ...dress(name))))})`;
}

// ---- Lettering: three texels by five, a row to an octal digit. ----

const FONT: Record<string, string> = {
  A: "25755", B: "65656", C: "34443", D: "65556", E: "74647", F: "74644", G: "34553", H: "55755", I: "72227", J: "11152", K: "55655", L: "44447",
  M: "57755", N: "65555", O: "25552", P: "65644", Q: "25573", R: "65655", S: "34216", T: "72222", U: "55557", V: "55552", W: "55775", X: "55255", Y: "55222", Z: "71247",
  0: "75557", 1: "26227", 2: "61247", 3: "61216", 4: "55711", 5: "74616", 6: "34757", 7: "71222", 8: "75757", 9: "75716",
  ".": "00002", ":": "02020", "%": "51245", "°": "25200", "-": "00700", ",": "00024", "'": "22000", "!": "22202", "?": "61202", "/": "11244", "+": "02720", "(": "12221", ")": "42224", "²": "61300",
};
const WORDS = 600; // how many pieces of lettering are kept: the clock alone makes a new one a minute

/** A piece of lettering as a picture's address and its size in texels, in capitals with a
 * shadow. A character the lettering has no shape for is a space (an accented letter is
 * its plain one). */
export function lettering(text: string): { src: string; w: number; h: number } {
  const s = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (urls.size > WORDS) for (const key of [...urls.keys()].filter((k) => k.startsWith("txt:"))) urls.delete(key);
  const src = kept(`txt:${s}`, () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: Math.max(1, s.length * 4), height: 6 });
    const g = canvas.getContext("2d")!;
    // Twice: a shadow one texel down and across, then the letters.
    for (const [o, colour] of [[1, "rgba(0,0,0,.7)"], [0, "#fff"]] as const) {
      g.fillStyle = colour;
      [...s].forEach((ch, i) => [...(FONT[ch] ?? "00000")].forEach((row, y) => {
        for (let b = 0; b < 3; b++) if (Number(row) & (4 >> b)) g.fillRect(i * 4 + b + o, y + o, 1, 1);
      }));
    }
    return canvas;
  });
  return { src, w: s.length * 4, h: 6 };
}

/** A piece of lettering on the page, `k` times its usual size. */
export const say = (text: string, k = 1) => html`<img src=${lettering(text).src} alt=${text} style="--k:${k}" />`;
