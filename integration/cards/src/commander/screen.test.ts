// The Camera Commander's Full screen button (screen.ts): the standard Fullscreen API, and
// the webkit names of an iPad before iPadOS 16.4.
import assert from "node:assert/strict";
import test from "node:test";
import { barRoom, canFill, canPlayFull, fill, filling, playFull } from "./screen.ts";

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

test("room is left for an iPad's status bar, and for nothing else", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
  assert.match(barRoom({ userAgent: mac, maxTouchPoints: 5 }), /24px/); // an iPad says it is a Mac
  assert.match(barRoom({ userAgent: "Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X)", maxTouchPoints: 5 }), /24px/);
  assert.doesNotMatch(barRoom({ userAgent: mac, maxTouchPoints: 0 }), /24px/); // a Mac
  assert.doesNotMatch(barRoom({ userAgent: "Mozilla/5.0 (Linux; Android 15)", maxTouchPoints: 5 }), /24px/);
});

test("a phone plays the video in its own player, and starts it again afterwards", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  let closed = () => undefined as void;
  const video = {
    webkitSupportsFullscreen: true,
    webkitEnterFullscreen: () => void calls.push("enter"),
    play: () => (calls.push("play"), Promise.resolve()),
    addEventListener: (name: string, heard: () => void) => (calls.push(name), (closed = heard)),
  };
  assert.equal(canPlayFull(video), true);
  assert.equal(canPlayFull({ ...video, webkitSupportsFullscreen: false }), false); // not begun yet

  playFull(video);
  assert.deepEqual(calls, ["webkitendfullscreen", "enter"]);
  closed(); // the phone's player closes, leaving the video paused
  t.mock.timers.tick(500);
  assert.deepEqual(calls, ["webkitendfullscreen", "enter", "play"]);
});
