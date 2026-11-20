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
const { dots, grid, screens, splits, zoom } = await import("./aurora/pages.ts");

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
  const all = screens(house, 1100, 830); // at most 5 cells by 4
  assert.equal(all[0].name, "Home");
  assert.deepEqual(all[0].tiles.map((t) => t.id), ["hero", "alerts", "scenes", "energy", "climate", "split:Basement", "split:Ground", "split:First"]);
  assert.deepEqual(all.flatMap((s) => s.tiles).filter((t) => t.id.startsWith("room:")).map((t) => t.id.slice(5)), house.rooms.map((r: any) => r.id));
  for (const screen of all) assert.ok(cover(screen.tiles, screen.cols, screen.rows).every((times) => times === 1), screen.name);
  // A set too big for a screen has several, numbered.
  const first = all.filter((s) => s.splits.includes("First"));
  assert.ok(first.length > 1);
  assert.deepEqual(first.map((s) => [s.part, s.parts]), first.map((_, i) => [i, first.length]));
  // A house with no scenes, power sensor or thermostat has none of their tiles.
  assert.deepEqual(screens(found([room("a", undefined, 1)]), 900, 700)[0].tiles.map((t) => t.id), ["hero", "alerts", "split:Rooms"]);
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
  const all = screens(house, 1300, 690); // at most 6 cells by 3
  assert.deepEqual(all.map((s) => s.name), ["Home", "Ground"]);
  assert.ok(cover(all[1].tiles, all[1].cols, all[1].rows).every((times) => times === 1));
  // Four rooms on the same screen are as big as they like, and grow.
  assert.ok(screens(found([room("a", "G", 9), room("b", "G", 1)]), 1300, 690)[1].tiles.every((t) => t.w * t.h > 1));

  assert.equal(holds(200, 180, 1), 0); // one cell is not tall enough for a fader
  assert.equal(holds(640, 455, 6), 250); // three cells by two, on a tablet: a row of six, as tall as on a sheet
  assert.equal(holds(640, 455, 7), 173); // a seventh makes two rows of shorter ones
  assert.equal(holds(410, 455, 7), 173); // the test VM's kitchen: two rows of four
  assert.equal(holds(410, 455, 9), 0); // three rows would be too short to use
  assert.equal(holds(178, 559, 2), 225); // a phone's tall tile: two, one above the other
  assert.equal(holds(420, 420, 0), 0); // nothing to hold
});

test("a big window has a grid for what is on the screen, not as many cells as it could hold", () => {
  // A Mac's window could hold 8 cells by 6. The owner's verdict on seven tiles sharing those 48 (2026-11-16): "soo bad".
  const house = found([room("gym", "Basement", 1), room("sauna", "Basement", 1), room("hall", "Ground", 5, "climate.hall"), room("kitchen", "Ground", 9), room("bed", "First", 2)], { scenes: [{}] });
  const all = screens(house, 2304, 1300);
  for (const screen of all) {
    const asked = screen.tiles.length; // each tile asked for a cell at the least
    assert.ok(screen.cols * screen.rows <= asked * 4, `${screen.name}: ${screen.cols} by ${screen.rows} for ${asked} tiles`);
    assert.ok(cover(screen.tiles, screen.cols, screen.rows).every((times) => times === 1), screen.name);
  }
  // Sets that fit one screen together share it, and it is named for all of them: the two rooms of the basement have no screen to themselves.
  assert.deepEqual(all.map((s) => [s.name, s.splits]), [["Home", []], ["Rooms", ["Basement", "Ground", "First"]]]);
  // A phone's screen has not the room for them all: the first two sets share one, at a row a room, and the third has its own.
  assert.deepEqual(screens(house, 390, 844).filter((s) => s.splits.length).map((s) => s.splits), [["Basement", "Ground"], ["First"]]);
});

test("a tile's contents are enlarged with its cell, within limits", () => {
  assert.equal(zoom(200, 175), 1); // never made smaller
  assert.equal(zoom(450, 300), 1.2); // by the tighter of the two ways
  assert.equal(zoom(900, 900), 1.6); // and no more than this
});

// ---------- cameras ----------
test("a camera's picture is what it saw lately, else its still with when it came, and a failure is said", async () => {
  const { shot } = await import("./aurora/cameras.ts");
  const cam: any = { id: "camera.drive", name: "Drive", kind: "camera", away: false, picture: "/still?token=a" };
  const at = new Date(2026, 10, 16, 21, 5).getTime();
  const none = new Map<string, any>();
  // A still says nothing until it has come, then when it came: it is no live picture.
  assert.deepEqual(shot(cam, none, new Map(), new Set()), { d: cam, src: "/still?token=a", says: "", at: 0 });
  assert.equal(shot(cam, none, new Map([["/still?token=a", at]]), new Set()).says, "as at 21:05");
  // What it saw lately comes before its still, with its photograph if it has one.
  const saw = new Map([["camera.drive", { id: "1", camera: "camera.drive", name: "Drive", kind: "person", at, photo: "/photo/1" }]]);
  assert.deepEqual(shot(cam, saw, new Map(), new Set()), { d: cam, src: "/photo/1", says: "person 21:05", at });
  // A picture that could not be fetched is not shown, and that is said. A camera that is away shows none.
  assert.deepEqual(shot(cam, none, new Map(), new Set(["/still?token=a"])), { d: cam, src: "", says: "its picture could not be fetched", at: 0 });
  assert.deepEqual(shot({ ...cam, away: true }, saw, new Map(), new Set()), { d: { ...cam, away: true }, src: "", says: "not answering", at: 0 });
  assert.equal(shot({ ...cam, picture: undefined }, none, new Map(), new Set()).says, "no picture");
});

test("a house with a camera has a tile of them on its home screen, and the camera's room a tile with room for its picture", () => {
  const drive = { ...room("drive", "Ground", 1), devices: [{ kind: "camera" }] };
  const all = screens(found([drive, room("hall", "Ground", 1)]), 1300, 690);
  assert.ok(all[0].tiles.some((t) => t.id === "cameras"));
  const tile = all[1].tiles.find((t) => t.id === "room:drive")!;
  assert.ok(tile.w >= 2 && tile.h >= 2);
  assert.ok(!screens(found([room("hall", "Ground", 1)]), 1300, 690)[0].tiles.some((t) => t.id === "cameras"));
});

// ---------- skins ----------
test("a skin is its sky's colours as custom properties, and each has a name and an id of its own", async () => {
  const { SKINS, paint, skinned, swatch } = await import("./aurora/skins.ts");
  assert.deepEqual(SKINS.map((s) => s.id), ["aurora", "ember", "verdant", "cobalt", "rose", "acid", "alloy"]);
  assert.equal(new Set(SKINS.map((s) => s.name)).size, SKINS.length);
  // The first is what the stylesheet has for an element with no skin yet (styles.ts): the two must agree.
  assert.equal(paint(SKINS[0]), "--h1: 265; --m1: -60; --h2: 190; --m2: -120; --h3: 330; --m3: 50; --hw: 85; --strength: 1");
  assert.equal(skinned("cobalt")?.name, "Cobalt");
  assert.equal(skinned("no such skin"), undefined);
  assert.match(swatch(skinned("alloy")!), /^background: conic-gradient\(oklch\(\.72 0\.034 240\)/);
  for (const s of SKINS) assert.ok(s.rooms.length > 0 && s.strength > 0, s.id);
});

test("each season's skin has its decorations, and every drawing one names is drawn", async () => {
  const { SEASONAL, SKINS } = await import("./aurora/skins.ts");
  const { DECORS } = await import("./aurora/seasons.ts");
  const { FEET, GLYPHS, HEROES, MACHINES } = await import("./aurora/art.ts");
  const { MOVES } = await import("./aurora/drift.ts");
  assert.deepEqual(SEASONAL.map((s) => s.id).sort(), Object.keys(DECORS).sort());
  // The skins of the night bring their own dark page.
  assert.deepEqual([...SKINS, ...SEASONAL].filter((s) => s.dark).map((s) => s.id), ["fireworks", "halloween"]);
  assert.ok(SKINS.every((s) => !DECORS[s.id])); // a skin of colours has none
  for (const [id, decor] of Object.entries(DECORS)) {
    assert.ok(!decor.drift || GLYPHS[decor.drift.glyph], id);
    assert.ok(!MOVES[decor.drift?.glyph ?? ""]?.tidy || MACHINES[MOVES[decor.drift!.glyph].tidy!], id);
    assert.ok(!decor.foot || FEET[decor.foot], id);
    assert.ok(!decor.hero || HEROES[decor.hero], id);
  }
});

test("what drifts flutters and lands on a ledge, becomes a heap, falls off a shaken ledge, and a machine comes to tidy it away", async () => {
  const { GROUND, MOVES, PILE, begin, fit, outline, shake, step } = await import("./aurora/drift.ts");
  type Field = ReturnType<typeof begin>;
  const FRAME = 1 / 30;
  const run = (f: Field, seconds: number, until: (f: Field) => boolean = () => false) => {
    for (let i = 0; i < seconds / FRAME && !until(f); i++) step(f, FRAME);
    return f;
  };
  const lying = (f: Field, on?: string) => f.motes.filter((m) => m.state === "down" && (!on || m.on === on));
  const heaped = (f: Field, id: string) => f.ledges.find((l) => l.id === id)!.heap.reduce((sum, deep) => sum + deep, 0);
  const TILE = { id: "tile", from: 300, to: 700, top: 400 };
  const BAR = { id: "bar", from: 200, to: 800, top: 730 };

  // A leaf goes from side to side as it comes down.
  const one = begin(MOVES.leaf, 1, 1000, 800, 7);
  const leaf = one.motes[0];
  leaf.y = 0;
  let [turns, was] = [0, 0];
  run(one, 5, () => {
    if (leaf.vx * was < 0) turns++;
    was = leaf.vx || was;
    return false;
  });
  assert.ok(turns >= 3, `it turned ${turns} times`);
  assert.ok(leaf.y > 100);

  // Not all go the way the wind does, and they come down at different speeds.
  const many = begin(MOVES.flake, 26, 1000, 800, 7);
  assert.ok(many.motes.some((m) => m.blow < -0.3) && many.motes.some((m) => m.blow > 0.3));
  assert.ok(Math.max(...many.motes.slice(0, 26).map((m) => m.pace)) > 1.5 * Math.min(...many.motes.slice(0, 26).map((m) => m.pace)));

  // Leaves come down on a tile, the bar and the ground, lie there, and become a heap: never many lying about.
  const leaves = begin(MOVES.leaf, 16, 1000, 800, 7);
  fit(leaves, 1000, 800, [TILE, BAR]);
  let most = 0;
  run(leaves, 200, (f) => ((most = Math.max(most, lying(f).length)), false));
  assert.ok(most > 0 && most <= PILE, `${most} lay about at once`);
  for (const id of ["tile", "bar", GROUND]) assert.ok(heaped(leaves, id) > 0, id);
  assert.ok(leaves.ledges.every((l) => l.heap.every((deep) => deep <= 12)));
  assert.ok(lying(leaves, "tile").every((m) => m.x >= 300 && m.x <= 700 && m.y < 400));
  assert.equal(leaves.motes.filter((m) => m.state === "air").length, 16); // and as many are in the air as ever
  assert.match(outline(leaves.ledges[0]), /^M300\.0 400Q.*700\.0 400Z$/);
  assert.equal(outline({ ...TILE, heap: [0, 0] }), "");
  leaves.changed.clear();

  // A ledge that only moves keeps its heap. One that is shaken drops it: more are in the air for a while, and then as many as ever.
  const had = heaped(leaves, "tile");
  fit(leaves, 1000, 800, [{ ...TILE, top: 380 }, BAR]);
  assert.equal(heaped(leaves, "tile"), had);
  shake(leaves, "tile");
  assert.equal(heaped(leaves, "tile") + lying(leaves, "tile").length, 0);
  assert.ok(leaves.changed.has("tile"));
  assert.ok(leaves.motes.filter((m) => m.state === "air").length > 16);
  assert.equal(run(leaves, 40).motes.filter((m) => m.state === "air").length, 16);
  // One that is gone drops it too, and nothing is left lying on it.
  fit(leaves, 1000, 800, [BAR]);
  assert.deepEqual([leaves.ledges.map((l) => l.id), lying(leaves, "tile").length], [["bar", GROUND], 0]);

  // The robot comes in its own time, flies to each ledge and drives along it, and leaves next to nothing.
  assert.equal(leaves.tidy, undefined);
  run(leaves, 500, (f) => !!f.tidy);
  assert.deepEqual(leaves.tidy?.route, ["bar", GROUND]);
  let [flew, drove] = [false, false];
  run(leaves, 60, (f) => ((flew ||= !!f.tidy && !f.tidy.driving), (drove ||= !!f.tidy?.driving), !f.tidy));
  assert.deepEqual([leaves.tidy, flew, drove], [undefined, true, true]);
  assert.ok(heaped(leaves, "bar") + heaped(leaves, GROUND) < 30, `${heaped(leaves, "bar")} and ${heaped(leaves, GROUND)} are left`);
  assert.ok(leaves.since < 1);

  // The blower throws the snow up.
  const snow = begin(MOVES.flake, 26, 1000, 800, 3);
  fit(snow, 1000, 800, [TILE, BAR]);
  run(snow, 600, (f) => !!f.tidy);
  let thrown = 0;
  run(snow, 60, (f) => ((thrown = Math.max(thrown, f.motes.filter((m) => m.state === "thrown").length)), !f.tidy));
  assert.ok(thrown > 0);
  assert.equal(snow.tidy, undefined);

  // The wind does not keep time: the gaps between its changes of side are all different lengths.
  const gaps = new Set<string>();
  let [side, at, now] = [1, 0, 0];
  run(begin(MOVES.leaf, 1, 1000, 800), 300, (f) => {
    now += FRAME;
    if (f.air[0] * side < 0) [side, at] = [-side, (gaps.add((now - at).toFixed(1)), now)];
    return false;
  });
  assert.ok(gaps.size >= 8, `${gaps.size} lengths of gap`);

  // Hearts rise and bats cross, and neither lands. Nothing ever leaves the numbers, and the same start has the same end.
  for (const glyph of ["heart", "bat", "gull", "petal"]) {
    const f = run(begin(MOVES[glyph], 8, 1000, 800, 5), 120);
    assert.ok(f.motes.every((m) => [m.x, m.y, m.a, m.w].every(Number.isFinite)), glyph);
    if (!MOVES[glyph].tidy) assert.ok(f.motes.length === 8 && f.motes.every((m) => m.state === "air"), glyph);
    if (MOVES[glyph].how === "cross") assert.ok(f.motes.every((m) => m.y >= 32 && m.y <= 560), glyph);
    assert.deepEqual(run(begin(MOVES[glyph], 8, 1000, 800, 5), 120).motes, f.motes, glyph);
  }
});

test("the Almanac wears a holiday's skin on its days, else the season's, the other way round in the south", async () => {
  const { almanac, easter } = await import("./aurora/seasons.ts");
  const on = (month: number, day: number, year = 2026) => new Date(year, month - 1, day, 12);
  assert.deepEqual([easter(2026), easter(2027), easter(2038)], [[4, 5], [3, 28], [4, 25]]);
  // The seasons, by the month.
  assert.deepEqual([on(1, 20), on(3, 1), on(5, 31), on(6, 1), on(9, 1), on(11, 30), on(12, 28)].map((d) => almanac(d)), ["snow", "spring", "spring", "summer", "autumn", "autumn", "snow"]);
  assert.deepEqual([on(1, 20), on(7, 10)].map((d) => almanac(d, true)), ["summer", "snow"]);
  // The holidays. Easter is from Good Friday to Easter Monday.
  assert.deepEqual([on(12, 1), on(12, 26), on(12, 27), on(12, 31), on(1, 1), on(2, 14), on(10, 25), on(10, 31)].map((d) => almanac(d)), ["christmas", "christmas", "snow", "fireworks", "fireworks", "valentine", "halloween", "halloween"]);
  assert.deepEqual([on(4, 2), on(4, 3), on(4, 5), on(4, 6), on(4, 7)].map((d) => almanac(d)), ["spring", "easter", "easter", "easter", "spring"]);
  // A day kept in one country is that country's alone.
  assert.deepEqual([almanac(on(11, 5), false, "GB"), almanac(on(11, 5), false, "FR"), almanac(on(7, 4), false, "US"), almanac(on(7, 4), false, "GB")], ["fireworks", "autumn", "fireworks", "summer"]);
});
