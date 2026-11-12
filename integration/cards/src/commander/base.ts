// The Camera Commander card's first layer (see index.ts for how it works): the picture
// stream, its size and token, and whether the card is in sight.
import { LitElement } from "lit";
import { atHome, type Fit, fitOf, type Hass, inDialog, LOOK, lookCss, ratioFor, watchRoom } from "../ha.ts";
import { Motion } from "./motion.ts";
import { Config, Card, dashboard, LEAVE_AFTER, VERSION, BLANK, SETTLE_MS, Size, askFor, framesAddress, pictureToken, pictureDown } from "./common.ts";

/** Learned once for the page: its pictures through Home Assistant come as frames over a
 * WebSocket (see CommanderBase.frames), so its other cards and later showings start so. */
let pageFrames = false;

export class CommanderBase extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _size: { state: true },
    _natural: { state: true },
    _fit: { state: true },
    _width: { state: true },
    _token: { state: true },
    _shown: { state: true },
    _framed: { state: true },
    _full: { state: true },
    preview: { type: Boolean },
    layout: { attribute: false },
  };
  /** Set by Home Assistant: "grid" in a section (its Layout tab then sizes the card). */
  layout?: string;
  /** Set by Home Assistant while its dashboard is in edit mode. */
  preview = false;
  _natural = ""; // the picture's own size as the browser decoded it (debug)
  _token = ""; // for the picture through Home Assistant, once asked
  protected retry = 0;
  /** The picture failing (common.ts: pictureDown): this run's first error, and the last. */
  protected downSince = 0;
  protected lastError = 0;
  /** Its picture's stream: 0 while the card is off the page or the page hidden, else
   * which showing this is (each showing a new <img>, so a fresh stream). */
  _shown = 0;
  protected shows = 0;
  /** Which picture has shown a frame: "s<n>" for showing n's stream, "still" while editing.
   * The highlight waits for it, so it never stands over an empty card. */
  _framed = "";
  /** The camera shown full screen ("" when none is): the one tapped, kept even when the
   * shared Main camera select changes on another device (card.ts: full screen). */
  _full = "";
  protected frameWait = 0;
  protected motion = new Motion(); // the dots on tiles seeing motion
  protected run = ""; // the app's run the stream comes from (Card.run)

  protected debugOn(): boolean {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    return Boolean((st?.attributes.card as Card | undefined)?.layout.debug?.on);
  }
  hass?: Hass;
  _config?: Config;
  _size: Size | null = null; // the picture asked for: this card's size, once it settles
  _box: [number, number] = [0, 0]; // this card's box now, CSS px (for the debug figures)
  _fit: Fit | null = null; // where it stands (ha.ts: fitOf), once measured
  protected settle = 0;
  protected resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    this._box = [Math.round(width * 10) / 10, Math.round(height * 10) / 10];
    this.measure();
    if (this.debugOn()) this.requestUpdate();
    const size = askFor(width, height, ratioFor(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
    clearTimeout(this.settle);
    if (String(size) === String(this._size)) return;
    if (!this._size) this._size = size; // the first at once; then each once it holds
    else this.settle = window.setTimeout(() => (this._size = size), SETTLE_MS);
  });

  _width = 0; // its width now (all of its space), CSS px
  protected measure = () => {
    const fit = fitOf(this, this.layout === "grid" && typeof this._config?.grid_options?.rows === "number");
    if (JSON.stringify(fit) !== JSON.stringify(this._fit)) this._fit = fit;
    if (this.clientWidth !== this._width) this._width = this.clientWidth;
  };
  protected widthWatch = new ResizeObserver(() => this.measure());
  protected unwatch?: () => void;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibility);
    // Home Assistant's own navigation, and back and forward: a page left may be kept,
    // neither removed nor hidden in a way the browser tells (see visibility).
    window.addEventListener("location-changed", this.visibility);
    window.addEventListener("popstate", this.visibility);
    this.home = dashboard();
    const box = this.renderRoot?.querySelector(".box"); // back on the page: not drawn again
    if (box) this.onScreen.observe(box);
    this.unwatch = watchRoom(this.measure);
    this.widthWatch.observe(this);
    requestAnimationFrame(this.measure);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.motion.stop();
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("location-changed", this.visibility);
    window.removeEventListener("popstate", this.visibility);
    this.onScreen.disconnect();
    this.inView = false;
    this.visibility(); // off the page: as out of sight (kept, it may come back)
    this.unwatch?.();
    this.widthWatch.disconnect();
    this.resize.disconnect();
    clearTimeout(this.settle);
    clearTimeout(this.retry);
    clearTimeout(this.frameWait);
  }
  /** On screen: a stream (a fresh one when it had none). The page hidden (the app in
   * the background, another tab): none, at once (a hidden page's timers may never
   * run). Out of sight (Home Assistant on another page than the card's: a page left is
   * kept, and still "on screen" to the browser; off the page; scrolled away): none,
   * after its leave_after seconds. */
  protected visibility = () => {
    const why = document.hidden
      ? "page hidden"
      : !this.isConnected
        ? "off the page"
        : dashboard() !== this.home
          ? "left the dashboard"
          : !this.inView
            ? "out of view"
            : "";
    if (why) return this.outOfSight(why);
    clearTimeout(this.leaving);
    this.leaving = 0;
    if (!this._shown) {
      this.sid = Math.random().toString(36).slice(2); // (randomUUID: https only)
      this._shown = ++this.shows;
    }
  };
  /** Out of sight for `why`: its stream ends after leave_after seconds (at once when the
   * page is hidden). A higher layer adds what must stop at once (talk.ts). */
  protected outOfSight(why: string) {
    const after = document.hidden ? 0 : (this._config?.leave_after ?? LEAVE_AFTER);
    if (!after) this.cut(why);
    else if (this._shown && !this.leaving) this.leaving = window.setTimeout(() => this.cut(why), after * 1000);
  }
  /** This showing's name for its stream, so it can tell the server it is done with it. */
  protected sid = "";
  protected streaming = ""; // the stream's address while shown
  protected leaving = 0; // the stream's end, once out of sight
  protected home = ""; // the dashboard it is on
  protected inView = false;
  protected onScreen = new IntersectionObserver((entries) => {
    this.inView = entries[entries.length - 1].isIntersecting;
    this.visibility();
  });
  /** Its picture's stream ended now. Hidden or off the page, a browser goes on loading
   * a stream an <img> started, so the server sends to a viewer who sees nothing; and a
   * card off the page may not be drawn again until it is back, so the stream is ended
   * here, not by drawing. */
  protected cut(why: string) {
    clearTimeout(this.leaving);
    this.leaving = 0;
    if (!this._shown) return;
    this._shown = 0;
    this.done(why);
    this.renderRoot?.querySelector<HTMLImageElement>(".picture")?.setAttribute("src", BLANK); // and let go here too
  }
  /** The picture comes as frames over a WebSocket, not as a stream in the <img>. Safari
   * drops an endless stream that comes through a service worker, and Home Assistant's
   * worker handles every GET on its address once it controls the page (over https), so
   * there the <img> stream fails each time while everything else works. A worker never
   * sees a WebSocket. It is found by the failure itself (refused), not by the browser's
   * name, so Chrome keeps its stream, which the browser itself decodes. */
  protected frames = pageFrames;
  protected socket: WebSocket | null = null;
  protected socketFor = ""; // the address its socket was opened for, open or failed
  protected frameUrl = ""; // the frame shown, a blob: address

  /** Match the socket to the picture drawn (card.ts: updated). A socket that failed is
   * not opened again for the same address: refused asks for a new token, which makes a
   * new one. */
  protected followPicture() {
    const want = this.frames && this._shown ? framesAddress(this.streaming, location.href) : "";
    if (want === this.socketFor) return;
    this.closeSocket();
    if (!want) return;

    this.socketFor = want;
    const ws = (this.socket = new WebSocket(want));
    ws.onmessage = (ev) => {
      const img = this.renderRoot.querySelector<HTMLImageElement>(".picture");
      if (this.socket !== ws || !img) return;
      const old = this.frameUrl;
      img.src = this.frameUrl = URL.createObjectURL(ev.data as Blob);
      URL.revokeObjectURL(old);
    };
    // Ended by the other side (refused, the app restarted, the network): as an <img>'s error.
    ws.onclose = () => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.refused();
    };
  }
  private closeSocket() {
    const ws = this.socket;
    this.socket = null; // first, so its onclose is not taken for a failure
    this.socketFor = "";
    ws?.close();
    URL.revokeObjectURL(this.frameUrl);
    this.frameUrl = "";
  }

  /** Its stream, if any, ended by the server. */
  protected done(why: string) {
    this.closeSocket();
    // Said to the server (directly, or through Home Assistant: the same address with
    // /done for .mjpg), which ends it: no relying on the browser (WebKit keeps loading a
    // stream an <img> let go), Home Assistant or Nabu Casa letting the connection go. A
    // beacon goes even as a page is left. The address is its own record, not the
    // <img>'s, which something else may have changed.
    const was = this.streaming;
    this.streaming = "";
    if (was.includes(".mjpg?")) navigator.sendBeacon(`${was.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(why)}`);
  }
  /** Being edited (the dashboard in edit mode, or the card editor's preview): a still
   * picture, not the stream. Edit mode resizes the card at every step, and each new
   * size would be a new stream from the compositor. */
  protected editing(): boolean {
    return this.preview || inDialog(this);
  }
  /** One still picture at the card's size once it settles, while editing (single pictures,
   * not a stream for each size the editor tries); "" while its token is being asked. */
  protected stillUrl(card: Card, [W, H, scale]: Size): string {
    const still = `${card.picture.replace(".mjpg", ".jpg")}?w=${W}&h=${H}&dpr=${scale}`;
    if (!this.viaHa()) return still;
    if (!this._token) {
      this.ask();
      return "";
    }
    const url = new URL(still);
    return `/api/casa_mia_commander/live${url.pathname}${url.search}&token=${this._token}`;
  }

  /** The Security look's filter while it is on, else "". */
  protected look(): string {
    const c = this._config;
    return c?.security_look ? lookCss(c.look_tint ?? LOOK.tint, c.look_strength ?? LOOK.strength, c.look_darkness ?? LOOK.darkness) : "";
  }

  /** The main camera's own shape (width / height): as recorded when the commander was
   * saved, else its largest channel's, else 16:9. */
  protected shapeOf(card: Card, main: string): number {
    const known = Number(card.layout.aspects?.[main]);
    if (known > 0) return known;
    const [, w, h] = (card.cameras[main]?.channels ?? []).reduce((a, c) => (c[1] * c[2] > a[1] * a[2] ? c : a), ["", 0, 0]);
    return w && h ? w / h : 16 / 9;
  }
  /** Watch for the picture's first frame: a stream may never fire load, but its
   * naturalWidth is set once a frame is decoded. */
  protected watchFrame() {
    clearTimeout(this.frameWait);
    const img = this.renderRoot.querySelector<HTMLImageElement>(".picture, .still");
    if (!img) return;
    const key = img.classList.contains("still") ? "still" : `s${this._shown}`;
    if (key === this._framed) return;
    if (img.naturalWidth > 0) this._framed = key;
    else this.frameWait = window.setTimeout(() => this.watchFrame(), 200);
  }
  /** The main camera now: the select's option, by title; else the one at start. */
  /** Through Home Assistant, by the card's `route`, else by where this page is. */
  protected viaHa(): boolean {
    const route = this._config?.route ?? "auto";
    return route === "ha" || (route === "auto" && !atHome(location));
  }

  /** The picture's address, at the size asked for; "" while its token is being asked. */
  protected pictureUrl(card: Card, [W, H, scale]: Size): string {
    const size = `w=${W}&h=${H}&dpr=${scale}&sid=${this.sid}&v=${encodeURIComponent(VERSION)}`;
    if (!this.viaHa()) return `${card.picture}?${size}`;
    if (!this._token) {
      this.ask();
      return "";
    }
    const path = new URL(card.picture).pathname; // /g/<name>.mjpg
    return `/api/casa_mia_commander/live${path}?${size}&token=${this._token}`;
  }

  protected ask(fresh = false) {
    if (!this.hass) return;
    pictureToken(this.hass, fresh).then(
      (t) => (this._token = t),
      () => (this.retry = window.setTimeout(() => this.ask(true), 10_000)),
    );
  }

  /** Refused (an old token) or cut off (the app restarted, say): a new stream soon,
   * through Home Assistant with a new token, else directly as a new showing. */
  protected refused() {
    // The first failure on a page a service worker controls: frames from now on, at
    // once and without a word, as on Safari it is no failure of the picture (see
    // frames). A real failure is then the socket's, and comes back here.
    if (!this.frames && this.viaHa() && navigator.serviceWorker?.controller) {
      if (!pageFrames) console.info("casa-mia: the picture's stream failed on a page a service worker controls; its frames come over a WebSocket from now on");
      this.frames = pageFrames = true;
      this.requestUpdate();
      return;
    }

    const now = Date.now();
    if (!pictureDown(this.downSince, this.lastError, now)) {
      this.downSince = now;
      console.warn(`casa-mia: the picture failed (${this.viaHa() ? "through Home Assistant" : "direct"}); retrying until it comes`);
    }
    this.lastError = now;
    this.requestUpdate();
    clearTimeout(this.retry);
    this.retry = window.setTimeout(() => (this.viaHa() ? this.ask(true) : this.again()), this.viaHa() ? 5_000 : 3_000);
  }

  /** A new showing (a new <img>, so a fresh stream), while it is shown. */
  protected again() {
    if (!this._shown) return;
    this.done("its stream failed");
    this.frames ||= pageFrames; // another card on the page may have learned it since
    this.sid = Math.random().toString(36).slice(2);
    this._shown = ++this.shows;
  }

  /** The card shown now, and its main camera. */
  protected now(): { card?: Card; main: string } {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    const card = st?.attributes.card as Card | undefined;
    return { card, main: card ? this.main(card, st!.state) : "" };
  }

  protected main(card: Card, option?: string): string {
    if (this._full && card.cameras[this._full]) return this._full;
    const found = Object.entries(card.cameras).find(([, c]) => c.title === option);
    return found ? found[0] : card.start;
  }
}
