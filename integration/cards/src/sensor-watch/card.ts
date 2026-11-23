// The Sensor Watch card: what isn't nominal, worst first, from Sensor Watch's list
// service (casa_mia_sensor_watch.list; a group's only, if it names one). It asks again the
// moment a level moves (its casa_mia_sensor_watch event; its entities' writes are
// the backstop), and shows each value live from the entity itself. With nothing to list it hides (HA's card wrapper honours a card's own
// `hidden`), so in a Tablet Layout its panel closes, garnish heading and all, when all is well.
import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import { fire, type Hass, inPicker } from "../ha.ts";
import { PILLS } from "../pills.ts";
import {
  type Column,
  type Config,
  DEFAULTS,
  DOMAIN,
  EVENT,
  LEVEL_COLOR,
  type Row,
  SERVICE,
  SNOOZE_FOR,
  clock,
  columns,
  detailed,
  due,
  own,
  parts,
  since,
  snoozable,
  snoozedLine,
  stateColor,
  tapped,
} from "./common.ts";

const ASK_AFTER = 300; // ms: the integration's entities write in a burst; one ask after
const SNOOZED = "snoozed"; // in `_open`: the snoozed rows are showing
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
/** In HA's card picker with nothing to list: how it looks when something is. */
const EXAMPLE: Row[] = [
  { entity_id: "", name: "Plug 3 voltage", level: "critical", value: "198 V", message: "Mains far too low: under 207 V", since: ago(3) },
  { entity_id: "", name: "Freezer", level: "warning", value: "-12 °C", message: "Freezer too warm: check the door and seal", since: ago(1) },
  { entity_id: "", name: "Softener salt", level: "task", value: "18 %", message: "Top up the salt", since: ago(50) },
];

/** Each level's colour (`--cm-level`, from LEVEL_COLOR) on an element classed by its
 * level; the card's rows and the eye in an entity's dialog (eye.ts). */
export const LEVEL_TONES = unsafeCSS(
  Object.entries(LEVEL_COLOR)
    .map(([level, color]) => `.${level} { --cm-level: ${color}; }`)
    .join("\n"),
);

export class SensorWatchCard extends LitElement {
  static properties = {
    _config: { state: true },
    _rows: { state: true },
    _snoozed: { state: true },
    _problem: { state: true },
    _refused: { state: true },
    _editing: { state: true },
    _open: { state: true },
  };
  _config?: Config;
  _rows?: Row[];
  _snoozed: Row[] = []; // out of the list and the counts, but never out of sight
  _problem?: string;
  _refused?: string; // why a snooze or unsnooze wasn't done
  _editing = false;
  _open = new Set<string>(); // the rows showing what is under them, and SNOOZED
  private _hass?: Hass;
  private _seen: string | null = null; // the integration's entities, as last seen: a change asks again (null: never seen, so ask)
  private _timer?: number;
  private _unsubscribe?: Promise<() => void>; // from the change-of-level event

  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return document.createElement("casa-mia-sensor-watch-editor");
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._seen = null; // ask again, with the new options
    if (this._hass) this._later();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._hass) this._subscribe(this._hass);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.then((off) => off()).catch(() => {});
    this._unsubscribe = undefined;
  }

  /** Hear each change of level as the integration decides it, and ask again at once. */
  private _subscribe(hass: Hass) {
    if (this._unsubscribe || !hass.connection) return;
    const subscribed: Promise<() => void> = hass.connection.subscribeEvents(() => {
      clearTimeout(this._timer);
      this._ask();
    }, EVENT);
    this._unsubscribe = subscribed;
    subscribed.catch((err: unknown) => console.warn(`CASA-MIA CARDS: sensor watch: can't hear its event (${err})`));
  }

  set hass(hass: Hass) {
    this._hass = hass;
    if (this.isConnected) this._subscribe(hass);
    // The integration's entities (its status and counts) write when a level moves.
    const mine = Object.entries(hass.entities ?? {})
      .filter(([, e]: [string, any]) => own(e))
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
        ...SERVICE,
        service_data: { levels: o.levels, ...(o.group ? { group: o.group } : {}) },
        return_response: true,
      });
      this._rows = (got?.response?.sensors ?? []) as Row[];
      this._snoozed = (got?.response?.snoozed ?? []) as Row[];
      this._problem = undefined;
    } catch (err) {
      this._rows = [];
      this._snoozed = [];
      this._problem = `Sensor Watch isn't answering (${(err as Error)?.message ?? err}): is it switched on in the Casa Mia app, and Home Assistant restarted since?`;
      console.warn(`CASA-MIA CARDS: sensor watch: ${this._problem}`);
    }
    this._showOrHide();
  }

  /** Snooze a row for some days, or put a snoozed one back; a refusal is said on the
   * card. The integration's entities write when it's done, which asks for the list again. */
  private async _snooze(r: Row, days?: number) {
    const service_data = { entity_id: r.entity_id, ...(days ? { duration: { days } } : {}) };
    try {
      await this._hass?.callWS({ type: "call_service", domain: DOMAIN, service: days ? "snooze" : "unsnooze", service_data });
      this._refused = undefined;
      const open = new Set(this._open);
      open.delete(r.entity_id);
      this._open = open;
      this._ask();
    } catch (err) {
      this._refused = `${r.name} wasn't ${days ? "snoozed" : "unsnoozed"}: ${(err as Error)?.message ?? err}`;
      console.warn(`CASA-MIA CARDS: sensor watch: ${this._refused}`);
    }
  }

  /** Hidden with nothing to list (unless asked to say so, or being edited). Never while
   * something is snoozed: that is to stay in sight. */
  private _showOrHide() {
    const o = { ...DEFAULTS, ...this._config };
    const hide =
      !this._editing &&
      !(this.isConnected && inPicker(this)) &&
      !this._problem &&
      this._rows !== undefined &&
      this._rows.length === 0 &&
      this._snoozed.length === 0 &&
      o.when_clear === "hide";
    if (hide === this.hidden) return;
    this.hidden = hide;
    fire(this, "card-visibility-changed", { value: !hide });
  }

  getCardSize() {
    return 1 + Math.min(this._rows?.length ?? 1, { ...DEFAULTS, ...this._config }.max) + (this._snoozed.length ? 1 : 0);
  }

  getGridOptions() {
    return { columns: 12, rows: "auto" };
  }

  render() {
    if (!this._config) return nothing;
    const o = { ...DEFAULTS, ...this._config };
    // In the card picker with nothing (or no answer) to show: an example of a bad day.
    const example = inPicker(this) && (this._problem !== undefined || (this._rows !== undefined && !this._rows.length));
    if (example)
      return html`<ha-card .header=${o.title || "Needs looking at"}>
        ${EXAMPLE.map((r) => this._row(r, r.value ?? "", Date.now()))}
        <p class="note">An example: hidden when all is well.</p>
      </ha-card>`;
    const rows = (this._rows ?? []).slice(0, o.max);
    const more = (this._rows?.length ?? 0) - rows.length;
    const now = Date.now();
    return html`<ha-card .header=${o.title || undefined}>
      ${this._problem ? html`<p class="note problem">${this._problem}</p>` : nothing}
      ${this._refused ? html`<p class="note problem">${this._refused}</p>` : nothing}
      ${!this._problem && this._rows && !rows.length && (o.when_clear === "message" || !this._snoozed.length)
        ? html`<p class="note">${o.when_clear === "message" ? o.clear_message : "All well: nothing to list, so this card is hidden on the dashboard."}</p>`
        : nothing}
      ${rows.map((r) => this._unfolding(r, now, o.snooze))}
      ${more > 0 ? html`<p class="note">and ${more} more</p>` : nothing}
      ${this._snoozed.length
        ? html`<button class="snoozed" aria-expanded=${String(this._open.has(SNOOZED))} @click=${() => this._toggle(SNOOZED)}>
              ${snoozedLine(this._snoozed, now)} ${this._open.has(SNOOZED) ? "▴" : "▾"}
            </button>
            ${this._open.has(SNOOZED) ? html`<div class="dim">${this._snoozed.map((r) => this._unfolding(r, now, o.snooze))}</div>` : nothing}`
        : nothing}
    </ha-card>`;
  }

  /** A row, and when it is open what is under it: the offer to snooze it (or, snoozed,
   * until when and by whom, and to put it back), then the sensors rolled up into it. */
  private _unfolding(r: Row, now: number, snooze: boolean) {
    const open = this._open.has(r.entity_id);
    return [
      this._live(r, now),
      r.snoozed
        ? html`<div class="acts">
            <span class="note">until ${clock(Date.parse(r.snoozed.until), now)}${r.snoozed.by ? ` · snoozed by ${r.snoozed.by}` : ""}</span>
            ${snooze ? html`<button class="cm-chip" @click=${() => this._snooze(r)}>Unsnooze</button>` : nothing}
          </div>`
        : nothing,
      open && snooze && snoozable(r)
        ? html`<div class="acts">
            <span class="note">Snooze for</span>
            ${SNOOZE_FOR.map(([label, days]) => html`<button class="cm-chip" @click=${() => this._snooze(r, days)}>${label}</button>`)}
            ${detailed(r) ? html`<button class="cm-chip cm-quiet" @click=${() => fire(this, "hass-more-info", { entityId: r.entity_id })}>Details</button>` : nothing}
          </div>`
        : nothing,
      open && r.sensors?.length ? html`<div class="under">${r.sensors.map((sensor) => this._live(sensor, now))}</div>` : nothing,
    ];
  }

  /** A row with its value as it is now. */
  private _live(r: Row, now: number) {
    if (r.sensors?.length) return this._row(r, `${r.sensors.length} sensor${r.sensors.length === 1 ? "" : "s"} ${this._open.has(r.entity_id) ? "▴" : "▾"}`, now);
    const st = this._hass?.states[r.entity_id];
    if (r.days_until) return this._row(r, due(r.attribute ? String(st?.attributes?.[r.attribute] ?? "") : st?.state, r.value), now);
    if (r.attribute) return this._row(r, String(st?.attributes?.[r.attribute] ?? r.value ?? ""), now);
    // As HA shows it: rounded to its display precision, with its unit (formatEntityState).
    const unit = st?.attributes?.unit_of_measurement ?? "";
    const shown = st && (this._hass?.formatEntityState?.(st) ?? `${st.state}${unit ? ` ${unit}` : ""}`);
    return this._row(r, shown || (r.value ?? ""), now);
  }

  private _tap(r: Row) {
    const does = tapped(r, { ...DEFAULTS, ...this._config }.snooze);
    if (does === "details") fire(this, "hass-more-info", { entityId: r.entity_id });
    if (does === "unfold") this._toggle(r.entity_id);
  }

  private _toggle(key: string) {
    const open = new Set(this._open);
    if (!open.delete(key)) open.add(key);
    this._open = open;
  }

  private _row(r: Row, value: string, now: number) {
    const o = { ...DEFAULTS, ...this._config };
    const show: readonly Column[] = o.show;
    const st = this._hass?.states[r.entity_id];
    const part = (p: Column | "what") => {
      switch (p) {
        case "icon": {
          const color = o.icon_color === "level" ? "var(--cm-level)" : o.icon_color === "state" && st ? stateColor(r.entity_id, st.state, st.attributes?.device_class) : "";
          // ponytail: ha-state-icon is HA's own, defined once any tile or entity row has loaded; until then the place stays empty.
          return html`<ha-state-icon class="icon" style=${color ? `color:${color}` : ""} .hass=${this._hass} .stateObj=${st}></ha-state-icon>`;
        }
        case "level":
          return html`<span class="level cm-pill ${r.level === "critical" ? "cm-filled" : ""}">${r.level}</span>`;
        case "what":
          return html`<span class="what">
            ${show
              .filter((c) => c === "name" || c === "message")
              .map((c) => (c === "name" ? html`<span class="name">${r.name}</span>` : r.message ? html`<span class="message">${r.message}</span>` : nothing))}
          </span>`;
        case "value":
          return html`<span class="value">${value}</span>`;
        case "since":
          return html`<span class="since">${since(r.since, now)}</span>`;
        default:
          return nothing;
      }
    };
    return html`<button
      class="row ${r.level}"
      style="grid-template-columns:${columns(show)}"
      aria-expanded=${r.sensors?.length ? String(this._open.has(r.entity_id)) : nothing}
      @click=${() => this._tap(r)}
    >
      ${parts(show).map(part)}
    </button>`;
  }

  static styles = [
    PILLS,
    LEVEL_TONES,
    css`
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
    /* A status pill in its level's colour (pills.ts; card-level), critical filled. */
    .icon {
      --mdc-icon-size: 24px;
      display: flex;
      color: var(--state-icon-color);
    }
    .level {
      justify-self: start;
      --tone: var(--cm-level);
    }
    .what {
      display: grid;
      min-width: 0;
    }
    /* What is rolled up into the failed integration above it. */
    .under {
      padding-inline-start: 24px;
    }
    /* What a row offers when open: to snooze it, or to put a snoozed one back. */
    .acts {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 0 16px 8px 20px;
    }
    .acts .note {
      margin: 0;
    }
    /* What is snoozed: out of the list, never out of sight. */
    .snoozed {
      display: block;
      width: 100%;
      padding: 6px 16px;
      border: 0;
      background: none;
      color: var(--secondary-text-color);
      font: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .snoozed:hover {
      background: var(--secondary-background-color);
    }
    .dim .row {
      opacity: 0.55;
    }
    /* An error's text wraps, a long address in it too. */
    .message {
      overflow-wrap: anywhere;
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
  `,
  ];
}
