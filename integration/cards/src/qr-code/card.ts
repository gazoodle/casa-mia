// The QR code card: asks the integration (websocket casa_mia_guest_login/qr) for the codes,
// drawn by the app, and shows them. An endpoint is named by its Access switch; its code
// comes only while it is open, and is asked for again each time the switch changes (a
// closed endpoint may get a new address). A page's code is a plain link: it signs nobody in.
import { LitElement, css, html, nothing } from "lit";
import type { Hass } from "../ha.ts";

export type Config = {
  type: string;
  title?: string;
  endpoint?: string; // a guest login endpoint's Access switch
  path?: string; // or a page of Home Assistant, such as /lovelace/pool
  wifi?: boolean; // the Wi-Fi's code beside it
  caption?: string; // under the code (default: the endpoint's name, or the page's path)
};
type Found = { svg?: string; label?: string; closed?: boolean; error?: string; wifi_svg?: string; ssid?: string; wifi_error?: string };

const picture = (svg: string, alt: string) => html`<img src=${`data:image/svg+xml,${encodeURIComponent(svg)}`} alt=${alt} />`;

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
    // The switch's state and when it last changed: an opening, a closing (a new address).
    const st = c.endpoint ? hass.states[c.endpoint] : undefined;
    const seen = JSON.stringify([c.endpoint, c.path, c.wifi, st?.state, st?.last_changed]);
    if (seen === this._seen) return;
    this._seen = seen;
    this._ask(hass, c);
  }

  private async _ask(hass: Hass, c: Config) {
    if (!c.endpoint && !c.path && !c.wifi) {
      this._found = undefined;
      this._problem = "Pick an endpoint or a page.";
      return;
    }
    try {
      this._found = await hass.callWS({
        type: "casa_mia_guest_login/qr",
        ...(c.endpoint ? { entity_id: c.endpoint } : c.path ? { path: c.path } : {}),
        wifi: !!c.wifi,
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
    const c = this._config;
    if (!c) return nothing;
    const f = this._found ?? {};
    const caption = c.caption || f.label || c.path || "";
    const main = f.svg
      ? html`<figure>${picture(f.svg, caption || "QR code")}<figcaption>${caption}</figcaption></figure>`
      : f.closed
        ? html`<figure class="closed"><div class="shut">Closed</div><figcaption>${caption}: its code shows while it's open</figcaption></figure>`
        : nothing;
    const wifi = c.wifi
      ? f.wifi_svg
        ? html`<figure>${picture(f.wifi_svg, "Wi-Fi")}<figcaption>Join the Wi-Fi${f.ssid ? html`<br /><b>${f.ssid}</b>` : nothing}</figcaption></figure>`
        : f.wifi_error
          ? html`<p class="note">${f.wifi_error} (Casa Mia → Guest login → QR codes → Wi-Fi)</p>`
          : nothing
      : nothing;
    return html`<ha-card .header=${c.title || undefined}>
      ${this._problem ? html`<p class="note problem">${this._problem}</p>` : nothing}
      <div class="codes">${main}${wifi}</div>
    </ha-card>`;
  }

  static styles = css`
    ha-card {
      padding: 12px 16px 16px;
    }
    .codes {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    figure {
      flex: 1 1 0;
      max-width: 360px;
      margin: 0;
      text-align: center;
    }
    img,
    .shut {
      display: block;
      width: 100%;
      aspect-ratio: 1;
      border-radius: 7%;
    }
    .shut {
      display: grid;
      place-items: center;
      background: var(--secondary-background-color);
      color: var(--secondary-text-color);
      font-size: 1.2em;
    }
    figcaption {
      margin-top: 8px;
      color: var(--primary-text-color);
    }
    .note {
      margin: 0 0 8px;
      color: var(--secondary-text-color);
    }
    .problem {
      color: var(--error-color);
    }
  `;
}
