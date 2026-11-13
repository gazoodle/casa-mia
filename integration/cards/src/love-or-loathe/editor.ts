// The Love it or Loathe it card's editor: its player, whose song it is, and how much it
// shows, with HA's ha-form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm } from "../ha.ts";
import type { Config } from "./common.ts";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "media_player" } } },
  { name: "person", selector: { entity: { domain: "person" } } },
  { name: "name", selector: { text: {} } },
  { name: "compact", selector: { boolean: {} } },
];
const LABELS: Record<string, string> = { entity: "Media player", person: "Whose song it is", name: "Name", compact: "Only the thumbs" };
const HELP: Record<string, string> = {
  entity: "One that Love it or Loathe it watches.",
  person: "Left empty: whoever is signed in, which suits a dashboard each person opens as themselves. Name a person for a shared screen such as a wall tablet, and give each person a card.",
  name: "Instead of the player's own.",
  compact: "No name and no song: for beside a media card that already shows them.",
};

export class LoveOrLoatheEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  _config?: Config;
  _ready = false;

  setConfig(config: Config) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    haForm().then(() => (this._ready = true));
  }

  render() {
    if (!this.hass || !this._config || !this._ready) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        // An emptied field, or an unticked box, is no option at all.
        const config = Object.fromEntries(Object.entries(ev.detail.value).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)) as Config;
        this._config = config;
        fire(this, "config-changed", { config });
      }}
    ></ha-form>`;
  }
}
