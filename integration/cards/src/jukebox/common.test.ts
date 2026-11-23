import assert from "node:assert/strict";
import { test } from "node:test";
import { type Group, type House, average, colours, groupOf, initials, latest, mmss, names, playing, position } from "./common.ts";

const group = (over: Partial<Group>): Group => ({
  id: "media_player.den", rooms: ["media_player.den"], state: "playing", kind: "queue", quiet: false, title: "Paper Lanterns", artist: "The Marigolds",
  album: "", channel: "", picture: null, duration: 200, position: 10, position_at: "2026-11-23T20:00:00+00:00", shuffle: false, repeat: "off", queue_size: 8, queue_position: 1, ...over,
});
const room = (name: string, volume: number | null) => ({ name, volume, muted: false, available: true });
const den = group({ rooms: ["media_player.den", "media_player.snug"] });
const house: House = { groups: [den], rooms: { "media_player.den": room("Den", 30), "media_player.snug": room("Snug", 21), "media_player.shed": room("Shed", null) } };

test("a group is named by its rooms and its one slider shows their average", () => {
  assert.equal(names(house, den), "Den + Snug");
  assert.equal(average(house, den), 26);
  assert.equal(average(house, group({ rooms: ["media_player.shed"] })), 0);
  assert.equal(groupOf(house, "media_player.snug"), den);
  assert.equal(groupOf(house, "media_player.shed"), undefined);
});

test("a playing song has moved on since the speaker said where it was", () => {
  const then = Date.parse("2026-11-23T20:00:00+00:00");
  assert.equal(position(den, then + 5000), 15);
  assert.equal(position(group({ state: "paused" }), then + 5000), 10);
  // Never past the end, and nothing at all for what has no length (a station).
  assert.equal(position(den, then + 900_000), 200);
  assert.equal(position(group({ duration: null }), then), null);
  assert.equal(mmss(194), "3:14");
});

test("what a player says is playing", () => {
  assert.deepEqual(playing(den), { title: "Paper Lanterns", by: "The Marigolds" });
  assert.deepEqual(playing(group({ kind: "radio", title: "A song", artist: "", channel: "Harbour FM" })), { title: "A song", by: "Harbour FM" });
  assert.deepEqual(playing(group({ kind: "radio", title: "", artist: "", channel: "Harbour FM" })), { title: "Harbour FM", by: "" });
  assert.deepEqual(playing(group({ kind: "tv", title: "", artist: "" })), { title: "Television", by: "" });
  assert.deepEqual(playing(group({ kind: "nothing", title: "", artist: "" })), { title: "Nothing playing", by: "" });
});

test("a title's colours and initials are the same every time", () => {
  assert.deepEqual(colours("Paper Lanterns"), colours("Paper Lanterns"));
  assert.notDeepEqual(colours("Paper Lanterns"), colours("Low Tide Motel"));
  assert.equal(initials("paper lanterns on the wall"), "PL");
  assert.equal(initials(""), "");
});

test("a dragged slider sends one value at a time, then the newest", async () => {
  const sent: number[] = [];
  let release = () => {};
  const send = latest<number>((v) => new Promise<void>((done) => ((release = done), sent.push(v))), () => {});
  send(1);
  send(2);
  send(3);
  assert.deepEqual(sent, [1]);
  release();
  await new Promise((r) => setTimeout(r));
  assert.deepEqual(sent, [1, 3]);
});
