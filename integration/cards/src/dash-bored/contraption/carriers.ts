// The tiles that show no device: they only get a duck from one edge to another, each in
// its own way. Drawn for a kitchen, so they are kitchen things. These are the six the
// layout rule places (layout.ts). The mock-up has two more, the cutlery and the dumb
// waiter, which go straight up or down: no rule places those yet, so they are not here.
import { clamp, cog, draw, move, show, turn } from "./kit.ts";
import { between, track, type Tile } from "./tile.ts";

// ---- The toaster: in from below, out to the right. The duck is toasted and popped. It
// comes out sweating, and a bucket by the way out tips over it to cool it down. The water
// falls straight down, and the duck walks through it (owner, 2026-11-18: "it can be a
// tipping bucket if that's more humorous, ala Mouse Trap").
const toasted = track([0, 130, 260], [0.35, 130, 150, 95], [0.75, 218, 130], [1, 260, 130]);
const PIVOT = [232, 62], SWEAT = [-1, 0, 1], WATER = [0, 1, 2, 3];
const drop = (name: string, r: number) => `<g data-p="${name}"><circle class="drop" r="${r}"/></g>`;
const toaster: Tile = {
  io: "BR", faults: [{ kind: "bolt", at: [96, 240] }],
  still: `<path class="thin" d="M118,236 V260 M142,236 V260"/>
    <rect class="iron" x="82" y="150" width="96" height="86" rx="12"/><path d="M98,150 h64 M96,236 v8 M164,236 v8"/>
    <text x="130" y="200" text-anchor="middle">TOAST</text>
    <path class="wood" d="M196,132 h64 v7 h-64 z"/><path class="thin" d="M202,139 l-12,38 V139"/>
    <path d="M254,132 V44 h-22 V${PIVOT[1]}"/><path class="thin" d="M254,60 l-14,-16"/>`,
  live: `<path class="flame bare" data-p="toast-glow" d="M100,145 h60 v5 h-60 z"/>
    <g data-p="toast-lever"><path d="M178,0 h8"/><rect class="brass" x="186" y="-5" width="12" height="10" rx="2"/></g>
    <text data-p="toast-pop" x="152" y="104">pop!</text>${SWEAT.map((k) => drop(`sweat${k}`, 2.2)).join("")}${WATER.map((k) => drop(`water${k}`, 3.4)).join("")}
    <g data-p="bucket" data-ring="0..110:23"><path class="iron" d="M-13,0 h26 l-4,24 h-18 z"/><circle class="solid" r="2.5"/></g>
    <text data-p="splosh" class="small said" x="176" y="100">splosh</text>`,
  duck({ p }) {
    const at = toasted(p);
    return { ...at, o: p < 0.35 ? 0 : 1, r: at.i === 1 ? at.u * 360 : 0 };
  },
  pose(q, { p }) {
    move(q("toast-lever"), 0, p < 0.3 ? 168 + 146 * p : p < 0.35 ? 212 : 168);
    show(q("toast-glow"), between(p, 0, 0.35) * clamp(p / 0.3));
    show(q("toast-pop"), between(p, 0.35, 0.55));

    // Sweat flies off it while it is in the air.
    const at = toasted(p), flying = between(p, 0.38, 0.75);
    for (const k of SWEAT) {
      const u = ((p - 0.38) * 5 + (k + 1) / 3) % 1;
      show(q(`sweat${k}`), flying * (1 - u));
      move(q(`sweat${k}`), at.x + k * 18 * u + 4, at.y - 20 - 26 * u + 40 * u * u);
    }

    // The bucket tips as the duck lands, empties straight down, and rights itself.
    const tip = clamp((p - 0.7) / 0.07) - clamp((p - 0.92) / 0.08), wet = between(p, 0.76, 0.93);
    move(q("bucket"), PIVOT[0], PIVOT[1]);
    turn(q("bucket"), 110 * tip);
    for (const k of WATER) {
      const u = ((p - 0.76) * 9 + k / WATER.length) % 1;
      show(q(`water${k}`), wet);
      move(q(`water${k}`), PIVOT[0] - 6, PIVOT[1] + 14 + 56 * u * u);
    }
    show(q("splosh"), wet);
  },
};

// ---- The mangle: in from the left, out to the right, flat, and springing back.
const mangle: Tile = {
  io: "LR", faults: [{ kind: "oil", at: [130, 129] }, { kind: "bolt", at: [90, 215] }],
  still: `<path class="wood" d="M84,40 h12 v170 h-12 z M164,40 h12 v170 h-12 z M70,210 h120 v10 h-120 z"/>
    <path class="wood" d="M0,132 h84 v6 h-84 z M176,132 h84 v6 h-84 z"/>`,
  // Big and slow, so they are made at 72 angles: at the 24 a small cog has, they were seen to go round in jerks.
  live: `${cog(130, 98, 28, 10, "mangle-a", "72")}${cog(130, 160, 28, 10, "mangle-b", "72")}`,
  duck({ p }) {
    const back = clamp((p - 0.62) / 0.25);
    const sy = p < 0.62 ? 1 - 0.75 * clamp((p - 0.38) / 0.12) : 1 - 0.75 * (1 - back) * Math.cos(back * 10);
    return { x: 260 * p, y: 130, sy, sx: 1 + (1 - sy) * 0.8 };
  },
  pose(q, { p }) {
    // They draw the duck through: the top one's underside and the bottom one's top both go the duck's way.
    turn(q("mangle-a"), -p * 360);
    turn(q("mangle-b"), p * 360);
  },
};

// ---- The bottle: in from the right, out through the ceiling on the cork.
const corked = track([0, 260, 130], [0.3, 150, 130, 10], [0.38, 130, 120], [0.6, 130, 120], [1, 130, 0]);
const cork: Tile = {
  io: "RT",
  still: `<path class="wood" d="M150,132 h110 v7 h-110 z M86,250 h88 v7 h-88 z"/><path class="thin" d="M158,139 l-10,30 V139"/>`,
  live: `<g data-p="cork-bottle"><path class="glass" d="M112,250 V172 q0,-14 10,-22 V132 h16 v18 q10,8 10,22 V250 z"/>
      <rect class="paper" x="114" y="190" width="32" height="30"/><text class="small" x="130" y="208" text-anchor="middle">FIZZ</text></g>
    <g data-p="cork-cork"><rect class="brass" x="-7" y="-10" width="14" height="12" rx="2"/></g>
    <text data-p="cork-pop" x="150" y="96">POP</text>`,
  duck({ p, now }) {
    const at = corked(p);
    return { ...at, x: at.x + (at.i === 2 ? Math.sin(now * 40) * 1.5 : 0) };
  },
  pose(q, { p, now }) {
    // The cork goes up under the duck, runs out of puff and falls back in.
    const y = p < 0.6 ? 132 : p < 0.8 ? 132 - (p - 0.6) * 450 : 42 + (p - 0.8) * 450;
    move(q("cork-cork"), 130, y);
    // The bottle shakes from side to side as it builds up: it was a turn of a degree and
    // a half in the mock-up, which is too little to be worth a ring of bitmaps.
    move(q("cork-bottle"), between(p, 0.38, 0.6) * Math.sin(now * 40) * 1.5, 0);
    show(q("cork-pop"), between(p, 0.6, 0.8));
  },
};

// ---- The plughole: in from the right, out below, round and round on the way.
const drained = track([0, 260, 130], [0.2, 212, 130]);
const plug: Tile = {
  io: "RB",
  still: `<path class="wood" d="M222,132 h38 v6 h-38 z"/>
    <path class="glass" d="M40,136 H220 L138,214 V260 H122 V214 z"/>
    <ellipse class="thin" cx="130" cy="152" rx="66" ry="6"/><ellipse class="thin" cx="130" cy="176" rx="40" ry="4"/><ellipse class="thin" cx="130" cy="198" rx="17" ry="3"/>
    <path d="M130,0 V22 M112,22 h36"/><path class="brass" d="M120,22 h20 v20 h-20 z"/>`,
  live: `<g data-p="plug-drip"><circle class="drop" r="3"/></g><text data-p="plug-glug" x="150" y="240">glug</text>`,
  duck({ p }) {
    if (p < 0.2) return drained(p);
    if (p >= 0.85) return { x: 130, y: 212 + ((p - 0.85) / 0.15) * 48, r: p * 2000 };
    const u = (p - 0.2) / 0.65, round = 82 * (1 - u) ** 0.8;
    return { x: 130 + round * Math.cos(u * 5 * Math.PI), y: 138 + 74 * u };
  },
  pose(q, { p }) {
    move(q("plug-drip"), 130, 46 + ((p * 3) % 1) * 88);
    show(q("plug-glug"), between(p, 0.85, 1));
  },
};

// ---- The trampoline: in from above, out to the left, by way of the ceiling.
const bounced = track([0, 130, 0], [0.28, 136, 168, 92], [0.72, 30, 130], [1, 0, 130]);
const trampoline: Tile = {
  io: "TL", faults: [{ kind: "bolt", at: [96, 214] }],
  still: `<path d="M96,170 V214 M176,170 V214 M84,214 h24 M164,214 h24"/><path class="thin" d="M96,196 H176"/>
    <path class="wood" d="M0,132 h52 v6 h-52 z"/><path class="thin" d="M44,138 l-10,30 V138"/>`,
  live: `<path class="rope" data-p="mat"/><text data-p="boing" class="small" x="150" y="150">boing</text>`,
  duck({ p }) {
    const at = bounced(p);
    return { ...at, r: at.i === 1 ? -at.u * 360 : 0 };
  },
  pose(q, { p }) {
    const since = p - 0.28, dip = since < 0 ? 0 : 16 * Math.exp(-since * 9) * Math.cos(since * 42);
    draw(q("mat"), `M96,170 Q136,${(170 + dip * 2).toFixed(1)} 176,170`);
    show(q("boing"), between(p, 0.28, 0.5));
  },
};

// ---- The ladle: in from the left, out to the right, flung from one to the other.
const flung = track([0, 0, 130], [0.3, 62, 130], [0.45, 62, 130, 86], [0.8, 204, 130], [1, 260, 130]);
const ladle: Tile = {
  io: "LR", faults: [{ kind: "oil", at: [112, 150] }],
  still: `<path class="wood" d="M0,132 h40 v6 h-40 z M176,138 h84 v6 h-84 z"/><path class="iron" d="M112,150 l-12,30 h24 z"/><path d="M84,180 h56"/>
    <ellipse class="cloth" cx="204" cy="134" rx="26" ry="8"/>`,
  live: `<g data-p="ladle" data-ring="-10..55:27"><path d="M-44,0 H40"/><path class="iron" d="M-64,-4 h22 q0,14 -11,14 q-11,0 -11,-14 z"/><circle class="solid" cx="40" r="4"/></g>
    <text data-p="hup" class="small" x="120" y="60">hup!</text>`,
  duck({ p }) {
    const at = flung(p);
    return { ...at, r: at.i === 2 ? at.u * 360 : 0 };
  },
  pose(q, { p }) {
    // It is pulled back as the duck steps on, lets go, and settles.
    const swing = p < 0.3 ? 0 : p < 0.45 ? -8 * ((p - 0.3) / 0.15) : p < 0.52 ? -8 + 60 * ((p - 0.45) / 0.07) : 52 * (1 - clamp((p - 0.52) / 0.3));
    move(q("ladle"), 112, 148);
    turn(q("ladle"), swing);
    show(q("hup"), between(p, 0.45, 0.65));
  },
};

export const CARRIERS = { toaster, mangle, cork, plug, trampoline, ladle };
