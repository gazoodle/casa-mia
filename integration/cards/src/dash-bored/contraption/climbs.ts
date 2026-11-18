// The carriers that take a duck up or down a row, so that a room is not a conveyor belt
// (owner, 2026-11-18). An escalator and a slide are each two tiles, one above the other,
// drawn to meet at the middle of the edge between them: the duck goes up or down the
// whole of it on a slant. The cutlery and the lift go straight down and up, for a climb
// or a drop of more than one row. All are drawn for a stream going left to right, and
// all keep the period's own time (`steady`), so that what moves in one half of an
// escalator is in step with the other.
import { move, show } from "./kit.ts";
import { between, track, type Tile } from "./tile.ts";

// ---- The escalator: in from the left at the bottom, out to the right at the top. Three
// treads go up each half, and the duck stands on one.
const TREADS = [0, 1, 2];
const tread = (k: number) => `<g data-p="tread${k}"><path class="wood" d="M-16,0 h32 v5 h-32 z"/></g>`;
const treads = (q: Parameters<NonNullable<Tile["pose"]>>[0], p: number, x: number, y: number) => {
  for (const k of TREADS) {
    const u = (p + k / TREADS.length) % 1;
    move(q(`tread${k}`), x + 130 * u, y - 130 * u);
  }
};
export const escalator: [low: Tile, high: Tile] = [
  {
    io: "LT", steady: true, faults: [{ kind: "oil", at: [22, 150] }],
    still: `<path class="wood" d="M0,132 h14 v6 h-14 z"/><path d="M4,152 L146,10 M-8,112 L104,0"/><path class="thin" d="M40,116 V200 M96,60 V200 M24,200 h90"/>
      <text class="small" x="150" y="150">UP</text>`,
    live: `${TREADS.map(tread).join("")}`,
    duck: ({ p }) => ({ x: 130 * p, y: 130 - 130 * p }),
    pose(q, { p }) {
      treads(q, p, 0, 132);
    },
  },
  {
    io: "BR", steady: true, faults: [{ kind: "bolt", at: [236, 150] }],
    still: `<path d="M134,282 L256,160 M122,242 L234,130"/><path class="thin" d="M170,246 V260 M226,190 V260"/><path class="wood" d="M246,132 h14 v6 h-14 z"/>
      <circle class="iron" cx="248" cy="158" r="9"/>`,
    live: `${TREADS.map(tread).join("")}`,
    duck: ({ p }) => ({ x: 130 + 130 * p, y: 260 - 130 * p }),
    pose(q, { p }) {
      treads(q, p, 130, 262);
    },
  },
];

// ---- The slide: in from the left at the top, out to the right at the bottom.
const slid = track([0, 0, 130], [0.25, 34, 130], [1, 130, 260]);
const landed = track([0, 130, 0], [0.65, 206, 122], [0.8, 226, 130, 10], [1, 260, 130]);
export const slide: [top: Tile, foot: Tile] = [
  {
    io: "LB", steady: true, faults: [{ kind: "bolt", at: [40, 200] }],
    still: `<path class="wood" d="M0,132 h36 v6 h-36 z"/><path d="M36,136 Q84,150 130,260 M36,116 Q96,124 150,260"/><path class="thin" d="M30,138 V236 M18,236 h24 M30,170 h-10 M30,200 h-10"/>`,
    live: `<text data-p="whee" class="small said" x="96" y="150">wheee</text>`,
    duck({ p }) {
      const at = slid(p);
      return { ...at, r: at.i === 1 ? 45 * Math.min(1, at.u * 4) : 0 };
    },
    pose(q, { p }) {
      show(q("whee"), between(p, 0.3, 1));
    },
  },
  {
    io: "TR", steady: true,
    still: `<path d="M130,0 Q160,108 206,128 H260 M150,0 Q176,92 214,110"/><path class="thin" d="M196,130 V200 M184,200 h24"/><ellipse class="cloth" cx="232" cy="134" rx="22" ry="6"/>`,
    live: `<text data-p="oof" class="small said" x="214" y="100">oof</text>`,
    duck({ p }) {
      const at = landed(p);
      return { ...at, r: at.i === 0 ? 45 * (1 - at.u ** 3) : 0 };
    },
    pose(q, { p }) {
      show(q("oof"), between(p, 0.65, 0.9));
    },
  },
];

// ---- The cutlery: in from above, out below, from spoon to spoon.
const tinkled = track([0, 130, 0], [0.2, 92, 62, 14], [0.4, 168, 112, 14], [0.6, 92, 164, 14], [0.8, 168, 214, 14], [1, 130, 260]);
const spoon = (x: number, y: number, left = false) => `<g transform="translate(${x},${y}) ${left ? "scale(-1,1)" : ""} rotate(-8)"><path d="M10,0 H62"/><ellipse class="iron" rx="15" ry="7"/></g>`;
export const pegs: Tile = {
  io: "TB", steady: true,
  still: `<path class="thin" d="M30,40 V200 M230,90 V245"/>${spoon(92, 69, true)}${spoon(168, 119)}${spoon(92, 171, true)}${spoon(168, 221)}`,
  live: `<text data-p="ting" class="small">ting!</text>`,
  duck({ p }) {
    const at = tinkled(p);
    return { ...at, r: (at.i % 2 ? 25 : -25) * Math.sin(Math.PI * at.u) };
  },
  pose(q, { p }) {
    const at = tinkled(p), struck = at.i > 0 && at.u < 0.35;
    show(q("ting"), struck ? 1 : 0);
    if (struck) move(q("ting"), at.x + (at.i % 2 ? -44 : 20), at.y - 22);
  },
};

// ---- The lift: in from below, out above, on a board that a rope hauls up. Another
// board comes in at the bottom as one goes out at the top.
export const lift: Tile = {
  io: "BT", steady: true, faults: [{ kind: "cord", loop: [[130, 260], [130, 0]], run: (t) => t * 100 }],
  still: `<path d="M92,0 V260 M168,0 V260"/><path class="thin" d="M92,52 h76 M92,104 h76 M92,156 h76 M92,208 h76"/><path class="rope" d="M130,0 V260"/>
    <text class="small" x="60" y="130" transform="rotate(-90 60 130)" text-anchor="middle">DUMB WAITER</text>`,
  live: `<g data-p="board"><path class="wood" d="M-34,0 h68 v6 h-68 z"/><path class="rope" d="M-30,0 L0,-36 L30,0"/></g>`,
  duck: ({ p }) => ({ x: 130, y: 260 - 260 * p }),
  pose(q, { p }) {
    move(q("board"), 130, 262 - 260 * p);
  },
};
