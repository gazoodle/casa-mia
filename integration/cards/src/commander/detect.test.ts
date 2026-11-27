// Which detections the main camera's caption shows, and for how long (detect.ts).
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { Detect, detected, KINDS, kindOf, latest } from "./detect.ts";

const NOW = Date.parse("2026-11-27T12:00:00Z");
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
/** Event entities as Home Assistant gives them: the state is when each last fired. */
const hass = (states: Record<string, [number, Record<string, unknown>]>) => ({
  states: Object.fromEntries(Object.entries(states).map(([id, [ago, attributes]]) => [id, { state: at(ago), attributes, last_changed: at(ago) }])),
  callService: async () => undefined,
});
// One invented camera's entities, as the Main camera select's `detections` gives them.
const GATE = {
  "event.gate_object": "smart_detection",
  "event.gate_vehicle": "vehicle",
  "event.gate_package": "package",
  "event.gate_sound": "sound_detection",
  "event.gate_motion": "motion_detection",
  "event.gate_ring": "doorbell",
  "event.gate_fingerprint": "fingerprint",
};

test("each kind in the table, and a detected that takes its entity's kind", () => {
  for (const kind of ["person", "animal", "face", "license_plate"]) {
    const [d] = detected(hass({ "event.gate_object": [2, { event_type: kind, event_id: "e1" }] }), GATE, 10, NOW);
    assert.deepEqual(d, { kind, text: KINDS[kind].label, since: NOW - 2000 });
  }
  const [parcel] = detected(hass({ "event.gate_package": [1, { event_type: "detected", event_id: "e2" }] }), GATE, 10, NOW);
  assert.equal(parcel.kind, "package");
  const [ring] = detected(hass({ "event.gate_ring": [1, { event_type: "ring", event_id: "e3" }] }), GATE, 10, NOW);
  assert.equal(ring.text, "Doorbell");
  const [glass] = detected(hass({ "event.gate_sound": [1, { event_type: "glass_break", event_id: "e4" }] }), GATE, 10, NOW);
  assert.equal(glass.text, "Glass breaking");
});

test("motion is left to the dot", () => {
  assert.deepEqual(detected(hass({ "event.gate_motion": [1, { event_type: "motion", event_id: "e5" }] }), GATE, 10, NOW), []);
});

test("an unknown kind is the word itself, never dropped", () => {
  const [d] = detected(hass({ "event.gate_object": [1, { event_type: "garden_gnome", event_id: "e6" }] }), GATE, 10, NOW);
  assert.equal(d.text, "garden gnome");
  assert.equal(kindOf("garden_gnome").tone, "muted");
});

test("a plate, or a fingerprint's name, is what the chip says", () => {
  const [car] = detected(hass({ "event.gate_vehicle": [1, { event_type: "detected", event_id: "e7", license_plate: "AB12 CDE" }] }), GATE, 10, NOW);
  assert.deepEqual([car.kind, car.text], ["vehicle", "AB12 CDE"]);
  const [who] = detected(hass({ "event.gate_fingerprint": [1, { event_type: "identified", full_name: "Ann Example" }] }), GATE, 10, NOW);
  assert.equal(who.text, "Ann Example");
});

test("one event on two entities is one detection, and the one with the plate wins", () => {
  const both = hass({
    "event.gate_object": [1, { event_type: "vehicle", event_id: "e8" }],
    "event.gate_vehicle": [1, { event_type: "detected", event_id: "e8", license_plate: "AB12 CDE" }],
  });
  assert.deepEqual(
    detected(both, GATE, 10, NOW).map((d) => d.text),
    ["AB12 CDE"],
  );
  // The other way round in the attribute's order: the plate still wins.
  const reversed = { "event.gate_vehicle": "vehicle", "event.gate_object": "smart_detection" };
  assert.deepEqual(
    detected(both, reversed, 10, NOW).map((d) => d.text),
    ["AB12 CDE"],
  );
});

test("current for the linger, newest first, then gone", () => {
  const states = hass({
    "event.gate_object": [9, { event_type: "person", event_id: "e9" }],
    "event.gate_ring": [2, { event_type: "ring", event_id: "e10" }],
    "event.gate_sound": [30, { event_type: "bark", event_id: "e11" }],
  });
  assert.deepEqual(
    detected(states, GATE, 10, NOW).map((d) => d.kind),
    ["ring", "person"],
  );
  assert.deepEqual(
    detected(states, GATE, 10, NOW + 1000).map((d) => d.kind),
    ["ring"],
  );
});

test("no entities, or none that has fired, show nothing", () => {
  const none = hass({});
  assert.deepEqual(detected(none, {}, 10, NOW), []);
  const never = { states: { "event.gate_ring": { state: "unknown", attributes: { event_type: "ring" }, last_changed: at(1) } }, callService: async () => undefined };
  assert.deepEqual(detected(never, GATE, 10, Date.now()), []);
});

test("the card is redrawn when the oldest chip is due to go, and not after stop", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: NOW });
  try {
    const d = new Detect();
    let woken = 0;
    const ring = hass({ "event.gate_ring": [3, { event_type: "ring", event_id: "e12" }] });
    assert.equal(d.seen(ring, GATE, {}, 10, () => woken++).length, 1);
    mock.timers.tick(6999); // 7 s left of its 10
    assert.equal(woken, 0);
    mock.timers.tick(100);
    assert.equal(woken, 1);
    assert.equal(d.seen(ring, GATE, {}, 10, () => woken++).length, 0); // gone: no timer

    const person = hass({ "event.gate_object": [0, { event_type: "person", event_id: "e13" }] });
    d.seen(person, GATE, {}, 10, () => woken++);
    d.stop();
    mock.timers.tick(20000);
    assert.equal(woken, 1);
  } finally {
    mock.timers.reset();
  }
});

test("the latest detection, however long ago, with motion left out; none, null", () => {
  const states = hass({
    "event.gate_object": [3600, { event_type: "person", event_id: "e14" }],
    "event.gate_ring": [86400 * 3, { event_type: "ring", event_id: "e15" }],
    "event.gate_motion": [5, { event_type: "motion", event_id: "e16" }],
  });
  assert.deepEqual(latest(states, GATE, {}), { kind: "person", text: "Person", since: NOW - 3600_000 });
  assert.equal(latest(hass({ "event.gate_motion": [5, { event_type: "motion", event_id: "e17" }] }), GATE, {}), null);
  assert.equal(latest(hass({}), {}, {}), null);
});

test("an entity that lost its time in a restart takes it from fired, else is left out", () => {
  // As on a box after a restart: the person's entity is unknown, its event kept; the
  // vehicle's kept its time, a day old.
  const states = hass({
    "event.gate_object": [0, { event_type: "person", event_id: "e18" }],
    "event.gate_vehicle": [86400, { event_type: "detected", event_id: "e19" }],
  });
  states.states["event.gate_object"].state = "unknown";
  assert.deepEqual(latest(states, GATE, {}), { kind: "vehicle", text: "Vehicle", since: NOW - 86400_000 });
  assert.deepEqual(latest(states, GATE, { "event.gate_object": at(600) }), { kind: "person", text: "Person", since: NOW - 600_000 });
  // An entity with its own time keeps it, whatever fired says.
  assert.equal(latest(states, GATE, { "event.gate_vehicle": at(5) })?.since, NOW - 86400_000);
  // Lost a moment before a restart: still a chip now.
  assert.equal(detected(states, GATE, 10, NOW, { "event.gate_object": at(3) }).length, 1);
});
