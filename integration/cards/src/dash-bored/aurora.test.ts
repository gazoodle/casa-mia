import assert from "node:assert/strict";
import { test } from "node:test";
import { glow, greeting, said, spark, thinned } from "./aurora/words.ts";

const light = (name: string, on: boolean, level?: number) => ({ id: `light.${name}`, name, kind: "light", on, level, dims: true, span: { min: 0, max: 100, step: 1, vote: 10 }, away: false, since: 0, guarded: false, room: "Hall" });
const text = (house: any) => said(house).map(([piece]) => piece).join("");

test("the sentence says only what the house knows, and joins it as a person would", () => {
  const house: any = { rooms: [{ id: "hall", name: "Hall", temp: 18.5, devices: [light("wall", true), light("porch", false)] }, { id: "study", name: "Study", temp: 21, devices: [light("desk", true)] }], strays: [], kw: 0.531 };
  assert.equal(text(house), "Two lights are on, the house is drawing 0.5 kW and the warmest room is Study at 21.0°.");
  assert.deepEqual(said(house).filter(([, strong]) => strong).map(([piece]) => piece), ["Two lights are on", "21.0°"]);

  // No power sensor, and one thermometer is nothing to compare.
  assert.equal(text({ rooms: [house.rooms[0]], strays: [] }), "One light is on.");
  assert.equal(text({ rooms: [house.rooms[0]], strays: [], kw: 2 }), "One light is on and the house is drawing 2.0 kW.");
  assert.equal(text({ rooms: [], strays: [] }), "No lights are on.");
});

test("the sky warms by how much light is on, not by how many lights", () => {
  assert.equal(glow([]), 0);
  assert.equal(glow([light("a", false, 80) as any]), 0);
  // A light that is on and tells no brightness is fully on.
  assert.equal(glow([light("a", true) as any, light("b", true, 50) as any]), 0.75);
});

test("the greeting follows the hour", () => {
  assert.deepEqual([0, 11, 12, 17, 18, 23].map(greeting), ["Good morning.", "Good morning.", "Good afternoon.", "Good afternoon.", "Good evening.", "Good evening."]);
});

test("the power's line runs across its box, and a quiet house draws a low one", () => {
  assert.equal(spark([[0, 1]], 0, 100), undefined);
  const drawn = spark([[0, 0.3], [50, 0.45], [100, 0.3]], 0, 100)!;
  assert.ok(drawn.line.startsWith("M0,") && drawn.line.includes(" L300,"));
  assert.ok(drawn.area.endsWith("L300,90 L0,90Z"));
  // 0.45 kW is half of the least the height stands for: the line stays in the lower half.
  for (const [, y] of drawn.line.matchAll(/,(\d+(?:\.\d+)?)/g)) assert.ok(Number(y) >= 45 && Number(y) <= 90, y);
  // A reading from before the hour began is drawn at its left edge, never off it.
  assert.ok(spark([[-500, 1], [100, 2]], 0, 100)!.line.startsWith("M0,"));
});

test("a sensor that reports every second gives the line a point every half minute", () => {
  const every = Array.from({ length: 120 }, (_, s): [number, number] => [s * 1000, s]);
  assert.deepEqual(thinned(every, 30_000).map(([at]) => at), [0, 30_000, 60_000, 90_000]);
  assert.deepEqual(thinned([], 30_000), []);
});

// ---------- the bento and its screens ----------
const { bento } = await import("./aurora/bento.ts");
const { dots, grid, screens, splits } = await import("./aurora/pages.ts");

/** How many tiles cover each cell of a screen. */
const cover = (placed: { col: number; row: number; w: number; h: number }[], cols: number, rows: number) => {
  const seen: number[] = new Array(cols * rows).fill(0);
  for (const p of placed) for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) seen[r * cols + c]++;
  return seen;
};

test("every cell of every screen is covered once, and the tiles keep their order", () => {
  const sizes = [[1, 1], [2, 1], [2, 2], [3, 2], [1, 2]];
  for (const [cols, rows] of [[2, 4], [3, 5], [5, 4], [8, 6]]) {
    for (let n = 1; n <= 40; n++) {
      const tiles = Array.from({ length: n }, (_, i) => ({ id: String(i), w: sizes[(i * 7 + n) % 5][0], h: sizes[(i * 7 + n) % 5][1] }));
      const made = bento(tiles, cols, rows);
      assert.deepEqual(made.flat().map((p) => p.id), tiles.map((t) => t.id), `${cols}x${rows} n=${n}`);
      for (const screen of made) assert.ok(cover(screen, cols, rows).every((times) => times === 1), `${cols}x${rows} n=${n}`);
    }
  }
  // The case that boxed a cell in before a screen could be laid out again one row tall.
  const boxed = [[2, 1], [1, 2], [1, 2], [2, 2], [1, 2], [1, 1], [2, 1], [1, 1], [1, 2]].map(([w, h], i) => ({ id: String(i), w, h }));
  for (const screen of bento(boxed, 3, 5)) assert.ok(cover(screen, 3, 5).every((times) => times === 1));
});

test("one tile fills a screen, and the last screen is not left with a single tile", () => {
  assert.deepEqual(bento([{ id: "a", w: 1, h: 1 }], 4, 3), [[{ id: "a", col: 0, row: 0, w: 4, h: 3 }]]);
  // 13 tiles of one cell on screens of 12: seven and six, not twelve and one.
  assert.deepEqual(bento(Array.from({ length: 13 }, (_, i) => ({ id: String(i), w: 1, h: 1 })), 4, 3).map((s) => s.length), [7, 6]);
});

const found = (rooms: any[], more = {}): any => ({ rooms, scenes: [], strays: [], people: [], sightings: [], gaps: [], watched: [], ...more });
const room = (id: string, floor: string | undefined, devices: number, climate?: string) => ({ id, name: id, floor, climate, devices: new Array(devices).fill({}), scenes: [] });

test("the house is split by floor today, and a house with no floors is one set", () => {
  const house = found([room("gym", "Basement", 1), room("hall", "Ground", 5), room("kitchen", "Ground", 9), room("garden", undefined, 2)]);
  assert.deepEqual(splits(house), [{ id: "Basement", name: "Basement", rooms: ["gym"] }, { id: "Ground", name: "Ground", rooms: ["hall", "kitchen"] }, { id: "Elsewhere", name: "Elsewhere", rooms: ["garden"] }]);
  assert.deepEqual(splits(found([room("a", undefined, 1), room("b", undefined, 1)])), [{ id: "Rooms", name: "Rooms", rooms: ["a", "b"] }]);
});

test("the home screen comes first with a tile for each set, and every room is on one screen", () => {
  const house = found([room("gym", "Basement", 1), room("hall", "Ground", 5, "climate.hall"), room("kitchen", "Ground", 9), ...Array.from({ length: 30 }, (_, i) => room(`r${i}`, "First", i % 11))], { power: "sensor.power", scenes: [{}] });
  const all = screens(house, 5, 4);
  assert.equal(all[0].name, "Home");
  assert.deepEqual(all[0].tiles.map((t) => t.id), ["hero", "alerts", "scenes", "energy", "climate", "split:Basement", "split:Ground", "split:First"]);
  assert.deepEqual(all.flatMap((s) => s.tiles).filter((t) => t.id.startsWith("room:")).map((t) => t.id.slice(5)), house.rooms.map((r: any) => r.id));
  for (const screen of all) assert.ok(cover(screen.tiles, 5, 4).every((times) => times === 1), screen.name);
  // A set too big for a screen has several, numbered.
  const first = all.filter((s) => s.split === "First");
  assert.ok(first.length > 1);
  assert.deepEqual(first.map((s) => [s.part, s.parts]), first.map((_, i) => [i, first.length]));
  // A house with no scenes, power sensor or thermostat has none of their tiles.
  assert.deepEqual(screens(found([room("a", undefined, 1)]), 4, 3)[0].tiles.map((t) => t.id), ["hero", "alerts", "split:Rooms"]);
});

test("a screen has at least two cells each way, and a bigger tile has room for more round buttons", () => {
  assert.deepEqual(grid(390, 844), [2, 4]);
  assert.deepEqual(grid(1084, 800), [5, 3]);
  assert.deepEqual(grid(200, 200), [2, 2]);
  assert.deepEqual([dots({ w: 1, h: 1 }), dots({ w: 2, h: 1 }), dots({ w: 2, h: 2 })], [3, 6, 18]);
});

test("a set of rooms takes no more screens than it must, and a big tile holds its room's controls", async () => {
  const { holds } = await import("./aurora/pages.ts");
  // 18 rooms that would each like two cells, on screens of 18: one screen, not two.
  const house = found(Array.from({ length: 18 }, (_, i) => room(`r${i}`, "Ground", 5)));
  const all = screens(house, 6, 3);
  assert.deepEqual(all.map((s) => s.name), ["Home", "Ground"]);
  assert.ok(cover(all[1].tiles, 6, 3).every((times) => times === 1));
  // Four rooms on the same screen are as big as they like, and grow.
  assert.ok(screens(found([room("a", "G", 9), room("b", "G", 1)]), 6, 3)[1].tiles.every((t) => t.w * t.h > 1));

  assert.equal(holds(200, 180, 1), 0); // one cell is not tall enough for a fader
  assert.equal(holds(640, 455, 6), 250); // three cells by two, on a tablet: a row of six, as tall as on a sheet
  assert.equal(holds(640, 455, 7), 173); // a seventh makes two rows of shorter ones
  assert.equal(holds(410, 455, 7), 173); // the test VM's kitchen: two rows of four
  assert.equal(holds(410, 455, 9), 0); // three rows would be too short to use
  assert.equal(holds(178, 559, 2), 225); // a phone's tall tile: two, one above the other
  assert.equal(holds(420, 420, 0), 0); // nothing to hold
});
