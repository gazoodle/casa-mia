// The Over layer's editor: its options (ha-form), then its one card, picked and edited with
// Home Assistant's own card picker and card editor, as its conditional card's editor does.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass, haForm, withoutDefaults } from "../ha.ts";
import { ANCHORS, type Anchor, type Config, DEFAULTS, anchorFor } from "./common.ts";

const SCHEMA = [
  { name: "panel", selector: { boolean: {} } },
  {
    name: "mode",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "float", label: "Float: the card where you place it (below), the middle by default" },
          { value: "full", label: "Full screen: the card fills what it covers" },
          { value: "scroll", label: "Scroll with the view: the card at the top, moving with the page" },
        ],
      },
    },
  },
  {
    name: "cover",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "view", label: "The view (the sidebar and header stay usable)" },
          { value: "window", label: "The whole window (sidebar and header too)" },
        ],
      },
    },
  },
  { name: "block", selector: { boolean: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "backdrop_color", selector: { color_rgb: {} } },
      { name: "backdrop_opacity", selector: { number: { min: 0, max: 100, step: 5, unit_of_measurement: "%" } } },
      { name: "backdrop_blur", selector: { number: { min: 0, max: 20, step: 1, unit_of_measurement: "px" } } },
      { name: "width", selector: { number: { min: 200, max: 1600, step: 10, mode: "box", unit_of_measurement: "px" } } },
    ],
  },
];

// The offsets, beside the anchor grid: in from the edges the card is anchored to.
const OFFSETS = [
  {
    type: "grid",
    name: "",
    schema: [
      { name: "offset_x", selector: { number: { min: 0, max: 400, step: 1, mode: "box", unit_of_measurement: "px" } } },
      { name: "offset_y", selector: { number: { min: 0, max: 400, step: 1, mode: "box", unit_of_measurement: "px" } } },
    ],
  },
];

const LABELS: Record<string, string> = {
  panel: "Show its whole panel",
  offset_x: "In from the side",
  offset_y: "In from the top or bottom",
  mode: "How it shows",
  cover: "What it covers",
  block: "Block taps on what's beneath",
  backdrop_color: "Backdrop colour",
  backdrop_opacity: "Backdrop opacity",
  backdrop_blur: "Backdrop blur",
  width: "Card width (float, scroll)",
};
const HELP: Record<string, string> = {
  panel: "In place of a card of its own, the layer shows every card in the panel it's in (but Over layers). That panel never shows in its own place out of edit mode; edit its cards there, as usual.",
  block: "On: what's beneath can be seen but not touched; only the card works. Off: taps reach the dashboard round the card.",
};

/** HA's card picker and card editor, loaded: its conditional card's editor brings both. */
async function haCardEditors(): Promise<void> {
  if (customElements.get("hui-card-element-editor") && customElements.get("hui-card-picker")) return;
  const helpers = await (window as any).loadCardHelpers();
  const card = await helpers.createCardElement({ type: "conditional", conditions: [], card: { type: "button" } });
  await (card.constructor as any).getConfigElement?.();
  await customElements.whenDefined("hui-card-element-editor");
}

export class OverLayerEditor extends LitElement {
  static properties = { hass: { attribute: false }, lovelace: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  lovelace?: unknown;
  _config?: Config;
  _ready = false;

  setConfig(config: Config) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    Promise.all([haForm(), haCardEditors()]).then(() => (this._ready = true));
  }

  private _save(config: Config) {
    this._config = config;
    fire(this, "config-changed", { config: withoutDefaults(config, DEFAULTS) });
  }

  render() {
    if (!this.hass || !this._config || !this._ready) return nothing;
    const card = this._config.card;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ ...DEFAULTS, ...this._config }}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
        .computeHelper=${(s: { name: string }) => HELP[s.name]}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._save({ ...this._config!, ...ev.detail.value });
        }}
      ></ha-form>
      ${this._where()}
      <p class="note">
        It shows over the dashboard while its <strong>Visibility</strong> conditions hold (the Visibility tab): the alarm set, a
        user, the time of day. While the dashboard is edited it sits here as an ordinary card. The way out is for admins
        only: covering the whole window and blocking, it leaves a door over Home Assistant's edit button (hover over it, or
        tap it, then tap the button); and <code>?edit=1</code> at the end of the dashboard's address opens edit mode,
        where this card steps aside. Everyone else gets the wall.
      </p>
      ${this._config.panel ? nothing : this._card(card)}
    `;
  }

  /** Its own card: HA's card picker, then HA's card editor. */
  private _card(card: Config["card"]) {
    return html`<h3>Its card</h3>
      ${card?.type
        ? html`<div class="actions">
              <button type="button" @click=${() => this._save({ ...this._config!, card: undefined })}>Change the card</button>
            </div>
            <hui-card-element-editor
              .hass=${this.hass}
              .lovelace=${this.lovelace}
              .value=${card}
              @config-changed=${(ev: CustomEvent) => {
                ev.stopPropagation();
                this._save({ ...this._config!, card: ev.detail.config });
              }}
            ></hui-card-element-editor>`
        : html`<hui-card-picker
            .hass=${this.hass}
            .lovelace=${this.lovelace}
            @config-changed=${(ev: CustomEvent) => {
              ev.stopPropagation();
              this._save({ ...this._config!, card: ev.detail.config });
            }}
          ></hui-card-picker>`}`;
  }

  /** Where it sits: a 3 x 3 grid to tap (float: all nine; scroll: the top row), and the
   * offsets. Full screen fills what's covered, so none. */
  private _where() {
    const o = { ...DEFAULTS, ...this._config! };
    if (o.mode === "full") return nothing;
    const now = anchorFor(o.mode, o.anchor);
    return html`<h3>Where it sits</h3>
      <div class="where">
        <div class="anchors" role="radiogroup" aria-label="Where it sits">
          ${ANCHORS.map((row, r) =>
            row.map(
              (a: Anchor) =>
                html`<button
                  type="button"
                  role="radio"
                  aria-checked=${a === now}
                  aria-label=${a}
                  title=${a}
                  class=${a === now ? "on" : ""}
                  ?disabled=${o.mode === "scroll" && r > 0}
                  @click=${() => this._save({ ...this._config!, anchor: a })}
                ></button>`,
            ),
          )}
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${o}
          .schema=${OFFSETS}
          .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
          @value-changed=${(ev: CustomEvent) => {
            ev.stopPropagation();
            this._save({ ...this._config!, ...ev.detail.value });
          }}
        ></ha-form>
      </div>`;
  }

  static styles = css`
    .where {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .where ha-form {
      flex: 1;
    }
    .anchors {
      display: grid;
      grid-template-columns: repeat(3, 22px);
      gap: 4px;
      padding: 6px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .anchors button {
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      background: none;
      cursor: pointer;
    }
    .anchors button.on {
      background: var(--primary-color);
    }
    .anchors button:disabled {
      opacity: 0.25;
      cursor: default;
    }
    .note {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 15px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .actions button {
      font: inherit;
      padding: 4px 10px;
      border: 1px solid var(--primary-color);
      border-radius: 12px;
      color: var(--primary-color);
      background: none;
      cursor: pointer;
    }
  `;
}
