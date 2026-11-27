import assert from "node:assert/strict";
import test from "node:test";
import { moved, nameOf } from "./cards-list.ts";

test("a card moves within the list and no further", () => {
  const cards = [{ type: "a" }, { type: "b" }, { type: "c" }];
  assert.deepEqual(moved(cards, 2, -1).map((c) => c.type), ["a", "c", "b"]);
  assert.deepEqual(moved(cards, 0, 1).map((c) => c.type), ["b", "a", "c"]);
  assert.deepEqual(moved(cards, 0, -1).map((c) => c.type), ["a", "b", "c"]);
  assert.deepEqual(moved(cards, 2, 1).map((c) => c.type), ["a", "b", "c"]);
  assert.deepEqual(cards.map((c) => c.type), ["a", "b", "c"], "the list given is left as it was");
});

test("a card is named by its own name, else its type in words", () => {
  const custom = [{ type: "casa-mia-sensor-watch", name: "Sensor Watch" }];
  assert.equal(nameOf({ type: "custom:casa-mia-sensor-watch" }, custom), "Sensor Watch");
  assert.equal(nameOf({ type: "custom:someone-elses-card" }, custom), "Someone elses card");
  assert.equal(nameOf({ type: "weather-forecast" }, custom), "Weather forecast");
  assert.equal(nameOf({ type: "" }, custom), "A card");
});
