// The Camera Commander card's second layer: the live main camera, played through Home
// Assistant's WebRTC over the picture. It follows the camera ladder
// (docs/never-silently-stuck.md): live on the channel that fits, else live on another,
// else the drawn picture, with a failed channel tried again later. Every "live" here is a
// lease (RULE FIVE), and every loss is said on the card and in Home Assistant's log.
import { html, nothing } from "lit";
import { type Rect } from "../layout.ts";
import { labelsOf } from "../labels.ts";
import { playHLS, playWebRTC } from "../../../../app/web/src/webrtc.ts";
import { Card, LIVE_WAIT_HLS_MS, LIVE_WAIT_MS, type LiveMark, PICTURE_DOWN_MS, ago, liveBy, liveLapsed, liveMark, liveOrder, livePlan } from "./common.ts";
import { CommanderBase } from "./base.ts";

/** One channel playing (or starting) in its <video>: when it started, and when it last put
 * a frame on screen (0: none yet). */
type Session = { video: HTMLVideoElement; stop: () => void; from: number; frameAt: number };

/** The main area now: the channels with a <video>, the one shown, the mark to say when
 * none is, and whether the picture leaves the main area to the video (&main=video). */
export type LiveNow = { videos: string[]; shown?: string; lost?: LiveMark; video: boolean };

/** The video this device plays over WebRTC, for the log: a channel in another codec never
 * puts a frame on screen here, whatever the camera and go2rtc do. */
function plays(): string {
  const codecs = globalThis.RTCRtpReceiver?.getCapabilities?.("video")?.codecs ?? [];
  const names = new Set(codecs.map((c) => c.mimeType.replace("video/", "")).filter((c) => !/^(rtx|red|ulpfec|flexfec)/i.test(c)));
  return [...names].join(", ") || "no video it can name";
}

/** How this device plays live video (common.ts: liveBy). Without WebRTC it is said once
 * for the page, in the console: it is how the device is, not a failure. */
export const LIVE_BY = liveBy();
if (LIVE_BY !== "webrtc")
  console.info(`casa-mia: this device has no WebRTC, so ${LIVE_BY ? "live main cameras play as HLS, some seconds behind" : "main cameras are drawn, not live"}, and Talk is not offered`);

export class CommanderLive extends CommanderBase {
  // liveOn is state: Talk is offered while the main camera is wanted live (talk.ts).
  static properties = { ...CommanderBase.properties, liveOn: { state: true } };
  /** The main camera wanted live ("" when none is), whether or not its video plays. */
  protected liveOn = "";
  protected sessions = new Map<string, Session>(); // by channel
  protected bad = new Map<string, LiveMark>(); // the channels that failed, by channel
  protected markedFor = ""; // the main camera the marks belong to
  /** When the card was last out of sight but still streaming (base.ts: leaving). No frame
   * is drawn there, so that time doesn't count against a lease. */
  protected unseen = 0;
  protected beat = 0; // the once-a-second check and redraw, while the card is on the page

  connectedCallback() {
    super.connectedCallback();
    this.beat = window.setInterval(this.onBeat, 1000);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.beat);
    this.endAll();
  }
  /** The picture's stream ended (the page hidden, or out of sight for a while): the live
   * sessions end with it, here and not by drawing (base.ts: cut says why). */
  protected cut(why: string) {
    super.cut(why);
    this.endAll();
  }

  /** Each second, apart from the streams: a session whose lease has lapsed is lost, by
   * the clock alone, so a stall that reports nothing is caught too; then a redraw, for
   * the caption's count and for a mark that has lapsed (its channel is tried again). */
  protected onBeat = () => {
    const now = Date.now();
    if (this.leaving) this.unseen = now;
    for (const [channel, s] of this.sessions) {
      const why = this.lapsed(s, now);
      if (why) this.liveLost(channel, why);
    }
    if (this.liveOn || this.ticking()) this.requestUpdate();
  };
  /** Something besides the live main camera needs the once-a-second redraw: the picture
   * failing (base.ts: refused), and talk.ts adds the call's countdown. */
  protected ticking(): boolean {
    return this.lastError > 0 && Date.now() - this.lastError < PICTURE_DOWN_MS;
  }
  private lapsed(s: Session, now: number): string | null {
    return liveLapsed(Math.max(s.from, this.unseen), s.frameAt && Math.max(s.frameAt, this.unseen), now, LIVE_BY === "hls" ? LIVE_WAIT_HLS_MS : LIVE_WAIT_MS);
  }

  /** Whether the main camera is wanted live: possible here (LIVE_BY), allowed
   * (the compositor's switch, this card's option), and the card shown and not being
   * edited. A failure never changes this: it only marks a channel, for a while. */
  protected liveMain(card: Card): boolean {
    return Boolean(LIVE_BY && card.live_main && this._config?.live_main !== false && this.hass?.connection && this._shown && !this.editing());
  }

  /** What the main area shows now (common.ts: liveOrder, livePlan), for its place, which
   * is laid out in the picture's device pixels (as asked for; fewer away from home).
   * `whole`: the main camera is shown whole in its place, not cropped or stretched to it. */
  protected liveNow(card: Card, main: string, area: Rect, whole: boolean): LiveNow {
    const order = liveOrder(card.cameras[main]?.channels ?? [[main, 0, 0]], [area[2], area[3]], whole);
    const now = Date.now();
    const live = (channel: string) => {
      const s = this.sessions.get(channel);
      return Boolean(s?.frameAt) && this.lapsed(s!, now) === null;
    };
    const { shown, tried } = livePlan(order, live, (channel) => (this.bad.get(channel)?.until ?? 0) > now);

    // Nothing shown: the first try of all leaves the main area to the video, as a start
    // that works needs no drawn main camera; after a failure the drawn picture stays
    // until a frame comes, so the tries go on under it.
    const lost = shown ? undefined : order.map((channel) => this.bad.get(channel)).find(Boolean);
    return { videos: [shown, tried].filter((c): c is string => c !== undefined), shown, lost, video: Boolean(shown || (tried && !lost)) };
  }

  /** Match the sessions to the <video>s drawn (card.ts draws liveNow's). It only watches:
   * talking is a session of its own (talk.ts), so the view can change during a call. */
  protected followLive() {
    const { card, main } = this.now();
    const want = card && this.liveMain(card) ? main : "";
    if (want !== this.liveOn) this.liveOn = want;
    // Another main camera: its channels start unmarked, and going back to one tries it
    // again at once, which makes a tap the way to try now.
    if (want && want !== this.markedFor) {
      this.bad.clear();
      this.markedFor = want;
    }

    const videos = new Map([...this.renderRoot.querySelectorAll<HTMLVideoElement>("video.live")].map((v) => [v.dataset.entity ?? "", v]));
    for (const [channel, s] of this.sessions) if (videos.get(channel) !== s.video) this.endSession(channel);
    for (const [channel, video] of videos) if (!this.sessions.has(channel)) this.startSession(channel, video);
  }

  private startSession(channel: string, video: HTMLVideoElement) {
    const s: Session = { video, stop: () => undefined, from: Date.now(), frameAt: 0 };
    this.sessions.set(channel, s);
    const current = () => this.sessions.get(channel) === s;
    const failed = (why: string) => {
      if (current()) this.liveLost(channel, why);
    };

    // The lease's only proof: a frame actually put on screen.
    if (!video.requestVideoFrameCallback) return failed("this browser can't tell whether its video is playing");
    const seen = () => {
      const first = !s.frameAt;
      s.frameAt = Date.now();
      if (first) this.liveBack(channel);
    };
    let asked = 0; // the one frame callback waited for
    const ask = () => {
      video.cancelVideoFrameCallback(asked);
      asked = video.requestVideoFrameCallback(frame);
    };
    const frame = () => {
      if (!current()) return;
      seen();
      ask();
    };
    ask();
    // A video not yet seen (opacity 0) may be given no frame callback, so its first proof
    // is also a decoded picture's size. Only the first: after it, frames alone renew.
    // And asked again: Safari drops a callback asked for before an HLS stream has loaded
    // (seen 2026-11-11), and with it every renewal after the first.
    video.onloadeddata = video.onresize = video.onplaying = () => {
      if (!current()) return;
      ask();
      if (!s.frameAt && video.videoWidth > 0) seen();
    };

    (LIVE_BY === "hls" ? playHLS : playWebRTC)(this.hass!.connection, channel, video, failed).then(
      (stop) => (current() ? (s.stop = stop) : stop()),
      (err) => failed(err?.message ?? String(err)), // Home Assistant refuses with { code, message }
    );
  }

  private endSession(channel: string) {
    const s = this.sessions.get(channel);
    if (!s) return;
    this.sessions.delete(channel);
    s.video.onloadeddata = s.video.onresize = s.video.onplaying = null;
    s.stop();
  }
  private endAll() {
    for (const channel of [...this.sessions.keys()]) this.endSession(channel);
  }

  /** A channel's video failed or stopped: marked bad for a while (common.ts: liveMark),
   * its session ended, and said. The redraw then shows the next rung of the ladder. */
  private liveLost(channel: string, said: string) {
    const why = said.replace(/\.$/, ""); // it goes inside a sentence
    const s = this.sessions.get(channel);
    const now = Date.now();
    const mark = liveMark(this.bad.get(channel), why, s?.frameAt || s?.from || now, now);
    this.bad.set(channel, mark);
    this.endSession(channel);
    this.report(channel, "lost", `${why}; this device plays ${LIVE_BY === "hls" ? "HLS, having no WebRTC" : plays()}; next try in ${ago(mark.until - now)}`, mark.fails);
    this.requestUpdate();
  }
  /** A channel's first frame: shown at once, and its mark, if it had one, is gone. */
  private liveBack(channel: string) {
    const mark = this.bad.get(channel);
    if (mark) {
      this.bad.delete(channel);
      this.report(channel, "back", `after ${ago(Date.now() - mark.since)} and ${mark.fails} failed ${mark.fails === 1 ? "try" : "tries"}`, mark.fails);
    }
    this.requestUpdate();
  }
  /** Said in Home Assistant's log (RULE TWO), where a wall tablet's trouble can be read
   * from anywhere; its own console is seen by nobody. An integration from before this
   * command refuses it (HA not restarted since the update), which changes nothing here. */
  private report(channel: string, what: "lost" | "back", why: string, fails: number) {
    console.info(`casa-mia: live ${channel} ${what}: ${why}`);
    this.hass
      ?.callWS({ type: "casa_mia_commander/live_report", commander: this._config?.entity ?? "", channel, what, why, fails })
      .catch(() => undefined);
  }

  /** The live main camera's caption: its title with "(live)" while a channel's frames
   * come; with none, and a channel failed, in red how long live has been lost and why. */
  // Over HLS it says it is behind: "live" alone would claim more than is shown.
  protected caption(title: string, place: string, live: LiveNow) {
    return html`<div class="caption ${labelsOf(this.now().card?.layout.labels).main_style}" style=${place}>
      <span class="title">${title}${live.shown ? (LIVE_BY === "hls" ? " (live, some seconds behind)" : " (live)") : ""}</span>
      ${live.lost ? html`<span class="lost">Live lost ${ago(Date.now() - live.lost.since)} ago: ${live.lost.why}</span>` : nothing}
    </div>`;
  }
}
