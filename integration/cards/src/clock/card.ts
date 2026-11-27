// Casa Mia Clock: Home Assistant's own clock card, made to fill its place. HA makes the
// card (its card helpers) from this card's config, so every option of HA's clock works
// here, and its editor is HA's clock editor: a config from HA's clock works by changing
// its type. Whatever HA adds to its clock later arrives by itself.
//
// HA draws its clock at fixed sizes (clock_size). This card scales the whole of it into
// its place, as a camera picture is scaled: whole, centred, by one CSS transform. It is
// the owner's exception to fixed sizes (CLAUDE.md, 2026-11-27: "fill the space" clocks).
// Where the card has no height of its own (a masonry column), the place is as tall as the
// clock, so it is never made bigger than HA draws it, only smaller in a narrow column.
// The transform changes no layout, so measuring it again never loops.
import { LitElement, css, html, nothing } from "lit";
import type { CardConfig, Hass } from "../ha.ts";

type Inner = HTMLElement & { hass?: Hass; getGridOptions?(): object; getCardSize?(): number };

/** The time formats b23's own clock had, as HA names them. */
const B23_FORMATS: Record<string, string | undefined> = { "12": "am_pm", "24": "twenty_four", auto: undefined };

export class ClockCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _scale: { state: true }, _failed: { state: true } };
  hass?: Hass;
  _config?: CardConfig;
  _scale = 1;
  /** Why HA's clock couldn't be made, said on the card. */
  _failed = "";
  private inner?: Inner;
  private made = ""; // the config `inner` was made for
  private sizes = new ResizeObserver(() => this.fit());

  /** HA's own clock editor. */
  static async getConfigElement() {
    const helpers = await (window as any).loadCardHelpers();
    helpers.createCardElement({ type: "clock" }); // defines hui-clock-card, lazily
    await customElements.whenDefined("hui-clock-card");
    return (customElements.get("hui-clock-card") as any).getConfigElement();
  }
  static getStubConfig() {
    return {};
  }

  setConfig(config: CardConfig) {
    const format = config.time_format;
    this._config = format in B23_FORMATS ? { ...config, time_format: B23_FORMATS[format] } : config;
  }
  getCardSize() {
    return this.inner?.getCardSize?.() ?? 2;
  }
  /** As HA's clock has them for its size and style. */
  getGridOptions() {
    return this.inner?.getGridOptions?.() ?? { columns: 6, rows: 2 };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.sizes.disconnect();
  }

  /** HA's clock for the config: made once for each config, given the states each draw.
   * The background is this card's own, so HA's is off. */
  private clock(): Inner | undefined {
    const config = { ...this._config!, type: "clock", no_background: true };
    const key = JSON.stringify(config);
    if (key !== this.made) {
      this.made = key;
      this.inner = undefined;
      // In the chain, so helpers that aren't there yet are said on the card, not thrown
      // out of render.
      Promise.resolve()
        .then(() => (window as any).loadCardHelpers())
        .then((helpers: any) => {
          if (key !== this.made) return; // the config changed meanwhile
          this.inner = helpers.createCardElement(config);
          this._failed = "";
          this.requestUpdate();
        })
        .catch((err: unknown) => {
          this._failed = String((err as Error)?.message ?? err);
          console.error(`CASA-MIA CARDS: Casa Mia Clock couldn't make Home Assistant's clock: ${this._failed}`);
        });
    }
    if (this.inner) this.inner.hass = this.hass;
    return this.inner;
  }

  /** The scale that fits the clock, whole, into its place. */
  private fit() {
    const place = this.renderRoot.querySelector<HTMLElement>(".fit");
    const clock = this.renderRoot.querySelector<HTMLElement>(".clock");
    if (!place || !clock?.offsetWidth || !clock.offsetHeight) return;
    const scale = Math.min(place.clientWidth / clock.offsetWidth, place.clientHeight / clock.offsetHeight);
    if (Math.abs(scale - this._scale) > 0.005) this._scale = scale;
  }

  updated() {
    for (const el of this.renderRoot.querySelectorAll(".fit, .clock")) this.sizes.observe(el);
  }

  render() {
    if (!this._config) return nothing;
    if (this._failed) return html`<ha-card><p class="failed">Home Assistant's clock couldn't be made: ${this._failed}</p></ha-card>`;
    return html`<ha-card class=${this._config.no_background ? "bare" : ""}>
      <div class="fit"><div class="clock" style="transform:scale(${this._scale})">${this.clock() ?? nothing}</div></div>
    </ha-card>`;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    ha-card {
      box-sizing: border-box;
      height: 100%;
      overflow: hidden;
    }
    ha-card.bare {
      background: none;
      border: none;
      box-shadow: none;
    }
    .fit {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* As big as HA draws it: the size the scale is worked out from. */
    .clock {
      flex: none;
      width: max-content;
      height: max-content;
    }
    .failed {
      margin: 8px;
      color: var(--error-color);
    }
  `;
}
