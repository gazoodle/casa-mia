// The pieces of Jukebox's page as cards, to put together on a dashboard of your own with
// whatever else belongs there (owner, 2026-11-24): the quiet rooms, a shortcut that plays one
// favourite in chosen rooms, and the big player in place. The players are card.ts. Each
// follows the house or asks Jukebox by itself, so they work in any combination.
import { LitElement, css, html, nothing } from "lit";
import { fire, inPicker, type Hass } from "../ha.ts";
import { reason } from "./common.ts";
import { Following } from "./page.ts";
import { Busy, shared } from "./parts.ts";

const SONOS = { entity: { filter: { integration: "sonos", domain: "media_player" } } };
const NOTE = css`
  .note { margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
`;

export const QUIET = "casa-mia-jukebox-quiet";

/** The rooms that are playing nothing, each a tap from its favourites, and any speaker
 * that isn't answering. */
type Quiet = { heading?: boolean; silent?: boolean };
const QUIET_LABELS: Record<string, string> = {
  heading: "Show the heading over the rooms",
  silent: "List the speakers that aren't answering",
};

export class QuietCard extends Following {
  static properties = { ...Following.properties, _config: { state: true } };
  _config: Quiet = {};

  /** Both on, so a new card's switches show what it does. */
  static getStubConfig() {
    return { heading: true, silent: true };
  }

  /** Home Assistant draws the options from this. Without it there is no visual editor at
   * all, only YAML (owner, 2026-11-24), so every Jukebox card has one. */
  static getConfigForm() {
    return {
      schema: [
        { name: "heading", selector: { boolean: {} } },
        { name: "silent", selector: { boolean: {} } },
      ],
      computeLabel: (field: { name: string }) => QUIET_LABELS[field.name],
    };
  }

  setConfig(config: Quiet) {
    this._config = { ...config };
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  render() {
    const [hass, house] = [this._hass, this._house];
    if (!hass) return nothing;
    if (!house) return html`<p class="note">${inPicker(this) ? "The rooms that are playing nothing, a tap from their favourites" : this._trouble}</p>`;
    // Left out of the card's YAML, each option is on.
    const [heading, silent] = [this._config.heading !== false, this._config.silent !== false];
    const none = !house.groups.some((g) => g.quiet) && (!silent || Object.values(house.rooms).every((r) => r.available));
    return html`${this._trouble ? html`<p class="note">${this._trouble}</p>` : nothing}
      ${none ? html`<p class="note">Every room is playing something.</p>` : html`<casa-mia-jukebox-rooms .hass=${hass} .house=${house} .heading=${heading} .silent=${silent}></casa-mia-jukebox-rooms>`}`;
  }

  static styles = [shared, NOTE, css`:host { display: grid; gap: 12px; }`];
}

export const SHORTCUT = "casa-mia-jukebox-shortcut";
type Shortcut = { favourite?: string; rooms?: string[]; name?: string; icon?: string; enqueue?: "next" | "add" };
const LABELS: Record<string, string> = {
  favourite: "Favourite or Sonos playlist, by its name",
  rooms: "Rooms (the first leads, the others join it)",
  name: "What the button says (leave empty for the favourite's name)",
  icon: "Icon",
  enqueue: "Where in the queue (leave empty to play now)",
};

/** One button that plays one favourite in chosen rooms, through Jukebox's `play` action:
 * it is logged, and a party doesn't take it for a guest's change. */
export class ShortcutCard extends LitElement {
  static properties = { _config: { state: true } };
  _config?: Shortcut;
  private _hass?: Hass;
  private _busy = new Busy(this);

  /** Not drawn from at every change in the house: only its first arrival is needed, for
   * the rooms' names. */
  set hass(hass: Hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this.requestUpdate();
  }

  static getStubConfig() {
    return { favourite: "", rooms: [] };
  }

  /** Home Assistant draws the options from this. */
  static getConfigForm() {
    return {
      schema: [
        { name: "favourite", required: true, selector: { text: {} } },
        { name: "rooms", required: true, selector: { entity: { ...SONOS.entity, multiple: true } } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "enqueue", selector: { select: { options: [{ value: "next", label: "Play next" }, { value: "add", label: "Add to the end of the queue" }] } } },
      ],
      computeLabel: (field: { name: string }) => LABELS[field.name],
    };
  }

  setConfig(config: Shortcut) {
    this._config = { ...config };
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 6, rows: 1, min_columns: 3 };
  }

  private _play(config: Shortcut) {
    const what = { favourite: config.favourite, rooms: config.rooms, ...(config.enqueue ? { enqueue: config.enqueue } : {}) };
    // A failure is said, in Home Assistant's own toast: never swallowed.
    this._busy.during("play", this._hass!.callService("casa_mia_jukebox", "play", what)).catch((err: unknown) => fire(this, "hass-notification", { message: `Jukebox: ${reason(err)}` }));
  }

  render() {
    const [hass, config] = [this._hass, this._config];
    if (!hass || !config) return nothing;
    const rooms = config.rooms ?? [];
    if (!config.favourite || !rooms.length) return html`<p class="note">${inPicker(this) ? "A button that plays one favourite in the rooms you choose" : "Choose a favourite and a room for this shortcut."}</p>`;
    const where = rooms.map((room) => hass.states[room]?.attributes.friendly_name ?? room).join(" + ");
    return html`<button class="short ${this._busy.on("play")}" @click=${() => this._play(config)}>
      <ha-icon .icon=${config.icon || "mdi:play-circle"}></ha-icon>
      <span><b>${config.name || config.favourite}</b><small>${where}</small></span>
    </button>`;
  }

  static styles = [
    shared,
    NOTE,
    css`
      :host { display: block; height: 100%; --jb-glow: var(--primary-color, #c4552d); font: 14px/1.3 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .short { display: flex; align-items: center; gap: 12px; width: 100%; height: 100%; min-height: 56px; padding: 8px 16px 8px 12px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
      .short.busy::after { border-radius: 20px; }
      ha-icon { flex: none; --mdc-icon-size: 28px; color: var(--primary-color); }
      span { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      b, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { color: var(--secondary-text-color); }
    `,
  ];
}

export const NOW = "casa-mia-jukebox-now";
type Now = { entity?: string };

/** The big player for one room, in place: its artwork, controls, queue, rooms, favourites
 * and search, the size the dashboard gives it. */
export class NowCard extends LitElement {
  static properties = { _config: { state: true } };
  _config?: Now;
  private _hass?: Hass;

  /** The player follows the house by itself; `hass` is only its way to ask. */
  set hass(hass: Hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this.requestUpdate();
  }

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return { schema: [{ name: "entity", required: true, selector: SONOS }], computeLabel: () => "Room" };
  }

  setConfig(config: Now) {
    this._config = { ...config };
  }

  getCardSize() {
    return 9;
  }

  getGridOptions() {
    return { columns: 12, rows: 9, min_columns: 6, min_rows: 8 };
  }

  render() {
    const [hass, room] = [this._hass, this._config?.entity];
    if (!hass || !this._config) return nothing;
    // In the picker a live player would be a great deal to draw for a thumbnail.
    if (!room || inPicker(this)) return html`<p class="note">${room ? "" : "Choose a room. "}The whole player for one room: artwork, controls, queue, rooms, favourites and search.</p>`;
    return html`<casa-mia-jukebox-big inline .hass=${hass} .room=${room}></casa-mia-jukebox-big>`;
  }

  static styles = [shared, NOTE, css`:host { display: block; height: 100%; }`];
}
