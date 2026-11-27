// An editor for a list of Lovelace cards in a card's option: the cards as chips in their
// order (one chosen at a time, moved earlier or later, removed), Home Assistant's own card
// picker to add one, and for the chosen card HA's own card editor and Visibility editor,
// as in HA's edit-card dialog. Fires value-changed with the whole list.
// First used for the Camera Commander's last place (commander/place.ts).
import { LitElement, css, html, nothing } from "lit";
import { type CardConfig, fire, type Hass, haCardEditors } from "./ha.ts";
import { PILLS } from "./pills.ts";
import { moved, nameOf } from "./cards-list.ts";

type Tab = "card" | "visibility";

export class CardsEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    lovelace: { attribute: false },
    cards: { attribute: false },
    _chosen: { state: true },
    _adding: { state: true },
    _tab: { state: true },
    _failed: { state: true },
    _ready: { state: true },
  };
  hass?: Hass;
  lovelace?: unknown;
  cards: CardConfig[] = [];
  /** The card being edited, by its place in the list. */
  _chosen = 0;
  /** HA's card picker is open, to add one. */
  _adding = false;
  _tab: Tab = "card";
  /** Why HA's card editors couldn't be loaded (ha.ts: haCardEditors). */
  _failed = "";
  /** HA's editors are defined. Drawn before, HA's card editor loses its config: it takes
   * `value` by a setter of its own, which a value set before the upgrade hides. */
  _ready = false;
  private asked = false;

  willUpdate() {
    if (this.hass && !this.asked) {
      this.asked = true;
      haCardEditors(this.hass).then(
        () => (this._ready = true),
        (err) => (this._failed = String(err?.message ?? err)),
      );
    }
    if (!this.cards.length) this._adding = true; // nothing yet: straight to the picker
    this._chosen = Math.min(this._chosen, Math.max(0, this.cards.length - 1));
  }

  private save(cards: CardConfig[], chosen = this._chosen) {
    this._chosen = chosen;
    fire(this, "value-changed", { value: cards });
  }

  render() {
    if (this._failed) return html`<p class="cm-pill cm-filled cm-bad">${this._failed}</p>`;
    if (!this._ready) return html`<p class="note">Loading Home Assistant's card editors…</p>`;
    const cards = this.cards;
    const card = cards[this._chosen];
    const chip = (on: boolean, label: string, click: () => void, disabled = false) =>
      html`<button type="button" class="cm-chip ${on ? "cm-on" : ""}" ?disabled=${disabled} @click=${click}>${label}</button>`;

    return html`
      <div class="chips">
        ${cards.map((c, i) =>
          chip(!this._adding && i === this._chosen, `${i + 1}. ${nameOf(c)}`, () => {
            this._adding = false;
            this._chosen = i;
          }),
        )}
        ${cards.length ? chip(this._adding, "+ Add card", () => (this._adding = !this._adding)) : nothing}
      </div>
      ${this._adding
        ? html`<hui-card-picker
            .hass=${this.hass}
            .lovelace=${this.lovelace}
            @config-changed=${(ev: CustomEvent) => {
              ev.stopPropagation();
              this._adding = false;
              this._tab = "card";
              this.save([...cards, ev.detail.config], cards.length);
            }}
          ></hui-card-picker>`
        : card
          ? html`<div class="chips">
                ${chip(false, "‹ Earlier", () => this.save(moved(cards, this._chosen, -1), this._chosen - 1), this._chosen === 0)}
                ${chip(false, "Later ›", () => this.save(moved(cards, this._chosen, 1), this._chosen + 1), this._chosen === cards.length - 1)}
                ${chip(false, "✕ Remove", () => this.save(cards.filter((_, i) => i !== this._chosen), Math.max(0, this._chosen - 1)))}
                <span class="gap"></span>
                ${chip(this._tab === "card", "Card", () => (this._tab = "card"))}
                ${chip(this._tab === "visibility", "Visibility", () => (this._tab = "visibility"))}
              </div>
              ${this._tab === "card"
                ? html`<hui-card-element-editor
                    .hass=${this.hass}
                    .lovelace=${this.lovelace}
                    .value=${card}
                    @config-changed=${(ev: CustomEvent) => {
                      ev.stopPropagation();
                      this.save(cards.map((c, i) => (i === this._chosen ? ev.detail.config : c)));
                    }}
                  ></hui-card-element-editor>`
                : html`<hui-card-visibility-editor
                    .hass=${this.hass}
                    .config=${card}
                    @value-changed=${(ev: CustomEvent) => {
                      ev.stopPropagation();
                      this.save(cards.map((c, i) => (i === this._chosen ? ev.detail.value : c)));
                    }}
                  ></hui-card-visibility-editor>`}`
          : nothing}
    `;
  }

  static styles = [
    PILLS,
    css`
      :host {
        display: block;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
      }
      .gap {
        flex: 1;
      }
      .note {
        color: var(--secondary-text-color);
      }
    `,
  ];
}
