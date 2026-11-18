// Digs' world: the house in section as a grid of blocks, worked out from the rooms the
// survey found. There is no page in here, so it can be tested by itself (digs.test.ts).
// A world is built once for a survey and never for a state: a block must not move because
// a light was switched.
import type { Device, Room } from "../house.ts";

/** A seeded run of numbers from 0 to 1 (mulberry32): the same world and textures every time. */
export const rng = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** A whole number from a name, the same each time. */
export const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;

// ponytail: an area is out of doors, or a building of its own, by its name, in English. A
// list per language, or a setting of the house's that says which floors are which
// building, if this is ever translated or guesses wrong (BACKLOG: Digs, buildings).
const OUTDOORS = /\b(garden|drive(way)?|patio|yard|terrace|outside|outdoors?|balcony|porch|deck|lawn|pond)\b/i;
const OUTBUILDING = /\b(garage|barn|shed|workshop|stables?|annexe?|outbuilding|studio|lodge|cabin|greenhouse|summer ?house)\b/i;
const MIN = 4; // blocks: the least a room is wide, for its name and somebody in it
const PLOT = 3; // blocks: the least a place out of doors is wide, for its name
const SIGNS = 4; // the forecast's days, a sign each (house.ts prints as many)
const EARTH = 3; // rows: the grass and what is under it
const WRAP = 24; // blocks: about how wide a storey of rooms on no floor is before another is begun
const STOREYS = 3; // the most storeys rooms on no floor are wrapped into
export const MANY = 8; // over this many lights, or switches, a room has one block for them all
export const TALL = 3; // rows: a room's inside
/** A room's lights when it has more than MANY (a chandelier), and its chest, by the room's id: their ids in `slots`. */
export const LAMPS = "lamps:", CHEST = "chest:";

/** How a thing stands in a room: a lamp on the ceiling, a window from the ceiling down,
 * a door from the floor up, a block on the floor, or a picture on the wall (a camera's:
 * PICTURE blocks wide, so that what it sees can be told from another's). */
type Shape = "lamp" | "window" | "door" | "block" | "picture";
export const PICTURE = 3;
const shape = (d: Device): Shape => (d.kind === "camera" ? "picture" : d.kind === "light" ? "lamp" : d.kind === "lock" || (d.kind === "cover" && d.guarded) ? "door" : d.kind === "cover" ? "window" : "block");
type Item = { id: string; shape: Shape };

/** Where a block is, how many blocks tall, and how many wide if more than one. */
export type Slot = { x: number; y: number; h: number; w?: number };
/** A room's inside, corner to corner. */
export type Zone = { id: string; name: string; x0: number; y0: number; x1: number; y1: number; storey: number };
export type World = {
  w: number;
  h: number;
  ground: number; // the row of the grass
  blocks: (string | null)[][]; // a texture's name for each block, by row
  deco: [texture: string, x: number, y: number][]; // what is drawn over the blocks and is no device
  zones: Zone[];
  plots: { id: string; name: string; x0: number; x1: number; y: number }[]; // each place out of doors: where its name goes
  zone: string[][]; // for the light: a room's id, "struct" for a building's own blocks, "out"
  slots: Map<string, Slot>; // by a device's id, or LAMPS or CHEST and a room's id
  sign: { x: number; y: number }; // the signpost to the choice of family, two blocks wide
  notice: { x: number; y: number }; // the board that says what the house is missing, three blocks wide
  signs: { x: number; y: number }[]; // the forecast's signs: where each board is
};

/** What stands in a room. More than MANY lights are one chandelier, and more than MANY
 * switches are in its chest, which a room with scenes of its own has too: each opens the
 * room's whole list, where everything has its name. */
function items(room: Room): Item[] {
  const lights = room.devices.filter((d) => d.kind === "light"), levers = room.devices.filter((d) => d.kind === "switch");
  const crowd = new Set([...(lights.length > MANY ? lights : []), ...(levers.length > MANY ? levers : [])]);
  return [
    ...room.devices.filter((d) => !crowd.has(d)).map((d) => ({ id: d.id, shape: shape(d) })),
    ...(lights.length > MANY ? [{ id: LAMPS + room.id, shape: "lamp" as const }] : []),
    ...(levers.length > MANY || room.scenes.length ? [{ id: CHEST + room.id, shape: "block" as const }] : []),
  ];
}
const count = (list: Item[]) => list.reduce((n, i) => ({ ...n, [i.shape]: n[i.shape] + 1 }), { lamp: 0, window: 0, door: 0, block: 0, picture: 0 });
/** How many blocks of a wall the windows and the pictures take between them. */
const hung = (n: ReturnType<typeof count>) => n.window + PICTURE * n.picture;

/** How wide a room must be for what is in it. The lamps are two deep under the ceiling
 * beside the windows and the pictures, clear of the doors; the blocks and the doors share the floor. */
function wide(room: Room) {
  const n = count(items(room));
  return Math.max(MIN, hung(n) + Math.ceil(n.lamp / 2) + n.door, n.block + n.door);
}
/** How wide a storey's rooms are with the walls between them. */
const across = (storey: Room[]) => storey.reduce((sum, r) => sum + wide(r) + 1, -1);

/** Rooms that are on no floor, wrapped into storeys of about the same width so that they
 * are a building and not one endless row. */
function wrapped(rooms: Room[]): Room[][] {
  if (!rooms.length) return [];
  const total = across(rooms);
  const n = Math.max(1, Math.min(STOREYS, Math.ceil(total / WRAP)));
  const storeys: Room[][] = [[]];
  for (const room of rooms) {
    if (storeys.length < n && storeys.at(-1)!.length && across(storeys.at(-1)!) >= total / n - MIN) storeys.push([]);
    storeys.at(-1)!.push(room);
  }
  return storeys;
}

/** The world for these rooms. `forecast`: room is kept in the garden for the forecast's signs. */
export function build(rooms: Room[], forecast = false): World {
  const outdoor = rooms.filter((r) => OUTDOORS.test(r.name));
  const indoor = rooms.filter((r) => !outdoor.includes(r));
  // The house is a storey for each floor, in the house's order: the survey has the lowest
  // first unless the house's settings say otherwise. A room on no floor that is an
  // outbuilding by its name is a building of its own; the rest of those are one building.
  const floors = [...new Set(indoor.flatMap((r) => (r.floor ? [r.floor] : [])))];
  const loose = indoor.filter((r) => !r.floor);
  const buildings = [floors.map((f) => indoor.filter((r) => r.floor === f)), wrapped(loose.filter((r) => !OUTBUILDING.test(r.name))), ...loose.filter((r) => OUTBUILDING.test(r.name)).map((r) => [[r]])].filter((b) => b.length);
  // Each storey is at least as wide as any over it, so that none hangs in the air.
  const spans = buildings.map((b) => b.map((_, s) => Math.max(...b.slice(s).map(across))));

  // Down: a house of three storeys has one row of sky and no more roof than covers it, so
  // that its blocks can be bigger. The earth is always three rows: the tip, the map and
  // the scenes lie over it, clear of the ground floor.
  const high = Math.max(1, ...buildings.map((b) => b.length));
  const tall = high >= 3;
  const h = 4 * high + (tall ? 1 : 5) + EARTH;
  const ground = h - EARTH;

  // Across: the pond, the tree, the signpost, the notice, the forecast, each place out of doors, each building.
  const plots = outdoor.map((room) => ({ room, list: items(room), n: count(items(room)) })).map((p) => ({ ...p, w: Math.max(PLOT, Math.ceil(p.n.lamp / 2) + hung(p.n) + p.n.door + p.n.block) }));
  const first = 12 + (forecast ? SIGNS + 1 : 0);
  const garden = plots.reduce((x, p) => x + p.w + 1, first);
  const w = spans.reduce((x, s) => x + s[0] + 4, garden);

  const blocks: World["blocks"] = Array.from({ length: h }, () => Array(w).fill(null));
  const put = (x0: number, y0: number, x1: number, y1: number, t: string | (() => string)) => {
    for (let y = Math.max(0, y0); y <= y1; y++) for (let x = x0; x <= x1; x++) blocks[y][x] = typeof t === "function" ? t() : t;
  };
  const world: World = { w, h, ground, blocks, deco: [], zones: [], plots: [], zone: [], slots: new Map(), sign: { x: 5, y: ground - 2 }, notice: { x: 8, y: ground - 2 }, signs: [] };
  const { deco, slots, zones } = world;
  const r = rng(3);

  // The earth, the pond and the tree.
  put(0, ground, w - 1, ground, "grass");
  put(0, ground + 1, w - 1, h - 1, () => (r() < 0.1 ? "ore" : r() < 0.35 ? "stone" : "dirt"));
  put(0, ground, 1, ground, "water");
  put(3, ground - 3, 3, ground - 1, "trunk");
  put(2, ground - 6, 4, ground - 4, "leaves");
  put(3, ground - 7, 3, ground - 7, "leaves");

  // The garden: the signpost, the notice and the forecast's signs on their posts, then each place out of doors.
  if (forecast) world.signs = Array.from({ length: SIGNS }, (_, i) => ({ x: 12 + i, y: ground - 2 }));
  for (const x of [5, 6, 8, 10, ...world.signs.map((s) => s.x)]) deco.push(["post", x, ground - 1]);
  let x = first;
  for (const { room, list, w: across } of plots) {
    world.plots.push({ id: room.id, name: room.name, x0: x, x1: x + across - 1, y: ground - 4 });
    // The lamps are two to a post; then whatever else there is, each on the ground.
    const lamps = list.filter((i) => i.shape === "lamp");
    lamps.forEach((lamp, i) => slots.set(lamp.id, { x: x + (i >> 1), y: ground - 2 - (i % 2), h: 1 }));
    for (let i = 0; i < lamps.length; i += 2) deco.push(["post", x + (i >> 1), ground - 1]);
    let at = x + Math.ceil(lamps.length / 2);
    for (const item of list.filter((i) => i.shape !== "lamp")) {
      // A picture out of doors is a board on a post.
      if (item.shape === "picture") deco.push(["post", at + 1, ground - 1]);
      slots.set(item.id, item.shape === "block" ? { x: at, y: ground - 1, h: 1 } : item.shape === "picture" ? { x: at, y: ground - 3, h: 2, w: PICTURE } : { x: at, y: ground - 2, h: 2 });
      at += item.shape === "picture" ? PICTURE : 1;
    }
    x += across + 1;
  }

  const footings: [number, number][] = [];
  buildings.forEach((storeys, b) => {
    // A building's shell: planks on a stone footing, each storey as wide as its rooms, a
    // beam under each upper storey and a roof over whatever has nothing above it.
    const x0 = x + 1, span = spans[b];
    const right = (s: number) => x0 + span[s] + 1; // a storey's outer wall
    const top = (s: number) => ground - 4 * (s + 1); // the row over a storey's rooms
    footings.push([x0, right(0)]);
    put(x0, ground, right(0), ground, "stone");
    storeys.forEach((_, s) => {
      put(x0, top(s), right(s), top(s) + TALL, "plank");
      put(x0, top(s), right(s), top(s), "roof");
      if (s) put(x0, top(s - 1), right(s), top(s - 1), "beam");
    });
    if (!tall) {
      const s = storeys.length - 1;
      for (let i = 1; i < 3; i++) if (x0 + 2 * i <= right(s) - 2 * i) put(x0 + 2 * i, top(s) - i, right(s) - 2 * i, top(s) - i, "roof");
      if (span[s] > 10) put(right(s) - 5, top(s) - 3, right(s) - 5, top(s) - 3, "brick");
    }

    storeys.forEach((storey, s) => {
      const y0 = top(s) + 1, y1 = y0 + TALL - 1;
      let at = x0 + 1;
      storey.forEach((room, i) => {
        // The last room of a storey has what is left of the storey's width.
        const last = i === storey.length - 1;
        const zone: Zone = { id: room.id, name: room.name, x0: at, y0, x1: last ? right(s) - 1 : at + wide(room) - 1, y1, storey: s };
        zones.push(zone);
        put(zone.x0, y0, zone.x1, y1, "wall");
        if (!last) put(zone.x1 + 1, y0 + 1, zone.x1 + 1, y1, "wall"); // the doorway to the next room

        // The windows and the pictures from the left, the doors from the right, and the lamps between them: along the ceiling, then under it.
        const list = items(room), n = count(list);
        const lamps = zone.x1 - zone.x0 + 1 - hung(n) - n.door;
        let window = zone.x0, lamp = 0, door = zone.x1, floor = zone.x0;
        const by: Record<Shape, () => Slot> = {
          window: () => ({ x: window++, y: y0, h: 2 }),
          picture: () => ({ x: (window += PICTURE) - PICTURE, y: y0, h: 2, w: PICTURE }),
          lamp: () => ({ x: zone.x0 + hung(n) + (lamp % lamps), y: y0 + Math.floor(lamp++ / lamps), h: 1 }),
          door: () => ({ x: door--, y: y0 + 1, h: 2 }),
          block: () => ({ x: floor++, y: y1, h: 1 }),
        };
        for (const item of list) slots.set(item.id, by[item.shape]());
        at = zone.x1 + 2;
      });
      // A ladder up to this storey, through a hole in its beam.
      if (s) {
        put(right(s) - 1, y1 + 1, right(s) - 1, y1 + 1, "wall");
        for (let y = y1 + 1; y <= y1 + 1 + TALL; y++) deco.push(["ladder", right(s) - 1, y]);
      }
    });
    x = right(0) + 2;
  });

  const inZone = (cx: number, cy: number) => zones.find((z) => cx >= z.x0 && cx <= z.x1 && cy >= z.y0 && cy <= z.y1)?.id;
  world.zone = blocks.map((row, cy) => row.map((_, cx) => inZone(cx, cy) ?? (cy < ground && footings.some(([a, b]) => cx >= a && cx <= b) ? "struct" : "out")));
  return world;
}

/** A world of one room cut down to that room, in blocks: its walls, the roof that has its
 * name on, and the earth under it. A place out of doors is cut the same way round its plot.
 * Nothing if the world has no room. For a room's card (room.ts). */
export function cutout(world: World): { x: number; y: number; w: number; h: number } | undefined {
  const spot = world.zones[0] ?? world.plots[0];
  return spot && { x: spot.x0 - 1, y: world.ground - 4, w: spot.x1 - spot.x0 + 3, h: world.h - world.ground + 4 };
}

/** How dark each block is, from 0 (lit) to 0.8, by row; -1 where there is no block and the
 * open sky shows. `day` is how much daylight there is, from 0 to 1. A lamp lights its own
 * room and the building's walls round it, never the room next door; a dimmed lamp is
 * dimmer, and a chandelier as bright as the share of its lights that are on; and a room
 * with its blind open takes the daylight. */
export function shades(world: World, rooms: Room[], day: number): number[][] {
  const lit = (d: Device) => d.kind === "light" && d.on && !d.away;
  const lamps = rooms.flatMap((room) => {
    const lights = room.devices.filter((d) => d.kind === "light");
    const all = world.slots.get(LAMPS + room.id);
    const each = all ? (lights.some(lit) ? [{ at: all, k: 0.6 + (0.4 * lights.filter(lit).length) / lights.length }] : []) : lights.filter(lit).flatMap((d) => (world.slots.has(d.id) ? [{ at: world.slots.get(d.id)!, k: 0.6 + (0.4 * (d.level ?? 100)) / 100 }] : []));
    return each.map(({ at, k }) => ({ ...at, k, zone: world.zone[at.y][at.x] }));
  });
  const filled = world.blocks.map((row) => row.map(Boolean));
  // A post is mostly sky: darkened as a block, it had a square of darker sky round it.
  for (const [t, x, y] of world.deco) if (t !== "post") filled[y][x] = true;
  for (const { x, y, h, w = 1 } of world.slots.values()) for (let i = 0; i < h; i++) for (let k = 0; k < w; k++) filled[y + i][x + k] = true;
  const boards = [world.sign, { ...world.sign, x: world.sign.x + 1 }, ...[0, 1, 2].map((i) => ({ ...world.notice, x: world.notice.x + i })), ...world.signs];
  for (const { x, y } of boards) filled[y][x] = true;
  // How far open each room's blinds are, by the room's id: the most open of them.
  const open = new Map(rooms.map((r) => [r.id, Math.max(0, ...r.devices.filter((d) => d.kind === "cover" && !d.guarded && d.on && !d.away).map((d) => d.level ?? 100))]));

  return world.zone.map((row, y) =>
    row.map((z, x) => {
      if (!filled[y][x]) return -1;
      let v = z === "out" ? Math.max(0.15, day) : z === "struct" ? Math.max(0.3, day) : 0.15 + 0.45 * day + (0.3 * day * (open.get(z) ?? 0)) / 100;
      for (const l of lamps) if (z === l.zone || z === "struct") v = Math.max(v, l.k * (1 - Math.hypot(x - l.x, y - l.y) / (l.zone === "out" ? 4 : 6)));
      return (1 - Math.min(1, v)) * 0.8;
    }),
  );
}
