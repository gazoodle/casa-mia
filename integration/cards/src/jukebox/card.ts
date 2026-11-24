// Jukebox's small card, for a dashboard that already exists: the mini player by itself.
// With a room chosen it is always that room's music; with none it is everything playing
// in the house, one player each. A tap opens the big player.
import { css, html, nothing } from "lit";
import { inPicker } from "../ha.ts";
import { groupOf } from "./common.ts";
import { Following } from "./page.ts";
import { COLUMN, shared } from "./parts.ts";

export const CARD = "casa-mia-jukebox";
type Config = { type?: string; /** The room whose music is shown. */ entity?: string };

export class JukeboxCard extends Following {
  static properties = { ...Following.properties, _config: { state: true } };
  _config?: Config;

  static getStubConfig() {
    return {};
  }

  /** Home Assistant draws the options from this: one field, a Sonos room. Every Jukebox
   * card has such a form: without one a card can only be edited as YAML. */
  static getConfigForm() {
    return {
      schema: [{ name: "entity", selector: { entity: { filter: { integration: "sonos", domain: "media_player" } } } }],
      computeLabel: () => "Room (leave empty for everything that is playing)",
    };
  }

  setConfig(config: Config) {
    this._config = { ...config };
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  render() {
    const hass = this._hass;
    const house = this._house;
    if (!hass || !this._config) return nothing;
    if (!house) return html`<p class="note">${inPicker(this) ? "What is playing, with pause, skip and volume" : this._trouble}</p>`;

    const room = this._config.entity;
    const one = room ? groupOf(house, room) : undefined;
    const groups = room ? (one ? [one] : []) : house.groups.filter((g) => !g.quiet);
    return html`${this._trouble ? html`<p class="note">${this._trouble}</p>` : nothing}
      ${groups.map((g) => html`<casa-mia-jukebox-mini .hass=${hass} .house=${house} .group=${g}></casa-mia-jukebox-mini>`)}
      ${groups.length ? nothing : html`<p class="note">${room ? `${house.rooms[room]?.name ?? room} isn't answering` : "Nothing is playing"}</p>`}`;
  }

  static styles = [
    shared,
    css`
      /* As many players across as fit the width the dashboard gives the card, each at least
         COLUMN wide: one on a phone, two or three on a tablet (owner, 2026-11-24: a card
         the width of an iPad showed one long player to a row). A player alone keeps a
         column's width; it isn't stretched across the card. */
      :host { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, ${COLUMN}px), 1fr)); gap: 12px; }
      .note { grid-column: 1 / -1; margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `,
  ];
}
