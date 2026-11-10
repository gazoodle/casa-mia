// The live main camera's rules (common.ts): the lease, the mark on a channel that failed,
// and which channels are played. Fail-safe: live only on a recent frame; no state a stall
// can stay in, and no failure that stops the tries for good.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIVE_LEASE_MS, LIVE_RETRY_MAX_MS, LIVE_RETRY_MS, LIVE_WAIT_MS, PICTURE_DOWN_MS, ago, liveLapsed, liveMark, liveOrder, livePlan, pictureDown } from "./common.ts";

const now = 10_000_000;

test("a session holds only while frames are recent", () => {
  assert.equal(liveLapsed(now - 60_000, now - 100, now), null);
  assert.equal(liveLapsed(now - 60_000, now - LIVE_LEASE_MS, now), "the video stopped");
});

test("no frame yet: it has the wait from its start, then it has failed", () => {
  assert.equal(liveLapsed(now - LIVE_WAIT_MS + 1, 0, now), null);
  assert.equal(liveLapsed(now - LIVE_WAIT_MS, 0, now), "no video arrived");
  assert.equal(liveLapsed(0, 0, now), "no video arrived"); // no start known: never live
});

test("a failed channel's mark lapses, later for each failure in a row, up to the cap", () => {
  const first = liveMark(undefined, "no video arrived", now - 10_000, now);
  assert.deepEqual(first, { since: now - 10_000, until: now + LIVE_RETRY_MS, fails: 1, why: "no video arrived" });
  const second = liveMark(first, "the video stopped", now + 40_000, now + 50_000);
  assert.deepEqual(second, { since: now - 10_000, until: now + 50_000 + 2 * LIVE_RETRY_MS, fails: 2, why: "the video stopped" });
  let mark = second;
  for (let i = 0; i < 20; i++) mark = liveMark(mark, "again", now, now);
  assert.equal(mark.until, now + LIVE_RETRY_MAX_MS); // every try ends: there is no giving up
});

const channels: [string, number, number][] = [["low", 640, 360], ["medium", 1280, 720], ["high", 2560, 1440]];

test("the order to try channels: the one that fits, then down the sizes, then up", () => {
  assert.deepEqual(liveOrder(channels, [1200, 600], false), ["medium", "low", "high"]);
  assert.deepEqual(liveOrder(channels, [600, 300], false), ["low", "medium", "high"]);
  assert.deepEqual(liveOrder(channels, [4000, 3000], false), ["high", "medium", "low"]);
  assert.deepEqual(liveOrder([["only", 0, 0]], [800, 600], true), ["only"]);
});

test("the plan: the best channel with frames is shown, a better one is tried unseen", () => {
  const order = ["medium", "low", "high"];
  const plan = (live: string[], bad: string[]) => livePlan(order, (c) => live.includes(c), (c) => bad.includes(c));
  assert.deepEqual(plan([], []), { shown: undefined, tried: "medium" }); // the start
  assert.deepEqual(plan(["medium"], []), { shown: "medium", tried: undefined });
  assert.deepEqual(plan([], ["medium"]), { shown: undefined, tried: "low" }); // down the sizes
  assert.deepEqual(plan(["low"], ["medium"]), { shown: "low", tried: undefined });
  assert.deepEqual(plan(["low"], []), { shown: "low", tried: "medium" }); // its mark lapsed: tried under the one shown
  assert.deepEqual(plan(["medium", "low"], []), { shown: "medium", tried: undefined }); // and it took over
  assert.deepEqual(plan([], order), { shown: undefined, tried: undefined }); // all bad: the drawn picture
});

test("how long, as people say it", () => {
  assert.equal(ago(12_400), "12 s");
  assert.equal(ago(4 * 60_000 + 5_000), "4 min");
  assert.equal(ago(2 * 3_600_000 + 5 * 60_000), "2 h 5 min");
  assert.equal(ago(3_600_000), "1 h");
});

test("the picture failing: said from the first error, until none comes for a while", () => {
  const since = now - 3 * 60_000;
  assert.equal(pictureDown(since, now - 2_000, now), "Picture failing for 3 min: retrying");
  assert.equal(pictureDown(now - 5_000, now - 5_000, now), "Picture failing for 5 s: retrying");
  assert.equal(pictureDown(since, now - PICTURE_DOWN_MS, now), null); // lapsed: no error since
  assert.equal(pictureDown(0, 0, now), null); // never failed
});
