// A needle meter for the eras whose meters are rectangular (Nixie, Bargraph): a still
// face with a scale, and the needle as a layer of its own over it. The swing to a new
// reading and the waver are transforms of that layer, which the browser moves without
// drawing the meter again. An era's stylesheet gives the face, the scale and the needle
// their look, and says how far the needle wavers.
import { html, svg, type TemplateResult } from "lit";
import { BEATS } from "./kit.ts";

// A point on the face, `r` from the needle's pivot and `deg` from straight up. The pivot
// is well below the window, so the needle is long and its arc is shallow.
const at = (r: number, deg: number): [string, string] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [(60 + r * Math.cos(a)).toFixed(1), (96 + r * Math.sin(a)).toFixed(1)];
};
const HALF = 33; // degrees: how far the scale runs each side of straight up
// The scale: an arc with a mark every twentieth of it, a longer one at each quarter, and its last fifth marked as over.
const SCALE = svg`<path class="scale" d="M${at(80, -HALF)} A80,80 0 0 1 ${at(80, HALF)}"/><path class="over" d="M${at(77.5, HALF * 0.6)} A77.5,77.5 0 0 1 ${at(77.5, HALF)}"/>
  ${Array.from({ length: 21 }, (_, i) => svg`<path class="scale" d="M${at(i % 5 ? 77 : 74, -HALF + i * HALF * 0.1)} L${at(80, -HALF + i * HALF * 0.1)}"/>`)}`;

/** A needle meter with a scale from `lo` to `hi`, over its `plate`: the era's legend for
 * its title. `beat` is which meter on the panel this is, and chooses how fast its needle
 * wavers. One that is not `lit` has the class `unlit`: its reading is not to be believed. */
export function needle(title: string, lo: number, hi: number, value: number, unit: string, beat: number, lit: boolean, plate: TemplateResult): TemplateResult {
  const part = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  const figures = [0, 1, 2, 3, 4].map((i) => {
    const [x, y] = at(68, -HALF + i * HALF * 0.5);
    return svg`<text x=${x} y=${Number(y) + 2}>${+(lo + ((hi - lo) * i) / 4).toFixed(1)}</text>`;
  });
  return html`<div class="meter ${lit ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${title}: ${value} ${unit}">
      <svg class="face" viewBox="0 0 120 70" aria-hidden="true">${SCALE}${figures}<text class="unit" x="60" y="52">${unit}</text></svg>
      <div class="needle" style="transform: rotate(${(-HALF + 2 * HALF * part).toFixed(1)}deg)"><svg class="waver" viewBox="0 0 120 70" aria-hidden="true" style="animation-duration: ${BEATS[beat % BEATS.length] * 16}ms"><path d="M60,96 V19"/></svg></div>
      <i class="cowl"></i>
    </div>
    ${plate}
  </div>`;
}
