// The engine against the cases the compositor's own engine passes (tests/test_layout_cases.py
// runs this too). Plain node: `node --experimental-strip-types --test src/layout.test.ts`.
import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../../tests/layout_cases.json" with { type: "json" };
import { heightForMain, layout, pyRound, type Settings } from "./layout.ts";

for (const c of cases) {
  test(c.name, () => {
    const [size, main, tiles] = layout(c.cmd as unknown as Settings, c.main_camera);
    assert.deepEqual({ size, main, tiles }, c.expect);
  });
}

test("rounds as Python does", () => {
  assert.deepEqual([0.5, 1.5, 2.5, -0.5, 2.4, 2.6].map(pyRound), [0, 2, 2, 0, 2, 3]);
});

// A Commander in a normal section is as tall as shows its main camera at its own shape.
const panelled = (over: Record<string, unknown>) => {
  const s = JSON.parse(JSON.stringify(cases[0].cmd)) as Settings; // three cameras each side
  return { ...s, ...over } as Settings;
};
const mainOf = (s: Settings, width: number, shape: number) => {
  const h = heightForMain(s, null, width, shape);
  const [, , mw, mh] = layout({ ...s, width, height: h })[1];
  return { h, mw, mh };
};

test("the main area gets the main camera's shape, panels round it", () => {
  for (const shape of [16 / 9, 4 / 3, 1, 9 / 16]) {
    for (const width of [390, 800, 1180]) {
      const { mw, mh } = mainOf(panelled({}), width, shape);
      assert.ok(Math.abs(mw / shape - mh) <= 1, `${width} px at ${shape}: ${mw} x ${mh}`);
    }
  }
});

test("the worked example: sides only, 15% each, 4 px gaps: as tall as the main area", () => {
  const s = panelled({ gap: 4, top: { ...panelled({}).top, cameras: [] }, bottom: { ...panelled({}).bottom, cameras: [] } });
  const { h, mw, mh } = mainOf(s, 800, 16 / 9);
  assert.deepEqual([mw, mh, h], [552, 311, 311]);
});

test("a taller main camera makes a taller card", () => {
  const s = panelled({});
  assert.ok(mainOf(s, 800, 4 / 3).h > mainOf(s, 800, 16 / 9).h);
});

test("own: the smallest height at which the main camera gets its full size", () => {
  const s = panelled({ main_fit: "own", main_width: 70, aspects: { main: 4 / 3 } });
  const h = heightForMain(s, "main", 1000, 4 / 3);
  const [, , mw] = layout({ ...s, width: 1000, height: h }, "main")[1];
  assert.equal(mw, 700);
  assert.ok(layout({ ...s, width: 1000, height: h - 1 }, "main")[1][2] < 700);
});
