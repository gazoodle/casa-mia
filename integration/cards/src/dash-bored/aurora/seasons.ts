// Aurora's season and holiday skins (owner, 2026-11-16: "snow, daisies, sandcastle,
// presents"). Each is a skin's colours (skins.ts) with decorations, and a decoration
// never moves a tile or takes a press: what drifts is over the page, the strip is along
// the foot of the page either side of the bar, the drawing is in the greeting tile's
// empty corner, and the top is along the page's top edge. art.ts has the drawings.
// The Almanac wears whichever of them the date calls for.
import { html, nothing, svg } from "lit";
import { FEET, GLYPHS, HEROES, MACHINES } from "./art.ts";
import { MOVES, PILE } from "./drift.ts";

/** What drifts, and how many. How it moves is its drawing's (drift.ts MOVES); one with no move there bursts where it is. */
type Drift = { glyph: keyof typeof GLYPHS; count: number; hues?: number[]; colour?: string };
export type Decor = { drift?: Drift; foot?: keyof typeof FEET; hero?: keyof typeof HEROES; top?: "lights" | "web" | "sun" };

export const DECORS: Record<string, Decor> = {
  snow: { drift: { glyph: "flake", count: 26 }, foot: "drift", hero: "snowman" },
  christmas: { drift: { glyph: "flake", count: 10 }, foot: "presents", hero: "tree", top: "lights" },
  fireworks: { drift: { glyph: "burst", count: 9, hues: [20, 60, 140, 200, 300, 340] }, foot: "skyline", hero: "clock" },
  valentine: { drift: { glyph: "heart", count: 14, hues: [0, 350, 15, 330] }, hero: "heart" },
  spring: { drift: { glyph: "petal", count: 12, colour: "#f3a6c4" }, foot: "meadow", hero: "daisies" },
  easter: { drift: { glyph: "petal", count: 8, colour: "#c9b6f0" }, foot: "eggs", hero: "bunny" },
  summer: { drift: { glyph: "gull", count: 3, colour: "#51606e" }, foot: "sea", hero: "sandcastle", top: "sun" },
  autumn: { drift: { glyph: "leaf", count: 16, hues: [35, 55, 25, 80] }, foot: "leaves", hero: "hedgehog" },
  halloween: { drift: { glyph: "bat", count: 5, colour: "#1b1422" }, foot: "graves", hero: "lantern", top: "web" },
};

/** Easter Sunday of a year, as [month from 1, day] (the Gregorian reckoning, by Meeus's method). */
export function easter(year: number): [number, number] {
  const a = year % 19;
  const [b, c] = [Math.floor(year / 100), year % 100];
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return [Math.floor(n / 31), (n % 31) + 1];
}

// The days that have a skin of their own, as [skin, from month, day, to month, day, the
// country it is kept in if only one]. The first that holds the date wins.
const DAYS: [string, number, number, number, number, string?][] = [
  ["fireworks", 12, 31, 12, 31], ["fireworks", 1, 1, 1, 1], ["fireworks", 11, 5, 11, 5, "GB"], ["fireworks", 7, 4, 7, 4, "US"],
  ["christmas", 12, 1, 12, 26], ["valentine", 2, 14, 2, 14], ["halloween", 10, 25, 10, 31],
];
const SEASONS = ["snow", "spring", "summer", "autumn"]; // from December, three months each, north of the equator

/** The skin a date calls for: a holiday's on its days (Easter from Good Friday to Easter
 * Monday), else the season's. South of the equator the seasons are the other way round. */
export function almanac(at: Date, south = false, country = ""): string {
  const [month, day] = [at.getMonth() + 1, at.getDate()];
  const on = month * 100 + day;
  const held = DAYS.find(([, m1, d1, m2, d2, where]) => on >= m1 * 100 + d1 && on <= m2 * 100 + d2 && (!where || where === country));
  if (held) return held[0];

  const [em, ed] = easter(at.getFullYear());
  const since = Math.round((new Date(at.getFullYear(), month - 1, day).getTime() - new Date(at.getFullYear(), em - 1, ed).getTime()) / 86_400_000);
  if (since >= -2 && since <= 1) return "easter";
  return SEASONS[(Math.floor((month % 12) / 3) + (south ? 2 : 0)) % 4];
}

/** A number from 0 up to 1 for the `i`th of something, the same each time, so a page drawn again has each thing the size it was. */
const spread = (i: number, salt: number) => ((i * 61.803 + salt * 37.7) % 100) / 100;

// A firework is where it is, and bursts by the stylesheet alone. Anything else is moved by
// drifting.ts: as many drawings as are in the air, and as many again as can lie about
// if a machine tidies them, with the machine and somewhere for the heaps to be drawn.
function drifting({ glyph, count, hues, colour }: Drift) {
  const move = MOVES[glyph];
  const many = count + (move?.tidy ? PILE : 0);
  const things = Array.from({ length: many }, (_, i) => {
    const paint = colour ? `color: ${colour}` : hues ? `color: oklch(.72 .2 ${hues[i % hues.length]})` : "";
    if (move) return html`<svg class="m" viewBox="0 0 24 24" style="--s: ${((move.how === "cross" ? 22 : 10) + spread(i, 1) * 16).toFixed(0)}px; ${paint}">${GLYPHS[glyph]}</svg>`;

    const lasts = 2.4 + spread(i, 2) * 1.6;
    return html`<svg class="p" viewBox="0 0 24 24" style="--x: ${(spread(i, 3) * 100).toFixed(1)}%; --y: ${(8 + spread(i, 4) * 55).toFixed(1)}%; --s: ${(90 + spread(i, 1) * 110).toFixed(0)}px; --d: ${lasts.toFixed(1)}s; --w: -${(spread(i, 5) * lasts * 3).toFixed(1)}s; ${paint}">${GLYPHS[glyph]}</svg>`;
  });
  return [move?.tidy ? html`<svg class="heaps" width="100%" height="100%"></svg>` : nothing, things, move?.tidy ? html`<svg class="machine" viewBox="0 -12 60 56">${MACHINES[move.tidy]}</svg>` : nothing];
}

// A string of fairy lights along the top, a bulb every 40 px: it hangs in loops of 120.
const lights = (wide: number) =>
  html`<svg class="top" width=${wide} height="46" viewBox="0 0 ${wide} 46">
    <path d="M0 6${Array.from({ length: Math.ceil(wide / 120) }, () => "q60 26 120 0").join("")}" fill="none" stroke="#3a3f4a" stroke-width="1.6"/>
    ${Array.from({ length: Math.ceil(wide / 40) }, (_, i) => {
      const along = ((i * 40 + 20) % 120) / 120;
      return svg`<ellipse class="twinkle" cx=${i * 40 + 20} cy=${12 + 52 * along * (1 - along)} rx="4.5" ry="6.5" fill="oklch(.74 .2 ${[25, 140, 85, 260, 330][i % 5]})" style="animation-delay: -${(i * 0.7) % 3}s"/>`;
    })}
  </svg>`;
// A cobweb in the top right corner, with its spider on a thread. It was in the left, over the greeting's date.
const web = html`<svg class="top flip" width="150" height="190" viewBox="0 0 150 190">
    <path d="M0 0L140 20M0 0L110 70M0 0L60 120M0 0L10 140M132 19Q104 34 104 66 76 72 57 113 30 108 9 132M90 13Q72 24 71 45 52 50 39 78 22 74 6 90M46 6Q38 12 36 23 26 26 20 40 10 38 3 46" fill="none" stroke="#fff" stroke-width="1.3" opacity=".8"/>
    <g class="bob"><path d="M84 46V150" stroke="#fff" stroke-width="1" opacity=".8"/><circle cx="84" cy="158" r="9" fill="#1b1422"/><circle cx="84" cy="148" r="5" fill="#1b1422"/>
      <path d="M76 154l-12-6m12 10l-13 0m13 4l-11 7M92 154l12-6m-12 10l13 0m-13 4l11 7" stroke="#1b1422" stroke-width="2" stroke-linecap="round"/></g>
  </svg>`;
// The sun, half over the top right corner, its rays turning.
const sun = html`<svg class="top right" width="150" height="150" viewBox="-75 -75 150 150">
    <g class="turn">${Array.from({ length: 12 }, (_, i) => svg`<path d="M0-46V-66" stroke="#f5c542" stroke-width="6" stroke-linecap="round" transform="rotate(${i * 30})"/>`)}</g>
    <circle r="36" fill="#f7d355"/>
  </svg>`;

/** A skin's decorations over a page `wide` px. They take no press, and are nothing to a screen reader. */
export function decorated(decor: Decor, wide: number) {
  return html`<div class="season" aria-hidden="true" data-glyph=${decor.drift?.glyph ?? ""} data-count=${decor.drift?.count ?? 0}>
    ${decor.foot ? html`<svg class="foot" width="100%" height="74"><defs><pattern id="aurora-foot" width="240" height="74" patternUnits="userSpaceOnUse">${FEET[decor.foot]}</pattern></defs><rect width="100%" height="74" fill="url(#aurora-foot)"/></svg>` : nothing}
    ${decor.top === "lights" ? lights(wide) : decor.top === "web" ? web : decor.top === "sun" ? sun : nothing}
    ${decor.drift ? drifting(decor.drift) : nothing}
  </div>`;
}

/** The drawing in the greeting tile's corner. */
export const motif = (decor: Decor, at: Date) => (decor.hero ? html`<svg class="motif" viewBox="0 0 200 160" aria-hidden="true">${HEROES[decor.hero](at)}</svg>` : nothing);
