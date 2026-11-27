// The pills and chips, from their one source (the admin UI's pills.css; the cheatsheet is
// docs/design/pills-and-chips.html), for the cards: HA's theme colours under the token
// names it uses, set on the pills and chips themselves so nothing leaks into other cards.
// Kept out of ha.ts: the card tests run under plain Node, which can't import CSS.
import { html, nothing, unsafeCSS } from "lit";
import SHARED from "../../../app/web/src/pills.css?inline";

const TOKENS = `.cm-pill, .cm-chip {
  --surface: var(--card-background-color, #fff);
  --muted: var(--secondary-text-color, #727272);
  --accent: var(--primary-color, #03a9f4);
  --on-accent: var(--text-primary-color, #fff);
  --good: var(--success-color, #43a047);
  --warn: var(--warning-color, #ffa600);
  --bad: var(--error-color, #db4437);
  --bark: #d8885a;
  --mono: var(--ha-font-family-code, monospace);
}
`;

/** As text, for a CSSStyleSheet adopted into HA's own shadow roots (garnish). */
export const PILLS_TEXT = TOKENS + SHARED;
/** For a Lit element's styles. */
export const PILLS = unsafeCSS(PILLS_TEXT);

/** How many of the bars a tier fills (commander/common.ts: channelTier). */
const FILLED: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

/** A camera channel's resolution (pills.css: .cm-bars): three bars 4 px wide, 2 px apart,
 * 6, 11 and 16 px tall, as many filled as its tier and the rest a 1 px outline (the inner
 * box cut out, so no stroke falls between pixels). Nothing for a channel without a tier. */
export function tierBars(tier: string) {
  const filled = FILLED[tier];
  if (!filled) return nothing;
  const d = [10, 5, 0].map((y, i) => `M${i * 6} ${y}h4v${16 - y}h-4z${i < filled ? "" : `M${i * 6 + 1} ${y + 1}h2v${14 - y}h-2z`}`).join("");
  return html`<svg class="cm-bars" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d=${d}></path></svg>`;
}
