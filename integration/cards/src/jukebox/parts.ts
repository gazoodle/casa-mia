// The small things every part of Jukebox's page draws with: its icons, a picture for what
// is playing, a slider that can be dragged while the house reports, and a clock for what
// moves by itself. The icons are its own (Material's shapes), so the page looks the same
// wherever it is shown and leans on nothing of Home Assistant's frontend.
import { LitElement, type ReactiveController, type ReactiveControllerHost, css, html, nothing, unsafeCSS } from "lit";
import { fire } from "../ha.ts";
import { colours, initials } from "./common.ts";

const PATHS = {
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  stop: "M6 6h12v12H6z",
  next: "M6 6l8.5 6L6 18zM16 6h2v12h-2z",
  previous: "M18 6l-8.5 6L18 18zM6 6h2v12H6z",
  shuffle: "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  repeat: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  queue: "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  drag: "M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z",
  save: "M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  chevron: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  rooms: "M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 1.99 2 1.99L17 22c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2c-1.11 0-2-.9-2-2s.89-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  favourites: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z",
  muted: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
};

export const icon = (name: keyof typeof PATHS) => html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${PATHS[name]}></path></svg>`;

/** The picture of what is playing; where there is none, or it won't load, a picture made
 * from the title's own two colours. */
// A picture's address is Home Assistant's own, to be read from wherever the page reached
// it, or a whole address of somewhere else (a station's logo, as its speaker gives it).
export function art(hass: { hassUrl?: (path: string) => string; [key: string]: any } | undefined, picture: string | null | undefined, title: string) {
  const [a, b] = colours(title);
  const gone = (e: Event) => (e.target as HTMLElement).remove();
  return html`<span class="art" style="--a:${a};--b:${b}"><i>${initials(title)}</i>${picture ? html`<img src=${/^https?:/.test(picture) ? picture : (hass?.hassUrl?.(picture) ?? picture)} alt="" @error=${gone} />` : nothing}</span>`;
}

/** Redraws its element once a second while it is on the page, for what moves by itself
 * (a song's position). The speakers aren't asked anything: the time is worked out. */
export class Clock implements ReactiveController {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }
  hostConnected() {
    this.timer = setInterval(() => this.host.requestUpdate(), 1000);
  }
  hostDisconnected() {
    clearInterval(this.timer);
  }
}

// The angle of the arc that runs round a button while a speaker is being asked (`.busy`,
// below). An angle can be animated only once the browser is told it is one, and that has
// to be said to the document: a rule inside a shadow root is ignored.
try {
  (CSS as any).registerProperty({ name: "--jb-turn", syntax: "<angle>", inherits: false, initialValue: "0deg" });
} catch {
  // Said already by another copy of this file, or a browser that doesn't know how: the arc
  // then stays where it is and only pulses.
}

/** Which buttons are waiting for a speaker's answer. A speaker takes a moment to do what it
 * is asked, and the button pressed shows an arc running round it until Jukebox has the
 * answer, so a press is seen to have been taken. It ends by itself with the request,
 * done or refused. */
export class Busy {
  private waiting = new Map<string, number>();
  /** Goes up at every change, for an element that is handed `on` and must be told when to
   * draw again. */
  changes = 0;
  constructor(private host: ReactiveControllerHost) {}

  /** Show `key` as waiting until `work` is settled. Gives `work` back. */
  during<T>(key: string, work: Promise<T>): Promise<T> {
    const count = (by: number) => {
      this.waiting.set(key, (this.waiting.get(key) ?? 0) + by);
      this.changes++;
      this.host.requestUpdate();
    };
    count(1);
    const done = () => count(-1);
    work.then(done, done);
    return work;
  }

  /** The class for the button that stands for `key`. */
  on(key: string): string {
    return this.waiting.get(key) ? "busy" : "";
  }
}

export const SLIDER = "casa-mia-jukebox-slider";

/** The dot's width (px), and how far either side of its middle a finger may land and still
 * take it. Above and below, the whole height of the slider takes it. */
const DOT = 16;
const REACH = 22;

/** A slider for a volume or a place in a song. While it is dragged, and for a moment
 * after, it shows the finger's value and not the house's, which would pull it back. It
 * says `jb-slide` as it moves and `jb-set` when it is let go, each with {value}.
 *
 * The dot is taken by a finger that lands near it (owner, 2026-11-23: on a phone only the
 * dot itself could be taken, which was hit and miss) and then follows the finger. A touch
 * anywhere else on the line does nothing: a stray tap must not send a volume to full. The
 * browser's own slider is underneath, for the keyboard and for screen readers. */
export class Slider extends LitElement {
  static properties = { value: { type: Number }, max: { type: Number }, label: {}, _held: { state: true } };
  value = 0;
  max = 100;
  label = "";
  _held?: number;
  private _settle?: ReturnType<typeof setTimeout>;
  /** A drag: where the finger began, the value then, how far the dot can travel (px), and
   * whether it has moved at all. */
  private _drag?: { x: number; from: number; travel: number; moved: boolean };

  constructor() {
    super();
    this.addEventListener("pointerdown", this._down);
    this.addEventListener("pointermove", this._dragged);
    this.addEventListener("pointerup", this._let);
    this.addEventListener("pointercancel", this._let);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._settle);
  }

  private _send(value: number, set: boolean) {
    this._held = value;
    clearTimeout(this._settle);
    fire(this, set ? "jb-set" : "jb-slide", { value });
    // Let go: the house's own value is shown again once it has had time to catch up.
    if (set) this._settle = setTimeout(() => (this._held = undefined), 1500);
  }

  private _down = (e: PointerEvent) => {
    if (e.button) return;
    const box = this.getBoundingClientRect();
    const value = this._held ?? this.value;
    const travel = box.width - DOT;
    const dot = box.left + DOT / 2 + (this.max ? value / this.max : 0) * travel;
    if (Math.abs(e.clientX - dot) > REACH) return;
    this.setPointerCapture(e.pointerId);
    this._drag = { x: e.clientX, from: value, travel, moved: false };
  };

  private _dragged = (e: PointerEvent) => {
    const drag = this._drag;
    if (!drag || drag.travel <= 0) return;
    const value = Math.round(Math.max(0, Math.min(this.max, drag.from + ((e.clientX - drag.x) / drag.travel) * this.max)));
    if (value === (this._held ?? this.value)) return;
    drag.moved = true;
    this._send(value, false);
  };

  private _let = () => {
    const drag = this._drag;
    this._drag = undefined;
    // A touch that didn't move the dot sets nothing.
    if (drag?.moved) this._send(this._held ?? this.value, true);
  };

  /** From the keyboard, through the browser's own slider. */
  private _keyed(e: Event, set: boolean) {
    this._send(Number((e.target as HTMLInputElement).value), set);
  }

  render() {
    const value = this._held ?? this.value;
    return html`<input
      type="range"
      min="0"
      max=${this.max}
      .value=${String(value)}
      style="--fill:${this.max ? (100 * value) / this.max : 0}%"
      aria-label=${this.label}
      @input=${(e: Event) => this._keyed(e, false)}
      @change=${(e: Event) => this._keyed(e, true)}
    />`;
  }

  static styles = css`
    /* Half as tall again as the line and its dot need, so a finger a little above or below
       still takes the dot. The margins give the height back, so what is around the slider
       stays where it was. A finger moving up or down still scrolls the page. */
    :host { display: block; flex: 1; min-width: 0; height: 33px; margin: -5.5px 0; padding: 5.5px 0; box-sizing: border-box; cursor: pointer; touch-action: pan-y; }
    input { display: block; width: 100%; height: 22px; margin: 0; background: none; appearance: none; -webkit-appearance: none; pointer-events: none; }
    input::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--jb-fill, currentColor) var(--fill), var(--jb-track, rgb(128 128 128 / 35%)) var(--fill)); }
    input::-moz-range-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--jb-fill, currentColor) var(--fill), var(--jb-track, rgb(128 128 128 / 35%)) var(--fill)); }
    input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border: 0; border-radius: 50%; background: var(--jb-fill, currentColor); box-shadow: 0 1px 4px rgb(0 0 0 / 40%); }
    input::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: var(--jb-fill, currentColor); box-shadow: 0 1px 4px rgb(0 0 0 / 40%); }
  `;
}

export const MARQUEE = "casa-mia-jukebox-marquee";

/** One line of words that slides along when it is too long for its space, to its end and
 * back, so nothing is cut off and nothing has to grow to fit it (owner, 2026-11-24: a
 * small player's title, artist and rooms). A line that fits stays still. It is measured
 * when its words change and when its space does, never on a timer; where a device asks
 * for less movement, a long line is cut with "…" instead. */
export class Marquee extends LitElement {
  static properties = { text: {}, _over: { state: true } };
  text = "";
  /** How far the words run past their space, in px: none when they fit. */
  _over = 0;
  private _space = new ResizeObserver(() => this._measure());

  connectedCallback() {
    super.connectedCallback();
    this._space.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._space.disconnect();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has("text")) this._measure();
  }

  private _measure() {
    const words = this.renderRoot.querySelector("span");
    if (words) this._over = Math.max(0, Math.ceil(words.scrollWidth - this.clientWidth));
  }

  render() {
    const over = this._over;
    // The same pace whatever the length: about 40px a second, with a rest at each end.
    return html`<span class=${over ? "run" : ""} style=${over ? `--over:-${over}px;--time:${(4 + over / 40).toFixed(1)}s` : ""}>${this.text}</span>`;
  }

  static styles = css`
    :host { display: block; min-width: 0; overflow: hidden; white-space: nowrap; }
    span { display: inline-block; vertical-align: top; }
    .run { animation: slide var(--time) ease-in-out infinite alternate; }
    @keyframes slide { 0%, 18% { transform: none; } 82%, 100% { transform: translateX(var(--over)); } }
    @media (prefers-reduced-motion: reduce) {
      span { display: block; overflow: hidden; text-overflow: ellipsis; }
      .run { animation: none; }
    }
  `;
}

/** The narrowest a small player is drawn, in px: the page and the Players card fit as many
 * across as there is room for. */
export const COLUMN = unsafeCSS(320);

/** What every part shares: plain buttons, the round icon button and the artwork. */
export const shared = css`
  * { box-sizing: border-box; }
  button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-align: inherit; }
  button:disabled { opacity: 0.4; cursor: default; }
  svg { display: block; width: 24px; height: 24px; fill: currentColor; }
  .ib { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 50%; }
  .hush casa-mia-jukebox-slider { opacity: 0.4; }
  .ib:hover:not(:disabled) { background: color-mix(in srgb, currentColor 12%, transparent); }
  .busy { position: relative; }
  /* Just outside the button, so it shows round one that is itself white, and with a glow. */
  .busy::after { content: ""; position: absolute; inset: -5px; padding: 3px; border-radius: 999px; pointer-events: none; filter: drop-shadow(0 0 5px var(--jb-glow, currentColor));
    background: conic-gradient(from var(--jb-turn, 0deg), transparent 0 30%, var(--jb-glow, currentColor) 95%, transparent);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
    animation: jb-turn 0.9s linear infinite, jb-pulse 0.9s ease-in-out infinite alternate; }
  @keyframes jb-turn { to { --jb-turn: 360deg; } }
  @keyframes jb-pulse { from { opacity: 0.6; } }
  /* What isn't round keeps its own corners, and the arc runs along its edge. */
  .busy.row::after, .tools .busy::after, .tiles .busy::after { inset: -2px; border-radius: 16px; }
  .art { position: relative; display: grid; place-items: center; aspect-ratio: 1; width: 100%; overflow: hidden; border-radius: 12px; color: rgb(255 255 255 / 92%); font-weight: 800; container-type: inline-size;
    background: radial-gradient(circle at 28% 22%, rgb(255 255 255 / 38%), transparent 42%), conic-gradient(from 200deg at 68% 72%, var(--a), var(--b), var(--a)); }
  .art i { font-style: normal; font-size: 30cqw; letter-spacing: -0.02em; text-shadow: 0 2px 12px rgb(0 0 0 / 30%); }
  .art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
`;
