// Where the stream of ducks parts and comes together again, and the holes by which ducks
// go under the sheet and come back up (owner, 2026-11-18). A tile here has a hole (`pit`)
// where a tunnel ends (underground.ts). The ducks in it take turns (tile.ts `dealt`) and
// never meet: the owner found the first of these "always colliding at the entry and
// stuttering at the exits".
//   - A redirector sends each duck out by a different way. The one that arrives goes
//     first, and the spares come up its hole, walk up a ramp to the way in and follow it,
//     so that they pass the arrow one after another while it points each its way.
//   - A collector is a roundabout. Each duck steps on where it comes in. One steps off
//     at the way out, and the others ride on round to the hole and drop in.
//   - `sink` is where a stream ends and all its ducks go below, `foot` where the dumb
//     waiter starts and all its ducks come up, and `top` where it ends and they go below.
// All are drawn for a stream going left to right.
import { clamp, esc, move, show, turn } from "./kit.ts";
import { BOARD } from "./climbs.ts";
import { EDGE, between, dealt, track, type At, type Ctx, type Tile } from "./tile.ts";

type Point = [number, number];
/** A hole in the sheet, and under it what it is for. */
const hole = ([x, y]: Point, word: string) => `<ellipse class="solid" cx="${x}" cy="${y}" rx="28" ry="8"/><text class="small" x="${x}" y="${y + 20}" text-anchor="middle">${esc(word)}</text>`;
/** A duck coming up out of a hole as the period starts, or gone down one from `gone` on. */
const up = (at: At, p: number): At => ({ ...at, sy: clamp(p / 0.1, 0.05), o: p < 0.02 ? 0 : 1 });
const down = (at: At, p: number, gone: number): At => ({ ...at, sy: clamp((gone - p) / 0.06, 0.05), o: p >= gone ? 0 : 1 });

const HUB: Point = [130, 130];
const ANGLE: Record<string, number> = { R: 0, B: 90, L: 180, T: -90 };
const PLANK: Record<string, string> = { L: "M0,132 h84 v6 h-84 z", R: "M176,132 h84 v6 h-84 z", T: "M127,0 h6 v84 h-6 z", B: "M127,176 h6 v84 h-6 z" };
const smooth = (u: number) => u * u * (3 - 2 * u);

/** A redirector entered by `inn` (the left, or from below on the dumb waiter's shaft)
 * with the ways out `outs`. The ducks get to the arrow a little apart, so each goes at its
 * own pace, but none stops in another's way and all are out as the period ends.
 *
 * On the shaft a board goes up through it at the dumb waiter's pace, and a duck on a
 * board moves with it (owner, 2026-11-18: "the duck doesn't travel at the same speed as
 * the dumb waiter, either it must or the waiter goes"). The duck that rode in stays on to
 * go up, or hops off early to go sideways. A spare that is to go up is the last of the
 * spares to the arrow, and waits there for the board to come up under it. */
export function redirector(inn: "L" | "B", outs: string): Tile {
  const n = outs.length, shaft = inn === "B", pit: Point = shaft ? [50, 222] : [44, 216], join: Point = shaft ? [74, 130] : [36, 130];
  const goes = (slot: number, turns: number) => outs[dealt(slot, turns, n)];
  /** When the duck in each place of the queue gets to the arrow. */
  const passes = (slot: number, turns: number) => {
    if (!shaft) return 0.5 + (slot - (n - 1) / 2) * 0.12;
    if (!slot) return goes(0, turns) === "T" ? 0.5 : 0.4;
    if (n === 2) return 0.3;
    return goes(slot, turns) === "T" || (slot === 2 && goes(1, turns) !== "T") ? 0.36 : 0.2;
  };

  const made = new Map<string, (p: number) => At>();
  /** The way through for the duck in place `slot` that goes out by `side` and gets to the arrow at `t`. */
  const way = (slot: number, side: string, t: number) => {
    const key = `${slot}${side}${t}`, out = EDGE[side];
    if (!made.has(key)) {
      const spare = (...rest: Parameters<typeof track>) => track([0, pit[0], pit[1] - 2], [0.08, pit[0], pit[1] - 12], [t * 0.55, ...join], [t, ...HUB], ...rest);
      made.set(key, !shaft ? (slot ? spare([1, ...out]) : track([0, ...EDGE.L], [t, ...HUB], [1, ...out]))
        : side === "T" ? (slot ? spare([0.5, ...HUB], [1, ...out]) : track([0, ...EDGE.B], [1, ...out]))
        : slot ? spare([1, ...out]) : track([0, ...EDGE.B], [0.3, 130, 182, 22], [0.45, side === "R" ? 178 : 82, 130], [1, ...out]));
    }
    return made.get(key)!;
  };
  const slots = Array.from({ length: n }, (_, slot) => slot);

  return {
    io: `${inn}>${outs}`, steady: true, pit, faults: [{ kind: "oil", at: [130, 130] }],
    still: `${shaft ? `<path d="M92,180 V260 M168,180 V260 M92,0 V80 M168,0 V80"/><path class="wood" d="M56,132 h28 v6 h-28 z"/>` : ""}
      <path class="wood" d="${shaft ? "" : PLANK[inn]} ${[...outs].map((side) => (shaft && side === "T" ? "" : PLANK[side])).join(" ")}"/><path class="rope" d="M${pit[0]},${pit[1] - 8} L${join}"/>
      <circle class="paper" cx="130" cy="130" r="46"/><circle class="thin" cx="130" cy="130" r="38"/>${hole(pit, "SPARES")}`,
    live: `${shaft ? BOARD : ""}<g transform="translate(130,130)"><g data-p="arm" data-ring="72"><path class="brass" d="M-30,-6 h40 v-8 l22,14 l-22,14 v-8 h-40 z"/><circle class="solid" r="4"/></g></g>`,
    duck({ p, from, to, turn: turns }: Ctx) {
      const slot = Math.max(0, -from), at = way(slot, outs[Math.max(0, to)], passes(slot, turns))(p);
      return slot ? up(at, p) : at;
    },
    pose(q, { p, turn: turns }) {
      // The arrow starts where it sent the last duck of the period before, and swings to each duck's way just before that duck gets to it.
      const order = (t: number) => [...slots].sort((a, b) => passes(a, t) - passes(b, t)), before = turns + n - 1;
      let angle = ANGLE[goes(order(before).at(-1)!, before)];
      for (const slot of order(turns)) angle += (ANGLE[goes(slot, turns)] - angle) * smooth(clamp((p - passes(slot, turns) + 0.1) / 0.08));
      turn(q("arm"), angle);
      if (shaft) move(q("board"), 130, 262 - 260 * p);
    },
  };
}

const RIM = 40, ONTO = 0.3, ROUND = 560; // the roundabout: how far out the ducks ride, when they step on, and the degrees it turns in a period
const rim = (deg: number): Point => [HUB[0] + RIM * Math.cos((deg * Math.PI) / 180), HUB[1] + RIM * Math.sin((deg * Math.PI) / 180)];
const lerp = (a: Point, b: Point, u: number): At => ({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });

/** A collector with the ways in `ins` (two or three of L, T and B), and the way out on
 * the right. Every duck steps on at the same moment, each where it came in, so they ride
 * a quarter turn or more apart. */
export function collector(ins: string): Tile {
  const pit: Point = [204, 214], OFF = 45; // where the hole is, and how far round the ducks for it get off
  return {
    io: `${ins}>R`, steady: true, pit, faults: [{ kind: "oil", at: [130, 130] }],
    still: `<path class="wood" d="${PLANK.R} ${[...ins].map((side) => PLANK[side]).join(" ")}"/><circle class="thin" cx="130" cy="130" r="50"/>${hole(pit, "TOO MANY")}`,
    live: `<g transform="translate(130,130)"><g data-p="disc" data-ring="120:24"><circle class="paper" r="46"/><path d="M0,0 L46,0 M0,0 L-23,39.8 M0,0 L-23,-39.8"/><circle class="brass" r="7"/></g></g>`,
    duck({ p, from, to }: Ctx) {
      const side = ins[Math.max(0, from)], on = ANGLE[side] + 360, goes = to >= 0;
      // It rides round, the way the roundabout turns, to the way out or on to the hole.
      const ride = (((goes ? 720 : 720 + OFF) - on) % 360) || 360, off = ONTO + ride / ROUND;
      if (p < ONTO) return lerp(EDGE[side], rim(on), p / ONTO);
      if (p < off) return lerp(rim(on + ROUND * (p - ONTO)), HUB, 0);
      if (goes) return lerp(rim(0), EDGE.R, (p - off) / (1 - off));

      const drop = clamp((p - off) / 0.08), at = lerp(rim(OFF), pit, drop);
      return down({ ...at, y: at.y - 22 * Math.sin(Math.PI * drop) }, p, off + 0.12);
    },
    pose(q, { p }) {
      turn(q("disc"), ROUND * p);
    },
  };
}

// ---- Where a stream ends: every duck that gets here goes below.
const left = track([0, 0, 130], [0.5, 120, 130], [0.85, 186, 146, 40], [1, 186, 152]);
export const sink: Tile = {
  io: "L>", steady: true, pit: [186, 154],
  still: `<path class="wood" d="M0,132 h140 v6 h-140 z"/><path class="thin" d="M130,138 l10,30 V138"/>${hole([186, 154], "WAY BACK")}`,
  live: `<text data-p="bye" class="small said" x="150" y="200">plop</text>`,
  duck: ({ p }) => down(left(p), p, 0.98),
  pose(q, { p }) {
    show(q("bye"), between(p, 0.86, 1));
  },
};

// ---- The foot of the dumb waiter: a board comes up out of its hole with a duck on it,
// at the pace it keeps all the way up.
export const foot: Tile = {
  io: ">T", steady: true, pit: [130, 234],
  still: `<path d="M92,0 V226 M168,0 V226"/><path class="thin" d="M92,52 h76 M92,104 h76 M92,156 h76"/><path class="rope" d="M130,0 V226"/>${hole([130, 234], "ALL ABOARD")}`,
  live: BOARD,
  duck: ({ p }) => up({ x: 130, y: 260 - 260 * p }, p),
  pose(q, { p }) {
    move(q("board"), 130, 262 - 260 * p);
    show(q("board"), clamp(p / 0.1));
  },
};

// ---- The top of the dumb waiter: the board goes over the pulley, and its duck hops off
// into a hole. From there it goes the long way round, under the sheet, back to the foot.
const tipped = track([0, 130, 260], [0.5, 130, 130, 44], [0.72, 212, 144], [1, 212, 148]);
export const top: Tile = {
  io: "B>", steady: true, pit: [212, 150],
  still: `<path d="M92,56 V260 M168,56 V260 M92,56 h76"/><path class="thin" d="M92,156 h76 M92,208 h76"/><path class="rope" d="M130,72 V260"/><circle class="iron" cx="130" cy="56" r="16"/>
    ${hole([212, 150], "ROUND AGAIN")}`,
  live: `${BOARD}<text data-p="bye" class="small said" x="196" y="96">hup</text>`,
  duck: ({ p }) => down(tipped(p), p, 0.76),
  pose(q, { p }) {
    move(q("board"), 130, 262 - 260 * Math.min(p, 0.56));
    show(q("board"), 1 - clamp((p - 0.5) / 0.06));
    show(q("bye"), between(p, 0.5, 0.72));
  },
};
