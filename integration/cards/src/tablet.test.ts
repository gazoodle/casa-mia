// The Tablet Layout's placement (tablet.ts) against tests/tablet_cases.json, and what must
// hold for every case. A bug found in the view's arithmetic becomes a case here.
// A deliberate change: rewrite the cases with
//   WRITE_CASES=1 node --experimental-strip-types --no-warnings --test src/tablet.test.ts
// and read the diff before committing it.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import test from "node:test";
import saved from "../../../tests/tablet_cases.json" with { type: "json" };
import { SQUEEZE, cardColumns, cardsWidth, depthOf, draftsOf, type Gap, gapLines, layerOf, panelName, type Placement, placeOf, placePanels, PLACES, restack, type Section, seenOut, sides, stackOf, withLayer } from "./tablet.ts";

type Case = { name: string; config: Record<string, any>; area: [number, number]; editing: boolean; fit?: boolean; sections: (Section | null)[] };

const BASELINE = { top: { size: "auto" }, bottom: { size: "auto" } }; // the agreed baseline view
const IPAD: [number, number] = [1180, 760]; // a landscape iPad's panels' area, CSS px
const FIXED = { main_fit: "fixed", main_ratio: "4:3", main_width: 60 };
/** A view of five sections, one a panel (as before panel stacks): those `showing` show. */
const five = (showing: readonly string[] = PLACES, naturals: Record<string, number> = {}): Section[] =>
  PLACES.map((place) => ({ layer: 1, place, shows: showing.includes(place), ...(naturals[place] !== undefined && { tall: naturals[place] }) }));
/** A section of layer `layer` (1 if left out) that shows. */
const at = (place: Section["place"], more: Partial<Section> = {}): Section => ({ layer: 1, place, shows: true, ...more });

const INPUTS: Case[] = [
  { name: "baseline: only main has a card", config: BASELINE, area: IPAD, editing: false, sections: five(["main"]) },
  { name: "baseline in edit mode: every panel, empty auto panels none tall", config: BASELINE, area: IPAD, editing: true, sections: five(PLACES, { top: 0, bottom: 0 }) },
  { name: "an empty auto bottom between the sides, in edit mode: the sides run beside it", config: { bottom: { size: "auto", anchor_left: false, anchor_right: false } }, area: IPAD, editing: true, sections: five(PLACES, { bottom: 0 }) },
  { name: "an empty auto top across the sides, in edit mode: the sides start under it", config: { top: { size: "auto", anchor_left: true, anchor_right: true } }, area: IPAD, editing: true, sections: five(PLACES, { top: 0 }) },
  { name: "every panel at its default size", config: {}, area: IPAD, editing: false, sections: five() },
  { name: "every panel at its default size, in edit mode", config: {}, area: IPAD, editing: true, sections: five() },
  { name: "auto panels as tall as their cards", config: BASELINE, area: IPAD, editing: false, sections: five(PLACES, { top: 120, bottom: 80 }) },
  { name: "a hidden panel takes no room", config: { left: { hidden: true } }, area: IPAD, editing: false, sections: five() },
  { name: "a hidden panel in edit mode: as if it showed, to be shown again", config: { left: { hidden: true } }, area: IPAD, editing: true, sections: five() },
  { name: "a hidden inner edge in edit mode with layers: as if it showed", config: { inner: { top: { hidden: true } } }, area: IPAD, editing: true, sections: [...five(), at("top", { layer: 2 }), at("left", { layer: 2 })] },
  { name: "panels that do not show take no room", config: {}, area: IPAD, editing: false, sections: five(["main", "left", "bottom"]) },
  { name: "margin", config: { margin: 24 }, area: IPAD, editing: false, sections: five() },
  { name: "margin in edit mode: round the area, not in it", config: { margin: 32 }, area: IPAD, editing: true, sections: five() },
  { name: "margin in edit mode with layers: round them", config: { margin: 32 }, area: IPAD, editing: true, sections: [...five(), at("left", { layer: 2 })] },
  { name: "margin: at most half the shorter side", config: { margin: 900 }, area: [400, 300], editing: false, sections: five() },
  { name: "margin, each side its own", config: { margin: { top: 10, left: 40 } }, area: IPAD, editing: false, sections: five() },
  { name: "margin, each side, in edit mode: round the area, those of up to 25 px in it", config: { margin: { top: 10, right: 20, bottom: 30, left: 4 } }, area: IPAD, editing: true, sections: five() },
  { name: "an empty view in edit mode: all of it in the area", config: { margin: 40, inner: { left: { size: 20 } } }, area: IPAD, editing: true, fit: true, sections: [...five(), at("left", { layer: 2 })] },
  { name: "margin of 8 in edit mode: in the area, as out of it", config: { margin: 8 }, area: IPAD, editing: true, sections: [...five(), at("left", { layer: 2 })] },
  { name: "an edge's own gap to the middle", config: { gap: 4, left: { gap: 20 }, bottom: { gap: 0 } }, area: IPAD, editing: false, sections: five() },
  { name: "an edge's own gap, a fixed main", config: { ...FIXED, top: { gap: 16 } }, area: IPAD, editing: false, sections: five() },
  { name: "a panel's own gap after it", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { wide: 200, gapAfter: 30 }), at("top", { wide: 200 }), at("top", { wide: 200 })] },
  { name: "a panel's own gap before the held ones", config: {}, area: IPAD, editing: false, sections: [at("main"), at("right", { size: "fill", gapAfter: 20 }), at("right", { tall: 180, hold: true })] },
  { name: "inner layer gaps its own", config: { inner: { left: { gap: 24 } } }, area: IPAD, editing: true, sections: [...five(), at("left", { layer: 2 })] },
  { name: "portrait", config: {}, area: [800, 1180], editing: false, sections: five() },
  { name: "a fixed main: the panels take the rest", config: FIXED, area: IPAD, editing: false, sections: five() },
  { name: "a fixed main alone: its size, centred", config: FIXED, area: IPAD, editing: false, sections: five(["main"]) },
  { name: "a fixed main alone in edit mode: its width only", config: FIXED, area: IPAD, editing: true, sections: five(["main"]) },
  { name: "no main", config: {}, area: IPAD, editing: false, sections: five(["left", "right"]) },
  // Panel stacks.
  { name: "a top stack of three: a column each, packed from the start", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top"), at("top"), at("top")] },
  { name: "a top stack of three, in edit mode", config: {}, area: IPAD, editing: true, sections: [at("main"), at("top"), at("top"), at("top")] },
  { name: "a top stack: one of half its Width, the other a column", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { share: 0.5 }), at("top")] },
  { name: "a top stack all of a Width: packed from the start", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { share: 0.25 }), at("top", { share: 0.25 })] },
  { name: "a top stack too wide: all shrink alike", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { share: 0.75 }), at("top", { share: 0.75 })] },
  { name: "a top stack as wide as their cards, packed from the start", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { wide: 140 }), at("top", { wide: 290 })] },
  { name: "a top stack, one without cards: a column", config: {}, area: IPAD, editing: true, sections: [at("main"), at("top", { wide: 140 }), at("top", { wide: 0 })] },
  { name: "a top stack of one, as wide as its cards: fills it", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { wide: 140 })] },
  { name: "a left panel as wide as its cards: its widest", config: { left: { size: "auto" } }, area: IPAD, editing: false, sections: [at("main"), at("left", { wide: 140, tall: 300 }), at("left", { wide: 290, tall: 200 })] },
  { name: "a right panel as wide as its cards, in edit mode", config: { right: { size: "auto" } }, area: IPAD, editing: true, sections: [at("main"), at("right", { wide: 140 })] },
  { name: "a top stack of one of a Width", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top", { share: 0.5 })] },
  { name: "a left stack as tall as their cards, packed from the start", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { tall: 200 }), at("left", { tall: 150 })] },
  { name: "a left stack with a length", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { length: 120 }), at("left", { tall: 150 })] },
  { name: "a left stack too tall: all shrink alike", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { tall: 600 }), at("left", { tall: 600 })] },
  { name: "a left stack in edit mode, one new and empty", config: {}, area: IPAD, editing: true, sections: [at("main"), at("left", { tall: 200 }), at("left", { tall: 0 })] },
  { name: "a right stack: one filling, one held to the end as its cards", config: {}, area: IPAD, editing: false, sections: [at("main"), at("right", { size: "fill" }), at("right", { tall: 180, hold: true })] },
  { name: "a right stack: both as their cards, one held to the end", config: {}, area: IPAD, editing: false, sections: [at("main"), at("right", { tall: 200 }), at("right", { tall: 180, hold: true })] },
  { name: "a right stack held, in edit mode", config: {}, area: IPAD, editing: true, sections: [at("main"), at("right", { tall: 200 }), at("right", { tall: 180, hold: true })] },
  { name: "a held one first in order: still at the end", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { tall: 180, hold: true }), at("left", { tall: 200 })] },
  { name: "a left stack centred", config: { left: { arrange: "centre" } }, area: IPAD, editing: false, sections: [at("main"), at("left", { tall: 200 }), at("left", { tall: 150 })] },
  { name: "a top stack from the end", config: { top: { arrange: "end" } }, area: IPAD, editing: false, sections: [at("main"), at("top", { wide: 140 }), at("top", { wide: 290 })] },
  { name: "a top stack centred, one held: centred in what is left", config: { top: { arrange: "centre" } }, area: IPAD, editing: false, sections: [at("main"), at("top", { wide: 140 }), at("top", { wide: 290, hold: true })] },
  { name: "two filling share alike, round one as its cards", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { size: "fill" }), at("left", { tall: 160 }), at("left", { size: "fill" })] },
  { name: "one alone, as its cards: not filling", config: {}, area: IPAD, editing: false, sections: [at("main"), at("right", { size: "cards", tall: 220 })] },
  { name: "too tall with one filling: it gets none, the others shrink", config: {}, area: IPAD, editing: false, sections: [at("main"), at("left", { size: "fill" }), at("left", { tall: 500 }), at("left", { tall: 500, hold: true })] },
  { name: "a stack where one is hidden: the others close up", config: {}, area: IPAD, editing: false, sections: [at("main"), at("top"), at("top", { shows: false }), at("top")] },
  { name: "an auto top stack: as tall as its tallest", config: BASELINE, area: IPAD, editing: false, sections: [at("main"), at("top", { tall: 90 }), at("top", { tall: 140 })] },
  { name: "a second main: not shown", config: {}, area: IPAD, editing: false, sections: [at("main"), at("main"), at("left")] },
  { name: "a section that is no panel: not shown", config: {}, area: IPAD, editing: false, sections: [at("main"), null, at("left")] },
  // Layers.
  { name: "two layers", config: { inner: { left: { size: 20 } } }, area: IPAD, editing: false, sections: [...five(), at("left", { layer: 2 }), at("bottom", { layer: 2 })] },
  { name: "two layers, in edit mode", config: { inner: { left: { size: 20 } } }, area: IPAD, editing: true, sections: [...five(), at("left", { layer: 2 }), at("bottom", { layer: 2 })] },
  { name: "two layers, the inner one hidden: main has the middle", config: {}, area: IPAD, editing: false, sections: [...five(), at("left", { layer: 2, shows: false })] },
  { name: "two layers, no main: the inner one has the middle", config: {}, area: IPAD, editing: false, sections: [...five(["left", "top"]), at("right", { layer: 2 })] },
  { name: "two layers, the inner a stack", config: {}, area: IPAD, editing: false, sections: [...five(), at("top", { layer: 2 }), at("top", { layer: 2 })] },
  { name: "four layers", config: { inner: { inner: { top: { size: 25 } } } }, area: IPAD, editing: false, sections: [...five(), at("left", { layer: 2 }), at("top", { layer: 3 }), at("right", { layer: 4 })] },
  { name: "four layers, in edit mode", config: { inner: { inner: { top: { size: 25 } } } }, area: IPAD, editing: true, sections: [...five(), at("left", { layer: 2 }), at("top", { layer: 3 }), at("right", { layer: 4 })] },
  { name: "a fixed main in the inner layer", config: { ...FIXED, inner: { top: { size: 20 } } }, area: IPAD, editing: false, sections: [...five(), at("top", { layer: 2 })] },
];

const results = INPUTS.map((c) => ({ ...c, expect: placePanels(c.config, c.area, c.editing, c.sections, 4, c.fit) }));
if (process.env.WRITE_CASES) writeFileSync(new URL("../../../tests/tablet_cases.json", import.meta.url), JSON.stringify(results, null, 1) + "\n");

test("the cases are the inputs here", () => {
  assert.deepEqual(
    saved.map(({ expect: _, ...c }) => c),
    INPUTS.map((c) => JSON.parse(JSON.stringify(c))),
  );
});
for (const c of saved as unknown as (Case & { expect: Placement })[])
  test(c.name, () => assert.deepEqual(placePanels(c.config, c.area, c.editing, c.sections, 4, c.fit), c.expect));

const sizes = (tracks: string) => [...tracks.matchAll(/(\d+(?:\.\d+)?)(?:px|fr)/g)].map((m) => Number(m[1]));
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

for (const c of results) {
  test(`${c.name}: fills its area, never a negative track`, () => {
    const p = c.expect;
    for (const n of [...sizes(p.columns), ...sizes(p.rows)]) assert.ok(n >= 0, `${n} in ${p.columns} / ${p.rows}`);
    assert.equal(sum(sizes(p.columns)), p.canvas[0]);
    assert.equal(sum(sizes(p.rows)), p.canvas[1]);
    // In edit mode only the margin's small sides are inside the area, the rest round it.
    const [t, r, b, l] = p.inset.map((v) => (!c.editing || c.fit || v <= SQUEEZE ? v : 0));
    const room = [c.area[0] - r - l, c.area[1] - t - b];
    if (c.editing && !c.fit && depthOf(c.sections) > 1) {
      // Grown outwards: the innermost layer has the area.
      const inner = p.boxes[p.boxes.length - 1];
      assert.deepEqual([inner[2], inner[3]], room);
    } else assert.deepEqual(p.canvas, room);
  });
  test(`${c.name}: a place for each section that shows, and only those`, () => {
    const main = c.sections.findIndex((s) => s?.place === "main" && s.shows);
    c.sections.forEach((s, n) => {
      const shows = !!s?.shows && (s.place === "main" ? n === main : c.editing || !layerOf(c.config, s.layer)[s.place]?.hidden);
      assert.equal(c.expect.places[n] !== null, shows, `section ${n}`);
    });
  });
  test(`${c.name}: each in its layer's room, a stack's panels apart`, () => {
    c.expect.places.forEach((p, n) => {
      if (!p) return;
      const [bx, by, bw, bh] = c.expect.boxes[(c.sections[n]!.place === "main" ? c.expect.boxes.length : c.sections[n]!.layer) - 1];
      const [x, y, w, h] = p.rect;
      assert.ok(x >= bx && y >= by && x + w <= bx + bw && y + h <= by + bh, `section ${n} ${p.rect} out of ${[bx, by, bw, bh]}`);
    });
    for (const s of c.sections) {
      if (!s) continue;
      const stack = c.sections.flatMap((t, n) => (t?.layer === s.layer && t.place === s.place && s.place !== "main" && c.expect.places[n] ? [c.expect.places[n]!.rect] : []));
      const along = s.place === "top" || s.place === "bottom" ? 0 : 1;
      stack.sort((a, b) => a[along] - b[along]);
      for (let i = 1; i < stack.length; i++) assert.ok(stack[i][along] >= stack[i - 1][along] + stack[i - 1][along + 2], `${s.place}: ${stack[i]} over ${stack[i - 1]}`);
    }
  });
}

// Found 2026-10-07: an empty top or bottom panel of size: auto is none tall, so its grid lines
// were the same as the next; the sides ran through its rows, and in edit mode, where it
// grows to hold HA's Add card, stood beside it.
for (const c of results) {
  test(`${c.name}: no two sections share a grid cell`, () => {
    const cells = new Map<string, number>();
    c.expect.places.forEach((at, n) => {
      if (!at) return;
      const [c0, c1] = at.column.split(" / ").map(Number);
      const [r0, r1] = at.row.split(" / ").map(Number);
      assert.ok(c0 < c1 && r0 < r1, `section ${n} has no cell: ${at.column}, ${at.row}`);
      for (let x = c0; x < c1; x++)
        for (let y = r0; y < r1; y++) {
          const was = cells.get(`${x},${y}`);
          assert.equal(was, undefined, `sections ${n} and ${was} both in column ${x}, row ${y}`);
          cells.set(`${x},${y}`, n);
        }
    });
  });
}

test("edit mode gives the panels the shape they have out of it", () => {
  const hides = (c: Case) => JSON.stringify(c.config).includes('"hidden":true'); // shown in edit mode
  for (const c of results.filter((c) => !c.editing && !c.config.margin && depthOf(c.sections) === 1 && !hides(c))) {
    const edit = placePanels(c.config, c.area, true, c.sections);
    assert.deepEqual(sizes(edit.columns), sizes(c.expect.columns), c.name);
    assert.deepEqual(sizes(edit.rows), sizes(c.expect.rows), c.name);
    assert.deepEqual(
      edit.places.map((p) => p && [p.column, p.row]),
      c.expect.places.map((p) => p && [p.column, p.row]),
      c.name,
    );
  }
});

test("edit mode with layers: each outer edge as it is out of edit mode, round the area", () => {
  for (const c of results.filter((c) => !c.editing && depthOf(c.sections) > 1 && !c.config.margin)) {
    const edit = placePanels(c.config, c.area, true, c.sections);
    c.expect.places.forEach((p, n) => {
      const s = c.sections[n];
      if (!p || !s || s.place === "main" || s.layer === depthOf(c.sections)) return;
      const across = s.place === "top" || s.place === "bottom";
      assert.equal(edit.places[n]!.rect[across ? 3 : 2], p.rect[across ? 3 : 2], `${c.name}: section ${n}`);
    });
  }
});

test("a section's panel: its view_layout, else by position", () => {
  assert.deepEqual(placeOf({ type: "grid" }, 2), { layer: 1, place: "top" });
  assert.equal(placeOf({ type: "grid" }, 5), null); // past five: none
  assert.deepEqual(placeOf({ view_layout: { panel: "left" } }, 0), { layer: 1, place: "left" });
  assert.deepEqual(placeOf({ view_layout: { panel: "bottom", layer: 4 } }, 9), { layer: 4, place: "bottom" });
  assert.equal(placeOf({ view_layout: { panel: "bottom", layer: 5 } }, 0), null);
  assert.equal(placeOf({ view_layout: { panel: "middle" } }, 0), null);
});

test("a section's card columns: side by side all of them, else the widest", () => {
  const cards = [{ columns: 6 }, {}, { columns: "full" }, { columns: 2, min_columns: 3 }, { columns: 9, max_columns: 6 }];
  assert.equal(cardColumns(cards, true), 6 + 12 + 12 + 3 + 6);
  assert.equal(cardColumns(cards, false), 12);
  assert.equal(cardColumns([], true), 0);
});

test("card columns' width: HA's, 12 a section, its gap between them", () => {
  assert.equal(cardsWidth(12, 1180, 4), 289); // one section of four, less the gap after it
  assert.equal(cardsWidth(48, 1180, 4), 1180); // all of them
  assert.equal(cardsWidth(0, 1180, 4), 0);
});

test("sections restacked: each names its panel, a new one empty, those of no panel after", () => {
  const old = [{ type: "grid", cards: [1] }, { type: "grid", cards: [2], view_layout: { panel: "top", layer: 1, counts: false } }, { cards: [3] }, { cards: [4] }, { cards: [5] }, { cards: [6] }];
  const drafts = draftsOf(old);
  assert.deepEqual(drafts.map((d) => [d.from, d.place]), [[0, "main"], [1, "top"], [2, "top"], [3, "right"], [4, "bottom"]]);
  assert.deepEqual(restack(old, drafts), old); // nothing moved
  const moved = [drafts[0], drafts[2], drafts[1], { from: null, layer: 2, place: "left" as const }, drafts[3], drafts[4]];
  assert.deepEqual(restack(old, moved), [
    { type: "grid", cards: [1], view_layout: { panel: "main" } },
    { cards: [3], view_layout: { panel: "top" } },
    { type: "grid", cards: [2], view_layout: { panel: "top", counts: false } },
    { type: "grid", cards: [], view_layout: { panel: "left", layer: 2 } },
    { cards: [4], view_layout: { panel: "right" } },
    { cards: [5], view_layout: { panel: "bottom" } },
    { cards: [6] }, // past five, no panel
  ]);
});

test("one value for every side, or each its own", () => {
  assert.deepEqual(sides(8), [8, 8, 8, 8]);
  assert.deepEqual(sides({ top: 4, left: 12 }), [4, 0, 0, 12]);
  assert.deepEqual(sides(undefined), [0, 0, 0, 0]);
  assert.deepEqual(sides(-3), [0, 0, 0, 0]);
});

test("a line in a gap: along its middle, knocked across, run past or short of its ends", () => {
  const across: Gap = { id: "1.top", edge: { layer: 1, place: "top" }, size: 8, across: true, column: [1, 2], row: [2, 3], rect: [0, 100, 400, 8] };
  const down: Gap = { id: "after.3", after: 3, size: 10, across: false, column: [2, 3], row: [1, 2], rect: [200, 0, 10, 300] };
  const lines = gapLines([across, down], (g) => (g === across ? {} : { width: 3, color: [255, 0, 0], style: "dashed", knock: 2, extend_start: 5, extend_end: -10 }));
  assert.deepEqual(lines, [
    { id: "1.top", x1: 0, y1: 104, x2: 400, y2: 104, color: "#000", width: 1, style: "solid" }, // by default: black, 1 px, solid, the gap's length
    { id: "after.3", x1: 207, y1: -5, x2: 207, y2: 290, color: "rgb(255, 0, 0)", width: 3, style: "dashed" },
  ]);
  assert.deepEqual(gapLines([across], () => undefined), []); // no line: none drawn
});

test("a gap is there only while what makes it shows", () => {
  const p = placePanels({}, IPAD, false, [at("main"), at("left", { tall: 200 }), at("left", { tall: 150, shows: false }), at("left", { tall: 100 }), at("top", { shows: false })]);
  assert.deepEqual(
    p.gaps.map((g) => g.id),
    ["1.left", "after.1"], // left's to the middle, and after LEFT 1 to LEFT 3 (LEFT 2 and the top hidden)
  );
});

test("a layer's options: the layout's, then each inner one's", () => {
  const l = { gap: 8, top: { size: 10 }, inner: { left: { size: 30 }, inner: { right: { size: 5 } } } };
  assert.equal(layerOf(l, 1), l);
  assert.deepEqual(layerOf(l, 3), { right: { size: 5 } });
  assert.deepEqual(layerOf(l, 4), {});
  assert.deepEqual(withLayer({ gap: 8 }, 3, (c) => ({ ...c, top: { size: 1 } })), { gap: 8, inner: { inner: { top: { size: 1 } } } });
});

test("a section's stack and name: its layer past the first, its place in a stack of more", () => {
  const where = [at("main"), at("top"), at("left"), at("top"), at("top", { layer: 2 }), null];
  assert.deepEqual(stackOf(where, 3), [1, 3]);
  assert.deepEqual(stackOf(where, 0), [0]);
  assert.deepEqual(stackOf(where, 5), []);
  assert.deepEqual(
    where.map((_, n) => panelName(where, n)),
    ["Main", "Top 1", "Left", "Top 2", "L2 Top", ""],
  );
});

// 2026.10.3-b74: OK in the (since removed) Tablet Layout dialog saved the view, and HA builds a new one in
// edit mode; it must find what the old one saw out of edit mode.
test("a view's sizes seen out of edit mode outlive the view", () => {
  seenOut("wall-tablets", 0).shown = [1180, 760];
  seenOut("wall-tablets", 0).naturals["2"] = 42;
  assert.deepEqual(seenOut("wall-tablets", 0), { shown: [1180, 760], naturals: { "2": 42 } });
  assert.deepEqual(seenOut("wall-tablets", 1), { naturals: {} }); // each view its own
});
