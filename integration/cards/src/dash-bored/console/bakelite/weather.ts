// Bakelite's weather: a barometer for the sky now and tomorrow, and a desk calendar for
// the forecast (owner, 2026-11-17, from docs/design/dash-bored/console-weather.html). What
// each of Home Assistant's words for the weather is shown as is ../weather.ts's, with the
// later eras' instruments. The gradients and the arc the dial's words follow are in
// kit.ts's DEFS.
import { html, nothing, svg, type TemplateResult } from "lit";
import type { Day } from "../../house.ts";
import { PICTURES, WORDS, shown } from "../weather.ts";
import { label } from "./kit.ts";

/** Where a hand points for a place on the dial, in degrees from straight up: the dial runs 120° each way. */
export const bearing = (place: number) => -96 + 48 * place;

// A point on the dial, `r` from its middle and `deg` from straight up.
const xy = (r: number, deg: number) => [60 + r * Math.sin((deg * Math.PI) / 180), 61 - r * Math.cos((deg * Math.PI) / 180)].map((n) => n.toFixed(1)).join(",");
const RUNGS = Array.from({ length: 41 }, (_, i) => svg`<path class="scale" d="M${xy(30, -120 + i * 6)} L${xy(i % 8 === 4 ? 35 : 33, -120 + i * 6)}"/>`);
const LETTERED = WORDS.map((word, i) => svg`<text class="word"><textPath href="#round" startOffset="${10 + i * 20}%">${word}</textPath></text>`);
const SLIP = 10; // letters: a longer slip is squeezed to its window

/** An aneroid barometer in a meter's case, lettered with the weather. Its black hand points
 * at the weather `now`, and its window has a slip with Home Assistant's own word for it,
 * since five places cannot tell snow from rain. Its brass hand, which on a real one is set
 * by the knob to mark an earlier reading, points at `tomorrow`'s: with no forecast it has
 * none. Not `lit`, its face is grey, as a meter's is: what it says is not to be believed. */
export function barometer(now: string, tomorrow: string | undefined, lit = true): TemplateResult {
  const [place, slip] = shown(now);
  const next = tomorrow === undefined ? undefined : shown(tomorrow);
  const says = `Weather: ${slip} now${next ? `, ${next[1]} tomorrow` : ""}`;
  return html`<div class="meter baro">
    <svg viewBox="0 0 120 120" role="img" aria-label=${says}>
      <circle cx="60" cy="60" r="59" fill="url(#ebon)"/><circle cx="60" cy="60" r="58" fill="none" stroke="#fff" stroke-opacity=".12"/>
      ${lit ? svg`<circle cx="60" cy="61" r="50.5" fill="none" stroke="#ffb347" stroke-opacity=".28" stroke-width="2"/>` : nothing}
      <circle cx="60" cy="61" r="48" fill="url(#${lit ? "lit" : "unlit"})" stroke="#000" stroke-width="2.5"/>
      ${lit ? svg`<ellipse cx="60" cy="24" rx="24" ry="9" fill="url(#spot)" opacity=".55"/>` : nothing}
      <path class="scale" d="M${xy(30, -120)} A30,30 0 1 1 ${xy(30, 120)}"/>${RUNGS}${LETTERED}
      <rect x="40" y="83" width="40" height="10" rx="1" fill="#f6ecd0" stroke="#2a1a10" stroke-width=".8"/>
      <text class="slip" x="60" y="90" textLength=${slip.length > SLIP ? 36 : nothing} lengthAdjust="spacingAndGlyphs">${slip}</text>
      <text class="small" x="60" y="99">ANEROID · DASH-BORED</text>
      ${next ? svg`<text class="small" x="60" y="76">BRASS HAND: TOMORROW</text>
        <g class="hand" style="transform: rotate(${bearing(next[0]).toFixed(1)}deg)"><path d="M60,61 V30" stroke="url(#brass)" stroke-width="1.6" stroke-linecap="round"/><path d="M57,34 L60,27 L63,34 Z" fill="#c9a24b" stroke="#7a5c1e" stroke-width=".4"/></g>` : nothing}
      <g class="hand" style="transform: rotate(${bearing(place).toFixed(1)}deg)"><path d="M60,70 V28" stroke="#111" stroke-width="1.1" stroke-linecap="round"/><circle cx="60" cy="33" r="2.2" fill="none" stroke="#111"/></g>
      <circle cx="60" cy="61" r="5" fill="url(#brass)" stroke="#5a4210" stroke-width=".6"/><path d="M56.5,60 l7,2" stroke="#5a4210"/>
      <path d="M26,44 A40,40 0 0 1 58,20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>
      <g fill="#161616" stroke="#000" stroke-width=".6"><circle cx="60" cy="6" r="2.2"/><circle cx="13" cy="87" r="2.2"/><circle cx="107" cy="87" r="2.2"/></g>
    </svg>
    ${label("Weather")}
  </div>`;
}

/** The forecast as a desk calendar: a card for each of its `days` on two brass rings, with
 * the day of the week in `language`, a picture, the weather in a word and the high and low. */
export function calendar(days: Day[], language: string): TemplateResult {
  return html`<div class="days">
    <div class="cards">
      ${days.map((d) => {
        const [, word, picture] = shown(d.sky);
        return html`<div class="card">
          <b>${new Date(d.at).toLocaleDateString(language, { weekday: "short" })}</b>
          <svg viewBox="0 0 24 24" aria-hidden="true">${PICTURES[picture]}</svg>
          <u>${word}</u>
          <s>${Math.round(d.high)}°${d.low === undefined ? "" : ` / ${Math.round(d.low)}°`}</s>
        </div>`;
      })}
    </div>
    ${label("Forecast")}
  </div>`;
}
