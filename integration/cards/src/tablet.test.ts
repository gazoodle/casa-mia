// The Tablet Layout's placement (tablet.ts) against tests/tablet_cases.json, and what must
// hold for every case. A bug found in the view's arithmetic becomes a case here.
// A deliberate change: rewrite the cases with
//   WRITE_CASES=1 node --experimental-strip-types --no-warnings --test src/tablet.test.ts
// and read the diff before committing it.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import test from "node:test";
import saved from "../../../tests/tablet_cases.json" with { type: "json" };
import { type Placement, placePanels, PLACES, seenOut } from "./tablet.ts";

type Case = { name: string; config: Record<string, any>; area: [number, number]; editing: boolean; showing: string[]; naturals?: Record<string, number> };

const ALL = [...PLACES];
const BASELINE = { top: { size: "auto" }, bottom: { size: "auto" } }; // the agreed baseline view
const IPAD: [number, number] = [1180, 760]; // a landscape iPad's panels' area, CSS px
const FIXED = { main_fit: "fixed", main_ratio: "4:3", main_width: 60 };
const INPUTS: Case[] = [
  { name: "baseline: only main has a card", config: BASELINE, area: IPAD, editing: false, showing: ["main"] },
  { name: "baseline in edit mode: every panel, empty auto panels none tall", config: BASELINE, area: IPAD, editing: true, showing: ALL, naturals: { top: 0, bottom: 0 } },
  { name: "an empty auto bottom between the sides, in edit mode: the sides run beside it", config: { bottom: { size: "auto", anchor_left: false, anchor_right: false } }, area: IPAD, editing: true, showing: ALL, naturals: { bottom: 0 } },
  { name: "an empty auto top across the sides, in edit mode: the sides start under it", config: { top: { size: "auto", anchor_left: true, anchor_right: true } }, area: IPAD, editing: true, showing: ALL, naturals: { top: 0 } },
  { name: "every panel at its default size", config: {}, area: IPAD, editing: false, showing: ALL },
  { name: "every panel at its default size, in edit mode", config: {}, area: IPAD, editing: true, showing: ALL },
  { name: "auto panels as tall as their cards", config: BASELINE, area: IPAD, editing: false, showing: ALL, naturals: { top: 120, bottom: 80 } },
  { name: "a hidden panel takes no room", config: { left: { hidden: true } }, area: IPAD, editing: false, showing: ALL },
  { name: "panels that do not show take no room", config: {}, area: IPAD, editing: false, showing: ["main", "left", "bottom"] },
  { name: "margin", config: { margin: 24 }, area: IPAD, editing: false, showing: ALL },
  { name: "margin: none in edit mode", config: { margin: 24 }, area: IPAD, editing: true, showing: ALL },
  { name: "margin: at most half the shorter side", config: { margin: 900 }, area: [400, 300], editing: false, showing: ALL },
  { name: "portrait", config: {}, area: [800, 1180], editing: false, showing: ALL },
  { name: "a fixed main: the panels take the rest", config: FIXED, area: IPAD, editing: false, showing: ALL },
  { name: "a fixed main alone: its size, centred", config: FIXED, area: IPAD, editing: false, showing: ["main"] },
  { name: "a fixed main alone in edit mode: its width only", config: FIXED, area: IPAD, editing: true, showing: ["main"] },
  { name: "no main", config: {}, area: IPAD, editing: false, showing: ["left", "right"] },
];

const results = INPUTS.map((c) => ({ ...c, expect: placePanels(c.config, c.area, c.editing, c.showing, c.naturals) }));
if (process.env.WRITE_CASES) writeFileSync(new URL("../../../tests/tablet_cases.json", import.meta.url), JSON.stringify(results, null, 1) + "\n");

test("the cases are the inputs here", () => {
  assert.deepEqual(
    saved.map(({ expect: _, ...c }) => c),
    INPUTS.map((c) => JSON.parse(JSON.stringify(c))),
  );
});
for (const c of saved as (Case & { expect: Placement })[]) test(c.name, () => assert.deepEqual(placePanels(c.config, c.area, c.editing, c.showing, c.naturals), c.expect));

const sizes = (tracks: string) => [...tracks.matchAll(/(\d+(?:\.\d+)?)(?:px|fr)/g)].map((m) => Number(m[1]));
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

for (const c of results) {
  test(`${c.name}: fills its area, never a negative track`, () => {
    const p = c.expect;
    for (const n of [...sizes(p.columns), ...sizes(p.rows)]) assert.ok(n >= 0, `${n} in ${p.columns} / ${p.rows}`);
    assert.equal(sum(sizes(p.columns)), c.area[0] - 2 * p.inset);
    assert.equal(sum(sizes(p.rows)), c.area[1] - 2 * p.inset);
  });
  test(`${c.name}: a place for each panel that shows, and only those`, () => {
    for (const place of PLACES) {
      const hidden = c.config[place]?.hidden;
      assert.equal(c.expect.places[place] !== null, c.showing.includes(place) && !hidden, place);
    }
  });
}

// Found 2026-10-07: an empty top or bottom panel of size: auto is none tall, so its grid lines
// were the same as the next; the sides ran through its rows, and in edit mode, where it
// grows to hold HA's Add card, stood beside it.
for (const c of results) {
  test(`${c.name}: no two panels share a grid cell`, () => {
    const cells = new Map<string, string>();
    for (const [place, at] of Object.entries(c.expect.places)) {
      if (!at) continue;
      const [c0, c1] = at.column.split(" / ").map(Number);
      const [r0, r1] = at.row.split(" / ").map(Number);
      for (let x = c0; x < c1; x++)
        for (let y = r0; y < r1; y++) {
          const was = cells.get(`${x},${y}`);
          assert.equal(was, undefined, `${place} and ${was} both in column ${x}, row ${y}`);
          cells.set(`${x},${y}`, place);
        }
    }
  });
}

test("edit mode gives the panels the shape they have out of it", () => {
  for (const c of results.filter((c) => !c.editing && !c.config.margin)) {
    const edit = placePanels(c.config, c.area, true, c.showing, c.naturals);
    assert.deepEqual(sizes(edit.columns), sizes(c.expect.columns), c.name);
    assert.deepEqual(sizes(edit.rows), sizes(c.expect.rows), c.name);
    assert.deepEqual(
      Object.values(edit.places).map((p) => p && [p.column, p.row]),
      Object.values(c.expect.places).map((p) => p && [p.column, p.row]),
      c.name,
    );
  }
});

// 2026.10.3-b74: OK in the Tablet Layout dialog saves the view, and HA builds a new one in
// edit mode; it must find what the old one saw out of edit mode.
test("a view's sizes seen out of edit mode outlive the view", () => {
  seenOut("wall-tablets", 0).shown = [1180, 760];
  seenOut("wall-tablets", 0).naturals.top = 42;
  assert.deepEqual(seenOut("wall-tablets", 0), { shown: [1180, 760], naturals: { top: 42 } });
  assert.deepEqual(seenOut("wall-tablets", 1), { naturals: {} }); // each view its own
});
