// Two things that happen now and then for no reason but to be watched (owner, 2026-11-18).
// Neither touches the flow (flow.ts): every duck is where the network says, on the beat.
//
//   - A duck leaves a poop on the boards. The ducks behind hop over it. The bot comes with
//     a shovel and a peg on its nose, and takes it to the compost bin at the foot of its
//     pole, where a flower comes up for each load, up to five. Every third time it chucks
//     it down a hole instead ("but would then have to collect it at the other end"): the
//     poop goes along the tunnel, and the bot fetches it from the far hole and bins it.
//   - Lazy tongs on a gantry along the top pluck a duck out of a hole it has just gone
//     down, and set it down at the hole its tunnel comes up at, on the beat it would have
//     come up on. The duck is in the tunnel all the while as far as the network goes: it
//     is only drawn somewhere else.
//
// Both happen only where they can be seen.
import type { Job } from "./bot.ts";
import { clamp, draw, hash, move, scissor, show, type Part } from "./kit.ts";
import { S } from "./tile.ts";
import { within, type Point, type Way } from "./underground.ts";

/** What this needs to know of a tile, a tunnel and a duck on the sheet. */
type Cell = { x: number; y: number; flip: boolean; seen: boolean; away: string; p: number; tile: { io: string } };
type Burrow = { from: number; to: number; ways: Way[] };
type Duck = { at: { tunnel: number; age: number } };
type Env = { cells: Cell[]; burrows: Burrow[]; ducks: Duck[]; ask(job: Job): void; period: number; wide: number; high: number; pole: number; left: number };

const FLIES = [0, 1], FLOWERS = [0, 1, 2, 3, 4];
const RAIL = 6, HANG = 64; // where the gantry's rail is, and how far below it a duck is carried
const smooth = (u: number) => u * u * (3 - 2 * u);

export const SHOWS = `<g data-p="poop"><path class="copper" d="M-9,0 q-4,-6 2,-7 q-2,-6 4,-6 q0,-5 4,-6 q1,5 3,6 q6,1 3,6 q7,2 2,7 z"/></g>
  ${FLIES.map((k) => `<g data-p="fly${k}"><circle class="solid" r="1.6"/></g>`).join("")}<text data-p="pong" class="small said" x="10" y="-22">pooh!</text>
  <g data-p="bin"><path class="wood" d="M-24,0 v-26 h48 v26 z"/><path class="thin" d="M-24,-18 h48 M-24,-4 h48"/><text class="small" y="-8" text-anchor="middle">COMPOST</text></g>
  ${FLOWERS.map((k) => `<g data-p="flower${k}"><path class="thin" d="M0,0 v-12 M0,-5 l4,-3"/><circle class="spark" cy="-15" r="3.5"/><circle class="solid" cy="-15" r="1.2"/></g>`).join("")}
  <path data-p="rail"/><g data-p="tongs"><g transform="rotate(90)"><path class="thin" data-p="tongs_sc"/></g><rect class="iron" x="-14" y="-6" width="28" height="10" rx="2"/>
    <circle class="paper" cx="-9" cy="-6" r="3"/><circle class="paper" cx="9" cy="-6" r="3"/></g>
  <g data-p="claw"><path d="M-9,-6 q-3,10 5,14 M9,-6 q3,10 -5,14"/></g>`;

/** The shows on a sheet. `q` finds their parts and `bot` the bot's. `tick` is one frame;
 * `hop` is how high a duck at `x` in a tile jumps; `carried` is where the tongs have a duck. */
export function shows(q: (name: string) => Part, bot: (name: string) => Part, env: Env) {
  const { cells, burrows, high, pole } = env, pick = (what: string, n: number) => hash(what) % n;
  /** A tunnel with one way whose two ends can both be seen: the first of all is the dumb waiter's long way round, and is left alone. */
  const tunnel = (what: string) => {
    const seen = burrows.map((_, n) => n).filter((n) => n && burrows[n].ways.length === 1 && cells[burrows[n].from].seen && cells[burrows[n].to].seen);
    return seen.length ? seen[pick(what, seen.length)] : -1;
  };
  const floor = (cell: Cell) => cell.y + S - 4;
  /** A job for the bot at a place on the sheet, reaching up to it from the floor of its row. */
  const reach = (cell: Cell, [x, y]: Point, work: () => void, done: () => void): Job => ({ x: x - 30, face: 1, floor: floor(cell), rise: Math.max(0, floor(cell) - 40 - y), start() {}, work: (p) => void (p > 0.5 && work()), done });

  // ---- The poop. `state`: none, due (a tile is chosen and its next duck leaves it), down, scooped (on the shovel), tube, out (at the far hole).
  let state = "none", wait = 22, laid = 0, flowers = 0, at: Point = [0, 0], home = cells[0], said = 0, shake = 0, tube = -1, age = 0;
  const binned = () => env.ask({ x: pole, face: -1, floor: high - 4, rise: 0, start() {}, work: (p) => void (p > 0.5 && state === "scooped" && ((state = "tipped"), (shake = 0.5))),
    done() {
      flowers = Math.min(FLOWERS.length, flowers + 1);
      [state, wait] = ["none", 40 + pick(`poop${laid}`, 30)];
    } });
  const scooped = () => void (state = "scooped");
  function next() {
    tube = laid % 3 === 0 ? tunnel(`chuck${laid}`) : -1;
    if (tube < 0) return binned();
    // Down the hole with it, and round to the far hole to fetch it out again.
    const way = burrows[tube].ways[0].path;
    env.ask(reach(cells[burrows[tube].from], way[0], () => state === "scooped" && ((state = "tube"), (age = 0)), () => {}));
  }

  // ---- The tongs. `plan`: idle, going (to over a hole), or carrying a duck.
  let plan = "idle", rest = 14, plucks = 0, trolley = env.wide / 2, over = -1, held: Duck | undefined, hung: Point = [0, 0];
  const links = Math.ceil(high / 36);
  draw(q("rail"), `M${env.left},${RAIL} H${env.wide - env.left}`);

  function tick(dt: number, now: number, p: number) {
    // The poop.
    if (state === "none" && (wait -= dt) < 0) {
      const level = cells.filter((c) => c.seen && !c.away && c.tile.io === "LR");
      if (level.length) {
        home = level[pick(`where${laid}`, level.length)];
        at = [home.x + (home.flip ? S - 24 : 24), home.y + S / 2];
        state = "due";
      } else wait = 5;
    } else if (state === "due" && home.p > 0.12 && home.p < 0.3) {
      [state, said] = ["down", 1.2];
      laid++;
      env.ask(reach(home, at, scooped, next));
    } else if (state === "tube") {
      const way = burrows[tube].ways[0], where = within({ ...way, lead: 0 }, (age += dt / env.period));
      if (where) at = where;
      else {
        at = [way.path.at(-1)![0] + 18, way.path.at(-1)![1] - 4];
        state = "out";
        env.ask(reach(cells[burrows[tube].to], at, scooped, binned));
      }
    }
    const lying = state === "down" || state === "out", busy = state !== "none" && state !== "due";
    move(q("poop"), at[0], at[1]);
    show(q("poop"), lying ? 1 : state === "tube" ? 0.5 : 0);
    move(q("pong"), at[0], at[1]);
    show(q("pong"), (said = Math.max(0, said - dt)) ? 1 : 0);
    for (const k of FLIES) {
      move(q(`fly${k}`), at[0] + Math.cos(now * 7 + k * 3) * 12, at[1] - 16 + Math.sin(now * 11 + k * 2) * 6);
      show(q(`fly${k}`), lying ? 1 : 0);
    }
    show(bot("bot_peg"), busy ? 1 : 0);
    show(bot("bot_shovel"), busy ? 1 : 0);
    show(bot("bot_load"), state === "scooped" ? 1 : 0);
    shake = Math.max(0, shake - dt);
    move(q("bin"), 30 + Math.sin(shake * 40) * 3 * Math.min(1, shake * 4), high - 4);
    for (const k of FLOWERS) {
      move(q(`flower${k}`), 12 + k * 9, high - 30);
      show(q(`flower${k}`), k < flowers ? 1 : 0);
    }

    // The tongs.
    let reachDown = 14;
    if (plan === "idle" && (rest -= dt) < 0) {
      over = tunnel(`pluck${plucks++}`);
      [plan, rest] = over < 0 ? ["idle", 6] : ["going", 0];
    } else if (plan === "going") {
      const goal = burrows[over].ways[0].path[0][0], dx = goal - trolley, step = 620 * dt;
      trolley = Math.abs(dx) > step ? trolley + Math.sign(dx) * step : goal;
      // It is over the hole: the next duck to go down it is the one.
      held = trolley === goal && p < 0.1 ? env.ducks.find((k) => k.at.tunnel === over && k.at.age === 0) : undefined;
      if (held) plan = "carrying";
    } else if (plan === "carrying") {
      const way = burrows[over].ways[0], [ax, ay] = way.path[0], [bx, by] = way.path.at(-1)!, top = RAIL + HANG;
      if (held!.at.tunnel !== over) [plan, rest, held] = ["idle", 30 + pick(`rest${plucks}`, 25), undefined];
      else {
        // Up out of the one hole, along, and down at the other, in exactly the time the tunnel takes.
        const u = (held!.at.age + p) / way.periods, lift = Math.min(0.3, 0.6 / way.periods);
        hung = [ax + (bx - ax) * smooth(clamp((u - lift) / (1 - 2 * lift))), u < lift ? ay + (top - ay) * smooth(u / lift) : u > 1 - lift ? top + (by - top) * smooth((u - 1 + lift) / lift) : top];
        trolley = hung[0];
        reachDown = hung[1] - 26 - RAIL;
      }
    }
    move(q("tongs"), trolley, RAIL);
    draw(q("tongs_sc"), scissor(reachDown, links, 40));
    move(q("claw"), trolley, RAIL + reachDown);
  }

  return {
    tick,
    hop: (cell: Cell, x: number) => (state === "down" && cell === home ? 30 * Math.max(0, 1 - ((x - at[0]) / 36) ** 2) : 0),
    carried: (k: Duck) => (k === held ? hung : undefined),
  };
}
