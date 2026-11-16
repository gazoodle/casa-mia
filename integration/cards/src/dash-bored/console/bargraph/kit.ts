// Bargraph's control kit, to the shape in ../kit.ts: the Console as the black hi-fi
// separates of the 1980s. Brushed black fronts with fine white legends, faders with an LED
// ladder beside each, soft-touch keys, fluorescent displays and membrane keys. ../panel.ts
// puts the controls on the panel and acts on what is pressed; styles.ts is their look and
// how they move.
import { html, nothing, type TemplateResult } from "lit";
import { face } from "../kit.ts";
import { needle } from "../needle.ts";
import { BARS, panel, plate } from "../silverface/kit.ts";

// A screen is the same part in every era, dressed by the era's stylesheet: here a small
// colour monitor in a black case.
export { tv } from "../bakelite/kit.ts";

/** Nothing here is filled from a gradient: the stylesheet draws it all. */
export const DEFS = html``;

/** A legend: fine white capitals printed on the black. */
export const label = (text: string) => html`<span class="label">${text}</span>`;

const TEN = Array.from({ length: 10 }, (_, i) => i);
const TWENTY = Array.from({ length: 20 }, (_, i) => i);

/** Figures on a fluorescent display, each of seven bars: the bars that are not lit can
 * just be seen. A space is a figure with none lit, and a display that is not `lit` has
 * them all dark. `says` is what a screen reader is told it shows. */
export const figs = (text: string, lit = true, says = text.trim()) => html`<span class="figs ${lit ? "" : "dark"}" role="img" aria-label=${says}>${[...text].map((ch) =>
  ch === "." ? html`<i class="dp"></i>` : ch === "°" ? html`<i class="deg"></i>` : ch === "%" ? html`<i class="pc">%</i>` : html`<i class="d">${[..."abcdefg"].map((bar) => html`<b class="s${bar} ${lit && BARS[ch]?.includes(bar) ? "lit" : ""}"></b>`)}</i>`,
)}</span>`;

/** A meter with a scale from `lo` to `hi`. Most are needle meters of the time: a black
 * face printed in white and lit warm from below, with a hair of an orange needle that
 * hardly wavers (../needle.ts). Every third of the rooms'
 * meters is a fluorescent display instead (owner, 2026-11-15: needles, with a display
 * now and then): large figures over a sweep of twenty segments, the last four red.
 * `beat` is which meter on the panel this is: the two at the top are 0 and 1. A meter
 * that is not `lit` is dark: its reading is not to be believed. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string, beat = 0, lit = true): TemplateResult {
  const part = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  if (beat >= 2 && beat % 3 === 1) {
    const places = unit === "kW" ? 2 : 1;
    const upto = Math.round(part * 20);
    return html`<div class="meter display ${lit ? "" : "unlit"}">
      <div class="win" role="img" aria-label="${title}: ${value} ${unit}">${figs(panel(lit ? String(value) : "", "", [lo, hi], places), lit, "")}<span class="unit">${unit}</span>
        <div class="sweep">${TWENTY.map((i) => html`<i class="${lit && i < upto ? "lit" : ""} ${lit && i === upto - 1 ? "tip" : ""}"></i>`)}</div></div>
      ${label(title)}
    </div>`;
  }

  return needle(title, lo, hi, value, unit, beat, lit, label(title));
}

/** A lamp for an alert: an LED. Its colour is its level's, set by its class in styles.ts. */
export const jewel = (sort: string) => html`<span class="jewel ${sort}" aria-hidden="true"></span>`;

/** A room's lights, as a bar of ten LEDs, green then amber then red: the more light, the
 * more are lit. `heat` is as Bakelite's valve takes it, 0 for dark and from about a third
 * to 1 for lit. */
export const valve = (heat: number) => {
  const lit = heat ? Math.max(1, Math.round(((heat - 0.35) / 0.65) * 10)) : 0;
  return html`<div class="leds" role="img" aria-label="Lights: ${lit} of 10">${TEN.map((i) => html`<span class=${i < lit ? "on" : ""}></span>`)}</div>`;
};

/** A soft-touch key with an LED in its corner, lit while its device is on. A device that
 * is not answering has its LED out and its legend struck through. `guard` is for a key
 * under a flap of smoked perspex, hinged at its top: "shut" over the key, or lifted "up".
 * Under a guard `on` is thrown, away from rest. The key is the switch itself (`throw`):
 * under a lifted flap, a press there is the one that throws it. Bargraph's keys are not
 * lettered at their ends, so `_ends` is not used. `says` is what a screen reader is told
 * of the key beside its name. */
export const dolly = (name: string, on: boolean, away: boolean, press: (e: Event) => void, guard: "" | "shut" | "up" = "", says = "", _ends = ["On", "Off"]) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""} ${guard}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name + says} @click=${press}>
  <span class="soft"><span class="throw"><i class="pilot"></i></span>${guard ? html`<i class="flap"></i>` : nothing}</span>
  ${label(name)}
</button>`;

/** A fader for a device's level, at `level` per cent of its travel, with a ladder of ten
 * LEDs beside it lit as far as it stands. Its arguments are as Bakelite's knob takes
 * them. The fader's element is as tall as its cap travels (`slide`): ../panel.ts moves
 * the level by how far a finger has gone up or down it. The heating keeps a knob: smooth
 * and black, in a ring of LEDs lit as far as it is turned. A setting that ends in a number
 * ("Thermostat 21°") is on a fluorescent display under the control, and the rest of it
 * is the legend. `_reads` is not drawn: the panel's note says what a thermostat reads. */
export const knob = (name: string, sort: string, what: string, level: number, held: boolean, said: string, note: string, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }, scale: number[] = [0, 100], _reads?: number) => {
  const { legend, shown, lit } = plate(name, sort, scale);
  const rungs = Math.round(level / 10);
  // A player's note has a place kept for it, so that a song starting moves nothing.
  const tape = note || sort === "sound";
  const turned = (kind: string, inside: TemplateResult) => html`<div class="${kind} ${sort} ${held ? "drag" : ""}" role="slider" tabindex="0" aria-orientation=${kind === "slide" ? "vertical" : nothing} aria-label="${name} ${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(level)} aria-valuetext=${said} style="--lvl: ${level.toFixed(1)}"
    @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}>${inside}</div>`;
  return html`<div class="dial ${sort}">
    <div class="dimmer">${sort === "heat"
      ? turned("knob", html`<span class="mark"></span>`)
      : html`<div class="ladder ${sort}" aria-hidden="true">${TEN.map((i) => html`<i class=${i < rungs ? "lit" : ""}></i>`)}</div>${turned("slide", html`<i class="cap"></i>`)}`}</div>
    ${label(legend)}${shown === undefined ? nothing : figs(shown, lit)}${tape ? html`<span class="note">${note ? label(note) : nothing}</span>` : nothing}
  </div>`;
};

/** An alarm's code: a fluorescent figure for each place, with a membrane key over it to
 * step it on and one under it to step it back. `places` is where each stands, and `turn`
 * steps one. The code is said to a screen reader a figure at a time, and nowhere else. */
export const wheels = (name: string, places: number[], turn: (i: number, by: number) => void) => html`<div class="wheels" role="group" aria-label="${name} code">${places.map(
  (place, i) => html`<div class="wheel">
    <button aria-label="Figure ${i + 1} on" @click=${() => turn(i, 1)}>+</button>
    ${figs(face(place) || " ", true, `Figure ${i + 1}: ${face(place) || "blank"}`)}
    <button aria-label="Figure ${i + 1} back" @click=${() => turn(i, -1)}>−</button>
  </div>`,
)}</div>`;

/** A membrane key, with its legend printed on it. */
export const push = (name: string, press: () => void) => html`<button class="push" @click=${press}><span class="key">${name}</span></button>`;

/** A tuner's preset key, for a scene: numbered by the stylesheet as they come, with a
 * bar over it that is lit for a moment after it is pressed. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}><i class="bar"></i><span class="key"></span>${label(name)}</button>`;
