import assert from "node:assert/strict";
import { test } from "node:test";
import { round } from "./contraption/faults.ts";
import { chosen, facing, mul, posed, ringOf, type Mat, type Part } from "./contraption/kit.ts";
import { fits, route } from "./contraption/layout.ts";
import { S, type Dev } from "./contraption/tile.ts";

const KINDS = ["light", "switch", "light", "cover", "light", "climate", "lock", "light"];
const dev = (i: number, more: Partial<Dev> = {}): Dev => ({ id: `${KINDS[i % KINDS.length]}.d${i}`, name: `Device ${i}`, kind: KINDS[i % KINDS.length], on: i % 2 === 0, level: 60, dims: i % 3 === 0, ...more });
/** A room of `n` devices; with `grouped`, three lights switched together in the middle of it. */
const room = (n: number, grouped = false) => [
  ...Array.from({ length: n }, (_, i) => dev(i)),
  ...(grouped ? ["north", "middle", "south"].map((where, k) => dev(100 + k, { id: `light.picture_${where}`, kind: "light", group: "Picture lights" })) : []),
  ...(grouped ? [dev(200)] : []),
];
const ROOMS = [1, 2, 3, 4, 5, 8, 13, 24].flatMap((n) => [room(n), room(n, true)]);
const EDGE: Record<string, [number, number]> = { L: [0, S / 2], R: [S, S / 2], T: [S / 2, 0], B: [S / 2, S] };

test("a way round goes from each tile to one beside it, and back to the start", () => {
  for (const devices of ROOMS) {
    const way = route("kitchen", devices), taken = new Set<string>();
    way.forEach(([col, row], i) => {
      const [nextCol, nextRow] = way[(i + 1) % way.length];
      assert.equal(Math.abs(nextCol - col) + Math.abs(nextRow - row), 1, `${devices.length} devices: step ${i} is not beside the next`);
      assert.ok(!taken.has(`${col},${row}`), `${devices.length} devices: two tiles at ${col},${row}`);
      taken.add(`${col},${row}`);
    });
  }
});

test("every tile fits the edges it is entered and left by, as it is or mirrored", () => {
  for (const devices of ROOMS) assert.equal(fits(route("kitchen", devices)).length, route("kitchen", devices).length);
  for (const id of ["a", "study", "long gallery", "x1"]) assert.doesNotThrow(() => fits(route(id, room(9, true))), id);
});

test("every device has one tile, and no two devices' tiles touch but lights switched together", () => {
  for (const devices of ROOMS) {
    const way = route("kitchen", devices);
    assert.deepEqual(way.flatMap(([, , tile]) => tile.device ?? []).sort(), devices.map((d) => d.id).sort());
    way.forEach(([, , tile], i) => {
      const next = way[(i + 1) % way.length][2];
      if (tile.device && next.device) assert.ok(tile.device.includes("picture") && next.device.includes("picture"), `${tile.device} touches ${next.device}`);
    });
  }
});

test("a tile's one rule: the duck comes in at the middle of one edge and goes out at the middle of another", () => {
  for (const [, , tile] of route("kitchen", room(13, true)))
    for (const on of [true, false])
      for (const [p, edge] of [[0, tile.io[0]], [1, tile.io[1]]] as const) {
        const at = tile.duck({ p, on, dt: 0, now: 0 });
        assert.deepEqual([Math.round(at.x), Math.round(at.y)], EDGE[edge], `${tile.device ?? "a carrier"} going ${tile.io}, ${on ? "on" : "off"}, at ${p}`);
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
