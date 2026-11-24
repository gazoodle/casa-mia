// The rooms that aren't playing: a chip for each quiet room, which opens the favourites to
// play something there, and the names of any speakers that aren't answering. Drawn by
// Jukebox's page and by the Quiet rooms card.
import { LitElement, css, html, nothing } from "lit";
import type { Hass } from "../ha.ts";
import { open } from "./big.ts";
import type { House } from "./common.ts";
import { icon, shared } from "./parts.ts";

export const ROOMS = "casa-mia-jukebox-rooms";

export class Rooms extends LitElement {
  static properties = { house: { attribute: false } };
  hass?: Hass;
  house?: House;

  render() {
    const { hass, house } = this;
    if (!hass || !house) return nothing;
    const quiet = house.groups.filter((g) => g.quiet);
    const silent = Object.values(house.rooms).filter((r) => !r.available);
    return html`${quiet.length
        ? html`<h2>Quiet rooms: tap one to play something there</h2>
            <div class="chips">${quiet.map((g) => html`<button @click=${() => open(hass, g.id, "favourites")}>${icon("rooms")}${house.rooms[g.id].name}</button>`)}</div>`
        : nothing}
      ${silent.length ? html`<h2>Not answering</h2><p class="none">${silent.map((r) => r.name).join(", ")}</p>` : nothing}`;
  }

  static styles = [
    shared,
    css`
      :host { display: block; color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      h2 { margin: 22px 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--secondary-text-color); }
      h2:first-child { margin-top: 0; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chips button { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px; border-radius: 999px; border: 1px solid var(--divider-color); background: var(--card-background-color); font-weight: 600; }
      .chips svg { width: 18px; height: 18px; color: var(--secondary-text-color); }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `,
  ];
}
