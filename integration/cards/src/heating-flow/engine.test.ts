import { test } from "node:test";
import assert from "node:assert/strict";
import { Draw } from "./draw.ts";
import { type Area, type Look, OFF, capped, geometry, place, ramp, tempAt } from "./engine.ts";

const LOOK: Look = { pipes: "outline", markers: "chev", colours: "temp", readouts: "pill" };
const t = (v: number, e = "sensor.x", stale?: string) => ({ v, unit: "°", dp: 1, e, stale });

test("a pipe's ends run on by half its width, so it reaches the far wall of the pipe it tees into", () => {
  assert.deepEqual(capped([[0, 0], [100, 0]], 6), [[-6, 0], [106, 0]]);
  assert.deepEqual(capped([[0, 0], [0, 50], [40, 50]], 5), [[0, -5], [0, 50], [45, 50]]);
});

test("between sensors the temperature is interpolated, and held flat beyond the first and last", () => {
  const stops: [number, number][] = [[10, 40], [30, 30]];
  assert.equal(tempAt(stops, 0), 40);
  assert.equal(tempAt(stops, 20), 35);
  assert.equal(tempAt(stops, 99), 30);
  assert.equal(tempAt([], 5), null);
});

test("the colour scale runs cold blue to hot red", () => {
  assert.equal(ramp(-20), "#3b47c9");
  assert.equal(ramp(80), "#b31e3d");
  assert.notEqual(ramp(20), ramp(50));
});

test("sensors given an area are spread evenly over the stretch of pipe inside it, in order", () => {
  const areas: Area[] = [["plant", 0, 100, "", ""], ["house", 100, 200, "", ""]];
  const { segs, total } = geometry([[0, 0], [200, 0]], 0);
  const s = place([{ k: "a", area: "plant" }, { k: "b", area: "plant" }, { k: "c", area: "house" }], segs, total, false, areas).map((x) => Math.round(x.s));
  assert.deepEqual(s, [33, 65, 149]); // thirds of 0..98, and the middle of 100..198 (sampled every 2)
});

test("a sensor that isn't current leaves the gradient and its readout shows its age", () => {
  const d = new Draw({ a: t(50, "sensor.a"), b: t(20, "sensor.b", "3 days") }, { f: true }, LOOK);
  const p = d.pipe({ circ: "heat", pts: [[0, 0], [100, 0]], flow: "f", sensors: [{ k: "a", f: 0 }, { k: "b", f: 1 }] });
  assert.ok(!p.defs.includes(ramp(20)), "the stale reading is no stop");
  assert.ok(p.defs.includes(ramp(50)));
  assert.match(p.pills, /— 3 days/);
});

test("with no current sensor a pipe is grey, not a guess", () => {
  const d = new Draw({ a: t(50, "sensor.a", "1 h") }, { f: true }, LOOK);
  assert.ok(d.pipe({ circ: "heat", pts: [[0, 0], [100, 0]], flow: "f", sensors: [{ k: "a", f: 0 }] }).defs.includes(OFF));
});

test("chevrons ride a pipe only while it flows", () => {
  const pipe = { circ: "heat", pts: [[0, 0], [200, 0]] as [number, number][], flow: "f" };
  assert.match(new Draw({}, { f: true }, LOOK).pipe(pipe).marks, /animateMotion/);
  assert.equal(new Draw({}, { f: false }, LOOK).pipe(pipe).marks, "");
});

test("pipes are drawn as one network: every wall first, then the water, the pipes others tee into last", () => {
  const d = new Draw({}, {}, LOOK);
  const body = d.pipes([
    { circ: "heat", z: 1, pts: [[0, 50], [200, 50]] },
    { circ: "dhw", pts: [[100, 0], [100, 50]] },
  ]).body;
  const walls = [...body.matchAll(/var\(--hf-edge\)/g)].map((m) => m.index!), water = body.indexOf(OFF);
  assert.ok(Math.max(...walls) < water, "no wall over any water");
  // Ends are square-capped: the trunk starts at x -6, the branch at y -6.
  assert.ok(body.lastIndexOf("M-6 50") > body.lastIndexOf("M100 -6"), "the trunk's water covers the branch's end");
});
