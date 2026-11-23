// Jukebox's page (/jukebox, in Home Assistant's sidebar): a mini player for each thing
// playing in the house, and the rooms that are quiet. It finds the rooms by itself and
// is drawn by Jukebox from top to bottom, so there is nothing to lay out. Its heading has
// the way back, as a wall tablet has no sidebar and no top bar to leave by.
import { LitElement, css, html, nothing } from "lit";
import { fire, navigate, type Hass } from "../ha.ts";
import { open } from "./big.ts";
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

export class Page extends Following {
  static properties = { ...Following.properties, _arranging: { state: true }, _drag: { state: true }, _failed: { state: true } };
  /** The players can be dragged into another order. */
  _arranging = false;
  /** The player being dragged: which, over which, how far, and where each one was drawn
   * when the drag began. */
  _drag?: { from: number; to: number; x: number; y: number; dx: number; dy: number; slots: DOMRect[] };
  _failed?: string;

  private _down(e: PointerEvent, from: number) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const slots = [...this.renderRoot.querySelectorAll(".slot")].map((slot) => slot.getBoundingClientRect());
    this._drag = { from, to: from, x: e.clientX, y: e.clientY, dx: 0, dy: 0, slots };
  }

  private _moved = (e: PointerEvent) => {
    const drag = this._drag;
    if (!drag) return;
    const over = drag.slots.findIndex((r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    this._drag = { ...drag, dx: e.clientX - drag.x, dy: e.clientY - drag.y, to: over < 0 ? drag.to : over };
  };

  private _up = () => {
    const [drag, house] = [this._drag, this._house];
    this._drag = undefined;
    if (!drag || !house || drag.to === drag.from) return;
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

  render() {
    const hass = this._hass;
    if (!hass) return nothing;
    const house = this._house;
    const playing = house?.groups.filter((g) => !g.quiet) ?? [];
    const quiet = house?.groups.filter((g) => g.quiet) ?? [];
    const silent = Object.values(house?.rooms ?? {}).filter((r) => !r.available);
    const trouble = this._trouble ?? this._failed;
    const arranging = this._arranging && playing.length > 1;
    const drag = this._drag;
    return html`<div class="page">
      <div class="nav">
        ${this.narrow ? html`<button class="ib" @click=${() => fire(this, "hass-toggle-menu")} aria-label="Home Assistant's menu">${icon("menu")}</button>` : nothing}
        <button class="ib" @click=${() => history.back()} aria-label="Back">${icon("back")}</button>
        <h1>Music</h1>
        ${playing.length > 1
          ? html`<button class="ib ${arranging ? "on" : ""}" @click=${() => (this._arranging = !arranging)} aria-label=${arranging ? "Finish arranging the players" : "Arrange the players"}>${icon(arranging ? "check" : "sort")}</button>`
          : nothing}
        <button class="ib" @click=${() => navigate("/")} aria-label="Home">${icon("home")}</button>
      </div>
      ${trouble ? html`<p class="trouble" role="status">${trouble}</p>` : nothing}
      ${arranging ? html`<p class="hint">Drag a player to where you want it. The order is kept for every screen in the house.</p>` : nothing}
      <div class="minis">
        ${playing.map(
          (g, i) => html`<div class="slot ${drag?.from === i ? "held" : ""} ${drag && drag.to === i && drag.from !== i ? "here" : ""}" style=${drag?.from === i ? `transform:translate(${drag.dx}px,${drag.dy}px)` : ""}>
            <casa-mia-jukebox-mini .hass=${hass} .house=${house} .group=${g}></casa-mia-jukebox-mini>
            ${arranging ? html`<div class="grip" @pointerdown=${(e: PointerEvent) => this._down(e, i)} @pointermove=${this._moved} @pointerup=${this._up} @pointercancel=${this._up}>${icon("drag")}</div>` : nothing}
          </div>`,
        )}
      </div>
      ${house && !playing.length ? html`<p class="none">Nothing is playing anywhere.</p>` : nothing}
      ${quiet.length
        ? html`<h2>Quiet rooms: tap one to play something there</h2>
            <div class="chips">${quiet.map((g) => html`<button @click=${() => open(hass, g.id, "favourites")}>${icon("rooms")}${house!.rooms[g.id].name}</button>`)}</div>`
        : nothing}
      ${silent.length ? html`<h2>Not answering</h2><p class="none">${silent.map((r) => r.name).join(", ")}</p>` : nothing}
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
      .nav .ib.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
      .hint { margin: 0 0 12px; color: var(--secondary-text-color); }
      .slot { position: relative; min-width: 0; border-radius: 18px; }
      .slot.held { z-index: 2; box-shadow: 0 12px 30px rgb(0 0 0 / 40%); }
      .slot.here { outline: 2px dashed var(--primary-color); outline-offset: 3px; }
      /* Over the whole player while arranging, so its own buttons can't be pressed, and it
         takes the finger for itself so a drag moves the player and not the page. */
      .grip { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 18px; background: color-mix(in srgb, var(--card-background-color, #fff) 60%, transparent); cursor: grab; touch-action: none; }
      .grip svg { width: 34px; height: 34px; }
      h2 { margin: 22px 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--secondary-text-color); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chips button { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px; border-radius: 999px; border: 1px solid var(--divider-color); background: var(--card-background-color); font-weight: 600; }
      .chips svg { width: 18px; height: 18px; color: var(--secondary-text-color); }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
      .trouble { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); overflow-wrap: anywhere; }
    `,
  ];
}
