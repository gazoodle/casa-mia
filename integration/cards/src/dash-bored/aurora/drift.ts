// How what drifts over Aurora's season skins moves (owner, 2026-11-17: leaves "ought to
// flutter side to side as well as descend", look irregular, "settle on the ground", and
// be collected now and then by a robot; snow by a blower). A model with no page in it:
// drifting.ts moves the drawings by it.
//
// - Each thing swings as a van der Pol oscillator, which keeps itself swinging where a
//   pendulum would come to rest. It slides sideways as it swings and drops fastest in
//   mid swing, so it all but hangs at each end: a leaf's flutter.
// - The wind is one Lorenz system for the whole page. It is chaotic, so the gusts never
//   repeat, and a gust knocks each swing a little off its beat. In a real wind everything
//   would go the same way at once, which looked odd (owner, 2026-11-17: "we can have
//   artistic license here"), so each thing takes the wind in its own measure, some of
//   them against it, and each has its own speed.
// - What falls lands on a ledge: the top of a tile, the top of the bar, or the ground.
//   Some of it lies there a few seconds and then becomes part of the ledge's heap, which
//   is one drawing however much is in it (owner, 2026-11-17: many things lying about "have
//   that blizzard feel"; "convert a bunch of flakes to a snow pile").
// - A ledge that is shaken, or is no longer there, drops what was on it.
// - Now and then a machine comes: it flies to each ledge that has something on it and
//   drives along it. The robot collects what is there and the blower throws it up.
//
// Lengths are px, times seconds, angles radians.

/** How one kind of thing moves. `speed` is its fall, rise or flight; `swing` half the
 * angle it swings through; `rate` how fast; `snap` how jerkily (over `rate`, it lurches);
 * `slide` how far the swing carries it; `wind` how hard the wind pushes it. */
export type Move = { how: "fall" | "rise" | "cross"; speed: number; swing: number; rate: number; snap: number; slide: number; wind: number; tidy?: "robot" | "blower" };
/** By the drawing's name (art.ts GLYPHS). A drawing that is not here does not move by this model. */
export const MOVES: Record<string, Move> = {
  leaf: { how: "fall", speed: 85, swing: 0.55, rate: 2.3, snap: 0.9, slide: 42, wind: 55, tidy: "robot" },
  petal: { how: "fall", speed: 60, swing: 0.45, rate: 2.9, snap: 0.7, slide: 30, wind: 70, tidy: "robot" },
  flake: { how: "fall", speed: 42, swing: 0.2, rate: 1.5, snap: 0.4, slide: 22, wind: 95, tidy: "blower" },
  heart: { how: "rise", speed: 48, swing: 0.25, rate: 1.8, snap: 0.5, slide: 26, wind: 35 },
  gull: { how: "cross", speed: 46, swing: 0.3, rate: 0.7, snap: 0.3, slide: 26, wind: 20 }, // glides
  bat: { how: "cross", speed: 95, swing: 0.5, rate: 2.4, snap: 3.5, slide: 38, wind: 25 }, // flits
};

/** `air` is in the air, `down` lying on a ledge (`on`, for `age` seconds so far), `thrown`
 * flung up by a machine, `spare` not on the page. `blow` is how much of the wind it takes,
 * from -1 (against it) to 1, `pace` its speed against its kind's, and `off` the ledge it
 * has just left, which it does not land on again. */
export type Mote = { state: "air" | "down" | "thrown" | "spare"; x: number; y: number; vx: number; vy: number; a: number; w: number; rate: number; dir: number; rest: number; blow: number; pace: number; on: string; off: string; age: number };
/** Somewhere things lie: from `from` to `to` across the page, at `top`. */
export type Shelf = { id: string; from: number; to: number; top: number };
/** A shelf with its heap: how deep it is in each BIN of its width. */
export type Ledge = Shelf & { heap: number[] };
/** The machine while it is out: where it is, which way it faces, the ledges it has yet to visit, and whether it is driving along the first of them or flying to it. */
export type Tidy = { x: number; y: number; dir: number; route: string[]; driving: boolean };
/** A page of them. `count` is how many are in the air, `air` the Lorenz system's state,
 * `since` how long ago the machine last came and `every` how long until it comes again.
 * `changed` names the ledges whose heaps are to be drawn again: whoever draws them empties it. */
export type Field = { move: Move; count: number; wide: number; tall: number; ledges: Ledge[]; changed: Set<string>; motes: Mote[]; air: [number, number, number]; seed: number; since: number; every: number; tidy?: Tidy };

export const PILE = 30; // how many can lie about at once, before they are part of a heap
export const GROUND = "ground"; // the ledge that is always there
const EDGE = 40; // how far off the page a thing starts and ends
const BIN = 24; // the width of one part of a heap
const DEEP = 12; // how deep a heap gets
const GAIN = 2.5; // how much one thing adds to a heap where it is, and half that either side
const LIES = 7; // how long a thing lies there before it is part of the heap
const STAYS = 0.35; // the share of what comes down on a ledge that stays: the rest falls on past it
const PACE = 160; // a machine's speed along a ledge
const FLIGHT = 260; // and between them
const REACH = 18; // how near a machine must be to take a thing
const MISSED = 1 / 7; // the share the robot flicks up behind it and leaves

// A number from 0 up to 1, the same sequence for the same seed (mulberry32), so a test can say what happens.
function rand(f: Field) {
  f.seed = (f.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(f.seed ^ (f.seed >>> 15), 1 | f.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Puts a thing into the air at the edge it comes in by, or `anywhere` on the page for the first of them. */
function launch(f: Field, m: Mote, anywhere = false) {
  const { how, swing, rate } = f.move;
  Object.assign(m, { state: "air", dir: rand(f) < 0.5 ? -1 : 1, rate: rate * (0.7 + rand(f) * 0.6), a: (rand(f) - 0.5) * swing * 2, vx: 0, vy: 0, rest: rand(f) * 14, blow: rand(f) * 2 - 1, pace: 0.55 + rand(f) * 0.9, off: "" });
  m.w = (rand(f) - 0.5) * m.rate;

  if (how === "cross") {
    m.x = anywhere ? rand(f) * f.wide : m.dir > 0 ? -EDGE : f.wide + EDGE;
    m.y = f.tall * (0.08 + rand(f) * 0.55);
  } else {
    m.x = rand(f) * f.wide;
    m.y = anywhere ? rand(f) * f.tall * 0.9 : how === "rise" ? f.tall + EDGE : -EDGE - rand(f) * 60;
  }
}

const every = (f: Field) => 300 + rand(f) * 180;
const ledged = (f: Field, id: string) => f.ledges.find((l) => l.id === id);
const bin = (l: Ledge, x: number) => Math.max(0, Math.min(l.heap.length - 1, Math.floor(((x - l.from) / (l.to - l.from)) * l.heap.length)));
/** Where a thing lies on a ledge at `x`: on its heap. */
const line = (l: Ledge, x: number) => l.top - 4 - l.heap[bin(l, x)];
const lay = (l: Shelf, heap?: number[]): Ledge => ({ ...l, heap: heap ?? new Array(Math.max(1, Math.ceil((l.to - l.from) / BIN))).fill(0) });

// Adds to a ledge's heap at `x`, and half as much either side, so that it is a mound and not a post.
function pile(f: Field, l: Ledge, x: number) {
  const at = bin(l, x);
  for (const [i, much] of [[at - 1, GAIN / 2], [at, GAIN], [at + 1, GAIN / 2]]) if (l.heap[i] !== undefined) l.heap[i] = Math.min(DEEP, l.heap[i] + much);
  f.changed.add(l.id);
}

/** A page `wide` by `tall` with `count` things in the air, and as many spare as can lie about if a machine tidies them. Its only ledge is the ground until `fit` gives it others. */
export function begin(move: Move, count: number, wide: number, tall: number, seed = 1): Field {
  const mote = (): Mote => ({ state: "spare", x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0, rate: 1, dir: 1, rest: 0, blow: 1, pace: 1, on: "", off: "", age: 0 });
  const f: Field = { move, count, wide, tall, ledges: [], changed: new Set(), motes: Array.from({ length: count + (move.tidy ? PILE : 0) }, mote), air: [1, 1, 20], seed, since: 0, every: 0 };
  f.every = every(f);
  fit(f, wide, tall);
  for (const m of f.motes.slice(0, count)) launch(f, m, true);
  return f;
}

/** A ledge is shaken: what lay on it and what was heaped on it fall off. */
export function shake(f: Field, id: string) {
  const l = ledged(f, id);
  if (!l) return;
  const drop = (m: Mote, x: number, y: number) => Object.assign(m, { state: "air", x, y, vx: (rand(f) - 0.5) * 140, vy: rand(f) * 150 - 90, pace: 0.55 + rand(f) * 0.9, off: id, on: "" }); // each its own way, not in a row

  for (const m of f.motes) if (m.state === "down" && m.on === id) drop(m, m.x, m.y);
  // A heap falls as things again: one for each part of it that had much in it, while there are spare ones.
  l.heap.forEach((deep, i) => {
    const spare = deep > 3 ? f.motes.find((m) => m.state === "spare") : undefined;
    if (spare) drop(spare, l.from + ((i + 0.5) * (l.to - l.from)) / l.heap.length, l.top - deep);
  });
  if (l.heap.some((deep) => deep)) f.changed.add(id);
  l.heap.fill(0);
}

/** The page as it now is: its size, and the ledges on it apart from the ground. A ledge
 * that is gone, or is another width, drops what was on it; one that has only moved keeps it. */
export function fit(f: Field, wide: number, tall: number, shelves: Shelf[] = []) {
  const now = [...shelves, { id: GROUND, from: -EDGE, to: wide + EDGE, top: tall - 14 }].map((s) => lay(s));
  for (const old of f.ledges) {
    const same = now.find((l) => l.id === old.id);
    if (same?.heap.length === old.heap.length) same.heap = old.heap;
    else shake(f, old.id);
    if (same?.top !== old.top || same?.from !== old.from) f.changed.add(old.id);
  }
  Object.assign(f, { wide, tall, ledges: now });
  for (const m of f.motes) if (m.state === "down") m.y = line(ledged(f, m.on)!, m.x) - m.rest / 2;
}

/** A ledge's heap as an outline to be filled: a path's `d`, or "" if nothing is heaped on it. */
export function outline(l: Ledge): string {
  if (!l.heap.some((deep) => deep)) return "";
  const step = (l.to - l.from) / l.heap.length;
  const at = (i: number) => [l.from + (i + 0.5) * step, l.top - (l.heap[i] ?? 0)];
  // A curve through the middle of each part, from one end of the ledge to the other.
  const curve = l.heap.map((_, i) => {
    const [[x, y], [nx, ny]] = [at(i), at(i + 1)];
    return i === l.heap.length - 1 ? `Q${x.toFixed(1)} ${y.toFixed(1)} ${l.to.toFixed(1)} ${l.top}` : `Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  });
  return `M${l.from.toFixed(1)} ${l.top}${curve.join("")}Z`;
}

/** The wind on a thing: its own measure of the page's wind, stronger higher up, and an eddy across the page. */
function wind(f: Field, m: Mote) {
  const [x, y, z] = f.air;
  return f.move.wind * (m.blow * (x / 18) * (1.2 - (0.5 * m.y) / f.tall) + 0.3 * (y / 25) * Math.sin(m.x / 170 + z / 8));
}

/** The angle a thing is drawn at: its swing, or for what flies how steeply it climbs. */
export const tilt = (f: Field, m: Mote) => (f.move.how === "cross" ? (m.vy / 160) * m.dir : m.a);

const flying = (f: Field) => f.motes.filter((m) => m.state === "air" || m.state === "thrown").length;

// A thing that fell from `was` to where it is: the ledge it came down on, and whether it stays there.
function land(f: Field, m: Mote, was: number) {
  for (const l of f.ledges) {
    if (l.id === m.off || m.x < l.from || m.x > l.to) continue;
    const at = line(l, m.x);
    if (was >= at || m.y < at) continue;

    // It stays, or falls on past: but nothing falls past the ground, where it is gone and another comes in at the top.
    const stays = rand(f) < STAYS;
    const more = flying(f) > f.count; // a ledge was shaken, so there are more in the air than there should be
    if (stays) {
      const spare = f.motes.find((s) => s.state === "spare");
      if (!spare && !more) pile(f, l, m.x); // too many lie about already: straight onto the heap
      else Object.assign(m, { state: "down", on: l.id, age: 0, y: at - m.rest / 2, a: (rand(f) - 0.5) * 0.6 });
      if (more) return;
      return launch(f, spare ?? m);
    }
    if (l.id !== GROUND) continue;
    if (more) m.state = "spare";
    else launch(f, m);
    return;
  }
}

// A thing in the air, moved on by `dt`. `gust` is how fast the wind is changing.
function fly(f: Field, m: Mote, dt: number, gust: number) {
  const { how, swing, snap, slide } = f.move;
  const speed = f.move.speed * m.pace;
  // The swing (van der Pol): pushed while it is small and braked while it is big, so it neither dies nor grows.
  m.w += (snap * (1 - (m.a / swing) ** 2) * m.w - m.rate ** 2 * m.a) * dt + gust * swing * 1.5 * dt;
  m.a = Math.max(-3 * swing, Math.min(3 * swing, m.a + m.w * dt));

  // Where the swing and the wind would take it, which it comes to over a third of a second.
  const mid = Math.min(1, Math.abs(m.w) / (2 * swing * m.rate)); // 1 in mid swing, 0 at each end
  const blown = wind(f, m);
  const [tx, ty] = how === "cross" ? [m.dir * speed + 0.3 * blown, slide * m.w] : [blown + slide * m.w, (how === "rise" ? -1 : 1) * speed * (0.4 + 0.6 * mid)];
  const ease = Math.min(1, 3 * dt);
  const was = m.y;
  m.vx += (tx - m.vx) * ease;
  m.vy += (ty - m.vy) * ease;
  m.x += m.vx * dt;
  m.y += m.vy * dt;

  // Off the page, or down.
  if (how === "cross") {
    m.y = Math.max(f.tall * 0.04, Math.min(f.tall * 0.7, m.y));
    if (m.x < -EDGE || m.x > f.wide + EDGE) launch(f, m);
    return;
  }
  if (m.x < -EDGE) m.x += f.wide + 2 * EDGE;
  if (m.x > f.wide + EDGE) m.x -= f.wide + 2 * EDGE;
  if (how === "fall") land(f, m, was);
  else if (m.y < -EDGE) launch(f, m);
}

// A thing a machine threw, moved on by `dt`: it goes as a thrown thing does until it is coming down, and then drifts again.
function thrown(m: Mote, dt: number) {
  m.vy += 520 * dt;
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  m.a += m.w * dt;
  if (m.vy >= 0) Object.assign(m, { state: "air", w: 0 });
}

// A thing lying on a ledge: after a while it is part of the heap.
function lie(f: Field, m: Mote, dt: number) {
  m.age += dt;
  if (m.age < LIES + m.rest / 4) return;
  pile(f, ledged(f, m.on)!, m.x);
  m.state = "spare";
}

const flung = (f: Field, t: Tidy) => ({ state: "thrown", on: "", off: "", vx: -t.dir * (60 + rand(f) * 160), vy: -(300 + rand(f) * 260), w: (rand(f) - 0.5) * 12 });

// The machine takes what is within its reach on the ledge it is driving along.
function take(f: Field, t: Tidy, l: Ledge) {
  const blows = f.move.tidy === "blower";
  for (const m of f.motes) {
    if (m.state !== "down" || m.on !== l.id || Math.abs(m.x - t.x) > REACH) continue;
    // Up and behind it, out of its way: all of the snow, and the leaf the robot missed.
    if (blows || rand(f) < MISSED) Object.assign(m, flung(f, t));
    else m.state = "spare";
  }

  const at = bin(l, t.x);
  if (!l.heap[at] || t.x < l.from || t.x > l.to) return;
  const spare = blows && l.heap[at] > 3 ? f.motes.find((m) => m.state === "spare") : undefined;
  if (spare) Object.assign(spare, flung(f, t), { x: t.x, y: l.top - l.heap[at] });
  l.heap[at] = 0;
  f.changed.add(l.id);
}

// The machine: it sets out when its time has come and something lies somewhere, flies to
// each ledge that has something on it, from the top of the page down, and drives along it.
function tidy(f: Field, dt: number) {
  f.since += dt;
  if (!f.tidy && f.since > f.every) {
    const route = f.ledges.filter((l) => l.heap.some((deep) => deep) || f.motes.some((m) => m.state === "down" && m.on === l.id));
    if (!route.length) return;
    const dir = rand(f) < 0.5 ? -1 : 1;
    f.tidy = { x: dir > 0 ? -2 * EDGE : f.wide + 2 * EDGE, y: route[0].top - 4, dir, route: route.sort((a, b) => a.top - b.top || a.from - b.from).map((l) => l.id), driving: false };
  }
  const t = f.tidy;
  if (!t) return;

  // A ledge that is no longer there is not visited. With none left, it flies off by the nearer side.
  while (t.route.length && !ledged(f, t.route[0])) Object.assign(t, { route: t.route.slice(1), driving: false });
  const l = ledged(f, t.route[0] ?? "");
  const [from, to] = l ? [Math.max(l.from, -EDGE), Math.min(l.to, f.wide + EDGE)] : [0, 0];

  if (l && t.driving) {
    t.x += t.dir * PACE * dt;
    t.y = l.top - 4;
    take(f, t, l);
    if (t.dir > 0 ? t.x >= to : t.x <= from) Object.assign(t, { route: t.route.slice(1), driving: false });
    return;
  }

  // Flying: straight to the nearer end of the next ledge, or off the page.
  const [gx, gy] = l ? [Math.abs(t.x - from) < Math.abs(t.x - to) ? from : to, l.top - 4] : [t.x < f.wide / 2 ? -2 * EDGE : f.wide + 2 * EDGE, t.y];
  const far = Math.hypot(gx - t.x, gy - t.y);
  const go = Math.min(1, (FLIGHT * dt) / (far || 1));
  if (Math.abs(gx - t.x) > 1) t.dir = gx > t.x ? 1 : -1;
  t.x += (gx - t.x) * go;
  t.y += (gy - t.y) * go;
  if (go < 1) return;

  if (l) Object.assign(t, { driving: true, dir: gx === from ? 1 : -1 });
  else Object.assign(f, { tidy: undefined, since: 0, every: every(f) });
}

/** Moves the page on by `dt`. A long gap (a tab that was hidden) counts as a twentieth of a second. */
export function step(f: Field, dt: number): Field {
  dt = Math.min(dt, 0.05);

  // The wind (Lorenz, at about a third of its own pace, which is slow enough for the plain step here).
  const [x, y, z] = f.air;
  const s = dt * 0.3;
  f.air = [x + 10 * (y - x) * s, y + (x * (28 - z) - y) * s, z + (x * y - (8 / 3) * z) * s];
  const gust = dt ? (f.air[0] - x) / 18 / dt : 0;

  for (const m of f.motes) {
    if (m.state === "air") fly(f, m, dt, gust);
    else if (m.state === "thrown") thrown(m, dt);
    else if (m.state === "down") lie(f, m, dt);
  }
  if (f.move.tidy) tidy(f, dt);
  return f;
}
