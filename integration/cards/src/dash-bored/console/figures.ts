// Figures of seven bars, for the eras whose displays are made of them: Silverface's red
// LEDs (drawn by its own kit), Bargraph's fluorescent displays and Beige's LCDs. What a
// display shows, in cells that never change in number; the figures themselves; a meter
// that is a display; and an alarm's code as figures with a key over and under each. An
// era's stylesheet takes FIGURES for their shape and gives them their colours.
import { css, html, type TemplateResult } from "lit";
import { face } from "./kit.ts";

// Which of a seven-segment digit's bars are lit, a to g: top, the two right, bottom, the
// two left, middle.
export const BARS: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g" };

/** What a display shows for a setting, in cells that never change in number: as many
 * figures as the top of the device's `scale` needs, a place for a minus if the scale
 * goes below nothing, and for degrees a decimal place, whether or not this value uses
 * them. A value of "" is a dark display. `places` is for a display that is not a setting,
 * and has decimal places of its own. */
export function panel(value: string, unit: string, scale: number[], places = unit === "°" ? 1 : 0): string {
  const figures = Math.max(...scale.map((n) => String(Math.trunc(Math.abs(n))).length)) + (scale[0] < 0 ? 1 : 0);
  const wide = figures + (places ? 1 + places : 0);
  const dark = " ".repeat(figures) + (places ? "." + " ".repeat(places) : "");
  return (value === "" ? dark : Number(value).toFixed(places).padStart(wide, " ")) + unit;
}

/** A knob's plate, taken apart. A setting that ends in a number ("Thermostat 21°") is
 * `shown` on a display, in `panel`'s cells, and the rest of it is the `legend`. The
 * heating's display is there when it is off too, dark (not `lit`). */
export function plate(name: string, sort: string, scale: number[]): { legend: string; shown?: string; lit: boolean } {
  const set = /^(.*?) (-?[\d.]+)([°%])$/.exec(name);
  const off = sort === "heat" ? /^(.*): off$/.exec(name) : null;
  return { legend: set?.[1] ?? off?.[1] ?? name, shown: set ? panel(set[2], set[3], scale) : off ? panel("", "°", scale) : undefined, lit: !!set };
}

/** Figures on a display, each of seven bars: the bars that are not lit can just be
 * seen. A space is a figure with none lit, and a display that is not `lit` has
 * them all dark. `says` is what a screen reader is told it shows. */
export const figs = (text: string, lit = true, says = text.trim()) => html`<span class="figs ${lit ? "" : "dark"}" role="img" aria-label=${says}>${[...text].map((ch) =>
  ch === "." ? html`<i class="dp"></i>` : ch === "°" ? html`<i class="deg"></i>` : ch === "%" ? html`<i class="pc">%</i>` : html`<i class="d">${[..."abcdefg"].map((bar) => html`<b class="s${bar} ${lit && BARS[ch]?.includes(bar) ? "lit" : ""}"></b>`)}</i>`,
)}</span>`;

const TWENTY = Array.from({ length: 20 }, (_, i) => i);

/** A meter that is a display, with a scale from `lo` to `hi`: large figures over a sweep
 * of twenty segments, lit as far along as the reading is, over its `plate` (the era's
 * legend for its title). The last lit segment is its `tip`. One that is not `lit` is
 * dark: its reading is not to be believed. */
export function display(title: string, lo: number, hi: number, value: number, unit: string, lit: boolean, plate: TemplateResult): TemplateResult {
  const upto = Math.round(Math.min(1, Math.max(0, (value - lo) / (hi - lo))) * 20);
  return html`<div class="meter display ${lit ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${title}: ${value} ${unit}">${figs(panel(lit ? String(value) : "", "", [lo, hi], unit === "kW" ? 2 : 1), lit, "")}<span class="unit">${unit}</span>
      <div class="sweep">${TWENTY.map((i) => html`<i class="${lit && i < upto ? "lit" : ""} ${lit && i === upto - 1 ? "tip" : ""}"></i>`)}</div></div>
    ${plate}
  </div>`;
}

/** An alarm's code: a figure for each place, with a key over it to step it on and one
 * under it to step it back. `places` is where each stands, and `turn` steps one. What is
 * on the keys is the era's stylesheet's. The code is said to a screen reader a figure at
 * a time, and nowhere else. */
export const keyed = (name: string, places: number[], turn: (i: number, by: number) => void) => html`<div class="wheels" role="group" aria-label="${name} code">${places.map(
  (place, i) => html`<div class="wheel">
    <button aria-label="Figure ${i + 1} on" @click=${() => turn(i, 1)}></button>
    ${figs(face(place) || " ", true, `Figure ${i + 1}: ${face(place) || "blank"}`)}
    <button aria-label="Figure ${i + 1} back" @click=${() => turn(i, -1)}></button>
  </div>`,
)}</div>`;

/** The figures' shape. --t is a bar's thickness, --h an upright's length and --w a
 * figure's width, each a whole number of pixels so that no two bars of a kind differ.
 * The era gives --seg-on (a lit bar), --seg-off (one that is not) and, if a lit bar
 * glows, --seg-glow. A meter's figures are larger, and the segments of its sweep rise
 * along it, each a whole number of pixels tall. */
export const FIGURES = css`
  .figs { --t: 2px; --h: 6px; --w: 10px; display: inline-flex; align-items: flex-end; }
  .display .figs { --t: 3px; --h: 11px; --w: 17px; }
  .d { position: relative; width: var(--w); height: calc(2 * var(--h) + 3 * var(--t)); margin: 0 2px; transform: skewX(-5deg); }
  .d b { position: absolute; border-radius: 1px; background: var(--seg-off); } .d .lit { background: var(--seg-on); box-shadow: var(--seg-glow, none); }
  .sa, .sg, .sd { left: var(--t); right: var(--t); height: var(--t); } .sa { top: 0; } .sg { top: calc(var(--t) + var(--h)); } .sd { bottom: 0; }
  .sf, .sb, .se, .sc { width: var(--t); height: var(--h); } .sf, .sb { top: var(--t); } .se, .sc { bottom: var(--t); } .sf, .se { left: 0; } .sb, .sc { right: 0; }
  .dp { width: var(--t); height: var(--t); margin: 0 1px; border-radius: 50%; background: var(--seg-on); }
  .deg { align-self: flex-start; width: calc(var(--t) * 3); height: calc(var(--t) * 3); margin-left: 1px; border: var(--t) solid var(--seg-on); border-radius: 50%; }
  .pc { margin-left: 2px; color: var(--seg-on); font: 600 9px/1 "Helvetica Neue", Arial, sans-serif; }
  .dark .dp, .dark .deg, .dark .pc { opacity: .1; }
  .sweep { display: flex; align-items: flex-end; justify-content: center; gap: 2px; width: 100%; }
  .sweep i { width: 4px; background: var(--seg-on); opacity: .1; } .sweep .lit { opacity: 1; }
  .sweep i:nth-child(-n + 5) { height: 5px; } .sweep i:nth-child(n + 6) { height: 8px; } .sweep i:nth-child(n + 11) { height: 11px; } .sweep i:nth-child(n + 16) { height: 14px; }
`;
