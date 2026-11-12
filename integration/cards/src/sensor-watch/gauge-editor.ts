// The Sensor Watch gauge's editor: its entity, a name and the arc's ends, with HA's
// ha-form. The bands are not here: they are the sensor's watch, edited on Sensor Watch's page.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm } from "../ha.ts";
import type { GaugeConfig } from "./common.ts";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "min", selector: { number: { mode: "box", step: "any" } } },
      { name: "max", selector: { number: { mode: "box", step: "any" } } },
    ],
  },
];
const LABELS: Record<string, string> = { entity: "Entity", name: "Name", min: "Arc starts at", max: "Arc ends at" };
const HELP: Record<string, string> = {
  entity: "One that Sensor Watch watches by bands (a number). Its bands colour the arc, and follow the watch when it is edited.",
  name: "Instead of the entity's own.",
  min: "Left empty: from the bands (0 for a percentage).",
  max: "Left empty: from the bands (100 for a percentage).",
};

export class SensorWatchGaugeEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  _config?: GaugeConfig;
  _ready = false;

  setConfig(config: GaugeConfig) {
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
        // An emptied field is no option at all (the arc's end from the bands again).
        const config = Object.fromEntries(Object.entries(ev.detail.value).filter(([, v]) => v !== undefined && v !== null && v !== "")) as GaugeConfig;
        this._config = config;
        fire(this, "config-changed", { config });
      }}
    ></ha-form>`;
  }
}
