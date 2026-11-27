// Casa Mia Clock: the time, filling whatever space it is given, digital or analogue. Its
// face is sized as a picture is, to its place (owner, 2026-11-27: a clock face is the
// exception to fixed sizes, CLAUDE.md): the digital time by CSS container units, the
// analogue face as an SVG scaled whole into its box. No code measures anything.
//
// Its height: all of its place where it is given one (a sections grid's rows, a Tablet
// Layout's panel, a Camera Commander's last place); elsewhere (a masonry column) its own
// shape, 5:2 or square. Both by CSS: a percentage height that resolves wins, and one that
// doesn't falls back to the aspect ratio.
import { LitElement, css, html, nothing, svg } from "lit";
import type { Hass } from "../ha.ts";
import { type Config, DEFAULTS, emsWide, timeIn, twelveHour, zoneOf } from "./common.ts";

export class ClockCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _now: { state: true } };
  hass?: Hass;
  _config?: Config;
  _now = new Date();
  private timer = 0;

  static getConfigElement() {
    return document.createElement("casa-mia-clock-editor");
  }
  static getStubConfig() {
    return {};
  }
  setConfig(config: Config) {
    this._config = config;
  }
  getCardSize() {
    return 2;
  }
  getGridOptions() {
    return { columns: 6, rows: 2, min_rows: 1 };
  }

  private get o() {
    return { ...DEFAULTS, ...this._config } as Required<Config>;
  }

  // The time is due again at the next second (or minute): time-based work, not a poll.
  // Started and stopped with the card's place on the page.
  connectedCallback() {
    super.connectedCallback();
    this.tick();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.timer);
  }
  private tick = () => {
    this._now = new Date();
    const step = this.o.show_seconds ? 1000 : 60_000;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(this.tick, step - (Date.now() % step) + 20);
  };

  render() {
    if (!this._config) return nothing;
    const o = this.o;
    const language = this.hass?.locale?.language ?? navigator.language;
    const time = timeIn(this._now, zoneOf(o, this.hass), twelveHour(o.time_format, language), o.show_seconds, language);
    const analog = o.clock_style === "analog";

    return html`<ha-card class="${o.no_background ? "bare" : ""} ${analog ? "square" : ""}">
      ${analog
        ? this.face(time.hour, time.minute, time.second, o.show_seconds)
        : html`<div class="digital" style="--ems:${emsWide(time)}">
            <span>${time.text}</span>${time.period ? html`<small>${time.period}</small>` : nothing}
          </div>`}
    </ha-card>`;
  }

  /** The analogue face: twelve marks, the hands, and a second hand if asked for. */
  private face(hour: number, minute: number, second: number, seconds: boolean) {
    const hand = (cls: string, length: number, turn: number) =>
      svg`<line class=${cls} x1="50" y1="50" x2="50" y2=${50 - length} transform="rotate(${turn} 50 50)" />`;
    return html`<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label=${`${hour}:${String(minute).padStart(2, "0")}`}>
      <circle class="rim" cx="50" cy="50" r="47" />
      ${Array.from({ length: 12 }, (_, i) => svg`<line class=${i % 3 ? "tick" : "tick major"} x1="50" y1="7" x2="50" y2=${i % 3 ? 12 : 15} transform="rotate(${i * 30} 50 50)" />`)}
      ${hand("hour", 24, (hour % 12) * 30 + minute / 2)}
      ${hand("minute", 36, minute * 6 + second / 10)}
      ${seconds ? hand("second", 40, second * 6) : nothing}
      <circle class="pin" cx="50" cy="50" r="2.5" />
    </svg>`;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    /* Width set: with only a height, aspect-ratio would make the width from it. */
    ha-card {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      aspect-ratio: 5 / 2;
      container-type: size;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    ha-card.square {
      aspect-ratio: 1;
    }
    ha-card.bare {
      background: none;
      border: none;
      box-shadow: none;
    }
    /* As wide as the card allows, short of its height: 90% of its width over the time's
       width in ems, at most 70% of its height. */
    .digital {
      display: flex;
      align-items: baseline;
      gap: 0.1em;
      font-size: min(calc(90cqw / var(--ems)), 70cqh);
      font-variant-numeric: tabular-nums;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
      color: var(--primary-text-color);
    }
    .digital small {
      font-size: 0.4em;
    }
    svg {
      width: 92%;
      height: 92%;
    }
    .rim {
      fill: none;
      stroke: var(--divider-color, #8884);
      stroke-width: 1.5;
    }
    .tick {
      stroke: var(--secondary-text-color);
      stroke-width: 1;
      stroke-linecap: round;
    }
    .tick.major {
      stroke: var(--primary-text-color);
      stroke-width: 2;
    }
    .hour,
    .minute {
      stroke: var(--primary-text-color);
      stroke-linecap: round;
    }
    .hour {
      stroke-width: 4;
    }
    .minute {
      stroke-width: 2.5;
    }
    .second {
      stroke: var(--accent-color, #ff9800);
      stroke-width: 1;
    }
    .pin {
      fill: var(--primary-text-color);
    }
  `;
}
