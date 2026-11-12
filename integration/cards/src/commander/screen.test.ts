// The Camera Commander's Full screen button (screen.ts): the standard Fullscreen API, and
// the webkit names of an iPad before iPadOS 16.4.
import assert from "node:assert/strict";
import test from "node:test";
import { canFill, fill, filling } from "./screen.ts";

test("offered only where the page may take the screen", () => {
  assert.equal(canFill({ fullscreenEnabled: true }), true);
  assert.equal(canFill({ webkitFullscreenEnabled: true }), true);
  assert.equal(canFill({ fullscreenEnabled: false, webkitFullscreenEnabled: true }), false); // a frame not allowed it
  assert.equal(canFill({}), false); // Safari on an iPhone
});

test("something has the screen under either name", () => {
  assert.equal(filling({ fullscreenElement: {} }), true);
  assert.equal(filling({ fullscreenElement: null, webkitFullscreenElement: {} }), true);
  assert.equal(filling({ fullscreenElement: null }), false);
  assert.equal(filling({}), false);
});

test("the standard calls are used where they exist, the webkit ones elsewhere", () => {
  const calls: string[] = [];
  const said = (name: string) => () => {
    calls.push(name);
    return Promise.resolve();
  };
  const old = (name: string) => () => void calls.push(name);

  fill({ requestFullscreen: said("request"), webkitRequestFullscreen: old("webkit request") }, true, {});
  fill({}, false, { exitFullscreen: said("exit"), webkitExitFullscreen: old("webkit exit") });
  fill({ webkitRequestFullscreen: old("webkit request") }, true, {});
  fill({}, false, { webkitExitFullscreen: old("webkit exit") });

  assert.deepEqual(calls, ["request", "exit", "webkit request", "webkit exit"]);
});

test("a refusal is said, not thrown", async (t) => {
  const warn = t.mock.method(console, "warn", () => undefined);
  fill({ requestFullscreen: () => Promise.reject(new Error("not from a tap")) }, true, {});
  await new Promise((done) => setImmediate(done));
  assert.match(String(warn.mock.calls[0].arguments[0]), /full screen refused: not from a tap/);
});
