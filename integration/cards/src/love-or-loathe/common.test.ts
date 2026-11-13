import assert from "node:assert/strict";
import { test } from "node:test";
import { type Song, unusable } from "./common.ts";

const song: Song = { watched: true, playing: true, title: "Agadoo", artist: "Black Lace", person: "person.ann", feeling: null, refused: null };

test("the thumbs say why they can't be used, and nothing when they can", () => {
  assert.equal(unusable(song, undefined, true), undefined);
  assert.match(unusable(song, undefined, false)!, /No connection/);
  assert.match(unusable(undefined, "It isn't set up", true)!, /isn't set up/);
  assert.match(unusable({ ...song, watched: false }, undefined, true)!, /doesn't watch/);
  assert.match(unusable({ ...song, playing: false }, undefined, true)!, /Nothing is playing/);
  assert.match(unusable({ ...song, title: "" }, undefined, true)!, /no title/);
  // Not allowed comes before nothing playing: it is why the thumbs will never work here.
  assert.equal(unusable({ ...song, playing: false, refused: "Ann may not rate here" }, undefined, true), "Ann may not rate here");
});
