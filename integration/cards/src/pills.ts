// The pills and chips, from their one source (the admin UI's pills.css; the cheatsheet is
// docs/design/pills-and-chips.html), for the cards: HA's theme colours under the token
// names it uses, set on the pills and chips themselves so nothing leaks into other cards.
// Kept out of ha.ts: the card tests run under plain Node, which can't import CSS.
import { unsafeCSS } from "lit";
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
