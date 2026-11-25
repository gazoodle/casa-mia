import assert from "node:assert/strict";
import { test } from "node:test";
import type { Favourite, Song } from "./common.ts";
import { offered, sent } from "./pick.ts";

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
