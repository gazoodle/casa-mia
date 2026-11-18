import assert from "node:assert/strict";
import { test } from "node:test";
import { CHEST, LAMPS, MANY, build, rng, shades } from "./digs/world.ts";

const device = (kind: string, name: string, on = false, extra = {}) => ({ id: `${kind}.${name}`, name, kind, on, dims: false, span: { min: 0, max: 100, step: 1, vote: 10 }, away: false, since: 0, guarded: kind === "lock", room: "", ...extra });
const room = (id: string, floor: string | undefined, devices: any[]) => ({ id, name: id[0].toUpperCase() + id.slice(1), floor, devices, scenes: [] });
const house = (lit = false): any[] => [
  room("kitchen", "Ground", [device("light", "k1", lit), device("light", "k2"), device("cover", "blind"), device("switch", "kettle"), device("climate", "stat")]),
  room("hall", "Ground", [device("light", "h1"), device("lock", "front", true), device("cover", "garage", false, { guarded: true }), device("camera", "entrance")]),
  room("study", "First", [device("light", "s1"), device("media_player", "radio")]),
  room("garden", undefined, [device("light", "path"), device("switch", "pump"), device("camera", "lawn")]),
];

test("every device has a block of its own, inside its room", () => {
  const world = build(house(), true);
  const taken = new Set<string>();
  for (const r of house()) {
    const zone = world.zones.find((z) => z.id === r.id);
    for (const d of r.devices) {
      const at = world.slots.get(d.id)!;
      assert.ok(at, d.id);
      for (let i = 0; i < at.h; i++)
        for (let k = 0; k < (at.w ?? 1); k++) {
          const cell = `${at.x + k},${at.y + i}`;
          assert.ok(!taken.has(cell), `${d.id} shares ${cell}`);
          taken.add(cell);
          if (zone) assert.ok(at.x + k >= zone.x0 && at.x + k <= zone.x1 && at.y + i >= zone.y0 && at.y + i <= zone.y1, `${d.id} is outside ${r.id}`);
        }
    }
  }
  // The garden is no room of the house: its things stand left of the house, on the ground.
  assert.equal(world.zones.length, 3);
  assert.ok(world.slots.get("switch.pump")!.x < Math.min(...world.zones.map((z) => z.x0)));
  assert.equal(world.slots.get("switch.pump")!.y, world.ground - 1);
  // Two storeys, the first floor over the ground floor, and a sign for each day of the forecast.
  assert.ok(world.zones.find((z) => z.id === "study")!.y1 < world.zones.find((z) => z.id === "kitchen")!.y0);
  // A camera is a picture three blocks wide and two tall: on the wall indoors, on a post out of doors.
  assert.deepEqual([world.slots.get("camera.entrance")!.w, world.slots.get("camera.entrance")!.h, world.slots.get("camera.lawn")!.w], [3, 2, 3]);
  assert.equal(world.signs.length, 4);
  assert.equal(build(house()).signs.length, 0);
});

test("nothing moves because a light was switched", () => {
  assert.deepEqual(build(house(true)), build(house(false)));
});

test("a house of more rooms is wider, and a house of none is only its garden", () => {
  const more = [...house(), room("lounge", "Ground", [device("light", "l1")]), room("snug", "Ground", [device("light", "n1")])];
  assert.ok(build(more).w > build(house()).w);
  const none = build([]);
  assert.equal(none.zones.length, 0);
  assert.ok(none.blocks[none.ground].every((b) => b === "grass" || b === "water"));
});

test("a lamp lights its own room and not the room next door", () => {
  const world = build(house());
  const [kitchen, hall] = ["kitchen", "hall"].map((id) => world.zones.find((z) => z.id === id)!);
  const dark = shades(world, house(false), 0);
  const lit = shades(world, house(true), 0);
  assert.ok(lit[kitchen.y1][kitchen.x0] < dark[kitchen.y1][kitchen.x0]);
  assert.equal(lit[hall.y1][hall.x0], dark[hall.y1][hall.x0]);
  // The open sky is not shaded at all, and by day nothing out of doors is dark.
  assert.equal(dark[0][0], -1);
  assert.equal(shades(world, house(), 1)[world.ground][0], 0);
});

test("a room with too many lights has one chandelier for them all, which lights the room", () => {
  const lights = (lit: number) => Array.from({ length: MANY + 4 }, (_, i) => device("light", `c${i}`, i < lit));
  const rooms = (lit: number): any[] => [room("kitchen", "Ground", lights(lit)), room("hall", "Ground", [device("light", "h1")])];
  const world = build(rooms(0));
  const kitchen = world.zones.find((z) => z.id === "kitchen")!;
  assert.ok(world.slots.has(LAMPS + "kitchen"));
  assert.ok(!world.slots.has("light.c0"), "its lights are in its list, not on its ceiling");
  assert.equal(kitchen.x1 - kitchen.x0 + 1, 4, "and it is no wider for them");
  const [dark, some, all] = [0, 3, MANY + 4].map((lit) => shades(world, rooms(lit), 0)[kitchen.y1][kitchen.x0]);
  assert.ok(all < some && some < dark);
  // MANY lights are still a lamp each, two deep.
  const eight = build([room("den", "Ground", Array.from({ length: MANY }, (_, i) => device("light", `d${i}`)))]);
  assert.ok(!eight.slots.has(LAMPS + "den"));
  assert.equal(new Set([...eight.slots.values()].map((s) => s.y)).size, 2);
  assert.equal(new Set([...eight.slots.values()].map((s) => s.x)).size, 4);
});

test("a room with scenes of its own, or too many switches, has a chest", () => {
  const scened = { ...room("snug", "Ground", [device("light", "s1")]), scenes: [{ id: "scene.snug_film", name: "Film", full: "Snug Film", at: 0 }] };
  const switched = room("plant", "Ground", Array.from({ length: MANY + 1 }, (_, i) => device("switch", `p${i}`)));
  const world = build([scened, switched, room("hall", "Ground", [device("switch", "one")])] as any[]);
  assert.ok(world.slots.has(CHEST + "snug") && world.slots.has(CHEST + "plant") && !world.slots.has(CHEST + "hall"));
  assert.ok(!world.slots.has("switch.p0") && world.slots.has("switch.one"));
});

test("rooms on no floor are a building of a few storeys, an outbuilding stands by itself, and no storey hangs in the air", () => {
  const loose = Array.from({ length: 30 }, (_, i) => room(`room${i}`, undefined, [device("light", `l${i}`), device("switch", `s${i}`)]));
  const world = build([room("kitchen", "Ground", [device("light", "k")]), room("attic", "First", [device("light", "a")]), ...loose, room("garage", undefined, [device("light", "g")])] as any[]);
  const of = (id: string) => world.zones.find((z) => z.id === id)!;
  assert.equal(Math.max(...world.zones.filter((z) => z.id.startsWith("room")).map((z) => z.storey)), 2, "three storeys of them, not one row of thirty");
  assert.equal(of("garage").storey, 0);
  assert.ok(of("garage").x0 > Math.max(...world.zones.filter((z) => z.id !== "garage").map((z) => z.x1)), "the garage is past every other building");
  for (const z of world.zones) for (let x = z.x0; x <= z.x1; x++) assert.ok(world.blocks[z.y1 + 1][x], `${z.id} has a floor under it at ${x}`);
  // Three storeys leave less sky and roof, so that the blocks can be bigger on the same screen.
  assert.equal(world.h, 16);
  assert.equal(build([room("kitchen", "Ground", [])] as any[]).h, 12);
});

test("the imp's crate stands where nothing else is, on what is on the screen, and breaks no device's block", async () => {
  // prank.ts draws with lit, which this test has no page for: only its planning is asked of it.
  const { plan } = await import("./digs/prank.ts");
  const world = build(house(), true);
  const kitchen = world.zones.find((z) => z.id === "kitchen")!;
  const taken = new Set([...world.slots.values()].flatMap((s) => Array.from({ length: s.h * (s.w ?? 1) }, (_, i) => `${s.x + (i % (s.w ?? 1))},${s.y + Math.floor(i / (s.w ?? 1))}`)));
  for (let seed = 1; seed < 200; seed++) {
    const p = plan(world, kitchen.x0, kitchen.x1, rng(seed))!;
    // The study is over the kitchen: it is on one floor or the other, in a room.
    const room = world.zones.find((z) => p.tnt.x >= z.x0 && p.tnt.x <= z.x1 && p.tnt.y === z.y1)!;
    assert.ok(room && p.tnt.x >= kitchen.x0 && p.tnt.x <= kitchen.x1, "on a room's floor, in the columns on the screen");
    assert.ok(p.imp.x >= room.x0 && p.imp.x <= room.x1 && p.imp.y === p.tnt.y && p.imp.x !== p.tnt.x, "the imp stays in the room, clear of its crate");
    assert.ok(p.holes.length > 0);
    for (const c of [p.tnt, ...p.holes]) assert.ok(!taken.has(`${c.x},${c.y}`), `a device's block at ${c.x},${c.y}`);
    for (const c of p.holes) assert.ok(world.blocks[c.y][c.x], "only a block can be broken");
  }
  // With nothing of the house on the screen it happens somewhere all the same, and a world with no house has its garden.
  assert.ok(plan(world, 900, 950, rng(1)));
  assert.ok(plan(build([]), 0, 10, rng(1))!.holes.length > 0);
});
