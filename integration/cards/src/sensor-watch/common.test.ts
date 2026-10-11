import { test } from "node:test";
import assert from "node:assert/strict";
import { COLUMNS, columns, since } from "./common.ts";

test("how long a level has stood", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  assert.equal(since("2026-10-11T11:59:30Z", now), "now");
  assert.equal(since("2026-10-11T11:56:00Z", now), "4 min");
  assert.equal(since("2026-10-11T09:00:00Z", now), "3 h");
  assert.equal(since("2026-10-09T12:00:00Z", now), "2 d");
  assert.equal(since("2026-10-11T12:05:00Z", now), "now"); // a clock a little ahead
});

test("a row's columns follow what it shows", () => {
  assert.equal(columns(COLUMNS), "72px minmax(0, 1fr) auto auto");
  assert.equal(columns(["message", "value"]), "minmax(0, 1fr) auto"); // the name and message share one
  assert.equal(columns(["level", "since"]), "72px auto");
});
