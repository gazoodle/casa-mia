// Where the stream of ducks starts, ends, parts and comes together again (owner,
// 2026-11-18). Ducks join the game by a hole and leave it by a hole, so no duck is ever
// slowed, hurried or made to wait for another:
//   - A room's stream starts at `source` and ends at `sink`.
//   - A redirector sends the duck that arrives out by each of its ways in turn, and a
//     spare duck climbs out of its hole for each of the others. So every way out has a
//     duck every period, and a device on any of them has its engine.
//   - A collector lets one of the ducks that arrive go on, each way in having its turn,
//     and the rest go down its hole.
// All are drawn for a stream going left to right.
import { clamp, esc, show, turn } from "./kit.ts";
import { EDGE, between, track, type At, type Ctx, type Tile } from "./tile.ts";

/** A hole in the sheet, with a sign beside it: to its right, or its left where the tile's edge is too near. */
const hole = (x: number, y: number, word: string, side = 1) => `<ellipse class="solid" cx="${x}" cy="${y}" rx="30" ry="8"/><path class="thin" d="M${x + side * 34},${y} v-44"/>
  <rect class="label" x="${x + side * 44 - 30}" y="${y - 62}" width="60" height="18"/><text class="small" x="${x + side * 44}" y="${y - 50}" text-anchor="middle">${esc(word)}</text>`;
/** A duck coming up out of a hole as the period starts, or going down one as it ends. */
const up = (at: At, p: number): At => ({ ...at, sy: clamp(p / 0.15, 0.05), o: p < 0.02 ? 0 : 1 });
const down = (at: At, p: number): At => ({ ...at, sy: clamp((1 - p) / 0.12, 0.05), o: p > 0.98 ? 0 : 1 });

// ---- Where ducks join the game.
const joined = track([0, 70, 152], [0.2, 70, 144], [0.5, 128, 130, 44], [1, 260, 130]);
export const source: Tile = {
  io: ">R", steady: true,
  still: `<path class="wood" d="M112,132 h148 v6 h-148 z"/><path class="thin" d="M122,138 l-10,30 V138"/>${hole(70, 154, "DUCKS IN")}`,
  live: `<text data-p="hello" class="small said" x="40" y="118">quack?</text>`,
  duck: ({ p }) => up(joined(p), p),
  pose(q, { p }) {
    show(q("hello"), between(p, 0.05, 0.3));
  },
};

// ---- Where they leave it.
const left = track([0, 0, 130], [0.5, 120, 130], [0.85, 186, 146, 40], [1, 186, 152]);
export const sink: Tile = {
  io: "L>", steady: true,
  still: `<path class="wood" d="M0,132 h140 v6 h-140 z"/><path class="thin" d="M130,138 l10,30 V138"/>${hole(186, 154, "DUCKS OUT")}`,
  live: `<text data-p="bye" class="small said" x="150" y="186">plop</text>`,
  duck: ({ p }) => down(left(p), p),
  pose(q, { p }) {
    show(q("bye"), between(p, 0.86, 1));
  },
};

const HUB = [130, 130];
const ANGLE: Record<string, number> = { R: 0, B: 90, L: 180, T: -90 };
const PLANK: Record<string, string> = { L: "M0,132 h84 v6 h-84 z", R: "M176,132 h84 v6 h-84 z", T: "M127,0 h6 v84 h-6 z", B: "M127,176 h6 v84 h-6 z" };

/** A redirector with the ways out `outs` (two or three of R, T and B). Its arm points
 * the way this period's duck is sent. The spares go from the hole straight to their own
 * ways out, clear of the turntable. */
export function redirector(outs: string): Tile {
  const pit = [58, 214];
  const ways = [...outs].map((side) => ({
    sent: track([0, 0, 130], [0.42, HUB[0], HUB[1]], [0.55, HUB[0], HUB[1]], [1, ...EDGE[side]]),
    spare: track([0, pit[0], pit[1] - 4], [0.2, pit[0], pit[1] - 12], [0.6, (pit[0] + EDGE[side][0]) / 2 + 30, (pit[1] + EDGE[side][1]) / 2, 50], [1, ...EDGE[side]]),
  }));
  const pointing = (turns: number) => ANGLE[outs[((turns % outs.length) + outs.length) % outs.length]];

  return {
    io: `L>${outs}`, steady: true, faults: [{ kind: "oil", at: [130, 130] }],
    still: `<path class="wood" d="${PLANK.L} ${[...outs].map((side) => PLANK[side]).join(" ")}"/><circle class="paper" cx="130" cy="130" r="46"/><circle class="thin" cx="130" cy="130" r="38"/>${hole(pit[0], pit[1], "SPARES")}`,
    live: `<g transform="translate(130,130)"><g data-p="arm" data-ring="72"><path class="brass" d="M-30,-6 h40 v-8 l22,14 l-22,14 v-8 h-40 z"/><circle class="solid" r="4"/></g></g>`,
    duck({ p, from, to }: Ctx) {
      const way = ways[Math.max(0, to)];
      return from < 0 ? up(way.spare(p), p) : way.sent(p);
    },
    pose(q, { p, turn: turns }) {
      // It swings round to the new way while the duck is still walking up to it.
      const was = pointing(turns - 1), now = pointing(turns), swing = clamp(p / 0.3);
      turn(q("arm"), was + (now - was) * swing * swing * (3 - 2 * swing));
    },
  };
}

/** A collector with the ways in `ins` (two or three of L, T and B). Each duck comes to
 * its own place on the platform. The one whose turn it is goes on, and the rest step off
 * into the hole. */
export function collector(ins: string): Tile {
  const pit = [196, 214], WAIT: Record<string, [number, number]> = { L: [96, 130], T: [130, 100], B: [140, 164] };
  const ways = [...ins].map((side) => ({
    on: track([0, ...EDGE[side]], [0.45, ...WAIT[side]], [0.6, ...WAIT[side]], [1, 260, 130]),
    off: track([0, ...EDGE[side]], [0.45, ...WAIT[side]], [0.6, ...WAIT[side]], [0.9, pit[0], pit[1] - 8, 36], [1, pit[0], pit[1] - 2]),
  }));

  return {
    io: `${ins}>R`, steady: true, faults: [{ kind: "bolt", at: [100, 176] }],
    still: `<path class="wood" d="${PLANK.R} ${[...ins].map((side) => PLANK[side]).join(" ")}"/><path class="paper" d="M84,96 h92 v80 h-92 z"/><path class="thin" d="M84,176 l-8,26 M176,176 l8,26"/>${hole(pit[0], pit[1], "TOO MANY", -1)}`,
    live: `<text data-p="next" class="small said" x="150" y="86">next!</text>`,
    duck({ p, from, to }: Ctx) {
      const way = ways[Math.max(0, from)];
      return to < 0 ? down(way.off(p), p) : way.on(p);
    },
    pose(q, { p }) {
      show(q("next"), between(p, 0.45, 0.62));
    },
  };
}
