// Bakelite's control kit: each control drawn once, as a function of what it shows. They
// are drawn after 1950s equipment: moving-coil meters, a valve that glows, a fluted
// dimmer knob, tumbler ("dolly") switches and knife switches. bakelite.ts puts them on
// the panel and acts on what is pressed; styles.ts is their look and how they move.
import { html, nothing, svg, type TemplateResult } from "lit";

/** The gradients the controls are filled with. Once in each shadow root that draws any. */
export const DEFS = html`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="glass" cx=".35" cy=".25"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".4" stop-color="#bcd" stop-opacity=".12"/><stop offset="1" stop-color="#234" stop-opacity=".35"/></radialGradient>
  <radialGradient id="hot"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ff4a00" stop-opacity="0"/></radialGradient>
  <radialGradient id="bake" cx=".32" cy=".25"><stop offset="0" stop-color="#6a3f2c"/><stop offset=".5" stop-color="#34190f"/><stop offset="1" stop-color="#150a06"/></radialGradient>
  <radialGradient id="dome" cx=".35" cy=".28"><stop offset="0" stop-color="#8a5740"/><stop offset=".55" stop-color="#3a1d12"/><stop offset="1" stop-color="#1a0c07"/></radialGradient>
  <linearGradient id="lever" x1="0" x2="1"><stop offset="0" stop-color="#b98a6c"/><stop offset=".4" stop-color="#6a3f2c"/><stop offset="1" stop-color="#2a140c"/></linearGradient>
</defs></svg>`;

/** An engraved label: white letters cut through black laminate. */
export const label = (text: string) => html`<span class="label">${text}</span>`;

// A point on a meter's face, `r` from the needle's pivot and `deg` from straight up.
const at = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [60 + r * Math.cos(a), 66 + r * Math.sin(a)];
};
const xy = (r: number, deg: number) => at(r, deg).map((n) => n.toFixed(1)).join(",");

/** Where a meter's needle points for a value, in degrees from straight up: its scale
 * runs 50° each way, and a value off either end rests against the stop. */
export const swing = (value: number, lo: number, hi: number) => -50 + 100 * Math.min(1, Math.max(0, (value - lo) / (hi - lo)));

/** A moving-coil meter with a scale from `lo` to `hi`. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string): TemplateResult {
  const marks = Array.from({ length: 11 }, (_, i) => {
    const deg = -50 + i * 10;
    const [x, y] = at(38, deg);
    return svg`<path class="scale" d="M${xy(46, deg)} L${xy(i % 5 ? 50 : 54, deg)}"/>${i % 5 ? nothing : svg`<text x=${x.toFixed(1)} y=${(y + 3).toFixed(1)}>${Math.round(lo + ((hi - lo) * i) / 10)}</text>`}`;
  });
  return html`<div class="meter">
    <svg viewBox="0 0 120 76" role="img" aria-label="${title}: ${value} ${unit}"><rect class="face" x="2" y="2" width="116" height="72" rx="6"/>
      <path class="scale" d="M${xy(46, -50)} A46,46 0 0 1 ${xy(46, 50)}"/>${marks}<text x="60" y="52">${unit}</text>
      <line class="needle" x1="60" y1="66" x2="60" y2="16" style="transform: rotate(${swing(value, lo, hi).toFixed(1)}deg)"/><path d="M40,74 a20,20 0 0 1 40,0 z" fill="#1c0f0a"/></svg>
    ${label(title)}
  </div>`;
}

/** A valve. `heat` is how brightly it glows, from 0 (cold) to 1. */
export const valve = (heat: number) => html`<svg class="valve" viewBox="0 0 80 100" width="74" aria-hidden="true" style="--heat: ${heat.toFixed(2)}">
  <ellipse class="halo" cx="40" cy="48" rx="34" ry="40" fill="url(#hot)"/>
  <rect x="22" y="80" width="36" height="14" rx="2" fill="#1c0f0a"/><path d="M28,94 v6 M36,94 v6 M44,94 v6 M52,94 v6" stroke="#bbb" stroke-width="2"/>
  <rect x="29" y="30" width="22" height="42" rx="2" fill="#555" stroke="#222"/><path d="M33,34 v34 M40,34 v34 M47,34 v34" stroke="#2a2a2a"/>
  <ellipse class="heater" cx="40" cy="52" rx="7" ry="20" fill="url(#hot)"/>
  <path d="M22,82 V30 Q22,8 38,6 L40,1 L42,6 Q58,8 58,30 V82 Z" fill="url(#glass)" stroke="#dfe8ee" stroke-opacity=".6"/>
  <ellipse cx="40" cy="14" rx="12" ry="5" fill="#333" opacity=".55"/></svg>`;

/** A tumbler switch with a pilot lamp over it. Down is on, as on a British wall. A
 * device that is not answering has its pilot out and its label struck through. */
export const dolly = (name: string, on: boolean, away: boolean, press: () => void) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name} @click=${press}>
  <svg viewBox="0 -8 64 74"><circle class="pilot" cx="32" cy="-3" r="3.6" stroke="#c9a24b" stroke-width="1.2"/>
    <circle cx="32" cy="34" r="30" fill="#0e0705"/><circle cx="32" cy="32" r="30" fill="url(#bake)"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".16"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.6"/>
    <g fill="#8a8473" stroke="#2a1a10" stroke-width=".8"><circle cx="9.5" cy="45" r="3"/><circle cx="54.5" cy="19" r="3"/></g>
    <path d="M7.4,43.6 l4.2,2.8 M52.4,20.4 l4.2,-2.8" stroke="#2a1a10" stroke-width="1.1"/>
    <circle cx="32" cy="32" r="19" fill="url(#dome)"/><rect x="25" y="19" width="14" height="26" rx="3" fill="#050201" stroke="#9a6a50" stroke-opacity=".5" stroke-width=".8"/>
    <g class="lever"><path d="M26.5,34 L28,9 Q32,5 36,9 L37.5,34 Z" fill="url(#lever)" stroke="#060302" stroke-width=".8"/>
      <path d="M30,11 L29.2,31" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g>
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

/** A dimmer: a fluted knob over its scale, turned to `level` per cent. `on` are the
 * knob's event handlers; `held` is true while it is being dragged, when it follows the
 * finger without easing. */
export const knob = (name: string, level: number, held: boolean, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }) => html`<div class="dial">
  <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${TICKS}</svg>
    <div class="knob ${held ? "drag" : ""}" role="slider" tabindex="0" aria-label="${name} dimmer" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${level} style="--lvl: ${level}"
      @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}></div></div>
  ${label(name)}
</div>`;

/** A knife switch, for a scene. Its blade is closed for a moment after it is thrown. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}>
  <svg viewBox="0 0 130 84" aria-hidden="true"><rect x="4" y="62" width="122" height="18" rx="3" fill="#3c4142" stroke="#111"/>
    <path d="M100,62 v-16 M108,62 v-16" stroke="#c9a24b" stroke-width="4"/><path d="M18,62 v-8 h8 v8" fill="#c9a24b"/>
    <circle class="spark" cx="104" cy="46" r="7" fill="url(#hot)"/>
    <g class="blade"><rect x="18" y="56" width="92" height="7" rx="2" fill="#d6a45a" stroke="#7a5c1e"/><rect x="104" y="42" width="12" height="26" rx="5" fill="#1c0f0a"/></g>
    <circle cx="22" cy="60" r="4" fill="#7a5c1e"/></svg>
  ${label(name)}
</button>`;
