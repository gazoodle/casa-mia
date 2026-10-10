// The Tablet Layout's styles: the view's own (LOCK) and its sections' grids (FILL).
import { css, unsafeCSS } from "lit";
import { HOVER } from "../ha.ts";

export const LOCK = css`
  :host {
    flex: 1 1 0 !important;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  .wrapper {
    max-width: none;
    min-height: 0;
    height: 100%;
    box-sizing: border-box;
    padding: 0;
  }
  /* HA's extra space above (top_margin), a margin on the wrapper: out of its height. */
  :host(:not([editing])) .wrapper.top-margin {
    height: calc(100% - var(--top-margin));
  }
  .container {
    display: block;
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    padding: 0;
  }
  .content {
    display: grid;
    position: absolute;
    inset: 0;
    gap: 0;
    align-items: stretch; /* HA's: start, so a section was only as tall as its cards */
    justify-content: stretch;
  }
  .section {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box; /* its padding inside its room */
  }
  /* Edit mode: the panels grow to what they hold and the view scrolls, editors and all. */
  :host([editing]) {
    overflow: auto;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
    padding: 0 calc(var(--column-gap) / 2); /* HA's spacing back, for its editors */
  }
  :host([editing]) .container {
    flex: none;
    padding: calc(var(--row-gap) / 2) 0;
  }
  :host([editing]) .content {
    position: relative;
  }
  /* half each side of the engine's own gap track, so HA's spacing between two panels (a
   * margin, not the grid's gap: that would come between every track, and layers and stacks
   * make many) */
  :host([editing]) .section {
    overflow: visible;
    margin: calc(var(--row-gap) / 2) calc(var(--column-gap) / 2);
    /* Never too small to edit, whatever its share (its rows and columns grow to it, and the
     * view scrolls): as tall as what it holds, as wide as its least (cmTools: its chip and
     * HA's frame). Its cards' own widths count for nothing (contained), only that. */
    min-height: min-content;
    contain: inline-size;
  }
  /* A panel's section is its cell's height, so a card can fill it (FILL). */
  :host(:not([editing])) .section-container,
  :host(:not([editing])) hui-section,
  :host(:not([editing])) hui-grid-section {
    display: block;
    height: 100%;
  }
  :host(:not([editing])) hui-grid-section {
    display: flex;
  }
  /* The footer under the panels, not over them (HA's sticks it a row gap above the bottom),
   * in edit mode too; or, as HA's, floating over them (layout footer: float). */
  :host(:not([cm-footer-float])) hui-view-footer {
    position: static;
  }
  :host([cm-footer-float]:not([editing])) hui-view-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
  }
  /* Edit mode: the Tablet Layout button over the panels, and each panel's name. */
  .cm-bar {
    display: flex;
    justify-content: flex-start;
    padding: 12px 0 0 20px;
  }
  .cm-bar label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  .cm-bar input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }
  :host([editing]) .section {
    position: relative;
  }
  .cm-tools {
    position: absolute;
    top: 6px;
    left: 10px;
    z-index: 2;
    display: flex;
    gap: 4px;
    max-width: calc(100% - 20px);
  }
  .cm-ends {
    position: absolute;
    inset: 0;
    z-index: 6; /* over HA's sticky footer (4) */
    pointer-events: none;
  }
  .cm-ends button {
    position: absolute;
    pointer-events: auto;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-ends button.cm-line {
    transform: translate(-50%, -50%);
    font-size: 10px;
    padding: 1px 6px;
  }
  .cm-ends button.cm-lock {
    transform: translate(-50%, -50%);
    width: 26px;
    height: 26px;
    padding: 4px;
    border-radius: 50%;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    background: var(--card-background-color, #fff);
  }
  .cm-ends button.cm-lock.on {
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
  }
  .cm-ends button.cm-lock svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .cm-tools button,
  .cm-ends button {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    padding: 3px 10px;
    border: none;
    border-radius: 12px;
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-tools .cm-chip {
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-tools button:not(.cm-chip) {
    padding: 3px 8px;
  }
  .cm-tools button[disabled] {
    opacity: 0.4;
    cursor: default;
  }
  /* Every tap target in edit mode answers the pointer alike (ha.ts HOVER). */
  .cm-tools button,
  .cm-ends button,
  .cm-dims button {
    transition: box-shadow 0.15s, filter 0.15s;
  }
  .cm-tools button:not([disabled]):hover,
  .cm-tools button:focus-visible,
  .cm-ends button:hover,
  .cm-ends button:focus-visible,
  .cm-dims button:hover,
  .cm-dims button:focus-visible {
    ${unsafeCSS(HOVER)}
  }
  .cm-tools.cm-narrow button:not(.cm-chip) {
    display: none;
  }
  /* A hidden edge, shown in edit mode to be shown again: dimmed and hatched. */
  .section.cm-hidden > :not(.cm-tools) {
    opacity: 0.45;
  }
  .section.cm-hidden::after,
  .section.cm-garnish-only::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: var(--ha-section-border-radius, 12px);
    background: repeating-linear-gradient(-45deg, transparent 0 8px, color-mix(in srgb, var(--primary-text-color) 18%, transparent) 8px 10px);
  }
  .cm-lines {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  .cm-lines svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims {
    position: absolute;
    inset: 0;
    z-index: 5; /* over HA's sticky footer (4) */
    pointer-events: none;
    color: var(--primary-color);
  }
  .cm-dims svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims line {
    stroke: currentColor;
    stroke-width: 1;
  }
  .cm-dims button {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    font: 11px/14px var(--ha-font-family-code, monospace);
    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 8px;
    color: inherit;
    background: var(--card-background-color, #fff);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-dims button.cm-size {
    transform: translate(-100%, -100%);
    border-color: transparent;
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--card-background-color, #fff) 80%, transparent);
  }
  /* Edit mode: each panel's room outlined, in its chip's colour (the identify outline, for
   * debugging, over it when on). */
  :host([editing]) .section,
  :host([editing]) hui-view-header,
  :host([editing]) hui-view-footer {
    outline: 1px solid var(--primary-color);
    outline-offset: -1px;
  }
  :host([cm-identify]) .section,
  :host([cm-identify]) hui-view-header,
  :host([cm-identify]) hui-view-footer {
    outline: var(--cm-outline, 1px solid red);
    outline-offset: -1px;
  }
  .section.cm-off,
  .create-section-container {
    display: none;
  }
  .cm-debug {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    padding: 2px 6px;
    font: 12px monospace;
    color: #000;
    background: rgb(255 214 10 / 0.7); /* see-through enough for what is under it */
    pointer-events: none;
    white-space: pre-wrap;
    max-width: calc(100% - 16px);
  }
`;

/** Into each section's grid (HA's hui-grid-section, its own shadow root): its Add card
 * button never narrower than tall (edit mode); with one card that
 * counts showing (cm-fill on the grid and that card), the cards in a column, the others
 * (headings) their own height and that card all the rest. */
export const FILL = new CSSStyleSheet();
FILL.replaceSync(`
  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */
  :host([cm-fill]) ha-sortable { display: contents; }
  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }
  :host([cm-fill]) .card { flex: none; }
  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }
  [cm-fill], [cm-fill] > * { display: block; height: 100%; }
`);
