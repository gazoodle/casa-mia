// The weather on the Console, the same in every era: what Home Assistant's words for the
// sky are shown as, the pictures for them, and the two instruments of the eras after the
// 1950s, which are the same parts dressed by each era's stylesheet (as a screen and a
// needle meter are). Bakelite's own two, a barometer and a desk calendar, are in
// bakelite/weather.ts. panel.ts puts them at the top of the panel, after the Outside air
// meter, which is a meter like any other.
import { css, html, nothing, svg, type TemplateResult } from "lit";
import type { Day } from "../house.ts";

/** The five places the weather has on an instrument, from the worst to the best. */
export const WORDS = ["Stormy", "Rain", "Change", "Fair", "Set fair"];
// Home Assistant's words for the weather: its place (0 Stormy to 4 Set fair), the word
// it is shown under, and which of PICTURES it has.
const SKY: Record<string, [number, string, string]> = {
  "lightning-rainy": [0, "Thunder", "storm"], lightning: [0, "Lightning", "storm"], hail: [0, "Hail", "snow"], exceptional: [0, "Exceptional", "storm"], pouring: [0.4, "Pouring", "rain"],
  rainy: [1, "Rain", "rain"], "snowy-rainy": [1, "Sleet", "snow"], snowy: [1, "Snow", "snow"],
  cloudy: [2, "Cloud", "cloud"], fog: [2, "Fog", "fog"], windy: [2, "Wind", "wind"], "windy-variant": [2, "Wind", "wind"],
  partlycloudy: [3, "Part cloud", "part"], sunny: [4, "Sunny", "sun"], "clear-night": [4, "Clear", "sun"],
};
/** How a word of Home Assistant's for the weather is shown: its place, its own word and
 * its picture. A word this does not know (an integration's own) is at Change, under itself. */
export const shown = (sky: string): [number, string, string] => SKY[sky] ?? [2, sky.replace(/[-_]/g, " "), "cloud"];

// The pictures, in one ink, each in a box of 24. An era's stylesheet gives the ink: what
// is filled, and the strokes of class `line`.
const CLOUD = svg`<path d="M7,16 a3.6,3.6 0 0 1 .5,-7.1 a5,5 0 0 1 9.7,1.2 a3,3 0 0 1 -.6,5.9 Z"/>`;
export const PICTURES: Record<string, TemplateResult> = {
  sun: svg`<circle cx="12" cy="12" r="4.2"/><path class="line" d="M12,2.5 v3 M12,18.5 v3 M2.5,12 h3 M18.5,12 h3 M5.3,5.3 l2.1,2.1 M16.6,16.6 l2.1,2.1 M5.3,18.7 l2.1,-2.1 M16.6,7.4 l2.1,-2.1"/>`,
  part: svg`<circle cx="16.5" cy="7.5" r="3.4"/><path class="line" d="M16.5,1.2 v1.8 M22.8,7.5 h-1.8 M21,3 l-1.3,1.3"/><g transform="translate(-1.5 3)">${CLOUD}</g>`,
  cloud: svg`<g transform="translate(0 -1)">${CLOUD}</g>`,
  rain: svg`<g transform="translate(0 -4)">${CLOUD}</g><path class="line" d="M8,15.5 l-1.5,4.5 M12.5,15.5 l-1.5,4.5 M17,15.5 l-1.5,4.5"/>`,
  snow: svg`<g transform="translate(0 -4)">${CLOUD}</g><path class="line" d="M7.5,15.5 v4 M5.8,16.5 l3.4,2 M9.2,16.5 l-3.4,2 M16.5,15.5 v4 M14.8,16.5 l3.4,2 M18.2,16.5 l-3.4,2 M12,18 v3.6"/>`,
  storm: svg`<g transform="translate(0 -4)">${CLOUD}</g><path d="M13,13 l-4,5.2 h2.6 l-1.4,4.3 l4.6,-6 h-2.7 Z"/>`,
  fog: svg`<path class="line" d="M4,8 h16 M6,12 h14 M4,16 h13 M8,20 h12"/>`,
  wind: svg`<path class="line" d="M3,9 h11 a2.6,2.6 0 1 0 -2.6,-2.6 M3,13 h15.5 a2.8,2.8 0 1 1 -2.8,2.8 M3,17 h8"/>`,
};
const picture = (name: string) => html`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${PICTURES[name]}</svg>`;

const PLACES = [0, 1, 2, 3, 4];
// A row of five lamps under the five words, the one at `place` lit.
const row = (name: string, place: number, lit: boolean) => html`<em>${name}</em>${PLACES.map((i) => html`<i class=${lit && i === Math.round(place) ? "lit" : ""}></i>`)}`;

/** The weather's two instruments for an era, drawn with its `label` and its `figures` (a
 * number on its display: nixie tubes, or figures of seven bars).
 *
 * `barometer`: the five words across a window, with a row of lamps for the weather `now`
 * and, where there is a forecast, a row for `tomorrow`. Under them is Home Assistant's own
 * word for the weather now, with its picture, since five places cannot tell snow from
 * rain. Not `lit`, no lamp is: what it says is not to be believed.
 *
 * `calendar`: the forecast, a column for each of its `days`: the day of the week in
 * `language`, the picture, the high in the era's figures, the weather in a word and the low. */
export function weather(label: (text: string) => TemplateResult, figures: (text: string) => TemplateResult) {
  return {
    barometer(now: string, tomorrow: string | undefined, lit = true): TemplateResult {
      const [place, word, pic] = shown(now);
      const next = tomorrow === undefined ? undefined : shown(tomorrow);
      return html`<div class="meter display sky ${lit ? "" : "unlit"}">
        <div class="win" role="img" aria-label="Weather: ${word} now${next ? `, ${next[1]} tomorrow` : ""}">
          <span></span>${WORDS.map((w) => html`<span class="place">${w}</span>`)}
          ${row("Now", place, lit)}
          ${next ? row("Tomorrow", next[0], lit) : nothing}
          <div class="slip">${picture(pic)}<span>${word}</span></div>
        </div>
        ${label("Weather")}
      </div>`;
    },
    calendar(days: Day[], language: string): TemplateResult {
      return html`<div class="meter display days">
        <div class="win">
          ${days.map((d) => {
            const [, word, pic] = shown(d.sky);
            return html`<div class="day">
              <b>${new Date(d.at).toLocaleDateString(language, { weekday: "short" })}</b>
              ${picture(pic)}
              ${figures(`${Math.round(d.high)}°`.padStart(3, " "))}
              <u>${word}</u>
              <s>${d.low === undefined ? "" : `Low ${Math.round(d.low)}°`}</s>
            </div>`;
          })}
        </div>
        ${label("Forecast")}
      </div>`;
    },
  };
}

/** How the two are laid out, for an era's stylesheet to dress. The era gives --sky-ink
 * (the lettering and the pictures), --sky-on and --sky-next (a lit lamp in each row),
 * --sky-off (one that is not) and, if a lit lamp glows, --sky-glow. Its window is its
 * display's (`.display .win`). An era lists this after its own stylesheet, so what it
 * changes here it says under `.panel`. */
export const WEATHER = css`
  .top > .sky { flex: 0 1 250px; } .top > .days { flex: 0 1 290px; }
  .sky .win, .days .win { aspect-ratio: auto; height: 104px; color: var(--sky-ink); }
  .sky .win { display: grid; grid-template-columns: 40px repeat(5, 1fr); align-content: center; align-items: center; gap: 6px 0; padding: 6px 8px; }
  .sky .place, .sky em { font-size: 6.5px; font-style: normal; font-weight: 600; line-height: 1.1; letter-spacing: .04em; text-transform: uppercase; }
  .sky em { text-align: left; opacity: .7; }
  .sky .win i { justify-self: center; width: 8px; height: 8px; border-radius: 50%; background: var(--sky-off); }
  .sky .win i.lit { background: var(--sky-on); box-shadow: var(--sky-glow, none); }
  .sky .win em:nth-of-type(2) ~ i.lit { background: var(--sky-next, var(--sky-on)); }
  .slip { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
  .unlit .slip { opacity: .15; }
  .meter .pic { flex: none; width: 20px; height: 20px; margin: 0; fill: currentColor; } .meter .pic .line { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .days .win { display: flex; flex-wrap: nowrap; align-items: stretch; justify-content: space-around; gap: 4px; padding: 5px 6px; }
  .day { display: flex; flex: 1 1 0; min-width: 0; flex-direction: column; align-items: center; justify-content: space-between; font-size: 6.5px; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
  /* Its own children only: a nixie tube's figures are b and u too. */
  .day > b { font-size: 8px; font-weight: 600; letter-spacing: .18em; } .day > u, .day > s { text-decoration: none; } .day > s { opacity: .7; }
  .meter .day .pic { width: 17px; height: 17px; }
  .days .figs { --t: 2px; --h: 6px; --w: 9px; } .days .nixies { --fig: 17px; }
`;
