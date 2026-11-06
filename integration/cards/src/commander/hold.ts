// Half duplex talk, its pure parts: the Commander's talk state, the hold to talk lease, and
// the window event that announces the state to the Talk tiles on the page. The Commander
// (talk.ts) owns the microphone; a Hold to talk tile only reports the finger.

/** off; connecting; full (answered here, voice open); silent (answered here in half duplex,
 * not held); live (half duplex, held, the voice going out). */
export type TalkState = "off" | "connecting" | "full" | "silent" | "live";
export type Duplex = "full" | "half";

export function talkState(o: { talking: boolean; connected: boolean; half: boolean; held: boolean }): TalkState {
  if (!o.talking) return "off";
  if (!o.connected) return "connecting";
  if (!o.half) return "full";
  return o.held ? "live" : "silent";
}

/** What the page does in a state: the microphone track enabled (a disabled track sends
 * silence, so nothing reaches the door), and the visitor muted while the voice goes out
 * (half duplex: no echo of your own voice). Full duplex is as before: the microphone on
 * from the answer. */
export function talkSwitches(state: TalkState, half: boolean): { mic: boolean; muted: boolean } {
  return { mic: half ? state === "live" : state !== "off", muted: state === "live" };
}

/** Every way a hold can end, on the window: the finger lifted or taken anywhere (the
 * button may be redrawn mid-press, the finger may slide off), or the window losing focus. */
const ENDS = ["pointerup", "pointercancel", "blur"];

/** A hold to talk: a lease, current only while held. Every way a hold ends ends it, so a
 * lost event can only turn the voice off, never leave it on. The page being hidden ends it
 * too (and hangs up: base.ts outOfSight). */
export class Hold {
  held = false;
  private changed: () => void;
  private win: EventTarget;
  private doc: EventTarget & { hidden: boolean };
  constructor(changed: () => void, win: EventTarget = window, doc: EventTarget & { hidden: boolean } = document) {
    this.changed = changed;
    this.win = win;
    this.doc = doc;
  }

  press() {
    if (this.held) return;
    this.held = true;
    for (const e of ENDS) this.win.addEventListener(e, this.end);
    this.doc.addEventListener("visibilitychange", this.hidden);
    this.changed();
  }

  end = () => {
    if (!this.held) return;
    this.held = false;
    for (const e of ENDS) this.win.removeEventListener(e, this.end);
    this.doc.removeEventListener("visibilitychange", this.hidden);
    this.changed();
  };

  private hidden = () => this.doc.hidden && this.end();
}

/** The Commander's talk state, announced on the window whenever it changes and when a tile
 * asks (a tile added after the change must not miss it). */
export const TALK_EVENT = "casa-mia-talk";
export const TALK_ASK = "casa-mia-talk-ask";
export type Announced = { commander: string; state: TalkState };

/** The Commander's side: answer each ask with `now()`. Returns the unsubscribe. */
export function answerAsks(win: EventTarget, now: () => Announced): () => void {
  const ask = () => announce(win, now());
  win.addEventListener(TALK_ASK, ask);
  return () => win.removeEventListener(TALK_ASK, ask);
}

export function announce(win: EventTarget, said: Announced) {
  win.dispatchEvent(new CustomEvent(TALK_EVENT, { detail: said }));
}

const RANK: TalkState[] = ["off", "connecting", "full", "silent", "live"];

/** A tile's side: the state of its commander, or with none named, the busiest Commander
 * on the page; asked for at once. Returns the unsubscribe. */
export function followTalk(win: EventTarget, commander: string | undefined, said: (state: TalkState) => void): () => void {
  const states = new Map<string, TalkState>();
  const heard = (ev: Event) => {
    const { commander: from, state } = (ev as CustomEvent<Announced>).detail;
    if (commander && from !== commander) return;
    states.set(from, state);
    said([...states.values()].reduce((a, b) => (RANK.indexOf(b) > RANK.indexOf(a) ? b : a), "off" as TalkState));
  };
  win.addEventListener(TALK_EVENT, heard);
  win.dispatchEvent(new Event(TALK_ASK));
  return () => win.removeEventListener(TALK_EVENT, heard);
}
