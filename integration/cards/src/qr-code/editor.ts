// The QR code card's editor: its options, with HA's ha-form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm } from "../ha.ts";
import type { Config } from "./card.ts";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "endpoint", selector: { entity: { filter: { integration: "casa_mia_guest_login", domain: "switch" } } } },
  { name: "path", selector: { navigation: {} } },
  { name: "wifi", selector: { boolean: {} } },
  { name: "caption", selector: { text: {} } },
];
const LABELS: Record<string, string> = {
  title: "Title",
  endpoint: "Guest login endpoint",
  path: "Or a page",
  wifi: "The Wi-Fi's code beside it",
  caption: "Caption",
};
const HELP: Record<string, string> = {
  endpoint: "Its Access switch. The code shows while the endpoint is open, and scanning it signs the visitor in.",
  path: "Used when no endpoint is picked. A plain link to the page: it signs nobody in, so it's for phones already signed in.",
  wifi: "The network saved in Casa Mia's Guest login (QR codes → Wi-Fi).",
  caption: "Under the code. Empty: the endpoint's name, or the page's path.",
};

export class QrCodeEditor extends LitElement {
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
        const next: Config = { ...this._config!, ...ev.detail.value };
        for (const k of ["title", "endpoint", "path", "caption", "wifi"] as const) if (!next[k]) delete next[k];
        this._config = next;
        fire(this, "config-changed", { config: next });
      }}
    ></ha-form>`;
  }
}
