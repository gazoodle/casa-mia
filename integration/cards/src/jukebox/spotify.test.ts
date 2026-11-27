import assert from "node:assert/strict";
import { test } from "node:test";
import { type Link, type Options, Player } from "./spotify.ts";

/** Spotify's frame as its messages were read (spotify.ts): what it is sent, and a way
 * to have it say something. */
function aFrame() {
  const sent: any[] = [];
  let heard: (message: any) => void = () => undefined;
  const link: Link = { send: (message) => sent.push(message), hear: (to) => (heard = to) };
  return {
    link,
    sent,
    raw: (message: any) => heard(message),
    say: (topic: string, data?: unknown, seq = 900) => heard({ type: "SP_MESSAGE", body: { topic, data }, seq }),
    topics: () => sent.map((message) => message.body.topic),
  };
}

const options: Options = { name: "Jukebox", volume: 1, getOAuthToken: (use) => use("abc") };
/** Let what waits for the frame's loading carry on. */
const settle = () => new Promise((done) => setTimeout(done));

test("nothing is sent until the frame has loaded, then INIT before anything asked meanwhile", async () => {
  const frame = aFrame();
  const player = new Player(options, frame.link);
  const connected = player.connect();
  void player.pause();
  await settle();
  assert.deepEqual(frame.sent, []);

  frame.say("LOADED");
  await settle();
  assert.deepEqual(frame.topics(), ["INIT", "CONNECT", "PAUSE"]);
  assert.deepEqual(frame.sent[0], { type: "SP_MESSAGE", body: { topic: "INIT", data: { name: "Jukebox", volume: 1 } }, seq: 0 });

  // An answer names its question's number.
  frame.say("CONNECTED", { connected: true, ref: frame.sent[1].seq });
  assert.equal(await connected, true);
});

test("the frame is given the sign-in whenever it asks, as the answer to that question", () => {
  const frame = aFrame();
  new Player(options, frame.link);
  frame.say("LOADED");
  frame.say("GET_TOKEN", undefined, 7);
  assert.deepEqual(frame.sent.at(-1).body, { topic: "TOKEN", data: { token: "abc", ref: 7 } });
});

test("the frame's events reach their listeners by its own names, and nothing else is taken", async () => {
  const frame = aFrame();
  const player = new Player(options, frame.link);
  const ready: unknown[] = [];
  player.addListener("PLAYER_READY", (now) => ready.push(now));
  frame.say("LOADED");

  frame.say("EVENT", { name: "PLAYER_READY", eventData: { device_id: "d1" } });
  frame.say("EVENT", { name: "PLAYER_NOT_READY", eventData: {} });
  frame.raw({ type: "something else", body: { topic: "EVENT", data: { name: "PLAYER_READY", eventData: {} } } });
  frame.raw(null);
  assert.deepEqual(ready, [{ device_id: "d1" }]);

  const state = player.getCurrentState();
  await settle();
  frame.say("CURRENT_STATE", { state: null, ref: frame.sent.at(-1).seq });
  assert.equal(await state, null);

  await player.seek(1500);
  assert.deepEqual(frame.sent.at(-1).body, { topic: "SEEK", data: 1500 });
});
