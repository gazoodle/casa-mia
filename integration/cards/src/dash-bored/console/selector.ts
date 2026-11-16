// A selector switch, for a room's scenes: a pointer knob with a numbered stop for each,
// and under it a legend plate that says what each number is. It is the same in every era,
// as a pointer knob was from the 1950s to the 1990s: its lettering takes the panel's own
// colour and typeface, and the knob is black on any of them. A press on a number or on
// its line of the legend turns the switch there.
//
// A scene has no state of its own to show, only when Home Assistant last set it. So the
// pointer says which of these scenes was set last, not that the room is still as that
// scene left it; with none ever set it hangs straight down, at no stop.
import { css, html } from "lit";

const SWEEP = 270; // degrees: from the first stop round to the last
export const STOPS = 10; // the most stops on one switch: a room with more scenes has a second switch
const REST = 180; // degrees: where the pointer hangs with no scene set

/** Where stop `i` of `of` is round the knob, in degrees from straight up. */
const bearing = (i: number, of: number) => (of < 2 ? 0 : -SWEEP / 2 + (SWEEP * i) / (of - 1));

/** `name` is whose scenes they are, for a screen reader; `stops` are the scenes' names;
 * `at` is the stop the pointer is at, or -1; `turn` is told the stop that was pressed. */
export const selector = (name: string, stops: string[], at: number, turn: (stop: number) => void) => html`<div class="selector" role="radiogroup" aria-label="${name} scenes">
  <div class="rotary">
    ${stops.map((_, i) => html`<button class="stop" tabindex="-1" aria-hidden="true" style="--a: ${bearing(i, stops.length)}deg" @click=${() => turn(i)}>${i + 1}</button>`)}
    <span class="pointer" style="--a: ${at < 0 ? REST : bearing(at, stops.length)}deg"></span>
  </div>
  <ol class="legend">${stops.map((stop, i) => html`<li><button role="radio" aria-checked=${i === at} title=${stop} @click=${() => turn(i)}><b>${i + 1}</b><span>${stop}</span></button></li>`)}</ol>
</div>`;

// Its size is fixed whatever its legend says (balance.ts counts on it): a line of the
// legend is 15 px, and a name too long for its line is cut short there, with the whole of
// it in its title.
export const SELECTOR = css`
  /* It gives up a little width in a chassis that stands off from a floor's bar: its legend is cut short there. */
  .selector { flex: 0 1 134px; min-width: 104px; margin-top: 8px; text-align: left; }
  .rotary { position: relative; width: 104px; height: 104px; margin: 0 auto 6px; }
  .rotary .stop { position: absolute; left: 50%; top: 50%; width: 20px; height: 20px; margin: -10px; border-radius: 50%; text-align: center; font-size: 10px; font-weight: 600; line-height: 20px; cursor: pointer;
    transform: rotate(var(--a)) translateY(-42px) rotate(calc(var(--a) * -1)); }
  .pointer { position: absolute; inset: 24px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 34% 28%, #5a5a5a, #111 70%);
    box-shadow: 0 5px 7px rgba(0,0,0,.6), 0 0 0 2px #000, 0 0 0 3.5px #8f8f86; transform: rotate(var(--a)); transition: transform .25s; }
  .pointer::after { content: ""; position: absolute; left: 50%; top: -7px; width: 9px; height: 35px; margin-left: -4.5px; border-radius: 4.5px 4.5px 2px 2px;
    background: linear-gradient(90deg, #1a1a1a, #6a6a6a 45%, #1a1a1a); box-shadow: inset 0 4px 0 #f4f0e4, 0 1px 2px rgba(0,0,0,.6); }
  .legend { margin: 0; padding: 0; list-style: none; }
  .legend button { display: flex; align-items: center; gap: 5px; box-sizing: border-box; width: 100%; height: 15px; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; opacity: .72; cursor: pointer; }
  .legend b { flex: none; width: 12px; text-align: right; }
  .legend span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .legend button[aria-checked="true"] { opacity: 1; font-weight: 700; }
  .legend button:focus-visible, .rotary .stop:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
  @media (prefers-reduced-motion: reduce) { .pointer { transition: none; } }
`;
