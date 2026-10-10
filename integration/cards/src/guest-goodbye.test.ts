// The guest's goodbye: when a page moves to the goodbye, and when it stays.
import assert from "node:assert/strict";
import { test } from "node:test";
import { goodbye } from "./guest-goodbye.ts";

const ME = { id: "u1" };
const sw = (id: string, state: string, attrs: object = {}) => ({
  entity_id: `switch.${id}`,
  state,
  attributes: { guest_user_id: "u1", signs_out: true, guest_port: 8675, ...attrs },
});
const look = (seen: Map<string, boolean>, states: ReturnType<typeof sw>[], now = 1_000_000) =>
  goodbye(Object.fromEntries(states.map((s) => [s.entity_id, s])), ME, seen, now, "192.0.2.1");

test("goes to the goodbye when its endpoint closes", () => {
  const seen = new Map();
  assert.equal(look(seen, [sw("oak", "on")]), null);
  assert.equal(look(seen, [sw("oak", "off")]), "http://192.0.2.1:8675/bye");
});

test("a set address wins", () => {
  const seen = new Map();
  look(seen, [sw("oak", "on", { goodbye_url: "https://example.com/" })]);
  assert.equal(look(seen, [sw("oak", "off", { goodbye_url: "https://example.com/" })]), "https://example.com/");
});

test("a timed opening's page moves on the second, before it hears of the close", () => {
  const seen = new Map();
  assert.equal(look(seen, [sw("oak", "on", { closes_at: 1000 })], 999_000), null);
  assert.equal(look(seen, [sw("oak", "on", { closes_at: 1000 })], 1_000_000), "http://192.0.2.1:8675/bye");
});

test("stays while another endpoint of the same login is open", () => {
  const seen = new Map();
  look(seen, [sw("oak", "on"), sw("barn", "on")]);
  assert.equal(look(seen, [sw("oak", "off"), sw("barn", "on")]), null);
  assert.equal(look(seen, [sw("oak", "off"), sw("barn", "off")]), "http://192.0.2.1:8675/bye");
});

test("stays when nothing signs out, when already closed at load, and for others", () => {
  let seen = new Map();
  look(seen, [sw("oak", "on", { signs_out: false })]);
  assert.equal(look(seen, [sw("oak", "off", { signs_out: false })]), null);
  seen = new Map();
  assert.equal(look(seen, [sw("oak", "off")]), null); // never seen open
  assert.equal(
    goodbye({ "switch.oak": sw("oak", "off") }, { id: "u1", is_admin: true }, new Map([["switch.oak", true]]), 0, "h"),
    null,
  );
  assert.equal(goodbye({ "switch.oak": sw("oak", "off") }, { id: "u2" }, new Map([["switch.oak", true]]), 0, "h"), null);
});
