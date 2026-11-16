// Nixie's control kit, to the shape in ../kit.ts: the Console as a rack of 1960s test
// instruments. Engraved legends filled white, nixie tubes, a magic eye, skirted knobs,
// lever keys and round lit pushes. ../panel.ts puts the controls on the panel and acts on
// what is pressed; styles.ts is their look and how they move.
import { html, nothing, type TemplateResult } from "lit";
import { needle } from "../needle.ts";
import { panel, plate } from "../silverface/kit.ts";

// A screen and thumbwheels are the same parts in every era, dressed by the era's
// stylesheet: here a black-and-white tube, and black wheels with white figures.
export { tv, wheels } from "../bakelite/kit.ts";

/** Nothing here is filled from a gradient: the stylesheet draws it all. */
export const DEFS = html``;

/** A legend: engraved in the plate and filled white. */
export const label = (text: string) => html`<span class="label">${text}</span>`;

// The ten figures of a tube, in the order they are stacked in a common one, from the
// back (1) to the front (6).
const STACK = [..."1029348576"];

/** What each tube of a reading shows: its figure ("" for none, "-" for a minus) and
 * whether its point is lit. A point is in the tube of the figure before it, and a sign
 * for degrees or per cent is in no tube. */
export function tubes(text: string): { figure: string; point: boolean }[] {
  const row: { figure: string; point: boolean }[] = [];
  for (const ch of text.replace(/[°%]/g, "")) {
    if (ch === ".") row.length && (row.at(-1)!.point = true);
    else row.push({ figure: ch.trim(), point: false });
  }
  return row;
}

/** A reading in nixie tubes. A tube holds all ten figures, each a cathode of bent wire,
 * stacked one behind another (owner, 2026-11-15: all of them are to be seen, as in a real
 * one). The one that is lit glows, and the wires of those in front of it cross it as
 * fine dark lines: the stylesheet does that from their order here. A tube with nothing
 * lit still shows the stack, and a display that is not `lit` has every tube so. `says`
 * is what a screen reader is told it shows. */
export const nixies = (text: string, lit = true, says = text.trim()) => html`<span class="nixies" role="img" aria-label=${says}>${tubes(text).map(
  ({ figure, point }) => html`<i class="nix ${lit && figure ? "on" : ""}">${STACK.map((n, z) => html`<b class=${lit && n === figure ? "lit" : ""} style="--z: ${z}">${n}</b>`)}${lit && figure === "-" ? html`<b class="lit">−</b>` : nothing}<u class=${lit && point ? "lit" : ""}></u></i>`,
)}</span>`;

/** A meter with a scale from `lo` to `hi`. A room's is its reading in nixie tubes (owner,
 * 2026-11-15). The two at the top of the panel (`beat` 0 and 1) are needle meters with
 * clear fronts: a cream face under perspex and a fine black needle, which wavers three
 * quarters as far as Bakelite's (../needle.ts). A meter that is not `lit` is dark: its
 * reading is not to be believed. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string, beat = 0, lit = true): TemplateResult {
  if (beat < 2) return needle(title, lo, hi, value, unit, beat, lit, label(title));
  return html`<div class="meter display ${lit ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${title}: ${value} ${unit}">${nixies(panel(lit ? String(value) : "", "", [lo, hi], 1), lit, "")}<span class="unit">${unit}</span></div>
    ${label(title)}
  </div>`;
}

/** A lamp for an alert: a neon indicator. A critical one flashes (styles.ts). */
export const jewel = (sort: string) => html`<span class="jewel ${sort}" aria-hidden="true"></span>`;

/** A room's lights, as a magic eye: two green bars that close on each other as the
 * lights come up, and meet when they are all full on. `heat` is as Bakelite's valve
 * takes it, 0 for dark and from about a third to 1 for lit. */
export const valve = (heat: number) => {
  const shut = heat ? Math.max(0.08, (heat - 0.35) / 0.65) : 0;
  return html`<div class="eye" role="img" aria-label="Lights: ${Math.round(shut * 100)} per cent" style="--shut: ${shut.toFixed(2)}"><i></i><i></i></div>`;
};

/** A lever key, as a telephone exchange's: a black handle in a chrome plate, under a neon
 * pilot lamp. Down is on. A device that is not answering has its lamp out and its legend
 * struck through. `guard` is for a key under a red cover, hinged at its top: "shut" over
 * the lever, or lifted "up". Under a guard `on` is thrown, away from rest. The plate and
 * its lever are the switch itself (`throw`): under a lifted cover, a press there is the
 * one that throws it. Nixie's keys are not lettered at their ends, so `_ends` is not
 * used. `says` is what a screen reader is told of the key beside its name. */
export const dolly = (name: string, on: boolean, away: boolean, press: (e: Event) => void, guard: "" | "shut" | "up" = "", says = "", _ends = ["On", "Off"]) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""} ${guard}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name + says} @click=${press}>
  <span class="key"><svg viewBox="0 0 44 66" aria-hidden="true"><circle class="glow" cx="22" cy="6" r="9"/><circle class="pilot" cx="22" cy="6" r="4.2"/>
    <g class="throw"><rect x="8" y="16" width="28" height="48" rx="3" fill="#cfd3d6" stroke="#4a5257"/><path d="M10,18 h24" stroke="#fff" stroke-opacity=".7"/>
      <circle cx="13" cy="21" r="1.6" fill="#6d757a"/><circle cx="31" cy="59" r="1.6" fill="#6d757a"/><rect x="18" y="24" width="8" height="30" rx="4" fill="#0b0b0b"/>
      <g class="lever"><path d="M19.5,40 L18,21 Q18,12 22,12 Q26,12 26,21 L24.5,40 Z" fill="#141414" stroke="#000" stroke-width=".7"/><path d="M20.3,16 L20.8,36" stroke="#fff" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/></g></g></svg>${guard ? html`<i class="cover"></i>` : nothing}</span>
  ${label(name)}
</button>`;

/** An instrument knob over an engraved scale, turned to `level` per cent of its travel: a
 * fluted grip with a coloured middle, on a pale skirt with an index line. Its arguments
 * are as Bakelite's knob takes them. The grip and its line turn; the skirt's shadow and
 * the light on the knob stay where they are. A setting that ends in a number ("Thermostat
 * 21°") is in nixie tubes under the knob, and the rest of it is the legend; the tubes are
 * there, dark, when the heating is off. `_reads` is not drawn: the panel's note says what
 * a thermostat reads. */
export const knob = (name: string, sort: string, what: string, level: number, held: boolean, said: string, note: string, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }, scale: number[] = [0, 100], _reads?: number) => {
  const { legend, shown, lit } = plate(name, sort, scale);
  // A player's note has a place kept for it, so that a song starting moves nothing.
  const tape = note || sort === "sound";
  return html`<div class="dial ${sort}">
    <div class="dimmer"><div class="knob ${sort} ${held ? "drag" : ""}" role="slider" tabindex="0" aria-label="${name} ${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(level)} aria-valuetext=${said} style="--lvl: ${level.toFixed(1)}"
      @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}><span class="grip"></span></div></div>
    ${label(legend)}${shown === undefined ? nothing : nixies(shown, lit)}${tape ? html`<span class="note">${note ? label(note) : nothing}</span>` : nothing}
  </div>`;
};

/** A square key with a clear cap, over its legend. */
export const push = (name: string, press: () => void) => html`<button class="push" @click=${press}><span class="key"></span>${label(name)}</button>`;

/** A large round push, for a scene, with its name on its cap. It is lit from behind for
 * a moment after it is pressed. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}><span class="key">${name}</span></button>`;
