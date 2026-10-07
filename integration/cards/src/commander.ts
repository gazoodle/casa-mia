// Camera Commander card: one commander, chosen by its Main camera select, drawn from what
// the select's `card` attribute says (the app's CameraDashboard._card): the compositor's
// picture, and over it the tap zones laid out by the same engine the compositor draws with.
// A tap on a panel camera makes it the main one; a tap on the main camera opens its live
// page (or its more-info). With `draft`, it follows the saved draft (`draft_card`, the draft
// compositor) instead of what is live. The highlight on the main camera's tile is an <img>
// marked #cm-highlight, as on the generated dashboard, so cm-streams.js pulses it (and gives the
// picture its Security look, and stops it while off screen).
// The picture is drawn exactly the size the card is shown: the card asks the compositor for
// its own size (device pixels, ?w=&h=&dpr=), and lays its taps out for the same canvas, so
// nothing is scaled, cropped or bordered on the screen. Its size follows the cards' one rule
// (ha.ts: fitOf, heightFor): always all of its width; alone in a Panel view, all of the
// screen below its top edge; filling a Tablet Layout's panel, the panel; in a column, the commander's
// own shape (16:9) from its width, at most the screen below its top edge.
// With live main (the card's option, on by default, while the compositor's Live main camera
// switch is on), the main camera plays as live video over the picture, through Home
// Assistant's WebRTC as its own camera cards play it: the tablet decodes it (the box draws
// the picture without it, ?main=video), at full frame rate. The channel is the smallest at
// least the main area's size in device pixels (fewer away from home, as the picture). The
// card draws its caption. A video that does not start within LIVE_WAIT_MS, or fails, gives
// way to the drawn picture, until the main camera changes. The Security look reaches it as
// it does the picture (cm-streams.js, by data-cm-picture).
// The picture comes straight from the compositor at home (its LAN address), else through
// Home Assistant (the integration's pictures.py): away from home that address is out of
// reach, and on an HTTPS page an http:// picture is blocked. Home is told by how this page
// reached Home Assistant (atHome), which the companion app already chooses by the Wi-Fi it
// is on (its internal or external URL); `route` overrides it. Through Home Assistant the
// picture is asked for at no more than `away_sharpness`'s pixel ratio (Balanced: 1.5), as
// a 2x or 3x screen's own is up to four times the bytes over a slower link.
import { LitElement, css, html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { atHome, define, type Fit, fire, fitOf, type Hass, heightFor, liveChannel, navigate, ratioFor, register, type Sharpness, watchRoom } from "./ha.ts";
import { layout, PANELS, pyRound, type Rect, type Settings } from "./layout.ts";
import { playWebRTC } from "../../../app/web/src/webrtc.ts";

type Route = "auto" | "direct" | "ha";
type Config = { type: string; entity?: string; draft?: boolean; tap_main?: "live" | "more-info" | "none"; route?: Route; away_sharpness?: Sharpness; live_main?: boolean; leave_after?: number };
type Card = {
  picture: string;
  layout: Settings & { highlight?: Record<string, string | number>; debug?: { on?: boolean; colour?: string } };
  start: string;
  /** Each camera: its title, live page, and channels smallest first, with their sizes. */
  cameras: Record<string, { title: string; live: string; channels?: [string, number, number][] }>;
  /** The compositor's Live main camera switch. */
  live_main?: boolean;
};
const LIVE_WAIT_MS = 10_000; // a live main camera not playing by then gives way to the picture
/** The dashboard (or other page) shown: its path's first part, as a view's path may
 * change under a card (/lovelace becomes /lovelace/0); a card on another view of the
 * same dashboard is taken off the page. */
const dashboard = () => location.pathname.split("/")[1] ?? "";
/** Seconds a card's stream goes on once it is out of sight (its dashboard left,
 * scrolled away), so a quick return (the back button) finds it still running. */
const LEAVE_AFTER = 15;
/** This card's version: its script's ?v= (the integration loads it so), named in each
 * stream it asks for, so the server's log and table say which card is running. */
export const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// As the compositor's (compositor.py: MAX_PIXELS, MIN_SIDE, asked_size).
const MAX_PIXELS = 2560 * 1600;
const MIN_SIDE = 64;
const SETTLE_MS = 400; // a size must hold this long before a new picture is asked for
type Size = [w: number, h: number, scale: number];

/** The picture to ask for, for a box w x h CSS pixels: in device pixels, capped at
 * MAX_PIXELS (same shape; text and gaps then shrink with it), rounded to 8 so near sizes
 * share one picture. Null when too small to draw. */
export function askFor(w: number, h: number, dpr: number): Size | null {
  const k = Math.min(1, Math.sqrt(MAX_PIXELS / (w * dpr * h * dpr)));
  const [W, H] = [8 * pyRound((w * dpr * k) / 8), 8 * pyRound((h * dpr * k) / 8)];
  return Math.min(W, H) >= MIN_SIDE ? [W, H, Math.round(dpr * k * 100) / 100 || 1] : null;
}

// The token for pictures through Home Assistant, shared by every card on the page; asked
// again after half its life, or after a picture is refused (HA restarted, say).
let token: { value: Promise<string>; until: number } | null = null;
function pictureToken(hass: Hass, fresh = false): Promise<string> {
  if (fresh || !token || Date.now() > token.until) {
    const value = hass.callWS({ type: "casa_mia/picture_token" }).then((r: { token: string }) => r.token);
    token = { value, until: Date.now() + 12 * 3600_000 };
    value.catch(() => (token = null));
  }
  return token.value;
}

/** The commanders HA knows: their Main camera selects, by name. */
export function commanders(hass: Hass): { value: string; label: string }[] {
  return Object.entries(hass.states)
    .filter(([id, st]) => id.startsWith("select.") && (st.attributes.card || st.attributes.draft_card))
    .map(([id, st]) => ({ value: id, label: String(st.attributes.friendly_name ?? id) }));
}

class CommanderCard extends LitElement {
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
  };
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
  /** Its picture's stream: 0 while the card is off the page or the page hidden, else
   * which showing this is (each showing a new <img>, so a fresh stream). */
  _shown = 0;
  private shows = 0;

  private debugOn(): boolean {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    return Boolean((st?.attributes[this._config?.draft ? "draft_card" : "card"] as Card | undefined)?.layout.debug?.on);
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
    const fit = fitOf(this);
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
    // Said to the server (directly, or through Home Assistant: the same address with
    // /done for .mjpg), which ends it: no relying on the browser (WebKit keeps loading a
    // stream an <img> let go), Home Assistant or Nabu Casa letting the connection go. A
    // beacon goes even as a page is left. The address is its own record, not the
    // <img>'s, which something else may have changed.
    const was = this.streaming;
    this.streaming = "";
    if (was.includes(".mjpg?")) navigator.sendBeacon(`${was.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(why)}`);
    this.renderRoot?.querySelector<HTMLImageElement>(".picture")?.setAttribute("src", BLANK); // and let go here too
  }
  updated() {
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
    return { columns: "full", rows: "auto" };
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
    return `/api/casa_mia/${this._config?.draft ? "draft" : "live"}${path}?${size}&token=${this._token}`;
  }

  private ask(fresh = false) {
    if (!this.hass) return;
    pictureToken(this.hass, fresh).then(
      (t) => (this._token = t),
      () => (this.retry = window.setTimeout(() => this.ask(true), 10_000)),
    );
  }

  /** Refused (an old token) or cut off: a new token, and so a new stream, soon. */
  private refused() {
    if (!this.viaHa()) return;
    clearTimeout(this.retry);
    this.retry = window.setTimeout(() => this.ask(true), 5_000);
  }

  /** The card shown now, and its main camera. */
  private now(): { card?: Card; main: string } {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    const card = st?.attributes[this._config?.draft ? "draft_card" : "card"] as Card | undefined;
    return { card, main: card ? this.main(card, st!.state) : "" };
  }

  /** Whether the main camera plays live: allowed (the compositor's switch, this card's
   * option), and not failed for this main camera. */
  private liveMain(card: Card, main: string): boolean {
    return Boolean(card.live_main && this._config?.live_main !== false && this._liveFailed !== main && this.hass?.connection);
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
      console.info(`casa-mia: live main camera ${want}: ${why}; the drawn picture instead`);
      this.stopLive();
      this._liveFailed = main;
    };
    this.liveWait = window.setTimeout(() => failed("not playing in time"), LIVE_WAIT_MS);
    video.onplaying = () => {
      clearTimeout(this.liveWait);
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
    // As deployed, or (draft) as the Camera Dashboard page's draft was last saved.
    const card = st?.attributes[this._config?.draft ? "draft_card" : "card"] as Card | undefined;
    if (!card)
      return html`<ha-card
        ><div class="note">
          ${!this._config?.entity
            ? "Choose a commander"
            : st
              ? `${this._config.draft ? "No saved draft" : "Not deployed live yet"} for this commander`
              : `No commander at ${this._config.entity}`}
        </div></ha-card
      >`;
    if (!card.picture) return html`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
    const main = this.main(card, st!.state);
    if (this._liveFailed && this._liveFailed !== main) this._liveFailed = ""; // a new main: try again
    const live = this.liveMain(card, main);
    // Laid out for the picture asked for, as the compositor draws it (compositor.sized).
    const own = card.layout;
    const [W, H, scale] = this._size ?? [own.width, own.height, 1];
    const asked = this._size ? this.pictureUrl(card, this._size) : "";
    const src = asked && live ? `${asked}&main=video` : asked;
    const s = this._size ? { ...own, width: W, height: H, gap: pyRound(own.gap * scale), margin: pyRound((own.margin ?? 0) * scale), scale } : own;
    const [[w, h], mainRect, tiles] = layout(s, main);
    const at = ([x, y, rw, rh]: Rect) =>
      `left:${(x / w) * 100}%;top:${(y / h) * 100}%;width:${(rw / w) * 100}%;height:${(rh / h) * 100}%`;
    const lit = s.highlight ?? {};
    const mark = PANELS.flatMap((p) => s[p].cameras.map((e, i) => [e, tiles[p][i]] as const)).find(([e]) => e === main)?.[1];
    // The rule (ha.ts: heightFor). In a tile, CSS: the tile's height when it gives one, else
    // its own shape.
    const f = this._fit;
    const tall = f && this._width ? heightFor(f, this._width, own.width / own.height) : null;
    const size = !f || f.mode === "tile" ? `height:100%;aspect-ratio:${own.width}/${own.height}` : tall ? `height:${tall}px` : "";
    return html`<ha-card style=${size}>
      <div class="box">
        ${src && this._shown
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
        ${live && mainRect[2] > 0
          ? html`<video
                class="live"
                data-entity=${this.liveEntity(card, main, mainRect) ?? ""}
                data-cm-picture=${src}
                style="${at(mainRect)};object-fit:${({ fill: "fill", crop: "cover" } as Record<string, string>)[own.main_fit ?? "fit"] ?? "contain"};opacity:${this._playing ? 1 : 0}"
                autoplay
                playsinline
                .muted=${true}
              ></video>
              <div class="caption" style=${at(mainRect)}><span>${card.cameras[main]?.title ?? main}</span></div>`
          : nothing}
        <div class="zone" style=${at(mainRect)} @click=${() => this.open(card, main)}></div>
        ${mark && mark[2] > 0
          ? html`<img
              class="highlight"
              src="${BLANK}#cm-highlight"
              alt=""
              style="${at(mark)};border:${lit.width}px solid ${lit.colour};box-shadow:0 0 ${lit.blur}px ${lit.colour};--cm-colour:${lit.colour};--cm-blur:${lit.blur}px;--cm-pulse:${lit.pulse}s;--cm-style:${lit.style}"
            />`
          : nothing}
      </div>
    </ha-card>`;
  }

  private choose(card: Card, camera: string) {
    this.hass?.callService("select", "select_option", { option: card.cameras[camera]?.title }, { entity_id: this._config!.entity });
  }

  private open(card: Card, camera: string) {
    const how = this._config?.tap_main ?? "live";
    if (how === "live" && card.cameras[camera]) navigate(card.cameras[camera].live);
    else if (how === "more-info") fire(this, "hass-more-info", { entityId: camera });
  }

  static styles = css`
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
    .box {
      position: absolute;
      inset: 0;
    }
    .picture {
      display: block;
      width: 100%;
      height: 100%;
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
  `;
}

class CommanderEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    const schema = [
      { name: "entity", selector: { select: { mode: "dropdown", options: commanders(this.hass) } } },
      { name: "draft", selector: { boolean: {} } },
      {
        name: "route",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "auto", label: "Direct at home, through Home Assistant away" },
              { value: "direct", label: "Always direct (the box's LAN address)" },
              { value: "ha", label: "Always through Home Assistant" },
            ],
          },
        },
      },
      {
        name: "away_sharpness",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "full", label: "Full (the screen's own)" },
              { value: "balanced", label: "Balanced (1.5x)" },
              { value: "light", label: "Light (1x)" },
              { value: "saver", label: "Data saver (0.75x)" },
            ],
          },
        },
      },
      { name: "live_main", selector: { boolean: {} } },
      { name: "leave_after", selector: { number: { min: 0, max: 120, step: 1, mode: "slider", unit_of_measurement: "s" } } },
      {
        name: "tap_main",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "live", label: "Opens its live page" },
              { value: "more-info", label: "Opens its more-info" },
              { value: "none", label: "Nothing" },
            ],
          },
        },
      },
    ];
    const labels: Record<string, string> = {
      entity: "Commander",
      draft: "Show the draft",
      tap_main: "A tap on the main camera",
      route: "The picture",
      away_sharpness: "Sharpness through Home Assistant",
      live_main: "Main camera as live video",
      leave_after: "Picture kept running once out of sight",
    };
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ tap_main: "live", route: "auto", away_sharpness: "balanced", live_main: true, leave_after: LEAVE_AFTER, ...this._config }}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => labels[s.name]}
      .computeHelper=${(s: { name: string }) =>
        s.name === "entity"
          ? "The commanders built on the Camera Dashboard page (each one's Main camera select)."
          : s.name === "route"
            ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant."
            : s.name === "away_sharpness"
            ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own."
            : s.name === "live_main"
            ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture."
            : s.name === "leave_after"
            ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once."
            : s.name === "draft"
            ? "As saved on the Camera Dashboard page (Save draft), before it is deployed live: for trying changes out. Off: as deployed live."
            : undefined}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = ev.detail.value;
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;
  }
}

define("casa-mia-commander", CommanderCard);
define("casa-mia-commander-editor", CommanderEditor);
register("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Dashboard's commanders: tap a camera to make it the main one.");
