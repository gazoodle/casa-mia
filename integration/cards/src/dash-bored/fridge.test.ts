import assert from "node:assert/strict";
import { test } from "node:test";
import { pick, tilt } from "./fridge/magnets.ts";
import { SKINS } from "./fridge/skins.ts";
import { today } from "./fridge/today.ts";

test("a magnet's place and its tilt are the same every time, and within bounds", () => {
  for (const id of ["light.kitchen", "camera.entrance", "lock.front_door", "x", ""]) {
    assert.equal(pick(id, 7), pick(id, 7));
    assert.ok(pick(id, 7) >= 0 && pick(id, 7) < 7);
    assert.equal(tilt(id), tilt(id));
    assert.ok(Math.abs(Number(tilt(id, 4))) <= 4);
    // Nothing on the door is dead straight.
    assert.notEqual(Number(tilt(id, 4)), 0);
  }
  // Different things mostly sit differently.
  assert.ok(new Set(["a", "b", "c", "d", "e", "f"].map((id) => tilt(id, 5))).size > 3);
});

test("every household has a butterfly for its first camera, and magnets that are drawn", async () => {
  const { NOVELTIES } = await import("./fridge/magnets.ts");
  assert.equal(SKINS.length, 3);
  for (const skin of SKINS) {
    assert.equal(skin.holders[0], "butterfly");
    for (const name of [...skin.holders, skin.picker, skin.extra.holder]) assert.ok(name in NOVELTIES, `${skin.id}: ${name}`);
    assert.ok(skin.colours.length > 2 && skin.words.length > 3);
  }
});

test("the notepad says what the day comes to, and shouts about a lock that is undone", () => {
  const device = (kind: string, name: string, on: boolean) => ({ id: `${kind}.${name}`, name, kind, on, dims: false, span: { min: 0, max: 100, step: 1, vote: 10 }, away: false, since: 0, guarded: kind === "lock", room: "Hall" });
  const house: any = {
    rooms: [{ id: "hall", name: "Hall", temp: 18.5, devices: [device("light", "Wall", true), device("light", "Porch", false), device("lock", "Front door", false)] }, { id: "study", name: "Study", temp: 21, devices: [] }],
    people: [{ id: "person.ann", name: "Ann", place: "home", since: 0 }, { id: "person.ben", name: "Ben", place: "not_home", since: 0 }],
    gaps: [], scenes: [], appliances: [], kw: 0.531, outside: { temp: 9.26, sky: "partlycloudy", id: "weather.home", daily: false },
  };
  assert.deepEqual(today(house), ["1 light on", "Using 0.53 kW", "Hall Front door is UNLOCKED!", "Outside: 9.3°, partly cloudy", "Warmest: Study 21.0°", "Coldest: Hall 18.5°", "In: Ann"]);
  // An empty house has little to say, and says nothing it doesn't know.
  assert.deepEqual(today({ rooms: [], people: [], gaps: [], scenes: [], appliances: [] }), ["All the lights are off"]);
});
