// Casa Mia Buttons: a few buttons as the style guide's chips (pills.css), small enough
// that four fit a Camera Commander's last place on a phone. The chips keep their fixed
// size; the grid shares the card's width between its columns, and is centred in its
// height. A tap is Home Assistant's own action (hass-action), so toggle, more-info,
// navigate, perform-action and its confirmation all work as on any card.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { actionOf, type Config, DEFAULTS, isOn, nameOf } from "./common.ts";

export class ButtonsCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  static getConfigElement() {
    return document.createElement("casa-mia-buttons-editor");
  }
  static getStubConfig(hass: Hass) {
    const lights = Object.keys(hass.states).filter((e) => e.startsWith("light.")).slice(0, 2);
    return { buttons: lights.map((entity) => ({ entity })) };
  }
  setConfig(config: Config) {
    this._config = config;
  }
  getCardSize() {
    return 1;
  }
  getGridOptions() {
    return { columns: 6, rows: "auto" };
  }

  render() {
    if (!this._config) return nothing;
    const o = { ...DEFAULTS, ...this._config };
    const buttons = o.buttons ?? [];
    return html`<ha-card class=${o.no_background ? "bare" : ""}>
      <div class="grid" style="--columns:${Math.max(1, Math.trunc(o.columns))}">
        ${buttons.map((b) => {
          const state = b.entity ? this.hass?.states[b.entity] : undefined;
          const name = nameOf(b, this.hass);
          return html`<button
            type="button"
            class="cm-chip ${isOn(state) ? "cm-on" : ""}"
            title=${name}
            @click=${() => fire(this, "hass-action", { config: { entity: b.entity, tap_action: actionOf(b) }, action: "tap" })}
          >
            ${b.icon || state ? html`<ha-state-icon .hass=${this.hass} .stateObj=${state} .icon=${b.icon}></ha-state-icon>` : nothing}
            ${o.show_name && name ? html`<span>${name}</span>` : nothing}
          </button>`;
        })}
      </div>
    </ha-card>`;
  }

  static styles = [
    PILLS,
    css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        box-sizing: border-box;
        height: 100%;
        display: flex;
        align-items: center;
        overflow: hidden;
      }
      ha-card.bare {
        background: none;
        border: none;
        box-shadow: none;
      }
      .grid {
        flex: 1;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
        gap: 6px;
        padding: 6px;
      }
      .cm-chip {
        min-width: 0;
        --mdc-icon-size: 14px;
      }
      .cm-chip span {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];
}
