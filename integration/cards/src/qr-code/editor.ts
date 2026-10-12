// The QR code card's editor: its options, with HA's ha-form. The look is the printed guest
// card's, drawn by the app; these choose its parts.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS } from "./card.ts";

/** The endpoints by name ("Guest: Oak Tree", their devices' names), each standing for its
 * Access switch; or none, for a page's code or the Wi-Fi's alone. */
function endpoints(hass: Hass): { value: string; label: string }[] {
  return Object.entries(hass.entities ?? {})
    .filter(([id, e]: [string, any]) => e.platform === "casa_mia_guest_login" && id.startsWith("switch."))
    .map(([id, e]: [string, any]) => {
      const device = hass.devices?.[e.device_id];
      return { value: id, label: device?.name_by_user || device?.name || hass.states[id]?.attributes?.friendly_name || id };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

const schema = (hass: Hass) => [
  { name: "title", selector: { text: {} } },
  { name: "endpoint", selector: { select: { mode: "dropdown", options: [{ value: "", label: "None" }, ...endpoints(hass)] } } },
  { name: "path", selector: { navigation: {} } },
  { name: "wifi", selector: { boolean: {} } },
  { name: "caption", selector: { text: {} } },
  { name: "instructions", selector: { boolean: {} } },
  { name: "wifi_details", selector: { boolean: {} } },
  { name: "welcome", selector: { boolean: {} } },
  { name: "border", selector: { boolean: {} } },
  { name: "code_frames", selector: { boolean: {} } },
];
const LABELS: Record<string, string> = {
  title: "Title",
  endpoint: "Guest login endpoint",
  path: "Or a page",
  wifi: "The Wi-Fi's code beside it",
  caption: "Caption",
  instructions: "Show instructions",
  wifi_details: "Write out the network and password",
  welcome: "The welcome title on top",
  border: "A black border round the card, as printed",
  code_frames: "A black frame round each code",
};
const HELP: Record<string, string> = {
  endpoint: "Its code shows while the endpoint is open, and scanning it signs the visitor in.",
  path: "Used when no endpoint is picked. A plain link to the page: it signs nobody in, so it's for phones already signed in.",
  wifi: "The network saved in Casa Mia's Guest login (QR codes → Wi-Fi), first, so a phone joins before it signs in. With no endpoint or page, the Wi-Fi's code alone.",
  caption: "Under the code. Empty: the endpoint's name, or the page's path.",
  instructions: "The steps (Join the Wi-Fi, Scan to sign in) and the name under the code. Off, with nothing else on, the code alone fills the card. Their words: Casa Mia → Guest login → QR codes → Words.",
  wifi_details: "Under the Wi-Fi's code, for anyone who'd rather type them.",
  welcome: "Guest login's welcome title (Welcome to …), or the endpoint's own.",
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
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${schema(this.hass)}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        const next: Config = { ...this._config!, ...ev.detail.value };
        for (const k of ["title", "endpoint", "path", "caption"] as const) if (!next[k]) delete next[k];
        this._config = next;
        fire(this, "config-changed", { config: withoutDefaults(next, DEFAULTS) });
      }}
    ></ha-form>`;
  }
}
