// A Dash-Bored card's editor, for a card that has one: Home Assistant's ha-form, drawn from
// the card's schema. The Console's part cards (console/cards.ts) and each family's room
// card (room.ts) are edited by it.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm } from "../ha.ts";

type Config = Record<string, unknown>;

/** The editor for a card with this schema. `labels` and `help` are by a field's name.
 * `defaults` are what a field stands at when the card does not say: one left at its
 * default is not written into the card. */
export const editor = (schema: object[], labels: Record<string, string>, help: Record<string, string> = {}, defaults: Config = {}) =>
  class extends LitElement {
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
        .data=${{ ...defaults, ...this._config }}
        .schema=${schema}
        .computeLabel=${(s: { name: string }) => labels[s.name] ?? s.name}
        .computeHelper=${(s: { name: string }) => help[s.name]}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          // An emptied field is no option at all.
          const config = Object.fromEntries(Object.entries(ev.detail.value).filter(([k, v]) => v !== undefined && v !== null && v !== "" && !(k in defaults && v === defaults[k])));
          this._config = config;
          fire(this, "config-changed", { config });
        }}
      ></ha-form>`;
    }
  };
