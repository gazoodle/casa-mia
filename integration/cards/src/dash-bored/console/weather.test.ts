import assert from "node:assert/strict";
import { test } from "node:test";
import { bearing } from "./bakelite/weather.ts";
import { shown } from "./weather.ts";

// Home Assistant's words for the weather (its weather integration's conditions).
const WORDS = ["clear-night", "cloudy", "exceptional", "fog", "hail", "lightning", "lightning-rainy", "partlycloudy", "pouring", "rainy", "snowy", "snowy-rainy", "sunny", "windy", "windy-variant"];

test("each of Home Assistant's words for the weather has a place on the dial, a slip and a picture", () => {
  for (const word of WORDS) {
    const [place, slip, picture] = shown(word);
    assert.ok(place >= 0 && place <= 4, word);
    assert.ok(slip && picture, word);
    assert.ok(Math.abs(bearing(place)) <= 96, word);
  }
  // The worst is at the far left and the best at the far right.
  assert.ok(shown("lightning-rainy")[0] < shown("rainy")[0]);
  assert.ok(shown("rainy")[0] < shown("cloudy")[0]);
  assert.ok(shown("cloudy")[0] < shown("sunny")[0]);
  // Snow and rain share a place: the slip is what tells them apart.
  assert.equal(shown("snowy")[0], shown("rainy")[0]);
  assert.notEqual(shown("snowy")[1], shown("rainy")[1]);
});

test("a word nobody knows is at Change, under its own name", () => {
  assert.deepEqual(shown("volcanic_ash"), [2, "volcanic ash", "cloud"]);
});
