import assert from "node:assert/strict";
import test from "node:test";
import { PlaceCard } from "./place.ts";

const hass = { states: {}, callService: async () => undefined };
const tick = () => new Promise((done) => setTimeout(done));

test("a card is made once for its config, given the states, and made again when it changes", async () => {
  const made: any[] = [];
  let changes = 0;
  const helpers = async () => ({ createCardElement: (config: any) => (made.push({ config }), made.at(-1)) });
  const place = new PlaceCard(() => changes++, helpers);

  assert.equal(place.element({ type: "clock" }, hass), undefined); // not made yet
  await tick();
  assert.equal(changes, 1);
  const first = place.element({ type: "clock" }, hass);
  assert.equal(first, made[0]);
  assert.equal(first!.hass, hass);
  place.element({ type: "clock" }, hass);
  assert.equal(made.length, 1); // kept

  place.element({ type: "grid", cards: [] }, hass);
  await tick();
  assert.equal(place.element({ type: "grid", cards: [] }, hass), made[1]);
  assert.equal(place.element(undefined, hass), undefined); // taken out of the config
  await tick();
  assert.equal(made.length, 2);
});

test("helpers that won't load are said, not hidden, and a new config tries again", async () => {
  let changes = 0;
  let fail = true;
  const helpers = async () => {
    if (fail) throw new Error("no helpers");
    return { createCardElement: (config: any) => ({ config }) as any };
  };
  const error = console.error;
  console.error = () => undefined; // it is logged, which is checked by `failed` being set
  try {
    const place = new PlaceCard(() => changes++, helpers);
    place.element({ type: "clock" }, hass);
    await tick();
    assert.equal(place.failed, "no helpers");
    assert.equal(changes, 1);

    fail = false;
    place.element({ type: "clock", time_format: "24" }, hass);
    await tick();
    assert.equal(place.failed, "");
    assert.ok(place.element({ type: "clock", time_format: "24" }, hass));
  } finally {
    console.error = error;
  }
});
