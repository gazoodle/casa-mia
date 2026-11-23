// Jukebox's page (/jukebox, in Home Assistant's sidebar): a mini player for each thing
// playing in the house, and the rooms that are quiet. It finds the rooms by itself and
// is drawn by Jukebox from top to bottom, so there is nothing to lay out. Its heading has
// the way back, as a wall tablet has no sidebar and no top bar to leave by.
import { LitElement, css, html, nothing } from "lit";
import { fire, navigate, type Hass } from "../ha.ts";
import { open } from "./big.ts";
import { type House, follow } from "./common.ts";
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
  render() {
    const hass = this._hass;
    if (!hass) return nothing;
    const house = this._house;
    const playing = house?.groups.filter((g) => !g.quiet) ?? [];
    const quiet = house?.groups.filter((g) => g.quiet) ?? [];
    const silent = Object.values(house?.rooms ?? {}).filter((r) => !r.available);
    return html`<div class="page">
      <div class="nav">
        ${this.narrow ? html`<button class="ib" @click=${() => fire(this, "hass-toggle-menu")} aria-label="Home Assistant's menu">${icon("menu")}</button>` : nothing}
        <button class="ib" @click=${() => history.back()} aria-label="Back">${icon("back")}</button>
        <h1>Music</h1>
        <button class="ib" @click=${() => navigate("/")} aria-label="Home">${icon("home")}</button>
      </div>
      ${this._trouble ? html`<p class="trouble" role="status">${this._trouble}</p>` : nothing}
      <div class="minis">${playing.map((g) => html`<casa-mia-jukebox-mini .hass=${hass} .house=${house} .group=${g}></casa-mia-jukebox-mini>`)}</div>
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
      h2 { margin: 22px 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--secondary-text-color); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chips button { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px; border-radius: 999px; border: 1px solid var(--divider-color); background: var(--card-background-color); font-weight: 600; }
      .chips svg { width: 18px; height: 18px; color: var(--secondary-text-color); }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
      .trouble { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); overflow-wrap: anywhere; }
    `,
  ];
}
