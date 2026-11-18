import assert from "node:assert/strict";
import { test } from "node:test";
import { round } from "./contraption/faults.ts";
import { chosen, facing, mul, posed, ringOf, type Mat, type Part } from "./contraption/kit.ts";
import { links, route } from "./contraption/layout.ts";
import { EDGE, edges, type Dev } from "./contraption/tile.ts";

const KINDS = ["light", "switch", "light", "cover", "light", "climate", "lock", "light"];
const dev = (i: number, more: Partial<Dev> = {}): Dev => ({ id: `${KINDS[i % KINDS.length]}.d${i}`, name: `Device ${i}`, kind: KINDS[i % KINDS.length], on: i % 2 === 0, level: 60, dims: i % 3 === 0, ...more });
/** A room of `n` devices; with `grouped`, three lights switched together in the middle of it. */
const room = (n: number, grouped = false) => [
  ...Array.from({ length: n }, (_, i) => dev(i)),
  ...(grouped ? ["north", "middle", "south"].map((where, k) => dev(100 + k, { id: `light.picture_${where}`, kind: "light", group: "Picture lights" })) : []),
  ...(grouped ? [dev(200)] : []),
];
const ROOMS = [1, 2, 3, 4, 5, 8, 13, 24].flatMap((n) => [room(n), room(n, true)]);

test("a way leads from each tile to one beside it that takes the duck, and every way in is fed", () => {
  for (const devices of ROOMS)
    for (const id of ["kitchen", "study", "a", "long gallery"]) {
      const way = route(id, devices), { next } = links(way);
      way.forEach((s, i) => next[i].forEach(({ to }) => assert.equal(Math.abs(way[to].col - s.col) + Math.abs(way[to].row - s.row), 1, `${id}, ${devices.length} devices: step ${i}`)));
      assert.ok(way.every((s) => s.col >= 0 && s.row >= 0));
    }
});

test("the ducks join by one hole and leave by one, and every tile is on the way between", () => {
  for (const devices of ROOMS) {
    const way = route("kitchen", devices), { io, next } = links(way);
    assert.equal(io.filter((e) => !e.ins).length, 1, "one hole to join by");
    assert.equal(io.filter((e) => !e.outs).length, 1, "one hole to leave by");
    const reached = new Set<number>(), todo = [io.findIndex((e) => !e.ins)];
    while (todo.length) {
      const i = todo.pop()!;
      if (!reached.has(i)) todo.push(...next[reached.add(i) && i].map(({ to }) => to));
    }
    assert.equal(reached.size, way.length, `${devices.length} devices: a tile no duck comes to`);
  }
});

test("every device has one tile, and no two devices' tiles follow one another but lights switched together", () => {
  for (const devices of ROOMS) {
    const way = route("kitchen", devices), { next } = links(way);
    assert.deepEqual(way.flatMap((s) => s.tile.device ?? []).sort(), devices.map((d) => d.id).sort());
    way.forEach((s, i) => {
      for (const { to } of next[i]) {
        const [a, b] = [s.tile.device, way[to].tile.device];
        if (a && b) assert.ok(a.includes("picture") && b.includes("picture"), `${a} leads straight to ${b}`);
      }
    });
  }
});

test("a room is not a conveyor belt: it climbs, drops and fans out", () => {
  const way = route("kitchen", room(13, true)), { io } = links(way);
  assert.ok(io.some((e) => e.outs.length === 3) && io.some((e) => e.ins.length === 3), "a redirector and a collector of three ways");
  assert.ok(io.filter((e) => /[TB]/.test(e.ins + e.outs)).length >= 8, "tiles that go up or down");
  assert.ok(new Set(way.filter((s) => s.tile.device).map((s) => s.row)).size >= 4, "devices on four rows or more");
  assert.ok(way.some((s) => s.flip && s.tile.device), "a band that runs back the other way");
});

test("a tile's one rule: a duck comes in at the middle of an edge and goes out at the middle of another, whichever of its ways it takes", () => {
  for (const { tile } of route("kitchen", room(13, true))) {
    const { ins, outs } = edges(tile.io);
    for (const on of [true, false])
      for (let from = ins ? 0 : -1; from < ins.length; from++)
        for (let to = outs ? 0 : -1; to < outs.length; to++) {
          const at = (p: number) => { const d = tile.duck({ p, on, dt: 0, now: 0, from, to, turn: 0 }); return [Math.round(d.x), Math.round(d.y)]; };
          const what = `${tile.device ?? "a carrier"} going ${tile.io}, ${on ? "on" : "off"}, in by ${from} and out by ${to}`;
          if (from >= 0) assert.deepEqual(at(0), EDGE[ins[from]], what);
          if (to >= 0) assert.deepEqual(at(1), EDGE[outs[to]], what);
        }
  }
});

test("a part that turns takes the bitmap made nearest its angle", () => {
  const cog = ringOf("24"), spokes = ringOf("90:6"), lever = ringOf("0..25:11");
  assert.deepEqual([cog.ring, cog.steps], [{ lo: 0, span: 360, wrap: true }, 24]);
  assert.equal(chosen(cog.ring, 24, 0), 0);
  assert.equal(chosen(cog.ring, 24, 359), 0); // it comes round again
  assert.equal(chosen(cog.ring, 24, -15), 23);
  assert.equal(chosen(spokes.ring, 6, 90 + 30), 2); // four spokes look the same every quarter turn
  assert.equal(chosen(lever.ring, 11, 12.5), 5);
  assert.equal(chosen(lever.ring, 11, 90), 10); // a lever stops at its ends
  assert.equal(chosen(lever.ring, 11, -90), 0);
});

test("a mirrored part takes the bitmap turned the same way, and is drawn mirrored", () => {
  const part = { m: [1, 0, 0, 1, 0, 0], kids: [], looks: [], name: "lever", d: "", x: 0, y: 0, deg: 20, cx: 155, cy: 180, sx: 1, sy: 1, o: 1 } as Part;
  const flipped: Mat = [-1, 0, 0, 1, 260, 0];
  const plain = facing(posed(part)), mirrored = facing(mul(flipped, posed(part)));
  assert.deepEqual([Math.round(plain.deg), plain.flip], [20, 1]);
  assert.deepEqual([Math.round(mirrored.deg), mirrored.flip], [20, -1]);
  // The pivot stays where it is, and is mirrored with the tile.
  const m = mul(flipped, posed(part));
  assert.deepEqual([Math.round(m[0] * 155 + m[2] * 180 + m[4]), Math.round(m[1] * 155 + m[3] * 180 + m[5])], [260 - 155, 180]);
});

test("a knot goes round its cord", () => {
  const loop: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(round(loop, 5), [5, 0]);
  assert.deepEqual(round(loop, 15), [10, 5]);
  assert.deepEqual(round(loop, 45), [5, 0]);
  assert.deepEqual(round(loop, -5), [0, 5]);
});
