// Casa Mia Buttons' editor: Home Assistant's own form, its list of buttons by its object
// selector, each with HA's entity, icon and action pickers.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS } from "./common.ts";

const SCHEMA = [
  {
    name: "buttons",
    selector: {
      object: {
        multiple: true,
        label_field: "name",
        description_field: "entity",
        fields: {
          entity: { label: "Entity", selector: { entity: {} } },
          name: { label: "Name (blank: the entity's own)", selector: { text: {} } },
          icon: { label: "Icon (blank: the entity's own)", selector: { icon: {} } },
          tap_action: { label: "Tap action (blank: toggle what can be, else more-info)", selector: { ui_action: {} } },
        },
      },
    },
  },
  { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
  { name: "show_name", selector: { boolean: {} } },
  { name: "no_background", selector: { boolean: {} } },
];
const LABELS: Record<string, string> = { buttons: "Buttons", columns: "Columns", show_name: "Show names", no_background: "No background" };
const HELP: Record<string, string> = {
  show_name: "Off: icons only, for the smallest places.",
  no_background: "Just the buttons, on whatever is behind the card.",
};

export class ButtonsEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = withoutDefaults({ ...this._config, ...ev.detail.value }, DEFAULTS);
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;
  }
}
