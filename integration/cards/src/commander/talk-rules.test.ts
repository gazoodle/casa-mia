// Half duplex talk (talk-rules.ts): the Commander's talk state, what each state switches, the
// hold to talk lease, and the announced state a tile follows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Hold, type TalkState, announce, answerAsks, followTalk, talkState, talkSwitches } from "./talk-rules.ts";

test("the talk state from what is true", () => {
  const s = (talking: boolean, connected: boolean, half: boolean, held: boolean) => talkState({ talking, connected, half, held });
  assert.equal(s(false, true, true, true), "off");
  assert.equal(s(true, false, true, true), "connecting");
  assert.equal(s(true, true, false, true), "full"); // a hold means nothing in full duplex
  assert.equal(s(true, true, true, false), "silent");
  assert.equal(s(true, true, true, true), "live");
});

test("the microphone goes out only where it should; the visitor muted only while live", () => {
  assert.deepEqual(talkSwitches("connecting", false), { mic: true, muted: false }); // full: as before
  assert.deepEqual(talkSwitches("full", false), { mic: true, muted: false });
  assert.deepEqual(talkSwitches("off", false), { mic: false, muted: false });
  assert.deepEqual(talkSwitches("connecting", true), { mic: false, muted: false });
  assert.deepEqual(talkSwitches("silent", true), { mic: false, muted: false });
  assert.deepEqual(talkSwitches("live", true), { mic: true, muted: true });
});

/** A half duplex call, connected, its switches applied on every change as talk.ts does. */
function call() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const track = { enabled: false };
  const voice = { muted: false };
  const hold: Hold = new Hold(
    () => {
      const { mic, muted } = talkSwitches(talkState({ talking: true, connected: true, half: true, held: hold.held }), true);
      track.enabled = mic;
      voice.muted = muted;
    },
    win,
    doc,
  );
  return { win, doc, track, voice, hold };
}

const ENDINGS: [string, (c: ReturnType<typeof call>) => void][] = [
  ["pointerup on the window", (c) => c.win.dispatchEvent(new Event("pointerup"))],
  ["pointercancel on the window", (c) => c.win.dispatchEvent(new Event("pointercancel"))],
  ["the window's blur", (c) => c.win.dispatchEvent(new Event("blur"))],
  [
    "the page hidden",
    (c) => {
      c.doc.hidden = true;
      c.doc.dispatchEvent(new Event("visibilitychange"));
    },
  ],
  ["release, the session closed or the call ended (end)", (c) => c.hold.end()],
];

for (const [why, ending] of ENDINGS)
  test(`a hold ends on ${why}: the voice off, the visitor heard again`, () => {
    const c = call();
    c.hold.press();
    assert.deepEqual([c.track.enabled, c.voice.muted], [true, true]);
    ending(c);
    assert.deepEqual([c.hold.held, c.track.enabled, c.voice.muted], [false, false, false]);
  });

test("a page shown again doesn't end a hold; an ended hold stops listening", () => {
  const c = call();
  c.hold.press();
  c.doc.dispatchEvent(new Event("visibilitychange")); // still visible
  assert.equal(c.hold.held, true);
  c.hold.end();
  c.hold.press(); // a second hold after the first
  c.hold.end();
  let changes = 0;
  const quiet = new Hold(() => changes++, c.win, c.doc);
  quiet.press();
  quiet.end();
  c.win.dispatchEvent(new Event("pointerup")); // nothing left listening
  assert.equal(changes, 2);
});

test("a tile added after answering gets the current state", () => {
  const win = new EventTarget();
  let state: TalkState = "silent";
  const stop = answerAsks(win, () => ({ commander: "select.gate_commander", state }));
  const heard: TalkState[] = [];
  const unfollow = followTalk(win, undefined, (s) => heard.push(s));
  assert.deepEqual(heard, ["silent"]); // asked at once, answered at once
  state = "live";
  announce(win, { commander: "select.gate_commander", state });
  assert.deepEqual(heard, ["silent", "live"]);
  unfollow();
  stop();
});

test("a tile follows its own commander, or the busiest one on the page", () => {
  const win = new EventTarget();
  const mine: TalkState[] = [];
  const any: TalkState[] = [];
  followTalk(win, "select.gate", (s) => mine.push(s));
  followTalk(win, undefined, (s) => any.push(s));
  announce(win, { commander: "select.gate", state: "silent" });
  announce(win, { commander: "select.yard", state: "off" });
  assert.deepEqual(mine, ["silent"]);
  assert.deepEqual(any, ["silent", "silent"]); // another card being off doesn't hide the call
});
