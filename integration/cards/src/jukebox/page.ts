// Jukebox's page (/jukebox, in Home Assistant's sidebar): a mini player for each thing
// playing in the house, and the rooms that are quiet. It finds the rooms by itself and
// is drawn by Jukebox from top to bottom, so there is nothing to lay out. Its heading has
// the way back, as a wall tablet has no sidebar and no top bar to leave by.
import { LitElement, css, html, nothing } from "lit";
import { fire, navigate, type Hass } from "../ha.ts";
import { type House, arrange, follow, reason } from "./common.ts";
import { icon, shared } from "./parts.ts";

export const PAGE = "casa-mia-jukebox-page";

/** Follows the house's music for as long as the element is on the page. For the page and
 * the card, which both draw from it. */
export class Following extends LitElement {
  static properties = { narrow: { type: Boolean }, _house: { state: true }, _why: { state: true }, _connected: { state: true } };
  narrow = false;
  _house?: House;
  _why?: string;
  _connected = true;
  protected _hass?: Hass;
  private _off?: () => void;

  set hass(hass: Hass) {
    // Not drawn from: `hass` is set at every state change in the house, and the feed
    // says what changed here.
    const first = !this._hass;
    this._hass = hass;
    this._connected = hass.connected !== false;
    if (first) this._follow();
  }

  connectedCallback() {
    super.connectedCallback();
    this._follow();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off?.();
    this._off = undefined;
  }

  private _follow() {
    if (this._off || !this.isConnected || !this._hass?.connection) return;
    this._off = follow(this._hass.connection, (house, why) => ([this._house, this._why] = [house, why]));
  }

  /** Why nothing can be shown, in words; none when the house is known. */
  protected get _trouble(): string | undefined {
    if (!this._connected) return "No connection to Home Assistant. What is shown may be out of date.";
    return this._house ? undefined : (this._why ?? "Asking Home Assistant what is playing…");
  }
}

/** How long a finger rests on a player before it lifts to be dragged (ms), how far it may
 * wander meanwhile (px: more is a scroll, or a slip), and how near the top or bottom of
 * the screen a drag scrolls the page (px). */
const HOLD = 450;
const SLIP = 10;
const EDGE = 70;

/** What scrolls the page: the nearest thing around it that can, or the window. */
function scroller(from: Node): Element {
  for (let node: any = from; node; node = node.parentNode ?? node.host)
    if (node instanceof Element && node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  return document.scrollingElement ?? document.documentElement;
}

export class Page extends Following {
  static properties = { ...Following.properties, _drag: { state: true }, _failed: { state: true } };
  /** The player being dragged: which, over which, where the finger began, how far the
   * player has moved, how far the page was scrolled when it was lifted, and how far it can
   * be scrolled (measured then: the player being carried stretches the page as it goes). */
  _drag?: { from: number; to: number; x: number; y: number; dx: number; dy: number; top: number; end: number };
  _failed?: string;
  /** A finger resting on a player, which lifts it if it stays. */
  private _hold?: { x: number; y: number; timer: ReturnType<typeof setTimeout> };
  private _at = { x: 0, y: 0 };
  private _scroller?: Element;
  private _frame = 0;
  /** A drag has just ended: the tap that ends it is not a tap on the player. */
  private _dragged = false;

  connectedCallback() {
    super.connectedCallback();
    // A finger that moves scrolls the page, unless it is carrying a player. Only a
    // listener that isn't passive may say so.
    this.addEventListener("touchmove", this._touch, { passive: false });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("touchmove", this._touch);
    this._drop();
  }

  private _touch = (e: Event) => {
    if (this._drag) e.preventDefault();
  };

  private _down(e: PointerEvent, from: number) {
    // Not from a slider, which is held and dragged for its own purpose.
    if (e.button || e.composedPath().some((node) => (node as Element).localName === "casa-mia-jukebox-slider")) return;
    const [slot, pointer] = [e.currentTarget as HTMLElement, e.pointerId];
    this._drop();
    this._dragged = false;
    const lift = () => {
      const { x, y } = this._hold!;
      this._hold = undefined;
      slot.setPointerCapture(pointer);
      this._scroller = scroller(this);
      this._at = { x, y };
      const page = this._scroller;
      this._drag = { from, to: from, x, y, dx: 0, dy: 0, top: page.scrollTop, end: page.scrollHeight - page.clientHeight };
      navigator.vibrate?.(15);
      this._frame = requestAnimationFrame(this._edge);
    };
    this._hold = { x: e.clientX, y: e.clientY, timer: setTimeout(lift, HOLD) };
  }

  private _moved = (e: PointerEvent) => {
    const hold = this._hold;
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLIP) this._drop();
    if (!this._drag) return;
    this._at = { x: e.clientX, y: e.clientY };
    this._place();
  };

  /** Where the dragged player is and which place it is over, from where the finger is and
   * how far the page has scrolled since it was lifted. */
  private _place() {
    const drag = this._drag;
    if (!drag) return;
    const { x, y } = this._at;
    const [dx, dy] = [x - drag.x, y - drag.y + this._scroller!.scrollTop - drag.top];
    const over = [...this.renderRoot.querySelectorAll(".slot")].findIndex((slot, i) => {
      const r = slot.getBoundingClientRect();
      // Its own place is where it was drawn before it was moved.
      const [left, top] = i === drag.from ? [r.left - drag.dx, r.top - drag.dy] : [r.left, r.top];
      return x >= left && x <= left + r.width && y >= top && y <= top + r.height;
    });
    this._drag = { ...drag, dx, dy, to: over < 0 ? drag.to : over };
  }

  /** Each frame of a drag: near the top or bottom of the screen the page scrolls, faster
   * the nearer, so a player can be carried to a place that was out of sight. */
  private _edge = () => {
    if (!this._drag) return;
    const [y, page] = [this._at.y, this._scroller!];
    const by = y < EDGE ? -Math.ceil((EDGE - y) / 5) : y > innerHeight - EDGE ? Math.ceil((y - innerHeight + EDGE) / 5) : 0;
    const was = page.scrollTop;
    if (by) page.scrollTop = Math.min(this._drag.end, was + by);
    if (page.scrollTop !== was) this._place();
    this._frame = requestAnimationFrame(this._edge);
  };

  /** Let go of everything, moving nothing: the finger went elsewhere, or the browser took
   * the touch for itself. */
  private _drop = () => {
    clearTimeout(this._hold?.timer);
    cancelAnimationFrame(this._frame);
    this._hold = this._drag = undefined;
  };

  private _up = () => {
    const [drag, house] = [this._drag, this._house];
    this._drop();
    if (!drag) return;
    this._dragged = true;
    if (!house || drag.to === drag.from) return;
    const playing = house.groups.filter((g) => !g.quiet);
    playing.splice(drag.to, 0, ...playing.splice(drag.from, 1));
    // The players' rooms in their new order, then every other room as it was. The house
    // comes back in that order by the feed, to this page and every other.
    const rooms = [...new Set([...playing.flatMap((g) => g.rooms), ...house.groups.flatMap((g) => g.rooms), ...Object.keys(house.rooms)])];
    arrange(this._hass!, rooms).then(
      () => (this._failed = undefined),
      (err) => (this._failed = `The order couldn't be kept: ${reason(err)}`),
    );
  };

  /** The tap that ends a drag would otherwise open the player it was let go over. */
  private _tap = {
    capture: true,
    handleEvent: (e: Event) => {
      if (!this._dragged) return;
      this._dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };

  render() {
    const hass = this._hass;
    if (!hass) return nothing;
    const house = this._house;
    const playing = house?.groups.filter((g) => !g.quiet) ?? [];
    const trouble = this._trouble ?? this._failed;
    const drag = this._drag;
    return html`<div class="page">
      <div class="nav">
        ${this.narrow ? html`<button class="ib" @click=${() => fire(this, "hass-toggle-menu")} aria-label="Home Assistant's menu">${icon("menu")}</button>` : nothing}
        <button class="ib" @click=${() => history.back()} aria-label="Back">${icon("back")}</button>
        <h1>Music</h1>
        <button class="ib" @click=${() => navigate("/")} aria-label="Home">${icon("home")}</button>
      </div>
      ${trouble ? html`<p class="trouble" role="status">${trouble}</p>` : nothing}
      <div class="minis">
        ${playing.map(
          (g, i) => html`<div
            class="slot ${drag?.from === i ? "held" : ""} ${drag && drag.to === i && drag.from !== i ? "here" : ""}"
            style=${drag?.from === i ? `transform:translate(${drag.dx}px,${drag.dy}px) scale(1.03)` : ""}
            @pointerdown=${(e: PointerEvent) => this._down(e, i)}
            @pointermove=${this._moved}
            @pointerup=${this._up}
            @pointercancel=${this._drop}
            @click=${this._tap}
            @contextmenu=${(e: Event) => e.preventDefault()}
            @dragstart=${(e: Event) => e.preventDefault()}
          >
            <casa-mia-jukebox-mini .hass=${hass} .house=${house} .group=${g}></casa-mia-jukebox-mini>
          </div>`,
        )}
      </div>
      ${playing.length > 1 ? html`<p class="hint">To move a player, rest a finger on it until it lifts, then drag it.</p>` : nothing}
      ${house && !playing.length ? html`<p class="none">Nothing is playing anywhere.</p>` : nothing}
      <casa-mia-jukebox-rooms class="rooms" .hass=${hass} .house=${house}></casa-mia-jukebox-rooms>
    </div>`;
  }

  static styles = [
    shared,
    css`
      :host { display: block; min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .page { max-width: 1240px; margin: 0 auto; padding: max(18px, env(safe-area-inset-top)) 16px 32px; }
      .nav { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .nav h1 { flex: 1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
      .nav .ib { background: var(--card-background-color); border: 1px solid var(--divider-color); }
      .minis { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 12px; }
      .hint { margin: 10px 2px 0; font-size: 12px; color: var(--secondary-text-color); }
      /* A long press is for lifting a player: not for selecting its words, or the menu a
         phone offers for a picture. */
      .slot { position: relative; min-width: 0; border-radius: 18px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .slot.held { z-index: 2; box-shadow: 0 16px 40px rgb(0 0 0 / 45%); cursor: grabbing; }
      .slot.here { outline: 2px dashed var(--primary-color); outline-offset: 3px; }
      .rooms { margin-top: 22px; }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
      .trouble { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); overflow-wrap: anywhere; }
    `,
  ];
}
