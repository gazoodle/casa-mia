// The Camera Commander card's third layer: talk to a doorbell (two-way audio), when the
// live main camera's device has an intercom_talkback call sensor.
// The microphone is this device's, switched on by a tap here (the card's Talk button, or
// any Lovelace button firing a casa_mia_commander event): a tap lets the browser open the
// microphone and play the visitor's voice. Talk restarts the live session with the
// microphone; that offer answers the call, and HA refuses it (intercom_answered_elsewhere)
// while another user holds the call. Hanging up restarts it without, which closes the
// session that held the call. Nothing else can switch the microphone on, and it goes off
// the moment the card is out of sight: a microphone must not stay live on a page nobody
// is looking at.
// While talking, the doorbell stays the main camera here whatever its select says (the
// select is shared by every device showing the commander), and tiles don't change it.
import { css, html, nothing } from "lit";
import { Card, callSensor, callSensors, callWords, TALK_NOTE_MS } from "./common.ts";
import { CommanderLive } from "./live.ts";

/** What a Lovelace button sends: `tap_action: {action: fire-dom-event, casa_mia_commander:
 * {talk: toggle | on | off, entity: <a commander's select>}}` (entity: only that card). */
type Order = { talk?: "toggle" | "on" | "off"; entity?: string };

const TONES: Record<string, string> = { ringing: "cm-warn", answered: "cm-accent", complete: "cm-muted" };

export class CommanderTalk extends CommanderLive {
  static properties = { ...CommanderLive.properties, _talk: { state: true }, _talkNote: { state: true } };
  /** The camera talked to, from the tap until hanging up (the microphone may still be
   * being asked for): the main camera here meanwhile. */
  _talk = "";
  _talkNote = "";
  private claimed = false; // the call sensor has said this user answered
  private asking = 0; // which ask for the microphone is current: a hang-up makes it stale
  private noteGone = 0;
  private found: { entities?: unknown; sensors: string[] } = { sensors: [] };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("ll-custom", this.onOrder);
  }
  disconnectedCallback() {
    super.disconnectedCallback(); // out of sight: hangs up (outOfSight)
    window.removeEventListener("ll-custom", this.onOrder);
    clearTimeout(this.noteGone);
  }

  /** HA's fire-dom-event action from any button on the page (handle-action.ts fires
   * ll-custom with the action's config, bubbling to the window). */
  private onOrder = (ev: Event) => {
    const order = (ev as CustomEvent).detail?.casa_mia_commander as Order | undefined;
    if (!order?.talk || (order.entity && order.entity !== this._config?.entity)) return;
    const on = order.talk === "toggle" ? !this._talk : order.talk === "on";
    if (on) this.talkOn();
    else this.hangUp();
  };

  /** The call sensor of the main camera (the one talked to, while talking). The call
   * sensors are listed again only when HA's registry changes; which one holds the camera
   * is read from their states each time, as camera_entities can change on its own. */
  protected call(): string | undefined {
    const { main } = this.now();
    const entities = this.hass?.entities;
    if (!main || !entities) return undefined;
    if (this.found.entities !== entities) this.found = { entities, sensors: callSensors(this.hass!) };
    return callSensor(this.hass!, main, this.found.sensors);
  }

  /** Talk is offered: a doorbell with a call sensor, playing live here, on a secure page
   * (the browser gives a microphone to no other), and not being edited. */
  protected canTalk(): boolean {
    return Boolean(this.call() && (this._playing || this._talk) && window.isSecureContext && !this.editing());
  }

  /** Talk on: ask for the microphone at once (inside the tap, so the browser allows it),
   * then restart the live session with it (live.ts: followLive). */
  protected talkOn() {
    if (this._talk || !this.canTalk()) return;
    const camera = this.now().main;
    const ask = ++this.asking;
    this._talk = camera;
    this.note("");
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => {
        const [track] = stream.getAudioTracks();
        if (ask !== this.asking) return track?.stop(); // hung up meanwhile
        console.info(`casa-mia: talk to ${camera}: microphone on`);
        this.mic = track;
        this.claimed = false;
        this.requestUpdate();
      },
      (err) => {
        if (ask !== this.asking) return;
        console.info(`casa-mia: talk to ${camera}: no microphone: ${err}`);
        this.hangUp(`No microphone: ${err?.message ?? err}`);
      },
    );
  }

  /** Hang up: the microphone stopped (the browser's indicator goes out) and its session
   * closed now, which ends the call; the next update starts one without it. */
  protected hangUp(note = "") {
    this.asking++;
    if (this.mic) {
      console.info(`casa-mia: talk to ${this._talk}: hung up${note ? ` (${note})` : ""}`);
      this.mic.stop();
      this.mic = undefined;
      this.stopLive();
    }
    this.claimed = false;
    this._talk = "";
    if (note) this.note(note);
  }

  private note(text: string) {
    clearTimeout(this.noteGone);
    this._talkNote = text;
    if (text) this.noteGone = window.setTimeout(() => (this._talkNote = ""), TALK_NOTE_MS);
  }

  /** HA refused the session or ended its call: not the stream's fault (live.ts). */
  protected refusedBy(code: string, why: string): boolean {
    if (code === "intercom_answered_elsewhere") this.hangUp(why || "Answered elsewhere");
    else if (code === "intercom_call_ended") this.hangUp("The call ended");
    else return false;
    return true;
  }

  /** On each update while talking: the call sensor once said this user answered and no
   * longer does (End call pressed elsewhere, the call timed out), so the call is over. */
  protected followCall() {
    if (!this.mic) return;
    const st = this.hass?.states[this.call() ?? ""];
    if (st?.state === "answered" && st.attributes.answered_by === this.hass?.user?.name) this.claimed = true;
    else if (this.claimed) this.hangUp("The call ended");
  }

  /** Out of sight: hang up at once, whatever leave_after says. */
  protected outOfSight(why: string) {
    if (this._talk) {
      console.info(`casa-mia: talk ended: ${why}`);
      this.hangUp();
    }
    super.outOfSight(why);
  }

  /** The camera talked to stays the main camera until hanging up. */
  protected main(card: Card, option?: string): string {
    return this._talk && card.cameras[this._talk] ? this._talk : super.main(card, option);
  }

  /** Over the main camera: the call's state, "Live to …" while the microphone is on, a
   * note (the call ended, refused), and the card's own Talk button. */
  protected talkParts(card: Card, place: string) {
    const sensor = this.call();
    if (!sensor && !this._talkNote) return nothing;
    const st = this.hass?.states[sensor ?? ""];
    const words = callWords(st);
    const button = this._config?.talk_button !== false && (this._talk || this.canTalk());
    return html`<div class="talk" style=${place}>
      <div class="talk-said">
        ${this.mic ? html`<span class="cm-pill cm-filled cm-bad">Live to ${card.cameras[this._talk]?.title ?? this._talk}</span>` : nothing}
        ${words ? html`<span class="cm-pill cm-filled ${TONES[st!.state]}">${words}</span>` : nothing}
        ${this._talkNote && this._talkNote !== words ? html`<span class="cm-pill cm-filled cm-muted">${this._talkNote}</span>` : nothing}
      </div>
      ${button
        ? html`<button class="cm-chip cm-on ${this._talk ? "cm-bad" : "cm-good"}" @click=${() => (this._talk ? this.hangUp() : this.talkOn())}>
            ${this._talk ? "Hang up" : "Talk"}
          </button>`
        : nothing}
    </div>`;
  }
}

/** Its parts over the main camera: what is said along the top, the button at the foot on
 * the right (the caption is on the left). Taps pass through all but the button. */
export const talkStyles = css`
  .talk {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
    pointer-events: none;
  }
  .talk-said {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .talk button {
    align-self: flex-end;
    pointer-events: auto;
  }
`;
