import assert from "node:assert/strict";
import { test } from "node:test";
import type { Favourite, Song } from "./common.ts";
import { type Sure, offered, put, sent } from "./pick.ts";

const list = (id: string, title: string, playlist = true): Favourite => ({ folder: "Playlists", title, live: false, playlist, picture: null, media_content_id: id, media_content_type: "favorite_item_id" });
const [friday, sunday, quiet] = [list("SQ:4", "Friday Night"), list("SQ:7", "Sunday Morning"), list("SQ:9", "Quiet")];
const song: Song = { title: "Paper Lanterns", artist: "The Marigolds", album: "Harbour Lights", duration: 194 };

test("the playlists offered: the one chosen last first, never the one the song is in, and no stations", () => {
  const found = [friday, list("FV:2/1", "Harbour FM", false), sunday, quiet];
  assert.deepEqual(offered(found, null), [friday, sunday, quiet]);
  assert.deepEqual(offered(found, "SQ:9"), [quiet, friday, sunday]);
  assert.deepEqual(offered(found, "SQ:9", "SQ:9"), [friday, sunday]);
  // A playlist chosen last that Sonos no longer has changes nothing.
  assert.deepEqual(offered(found, "SQ:99", "SQ:4"), [sunday, quiet]);
});

test("a song moved or copied: what is asked for, with its title, and what is said", () => {
  const move = sent(friday, 1, song, false);
  assert.equal(move.action, "playlist_send");
  // Numbered from 1, and with the title: Jukebox refuses if another song is there by now.
  assert.deepEqual(move.data(sunday), { playlist: "SQ:4", value: 2, name: "Paper Lanterns", into: "SQ:7" });
  assert.equal(move.said(sunday), "Moved to Sunday Morning: Paper Lanterns");
  assert.equal(move.pick.except, "SQ:4");
  assert.match(move.pick.text, /taken out of Friday Night/);

  const copy = sent(friday, 1, song, true);
  assert.equal(copy.action, "playlist_copy");
  assert.equal(copy.said(sunday), "Copied to Sunday Morning: Paper Lanterns");
  assert.match(copy.pick.text, /stays in Friday Night/);
  // A title longer than Jukebox takes is cut, as the speaker's is compared from its start.
  assert.equal(sent(friday, 0, { ...song, title: "x".repeat(80) }, true).data(sunday).name.length, 60);
});

test("a song the playlist holds already is asked about before it goes in again", async () => {
  const asked: object[] = [];
  const questions: Sure[] = [];
  let done = 0;
  const run = (holds: boolean) => async (data: object) => (asked.push(data), holds && !(data as { again: boolean }).again ? { already: true } : {});
  const already = { text: "It is in Sunday Morning already.", go: "Add it again" };
  const sure = (q: Sure) => void questions.push(q);

  // Not in it: put in at once, having said that nobody was asked.
  await put(run(false), { playlist: "SQ:7" }, already, sure, () => done++);
  assert.deepEqual([asked, questions.length, done], [[{ playlist: "SQ:7", again: false }], 0, 1]);

  // In it: nothing is done until the person says so, and then it is asked for again.
  await put(run(true), { playlist: "SQ:7" }, already, sure, () => done++);
  assert.deepEqual([questions.length, done], [1, 1]);
  // A plain question, not the red of what can't be got back: nothing is lost either way.
  assert.deepEqual([questions[0].text, questions[0].go, questions[0].tone], ["It is in Sunday Morning already.", "Add it again", "ask"]);
  await questions[0].run();
  assert.deepEqual([asked.at(-1), done], [{ playlist: "SQ:7", again: true }, 2]);

  // Refused (Jukebox has said why): nothing more happens.
  await put(async () => undefined, {}, already, sure, () => done++);
  assert.deepEqual([questions.length, done], [1, 2]);
  assert.deepEqual(sent(friday, 1, song, false).already(sunday), { text: "“Paper Lanterns” is in Sunday Morning already.", go: "Move it anyway" });
});
