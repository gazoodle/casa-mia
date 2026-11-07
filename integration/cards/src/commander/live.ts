// The Camera Commander card's second layer: the live main camera, played through Home
// Assistant's WebRTC over the picture, and its caption's lease (RULE FIVE).
import { html, nothing } from "lit";
import { liveChannel } from "../ha.ts";
import { type Rect } from "../layout.ts";
import { playWebRTC } from "../../../../app/web/src/webrtc.ts";
import { Card, LIVE_WAIT_MS, LIVE_GIVE_UP, PICTURE_DOWN_MS, liveClaim } from "./common.ts";
import { CommanderBase } from "./base.ts";

export class CommanderLive extends CommanderBase {
  // liveOn is state too: Talk is offered from the moment a session starts (talk.ts).
  static properties = { ...CommanderBase.properties, liveOn: { state: true }, _playing: { state: true }, _liveFailed: { state: true } };
  // The live main camera: the channel playing (or starting), its stop, whether it plays,
  // and the main camera it failed for (that one's drawn picture until the main changes).
  protected liveOn = "";
  protected liveStop?: () => void;
  protected liveWait = 0;
  _playing = false;
  _liveFailed = "";
  protected liveFails = 0; // failed in a row (see LIVE_GIVE_UP)
  /** When the live main camera last put a frame on screen (0: none yet). The caption's
   * "(live)" is worked out from it on each beat, never stored (CLAUDE.md RULE FIVE): only
   * a frame actually presented renews it, so any stall, reported or not, lets it lapse
   * into "Live lost … ago". */
  protected frameAt = 0;
  protected liveFrom = 0; // when this live session (or <video>) started: the lease's start
  protected watched: HTMLVideoElement | null = null; // the <video> whose frames are counted
  protected counting: HTMLVideoElement | null = null; // the one its per-frame callback runs on
  protected beat = 0; // the caption's once-a-second redraw, while the card is on the page

  connectedCallback() {
    super.connectedCallback();
    this.beat = window.setInterval(this.onBeat, 1000);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.beat);
    this.stopLive();
  }
  /** Each second, apart from the stream: if the <video> drawn now isn't the one whose
   * frames are counted (replaced, say), count its from now, as a new start; then redraw
   * the live caption. */
  protected onBeat = () => {
    const video = this.renderRoot?.querySelector<HTMLVideoElement>("video.live") ?? null;
    if (video !== this.watched) this.watch(video);
    if (video || this.ticking()) this.requestUpdate();
  };
  /** Something besides the live caption needs the once-a-second redraw: the picture
   * failing (base.ts: refused), and talk.ts adds the call's countdown. */
  protected ticking(): boolean {
    return this.lastError > 0 && Date.now() - this.lastError < PICTURE_DOWN_MS;
  }
  /** Count `video`'s frames from now: a new start, no frame yet. */
  protected watch(video: HTMLVideoElement | null) {
    this.watched = video;
    this.frameAt = 0;
    this.liveFrom = Date.now();
    if (video) this.countFrames(video);
  }
  /** Note each frame `video` puts on screen, for as long as it is the one watched. A
   * browser without the per-frame callback never notes one: never "(live)", which is safe. */
  protected countFrames(video: HTMLVideoElement) {
    if (this.counting === video) return; // already counting its frames
    this.counting = video;
    const seen = () => {
      if (this.watched !== video) {
        if (this.counting === video) this.counting = null;
        return;
      }
      this.frameAt = Date.now();
      video.requestVideoFrameCallback(seen);
    };
    video.requestVideoFrameCallback?.(seen);
  }

  /** Whether the main camera plays live: allowed (the compositor's switch, this card's
   * option), and not failed for this main camera. */
  protected liveMain(card: Card, main: string): boolean {
    return Boolean(
      card.live_main && this._config?.live_main !== false && this._liveFailed !== main && this.liveFails < LIVE_GIVE_UP && this.hass?.connection,
    );
  }

  /** The live main camera's channel: the smallest at least its area, which is laid out
   * in the picture's device pixels (as asked for; fewer away from home). */
  protected liveEntity(card: Card, main: string, area: Rect): string | undefined {
    const fit = card.layout.main_fit ?? "fit";
    const channels = card.cameras[main]?.channels ?? [[main, 0, 0]];
    return liveChannel(channels, [area[2], area[3]], fit !== "fill" && fit !== "crop");
  }

  /** Start, switch or stop the live main camera to match what is shown. It only watches:
   * talking is a session of its own (talk.ts), so the view can change during a call. */
  protected followLive() {
    const { card, main } = this.now();
    const video = this.renderRoot.querySelector<HTMLVideoElement>("video.live");
    const want = card && video && this.liveMain(card, main) ? (video.dataset.entity ?? "") : "";
    if (want === this.liveOn) return;
    this.stopLive();
    if (!want || !video) return;
    this.liveOn = want;
    this.watch(video); // a new session: its frames counted from its start, the first too
    const failed = (why: string) => {
      if (this.liveOn !== want) return;
      this.liveFails += 1;
      const off = this.liveFails >= LIVE_GIVE_UP ? `; ${this.liveFails} in a row, so no more tries until the page reloads` : "";
      console.info(`casa-mia: live main camera ${want}: ${why}; the drawn picture instead${off}`);
      this.stopLive();
      this._liveFailed = main;
    };
    this.liveWait = window.setTimeout(() => failed("not playing in time"), LIVE_WAIT_MS);
    video.onplaying = () => {
      clearTimeout(this.liveWait);
      this.liveFails = 0;
      this._playing = true;
    };
    playWebRTC(this.hass!.connection, want, video, failed).then(
      (stop) => (this.liveOn === want ? (this.liveStop = stop) : stop()),
      (err) => failed(String(err)),
    );
  }

  protected stopLive() {
    clearTimeout(this.liveWait);
    this.liveStop?.();
    this.liveStop = undefined;
    this.liveOn = "";
    this._playing = false;
  }

  /** The live main camera's caption: its title, "(live)" while frames come, or in red
   * how long since the last one. */
  protected caption(title: string, place: string) {
    const claim = liveClaim(this.liveFrom, this.frameAt, Date.now());
    return html`<div class="caption" style=${place}>
      <span>${title}${claim && "live" in claim ? " (live)" : ""}</span>
      ${claim && "lost" in claim ? html`<span class="lost">Live lost ${claim.lost} ago</span>` : nothing}
    </div>`;
  }
}
