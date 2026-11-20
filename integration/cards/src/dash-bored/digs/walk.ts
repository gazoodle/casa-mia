// Digs' household on the move. Each person at home walks from room to room, through the
// doorways, up and down the ladders, out into the garden and over to the outbuildings, and
// stays a while where they get to. Home Assistant says only that somebody is at home, so
// most trips end in a lit room, and nobody goes out of doors in the dark or the wet. One
// who goes out walks off the left of the world, and one who comes home walks in from there.
// It is a show: a figure is no claim about where anybody is.
// ponytail: where a figure can walk is found from the blocks. Once Topology is filled in
// (BACKLOG), its ways between rooms are the real ones, and Digs can take the house's shape,
// and which way is out, from there.
import type { Person } from "../house.ts";
import type { Cell } from "./prank.ts";
import type { World, Zone } from "./world.ts";

/** Whether somebody is about the house, by their person's state: at home, or not to be
 * placed at all (no tracker, or its integration not answering), as a child or a pet with
 * no phone is always about. Away or in a zone of their own ("Work"), they are out
 * (owner, 2026-11-20). It replaced, in 2026.11.11-b3, the whole household walking about
 * whenever nobody was at home: an empty house is worth seeing as empty. */
export const about = (state?: string) => state === "home" || state === undefined || state === "unknown" || state === "unavailable";

const PACE = 450; // ms: a block walked
const CLIMB = 700; // ms: a rung climbed
const [SOONEST, LATEST] = [10_000, 40_000]; // ms: how long somebody stays where they got to (owner, 2026-11-20: 20–90 s left nobody walking 60% of the time)
const FIRST = 30_000; // ms: the most anybody waits before their first trip
const SETTLE = 100; // ms: a newcomer is drawn off the edge before they start walking
const HOMELY = 0.7; // the share of trips that end in a lit room (or the ground floor, with none lit)
const OUT = 0.2; // the share of trips out of doors, when it is light and dry
// What a figure can't walk through. A doorway is "wall", the room's own back wall.
const SOLID = new Set(["plank", "stone", "brick", "roof", "beam"]);
const ACROSS = 100_000; // a cell's key is y * ACROSS + x: no world is that wide

/** A straight walk or climb: from where, begun when, and for how long. */
type Leg = { from: Cell; t0: number; ms: number };
/** One of the household in the world: where they stand, or are walking to, and the turns still ahead of them. */
type Walker = { name: string; at: Cell; leg?: Leg; ahead: Cell[]; leaving: boolean; left: boolean };

/** Where the world's ways out are: the left edge on the grass, and the step off it. */
const edge = (world: World): Cell => ({ x: 0, y: world.ground - 1 });
const off = (world: World): Cell => ({ x: -1, y: world.ground - 1 });

const graphs = new WeakMap<World, Map<number, number[]>>();

/** Where a figure can stand or climb, and where it can step to from each: worked out once for a world. */
function graph(world: World) {
  let g = graphs.get(world);
  if (g) return g;
  const ladder = new Set(world.deco.filter(([t]) => t === "ladder").map(([, x, y]) => y * ACROSS + x));
  const floors = new Set([world.ground - 1, ...world.zones.map((z) => z.y1)]);
  // A floor's cell that is not solid, with something under it to stand on; or a rung.
  const stands = (x: number, y: number) =>
    x >= 0 && x < world.w && (ladder.has(y * ACROSS + x) || (floors.has(y) && !SOLID.has(world.blocks[y][x] ?? "") && !!world.blocks[y + 1]?.[x]));

  g = new Map();
  for (let y = 0; y < world.h; y++)
    for (let x = 0; x < world.w; x++) {
      if (!stands(x, y)) continue;
      // Along a floor either way; up or down only where there is a ladder.
      const steps = [[x - 1, y], [x + 1, y]].filter(([a, b]) => stands(a, b));
      for (const b of [y - 1, y + 1]) if (stands(x, b) && (ladder.has(y * ACROSS + x) || ladder.has(b * ACROSS + x))) steps.push([x, b]);
      g.set(y * ACROSS + x, steps.map(([a, b]) => b * ACROSS + a));
    }
  graphs.set(world, g);
  return g;
}

/** The shortest way from one cell to another, a cell at a time; nothing if there is none. */
export function route(world: World, from: Cell, to: Cell): Cell[] | undefined {
  const g = graph(world);
  const [start, goal] = [from.y * ACROSS + from.x, to.y * ACROSS + to.x];
  const back = new Map([[start, -1]]);
  const queue = [start];
  for (let i = 0; i < queue.length && !back.has(goal); i++)
    for (const next of g.get(queue[i]) ?? [])
      if (!back.has(next)) {
        back.set(next, queue[i]);
        queue.push(next);
      }
  if (!back.has(goal)) return undefined;

  const cells: Cell[] = [];
  for (let k = goal; k !== -1; k = back.get(k)!) cells.unshift({ x: k % ACROSS, y: Math.floor(k / ACROSS) });
  return cells;
}

/** A way cut down to where it turns: each straight run is one leg, drawn as one move. */
export const corners = (cells: Cell[]) =>
  cells.filter((c, i) => {
    if (i === 0 || i === cells.length - 1) return true;
    const [a, b] = [cells[i - 1], cells[i + 1]];
    return Math.sign(c.x - a.x) !== Math.sign(b.x - c.x) || Math.sign(c.y - a.y) !== Math.sign(b.y - c.y);
  });

/** Where a trip ends: most often in one of the `homely` rooms, now and then in any room,
 * and out of doors (the garden, left of the buildings) if `outdoors` allows it. */
export function destination(world: World, homely: Zone[], outdoors: boolean, random: () => number): Cell {
  const house = Math.min(world.w, ...world.zones.map((z) => z.x0)) - 3;
  const pool = homely.length && random() < HOMELY ? homely : world.zones;
  if (!pool.length || (outdoors && house > 2 && random() < OUT)) return { x: 2 + Math.floor(random() * (house - 1)), y: world.ground - 1 };
  const zone = pool[Math.floor(random() * pool.length)];
  return { x: zone.x0 + Math.floor(random() * (zone.x1 - zone.x0 + 1)), y: zone.y1 };
}

/** What the walks need of the element they are on. */
type Host = {
  after(ms: number, then: () => void): void;
  requestUpdate(): void;
  world(): World | undefined;
  homely(world: World): Zone[];
  outdoors(): boolean;
  still(): boolean; // nobody walks: a specimen, or less movement asked for
  arrived(id: string): void; // somebody has got where they were going
  setOff(id: string): void; // somebody has begun a walk
  pace(id: string): number; // how much longer than a grown-up's their every step takes: a toddler's, 1.5
};

export class Walks {
  private _walkers = new Map<string, Walker>();
  private _world?: World;
  private _host: Host;

  constructor(host: Host) {
    this._host = host;
  }

  /** Begin again from nothing: the element is on the page. Everybody is placed afresh at the next sync. */
  start() {
    this._world = undefined;
    this._walkers.clear();
  }

  /** Who is at home now. A newcomer walks in from the edge and one who has gone walks off
   * it; at first, and in a world built afresh, everybody is simply somewhere. */
  sync(home: Person[]) {
    const world = this._host.world();
    if (!world) return;
    const fresh = world !== this._world;
    if (fresh) {
      this._world = world;
      this._walkers.clear();
    }

    const ids = new Set(home.map((p) => p.id));
    for (const p of home) {
      const w = this._walkers.get(p.id);
      if (!w) this._enter(p, fresh, world);
      else if (w.leaving) {
        // Back before they were out of sight: they turn round where they are.
        w.leaving = false;
        this._turn(p.id, w, (from) => (from.x < 0 ? this._in(world) : this._way(world, from, this._spot(world))));
      }
    }
    for (const [id, w] of this._walkers) if (!ids.has(id) && !w.leaving) this._leave(id, w, world);
  }

  /** Everybody in the world, by their id, for drawing: where each stands or is walking to,
   * how long that walk takes (0 when they are standing), whether it is a climb, and
   * whether they face left (the way they last walked). */
  list() {
    return [...this._walkers].map(([id, w]) => ({ id, name: w.name, at: w.at, ms: w.leg?.ms ?? 0, climbing: !!w.leg && w.leg.from.x === w.at.x, left: w.left }));
  }

  /** Where somebody is now, in blocks (part way between two while walking), and whether they are on the move. */
  where(id: string, now = Date.now()) {
    const w = this._walkers.get(id);
    if (!w) return undefined;
    const leg = w.leg;
    const k = leg ? Math.min(1, (now - leg.t0) / leg.ms) : 1;
    const along = (a: number, b: number) => (leg ? a + (b - a) * k : b);
    return { x: along(leg?.from.x ?? 0, w.at.x), y: along(leg?.from.y ?? 0, w.at.y), moving: k < 1 };
  }

  /** Somebody to follow other than `not`: one on the move if anybody is. If nobody else
   * is, `not` while they are there: going over to somebody standing still would leave the
   * view on them while others walk (the tour seemed to stop following, 2026.11.10-b1). */
  pick(not = "", random = Math.random) {
    const any = (pool: [string, Walker][]) => (pool.length ? pool[Math.floor(random() * pool.length)][0] : undefined);
    const others = [...this._walkers].filter(([id, w]) => id !== not && !w.leaving);
    const moving = others.filter(([, w]) => w.leg);
    if (moving.length) return any(moving);
    return this._walkers.has(not) ? not : any(others);
  }

  private _spot(world: World) {
    return destination(world, this._host.homely(world), this._host.outdoors(), Math.random);
  }

  /** The turns of the way from one cell to another, without the first; none if there is no way. */
  private _way(world: World, from: Cell, to: Cell, then: Cell[] = []) {
    const cells = route(world, from, to);
    return cells ? corners([...cells, ...then]).slice(1) : [];
  }

  /** The turns of the way in from off the edge to somewhere in the world. */
  private _in(world: World) {
    return corners([off(world), ...(route(world, edge(world), this._spot(world)) ?? [edge(world)])]).slice(1);
  }

  /** Do something later, unless this walker has gone or been replaced by then. */
  private _later(id: string, w: Walker, ms: number, then: () => void) {
    this._host.after(ms, () => this._walkers.get(id) === w && then());
  }

  private _enter(p: Person, placed: boolean, world: World) {
    const still = this._host.still();
    const w: Walker = { name: p.name, at: placed || still ? this._spot(world) : off(world), ahead: [], leaving: false, left: false };
    this._walkers.set(p.id, w);
    this._host.requestUpdate();
    if (still) return;
    if (placed) return this._linger(p.id, w, Math.random() * FIRST);
    // Drawn off the edge first, so that their first step is seen.
    w.ahead = this._in(world);
    this._later(p.id, w, SETTLE, () => this._step(p.id, w));
  }

  private _leave(id: string, w: Walker, world: World) {
    if (this._host.still()) {
      this._walkers.delete(id);
      return this._host.requestUpdate();
    }
    w.leaving = true;
    this._turn(id, w, (from) => this._way(world, from, edge(world), [off(world)]));
  }

  /** Set off a new way at once, from the block they are on now, even part way along a leg:
   * the figure's move is retargeted from wherever it has got to. */
  private _turn(id: string, w: Walker, way: (from: Cell) => Cell[]) {
    const now = this.where(id)!;
    w.at = { x: Math.round(now.x), y: Math.round(now.y) };
    w.leg = undefined;
    w.ahead = way(w.at);
    this._step(id, w);
  }

  /** The next leg of the way, or the end of it. */
  private _step(id: string, w: Walker) {
    const next = w.ahead.shift();
    if (!next) {
      w.leg = undefined;
      if (w.leaving) this._walkers.delete(id);
      else {
        this._host.arrived(id);
        this._linger(id, w);
      }
      return this._host.requestUpdate();
    }
    const ms = (Math.abs(next.x - w.at.x) * PACE + Math.abs(next.y - w.at.y) * CLIMB) * this._host.pace(id);
    const setting = !w.leg;
    const leg = (w.leg = { from: w.at, t0: Date.now(), ms });
    if (next.x !== w.at.x) w.left = next.x < w.at.x;
    w.at = next;
    this._host.requestUpdate();
    if (setting) this._host.setOff(id);
    // Unless they have turned since (`_turn`), which began a leg of its own.
    this._later(id, w, ms, () => w.leg === leg && this._step(id, w));
  }

  /** Stay a while, then set off somewhere else. */
  private _linger(id: string, w: Walker, ms = SOONEST + Math.random() * (LATEST - SOONEST)) {
    this._later(id, w, ms, () => {
      const world = this._world;
      if (w.leaving || w.leg || !world) return;
      w.ahead = this._way(world, w.at, this._spot(world));
      this._step(id, w);
    });
  }
}
