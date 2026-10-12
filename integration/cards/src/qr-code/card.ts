// The QR code card: asks the integration (websocket casa_mia_guest_login/qr) for its picture,
// drawn by the app as the printed guest card is (one renderer for both), and shows it. An
// endpoint is named by its Access switch; its code comes only while it is open, and is asked
// for again each time the switch changes (a closed endpoint may get a new address). A page's
// code is a plain link: it signs nobody in. The Wi-Fi's code comes first (left), so a phone
// joins the network before it signs in; with no endpoint or page, it is alone. With nothing
// but one code (no instructions, title or network words), the code alone fills the card, to
// lay out round it as you like.
import { LitElement, css, html, nothing } from "lit";
import type { Hass } from "../ha.ts";

export type Config = {
  type: string;
  title?: string;
  endpoint?: string; // a guest login endpoint's Access switch
  path?: string; // or a page of Home Assistant, such as /lovelace/pool
  wifi?: boolean; // the Wi-Fi's code beside it, or alone
  caption?: string; // under the code (default: the endpoint's name, or the page's path)
  instructions?: boolean; // the steps (Join the Wi-Fi, Scan to sign in) and the name under a code
  wifi_details?: boolean; // the network's name and password written out
  welcome?: boolean; // Guest login's welcome title on top, as on the guest card
  border?: boolean; // the guest card's black rounded border
  code_frames?: boolean; // each code in its black frame
};
/** Each option's default: shown in the editor, and never saved. */
export const DEFAULTS = { wifi: false, instructions: true, wifi_details: true, welcome: false, border: false, code_frames: true };
type Found = { svg?: string; error?: string; wifi_error?: string };

export class QrCodeCard extends LitElement {
  static properties = { _config: { state: true }, _found: { state: true }, _problem: { state: true } };
  _config?: Config;
  _found?: Found;
  _problem?: string;
  private _hass?: Hass;
  private _seen: string | null = null; // the asking's inputs, as last asked (null: ask)

  static getStubConfig(hass: Hass): Partial<Config> {
    const endpoint = Object.keys(hass.entities ?? {}).find((id) => hass.entities[id]?.platform === "casa_mia_guest_login" && id.startsWith("switch."));
    return endpoint ? { endpoint } : { path: "/lovelace" };
  }

  static getConfigElement() {
    return document.createElement("casa-mia-qr-code-editor");
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._seen = null;
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass: Hass) {
    this._hass = hass;
    const c = this._config;
    if (!c) return;
    // The options, and the switch's state and when it last changed: an opening, a closing
    // (a new address).
    const st = c.endpoint ? hass.states[c.endpoint] : undefined;
    const seen = JSON.stringify([c, st?.state, st?.last_changed]);
    if (seen === this._seen) return;
    this._seen = seen;
    this._ask(hass, { ...DEFAULTS, ...c });
  }

  private async _ask(hass: Hass, c: Config & typeof DEFAULTS) {
    if (!c.endpoint && !c.path && !c.wifi) {
      this._found = undefined;
      this._problem = "Pick an endpoint or a page, or turn on the Wi-Fi's code.";
      return;
    }
    try {
      this._found = await hass.callWS({
        type: "casa_mia_guest_login/qr",
        ...(c.endpoint ? { entity_id: c.endpoint } : c.path ? { path: c.path } : {}),
        wifi: c.wifi,
        ...(c.caption ? { caption: c.caption } : {}),
        welcome: c.welcome,
        border: c.border,
        frame: c.code_frames,
        details: c.wifi_details,
        steps: c.instructions,
      });
      this._problem = this._found?.error;
    } catch (err) {
      this._found = undefined;
      this._problem = `Casa Mia isn't answering (${(err as Error)?.message ?? err}): is Guest login switched on in the app, and the Casa Mia Guest Login integration set up?`;
      console.warn(`CASA-MIA CARDS: qr code: ${this._problem}`);
    }
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: this._config?.wifi && (this._config.endpoint || this._config.path) ? 12 : 6, rows: "auto" };
  }

  render() {
    if (!this._config) return nothing;
    const f = this._found ?? {};
    // The printed border is the card's edge: no card round it (as the markdown card's
    // Show only text).
    return html`<ha-card class=${this._config.border ? "printed" : ""} .header=${this._config.title || undefined}>
      ${this._problem ? html`<p class="note problem">${this._problem}</p>` : nothing}
      ${f.wifi_error ? html`<p class="note">${f.wifi_error} (Casa Mia → Guest login → QR codes → Wi-Fi)</p>` : nothing}
      ${f.svg ? html`<img src=${`data:image/svg+xml,${encodeURIComponent(f.svg)}`} alt="QR code" />` : nothing}
    </ha-card>`;
  }

  static styles = css`
    ha-card {
      overflow: hidden;
    }
    ha-card.printed {
      background: none;
      border: none;
      box-shadow: none;
    }
    img {
      display: block;
      width: 100%;
    }
    .note {
      margin: 8px;
      color: var(--secondary-text-color);
    }
    .problem {
      color: var(--error-color);
    }
  `;
}
