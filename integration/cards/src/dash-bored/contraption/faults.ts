// A machine like this is bound to work loose. Every so often something small goes wrong
// in a tile: a bearing squeaks for oil, a bolt rattles, a cord frays. None of it stops a
// duck (a device that has really failed gets the dust sheet, tile.ts). The unicycle bot
// (bot.ts) is asked to see to each one. A frayed cord is mended with a knot, and the knot
// goes round with the cord from then on. Things go wrong only where they can be seen:
// the joke needs someone to see it.
import type { Job } from "./bot.ts";
import { hash, move, show, turn, type Part } from "./kit.ts";
import { S, type Fault } from "./tile.ts";

/** What this needs to know of a tile on the sheet. */
type Cell = { x: number; y: number; flip: boolean; away: string; seen: boolean; tile: { faults?: Fault[] } };
type Spot = Fault & { cell: Cell; x: number; y: number; way?: [number, number][]; floor: number; state: "sound" | "wrong" | "mending" | "knotted" };
const MOST = 3; // how many things may be wrong at once

// What is drawn while a thing is wrong. The origin is the place itself.
const ART = {
  oil: (i: number) => `<text class="small" x="18" y="-24">eek eek</text><g data-p="jit${i}"><path class="thin" d="M8,-8 q6,-4 4,-12 M14,-4 q10,-6 8,-18"/></g>
    <g data-p="drip${i}"><circle class="drop" r="2.5"/></g>`,
  // A hexagon with a slot looks the same every half turn.
  bolt: (i: number) => `<text class="small" x="10" y="-10">rattle</text><g data-p="bolt${i}" data-ring="180:12"><path class="brass" d="M-6,0 l3,-5.2 h6 l3,5.2 l-3,5.2 h-6 z"/><path d="M-3,0 H3"/></g>`,
  cord: (i: number) => `<text class="small" x="8" y="-22">twang</text><g data-p="jit${i}"><path class="thin" d="M0,0 q6,-10 2,-18 M0,0 q-8,-6 -12,-16"/></g>`,
};
const KNOT = (i: number) => `<g data-p="knot${i}"><circle class="solid" r="3.5"/><path class="thin" d="M0,0 l5,-6 M0,0 l-6,-4"/></g>`;

/** Where a point `far` px round a loop is. */
export function round(loop: [number, number][], far: number): [number, number] {
  const legs = loop.map((a, i) => {
    const b = loop[(i + 1) % loop.length];
    return { a, b, long: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const all = legs.reduce((sum, l) => sum + l.long, 0);
  far = ((far % all) + all) % all;
  for (const { a, b, long } of legs) {
    if (far <= long) return [a[0] + ((b[0] - a[0]) * far) / long, a[1] + ((b[1] - a[1]) * far) / long];
    far -= long;
  }
  return loop[0];
}

/** Every place in `cells` that can go wrong, in the sheet's own space (a mirrored tile's
 * places are mirrored with it). `art` is the drawing of them all; `start` is given how to
 * find a part of it and how to ask the bot, and answers with one frame's work. */
export function faults(cells: Cell[]) {
  const spots: Spot[] = [];
  for (const cell of cells)
    for (const f of cell.tile.faults ?? []) {
      const on = ([x, y]: [number, number]): [number, number] => [cell.x + (cell.flip ? S - x : x), cell.y + y];
      const way = f.kind === "cord" ? f.loop.map(on) : undefined, [x, y] = way ? way[0] : on((f as { at: [number, number] }).at);
      spots.push({ ...f, cell, x, y, way, floor: cell.y + S - 4, state: "sound" });
    }
  const art = spots.map((s, i) => `<g data-p="fault${i}">${ART[s.kind](i)}</g>${s.way ? KNOT(i) : ""}`).join("");

  function start(q: (name: string) => Part, ask: (job: Job) => void) {
    let wait = 4, wrong = 0, t = 0;
    // What is not wrong is not drawn at all.
    spots.forEach((s, i) => {
      move(q(`fault${i}`), s.x, s.y);
      show(q(`fault${i}`), 0);
      if (s.kind === "oil") show(q(`drip${i}`), 0);
      if (s.way) show(q(`knot${i}`), 0);
    });

    // Something goes wrong at `s`, and the bot is asked to come. It reaches up from the
    // row's floor on its tongs, so its arm is 40 above its wheel before it rises.
    function fail(s: Spot) {
      const i = spots.indexOf(s);
      s.state = "wrong";
      wrong++;
      show(q(`fault${i}`), 1);

      ask({
        x: s.x - 18, face: 1, floor: s.floor, rise: Math.max(0, s.floor - 40 - s.y),
        start: () => void (s.state = "mending"),
        work(p) {
          if (s.kind === "bolt") turn(q(`bolt${i}`), p * 1080);
          if (s.kind === "oil") {
            show(q(`drip${i}`), 1);
            move(q(`drip${i}`), 0, -26 + ((p * 5) % 1) * 26);
          }
        },
        done() {
          show(q(`fault${i}`), 0);
          wrong--;
          // Oil and bolts can go again. A cord keeps its knot, and is not mended twice.
          s.state = s.way ? "knotted" : "sound";
          if (s.way) show(q(`knot${i}`), 1);
        },
      });
    }

    return (dt: number, now: number) => {
      t += dt;
      if ((wait -= dt) < 0) {
        const sound = spots.filter((s) => s.state === "sound" && !s.cell.away && s.cell.seen);
        wait = 5 + (hash(`wait${now | 0}`) % 8);
        if (sound.length && wrong < MOST) fail(sound[hash(`fault${now | 0}`) % sound.length]);
      }

      spots.forEach((s, i) => {
        if (s.state === "wrong" || s.state === "mending") {
          // What has worked loose shakes until the bot has seen to it.
          if (s.kind !== "bolt") move(q(`jit${i}`), Math.sin(now * 52) * 1.5, Math.cos(now * 52) * 0.5);
          else if (s.state === "wrong") turn(q(`bolt${i}`), Math.sin(now * 30) * 25);
        }
        if (s.state === "knotted" && s.kind === "cord") move(q(`knot${i}`), ...round(s.way!, s.run(t)));
      });
    };
  }

  return { art, start, spots };
}
