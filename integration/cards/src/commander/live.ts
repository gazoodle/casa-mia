// The Camera Commander card's second layer: the live main camera, played through Home
// Assistant's WebRTC over the picture. It follows the camera ladder
// (docs/never-silently-stuck.md): live on the channel that fits, else live on another,
// else the drawn picture, with a failed channel tried again later. Every "live" here is a
// lease (RULE FIVE), and every loss is said on the card and in Home Assistant's log.
import { html, nothing } from "lit";
import type { Channel } from "../ha.ts";
import { type Rect } from "../layout.ts";
import { labelsOf } from "../labels.ts";
import { playHLS, playWebRTC } from "../../../../app/web/src/webrtc.ts";
import { Card, LIVE_WAIT_HLS_MS, LIVE_WAIT_MS, type LiveMark, PICTURE_DOWN_MS, ago, channelTier, liveBy, liveLapsed, liveMark, liveOrder, livePlan, liveStatus, playable } from "./common.ts";
import { CommanderBase } from "./base.ts";
import { type CaptionPress, detectionChips, latest, latestChip, pressable } from "./detect.ts";
import { FOLDERS, type Shelf, shelfOf, whenSaid } from "./clips.ts";
import { isGuest } from "../guest-goodbye.ts";
import { tierBars } from "../pills.ts";

/** One channel playing (or starting) in its <video>: when it started, when it last put a
 * frame on screen (0: none yet), and how to move its stream to another <video>. */
type Session = { video: HTMLVideoElement; stop: () => void; move: (to: HTMLVideoElement) => void; from: number; frameAt: number };

/** The main area now: the channels with a <video>, the one shown, the mark to say when
 * none is, whether the picture leaves the main area to the video (&main=video), and what
 * the caption's chip says of it (common.ts: liveStatus). */
export type LiveNow = { videos: string[]; shown?: string; lost?: LiveMark; video: boolean; status: ReturnType<typeof liveStatus> };

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

/** What this device says of decoding a codec at a size (MediaCapabilities): true when
 * smoothly, false when not, undefined while asked or when it can't answer. Asked once for
 * the page per codec and size: the answer is the device's own.
 *
 * Asked two ways, over WebRTC and as a file, and false if either says no: Android WebView
 * 140 says yes over WebRTC at any size (even 7680 x 4320, on a tablet whose decoder stops
 * at 2560 x 1440), while as a file it knows the limit; 157 knows it both ways. */
const DECODES = new Map<string, boolean | undefined>();
/** Each codec as WebRTC names it, and as a file, at a level every camera's size fits. */
const MIME: Record<string, [webrtc: string, file: string]> = {
  hevc: ["video/H265", 'video/mp4; codecs="hvc1.1.6.L153.B0"'],
  h264: ["video/H264", 'video/mp4; codecs="avc1.640033"'],
  av1: ["video/AV1", 'video/mp4; codecs="av01.0.13M.08"'],
  vp9: ["video/VP9", 'video/webm; codecs="vp09.00.51.08"'],
  vp8: ["video/VP8", 'video/webm; codecs="vp8"'],
};
function decodes([, w, h, codec]: Channel, answered: () => void): boolean | undefined {
  const mime = MIME[codec ?? ""];
  if (LIVE_BY !== "webrtc" || !mime || !w || !h || !navigator.mediaCapabilities) return undefined;
  const key = `${mime[0].slice(6)} at ${w} x ${h}`;

  if (!DECODES.has(key)) {
    DECODES.set(key, undefined);
    const ask = (type: "webrtc" | "file", contentType: string) =>
      navigator.mediaCapabilities.decodingInfo({ type, video: { contentType, width: w, height: h, bitrate: 4_000_000, framerate: 30 } }).then(
        ({ supported, smooth }) => supported && smooth,
        (err) => void console.info(`casa-mia: this device can't say whether it decodes ${key} ${type === "file" ? "as a file" : "over WebRTC"} (${err?.message ?? err})`),
      );

    // A question it can't answer is not a no; with neither answered, its channels are tried.
    void Promise.all([ask("webrtc", mime[0]), ask("file", mime[1])]).then(([rtc, file]) => {
      const can = rtc === false || file === false ? false : (rtc ?? file);
      DECODES.set(key, can);
      if (can === false) console.info(`casa-mia: this device says it can't decode ${key} smoothly ${rtc === false ? "over WebRTC" : "as a file"}, so its channels that size aren't tried`);
      answered();
    });
  }
  return DECODES.get(key);
}

export class CommanderLive extends CommanderBase {
  // liveOn is state: Talk is offered while the main camera is wanted live (talk.ts).
  static properties = { ...CommanderBase.properties, liveOn: { state: true }, _clips: { state: true } };
  /** The main camera wanted live ("" when none is), whether or not its video plays. */
  protected liveOn = "";
  /** The camera whose recordings are open (clips-dialog.ts), as it was pressed, and the
   * kind it opened on: another main camera meanwhile (a tap elsewhere, Track motion)
   * leaves the dialog as it is. */
  protected _clips: { camera: string; name: string; shelf: Shelf } | null = null;
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

  /** A camera's channels this device is to try: those it says it can decode (common.ts:
   * playable). The card is redrawn when it answers, so a channel ruled out goes at once. */
  protected channelsHere(card: Card, camera: string): Channel[] {
    return playable(card.cameras[camera]?.channels ?? [[camera, 0, 0]], (channel) => decodes(channel, () => this.requestUpdate()));
  }

  /** What the main area shows now (common.ts: liveOrder, livePlan), for its place, which
   * is laid out in the picture's device pixels (as asked for; fewer away from home).
   * `whole`: the main camera is shown whole in its place, not cropped or stretched to it. */
  protected liveNow(card: Card, main: string, area: Rect, whole: boolean): LiveNow {
    const order = liveOrder(this.channelsHere(card, main), [area[2], area[3]], whole);
    const now = Date.now();
    const live = (channel: string) => {
      const s = this.sessions.get(channel);
      return Boolean(s?.frameAt) && this.lapsed(s!, now) === null;
    };
    const plan = livePlan(order, live, (channel) => (this.bad.get(channel)?.until ?? 0) > now);
    const { shown, tried } = plan;

    // Nothing shown: the first try of all leaves the main area to the video, as a start
    // that works needs no drawn main camera; after a failure the drawn picture stays
    // until a frame comes, so the tries go on under it.
    const lost = shown ? undefined : order.map((channel) => this.bad.get(channel)).find(Boolean);
    const status = liveStatus(plan, (channel) => this.bad.get(channel), now);
    return { videos: [shown, tried].filter((c): c is string => c !== undefined), shown, lost, video: Boolean(shown || (tried && !lost)), status };
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
    for (const [channel, s] of this.sessions) {
      const video = videos.get(channel);
      if (video === s.video) continue;
      // Its channel drawn in another <video> (the main area to the camera's full screen,
      // and back): a stream with frames moves to it, so the picture carries on while a
      // better channel gets ready (common.ts: livePlan). Ending it here cost a new start
      // from nothing, 5 to 10 s of black on the box (owner, 2026-11-27). One not yet
      // showing frames, or HLS's (an address, not a stream), starts afresh there.
      if (video && s.frameAt && s.video.srcObject) s.move(video);
      else this.endSession(channel);
    }
    for (const [channel, video] of videos) if (!this.sessions.has(channel)) this.startSession(channel, video);
  }

  private startSession(channel: string, video: HTMLVideoElement) {
    const s: Session = { video, stop: () => undefined, move: () => undefined, from: Date.now(), frameAt: 0 };
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
      if (first) this.liveBack(channel, s.frameAt - s.from);
    };
    let asked = 0; // the one frame callback waited for, on the session's <video> now
    const ask = () => {
      s.video.cancelVideoFrameCallback(asked);
      asked = s.video.requestVideoFrameCallback(frame);
    };
    const frame = () => {
      if (!current()) return;
      seen();
      ask();
    };
    // A video not yet seen (opacity 0) may be given no frame callback, so its first proof
    // is also a decoded picture's size. Only the first: after it, frames alone renew.
    // And asked again: Safari drops a callback asked for before an HLS stream has loaded
    // (seen 2026-11-11), and with it every renewal after the first.
    const loaded = () => {
      if (!current()) return;
      ask();
      if (!s.frameAt && s.video.videoWidth > 0) seen();
    };
    const watch = (v: HTMLVideoElement) => {
      v.onloadeddata = v.onresize = v.onplaying = loaded;
      ask();
    };
    // The stream, and the watch on it, to another <video>. The connection decodes it, not
    // the element, so the next frame shows at once: nothing is asked of the camera again.
    s.move = (to) => {
      const from = s.video;
      from.cancelVideoFrameCallback(asked);
      from.onloadeddata = from.onresize = from.onplaying = null;
      to.srcObject = from.srcObject;
      from.srcObject = null;
      s.video = to;
      watch(to);
    };
    watch(video);

    (LIVE_BY === "hls" ? playHLS : playWebRTC)(this.hass!.connection, channel, video, failed).then(
      (stop) => (current() ? (s.stop = stop) : stop()),
      (err) => failed(err?.message ?? JSON.stringify(err)), // Home Assistant refuses with { code, message }
    );
  }

  private endSession(channel: string) {
    const s = this.sessions.get(channel);
    if (!s) return;
    this.sessions.delete(channel);
    s.video.onloadeddata = s.video.onresize = s.video.onplaying = null;
    s.stop();
    // playWebRTC's close clears the <video> it was given; a moved stream's is another one.
    if (s.video.srcObject) s.video.srcObject = null;
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
  /** A channel's first frame, `took` ms after its session started: shown at once, said
   * with how long it took (to measure a start), and its mark, if it had one, is gone. */
  private liveBack(channel: string, took: number) {
    const first = `first frame ${(took / 1000).toFixed(1)} s after it was asked for`;
    const mark = this.bad.get(channel);
    if (mark) {
      this.bad.delete(channel);
      this.report(channel, "back", `after ${ago(Date.now() - mark.since)} and ${mark.fails} failed ${mark.fails === 1 ? "try" : "tries"}; ${first}`, mark.fails);
    } else this.report(channel, "started", first, 0);
    this.requestUpdate();
  }
  /** Said in Home Assistant's log (RULE TWO), where a wall tablet's trouble can be read
   * from anywhere; its own console is seen by nobody. An integration from before this
   * command refuses it (HA not restarted since the update), which changes nothing here. */
  private report(channel: string, what: "started" | "lost" | "back", why: string, fails: number) {
    console.info(`casa-mia: live ${channel} ${what}: ${why}`);
    this.hass
      ?.callWS({ type: "casa_mia_commander/live_report", commander: this._config?.entity ?? "", channel, what, why, fails })
      .catch(() => undefined);
  }

  /** The main camera's caption, live or not (the picture is asked for without its name
   * and clock: card.ts, ?main=card): its name alone; while its frames come a LIVE pill
   * and the channel playing as bars (Protect's only, its tier and size on hover; owner,
   * 2026-11-27); a chip while live is
   * starting, a better channel is coming or one has failed (common.ts: liveStatus); a
   * chip for each thing its camera has just reported (detect.ts); with no frames
   * and a channel failed, in red how long live has been lost and why; and the clock while
   * the main camera isn't live video, as the picture drew it. Drawn over the tap zones,
   * so its chips take the pointer, and its name where it opens the camera's recordings;
   * the rest of it lets taps through. `tap` is the main picture's own; `more` follows
   * the chips (card.ts: the closer look's chip). Where the camera has recordings and
   * nothing is current, a chip says its latest detection and when, so it is seen there is
   * something to watch. A guest is never offered the recordings (owner, 2026-11-27): the
   * card's limit only, as Home Assistant's own Media browser serves any signed-in user. */
  protected caption(title: string, place: string, live: LiveNow | null, tap: () => void, more: unknown = nothing) {
    const { card, main } = this.now();
    const style = labelsOf(card?.layout.labels).main_style;
    const opens = !isGuest(this.hass!) && FOLDERS.offered(this.hass!, main, () => this.requestUpdate());
    const press: CaptionPress = { press: opens ? (kind) => (this._clips = { camera: main, name: title, shelf: shelfOf(kind ?? "") }) : tap, opens };
    // A press on LIVE, the bars or the status chip is the main picture's own, as on a chip
    // of a camera without recordings: they take the pointer only for their tooltips.
    const shown = { press: tap, opens: false };

    // While its frames come: LIVE, or over HLS "Delayed", as "live" alone would claim more
    // than is shown; then the channel playing as bars, its tier and size on hover.
    let playing: unknown = nothing;
    if (live?.shown) {
      const hls = LIVE_BY === "hls";
      const tone = hls ? "cm-muted" : "cm-good";
      const tier = channelTier(live.shown);
      const size = tier ? card?.cameras[main]?.channels?.find(([channel]) => channel === live.shown) : undefined;
      playing = html`<span class="playing">${pressable(`cm-pill cm-solid ${tone}`, hls ? "Live over HLS, some seconds behind" : "Live video", hls ? "Delayed" : "Live", shown)}${
        tier ? pressable(`cm-pill cm-solid ${tone}`, `${tier}${size?.[1] ? `, ${size[1]} × ${size[2]}` : ""}`, tierBars(tier), shown) : nothing
      }</span>`;
    }

    // What the live video is doing where it isn't simply playing its best.
    const s = live?.status;
    const status = s ? pressable(`live-status cm-chip cm-${s.tone}`, s.tip, html`${tierBars(s.tier)}${s.text}`, shown) : nothing;
    const name = opens ? pressable("title", "Its recordings", title, press) : html`<span class="title">${title}</span>`;
    const now = this.detections();
    const last = opens && !now.length ? latest(this.hass!, this.eventsOf(main), this.firedOf()) : null;
    const chips = now.length
      ? detectionChips(now, press)
      : opens
        ? latestChip(last, last ? whenSaid(last.since, this.hass?.config?.time_zone, Date.now()) : "", press)
        : nothing;
    const lost = live?.lost ? html`<span class="lost">Live lost ${ago(Date.now() - live.lost.since)} ago: ${live.lost.why}</span>` : nothing;
    const clock = live?.video ? nothing : html`<casa-mia-commander-clock class="clock" .zone=${this.hass?.config?.time_zone}></casa-mia-commander-clock>`;
    // A bar runs along the whole foot, the name and LIVE at its left and the clock at its
    // right, with the chips standing above it; otherwise LIVE and the chips follow the name.
    return style === "bar"
      ? html`<div class="caption bar" style=${place}>${status}${chips}${more}${lost}<div class="foot">${name}${playing}${clock}</div></div>`
      : html`<div class="caption ${style}" style=${place}>${name}${playing}${status}${chips}${more}${lost}${clock}</div>`;
  }

  /** The recordings dialog while one is open (card.ts draws it beside the tuning dialog). */
  protected clipsDialog() {
    const c = this._clips;
    if (!c) return nothing;

    // The camera's shape, which the preview takes (clips-styles.ts: .stage).
    const { card } = this.now();
    return html`<casa-mia-commander-clips
      .hass=${this.hass}
      .camera=${c.camera}
      .name=${c.name}
      .shelf=${c.shelf}
      .shape=${card ? this.shapeOf(card, c.camera) : 16 / 9}
      .doorbell=${Object.values(this.eventsOf(c.camera)).includes("doorbell")}
      @closed=${() => (this._clips = null)}
    ></casa-mia-commander-clips>`;
  }
}
