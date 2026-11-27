import assert from "node:assert/strict";
import test from "node:test";
import { cardsOf, PlaceCards, type Wrapper } from "./place.ts";

const hass = { states: {}, callService: async () => undefined };

function wrapper(defined = true) {
  const made: any[] = [];
  let define = () => undefined as void;
  const w: Wrapper & { made: any[]; define(): void } = {
    made,
    defined: () => defined,
    whenDefined: () => new Promise((done) => (define = () => ((defined = true), done(undefined)))),
    make: (config) => (made.push({ config }), made.at(-1)),
    define: () => define(),
  };
  return w;
}

test("the list, b19's single card as a list of one, and no card being typed", () => {
  assert.deepEqual(cardsOf(undefined), []);
  assert.deepEqual(cardsOf({ card: { type: "clock" } }), [{ type: "clock" }]);
  assert.deepEqual(cardsOf({ cards: [{ type: "clock" }], card: { type: "button" } }), [{ type: "clock" }]); // the list wins
  assert.deepEqual(cardsOf({ cards: [{ type: "" }, { type: "clock" }] }), [{ type: "clock" }]);
});

test("each card is made once, kept while its config is unchanged, and given the states", () => {
  const w = wrapper();
  const place = new PlaceCards(() => undefined, w);
  const [alerts, clock] = place.elements([{ type: "alerts" }, { type: "clock" }], hass, false);
  assert.equal(w.made.length, 2);
  assert.equal(alerts.hass, hass);
  assert.equal(clock.preview, false);

  // one edited: only it is made again; the order is the list's
  const again = place.elements([{ type: "clock" }, { type: "alerts", title: "Now" }], hass, true);
  assert.equal(again[0], clock);
  assert.notEqual(again[1], alerts);
  assert.equal(w.made.length, 3);
  assert.equal(again[0].preview, true);

  // the same config twice: an element each
  const twice = place.elements([{ type: "clock" }, { type: "clock" }], hass, false);
  assert.notEqual(twice[0], twice[1]);
  assert.deepEqual(place.elements([], hass, false), []);
});

test("a page without hui-card yet waits for it, then draws", async () => {
  const w = wrapper(false);
  let changes = 0;
  const place = new PlaceCards(() => changes++, w);
  assert.deepEqual(place.elements([{ type: "clock" }], hass, false), []);
  place.elements([{ type: "clock" }], hass, false); // asked again while waiting: one wait
  w.define();
  await new Promise((done) => setTimeout(done));
  assert.equal(changes, 1);
  assert.equal(place.elements([{ type: "clock" }], hass, false).length, 1);
  assert.equal(place.failed, "");
});

test("a page where hui-card never comes says so", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const error = console.error;
  console.error = () => undefined; // it is logged; `failed` is what is checked
  try {
    let changes = 0;
    const place = new PlaceCards(() => changes++, wrapper(false));
    place.elements([{ type: "clock" }], hass, false);
    t.mock.timers.tick(10_000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.match(place.failed, /hui-card/);
    assert.equal(changes, 1);
  } finally {
    console.error = error;
  }
});
