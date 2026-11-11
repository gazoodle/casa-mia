// What a laid-out commander does with its space (measure.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { measure, type Shown } from "./measure.ts";

const WIDE = 16 / 9;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test("a main camera that fills the space leaves nothing unused and loses nothing", () => {
  const m = measure([1600, 900], { rect: [0, 0, 1600, 900], shape: WIDE, how: "cover" }, []);
  near(m.main, 1);
  near(m.unused, 0);
  near(m.lost, 0);
  assert.equal(m.tall, 0);
});

test("shown whole in a place of another shape: its bars are unused space, and nothing is lost", () => {
  // a 16:9 camera whole in a square: it takes 9/16 of it
  const m = measure([900, 900], { rect: [0, 0, 900, 900], shape: WIDE, how: "contain" }, []);
  near(m.main, 9 / 16);
  near(m.unused, 7 / 16);
  near(m.lost, 0);
});

test("cropped to fill a place of another shape: nothing unused, and what is cut off is said", () => {
  const m = measure([900, 900], { rect: [0, 0, 900, 900], shape: WIDE, how: "cover" }, []);
  near(m.main, 1);
  near(m.lost, 7 / 16);
});

test("stretched to fit: said as squeezed, not as lost", () => {
  const m = measure([900, 900], { rect: [0, 0, 900, 900], shape: WIDE, how: "fill" }, []);
  near(m.squeezed, 7 / 16);
  near(m.lost, 0);
});

test("tiles: the space between them is unused, the worst crop is the one said, narrow ones are counted", () => {
  const main: Shown = { rect: [0, 0, 800, 450], shape: WIDE, how: "cover" };
  const tiles: Shown[] = [
    { rect: [800, 0, 200, 450], shape: WIDE, how: "cover" }, // taller than wide: loses 75%
    { rect: [0, 450, 160, 90], shape: WIDE, how: "cover" }, // its own shape
    { rect: [0, 0, 0, 0], shape: WIDE, how: "cover" }, // a tile with no room: not counted as narrow
  ];
  const m = measure([1000, 540], main, tiles);
  near(m.main, (800 * 450) / (1000 * 540));
  near(m.unused, 1 - (800 * 450 + 200 * 450 + 160 * 90) / (1000 * 540));
  near(m.lost, 0.75);
  assert.equal(m.tall, 1);
});

test("no main camera: only the tiles count", () => {
  const m = measure([320, 180], null, [{ rect: [0, 0, 320, 180], shape: WIDE, how: "cover" }]);
  near(m.main, 0);
  near(m.unused, 0);
});
