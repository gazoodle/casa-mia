// The Heating Flow card: the heating and hot water as a live diagram. Colour is temperature
// (each sensor a stop on its pipe), moving chevrons are flow, and anything not current or
// wrong says so: in the header in words, and on the part itself.
import { LitElement, css, html, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { fire, type Hass } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { type Config, DEFAULTS, PRIO_COLOUR, type Readings, type View, entitiesOf, readAll } from "./common.ts";
import type { Look } from "./engine.ts";
import * as hpView from "./heatpump.ts";
import * as roomsView from "./rooms.ts";
import * as sysView from "./system.ts";

const HOLD_MS = 500;

/** Each view: its tab's label, its size and its drawing. */
const VIEWS: Record<View, [string, number, number, (c: Config, r: Readings, look: Look) => string]> = {
  system: ["System", sysView.W, sysView.H, sysView.system],
  heat_pump: ["Heat pump", hpView.W, hpView.H, hpView.heatPump],
  rooms: ["Rooms", roomsView.W, roomsView.H, roomsView.rooms],
};

export class HeatingFlowCard extends LitElement {
  static properties = { _config: { state: true }, _view: { state: true } };
  _config?: Config;
  _view: View = "system";
  private _hass?: Hass;
  private _seen = ""; // the states the card shows, as last drawn: redraw only when one moves
  private _timer?: number;
  private _held = false;

  static getStubConfig() {
    return { source: { type: "borehole" }, dhw: { enabled: true }, floor_1: { name: "Ground floor" }, floor_2: { name: "First floor" } };
  }

  static getConfigElement() {
    return document.createElement("casa-mia-heating-flow-editor");
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._view = config.view && config.view in VIEWS ? config.view : DEFAULTS.view;
    this._seen = "";
  }

  set hass(hass: Hass) {
    this._hass = hass;
    // Only the card's own entities matter; HA sets hass on every state change in the house.
    const ids = this._config ? entitiesOf(this._config) : [];
    const now = ids.map((id) => `${id}@${hass.states[id]?.last_updated ?? ""}`).join(",");
    if (now !== this._seen) {
      this._seen = now;
      this.requestUpdate();
    }
  }

  getCardSize() {
    return 9;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  render() {
    if (!this._config || !this._hass) return nothing;
    const o = { ...DEFAULTS, ...this._config };
    const look: Look = { pipes: o.pipes, markers: o.markers, colours: o.colours, readouts: o.readouts };
    const r = readAll(this._hass, this._config);
    const [label, W, H, draw] = VIEWS[this._view];
    return html`<ha-card>
      <div class="head">
        <span class="title">${o.title ?? "Heating & hot water"}</span>
        ${this._chips(r)}
        <span class="tabs">
          ${(Object.keys(VIEWS) as View[]).map((v) => html`<button class="cm-chip ${v === this._view ? "cm-on" : ""}" @click=${() => (this._view = v)}>${VIEWS[v][0]}</button>`)}
        </span>
      </div>
      <svg
        class=${this._still() ? "still" : ""}
        viewBox="0 0 ${W} ${H}"
        role="img"
        aria-label="Heating and hot water: ${label}"
        @pointerdown=${this._down}
        @pointerup=${this._up}
        @pointerleave=${this._up}
        @click=${this._click}
        @dblclick=${this._dbl}
      >
        ${unsafeSVG(draw(this._config, r, look))}
      </svg>
    </ha-card>`;
  }

  /** A still picture: animations off in the options, or reduced motion asked for. */
  private _still() {
    return this._config?.animations === false || matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Still, the SVG's clock stops, so the flow markers stand where they are and nothing is
  // redrawn frame by frame (some tablet GPUs draw junk around a repaint under a filter).
  updated() {
    const svg = this.renderRoot.querySelector("svg");
    if (!svg) return;
    if (this._still()) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }

  /** What it is doing, and the system's own faults, in words. A sensor that is unavailable
   * says so on its part; which sensors are broken is Sensor Watch's job. */
  private _chips(r: Readings) {
    const hz = this._config?.heat_pump?.compressor ? r.data[this._config.heat_pump.compressor] : undefined;
    const outdoor = this._config?.source?.outdoor ? r.data[this._config.source.outdoor] : undefined;
    const fmt = (d: { v: number; dp: number; unit: string; text?: string }) => d.text ?? d.v.toFixed(d.dp) + d.unit;
    return html`<span class="cm-pill cm-filled" style="--tone:${PRIO_COLOUR[r.prio] ?? "var(--secondary-text-color)"}">${r.prio}</span>
      ${hz && !hz.stale ? html`<span class="cm-pill">${hz.v > 0 ? fmt(hz) : "Compressor off"}</span>` : nothing}
      ${outdoor && !outdoor.stale ? html`<span class="cm-pill">Outdoor ${fmt(outdoor)}</span>` : nothing}
      ${r.alarm ? html`<span class="cm-pill cm-filled" style="--tone:var(--error-color, #db4437)">Alarm: ${r.alarm}</span>` : nothing}
      ${r.saltLow ? html`<span class="cm-pill cm-filled" style="--tone:var(--warning-color, #ffa600)">Softener: top up salt</span>` : nothing}`;
  }

  // ---- HA's tap, hold and double-tap actions on the part under the pointer ----
  private _part(ev: Event) {
    return (ev.target as Element).closest?.("[data-e]")?.getAttribute("data-e") || undefined;
  }
  private _act(entity: string, action: "tap" | "hold" | "double_tap") {
    const c = this._config!;
    fire(this, "hass-action", {
      config: { entity, tap_action: c.tap_action ?? { action: "more-info" }, hold_action: c.hold_action ?? { action: "none" }, double_tap_action: c.double_tap_action ?? { action: "none" } },
      action,
    });
  }
  private _down = (ev: PointerEvent) => {
    const e = this._part(ev);
    this._held = false;
    clearTimeout(this._timer);
    if (e) this._timer = window.setTimeout(() => ((this._held = true), this._act(e, "hold")), HOLD_MS);
  };
  private _up = () => clearTimeout(this._timer);
  private _click = (ev: MouseEvent) => {
    const e = this._part(ev);
    if (e && !this._held) this._act(e, "tap");
  };
  private _dbl = (ev: MouseEvent) => {
    const e = this._part(ev);
    if (e) this._act(e, "double_tap");
  };

  static styles = [
    PILLS,
    css`
      :host {
        --hf-panel: var(--card-background-color, #fff);
        --hf-panel2: color-mix(in srgb, var(--primary-text-color, #212121) 6%, var(--hf-panel));
        --hf-line: var(--divider-color, #c9ced8);
        --hf-text: var(--primary-text-color, #212121);
        --hf-muted: var(--secondary-text-color, #727272);
        --hf-edge: color-mix(in srgb, var(--primary-text-color, #212121) 78%, var(--hf-panel));
        --hf-conduit: color-mix(in srgb, #000 75%, var(--hf-panel));
        --hf-off: color-mix(in srgb, var(--secondary-text-color, #727272) 45%, var(--hf-panel));
        --hf-accent: var(--primary-color, #03a9f4);
        --hf-run: var(--success-color, #43a047);
        --hf-warn: var(--warning-color, #ffa600);
        --hf-bad: var(--error-color, #db4437);
        --hf-zone-out: color-mix(in srgb, #2f86e0 7%, var(--hf-panel));
        --hf-zone-plant: color-mix(in srgb, var(--primary-text-color, #212121) 3%, var(--hf-panel));
        --hf-zone-house: color-mix(in srgb, #e8a050 7%, var(--hf-panel));
        --hf-earth1: color-mix(in srgb, #9a7b55 85%, var(--hf-panel));
        --hf-earth2: color-mix(in srgb, #b89a70 85%, var(--hf-panel));
        --hf-earth3: color-mix(in srgb, #8a8780 85%, var(--hf-panel));
        --hf-grass: #5f9e4f;
      }
      ha-card {
        overflow: hidden;
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid var(--hf-line);
      }
      .title {
        margin-right: auto;
        color: var(--hf-text);
        font-size: 16px;
        font-weight: 500;
      }
      .tabs {
        display: flex;
        gap: 4px;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        font-family: var(--ha-font-family-body, inherit);
      }
      .t { fill: var(--hf-text); }
      .m { fill: var(--hf-muted); }
      .w { fill: var(--hf-warn); }
      .zl { fill: var(--hf-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .halo { paint-order: stroke; stroke: var(--hf-panel); stroke-width: 4px; stroke-linejoin: round; }
      .lt { fill: #fff; paint-order: stroke; stroke: rgba(0, 0, 0, 0.45); stroke-width: 3px; }
      .hit { cursor: pointer; }
      .hit:hover .hl { stroke: var(--hf-accent) !important; stroke-width: 2.5px; }
      .spin { animation: spin var(--sd, 3s) linear infinite; }
      .pulse { animation: pulse 1.2s ease-in-out infinite; }
      .drip { animation: drip 0.7s linear infinite; }
      .rise { animation: rise 2.6s linear infinite; }
      .dash { animation: dash var(--d, 1.2s) linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 50% { opacity: 0.35; } }
      @keyframes drip { from { transform: translateY(0); opacity: 1; } to { transform: translateY(22px); opacity: 0; } }
      @keyframes rise { from { transform: translateY(0); opacity: 0.8; } to { transform: translateY(-230px); opacity: 0; } }
      @keyframes dash { to { stroke-dashoffset: -28; } }
      .still .spin, .still .pulse, .still .drip, .still .rise, .still .dash { animation: none; }
    `,
  ];
}
