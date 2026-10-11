// The Sensor Watch card's editor: its options, with HA's ha-form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS, LEVELS } from "./common.ts";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "group", selector: { text: {} } },
  { name: "levels", selector: { select: { multiple: true, mode: "list", options: LEVELS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) })) } } },
  { name: "max", selector: { number: { min: 1, max: 100, mode: "box" } } },
  {
    name: "when_clear",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "hide", label: "Hide the card (in a Tablet Layout, its panel closes)" },
          { value: "message", label: "Say so" },
        ],
      },
    },
  },
  { name: "clear_message", selector: { text: {} } },
];
const LABELS: Record<string, string> = {
  title: "Title",
  group: "Group",
  levels: "Levels to list",
  max: "At most",
  when_clear: "When all is well",
  clear_message: "Its message",
};
const HELP: Record<string, string> = {
  title: "Or none, and give its panel a garnish heading (it hides with the card).",
  group: "A group's name, as on Casa Mia's Sensor Watch page: only its members. Empty for every watched sensor.",
};

export class SensorWatchEditor extends LitElement {
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
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = { ...this._config!, ...ev.detail.value };
        fire(this, "config-changed", { config: withoutDefaults(this._config!, DEFAULTS) });
      }}
    ></ha-form>`;
  }
}
