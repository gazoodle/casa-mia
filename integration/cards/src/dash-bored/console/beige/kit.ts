// Beige's control kit, to the shape in ../kit.ts: the Console as the moulded plastic of
// the 1990s. Grey print on beige, LCDs, jog dials, rocker switches, function keys and
// rubber buttons. ../panel.ts puts the controls on the panel and acts on what is pressed;
// styles.ts is their look and how they move.
import { html, nothing, type TemplateResult } from "lit";
import { display, figs, panel, plate } from "../figures.ts";

// A screen is the same part in every era, dressed by the era's stylesheet: here a beige
// monitor. An alarm's code is figures with a key over and under each, as Bargraph's is:
// here on an LCD, with rubber keys. A room's lights are five marks, as Silverface's are:
// here strength bars on an LCD, as a mobile telephone shows its signal.
export { tv } from "../bakelite/kit.ts";
export { keyed as wheels } from "../figures.ts";
export { valve } from "../silverface/kit.ts";

/** Nothing here is filled from a gradient: the stylesheet draws it all. */
export const DEFS = html``;

/** A legend: grey print on the plastic. */
export const label = (text: string) => html`<span class="label">${text}</span>`;

/** A meter with a scale from `lo` to `hi`: an LCD, with black figures on grey-green over
 * a row of blocks, and every segment that is not lit still to be seen (owner,
 * 2026-11-15). None has a needle, so `_beat` is not used and nothing wavers. A meter that
 * is not `lit` is blank: its reading is not to be believed. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string, _beat = 0, lit = true): TemplateResult {
  return display(title, lo, hi, value, unit, lit, label(title));
}

/** A lamp for an alert: an LED. Its colour is its level's, set by its class in styles.ts. */
export const jewel = (sort: string) => html`<span class="jewel ${sort}" aria-hidden="true"></span>`;

/** A rocker switch marked I and O, with a green LED over it that is lit while its device
 * is on. A device that is not answering has its LED out and its legend struck through.
 * `guard` is for a switch beside the case's keylock: "shut" is locked, and "up" is with
 * its key turned. Under a guard `on` is thrown, away from rest. The rocker is the switch
 * itself (`throw`): with the key turned, a press there is the one that throws it. The
 * rocker is lettered I and O whatever it works, so `_ends` is not used. `says` is what a
 * screen reader is told of the switch beside its name. */
export const dolly = (name: string, on: boolean, away: boolean, press: (e: Event) => void, guard: "" | "shut" | "up" = "", says = "", _ends = ["On", "Off"]) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""} ${guard}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name + says} @click=${press}>
  <span class="rocker"><i class="pilot"></i><span class="throw"><b>I</b><b>O</b></span>${guard ? html`<i class="lock"></i>` : nothing}</span>
  ${label(name)}
</button>`;

/** A jog dial, as a video recorder's: a ridged disc with a dimple for the finger that
 * turns it, at `level` per cent of its travel. Its arguments are as Bakelite's knob takes
 * them. The disc turns; its shadow stays where it is, and the dimple stays lit from
 * above as it goes round. Every dial has an LCD under its legend: a setting that ends in
 * a number ("Thermostat 21°") is shown there, blank when the heating is off, and any
 * other dial's level in per cent. `_reads` is not drawn: the panel's note says what a
 * thermostat reads. */
export const knob = (name: string, sort: string, what: string, level: number, held: boolean, said: string, note: string, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }, scale: number[] = [0, 100], _reads?: number) => {
  const { legend, shown, lit } = plate(name, sort, scale);
  // A player's note has a place kept for it, so that a song starting moves nothing.
  const tape = note || sort === "sound";
  return html`<div class="dial ${sort}">
    <div class="dimmer"><div class="knob ${sort} ${held ? "drag" : ""}" role="slider" tabindex="0" aria-label="${name} ${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(level)} aria-valuetext=${said} style="--lvl: ${level.toFixed(1)}"
      @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}><span class="disc"></span></div></div>
    ${label(legend)}${shown === undefined ? figs(panel(String(Math.round(level)), "%", [0, 100])) : figs(shown, lit)}${tape ? html`<span class="note">${note ? label(note) : nothing}</span>` : nothing}
  </div>`;
};

/** A grey rubber button, over its legend. */
export const push = (name: string, press: () => void) => html`<button class="push" @click=${press}><span class="key"></span>${label(name)}</button>`;

/** A function key, for a scene, under a paper strip that says what it does. The keys are
 * numbered by the stylesheet as they come, and one stays down for a moment after it is
 * pressed. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}><span class="strip">${name}</span><span class="key"></span></button>`;
