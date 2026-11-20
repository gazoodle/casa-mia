// The agent's column as the desk prints it: filed, lapsed, late and awaited.
import assert from "node:assert/strict";
import { test } from "node:test";
import { desk } from "./column.ts";

const AT = 1_794_800_000; // s
const paper = { head: "All quiet", body: ["Nothing stirs."], items: [] };
const column = { by: "Juniper", at: AT, papers: { broadsheet: paper }, writing: null, late: null };

test("no column, no desk", () => {
  assert.equal(desk(undefined, "broadsheet", 0), undefined);
  assert.equal(desk({}, "broadsheet", 0), undefined);
});

test("a column is filed at its summary's time, and lapses an hour after it", () => {
  const filed = desk(column, "broadsheet", AT * 1000 + 59 * 60_000)!;
  assert.deepEqual([filed.by, filed.paper, filed.at, filed.lapsed], ["Juniper", paper, AT * 1000, false]);
  assert.equal(desk(column, "broadsheet", AT * 1000 + 61 * 60_000)!.lapsed, true);
});

test("a late column keeps the last one, and says why and since when", () => {
  const late = desk({ ...column, late: { reason: "the model didn't answer", since: AT + 60 } }, "broadsheet", AT * 1000)!;
  assert.equal(late.paper, paper);
  assert.deepEqual(late.late, { reason: "the model didn't answer", since: (AT + 60) * 1000 });
});

test("with no column yet, the copy is awaited, since the write began", () => {
  const awaited = desk({ by: null, at: null, papers: null, writing: AT, late: null }, "tabloid", AT * 1000)!;
  assert.deepEqual([awaited.paper, awaited.at, awaited.lapsed, awaited.writing], [undefined, undefined, false, AT * 1000]);
});
