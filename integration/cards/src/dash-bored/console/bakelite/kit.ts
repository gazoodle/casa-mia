// Bakelite's control kit, to the shape in ../kit.ts: each control drawn once, as a function of what it shows. They
// are drawn after 1950s equipment: moving-coil meters, a valve that glows, a fluted
// dimmer knob, tumbler ("dolly") switches and knife switches. ../panel.ts puts them on
// the panel and acts on what is pressed; styles.ts is their look and how they move.
import { html, nothing, svg, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { BEATS, face } from "../kit.ts";

/** The gradients the controls are filled with. Once in each shadow root that draws any. */
export const DEFS = html`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="hot"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ff4a00" stop-opacity="0"/></radialGradient>
  <radialGradient id="bake" cx=".32" cy=".25"><stop offset="0" stop-color="#6a3f2c"/><stop offset=".5" stop-color="#34190f"/><stop offset="1" stop-color="#150a06"/></radialGradient>
  <radialGradient id="dome" cx=".35" cy=".28"><stop offset="0" stop-color="#8a5740"/><stop offset=".55" stop-color="#3a1d12"/><stop offset="1" stop-color="#1a0c07"/></radialGradient>
  <radialGradient id="ebon" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".45" stop-color="#151515"/><stop offset="1" stop-color="#050505"/></radialGradient>
  <linearGradient id="tube" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".14" stop-color="#cfe0ea" stop-opacity=".08"/><stop offset=".55" stop-color="#cfe0ea" stop-opacity=".03"/><stop offset=".88" stop-color="#cfe0ea" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient>
  <linearGradient id="getter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4046" stop-opacity=".95"/><stop offset=".35" stop-color="#14171b" stop-opacity=".92"/><stop offset=".75" stop-color="#2a2e33" stop-opacity=".6"/><stop offset="1" stop-color="#555b62" stop-opacity="0"/></linearGradient>
  <radialGradient id="lit" gradientUnits="userSpaceOnUse" cx="60" cy="18" r="88"><stop offset="0" stop-color="#fffbe6"/><stop offset=".22" stop-color="#fbe7ae"/><stop offset=".55" stop-color="#eec176"/><stop offset=".85" stop-color="#c58a3c"/><stop offset="1" stop-color="#8f5c1f"/></radialGradient>
  <radialGradient id="unlit" gradientUnits="userSpaceOnUse" cx="60" cy="40" r="80"><stop offset="0" stop-color="#d6d0ba"/><stop offset="1" stop-color="#8d8975"/></radialGradient>
  <radialGradient id="spot"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="rim"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d98d"/><stop offset=".45" stop-color="#b98f3a"/><stop offset=".7" stop-color="#7a5c1e"/><stop offset="1" stop-color="#d8b765"/></linearGradient>
  <linearGradient id="sepia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe0b9"/><stop offset=".6" stop-color="#e3cf9f"/><stop offset="1" stop-color="#d2b983"/></linearGradient>
  <path id="arch" d="M24.9,39.1 A57,57 0 0 1 95.1,39.1"/>
  <path id="round" d="M26.4,84.5 A41,41 0 1 1 93.6,84.5"/>
  <linearGradient id="lever" x1="0" x2="1"><stop offset="0" stop-color="#b98a6c"/><stop offset=".4" stop-color="#6a3f2c"/><stop offset="1" stop-color="#2a140c"/></linearGradient>
</defs></svg>`;

/** An engraved label: white letters cut through black laminate. */
export const label = (text: string) => html`<span class="label">${text}</span>`;

// A point on a meter's face, `r` from the needle's pivot and `deg` from straight up.
const at = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [60 + r * Math.cos(a), 84 + r * Math.sin(a)];
};
const xy = (r: number, deg: number) => at(r, deg).map((n) => n.toFixed(1)).join(",");

/** Where a meter's needle points for a value, in degrees from straight up: its scale
 * runs 50° each way, and a value off either end rests against the stop. */
export const swing = (value: number, lo: number, hi: number) => -50 + 100 * Math.min(1, Math.max(0, (value - lo) / (hi - lo)));

// A meter's unit as its maker would have lettered it round the top of the face.
const LEGEND: Record<string, string> = { "°C": "Degrees Celsius", kW: "Kilowatts" };
// The scale is a ladder: two arcs with a rung every 2°, a longer one at each tenth of it.
const RUNGS = Array.from({ length: 51 }, (_, i) => svg`<path class="scale" d="M${xy(36, -50 + i * 2)} L${xy(i % 5 ? 40 : 43, -50 + i * 2)}"/>`);

/** A moving-coil meter of the kind a 1950s panel carried, with a scale from `lo` to `hi`: a round black case,
 * and a face whose lower edge rises over the movement, hiding the needle's pivot. The
 * pointer is a pale shaft with a black blob and a fine tip where it crosses the scale.
 * `beat` is which meter on the panel this is, and chooses how fast its pointer wavers.
 * A `lit` meter has a lamp behind the top of its face: brightest there, amber at the
 * edges, and a little of it on the inside of the case. Unlit, the face is grey. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string, beat = 0, lit = true): TemplateResult {
  const figures = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = at(48, -50 + i * 20);
    return svg`<text x=${x.toFixed(1)} y=${(y + 2).toFixed(1)}>${+(lo + ((hi - lo) * i) / 5).toFixed(1)}</text>`;
  });
  return html`<div class="meter">
    <svg viewBox="0 0 120 120" role="img" aria-label="${title}: ${value} ${unit}">
      <circle cx="60" cy="60" r="59" fill="url(#ebon)"/><circle cx="60" cy="60" r="58" fill="none" stroke="#fff" stroke-opacity=".12"/><circle cx="60" cy="62" r="49" fill="none" stroke="#000" stroke-width="2.5"/>
      ${lit ? svg`<circle cx="60" cy="62" r="50.5" fill="none" stroke="#ffb347" stroke-opacity=".28" stroke-width="2"/>` : nothing}
      <path fill="url(#${lit ? "lit" : "unlit"})" d="M17,78 A46,46 0 1 1 103,78 Q100,92 86,92 C76,92 78,75 60,75 C42,75 44,92 34,92 Q20,92 17,78 Z"/>
      ${lit ? svg`<ellipse cx="60" cy="24" rx="24" ry="9" fill="url(#spot)" opacity=".55"/>` : nothing}
      <path class="scale" d="M${xy(36, -50)} A36,36 0 0 1 ${xy(36, 50)} M${xy(40, -50)} A40,40 0 0 1 ${xy(40, 50)}"/>${RUNGS}${figures}
      <text class="legend"><textPath href="#arch" startOffset="50%">${LEGEND[unit] ?? unit}</textPath></text>
      <text class="unit" x="60" y="66">${unit}</text><text class="small" x="33" y="84">MOVING COIL</text><text class="small" x="87" y="84">DASH-BORED</text>
      <g class="needle" style="transform: rotate(${swing(value, lo, hi).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${BEATS[beat % BEATS.length] * 16}ms">
        <path d="M60,84 V51" stroke="#b4b1a4" stroke-width=".8"/><path d="M60,51 V42" stroke="#111" stroke-width=".8" stroke-linecap="round"/><circle cx="60" cy="50" r="1.5" fill="#111"/></g></g>
      <path d="M17,78 A46,46 0 1 1 103,78" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.4"/><path d="M26,44 A40,40 0 0 1 58,20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M17,79 Q20,93 34,93 C45,93 43,76 60,76 C77,76 75,93 86,93 Q100,93 103,79 A46,46 0 0 1 17,79 Z" fill="url(#ebon)"/>
      <circle cx="60" cy="103" r="4.5" fill="#1a1a1a" stroke="#000"/><path d="M56.5,102 l7,2" stroke="#000" stroke-width="1.3"/>
      <g fill="#161616" stroke="#000" stroke-width=".6"><circle cx="60" cy="6" r="2.2"/><circle cx="13" cy="87" r="2.2"/><circle cx="107" cy="87" r="2.2"/></g>
    </svg>
    ${label(title)}
  </div>`;
}

/** A pilot lamp: a smooth glass dome in a ribbed brass bezel, with a lamp behind it that
 * is brightest in the middle. Its colour is the element's `--glow`, set by its class in
 * styles.ts, which also throws its light on the panel round it. */
export const jewel = (sort: string) => html`<svg class="jewel ${sort}" viewBox="0 0 40 40" width="34" aria-hidden="true">
  <circle cx="20" cy="21.2" r="18" fill="#000" opacity=".5"/><circle cx="20" cy="20" r="18" fill="url(#brass)"/>
  <g fill="none" stroke="#3a2808"><circle cx="20" cy="20" r="17.6" stroke-width=".7"/><circle cx="20" cy="20" r="15.4" stroke-width=".6" stroke-opacity=".7"/><circle cx="20" cy="20" r="13.6" stroke-width=".9"/></g>
  <circle cx="20" cy="20" r="16.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="14 90" transform="rotate(200 20 20)"/>
  <circle cx="20" cy="20" r="12.6" fill="#120805"/><circle class="glass" cx="20" cy="20" r="11.8"/>
  <circle cx="20" cy="20" r="11.8" fill="url(#rim)"/><circle cx="20" cy="21" r="8.5" fill="url(#spot)"/><circle cx="20" cy="21" r="4" fill="url(#spot)"/>
  <path d="M12.2,15.5 A9.5,9.5 0 0 1 19,10.6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/></svg>`;

// The grid: a fine wire wound round its two supports, seen between the anode plates.
const GRID = Array.from({ length: 19 }, (_, i) => `M36.4,${(41.5 + i * 1.4).toFixed(1)} h7.2`).join(" ");

/** A valve, drawn after a miniature glass one: a clear envelope with its pip and the
 * dark, silvery getter flash at the top; inside, two mica discs holding two grey anode
 * plates, with the grid's winding and the heater between them, rods above and wires
 * down to the pins below. `heat` is how brightly the heater glows, from 0 (cold) to 1. */
export const valve = (heat: number) => html`<svg class="valve" viewBox="0 0 80 100" width="74" aria-hidden="true" style="--heat: ${heat.toFixed(2)}">
  <ellipse class="halo" cx="40" cy="54" rx="25" ry="33" fill="url(#hot)"/>
  <ellipse cx="40" cy="93" rx="15" ry="2.6" fill="#120805"/><path d="M29,92 v6 M33.5,93 v6 M40,93.5 v6 M46.5,93 v6 M51,92 v6" stroke="#c9c2b0" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M24,91 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V91 Q40,95 24,91 Z" fill="#0c0806" fill-opacity=".35"/>
  <g fill="none" stroke="#b9b2a2" stroke-width=".6" stroke-opacity=".75"><path d="M30,71 C30,80 29,84 29,90 M34,71 C34,79 33.5,85 33.5,91 M40,72 V91 M46,71 C46,79 46.5,85 46.5,91 M50,71 C50,80 51,84 51,90"/><path d="M31,82 C36,78 40,84 45,80" stroke="#b87a3a"/></g>
  <ellipse cx="40" cy="89" rx="14.5" ry="2.4" fill="#fff" fill-opacity=".14"/>
  <path d="M30,38 V31 M34,38 V29 M46,38 V29 M50,38 V31 M33,29 H47" stroke="#9a9a94" stroke-width=".8" fill="none"/>
  <rect x="26.5" y="40" width="9.2" height="29" fill="#4b4e54"/><rect x="44.3" y="40" width="9.2" height="29" fill="#43464b"/>
  <path d="M28.4,40 V69 M46.2,40 V69" stroke="#fff" stroke-opacity=".2" stroke-width="1.6"/><path d="M26.5,47 h9.2 M26.5,62 h9.2 M44.3,47 h9.2 M44.3,62 h9.2" stroke="#000" stroke-opacity=".35" stroke-width=".5"/><path d="M35.2,40 V69 M44.8,40 V69" stroke="#000" stroke-opacity=".5" stroke-width=".8"/>
  <rect x="35.7" y="40" width="8.6" height="29" fill="#150c08"/>
  <ellipse class="heater" cx="40" cy="54" rx="9" ry="20" fill="url(#hot)"/>
  <path d="M36.4,33 V73 M43.6,33 V73" stroke="#b87a3a" stroke-width=".9"/><path d="${GRID}" stroke="#d9b98a" stroke-width=".35" stroke-opacity=".8"/>
  <rect class="heater" x="38.7" y="35" width="2.6" height="38" rx="1.3" fill="#ff7a1a"/><rect class="heater" x="39.4" y="36" width="1.2" height="36" rx=".6" fill="#ffd28a"/><circle class="heater" cx="40" cy="35.5" r="2.3" fill="#fff4c4"/>
  <g fill="#cdbfa6" fill-opacity=".9" stroke="#7d6e55" stroke-width=".5"><ellipse cx="40" cy="39" rx="15" ry="2.5"/><ellipse cx="40" cy="70" rx="15" ry="2.5"/></g>
  <path d="M24,34 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V34 Q40,29 24,34 Z" fill="url(#getter)"/>
  <path d="M24,91 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V91 Q40,95 24,91 Z" fill="url(#tube)" stroke="#e6eef2" stroke-opacity=".55" stroke-width=".7"/>
  <path d="M27.3,24 V86" stroke="#fff" stroke-opacity=".42" stroke-width="1.5" stroke-linecap="round"/><path d="M53.2,30 V84" stroke="#fff" stroke-opacity=".16" stroke-width="1" stroke-linecap="round"/>
  <path d="M29,17 Q32,10.5 38,9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/></svg>`;

/** A tumbler switch with a pilot lamp over it. Down is on, as on a British wall. A
 * device that is not answering has its pilot out and its label struck through. `guard`
 * is for a switch under a red guard, which is "shut" over it or lifted "up"; `says` is
 * what a screen reader is told of it beside its name. Under a guard, `on` is thrown:
 * away from rest. Bakelite's switches are not lettered, so `_ends` is not used. The
 * dome and its lever are the switch itself (`throw`): under a lifted guard, a press
 * there is the one that throws it. */
export const dolly = (name: string, on: boolean, away: boolean, press: (e: Event) => void, guard: "" | "shut" | "up" = "", says = "", _ends = ["On", "Off"]) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""} ${guard}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name + says} @click=${press}>
  <svg viewBox="0 -8 64 74"><circle class="pilot" cx="32" cy="-3" r="3.6" stroke="#c9a24b" stroke-width="1.2"/>
    <circle cx="32" cy="34" r="30" fill="#0e0705"/><circle cx="32" cy="32" r="30" fill="url(#bake)"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".16"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.6"/>
    <g fill="#8a8473" stroke="#2a1a10" stroke-width=".8"><circle cx="9.5" cy="45" r="3"/><circle cx="54.5" cy="19" r="3"/></g>
    <path d="M7.4,43.6 l4.2,2.8 M52.4,20.4 l4.2,-2.8" stroke="#2a1a10" stroke-width="1.1"/>
    <g class="throw"><circle cx="32" cy="32" r="19" fill="url(#dome)"/><rect x="25" y="19" width="14" height="26" rx="3" fill="#050201" stroke="#9a6a50" stroke-opacity=".5" stroke-width=".8"/>
    <g class="lever"><path d="M26.5,34 L28,9 Q32,5 36,9 L37.5,34 Z" fill="url(#lever)" stroke="#060302" stroke-width=".8"/>
      <path d="M30,11 L29.2,31" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g></g>
    ${guard ? svg`<g class="guard"><rect x="17" y="4" width="30" height="56" rx="5" fill="#c8281e" fill-opacity=".82" stroke="#5a0f0a" stroke-width="1.2"/><path d="M21,9 h22" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/><rect x="14" y="1" width="36" height="6" rx="2" fill="#8a8473" stroke="#2a1a10" stroke-width=".8"/></g>` : nothing}
    <ellipse cx="24" cy="23" rx="5" ry="3" fill="#fff" opacity=".22" transform="rotate(-35 24 23)"/></svg>
  ${label(name)}
</button>`;

// The dimmer's engraved scale: eleven marks round three quarters of a turn.
const TICKS = Array.from({ length: 11 }, (_, i) => {
  const a = ((-135 + i * 27 - 90) * Math.PI) / 180;
  const end = (r: number) => [(52 + r * Math.cos(a)).toFixed(1), (52 + r * Math.sin(a)).toFixed(1)];
  const [x1, y1] = end(40);
  const [x2, y2] = end(47);
  return svg`<line x1=${x1} y1=${y1} x2=${x2} y2=${y2} stroke="#e9dfc3" stroke-width=${i % 5 ? 1 : 2.2}/>`;
});

/** A fluted knob over its scale, turned to `level` per cent of its travel. `sort` is its
 * class in styles.ts (a blind's winder is brass, the heating's is red) and `what` the
 * word for what it sets. `on` are the knob's event handlers; `held` is true while it is
 * being dragged, when it follows the finger without easing. `said` is its setting in
 * words, for a screen reader, and `note` a second plate under its name. The knob is in
 * layers: its flutes and its pointer turn, and the light on it (styles.ts) stays where it is.
 * `_scale` is what its travel runs over, in the device's own units, and `_reads` what a
 * thermostat reads now: an era that draws a scale of its own uses them, and Bakelite does not.
 * A player has a place kept for its note whether or not anything is playing, so that a
 * song starting moves nothing. */
export const knob = (name: string, sort: string, what: string, level: number, held: boolean, said: string, note: string, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }, _scale: number[] = [0, 100], _reads?: number) => html`<div class="dial ${sort}">
  <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${TICKS}</svg>
    <div class="knob ${sort} ${held ? "drag" : ""}" role="slider" tabindex="0" aria-label="${name} ${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(level)} aria-valuetext=${said} style="--lvl: ${level.toFixed(1)}"
      @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
  ${label(name)}${note || sort === "sound" ? html`<span class="note">${note ? label(note) : nothing}</span>` : nothing}
</div>`;

/** A television screen, for a camera: the picture in black and white behind a curved
 * glass, with its lines. With no `picture` the tube is dark. `caption` is on its plate. */
export const tv = (caption: string, picture: string, press: () => void) => html`<button class="tv" aria-label=${caption} @click=${press}>
  <span class="tube">${picture ? html`<img src=${picture} alt="" loading="lazy" />` : nothing}</span>
  ${label(caption)}
</button>`;

// How far each wheel's digits sit off true, in px: no two the same, as on a worn padlock.
const OFF = [0.9, -1.3, 0.4, 1.6, -0.7, -1.7];

/** A row of thumbwheels, as on a combination padlock, for an alarm's code: brass barrels
 * with a digit engraved on the front and its neighbours curving away above and below.
 * `places` is where each wheel stands. A press on a wheel's top half turns it on by one
 * and on its bottom half back: `turn`. The digits are keyed by their place, so that when
 * a wheel is turned they are the same elements moved, and are seen to roll. Each says
 * how many places it is from the front (`--n`) and how far this wheel sits off true
 * (`--off`); the era's stylesheet places it from those. */
export const wheels = (name: string, places: number[], turn: (i: number, by: number) => void) => html`<div class="wheels" role="group" aria-label="${name} code">${places.map(
  (place, i) => html`<div class="wheel">
    ${barrel(place, i, `Wheel ${i + 1}: ${face(place) || "blank"}`)}
    <button aria-label="Wheel ${i + 1} on" @click=${() => turn(i, 1)}></button><button aria-label="Wheel ${i + 1} back" @click=${() => turn(i, -1)}></button>
  </div>`,
)}</div>`;

// One wheel's digits: the one at the front, `said` to a screen reader if it is to be, and its neighbours.
const barrel = (place: number, i: number, said?: string) => repeat(
  [-2, -1, 0, 1, 2].map((d) => place + d),
  (at) => at,
  (at) => html`<span class=${at === place ? "at" : ""} aria-hidden=${at === place && said ? nothing : "true"} aria-label=${at === place && said ? said : nothing}
    style="--n: ${at - place}; --off: ${OFF[i % OFF.length]}px">${face(at)}</span>`,
);

/** A number on counter wheels, as an electricity meter's register has: the same barrels as
 * the thumbwheels, with nothing to press, a nought where a figure is blank, and the wheel
 * after the point marked as tenths (styles.ts). It takes what every era's figures take
 * (../metered.ts): one that is not `lit` stands at noughts, and its plate says why. */
export const counter = (text: string, _lit = true, says = text.trim()) => {
  const point = text.indexOf(".");
  const digits = [...text.replace(".", "")];
  return html`<div class="wheels" role="img" aria-label=${says}>${digits.map(
    (ch, i) => html`<div class="wheel ${point >= 0 && i >= point ? "tenth" : ""}">${barrel((Number(ch) || 0) + 1, i)}</div>`,
  )}</div>`;
};

/** A push button over its plate. */
export const push = (name: string, press: () => void) => html`<button class="push" @click=${press}><span class="cap"></span>${label(name)}</button>`;

/** A knife switch, for a scene. Its blade is closed for a moment after it is thrown. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}>
  <svg viewBox="0 0 130 84" aria-hidden="true"><rect x="4" y="62" width="122" height="18" rx="3" fill="#3c4142" stroke="#111"/>
    <path d="M100,62 v-16 M108,62 v-16" stroke="#c9a24b" stroke-width="4"/><path d="M18,62 v-8 h8 v8" fill="#c9a24b"/>
    <circle class="spark" cx="104" cy="46" r="7" fill="url(#hot)"/>
    <g class="blade"><rect x="18" y="56" width="92" height="7" rx="2" fill="#d6a45a" stroke="#7a5c1e"/><rect x="104" y="42" width="12" height="26" rx="5" fill="#1c0f0a"/></g>
    <circle cx="22" cy="60" r="4" fill="#7a5c1e"/></svg>
  ${label(name)}
</button>`;
