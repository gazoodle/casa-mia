// The Sensor Watch gauge: one watched number on a half-circle arc whose coloured parts are
// its record's bands, as Sensor Watch holds them now. Nothing is typed into the card
// (HA's own gauge repeats the bands as `segments`, which drift at the record's next
// edit): the integration sends the bands with the level, and again when either changes
// (common.ts follow). The needle takes the colour of the level that counts, which is not
// always the band it points into: a hold-off, an escalation or a stale sensor moves one
// without the other, and the message under the value says which.
import { LitElement, css, html, nothing, svg } from "lit";
import { fire, type Hass, inPicker, navigate } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { LEVEL_TONES } from "./card.ts";
import { DIAL, type GaugeConfig, PANEL, type Watch, along, arcPath, arcs, clock, follow, reading, scale, tidy, watchPath } from "./common.ts";

/** In HA's card picker, where no entity is chosen yet: how it looks in use. */
const EXAMPLE: { name: string; value: number; unit: string; watch: Watch } = {
  name: "Mains voltage",
  value: 212,
  unit: "V",
  watch: {
    watched: true,
    kind: "numeric",
    level: "warning",
    message: "Mains low: under 216 V",
    otherwise: "error",
    bands: [
      { from: null, to: 207, level: "critical" },
      { from: 207, to: 216, level: "warning" },
      { from: 216, to: 253, level: "nominal" },
      { from: 253, to: 262, level: "warning" },
      { from: 262, to: null, level: "critical" },
    ],
  },
};

const NO_BANDS: Record<string, string> = {
  binary: "It is watched by on and off, so there are no bands to draw.",
  state: "It is watched by its states, so there are no bands to draw.",
  available: "It is watched for being there at all, so there are no bands to draw.",
};

export class SensorWatchGauge extends LitElement {
  static properties = { _config: { state: true }, _watch: { state: true }, _lapsed: { state: true } };
  _config?: GaugeConfig;
  _watch?: Watch; // the last one heard, kept while lapsed (and shown as not current)
  /** Why the watch isn't current, and since when; none while it is (or never was). */
  _lapsed?: { why: string; since: number };
  private _hass?: Hass;
  private _for?: string; // the entity followed
  private _off?: () => void;

  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return document.createElement("casa-mia-sensor-watch-gauge-editor");
  }

  setConfig(config: GaugeConfig) {
    this._config = { ...config };
  }

  set hass(hass: Hass) {
    const id = this._config?.entity;
    const was = this._hass;
    this._hass = hass;
    // Home Assistant's connection gone: the feed is silent, so the level is a lapsed
    // claim until it's back (HA subscribes again itself, and the feed sends afresh).
    if (hass.connected === false && !this._lapsed && this._watch) this._lapsed = { why: "No connection to Home Assistant", since: Date.now() };
    // Drawn again only for its own entity: `hass` is set at every state change in the house.
    if (!was || !id || was.states[id] !== hass.states[id] || was.connected !== hass.connected) this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate(); // back on the page (HA moves cards about): follow again
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unfollow();
  }

  protected updated() {
    const id = this._config?.entity;
    if (this.isConnected && this._hass?.connection && id !== this._for) this._follow(id);
  }

  private _follow(id?: string) {
    this._unfollow();
    this._for = id;
    if (!id) return;
    this._off = follow(this._hass!.connection, id, (watch, why) => {
      if (watch) [this._watch, this._lapsed] = [watch, undefined];
      else this._lapsed ??= { why: why ?? "Sensor Watch isn't answering", since: Date.now() };
    });
  }

  private _unfollow() {
    this._off?.();
    this._off = this._for = this._watch = this._lapsed = undefined;
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 6, rows: "auto", min_columns: 3 };
  }

  render() {
    if (!this._config) return nothing;
    const id = this._config.entity;
    const st = id ? this._hass?.states[id] : undefined;
    if (!id) {
      if (inPicker(this)) return this._face(EXAMPLE.name, EXAMPLE.watch, EXAMPLE.value, `${EXAMPLE.value} ${EXAMPLE.unit}`, EXAMPLE.unit);
      return html`<ha-card><p class="note">Choose an entity that Sensor Watch watches.</p></ha-card>`;
    }
    const name = this._config.name || st?.attributes?.friendly_name || id;
    const w = this._watch;
    if (!w) {
      // Never heard: Sensor Watch isn't here (said), or its first answer is on its way.
      return html`<ha-card><p class="name">${name}</p>${this._lapsed ? html`<p class="note problem">${this._lapsed.why}.</p>` : nothing}</ha-card>`;
    }

    const value = st ? reading(st, w, Date.now()) : undefined;
    const unit = w.days_until ? "days" : w.attribute ? "" : (st?.attributes?.unit_of_measurement ?? "");
    // As HA shows it (rounded to its display precision, with its unit), when it is the state itself.
    const shown = !st
      ? "not in Home Assistant"
      : w.days_until
        ? value === undefined
          ? String(st.state)
          : `${value.toFixed(1)} days`
        : w.attribute
          ? String(st.attributes?.[w.attribute] ?? "no such attribute")
          : (this._hass?.formatEntityState?.(st) ?? `${st.state}${unit ? ` ${unit}` : ""}`);
    return this._face(name, w, value, shown, unit, id);
  }

  /** The card for one watch: its arc when it has bands, its value, and what counts. */
  private _face(name: string, w: Watch, value: number | undefined, shown: string, unit: string, id?: string) {
    const admin = !!this._hass?.user?.is_admin && !!this._hass?.panels?.[PANEL];
    const level = w.watched && !w.disabled ? w.level : undefined;
    const said = [name, shown, level, w.message].filter(Boolean).join(", ");
    const lapsed = this._lapsed;
    return html`<ha-card class=${lapsed ? "lapsed" : ""}>
      <button class="face ${level ?? ""}" aria-label=${said} @click=${() => id && fire(this, "hass-more-info", { entityId: id })}>
        ${w.bands ? this._dial(w, value, unit) : nothing}
        <span class="value ${w.stale ? "old" : ""}">${shown}</span>
        <span class="name">${name}</span>
        ${level
          ? html`<span class="counts">
              <span class="cm-pill ${level === "critical" ? "cm-filled" : ""}">${level}</span>
              ${w.message ? html`<span class="message">${w.message}</span>` : nothing}
            </span>`
          : nothing}
      </button>
      ${!w.watched
        ? html`<p class="note">
            Sensor Watch doesn't watch this.
            ${admin && id ? html`<a href=${watchPath(id, 0)} @click=${(ev: Event) => (ev.preventDefault(), navigate(watchPath(id, Date.now())))}>Watch it</a>` : nothing}
          </p>`
        : w.disabled
          ? html`<p class="note">Its watch is switched off in Sensor Watch.</p>`
          : !w.bands
            ? html`<p class="note">${NO_BANDS[w.kind ?? ""] ?? "Its watch has no bands to draw."}</p>`
            : !level
              ? html`<p class="note">No level yet: Sensor Watch is waiting out its hold-off.</p>`
              : nothing}
      ${lapsed ? html`<p class="note problem">${lapsed.why}: its level is not current since ${clock(lapsed.since, Date.now())}.</p>` : nothing}
      ${!id ? html`<p class="note">An example: the bands come from the sensor's watch.</p>` : nothing}
    </ha-card>`;
  }

  /** The half circle: `otherwise` (a number in no band) under the bands, the arc's ends
   * as numbers, and the needle where the reading is (none when it isn't a number). */
  private _dial(w: Watch, value: number | undefined, unit: string) {
    const ends = scale(w.bands!, { min: this._config?.min, max: this._config?.max, unit });
    const turn = value === undefined ? 0 : along(value, ends) * 180 - 90;
    return html`<svg viewBox="0 0 200 122" aria-hidden="true">
      <path class="band ${w.otherwise ?? "error"}" d=${arcPath(0, 1)} />
      ${arcs(w.bands!, ends).map((a) => svg`<path class="band ${a.level}" d=${arcPath(a.from, a.to)} />`)}
      <text class="end" x=${DIAL.cx - DIAL.r} y="118" text-anchor="middle">${tidy(ends[0])}</text>
      <text class="end" x=${DIAL.cx + DIAL.r} y="118" text-anchor="middle">${tidy(ends[1])}</text>
      ${value === undefined
        ? nothing
        : svg`<g class="needle" style="transform: rotate(${turn.toFixed(1)}deg)">
            <path d="M ${DIAL.cx - 3} ${DIAL.cy} L ${DIAL.cx} ${DIAL.cy - DIAL.r + 14} L ${DIAL.cx + 3} ${DIAL.cy} Z" />
            <circle cx=${DIAL.cx} cy=${DIAL.cy} r="6" />
          </g>`}
    </svg>`;
  }

  static styles = [
    PILLS,
    LEVEL_TONES,
    css`
      ha-card {
        padding: 12px 16px;
        overflow: hidden;
      }
      .face {
        display: grid;
        justify-items: center;
        gap: 2px;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: var(--primary-text-color);
        font: inherit;
        text-align: center;
        cursor: pointer;
      }
      svg {
        width: 100%;
        max-width: 280px;
      }
      .band {
        fill: none;
        stroke: var(--cm-level);
        stroke-width: 16;
      }
      .end {
        fill: var(--secondary-text-color);
        font-size: 10px;
      }
      /* The needle in the colour of the level that counts (the face's), which the band
         under it may not be; no level yet: the text's colour. */
      .needle {
        transform-origin: 100px 100px;
        transition: transform 0.6s ease-out;
        fill: var(--cm-level, var(--primary-text-color));
        stroke: var(--card-background-color, #fff);
        stroke-width: 1.5;
      }
      @media (prefers-reduced-motion: reduce) {
        .needle {
          transition: none;
        }
      }
      .value {
        font-size: 28px;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      /* Stale: the number is the last one it sent, not one to trust. */
      .value.old,
      .lapsed .face {
        opacity: 0.55;
      }
      .name {
        margin: 0;
        overflow-wrap: anywhere;
      }
      .counts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 6px;
      }
      .cm-pill {
        --tone: var(--cm-level);
      }
      .message,
      .note {
        color: var(--secondary-text-color);
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .note {
        margin: 8px 0 0;
        text-align: center;
      }
      .note a {
        color: var(--primary-color);
      }
      .problem {
        color: var(--error-color, #db4437);
      }
    `,
  ];
}
