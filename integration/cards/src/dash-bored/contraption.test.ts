import assert from "node:assert/strict";
import { test } from "node:test";
import { round } from "./contraption/faults.ts";
import { chosen, facing, mul, posed, ringOf, type Mat, type Part } from "./contraption/kit.ts";
import { advance, begin } from "./contraption/flow.ts";
import { STAGES, progress } from "./contraption/gauge.ts";
import { links, route } from "./contraption/layout.ts";
import { EDGE, edges, type Dev } from "./contraption/tile.ts";
import { GAP, legs, lie, long, within } from "./contraption/underground.ts";

const KINDS = ["light", "switch", "light", "cover", "light", "climate", "lock", "light"];
const dev = (i: number, more: Partial<Dev> = {}): Dev => ({ id: `${KINDS[i % KINDS.length]}.d${i}`, name: `Device ${i}`, kind: KINDS[i % KINDS.length], on: i % 2 === 0, level: 60, dims: i % 3 === 0, ...more });
/** A room of `n` devices; with `grouped`, three lights switched together in the middle of it. */
const room = (n: number, grouped = false) => [
  ...Array.from({ length: n }, (_, i) => dev(i)),
  ...(grouped ? ["north", "middle", "south"].map((where, k) => dev(100 + k, { id: `light.picture_${where}`, kind: "light", group: "Picture lights" })) : []),
  ...(grouped ? [dev(200)] : []),
];
const ROOMS = [1, 2, 3, 4, 5, 8, 13, 24].flatMap((n) => [room(n), room(n, true)]);

test("a way leads from each tile to one beside it that takes the duck, and every tile is in balance", () => {
  for (const devices of ROOMS)
    for (const id of ["kitchen", "study", "a", "long gallery"]) {
      const layout = route(id, devices), { way } = layout, { next } = links(layout);
      way.forEach((s, i) => next[i].forEach(({ to }) => assert.equal(Math.abs(way[to].col - s.col) + Math.abs(way[to].row - s.row), 1, `${id}, ${devices.length} devices: step ${i}`)));
      assert.ok(way.every((s) => s.col >= 0 && s.row >= 0));
    }
});

test("the dumb waiter is one shaft, and every tile is on a way from its foot", () => {
  for (const devices of ROOMS) {
    const layout = route("kitchen", devices), { way } = layout, { io, next, up } = links(layout);
    const base = io.findIndex((e) => !e.ins);
    assert.equal(io.filter((e) => !e.ins).length, 1, "one foot");
    assert.equal(io.filter((e) => e.ins === "B" && !e.outs).length, 1, "one top");
    assert.equal(up[base].length, 1, "fed by one tunnel");
    // By the tiles, and by the tunnels where a stream goes below.
    const reached = new Set<number>(), todo = [base];
    while (todo.length) {
      const i = todo.pop()!;
      if (reached.has(i)) continue;
      reached.add(i);
      todo.push(...next[i].map(({ to }) => to), ...layout.tunnels.filter((t) => t.from === i).map((t) => t.to));
    }
    assert.equal(reached.size, way.length, `${devices.length} devices: a tile no duck comes to`);
    assert.equal(new Set(way.filter((s) => /[TB]/.test(s.tile.io) && s.col === way[base].col).map((s) => s.col)).size, 1);
  }
});

test("every device has one tile, and no two devices' tiles follow one another but lights switched together", () => {
  for (const devices of ROOMS) {
    const layout = route("kitchen", devices), { way } = layout, { next } = links(layout);
    assert.deepEqual(way.flatMap((s) => s.tile.device ?? []).sort(), devices.map((d) => d.id).sort());
    way.forEach((s, i) => {
      for (const { to } of next[i]) {
        const [a, b] = [s.tile.device, way[to].tile.device];
        if (a && b) assert.ok(a.includes("picture") && b.includes("picture"), `${a} leads straight to ${b}`);
      }
    });
  }
});

test("a room is not a conveyor belt: it climbs, drops, fans out and has wings either side of the shaft", () => {
  const layout = route("kitchen", room(13, true)), { way } = layout, { io } = links(layout);
  assert.ok(io.some((e) => e.outs.length === 3) && io.some((e) => e.ins.length === 3), "a redirector and a collector of three ways");
  assert.ok(io.filter((e) => /[TB]/.test(e.ins + e.outs)).length >= 8, "tiles that go up or down");
  assert.ok(new Set(way.filter((s) => s.tile.device).map((s) => s.row)).size >= 3, "devices on three rows or more");
  assert.ok(way.some((s) => s.flip && s.tile.device) && way.some((s) => !s.flip && s.tile.device), "a wing each way");
});

test("machinery on the y-axis: a device stands upright where the stream goes down or up past it, of both kinds", () => {
  const upright = ROOMS.flatMap((devices) => route("kitchen", devices).way.filter((s) => s.tile.device && /^(TB|BT)$/.test(s.tile.io)));
  assert.ok(upright.some((s) => s.tile.io === "TB") && upright.some((s) => s.tile.io === "BT"), "one going down and one going up");
  assert.ok(upright.some((s) => s.tile.device!.startsWith("light.")) && upright.some((s) => !s.tile.device!.startsWith("light.")), "a light and a crate");
  // Whatever the room is called: some rooms of 24 once had none.
  for (const id of ["kitchen", "study", "a", "long gallery"])
    assert.ok(route(id, room(24)).way.filter((s) => s.tile.device && /^(TB|BT)$/.test(s.tile.io)).length >= 2, `${id}: two or more upright in a room of 24`);
});

test("two carriers of a kind do not do the same thing at the same moment: each has its own timing", () => {
  const { way } = route("kitchen", room(40));
  for (const io of ["BR", "TL"]) {
    // Toasters and trampolines, by where their duck is part of the way through the period.
    const some = way.filter((s) => s.tile.io === io && !s.tile.device && !s.tile.steady);
    const where = some.map((s) => { const d = s.tile.duck({ p: 0.42, on: false, dt: 0, now: 0, from: 0, to: 0, turn: 0 }); return `${Math.round(d.x)},${Math.round(d.y)}`; });
    assert.ok(some.length >= 3 && new Set(where).size >= some.length - 1, `${io}: ${where.join(" ")}`);
  }
});

test("the machine is clean: run for 200 periods, every way has one duck a period and none is made or lost", () => {
  for (const devices of ROOMS) {
    const layout = route("kitchen", devices), { io, next, up, down } = links(layout);
    const net = { nodes: layout.way.map((_, i) => ({ ins: io[i].ins.length, next: next[i], up: up[i], down: down[i] })), tunnels: layout.tunnels };
    const ducks = begin(net), all = ducks.length, what = `${devices.length} devices`;
    for (let turn = 0; turn <= 200; turn++) {
      if (turn) advance(net, ducks, turn);
      assert.equal(ducks.length, all);
      net.nodes.forEach((node, c) => {
        const here = ducks.filter((k) => k.cell === c);
        // One duck in by each way in and each tunnel up, and one out by each way out and each tunnel down.
        assert.deepEqual(here.map((k) => k.from).sort((a, b) => a - b), [...node.up.map((_, k) => -1 - k).reverse(), ...Array.from({ length: node.ins }, (_, k) => k)], `${what}, period ${turn}, tile ${c}: in`);
        assert.deepEqual(here.map((k) => k.to).sort((a, b) => a - b), [...node.down.map((_, k) => -1 - k).reverse(), ...node.next.map((_, k) => k)], `${what}, period ${turn}, tile ${c}: out`);
      });
      // In each way of each tunnel, a duck for every period of it that is that way's turn.
      net.tunnels.forEach((t, n) => t.ways.forEach((w, way) => {
        const ages = Array.from({ length: w.periods }, (_, age) => age).filter((age) => (((turn - age) % t.ways.length) + t.ways.length) % t.ways.length === way);
        assert.deepEqual(ducks.filter((k) => k.tunnel === n && k.way === way).map((k) => k.age).sort((a, b) => a - b), ages, `${what}, period ${turn}, tunnel ${n}, way ${way}`);
      }));
    }
    // In turn: over as many periods as a tile has places, each place has had every duck's turn.
    const parts = net.nodes.findIndex((node) => node.next.length > 1);
    if (parts >= 0) assert.equal(new Set(ducks.filter((k) => k.cell === parts).map((k) => k.to)).size, net.nodes[parts].next.length);
  }
});

test("a tunnel goes from hole to hole by level, upright and 45 degree runs, and a duck in it keeps the pace of one on the sheet", () => {
  for (const devices of ROOMS) {
    const { way, tunnels } = route("kitchen", devices);
    assert.ok(tunnels.length >= 2);
    for (const t of tunnels) {
      const hole = (i: number) => [way[i].col * 260 + (way[i].flip ? 260 - way[i].tile.pit![0] : way[i].tile.pit![0]), way[i].row * 260 + way[i].tile.pit![1]];
      assert.ok(t.layer >= 0 && t.layer < 3);
      for (const w of t.ways) {
        assert.deepEqual(w.path[0], hole(t.from));
        assert.deepEqual(w.path.at(-1), hole(t.to));
        w.path.slice(1).forEach(([x, y], i) => {
          const [dx, dy] = [Math.abs(x - w.path[i][0]), Math.abs(y - w.path[i][1])];
          assert.ok(dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6, `a run of ${dx} by ${dy}`);
        });
        // It is out of the tube by the beat it comes up on, and has waited less at the start.
        assert.ok(w.lead >= 0 && w.lead + long(w.path) / 260 <= w.periods + 1e-6, `${w.lead} + ${long(w.path) / 260} in ${w.periods}`);
        const a = within(w, w.lead + 0.5), b = within(w, w.lead + 0.75);
        if (a && b && long(w.path) > 260) assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) <= 65 + 1e-6);
      }
    }
  }
});

test("the dumb waiter's ducks go back to its foot by a tunnel that forks, and one comes up each period", () => {
  for (const devices of ROOMS) {
    const { way, tunnels } = route("kitchen", devices), round = tunnels[0];
    assert.equal(way[round.from].tile.io, "B>");
    assert.equal(way[round.to].tile.io, ">T");
    assert.ok(round.ways.length === 2 || round.ways.length === 4);
    assert.equal(new Set(round.ways.map((w, i) => (i + w.periods) % round.ways.length)).size, round.ways.length);
  }
});

test("tubes keep apart: two that run alongside are a tube's width apart, or are one tube bound for one hole", () => {
  let beside = 0, pairs = 0;
  for (const devices of ROOMS) {
    const { tunnels } = route("kitchen", devices);
    tunnels.forEach((t, i) => tunnels.slice(i + 1).forEach((other) => {
      for (const a of legs(t.ways[0].path))
        for (const b of other.ways.flatMap((w) => legs(w.path))) {
          if (Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]) < 1) continue;
          const close = lie(a, b).beside;
          // Two bound for the same hole come together by it, two from the same hole leave it together, and that is all.
          if (close > 1 && t.to !== other.to && t.from !== other.from) beside += close;
          pairs++;
        }
    }));
  }
  assert.ok(pairs > 100);
  assert.equal(Math.round(beside), 0, `tubes run close alongside for ${Math.round(beside)} units in all (closer than ${GAP})`);
});

test("a tile's one rule: a duck comes in at the middle of an edge and goes out at the middle of another, whichever of its ways it takes", () => {
  for (const { tile } of route("kitchen", room(13, true)).way) {
    const { ins, outs } = edges(tile.io);
    for (const on of [true, false])
      // As many up its hole as it sends out more than it takes in, and as many down it the other way about.
      for (let from = -Math.max(0, outs.length - ins.length); from < ins.length; from++)
        for (let to = -Math.max(0, ins.length - outs.length); to < outs.length; to++) {
          const at = (p: number) => { const d = tile.duck({ p, on, dt: 0, now: 0, from, to, turn: 0 }); return [Math.round(d.x) + 0, Math.round(d.y) + 0]; };
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

test("the gauge goes from nought to a hundred through its stages, and never back", () => {
  assert.equal(STAGES.reduce((sum, [, share]) => sum + share, 0), 100);
  assert.equal(progress(0, 0), 0);
  assert.equal(progress(STAGES.length - 1, 1), 100);
  const along = STAGES.flatMap((_, stage) => [0, 0.5, 1].map((share) => progress(stage, share)));
  assert.deepEqual(along, [...along].sort((a, b) => a - b));
  assert.equal(progress(3, 7), progress(3, 1)); // a share past the end is the end
});
