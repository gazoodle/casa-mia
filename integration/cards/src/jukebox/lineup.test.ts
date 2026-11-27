import assert from "node:assert/strict";
import { test } from "node:test";
import type { House } from "./common.ts";
import { EMPTY, type Lineup, type Track, after, before, move, put, remove } from "./lineup.ts";
import { PHONE, phone } from "./phone.ts";

const song = (title: string): Track => ({ title, artist: "The Marigolds", album: "", duration: 200, uri: `spotify:track:${title}` });
const [a, b, c, d] = ["a", "b", "c", "d"].map(song);
const titles = (line: Lineup) => line.songs.map((s) => s.title).join("");
const playing = (songs: Track[], at: number): Lineup => ({ ...EMPTY, songs, at });

test("songs go into the queue where the player says, as a speaker's do", () => {
  // Play now: after the song that is playing, and started.
  let [line, start] = put(playing([a, b], 0), [c, d]);
  assert.deepEqual([titles(line), line.at, start], ["acdb", 1, true]);
  // Play next: in the same place, and the song playing carries on.
  [line, start] = put(playing([a, b], 0), [c], "next");
  assert.deepEqual([titles(line), line.at, start], ["acb", 0, false]);
  [line, start] = put(playing([a, b], 1), [c], "add");
  assert.deepEqual([titles(line), line.at, start], ["abc", 1, false]);
  [line, start] = put(playing([a, b], 1), [c, d], "replace");
  assert.deepEqual([titles(line), line.at, start], ["cd", 0, true]);
  // At a place, counted from 1: the song playing is still the one it was.
  [line, start] = put(playing([a, b], 1), [c], "add", 1);
  assert.deepEqual([titles(line), line.at, start], ["cab", 2, false]);
});

test("an empty queue takes its first songs, and starts only when asked to play", () => {
  let [line, start] = put(EMPTY, [a, b], "add");
  assert.deepEqual([titles(line), line.at, start], ["ab", 0, false]);
  [line, start] = put(EMPTY, [a, b]);
  assert.deepEqual([titles(line), line.at, start], ["ab", 0, true]);
  assert.deepEqual(put(playing([a], 0), [], "next"), [playing([a], 0), false]);
});

test("the song that is playing is followed when songs are moved", () => {
  const line = playing([a, b, c, d], 1);
  assert.deepEqual([titles(move(line, 2, 4)), move(line, 2, 4).at], ["acdb", 3]); // the song playing itself
  assert.deepEqual([titles(move(line, 1, 3)), move(line, 1, 3).at], ["bcad", 0]); // one from before it, to after
  assert.deepEqual([titles(move(line, 4, 1)), move(line, 4, 1).at], ["dabc", 2]); // one from after it, to before
  assert.deepEqual(move(line, 3, 4).at, 1);
  assert.equal(move(line, 2, 9), line);
});

test("taking out the song that is playing leaves the next one to play", () => {
  const line = playing([a, b, c], 1);
  let [left, was] = remove(line, 2);
  assert.deepEqual([titles(left), left.at, was], ["ac", 1, true]);
  [left, was] = remove(line, 1);
  assert.deepEqual([titles(left), left.at, was], ["bc", 0, false]);
  [left, was] = remove(playing([a, b], 1), 2);
  assert.deepEqual([titles(left), left.at, was], ["a", 0, true]);
  [left, was] = remove(playing([a], 0), 1);
  assert.deepEqual([left.songs.length, left.at, was], [0, -1, true]);
});

test("what comes next follows repeat and shuffle, and the queue ends", () => {
  const line = playing([a, b, c], 2);
  assert.equal(after(playing([a, b, c], 0), true), 1);
  assert.equal(after(line, true), null);
  assert.equal(after({ ...line, repeat: "all" }, true), 0);
  // Repeat one repeats a song that ended; Next still moves on.
  assert.equal(after({ ...line, repeat: "one" }, true), 2);
  assert.equal(after({ ...line, repeat: "one" }, false), null);
  // Shuffle never picks the song that is playing.
  for (const chance of [0, 0.49, 0.99]) assert.notEqual(after({ ...line, shuffle: true }, true, () => chance), 2);
  assert.equal(after(EMPTY, true), null);
  assert.equal(before(playing([a, b], 0)), 0);
  assert.equal(before(playing([a, b], 1)), 0);
});

test("this device is a room of the house, but not on the house's own screens", () => {
  const room = { name: "Den", volume: 30, muted: false, available: true };
  const house: House = { groups: [], rooms: { "media_player.den": room }, me: "other" };
  const mine = phone.within(house);
  assert.deepEqual(Object.keys(mine.rooms), ["media_player.den", PHONE]);
  assert.equal(mine.rooms[PHONE].volume, null);
  const group = mine.groups.at(-1)!;
  assert.deepEqual([group.id, group.quiet, group.kind], [PHONE, true, "nothing"]);
  // Its favourites and searches are read through a Sonos room that is answering.
  assert.equal(phone.speaker(), "media_player.den");
  assert.equal(phone.within({ ...house, me: "screen" }).rooms[PHONE], undefined);
});

test("this device's queue is put back as it was: its songs, its place in the song, and a station that was on", async () => {
  const started: [string, number][] = [];
  // A stand-in for the players, which need a browser: what was started, and from where.
  (phone as any)._sound = { on: "", unlock() {}, stop() {}, spotify: async (uri: string, from: number) => void started.push([uri, Math.floor(from)]) };
  const station: Track = { ...song("radio"), live: true };
  const lists: Record<string, Track[]> = { one: [a, b], two: [c], radio: [station] };
  const hass = { connection: { sendMessagePromise: async (asked: any) => ({ songs: lists[asked.media_content_id], left_out: 0 }) } };
  const house: House = { groups: [], rooms: { "media_player.den": { name: "Den", volume: 30, muted: false, available: true } }, me: "other" };
  const group = () => phone.within(house).groups.find((g) => g.id === PHONE)!;
  const play = (id: string, enqueue?: string) => phone.do(hass, "play_media", { media_content_id: id, media_content_type: "playlist", ...(enqueue ? { enqueue } : {}) });
  const at = (playing: boolean, position: number) => ((phone as any)._told = { playing, position, duration: 200, at: Date.now() });

  // Replaced 30 seconds into a song: back at that song and that place, playing.
  await play("one");
  at(true, 30);
  await play("two", "replace");
  assert.deepEqual([group().title, group().undo], ["c", true]);
  await phone.do(hass, "queue_back");
  assert.deepEqual([group().title, group().queue_size, group().undo, started.at(-1)], ["a", 2, false, [a.uri, 30]]);
  // Only once.
  await assert.rejects(phone.do(hass, "queue_back"), /any more/);

  // Cleared while paused: back, still paused, and play carries on from where it was.
  at(false, 12);
  await phone.do(hass, "queue_clear");
  assert.equal(group().queue_size, 0);
  const before = started.length;
  await phone.do(hass, "queue_back");
  assert.deepEqual([group().queue_size, group().state, group().position, started.length], [2, "paused", 12, before]);

  // Replaced while a station was on: the station is back, not a song of the queue.
  await play("radio");
  at(true, 0);
  await play("two", "replace");
  assert.equal(group().kind, "queue");
  await phone.do(hass, "queue_back");
  assert.deepEqual([group().kind, group().channel, group().queue_size, started.at(-1)], ["radio", "radio", 2, [station.uri, 0]]);
});
