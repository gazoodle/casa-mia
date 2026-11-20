// The rows a family's rooms stand in: widths and row breaks for the least height.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bays, rows } from "./pack.ts";

// A thing of `cells` squares, each 10 tall: at a width it is as many rows of them as it needs.
const squares = (cells: number[]) => (i: number, wide: number) => Math.ceil(cells[i] / wide) * 10;
const height = (cells: number[], columns: number) => {
  const placed = rows(cells.length, squares(cells), columns);
  // A row is as tall as its tallest column, and a column as the things in it together.
  const tall = new Map<number, number>();
  for (const bay of bays(placed)) tall.set(bay.row, Math.max(tall.get(bay.row) ?? 0, bay.things.reduce((sum, i) => sum + squares(cells)(i, bay.wide), 0)));
  return [...tall.values()].reduce((sum, h) => sum + h, 0);
};

test("small things share a row, each one column wide, in their order", () => {
  assert.deepEqual(rows(3, squares([1, 1, 1]), 5), [{ wide: 1, first: true, under: false }, { wide: 1, first: false, under: false }, { wide: 1, first: false, under: false }]);
  assert.deepEqual(rows(0, squares([]), 5), []);
});

test("a big thing is widened until it is no taller than the row needs", () => {
  // Twelve squares beside two: at four wide the big one is three rows, and the small one has the last column.
  assert.deepEqual(rows(2, squares([12, 2]), 5).map((p) => p.wide), [4, 1]);
});

test("a row never holds more columns than the page has, and no thing is left out", () => {
  const cells = [9, 1, 30, 2, 2, 14, 1, 1, 6, 40, 3];
  for (const columns of [1, 2, 5, 7]) {
    const placed = rows(cells.length, squares(cells), columns);
    assert.equal(placed.length, cells.length);
    assert.ok(placed[0].first);
    for (const bay of bays(placed)) assert.ok(bay.column + bay.wide - 1 <= columns, `${columns} columns`);
    assert.deepEqual(bays(placed).flatMap((bay) => bay.things), cells.map((_, i) => i));
  }
});

test("one tall thing does not set the height of rows it is not in", () => {
  // The fault this replaced: the tallest room's height was every room's limit, so the
  // rest stayed one wide and stood as columns. By that rule these were 220 tall.
  const cells = [40, 8, 8, 8, 8, 8];
  assert.equal(height(cells, 5), 160);
});

test("a spare column goes only to a thing it makes shorter", () => {
  // One square can't be made shorter: it stays one wide though the row has room.
  assert.deepEqual(rows(1, squares([1]), 5), [{ wide: 1, first: true, under: false }]);
  // Four squares alone take the columns that flatten them, and no more.
  assert.deepEqual(rows(1, squares([4]), 7).map((p) => p.wide), [4]);
});

test("small things stand one under another beside a tall one, but not where they are to be kept apart", () => {
  // Three of one square beside nine squares, which are three rows at three wide: in rows of their own they would be 40 tall.
  const cells = [1, 1, 1, 9];
  const placed = rows(cells.length, squares(cells), 4);
  assert.deepEqual(bays(placed), [{ row: 0, column: 1, wide: 1, things: [0, 1, 2] }, { row: 0, column: 2, wide: 3, things: [3] }]);
  // The second may not stand under the first (it is on another floor): it has a column of its own.
  const kept = rows(cells.length, squares(cells), 5, 0, (i) => i === 1);
  assert.deepEqual(bays(kept).map((bay) => bay.things), [[0], [1, 2], [3]]);
  // No stack is of more than three, however many would fit.
  assert.ok(bays(rows(8, squares([1, 1, 1, 1, 1, 1, 1, 60]), 4)).every((bay) => bay.things.length <= 3));
});
