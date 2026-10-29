// What the live caption may claim (common.ts: liveClaim). Fail-safe: live only on a
// recent frame; no state a stall can stay in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIVE_LEASE_MS, ago, liveClaim } from "./common.ts";

const now = 10_000_000;

test("live only while frames are recent; lost since the last one after", () => {
  assert.deepEqual(liveClaim(now - 60_000, now - 100, now), { live: true });
  assert.deepEqual(liveClaim(now - 60_000, now - LIVE_LEASE_MS, now), { lost: "5 s" });
  assert.deepEqual(liveClaim(now - 3_600_000, now - 50 * 60_000, now), { lost: "50 min" });
});

test("no frame yet: a moment's grace from the start, then lost since the start", () => {
  assert.equal(liveClaim(now - 1_000, 0, now), null);
  assert.deepEqual(liveClaim(now - 3 * 60_000, 0, now), { lost: "3 min" });
});

test("no start known and no frame: lost, never live", () => {
  assert.ok("lost" in (liveClaim(0, 0, now) ?? {}));
});

test("how long, as people say it", () => {
  assert.equal(ago(12_400), "12 s");
  assert.equal(ago(4 * 60_000 + 5_000), "4 min");
  assert.equal(ago(2 * 3_600_000 + 5 * 60_000), "2 h 5 min");
  assert.equal(ago(3_600_000), "1 h");
});
