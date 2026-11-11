// The Camera Commander card's third layer: talk to a doorbell (two-way audio), when the
// live main camera's device has a Casa Mia Intercom call sensor.
// The microphone is this device's, switched on by a tap here (the card's Talk button, or
// any Lovelace button firing a casa_mia_commander event): a tap lets the browser open the
// microphone and play the visitor's voice. Talk opens a session of its own to the doorbell,
// sound only (the microphone out, the visitor in); that offer answers the call, and HA
// refuses it (intercom_answered_elsewhere) while another user holds the call. Hanging up
// closes it, which ends the call. Nothing else can switch the microphone on, and it goes
// off the moment the card is out of sight: a microphone must not stay live on a page
// nobody is looking at.
// The call is not the main camera's: the view can change while talking (a tile tap, as
// ever, changes it on every device showing the commander), and the call, its "Live to …"
// and its Hang up stay over the main camera, whichever it is, until hanging up.
// Half duplex (the card's duplex option, or the order's): the session opens with the
// microphone track disabled (it sends silence; the offer still claims the call), and the
// voice goes out only while a Hold to talk is held (talk-rules.ts: Hold), with the visitor muted
// meanwhile. The state is announced on the window for the Talk tiles (talk-rules.ts).
// HA times the answered call (casa_mia_intercom/call; docs/applets/intercom.md):
// 2 minutes in half duplex, stopped while held and restarted on
// release; 10 minutes in full duplex, restarted by a touch anywhere on this page. Only
// the device that answered tells HA; every device shows the countdown from the sensor.
import { css, html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { type Place, corner, footOf, labelsOf } from "../labels.ts";
import { playWebRTC } from "../../../../app/web/src/webrtc.ts";
import { Card, callSensor, callSensors, callWords, countdown, talkCamera, talkOffered, TALK_NOTE_MS, TOUCH_EVERY_MS } from "./common.ts";
import { CommanderLive, LIVE_BY } from "./live.ts";
import { type TalkState, type Order, Hold, NO_GRAB, announce, answerAsks, answeredHere, commanderWords, talkState, talkSwitches } from "./talk-rules.ts";

/** Answers already taken by a Commander card on this page: one card answers, however many
 * show the doorbell or listen. */
const taken = new WeakSet<Event>();

const TONES: Record<string, string> = { ringing: "cm-warn", answered: "cm-accent", complete: "cm-muted" };

export class CommanderTalk extends CommanderLive {
  static properties = { ...CommanderLive.properties, _talk: { state: true }, _talkNote: { state: true } };
  /** The camera talked to, from the tap until hanging up (the microphone may still be
   * being asked for). */
  _talk = "";
  _talkNote = "";
  private mic?: MediaStreamTrack; // this device's, while talking
  private voice?: () => void; // closes the talking session, which ends the call
  private claimed = false; // the call sensor has said this user answered
  private asking = 0; // which ask for the microphone is current: a hang-up makes it stale
  private noteGone = 0;
  private found: { entities?: unknown; sensors: string[] } = { sensors: [] };
  private heard?: HTMLAudioElement; // the visitor's voice, while talking
  private half = false; // this call is half duplex
  private connected = false; // the visitor's voice has started playing: the session is up
  private hold = new Hold(() => this.sync());
  private said: TalkState = "off";
  private unask?: () => void;
  private answered = ""; // the call sensor HA says this user answered, while it does
  private toldHeld = false; // the hold HA was last told of
  private touchedAt = 0; // when HA was last told of a touch

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("ll-custom", this.onOrder);
    this.unask = answerAsks(window, () => ({ commander: this._config?.entity ?? "", state: this.said }));
    window.addEventListener("pointerdown", this.touched, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(); // out of sight: hangs up (outOfSight)
    window.removeEventListener("ll-custom", this.onOrder);
    this.unask?.();
    window.removeEventListener("pointerdown", this.touched, true);
    clearTimeout(this.noteGone);
  }

  /** HA's fire-dom-event action from any button on the page (handle-action.ts fires
   * ll-custom with the action's config, bubbling to the window). An order naming its call
   * (a Talk tile) answers that doorbell whatever the main camera is, and its toggle goes
   * by the call: hang up when this user has it, else answer. */
  private onOrder = (ev: Event) => {
    const order = (ev as CustomEvent).detail?.casa_mia_commander as Order | undefined;
    if (!order?.talk || (order.entity && order.entity !== this._config?.entity)) return;
    if (order.talk === "press") return this.said === "silent" && this.hold.press();
    if (order.talk === "release") return this.hold.end();
    const sensor = order.call ?? this.call();
    const mine = order.call ? answeredHere(this.hass?.states[order.call], this.hass?.user?.name) : Boolean(this._talk);
    const on = order.talk === "toggle" ? !mine : order.talk === "on";
    if (!on) return this.hangUp();
    if (!taken.has(ev) && this.talkOn(order.duplex, sensor)) taken.add(ev);
  };

  /** The microphone, the visitor's sound and the announced state, set from what is now
   * true (talk-rules.ts: talkState, talkSwitches). Called on every change. */
  private sync() {
    const state = talkState({ talking: Boolean(this._talk), connected: this.connected, half: this.half, held: this.hold.held });
    const { mic, muted } = talkSwitches(state, this.half);
    if (this.mic) this.mic.enabled = mic;
    if (this.heard) this.heard.muted = muted;
    this.tellHeld();
    if (state !== this.said) {
      this.said = state;
      announce(window, { commander: this._config?.entity ?? "", state });
      this.requestUpdate();
    }
  }

  /** Tell HA's call timer (docs/applets/intercom.md) something only the device that
   * answered may say. A refusal is logged and shown. */
  private tell(what: { duplex: "half" } | { held: boolean } | { touched: true }) {
    const sensor = this.answered;
    if (!sensor || !this.hass) return;
    this.hass.callWS({ type: "casa_mia_intercom/call", entity_id: sensor, ...what }).then(
      () => console.info(`casa-mia: call timer for ${sensor}: ${JSON.stringify(what)}`),
      (err: { code?: string; message?: string }) => {
        console.warn(`casa-mia: call timer for ${sensor} refused ${JSON.stringify(what)}: ${err?.code ?? ""} ${err?.message ?? err}`);
        this.note(`The call timer refused it: ${err?.message ?? err?.code ?? err}`);
      },
    );
  }

  /** HA told of each hold and release, once HA says this user answered (a hold made
   * before that is told with the duplex). Half duplex only. */
  private tellHeld() {
    if (!this.answered || !this.half || this.hold.held === this.toldHeld) return;
    this.toldHeld = this.hold.held;
    this.tell({ held: this.toldHeld });
  }

  /** A touch anywhere on the page while answered here in full duplex restarts HA's 10
   * minutes, said at most every TOUCH_EVERY_MS. Only this page's own pointer events reach
   * it: nothing from the door can. */
  private touched = () => {
    if (!this.answered || this.half || Date.now() - this.touchedAt < TOUCH_EVERY_MS) return;
    this.touchedAt = Date.now();
    this.tell({ touched: true });
  };

  /** The countdown ticks each second while there is a call to show it for. */
  protected ticking(): boolean {
    return super.ticking() || this.hass?.states[this.call() ?? ""]?.state === "answered";
  }

  /** The call sensor of the camera talked to, else of the main camera. The call sensors
   * are listed again only when HA's registry changes; which one holds the camera is read
   * from their states each time, as camera_entities can change on its own. */
  protected call(): string | undefined {
    const camera = this._talk || this.now().main;
    const entities = this.hass?.entities;
    if (!camera || !entities) return undefined;
    if (this.found.entities !== entities) this.found = { entities, sensors: callSensors(this.hass!) };
    return callSensor(this.hass!, camera, this.found.sensors);
  }

  /** Talk is offered (common.ts: talkOffered), on a device with WebRTC: nothing else
   * sends a microphone to the camera. */
  protected canTalk(): boolean {
    return LIVE_BY === "webrtc" && talkOffered({ sensor: this.call(), live: this.liveOn, talking: this._talk, secure: window.isSecureContext, editing: this.editing() });
  }

  /** Talk on, to the doorbell of `sensor` (common.ts: talkCamera; it needn't be on
   * screen): ask for the microphone at once (inside the tap, so the browser allows it),
   * then open the talking session with it (speak). True when it started. */
  protected talkOn(duplex = this._config?.duplex ?? "full", sensor = this.call()): boolean {
    if (this._talk || this.editing()) return false;
    const { card, main } = this.now();
    const camera = talkCamera(this.hass?.states[sensor ?? ""], main, Object.keys(card?.cameras ?? {}));
    if (!camera) {
      console.info(`casa-mia: talk: no doorbell to answer (${sensor ? `${sensor} has no camera` : "the main camera has no call sensor"})`);
      return false;
    }
    if (!window.isSecureContext) {
      console.info(`casa-mia: talk to ${camera}: refused, the page isn't https`);
      this.note("Talking needs this page on https");
      return false;
    }
    const ask = ++this.asking;
    this._talk = camera;
    this.half = duplex === "half";
    this.note("");
    this.sync();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => {
        const [track] = stream.getAudioTracks();
        if (ask !== this.asking) return track?.stop(); // hung up meanwhile
        console.info(`casa-mia: talk to ${camera}: microphone on${this.half ? " (half duplex: silent until held)" : ""}`);
        this.mic = track;
        this.claimed = false;
        this.sync(); // silent before the offer goes, in half duplex
        this.speak(camera, track, ask);
        this.requestUpdate();
      },
      (err) => {
        if (ask !== this.asking) return;
        console.info(`casa-mia: talk to ${camera}: no microphone: ${err}`);
        this.hangUp(`No microphone: ${err?.message ?? err}`);
      },
    );
    return true;
  }

  /** The talking session: sound only, the microphone out and the visitor's voice in, to
   * an <audio> of its own (playing it is allowed while the microphone is on). Its offer
   * answers the call; HA refusing it, or ending the call, hangs up. */
  private speak(camera: string, mic: MediaStreamTrack, ask: number) {
    const voice = new Audio();
    voice.autoplay = true;
    this.heard = voice;
    voice.onplaying = () => {
      if (ask !== this.asking) return;
      this.connected = true;
      this.sync();
    };
    const failed = (why: string, code?: string) => {
      if (ask !== this.asking) return; // hung up meanwhile
      if (code === "intercom_answered_elsewhere") this.hangUp(why || "Answered elsewhere");
      else if (code === "intercom_call_ended") this.hangUp("The call ended");
      else this.hangUp(`The call failed: ${why}`);
    };
    playWebRTC(this.hass!.connection, camera, voice, failed, mic).then(
      (stop) => (ask === this.asking ? (this.voice = stop) : stop()),
      (err) => failed(String(err)),
    );
  }

  /** Hang up: the talking session closed, which ends the call, and the microphone
   * stopped (the browser's indicator goes out). */
  protected hangUp(note = "") {
    this.asking++;
    this.voice?.();
    this.voice = undefined;
    if (this.mic) {
      console.info(`casa-mia: talk to ${this._talk}: hung up${note ? ` (${note})` : ""}`);
      this.mic.stop();
      this.mic = undefined;
    }
    this.claimed = false;
    this.answered = "";
    this.toldHeld = false;
    this.touchedAt = 0;
    this._talk = "";
    this.heard = undefined;
    this.connected = false;
    this.hold.end();
    this.sync();
    if (note) this.note(note);
  }

  private note(text: string) {
    clearTimeout(this.noteGone);
    this._talkNote = text;
    if (text) this.noteGone = window.setTimeout(() => (this._talkNote = ""), TALK_NOTE_MS);
  }

  /** On each update while talking: the call sensor once said this user answered and no
   * longer does (End call pressed elsewhere, the call timed out), so the call is over. */
  protected followCall() {
    if (!this.mic) return;
    const sensor = this.call() ?? "";
    const st = this.hass?.states[sensor];
    if (answeredHere(st, this.hass?.user?.name)) {
      this.claimed = true;
      if (!this.answered) this.answeredHere(sensor);
    } else if (this.claimed) this.hangUp("The call ended");
  }

  /** HA says this user answered: tell its timer the call is half duplex (full is its
   * default), then any hold already made. */
  private answeredHere(sensor: string) {
    this.answered = sensor;
    this.touchedAt = Date.now(); // the answer itself started HA's timer
    if (this.half) this.tell({ duplex: "half" });
    this.tellHeld();
  }

  /** Out of sight: hang up at once, whatever leave_after says. */
  protected outOfSight(why: string) {
    if (this._talk) {
      console.info(`casa-mia: talk ended: ${why}`);
      this.hangUp();
    }
    super.outOfSight(why);
  }

  /** Over the main camera: the call's state, "Live to …" while the microphone is on, a
   * note (the call ended, refused), and the card's own Talk button. */
  protected talkParts(card: Card, place: string) {
    const sensor = this.call();
    if (!sensor && !this._talkNote) return nothing;
    const st = this.hass?.states[sensor ?? ""];
    const words = callWords(st);
    const left = countdown(st, Date.now());
    const button = this._config?.talk_button !== false && (this._talk || this.canTalk());
    const half = this._talk ? this.half : this._config?.duplex === "half";
    const said = commanderWords(this.said, Boolean(this._talk), half);
    const out = this.said === "full" || this.said === "live"; // the voice going out
    // Each where the commander's labels put it (labels.ts), clear of what the camera
    // writes on its own picture; in the same corner, what is said stands over the buttons.
    const labels = labelsOf(card.layout.labels);
    const at = (where: Place, parts: unknown) => html`<div class="talk-at" style=${styleMap(corner(where, footOf(labels, where)))}>${parts}</div>`;
    const status = html`<div class="talk-said">
        ${out ? html`<span class="cm-pill cm-filled cm-bad">Live to ${card.cameras[this._talk]?.title ?? this.hass?.states[this._talk]?.attributes.friendly_name ?? this._talk}</span>` : nothing}
        ${words ? html`<span class="cm-pill cm-filled ${TONES[st!.state]}">${words}</span>` : nothing}
        ${left ? html`<span class="cm-pill cm-filled ${left.warn ? "cm-warn" : "cm-muted"}">${left.text}</span>` : nothing}
        ${this._talkNote && this._talkNote !== words ? html`<span class="cm-pill cm-filled cm-muted">${this._talkNote}</span>` : nothing}
      </div>`;
    const buttons = html`<div class="talk-buttons">
        ${button && said.hold
          ? html`<button
              class="cm-chip cm-on ${this.said === "live" ? "cm-bad" : "cm-good"}"
              style=${styleMap(NO_GRAB)}
              @pointerdown=${() => this.said === "silent" && this.hold.press()}
              @contextmenu=${(ev: Event) => ev.preventDefault()}
            >
              ${said.hold}
            </button>`
          : nothing}
        ${button
          ? html`<button class="cm-chip cm-on ${this._talk ? "cm-bad" : "cm-good"}" @click=${() => (this._talk ? this.hangUp() : this.talkOn())}>
              ${said.main}
            </button>`
          : nothing}
      </div>`;
    return html`<div class="talk" style=${place}>
      ${labels.talk_status === labels.talk_buttons ? at(labels.talk_status, [status, buttons]) : [at(labels.talk_status, status), at(labels.talk_buttons, buttons)]}
    </div>`;
  }
}

/** Its parts over the main camera: what is said and the buttons, each in the corner the
 * commander's labels give it (at first: said along the top, the buttons at the foot on
 * the right, the caption being on the left). Taps pass through all but the button. */
export const talkStyles = css`
  .talk {
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
  }
  .talk-at {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: calc(100% - 20px);
  }
  .talk-said,
  .talk-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: var(--cm-just);
    gap: 6px;
  }
  .talk button {
    pointer-events: auto;
  }
`;
