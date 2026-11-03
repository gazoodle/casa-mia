import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { whenConnected } from "./connection.ts";

const flush = () => new Promise((done) => setImmediate(done));
const connection = { conn: "the connection" };

beforeEach(() => {
  (globalThis as any).window = {};
  mock.timers.enable({ apis: ["setInterval"] });
});
afterEach(() => mock.timers.reset());

test("already there: used at once", async () => {
  (globalThis as any).window.hassConnection = Promise.resolve(connection);
  const got: unknown[] = [];
  whenConnected("a thing", (c) => got.push(c));
  await flush();
  assert.deepEqual(got, [connection]);
});

test("not there yet: used when it appears, once", async () => {
  const got: unknown[] = [];
  whenConnected("a thing", (c) => got.push(c));
  mock.timers.tick(1000);
  await flush();
  assert.deepEqual(got, []);

  (globalThis as any).window.hassConnection = Promise.resolve(connection);
  mock.timers.tick(5000);
  await flush();
  assert.deepEqual(got, [connection]);
});

test("never there: says what is lost, once, and stops looking", (t) => {
  const error = t.mock.method(console, "error", () => {});
  whenConnected("a thing", () => assert.fail("no connection to use"));
  mock.timers.tick(59_900);
  assert.equal(error.mock.callCount(), 0);
  mock.timers.tick(100);
  mock.timers.tick(60_000);
  assert.equal(error.mock.callCount(), 1);
  assert.match(String(error.mock.calls[0].arguments[0]), /a thing won't work: .*never appeared/);
});

test("a connection that fails says so", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  (globalThis as any).window.hassConnection = Promise.reject(1);
  whenConnected("a thing", () => assert.fail("no connection to use"));
  await flush();
  assert.match(String(error.mock.calls[0].arguments[0]), /a thing won't work: .*failed \(1\)/);
});
