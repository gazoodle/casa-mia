// The Sensor Watch card: what isn't nominal, worst first, from the casa_mia_sensor_watch
// integration's `list` service (a group's only, if it names one). It asks again whenever
// the integration's own entities write (a level moved), and shows each value live from the
// entity itself. With nothing to list it hides (HA's card wrapper honours a card's own
// `hidden`), so in a Tablet Layout its panel closes, garnish heading and all, when all is well.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { type Config, DEFAULTS, type Row, since } from "./common.ts";

const DOMAIN = "casa_mia_sensor_watch";
const ASK_AFTER = 300; // ms: the integration's entities write in a burst; one ask after

export class SensorWatchCard extends LitElement {
  static properties = { _config: { state: true }, _rows: { state: true }, _problem: { state: true }, _editing: { state: true } };
  _config?: Config;
  _rows?: Row[];
  _problem?: string;
  _editing = false;
  private _hass?: Hass;
  private _seen = ""; // the integration's entities, as last seen: a change asks again
  private _timer?: number;

  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return document.createElement("casa-mia-sensor-watch-editor");
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._seen = ""; // ask again, with the new options
    if (this._hass) this._later();
  }

  set hass(hass: Hass) {
    this._hass = hass;
    // The integration's entities (its status and counts) write when a level moves.
    const mine = Object.entries(hass.entities ?? {})
      .filter(([, e]: [string, any]) => e.platform === DOMAIN)
      .map(([id]) => `${id}@${hass.states[id]?.last_updated ?? ""}`)
      .join(",");
    if (mine !== this._seen) {
      this._seen = mine;
      this._later();
    }
    this.requestUpdate(); // values come live from the entities
  }

  set preview(on: boolean) {
    this._editing = on;
    this._showOrHide();
  }
  set editMode(on: boolean) {
    this._editing = on;
    this._showOrHide();
  }

  private _later() {
    clearTimeout(this._timer);
    this._timer = window.setTimeout(() => this._ask(), ASK_AFTER);
  }

  private async _ask() {
    const hass = this._hass;
    const o = { ...DEFAULTS, ...this._config };
    if (!hass) return;
    try {
      const got: any = await hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "list",
        service_data: { levels: o.levels, ...(o.group ? { group: o.group } : {}) },
        return_response: true,
      });
      this._rows = (got?.response?.sensors ?? []) as Row[];
      this._problem = undefined;
    } catch (err) {
      this._rows = [];
      this._problem = `Sensor Watch isn't answering (${(err as Error)?.message ?? err}): is its integration set up?`;
      console.warn(`CASA-MIA CARDS: sensor watch: ${this._problem}`);
    }
    this._showOrHide();
  }

  /** Hidden with nothing to list (unless asked to say so, or being edited). */
  private _showOrHide() {
    const o = { ...DEFAULTS, ...this._config };
    const hide = !this._editing && !this._problem && this._rows !== undefined && this._rows.length === 0 && o.when_clear === "hide";
    if (hide === this.hidden) return;
    this.hidden = hide;
    fire(this, "card-visibility-changed", { value: !hide });
  }

  getCardSize() {
    return 1 + Math.min(this._rows?.length ?? 1, { ...DEFAULTS, ...this._config }.max);
  }

  getGridOptions() {
    return { columns: 12, rows: "auto" };
  }

  render() {
    if (!this._config) return nothing;
    const o = { ...DEFAULTS, ...this._config };
    const rows = (this._rows ?? []).slice(0, o.max);
    const more = (this._rows?.length ?? 0) - rows.length;
    const now = Date.now();
    return html`<ha-card .header=${o.title || undefined}>
      ${this._problem ? html`<p class="note problem">${this._problem}</p>` : nothing}
      ${!this._problem && this._rows && !rows.length
        ? html`<p class="note">${o.when_clear === "message" ? o.clear_message : "All well: nothing to list, so this card is hidden on the dashboard."}</p>`
        : nothing}
      ${rows.map((r) => {
        const st = this._hass?.states[r.entity_id];
        const unit = st?.attributes?.unit_of_measurement ?? "";
        const value = st ? `${st.state}${unit ? ` ${unit}` : ""}` : (r.value ?? "");
        return html`<button class="row ${r.level}" @click=${() => fire(this, "hass-more-info", { entityId: r.entity_id })}>
          <span class="level">${r.level}</span>
          <span class="what">
            <span class="name">${r.name}</span>
            ${r.message ? html`<span class="message">${r.message}</span>` : nothing}
          </span>
          <span class="value">${value}</span>
          <span class="since">${since(r.since, now)}</span>
        </button>`;
      })}
      ${more > 0 ? html`<p class="note">and ${more} more</p>` : nothing}
    </ha-card>`;
  }

  static styles = css`
    ha-card {
      padding: 4px 0;
      overflow: hidden;
    }
    .row {
      display: grid;
      grid-template-columns: 72px 1fr auto auto;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 16px;
      border: 0;
      border-left: 4px solid var(--cm-level);
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row:hover {
      background: var(--secondary-background-color);
    }
    .task {
      --cm-level: var(--info-color, #039be5);
    }
    .warning {
      --cm-level: var(--warning-color, #ffa600);
    }
    .error,
    .critical {
      --cm-level: var(--error-color, #db4437);
    }
    .level {
      justify-self: start;
      padding: 1px 8px;
      border-radius: 10px;
      background: var(--cm-level);
      color: #fff;
      font-size: 12px;
      text-transform: capitalize;
    }
    .critical .level {
      font-weight: 700;
    }
    .what {
      display: grid;
      min-width: 0;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .message,
    .since,
    .note {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .value {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .note {
      margin: 8px 16px;
    }
    .problem {
      color: var(--error-color, #db4437);
    }
  `;
}
