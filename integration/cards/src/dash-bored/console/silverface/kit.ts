// Silverface's control kit, to the shape in ../kit.ts: the Console as the hi-fi and bench
// instruments of the 1970s. Brushed aluminium, black screen-printed legends, chrome
// toggle switches, back-lit meters and the first red LEDs. ../panel.ts puts the controls
// on the panel and acts on what is pressed; styles.ts is their look and how they move.
import { html, nothing, svg, type TemplateResult } from "lit";
import { swing } from "../bakelite/kit.ts";

// A thumbwheel and a screen are the same parts in every era, dressed by the era's
// stylesheet: black plastic wheels here, and a colour tube.
export { tv, wheels } from "../bakelite/kit.ts";

/** The gradients the controls are filled with. Once in each shadow root that draws any. */
export const DEFS = html`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#6d7175"/><stop offset=".28" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#a9adb1"/><stop offset=".72" stop-color="#e3e6e8"/><stop offset="1" stop-color="#55595d"/></linearGradient>
  <linearGradient id="nut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f4f5"/><stop offset=".5" stop-color="#8d9195"/><stop offset="1" stop-color="#d5d8da"/></linearGradient>
  <linearGradient id="dial" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fbf4"/><stop offset=".45" stop-color="#9fe3d2"/><stop offset="1" stop-color="#3f9d94"/></linearGradient>
  <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9390"/><stop offset="1" stop-color="#565d5b"/></linearGradient>
  <linearGradient id="moulded" x1="0" x2="1"><stop offset="0" stop-color="#a51013"/><stop offset=".2" stop-color="#f0322e"/><stop offset=".55" stop-color="#d81b1d"/><stop offset=".85" stop-color="#b01316"/><stop offset="1" stop-color="#8a0c0f"/></linearGradient>
  <radialGradient id="lens" cx=".4" cy=".35"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs></svg>`;

/** A legend. Most are black capitals screen-printed on the aluminium. Some are embossed
 * tape from a label maker (styles.ts says which, by where they are), and for those each
 * letter is an element of its own: the tape's letters are struck one at a time, so each
 * sits a little high or low and a little turned. `--y` and `--r` are how far, the same
 * each time the same letter is drawn in the same place. Words are kept whole when a
 * legend wraps. */
export const label = (text: string) => html`<span class="label" role="img" aria-label=${text}>${text.split(" ").map(
  (word, w) => html`<span class="word">${[...word].map((ch, i) => {
    const n = ch.charCodeAt(0) * 31 + i * 17 + w * 7;
    return html`<i style="--y: ${(((n % 11) - 5) * 0.22).toFixed(2)}px; --r: ${(((n % 7) - 3) * 0.55).toFixed(2)}deg">${ch}</i>`;
  })}</span> `,
)}</span>`;

// Which of a seven-segment digit's bars are lit, a to g: top, the two right, bottom, the
// two left, middle.
export const BARS: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g" };
const DIM = "#3a0d0a"; // a bar that is not lit
const BAR: Record<string, string> = { a: "M2.5,1 H7.5", b: "M9,2.5 V8", c: "M9,10 V15.5", d: "M2.5,17 H7.5", e: "M1,10 V15.5", f: "M1,2.5 V8", g: "M2.5,9 H7.5" };

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

/** A setting in red seven-segment digits behind a dark window: "21.5°", "45%". The bars
 * that are not lit can just be seen, as on the real thing: a space is a figure with
 * none lit. A per cent sign is not drawn: no display of the time had one. A display that
 * is not `lit` has every bar, its point and its degree sign dark. */
export function readout(text: string, lit = true): TemplateResult {
  let x = 3;
  const red = lit ? "#ff3a22" : DIM;
  const cells = [...text.replace("%", "")].map((ch) => {
    const here = x;
    if (ch === ".") return ((x += 4), svg`<circle cx=${here} cy="17" r="1" fill=${red}/>`);
    x += 12;
    if (ch === "°") return svg`<path d="M${here + 1},1 h4 v4 h-4 z" fill="none" stroke=${red} stroke-width="1.3"/>`;
    return svg`<g transform="translate(${here} 0)" stroke-width="1.7" stroke-linecap="round">${Object.entries(BAR).map(([bar, d]) => svg`<path d=${d} stroke=${BARS[ch]?.includes(bar) ? red : DIM}/>`)}</g>`;
  });
  return html`<svg class="readout" viewBox="0 -3 ${x + 2} 24" height="22" role="img" aria-label=${text}><rect x="0" y="-3" width=${x + 2} height="24" rx="2" fill="#160504"/>${cells}</svg>`;
}

// A point on a meter's face, `r` from the needle's pivot and `deg` from straight up.
const at = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(60 + r * Math.cos(a)).toFixed(1)},${(74 + r * Math.sin(a)).toFixed(1)}`;
};
const LEGEND: Record<string, string> = { "°C": "TEMPERATURE °C", kW: "POWER kW" };
// As Bakelite's: a prime for each meter, so that no two needles waver in step.
const BEATS = [53, 97, 61, 83, 71, 59, 89, 67, 79, 73];
const MARKS = Array.from({ length: 21 }, (_, i) => svg`<path d="M${at(50, -50 + i * 5)} L${at(i % 4 ? 53 : 56, -50 + i * 5)}" stroke=${i > 16 ? "#c9170f" : "#101614"} stroke-width=${i % 4 ? 0.6 : 1.1}/>`);

/** A panel meter of the 1970s, with a scale from `lo` to `hi`: a rectangular window with
 * a back-lit face in the blue-green of a tuner's dial, a fine black needle and the last
 * fifth of its scale in red. `beat` chooses how fast its needle wavers. Unlit, its face is grey. */
export function meter(title: string, lo: number, hi: number, value: number, unit: string, beat = 0, lit = true): TemplateResult {
  const figures = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = at(41, -50 + i * 20).split(",");
    return svg`<text x=${x} y=${Number(y) + 2}>${+(lo + ((hi - lo) * i) / 5).toFixed(1)}</text>`;
  });
  return html`<div class="meter">
    <svg viewBox="0 0 120 84" role="img" aria-label="${title}: ${value} ${unit}">
      <rect x="1" y="1" width="118" height="82" rx="4" fill="#101112"/><rect x="1.5" y="1.5" width="117" height="81" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".2"/>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="url(#${lit ? "dial" : "dark"})"/>
      ${lit ? svg`<rect x="7" y="7" width="106" height="20" rx="2" fill="#fff" opacity=".22"/>` : nothing}
      <path d="M${at(50, -50)} A50,50 0 0 1 ${at(50, 34)}" fill="none" stroke="#101614" stroke-width=".8"/><path d="M${at(50, 34)} A50,50 0 0 1 ${at(50, 50)}" fill="none" stroke="#c9170f" stroke-width="2"/>
      ${MARKS}${figures}<text class="legend" x="60" y="60">${LEGEND[unit] ?? unit}</text>
      <clipPath id="window"><rect x="7" y="7" width="106" height="58" rx="2"/></clipPath>
      <g clip-path="url(#window)"><g class="needle" style="transform: rotate(${swing(value, lo, hi).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${BEATS[beat % BEATS.length] * 16}ms"><path d="M60,74 V19" stroke="#0b0d0c" stroke-width=".9"/></g></g></g>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6"/><path d="M11,10 L52,10 L38,34 L11,34 Z" fill="#fff" opacity=".1"/>
      <circle cx="60" cy="74" r="4" fill="#1d1f20" stroke="#000"/><path d="M57,74 h6" stroke="#000" stroke-width="1.1"/>
    </svg>
    ${label(title)}
  </div>`;
}

/** An annunciator's window for an alert: a back-lit tile with the level on it. Its colour
 * is the element's `--glow`, set by its class in styles.ts. */
export const jewel = (sort: string) => html`<span class="jewel ${sort}" aria-hidden="true">${sort}</span>`;

/** A room's lights, as a row of five red LEDs: the more light, the more are lit. `heat`
 * is as Bakelite's valve takes it, 0 for dark and from about a third to 1 for lit. */
export const valve = (heat: number) => {
  const lit = heat ? Math.max(1, Math.round(((heat - 0.35) / 0.65) * 5)) : 0;
  return html`<div class="leds" role="img" aria-label="Lights: ${lit} of 5">${[0, 1, 2, 3, 4].map((i) => html`<span class=${i < lit ? "on" : ""}></span>`)}</div>`;
};

// How wide a switch's tag is for its word, which is set in capitals.
const tag = (word: string) => +(word.length * 3.05 + 5).toFixed(1);
// The threads of a toggle switch's bush, seen end on: rings inside the nut.
const THREADS = [7.4, 6.6, 5.8].map((r) => svg`<circle cx="29" cy="46" r=${r} fill="none" stroke="#4b4f53" stroke-width=".45"/>`);
// A switch guard's hinge spring: a coil round the pin, between the cover's two ears.
const COIL = Array.from({ length: 7 }, (_, i) => `M${25.4 + i * 1.2},1.6 v5.8`).join(" ");

/** A toggle switch, seen from the front: a threaded bush and its nut, a chrome lever that
 * fattens to a rounded tip, and ON and OFF on tags, with a red pilot lamp. Up is on. A
 * device that is not answering has its lamp out and its legend struck through.
 *
 * `guard` is for a switch under a switch guard, after the real thing: a black steel base
 * plate that the switch's nut holds down, and a cover of red moulded plastic that swings
 * on a pin with a coil spring and a screw. The cover has two ears round the pin, stepped
 * shoulders and a raised spine down its back. It is drawn twice, "shut" over the lever
 * and "up", standing open with its hollow side showing; styles.ts shows the one that
 * applies. Under a guard `on` is thrown, away from rest, and the guard is only ever shut
 * over a switch at rest, as a real one is. `ends` is what the two tags say, up and down.
 * `says` is what a screen reader is told of the switch beside its name. The nut, the
 * lever and a little round them are the switch itself (`throw`): under a lifted guard, a
 * press there is the one that throws it. */
export const dolly = (name: string, on: boolean, away: boolean, press: (e: Event) => void, guard: "" | "shut" | "up" = "", says = "", ends = ["On", "Off"]) => html`<button class="dolly ${on ? "on" : ""} ${away ? "away" : ""} ${guard}" aria-pressed=${on} aria-label=${away ? `${name}: not answering` : name + says} @click=${press}>
  <svg viewBox=${guard ? "0 -30 64 114" : "0 0 64 84"}>
    ${guard ? svg`<path d="M12.5,-3 h33 q2,0 2,2 v82 q0,2 -2,2 h-33 q-2,0 -2,-2 v-82 q0,-2 2,-2 z" fill="#1d1e20" stroke="#000" stroke-width=".6"/><path d="M11.4,-1 v80" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/>` : svg`<rect x="12" y="9" width="34" height="74" rx="2" fill="#141516"/>`}
    <rect x=${29 - tag(ends[0]) / 2} y="12.4" width=${tag(ends[0])} height="7.2" rx="1" fill="#c9170f"/><text class="onoff" x="29" y="18">${ends[0]}</text>
    <rect x=${29 - tag(ends[1]) / 2} y="73.4" width=${tag(ends[1])} height="7.2" rx="1" fill="#050505" stroke="#e9e9e7" stroke-width=".4"/><text class="onoff" x="29" y="79">${ends[1]}</text>
    <circle cx="54" cy="76" r="6.5" fill="url(#nut)" stroke="#444" stroke-width=".6"/><circle class="pilot" cx="54" cy="76" r="4.3"/><circle cx="54" cy="76" r="4.3" fill="url(#lens)"/>
    <g class="throw"><circle cx="29" cy="46" r="17" fill="transparent"/><circle cx="29" cy="46.8" r="12.4" fill="#000" opacity=".45"/>
    <path d="M29,34.6 l9.9,5.7 v11.4 l-9.9,5.7 l-9.9,-5.7 v-11.4 z" fill="url(#nut)" stroke="#33363a" stroke-width=".7"/><path d="M29,34.6 l9.9,5.7 M19.1,51.7 l9.9,5.7" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>
    <circle cx="29" cy="46" r="8.4" fill="url(#chrome)" stroke="#33363a" stroke-width=".6"/>${THREADS}<circle cx="29" cy="46" r="4.6" fill="#0d0e0f"/><circle cx="29" cy="46" r="3.5" fill="url(#nut)"/>
    <g class="lever"><path d="M28.6,48 L27.2,31 Q27.2,26 31.2,26 Q35.2,26 35.2,31 L33.4,48 Z" fill="#000" opacity=".3"/>
      <path d="M26.7,46 L24.9,29.5 Q24.9,23.6 29,23.6 Q33.1,23.6 33.1,29.5 L31.3,46 Z" fill="url(#chrome)" stroke="#2f3235" stroke-width=".6"/>
      <path d="M27,29 L28,44" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="29" cy="26.8" rx="3.3" ry="2.2" fill="#fff" opacity=".6"/></g></g>
    ${guard
      ? svg`<g class="shell shut-shell">
            <path d="M19,10 V4 Q19,.6 21.5,.6 Q24,.6 24,4 V9 H34 V4 Q34,.6 36.5,.6 Q39,.6 39,4 V10 L43.2,15.5 L44.6,22 V60 Q44.6,70.5 36,70.5 H22 Q13.4,70.5 13.4,60 V22 L14.8,15.5 Z" fill="url(#moulded)" stroke="#5a0709" stroke-width=".7"/>
            <path d="M41.6,17.5 L43,22.5 V60 Q43,67.5 36.5,69" fill="none" stroke="#7d0a0d" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/><path d="M15.6,23 V58" stroke="#ff9488" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M24.6,12 H33.4 L34.6,45 Q34.6,52.5 29,52.5 Q23.4,52.5 23.4,45 Z" fill="url(#moulded)" stroke="#6a080a" stroke-width=".5"/><path d="M25.3,13.5 L24.5,44" stroke="#ffb0a6" stroke-opacity=".8" stroke-width="1" stroke-linecap="round"/><path d="M33,13.5 L33.8,45" stroke="#6a080a" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>
            <ellipse cx="19.8" cy="34" rx="1.8" ry="11" fill="#fff" opacity=".28"/><path d="M16.5,62 Q29,71 41.5,62" fill="none" stroke="#6a080a" stroke-opacity=".5" stroke-width="1.1"/>
            <path d="M19.8,4 v5.4 M38.2,4 v5.4" stroke="#ff9488" stroke-opacity=".6" stroke-width=".8"/></g>
          <g class="shell up-shell">
            <path d="M19,7 V3 h5 V6 H34 V3 h5 V7 L44.3,1 L45.4,-10 Q46,-27.5 34.5,-27.5 H23.5 Q12,-27.5 12.6,-10 L13.7,1 Z" fill="url(#moulded)" stroke="#5a0709" stroke-width=".7"/>
            <path d="M17.4,1.5 L16.6,-10 Q16.2,-23.6 24.6,-23.6 H33.4 Q41.8,-23.6 41.4,-10 L40.6,1.5 Q29,5 17.4,1.5 Z" fill="#650a0c"/><path d="M17.4,1.5 Q29,5 40.6,1.5 L40.2,-4 Q29,-.5 17.8,-4 Z" fill="#b3181a" opacity=".55"/>
            <path d="M25,-23 H33 L33.8,-3 Q29,-1.6 24.2,-3 Z" fill="#3f0607" opacity=".85"/><path d="M25.4,-22 L24.8,-4" stroke="#000" stroke-opacity=".4" stroke-width=".9"/>
            <path d="M14.8,-10 Q14.4,-25.6 24,-25.6 H34" fill="none" stroke="#ffa59a" stroke-opacity=".8" stroke-width="1.1" stroke-linecap="round"/><path d="M43.6,-9 Q43.8,-20 39.5,-24.2" fill="none" stroke="#6a080a" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/></g>
          <path d="M14.5,-.4 h6 v9.6 h-6 z M37.5,-.4 h6 v9.6 h-6 z" fill="#27282a" stroke="#000" stroke-width=".5"/><path d="M12.5,4.5 H45" stroke="url(#chrome)" stroke-width="2.3"/><path d="M12.5,3.7 H45" stroke="#fff" stroke-opacity=".7" stroke-width=".5"/>
          <rect x="25" y="1.4" width="8.4" height="6.2" rx="1" fill="#aeb2b6"/><path d="${COIL}" stroke="#4d5154" stroke-width=".55"/>
          <circle cx="46" cy="4.5" r="2.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".5"/><path d="M44.4,4.5 h3.2 M46,2.9 v3.2" stroke="#2f3235" stroke-width=".7"/><circle cx="12.4" cy="4.5" r="1.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".4"/>`
      : nothing}
  </svg>
  ${label(name)}
</button>`;

// The scale round a knob: eleven lines printed on the aluminium.
const TICKS = Array.from({ length: 11 }, (_, i) => {
  const a = ((-135 + i * 27 - 90) * Math.PI) / 180;
  const end = (r: number) => `${(52 + r * Math.cos(a)).toFixed(1)},${(52 + r * Math.sin(a)).toFixed(1)}`;
  return svg`<path d="M${end(41)} L${end(i % 5 ? 46 : 49)}" stroke="#141516" stroke-width=${i % 5 ? 0.9 : 1.8}/>`;
});

// A point on a thermostat's dial, `r` from its middle and `deg` from straight up.
const round = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(52 + r * Math.cos(a)).toFixed(1)},${(52 + r * Math.sin(a)).toFixed(1)}`;
};
const COOL = "#1f8f45";
const WARM = "#e2512a";
// The dial's scale: twenty divisions over three quarters of a turn, a longer mark at each fifth.
const DIVISIONS = Array.from({ length: 21 }, (_, i) => {
  const deg = -135 + i * 13.5;
  return svg`<path d="M${round(i % 5 ? 26.5 : 25, deg)} L${round(30, deg)}" stroke=${i < 10 ? COOL : i > 10 ? WARM : "#141516"} stroke-width=${i % 5 ? 0.8 : 1.4}/>`;
});

/** A thermostat's dial, after a ship's control board: a square black housing with a screw
 * in each corner and a round white face. Its scale runs from `lo` to `hi` over three
 * quarters of a turn, the cooler half in green and the warmer in red, close round the knob
 * with its figures outside it. The knob that sets the target goes in its middle, and a thin red hand shows what the thermostat `reads`. */
function thermostat(lo: number, hi: number, reads?: number) {
  const figures = [0, 1, 2, 3, 4].map((i) => {
    const [x, y] = round(37.2, -135 + i * 67.5).split(",");
    return svg`<text x=${x} y=${Number(y) + 2.2} fill=${i < 2 ? COOL : i > 2 ? WARM : "#141516"}>${Math.round(lo + ((hi - lo) * i) / 4)}</text>`;
  });
  const hand = reads === undefined ? undefined : -135 + 270 * Math.min(1, Math.max(0, (reads - lo) / (hi - lo)));
  return svg`<rect x="2.5" y="2.5" width="99" height="99" rx="7" fill="#121314" stroke="#000"/><rect x="3.5" y="3.5" width="97" height="97" rx="6" fill="none" stroke="#fff" stroke-opacity=".16"/>
    ${[[10, 10], [94, 10], [10, 94], [94, 94]].map(([x, y]) => svg`<circle cx=${x} cy=${y} r="2.6" fill="url(#nut)" stroke="#000" stroke-width=".4"/><path d="M${x - 1.6},${y - 1.1} l3.2,2.2" stroke="#2a2c2e" stroke-width=".8"/>`)}
    <circle cx="52" cy="52" r="44.5" fill="#000"/><circle class="face" cx="52" cy="52" r="42.5"/>
    <path d="M${round(31.3, -135)} A31.3,31.3 0 0 1 ${round(31.3, 0)}" fill="none" stroke=${COOL} stroke-width="2.4"/><path d="M${round(31.3, 0)} A31.3,31.3 0 0 1 ${round(31.3, 135)}" fill="none" stroke=${WARM} stroke-width="2.4"/>
    ${DIVISIONS}<g class="figures">${figures}</g>
    ${hand === undefined ? nothing : svg`<g class="hand" style="transform: rotate(${hand.toFixed(1)}deg)"><path d="M52,52 V14" stroke="#d0180f" stroke-width=".9"/><path d="M52,10.5 l-1.9,4.4 h3.8 z" fill="#d0180f"/></g>`}
    <path d="M20,30 A38,38 0 0 1 48,13" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
}

/** A machined aluminium knob over its printed scale, turned to `level` per cent of its
 * travel. Its arguments are as Bakelite's knob takes them. A setting that ends in a
 * number ("Thermostat 21°") is shown in red digits under the knob, and the rest of it as
 * the legend. The heating's knob is a pointer knob in the middle of a dial of its own
 * (`thermostat`), which `scale` and `reads` are for. A note is label tape, as somebody's own addition, unless it is a reading
 * ("now 25°"), which is printed. The knob's edge and its line turn; the light on its face stays where it is. */
export const knob = (name: string, sort: string, what: string, level: number, held: boolean, said: string, note: string, on: { down(e: PointerEvent): void; move(e: PointerEvent): void; up(e: PointerEvent): void; drop(): void; key(e: KeyboardEvent): void }, scale: number[] = [0, 100], reads?: number) => {
  // The display is part of the panel: it is there whether the device is on or off, and
  // always as wide. A thermostat that is off has a dark display.
  const { legend, shown, lit } = plate(name, sort, scale);
  const display = shown === undefined ? nothing : readout(shown, lit);
  // A player's tape has a place kept for it, so that a song starting moves nothing.
  const tape = note || sort === "sound";
  return html`<div class="dial ${sort}">
    <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${sort === "heat" ? thermostat(scale[0], scale[1], reads) : TICKS}</svg>
      <div class="knob ${sort} ${held ? "drag" : ""}" role="slider" tabindex="0" aria-label="${name} ${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(level)} aria-valuetext=${said} style="--lvl: ${level.toFixed(1)}"
        @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.drop} @keydown=${on.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
    ${label(legend)}${display}${tape ? html`<span class="note ${/^now /.test(note) ? "reading" : ""}">${note ? label(note) : nothing}</span>` : nothing}
  </div>`;
};

/** A square key with its legend under it. */
export const push = (name: string, press: () => void) => html`<button class="push" @click=${press}><span class="key"></span>${label(name)}</button>`;

/** An illuminated push button, for a scene, with its legend on its face. It is lit for a
 * moment after it is pressed. */
export const knife = (name: string, closed: boolean, press: () => void) => html`<button class="knife ${closed ? "closed" : ""}" @click=${press}><span class="key">${name}</span></button>`;
