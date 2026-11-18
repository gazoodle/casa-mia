// The tunnels under the sheet: where the ducks that go down one hole travel to come up at
// another. They are drawn as dim, dashed tubes behind the machine, as what goes on behind
// the scenes. A tunnel is made of runs that are level, upright or at 45 degrees (owner,
// 2026-11-18: "so it adds to the machine's crazy"). Tunnels are on layers, and cross.
//
// What the owner asked of them next (2026-11-18): "we ought to try to keep them away from
// each other", and junctions are welcome. So a tunnel is placed by trying several ways
// and keeping the one that crowds the others least (`placed`): two tubes either share a
// stretch exactly, where both are bound for the same hole, or keep a tube's width apart
// where they run alongside. It is a best try, not a proof: `crowds` is what a test asks.
//
// A duck in a tube goes at the pace of one on the sheet, a tile's length a period. A way is
// seldom a whole number of tiles long, so the duck waits the odd part of a period out of
// sight in a hole (`lead` says how long at the start; the rest is at the end).
//
// The dumb waiter's ducks go back from its top to its foot by `wander`: a tunnel that
// forks in turn and goes the long way round, through the places the sheet has no tile.
import { beats } from "./flow.ts";
import { hash } from "./kit.ts";
import { S } from "./tile.ts";

export type Point = [x: number, y: number];
export type Leg = [Point, Point];
/** One way through a tunnel: its line, how many periods a duck is in it, and how many of them it waits at the start. */
export type Way = { path: Point[]; periods: number; lead: number };
export const LAYERS = 3;
export const GAP = 40; // how far apart two tubes that run alongside are to keep, middle to middle
const TRIES = 48, CLOSE = 300; // how many ways are tried for a tunnel, and what running alongside another costs one

/** From one point to another by two level or upright runs and two slanting ones, in an
 * order and at lengths that are the tunnel's own (`seed`). The first point is not given back. */
function runs(start: Point, end: Point, seed: string): Point[] {
  const pick = (what: string, n: number) => hash(seed + what) % n;
  const dx = end[0] - start[0], dy = end[1] - start[1], slant = Math.min(Math.abs(dx), Math.abs(dy)), flat = Math.abs(dx) > Math.abs(dy);
  const straight = Math.max(Math.abs(dx), Math.abs(dy)) - slant, share = [0.25, 0.5, 0.75, 0, 1];
  const first = share[pick("straight", 5)], lean = share[pick("slant", 5)];

  // The runs, as how far each goes: the straight ones along the longer way, the slanting ones both ways at once.
  const along = (far: number): Point => (flat ? [Math.sign(dx) * far, 0] : [0, Math.sign(dy) * far]);
  const across = (far: number): Point => [Math.sign(dx) * far, Math.sign(dy) * far];
  const parts = [along(straight * first), across(slant * lean), along(straight * (1 - first)), across(slant * (1 - lean))];
  if (pick("order", 2)) parts.reverse();

  const way: Point[] = [start];
  for (const [x, y] of parts) if (x || y) way.push([way.at(-1)![0] + x, way.at(-1)![1] + y]);
  // Arithmetic in halves and quarters can end a hair off: the last run ends where it was going.
  way[way.length - 1] = end;
  return way.slice(1);
}

/** The first bend of a tunnel by a hole: below it for the most part, sometimes above, straight or off to one side on a slant. `k` says which and how far. */
const under = ([x, y]: Point, k: number): Point => {
  const far = 34 + 12 * (k % 8), side = (k % 3) - 1, up = Math.floor(k / 24) % 3 === 0 ? -1 : 1;
  return [x + side * far, y + up * far];
};

/** A tunnel's way from one hole to another, in the sheet's units: it drops from the first and comes up under the second. */
export function burrow(from: Point, to: Point, seed: string): Point[] {
  const start = under(from, hash(seed + "drop")), end = under(to, hash(seed + "rise"));
  return [from, start, ...runs(start, end, seed), to];
}

export const legs = (path: Point[]): Leg[] => path.slice(1).map((b, i) => [path[i], b]);
const far = ([a, b]: Leg) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** How long a way is. */
export const long = (path: Point[]) => legs(path).reduce((sum, leg) => sum + far(leg), 0);

/** How two runs lie: `beside` is how far they run alongside one another closer than a
 * tube's width (nought if they do not, or are the same run), and `cross` whether one crosses the other. */
export function lie([c, d]: Leg, [a, b]: Leg) {
  const len = far([c, d]), ux = (d[0] - c[0]) / len, uy = (d[1] - c[1]) / len, vx = b[0] - a[0], vy = b[1] - a[1], cross = ux * vy - uy * vx;
  const ax = a[0] - c[0], ay = a[1] - c[1];

  if (Math.abs(cross) > 1e-6 * Math.hypot(vx, vy)) {
    const t = (ax * vy - ay * vx) / cross, u = (ax * uy - ay * ux) / cross;
    return { beside: 0, cross: t > 1 && t < len - 1 && u > 0 && u < 1 };
  }
  if (Math.abs(ax * uy - ay * ux) >= GAP) return { beside: 0, cross: false };
  const s0 = ax * ux + ay * uy, s1 = s0 + vx * ux + vy * uy, lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  const same = Math.abs(ax * uy - ay * ux) < 0.5 && Math.abs(lo) < 0.5 && Math.abs(hi - len) < 0.5;
  return { beside: same ? 0 : Math.max(0, Math.min(len, hi) - Math.max(0, lo)), cross: false };
}

/** How badly a way would sit among the runs already there: its length counts a little, a crossing more, and running close alongside most. */
export function crowds(path: Point[], there: Leg[]) {
  let score = long(path) * 0.05;
  for (const leg of legs(path)) {
    if (far(leg) < 1) continue;
    for (const other of there) {
      const { beside, cross } = lie(leg, other);
      score += (beside ? CLOSE + 4 * beside : 0) + (cross ? 20 : 0);
    }
  }
  return score;
}

/** The way for a tunnel from one hole to another that sits best among the runs already
 * there. `kin` are the ways of tunnels bound for the same hole: this one may join one of
 * them at a bend and share the rest of its way. */
export function placed(from: Point, to: Point, seed: string, there: Leg[], kin: Point[][]): Point[] {
  // What is tried: [the way, how much of it is its own, counted from the start]. First the joins.
  const tries: [Point[], number][] = [];
  for (const other of kin)
    for (let bend = 2; bend < other.length - 1; bend++)
      for (let k = 0; k < 3; k++) {
        const start = under(from, hash(`${seed}.${bend}.${k}`)), own = [from, start, ...runs(start, other[bend], `${seed}.${bend}.${k}`)];
        tries.push([[...own, ...other.slice(bend + 1)], own.length]);
      }

  let best: Point[] = [], least = Infinity;
  const tried = ([path, own]: [Point[], number]) => {
    const score = crowds(path.slice(0, own), there);
    if (score < least) [best, least] = [path, score];
  };
  tries.forEach(tried);
  // Then ways of its own: more of them, up to four times as many, while the best yet still runs alongside another.
  for (let k = 0; k < TRIES * 4 && (k < TRIES || least >= CLOSE); k++) {
    const path = burrow(from, to, `${seed}.${k}`);
    tried([path, path.length]);
  }
  return best;
}

/** A tunnel's way, timed: `turn` of `of` tunnels bound for one hole, which come to it a
 * part of a period apart, so that where they share a tube their ducks go alternately. */
export function timed(path: Point[], turn = 0, of = 1): Way {
  const takes = long(path) / S + turn / of, periods = Math.max(1, Math.ceil(takes - 1e-9));
  return { path, periods, lead: periods - takes };
}

/** Where the duck that has been in a way for `age` periods is, or nothing while it waits out of sight. */
export function within({ path, lead }: Way, age: number): Point | undefined {
  let left = (age - lead) * S;
  if (left < 0) return undefined;
  for (const leg of legs(path)) {
    const len = far(leg), [[ax, ay], [bx, by]] = leg;
    if (left <= len && len) return [ax + ((bx - ax) * left) / len, ay + ((by - ay) * left) / len];
    left -= len;
  }
  return undefined;
}

// ---- The long way round.
const TURNS: Point[] = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2], [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]];
/** An eight-sided spiral about a point, inwards from `out` away, its rings a tube and a bit apart. */
function spiral([cx, cy]: Point, out: number): Point[] {
  const side = out / 1.307, less = (GAP + 4) / 1.307 / 8, way: Point[] = [[cx - side / 2, cy - side * 1.207]];
  for (let k = 0; side - k * less > 14; k++) {
    const [x, y] = way.at(-1)!, len = side - k * less, [dx, dy] = TURNS[k % 8];
    way.push([x + dx * len, y + dy * len]);
  }
  return way;
}

/** From one point to another by one slanting run and one straight one: the first point is not given back. */
function elbow(a: Point, b: Point, slantFirst: boolean): Point[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], slant = Math.min(Math.abs(dx), Math.abs(dy));
  const mid: Point = slantFirst ? [a[0] + Math.sign(dx) * slant, a[1] + Math.sign(dy) * slant] : [b[0] - Math.sign(dx) * slant, b[1] - Math.sign(dy) * slant];
  return Math.hypot(mid[0] - a[0], mid[1] - a[1]) > 1 && Math.hypot(mid[0] - b[0], mid[1] - b[1]) > 1 ? [mid, b] : [b];
}

type Cell = [col: number, row: number];
const COME: Point[] = [[84, 0], [-84, 0], [64, -64], [-64, -64]]; // where the ways come to the last hole from, so that no two share a tube there

/** The ways of the tunnel from the top of the dumb waiter (`from`, its hole) back to its
 * foot (`to`): two or four, which the ducks take in turn. It forks under the top hole, one
 * way for each side of the shaft (`shaft` is its column), and a side with room forks again.
 * Each way calls at the places with no tile (`blank`), row by row, and the one that comes
 * to the emptiest part of the sheet winds into a spiral there. */
export function wander(from: Point, to: Point, blank: Cell[], shaft: number, seed: string): Way[] {
  const pick = (what: string, n: number) => hash(seed + what) % n;
  const fork: Point = [from[0], from[1] + 46], is = new Set(blank.map(String));

  // The two sides. A room with all its tiles to one side of the shaft is shared out by how far out a place is.
  let sides = [blank.filter(([col]) => col > shaft), blank.filter(([col]) => col < shaft)];
  if (!sides[0].length || !sides[1].length) {
    const all = [...blank].sort((a, b) => Math.abs(a[0] - shaft) - Math.abs(b[0] - shaft));
    sides = [all.filter((_, i) => i % 2 === 0), all.filter((_, i) => i % 2 === 1)];
  }

  // The emptiest place: the one with the most places round it that are empty too.
  const room = ([col, row]: Cell) => [-1, 0, 1].flatMap((dc) => [-1, 0, 1].map((dr) => is.has(`${col + dc},${row + dr}`))).filter(Boolean).length;
  const emptiest = blank.reduce((best, cell) => (room(cell) > room(best) ? cell : best), blank[0]);

  /** The places of one way in the order it calls at them: down the rows, out along one and back along the next, to end near the shaft. */
  const order = (cells: Cell[]) => {
    const rows = [...new Set(cells.map(([, row]) => row))].sort((a, b) => a - b);
    return rows.flatMap((row, i) => cells.filter(([, r]) => r === row).sort((a, b) => (Math.abs(a[0] - shaft) - Math.abs(b[0] - shaft)) * ((rows.length - 1 - i) % 2 ? 1 : -1)));
  };
  /** A way from `start` by way of `cells` and on: each place is called at a little off its middle, by a slanting run and a straight one. */
  const through = (start: Point, cells: Cell[]) => {
    const path = [start];
    for (const [col, row] of cells) {
      const key = `${col},${row}`, mid: Point = [col * S + S / 2, row * S + S / 2];
      const stops = col === emptiest?.[0] && row === emptiest[1] ? spiral(mid, room([col, row]) === 9 ? 232 : 104) : [[mid[0] + 30 * (pick(`x${key}`, 5) - 2), mid[1] + 30 * (pick(`y${key}`, 5) - 2)] as Point];
      path.push(...elbow(path.at(-1)!, stops[0], pick(`e${key}`, 2) === 1), ...stops.slice(1));
    }
    return path.slice(1);
  };

  const paths: Point[][] = [[], [], [], []];
  sides.forEach((cells, side) => {
    const sorted = order(cells), split = sorted.length >= 8;
    // The ways of a side go together as far as its first place, and there one takes the even rows and the other the odd.
    const stem = [from, fork, ...through(fork, sorted.slice(0, 1))], rest = sorted.slice(1);
    [0, 1].forEach((half) => {
      const mine = split ? rest.filter(([, row]) => row % 2 === half) : rest, far = [...stem, ...through(stem.at(-1)!, mine)];
      const come: Point = [to[0] + COME[side + 2 * half][0], to[1] + COME[side + 2 * half][1]];
      paths[side + 2 * half] = [...far, ...elbow(far.at(-1)!, come, pick(`c${side}${half}`, 2) === 1), to];
    });
    if (!split) paths[side + 2] = paths[side];
  });

  // With no side forked again there are two ways and not four.
  const ways = paths[0] === paths[2] && paths[1] === paths[3] ? paths.slice(0, 2) : paths;
  return beats(ways.map((path) => Math.max(1, Math.ceil(long(path) / S - 1e-9)))).map((periods, i) => ({ path: ways[i], periods, lead: 0 }));
}
