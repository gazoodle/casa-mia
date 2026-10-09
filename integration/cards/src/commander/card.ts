// The Camera Commander card (see index.ts for how it works).
import { LitElement, css, html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { atHome, type Fit, fire, fitOf, type Hass, heightFor, inDialog, liveChannel, LOOK, lookCss, navigate, ratioFor, TABLET, watchRoom } from "../ha.ts";
import { heightForMain, layout, PANELS, pyRound, type Rect } from "../layout.ts";
import { playWebRTC } from "../../../../app/web/src/webrtc.ts";
import { Motion, dot, motionStyles } from "./motion.ts";
import { Config, Card, LIVE_WAIT_MS, LIVE_GIVE_UP, dashboard, LEAVE_AFTER, VERSION, BLANK, SETTLE_MS, Size, askFor, pictureToken, commanders } from "./common.ts";

export class CommanderCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _size: { state: true },
    _natural: { state: true },
    _fit: { state: true },
    _width: { state: true },
    _token: { state: true },
    _playing: { state: true },
    _liveFailed: { state: true },
    _shown: { state: true },
    _framed: { state: true },
    preview: { type: Boolean },
    layout: { attribute: false },
  };
  /** Set by Home Assistant: "grid" in a section (its Layout tab then sizes the card). */
  layout?: string;
  /** Set by Home Assistant while its dashboard is in edit mode. */
  preview = false;
  _natural = ""; // the picture's own size as the browser decoded it (debug)
  _token = ""; // for the picture through Home Assistant, once asked
  private retry = 0;
  // The live main camera: the channel playing (or starting), its stop, whether it plays,
  // and the main camera it failed for (that one's drawn picture until the main changes).
  private liveOn = "";
  private liveStop?: () => void;
  private liveWait = 0;
  _playing = false;
  _liveFailed = "";
  private liveFails = 0; // failed in a row (see LIVE_GIVE_UP)
  /** Its picture's stream: 0 while the card is off the page or the page hidden, else
   * which showing this is (each showing a new <img>, so a fresh stream). */
  _shown = 0;
  private shows = 0;
  /** Which picture has shown a frame: "s<n>" for showing n's stream, "still" while editing.
   * The highlight waits for it, so it never stands over an empty card. */
  _framed = "";
  private frameWait = 0;
  private motion = new Motion(); // the dots on tiles seeing motion

  private debugOn(): boolean {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    return Boolean((st?.attributes.card as Card | undefined)?.layout.debug?.on);
  }
  hass?: Hass;
  _config?: Config;
  _size: Size | null = null; // the picture asked for: this card's size, once it settles
  _box: [number, number] = [0, 0]; // this card's box now, CSS px (for the debug figures)
  _fit: Fit | null = null; // where it stands (ha.ts: fitOf), once measured
  private settle = 0;
  private resize = new ResizeObserver(([entry]) => {
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
  private measure = () => {
    const fit = fitOf(this, this.layout === "grid" && typeof this._config?.grid_options?.rows === "number");
    if (JSON.stringify(fit) !== JSON.stringify(this._fit)) this._fit = fit;
    if (this.clientWidth !== this._width) this._width = this.clientWidth;
  };
  private widthWatch = new ResizeObserver(() => this.measure());
  private unwatch?: () => void;

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
    this.stopLive();
  }
  /** On screen: a stream (a fresh one when it had none). The page hidden (the app in
   * the background, another tab): none, at once (a hidden page's timers may never
   * run). Out of sight (Home Assistant on another page than the card's: a page left is
   * kept, and still "on screen" to the browser; off the page; scrolled away): none,
   * after its leave_after seconds. */
  private visibility = () => {
    const why = document.hidden
      ? "page hidden"
      : !this.isConnected
        ? "off the page"
        : dashboard() !== this.home
          ? "left the dashboard"
          : !this.inView
            ? "out of view"
            : "";
    if (why) {
      const after = document.hidden ? 0 : (this._config?.leave_after ?? LEAVE_AFTER);
      if (!after) this.cut(why);
      else if (this._shown && !this.leaving) this.leaving = window.setTimeout(() => this.cut(why), after * 1000);
      return;
    }
    clearTimeout(this.leaving);
    this.leaving = 0;
    if (!this._shown) {
      this.sid = Math.random().toString(36).slice(2); // (randomUUID: https only)
      this._shown = ++this.shows;
    }
  };
  /** This showing's name for its stream, so it can tell the server it is done with it. */
  private sid = "";
  private streaming = ""; // the stream's address while shown
  private leaving = 0; // the stream's end, once out of sight
  private home = ""; // the dashboard it is on
  private inView = false;
  private onScreen = new IntersectionObserver((entries) => {
    this.inView = entries[entries.length - 1].isIntersecting;
    this.visibility();
  });
  /** Its picture's stream ended now. Hidden or off the page, a browser goes on loading
   * a stream an <img> started, so the server sends to a viewer who sees nothing; and a
   * card off the page may not be drawn again until it is back, so the stream is ended
   * here, not by drawing. */
  private cut(why: string) {
    clearTimeout(this.leaving);
    this.leaving = 0;
    if (!this._shown) return;
    this._shown = 0;
    this.done(why);
    this.renderRoot?.querySelector<HTMLImageElement>(".picture")?.setAttribute("src", BLANK); // and let go here too
  }
  /** Its stream, if any, ended by the server. */
  private done(why: string) {
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
  private editing(): boolean {
    return this.preview || inDialog(this);
  }
  /** One still picture at the card's size once it settles, while editing (single pictures,
   * not a stream for each size the editor tries); "" while its token is being asked. */
  private stillUrl(card: Card, [W, H, scale]: Size): string {
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
  private look(): string {
    const c = this._config;
    return c?.security_look ? lookCss(c.look_tint ?? LOOK.tint, c.look_strength ?? LOOK.strength, c.look_darkness ?? LOOK.darkness) : "";
  }

  /** The main camera's own shape (width / height): as recorded when the commander was
   * saved, else its largest channel's, else 16:9. */
  private shapeOf(card: Card, main: string): number {
    const known = Number(card.layout.aspects?.[main]);
    if (known > 0) return known;
    const [, w, h] = (card.cameras[main]?.channels ?? []).reduce((a, c) => (c[1] * c[2] > a[1] * a[2] ? c : a), ["", 0, 0]);
    return w && h ? w / h : 16 / 9;
  }
  /** Watch for the picture's first frame: a stream may never fire load, but its
   * naturalWidth is set once a frame is decoded. */
  private watchFrame() {
    clearTimeout(this.frameWait);
    const img = this.renderRoot.querySelector<HTMLImageElement>(".picture, .still");
    if (!img) return;
    const key = img.classList.contains("still") ? "still" : `s${this._shown}`;
    if (key === this._framed) return;
    if (img.naturalWidth > 0) this._framed = key;
    else this.frameWait = window.setTimeout(() => this.watchFrame(), 200);
  }
  updated() {
    this.watchFrame();
    this.measure(); // its rows may have been set or cleared (a new config, or layout)
    if (this.streaming && this.editing()) this.done("editing");
    const box = this.renderRoot.querySelector(".box");
    if (box) {
      this.resize.observe(box);
      this.onScreen.observe(box);
    }
    this.followLive();
    // Debug: the picture's own size as decoded (a stream may never fire load)
    const img = this.renderRoot.querySelector<HTMLImageElement>(".picture");
    const natural = img?.naturalWidth ? `${img.naturalWidth} x ${img.naturalHeight}` : "";
    if (this.debugOn() && natural && natural !== this._natural) this._natural = natural;
  }

  static getConfigElement() {
    return document.createElement("casa-mia-commander-editor");
  }
  static getStubConfig(hass: Hass) {
    return { entity: commanders(hass)[0]?.value ?? "" };
  }
  setConfig(config: Config) {
    this._config = config;
  }
  getCardSize() {
    return 6;
  }
  getGridOptions() {
    return { columns: TABLET.shown ? "full" : 6, rows: "auto" }; // Tablet Layout (and its edit preview): full, its panel's subject; else HA's half
  }

  /** The main camera now: the select's option, by title; else the one at start. */
  /** Through Home Assistant, by the card's `route`, else by where this page is. */
  private viaHa(): boolean {
    const route = this._config?.route ?? "auto";
    return route === "ha" || (route === "auto" && !atHome(location));
  }

  /** The picture's address, at the size asked for; "" while its token is being asked. */
  private pictureUrl(card: Card, [W, H, scale]: Size): string {
    const size = `w=${W}&h=${H}&dpr=${scale}&sid=${this.sid}&v=${encodeURIComponent(VERSION)}`;
    if (!this.viaHa()) return `${card.picture}?${size}`;
    if (!this._token) {
      this.ask();
      return "";
    }
    const path = new URL(card.picture).pathname; // /g/<name>.mjpg
    return `/api/casa_mia_commander/live${path}?${size}&token=${this._token}`;
  }

  private ask(fresh = false) {
    if (!this.hass) return;
    pictureToken(this.hass, fresh).then(
      (t) => (this._token = t),
      () => (this.retry = window.setTimeout(() => this.ask(true), 10_000)),
    );
  }

  /** Refused (an old token) or cut off (the app restarted, say): a new stream soon,
   * through Home Assistant with a new token, else directly as a new showing. */
  private refused() {
    clearTimeout(this.retry);
    this.retry = window.setTimeout(() => (this.viaHa() ? this.ask(true) : this.again()), this.viaHa() ? 5_000 : 3_000);
  }

  /** A new showing (a new <img>, so a fresh stream), while it is shown. */
  private again() {
    if (!this._shown) return;
    this.done("its stream failed");
    this.sid = Math.random().toString(36).slice(2);
    this._shown = ++this.shows;
  }

  /** The card shown now, and its main camera. */
  private now(): { card?: Card; main: string } {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    const card = st?.attributes.card as Card | undefined;
    return { card, main: card ? this.main(card, st!.state) : "" };
  }

  /** Whether the main camera plays live: allowed (the compositor's switch, this card's
   * option), and not failed for this main camera. */
  private liveMain(card: Card, main: string): boolean {
    return Boolean(
      card.live_main && this._config?.live_main !== false && this._liveFailed !== main && this.liveFails < LIVE_GIVE_UP && this.hass?.connection,
    );
  }

  /** The live main camera's channel: the smallest at least its area, which is laid out
   * in the picture's device pixels (as asked for; fewer away from home). */
  private liveEntity(card: Card, main: string, area: Rect): string | undefined {
    const fit = card.layout.main_fit ?? "fit";
    const channels = card.cameras[main]?.channels ?? [[main, 0, 0]];
    return liveChannel(channels, [area[2], area[3]], fit !== "fill" && fit !== "crop");
  }

  /** Start, switch or stop the live main camera to match what is shown. */
  private followLive() {
    const { card, main } = this.now();
    const video = this.renderRoot.querySelector<HTMLVideoElement>("video.live");
    const want = card && video && this.liveMain(card, main) ? (video.dataset.entity ?? "") : "";
    if (want === this.liveOn) return;
    this.stopLive();
    if (!want || !video) return;
    this.liveOn = want;
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

  private stopLive() {
    clearTimeout(this.liveWait);
    this.liveStop?.();
    this.liveStop = undefined;
    this.liveOn = "";
    this._playing = false;
  }

  private main(card: Card, option?: string): string {
    const found = Object.entries(card.cameras).find(([, c]) => c.title === option);
    return found ? found[0] : card.start;
  }

  render() {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    // As saved on the Camera Commander page.
    const card = st?.attributes.card as Card | undefined;
    if (!card)
      return html`<ha-card
        ><div class="note">
          ${!this._config?.entity
            ? "Choose a commander"
            : st
              ? "Not drawn yet: give this commander cameras on the Camera Commander page"
              : `No commander at ${this._config.entity}`}
        </div></ha-card
      >`;
    if (!card.picture) return html`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
    const main = this.main(card, st!.state);
    if (this._liveFailed && this._liveFailed !== main) this._liveFailed = ""; // a new main: try again
    const editing = this.editing();
    const live = !editing && this.liveMain(card, main);
    // Laid out for the picture asked for, as the compositor draws it (compositor.sized).
    const own = card.layout;
    const sized = this._size;
    const [W, H, scale] = sized ?? [own.width, own.height, 1];
    const asked = sized && !editing ? this.pictureUrl(card, sized) : "";
    const src = asked && live ? `${asked}&main=video` : asked;
    const still = editing && sized ? this.stillUrl(card, sized) : "";
    const s = sized ? { ...own, width: W, height: H, gap: pyRound(own.gap * scale), margin: pyRound((own.margin ?? 0) * scale), scale } : own;
    const [[w, h], mainRect, tiles] = layout(s, main);
    const at = ([x, y, rw, rh]: Rect) =>
      `left:${(x / w) * 100}%;top:${(y / h) * 100}%;width:${(rw / w) * 100}%;height:${(rh / h) * 100}%`;
    const lit = s.highlight ?? {};
    const moving = this.motion.seen(this.hass!, st!.attributes.motion ?? {}, this._config!, () => this.requestUpdate());
    const mark = PANELS.flatMap((p) => s[p].cameras.map((e, i) => [e, tiles[p][i]] as const)).find(([e]) => e === main)?.[1];
    // The rule (ha.ts: heightFor). In a tile or a cell, CSS: its height when it gives one,
    // else its own shape.
    const f = this._fit;
    // Its own shape (column, preview): the one that shows the main camera at its own.
    const shape = this._width ? this._width / heightForMain(own, main, this._width, this.shapeOf(card, main)) : own.width / own.height;
    const tall = f && this._width ? heightFor(f, this._width, shape) : null;
    const size = !f || f.mode === "tile" || f.mode === "cell" ? `height:100%;aspect-ratio:${own.width}/${own.height}` : tall ? `height:${tall}px` : "";
    return html`<ha-card style=${size}>
      <div class="box">
        <div class="seen" style="filter:${this.look()}">
        ${editing
          ? still ? html`<img class="still" src=${still} alt="" />` : nothing
          : src && this._shown
          ? keyed(
              this._shown,
              html`<img
                class="picture"
                data-cm-own
                src=${(this.streaming = src)}
                alt=""
                @load=${(ev: Event) => {
                  const img = ev.target as HTMLImageElement;
                  this._natural = `${img.naturalWidth} x ${img.naturalHeight}`;
                }}
                @error=${() => this.refused()}
              />`,
            )
          : nothing}
        ${live && mainRect[2] > 0
          ? html`<video
                class="live"
                data-entity=${this.liveEntity(card, main, mainRect) ?? ""}
                style="${at(mainRect)};object-fit:${({ fill: "fill", crop: "cover" } as Record<string, string>)[own.main_fit ?? "fit"] ?? "contain"};opacity:${this._playing ? 1 : 0}"
                autoplay
                playsinline
                .muted=${true}
              ></video>
              <div class="caption" style=${at(mainRect)}><span>${card.cameras[main]?.title ?? main}${this._playing ? " (live)" : ""}</span></div>`
          : nothing}
        </div>
        ${editing ? html`<div class="hatch"><span>Still picture while editing</span></div>` : nothing}
        ${own.debug?.on
          ? html`<div class="debug" style="color:${own.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${W} x ${H} @${scale}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>`
          : nothing}
        ${PANELS.flatMap((p) =>
          s[p].cameras.map((e, i) =>
            tiles[p][i][2] > 0 && e !== main
              ? html`<div class="zone" style=${at(tiles[p][i])} title=${card.cameras[e]?.title ?? e} @click=${() => this.choose(card, e)}></div>`
              : nothing,
          ),
        )}
        <div class="zone" style=${at(mainRect)} @click=${() => this.open(card, main)}></div>
        ${mark && mark[2] > 0 && this._framed === (editing ? "still" : `s${this._shown}`)
          ? html`<img
              class="highlight ${Number(lit.pulse) > 0 ? (lit.style ?? "breathe") : ""}"
              src=${BLANK}
              alt=""
              style="${at(mark)};border:${lit.width}px solid ${lit.colour};box-shadow:0 0 ${lit.blur}px ${lit.colour};--cm-colour:${lit.colour};--cm-blur:${lit.blur}px;--cm-pulse:${lit.pulse}s;--cm-style:${lit.style}"
            />`
          : nothing}
        ${PANELS.flatMap((p) =>
          s[p].cameras.map((e, i) =>
            // on the main camera's own tile too (as well as on the main picture)
            tiles[p][i][2] > 0 ? dot(moving.get(e), at(tiles[p][i]), this._config!, () => (e === main ? this.open(card, e) : this.choose(card, e))) : nothing,
          ),
        )}
        ${mainRect[2] > 0 ? dot(moving.get(main), at(mainRect), this._config!, () => this.open(card, main)) : nothing}
      </div>
    </ha-card>`;
  }

  private choose(card: Card, camera: string) {
    this.hass?.callService("select", "select_option", { option: card.cameras[camera]?.title }, { entity_id: this._config!.entity });
  }

  /** A tap on the main camera: its more-info (HA's camera dialog, the default), its live
   * page on the camera dashboard (more-info when there is no dashboard), or nothing. */
  private open(card: Card, camera: string) {
    const how = this._config?.tap_main ?? "more-info";
    const page = card.cameras[camera]?.live;
    if (how === "live" && page) navigate(page);
    else if (how !== "none") fire(this, "hass-more-info", { entityId: camera });
  }

  static styles = [motionStyles, css`
    :host {
      display: block;
      height: 100%;
    }
    /* All of its width; its height from the rule (render). Width set: with only a height,
       aspect-ratio would make the width from it (wider than its space). */
    ha-card {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: none;
      border: none;
      box-shadow: none;
    }
    .box,
    .seen {
      position: absolute;
      inset: 0;
    }
    /* What the Security look covers (its filter here): taps go to the zones over it. */
    .seen {
      pointer-events: none;
    }
    .picture,
    .still {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* A still while editing: hatched, so it is not taken for the live picture. */
    .hatch {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 8px;
      background: repeating-linear-gradient(45deg, rgb(255 255 255 / 0.18) 0 4px, rgb(0 0 0 / 0.18) 4px 14px);
      pointer-events: none;
    }
    .hatch span {
      padding: 2px 6px;
      background: rgb(0 0 0 / 0.63);
      color: #fff;
      font: 13px/1.2 sans-serif;
    }
    .zone,
    .highlight,
    .live,
    .caption {
      position: absolute;
      box-sizing: border-box;
    }
    /* The live main camera over the picture (its drawn main area shows until it plays). */
    .live {
      pointer-events: none;
      background: transparent;
      transition: opacity 0.3s;
    }
    /* Its caption, as the compositor draws a main camera's: along the foot, on the left. */
    .caption {
      display: flex;
      align-items: flex-end;
      padding: 0 0 10px 10px;
      pointer-events: none;
    }
    .caption span {
      padding: 2px 6px;
      background: rgb(0 0 0 / 0.63);
      color: #fff;
      font: 20px/1.2 sans-serif;
    }
    .zone {
      cursor: pointer;
    }
    .highlight {
      pointer-events: none;
    }
    /* Its pulse, every --cm-pulse seconds: "breathe", the glow swelling to its full blur and
       back; "ripple", a ring spreading out from the border and fading. Steady for a viewer
       who asked for less motion. */
    .highlight.breathe {
      animation: cm-breathe var(--cm-pulse) ease-in-out infinite;
    }
    .highlight.ripple {
      animation: cm-ripple var(--cm-pulse) ease-out infinite;
    }
    @keyframes cm-breathe {
      0%,
      100% {
        box-shadow: 0 0 calc(var(--cm-blur) / 4) 0 color-mix(in srgb, var(--cm-colour) 30%, transparent);
      }
      50% {
        box-shadow: 0 0 var(--cm-blur) 2px color-mix(in srgb, var(--cm-colour) 70%, transparent);
      }
    }
    @keyframes cm-ripple {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--cm-colour) 60%, transparent);
      }
      70%,
      100% {
        box-shadow: 0 0 0 max(6px, var(--cm-blur)) color-mix(in srgb, var(--cm-colour) 0%, transparent);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .highlight {
        animation: none !important;
      }
    }
    /* Debug: the card's own figures, 70% down the middle (the compositor's are 30% down),
       clear of the corners and the crossing. */
    .debug {
      position: absolute;
      left: 50%;
      top: 70%;
      transform: translate(-50%, -50%);
      padding: 4px 10px;
      background: #000;
      font: 13px/1.4 ui-monospace, monospace;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `];
}
