// The 3 x 3 grid to tap that chooses one of the nine places (anchors.ts), for a card's
// editor. Each editor that uses it defines it under a tag of its own: the cards' files are
// built and updated apart, and one must not be drawn by another's older copy.
import { LitElement, css, html } from "lit";
import { ANCHORS, type Anchor } from "./anchors.ts";
import { fire } from "./ha.ts";

/** `value` is the place chosen; `rows` is how many of the grid's rows can be chosen, from
 * the top (the Over layer scrolling with the view has the top row only). A tap says
 * `anchor-changed`, with {value}. */
export class AnchorGrid extends LitElement {
  static properties = { value: {}, label: {}, rows: { type: Number } };
  value: Anchor = "center";
  label = "";
  rows = 3;

  render() {
    return html`<div class="anchors" role="radiogroup" aria-label=${this.label}>
      ${ANCHORS.map((row, r) =>
        row.map(
          (a: Anchor) =>
            html`<button
              type="button"
              role="radio"
              aria-checked=${a === this.value}
              aria-label=${a}
              title=${a}
              class=${a === this.value ? "on" : ""}
              ?disabled=${r >= this.rows}
              @click=${() => fire(this, "anchor-changed", { value: a })}
            ></button>`,
        ),
      )}
    </div>`;
  }

  static styles = css`
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
  `;
}
