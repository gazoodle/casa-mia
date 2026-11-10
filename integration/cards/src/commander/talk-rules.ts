// Talking to a doorbell, its rules shared by the Commander card (talk.ts) and the Talk
// tile (talk-tile/), pure: the Commander's talk state, the hold to talk lease, the window
// event that announces the state to the tiles, what a button says and sends, and the
// duplex choices. The Commander owns the microphone; a Hold to talk tile only reports the
// finger.

/** off; connecting; full (answered here, voice open); silent (answered here in half duplex,
 * not held); live (half duplex, held, the voice going out). */
export type TalkState = "off" | "connecting" | "full" | "silent" | "live";
export type Duplex = "full" | "half";

/** What the buttons say, the same on the Commander card and on the Talk tile. */
export const WORDS = { talk: "Talk", answer: "Answer", hang_up: "Hang up", hold: "Hold to talk", live: "Live" } as const;

/** The button that starts a call: Answer in half duplex (the call opens silent), else Talk. */
export const startWord = (half: boolean) => (half ? WORDS.answer : WORDS.talk);

/** Hold to talk, from the Commander's talk state: enabled only where this page answered
 * in half duplex; "Live" only while the voice is actually going out (a name the card's
 * own can't replace; null: Hold to talk, which it can). */
export function holdLook(talk: TalkState): { look: "hold" | "live"; name: string | null; enabled: boolean } {
  if (talk === "live") return { look: "live", name: WORDS.live, enabled: true };
  return { look: "hold", name: null, enabled: talk === "silent" };
}

/** The Commander card's own buttons: Hold to talk (or Live) while answered here in half
 * duplex, else none; and the one that starts or ends the call. */
export function commanderWords(said: TalkState, talking: boolean, half: boolean): { hold: string | null; main: string } {
  const hold = said === "silent" || said === "live" ? (holdLook(said).name ?? WORDS.hold) : null;
  return { hold, main: talking ? WORDS.hang_up : startWord(half) };
}

/** The call sensor says this HA user answered: one HA user per device makes that "this
 * device is talking". Never true without an answered_by. */
export function answeredHere(st: { state: string; attributes: Record<string, unknown> } | undefined, user: string | undefined): boolean {
  const by = st?.state === "answered" ? st.attributes.answered_by : undefined;
  return Boolean(by) && by === user;
}

/** What a button sends the Commander card, as `casa_mia_commander` in HA's fire-dom-event
 * (or, from a Hold to talk tile, in an ll-custom event of its own): entity, only that
 * card; duplex, the card's own when not given; call, the doorbell's call sensor, so it is
 * answered whatever the main camera is (else the main camera's doorbell). */
export type Order = { talk: "toggle" | "on" | "off" | "press" | "release"; duplex?: Duplex; entity?: string; call?: string };
export function order(talk: Order["talk"], o: { entity?: string; duplex?: Duplex; call?: string } = {}): Order {
  return { talk, ...(o.duplex === "half" ? { duplex: o.duplex } : {}), ...(o.entity ? { entity: o.entity } : {}), ...(o.call ? { call: o.call } : {}) };
}

/** The choices for the duplex option, in both cards' editors. */
export const DUPLEX_CHOICES = [
  { value: "full", label: "Full duplex: your voice goes out as soon as you answer" },
  { value: "half", label: "Half duplex: answering opens the call silent; your voice goes out only while Hold to talk is held" },
];

/** A hold is the page's, not the browser's: no scrolling, text selection or iPhone
 * long-press menu taking it. On both cards' Hold to talk buttons. */
export const NO_GRAB: Record<string, string> = {
  "touch-action": "none",
  "user-select": "none",
  "-webkit-user-select": "none",
  "-webkit-touch-callout": "none",
};

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
