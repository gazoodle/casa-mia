// The gauge shown in the middle of the page while a machine is made ready: a pressure
// gauge whose needle is how far along it is, with the stages named under it (owner,
// 2026-11-18: "shown immediately that the page first renders ... stages called out
// underneath"; 2026-11-20: "centered, active, progressing and useful"). It is the page's,
// not the canvas's, since there is no canvas yet: it is drawn in the skin's own line and
// materials (skins.ts).
//
// The needle is a box of its own over the dial, turned and set trembling by CSS, which a
// browser animates apart from the page's own work. An SVG needle stood still whenever the
// page was busy (measured on a big room, 2026-11-20: frozen for 2.8 s, then 2.0 s).
import { html } from "lit";

/** What making a machine ready is made of, in order, and how much of the gauge each is given. */
export const STAGES: [name: string, share: number][] = [["Survey the room", 10], ["Draw up the plans", 10], ["Build the machine", 25], ["Print the bitmaps", 50], ["Let the ducks in", 5]];
const [SURVEY, PLANS, BUILD, PRINT, DUCKS] = [0, 1, 2, 3, 4];
export const STAGE = { SURVEY, PLANS, BUILD, PRINT, DUCKS };

/** Once the page has been painted: what was set before it is on the screen. */
export const painted = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done)));

/** For work done in steps: `await` it after each step, and it lets the page paint once
 * `ms` have gone by since it last did, so the page is never held up for longer. */
export function breather(ms = 40) {
  let since = performance.now();
  return async () => {
    if (performance.now() - since < ms) return;
    await painted();
    since = performance.now();
  };
}

const SWEEP = 240; // degrees from empty to full
const ticks = Array.from({ length: 11 }, (_, i) => {
  const a = ((-SWEEP / 2 + (i * SWEEP) / 10 - 90) * Math.PI) / 180, long = i % 5 === 0 ? 14 : 8;
  return `M${(110 + 60 * Math.cos(a)).toFixed(1)},${(84 + 60 * Math.sin(a)).toFixed(1)} L${(110 + (60 - long) * Math.cos(a)).toFixed(1)},${(84 + (60 - long) * Math.sin(a)).toFixed(1)}`;
}).join(" ");

/** How far along the whole of it is, in per cent, `share` (0 to 1) of the way through `stage`. */
export const progress = (stage: number, share: number) => Math.round(STAGES.slice(0, stage).reduce((sum, [, part]) => sum + part, 0) + STAGES[stage][1] * Math.min(1, Math.max(0, share)));

/** The gauge at `stage`, `share` of the way through it, with `say` (what it is at, in numbers) under the stages. */
export function gauge(stage: number, share: number, say = "") {
  const done = progress(stage, share);
  return html`<div class="gauge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${done} aria-valuetext="${STAGES[stage][0]}, ${done} per cent">
    <div class="dial">
      <svg viewBox="0 0 220 168" aria-hidden="true">
        <path class="pipe" d="M0,84 H34 M186,84 H220" /><path class="flange" d="M22,72 v24 M198,72 v24" />
        <circle class="bezel" cx="110" cy="84" r="78" /><circle class="face" cx="110" cy="84" r="68" />
        <path class="hot" d="M162,114 A60,60 0 0 0 168.4,70.5" /><path class="ticks" d="${ticks}" />
        <text x="110" y="62" text-anchor="middle" class="maker">DUCK &amp; DRAKE, MAKERS</text>
        <text x="110" y="124" text-anchor="middle" class="read">${done}</text><text x="110" y="137" text-anchor="middle" class="maker">STEAM UP</text>
      </svg>
      <div class="quiver"><div class="needle" style="transform:rotate(${-SWEEP / 2 + (done * SWEEP) / 100}deg)">
        <svg viewBox="0 0 220 168" aria-hidden="true"><path d="M110,96 L110,32" /><path class="tip" d="M106,40 L110,26 L114,40 z" /><circle class="hub" cx="110" cy="84" r="7" /></svg>
      </div></div>
    </div>
    <ol>${STAGES.map(([name], i) => html`<li class=${i < stage ? "done" : i === stage ? "now" : ""} aria-current=${i === stage ? "step" : "false"}>${name}</li>`)}</ol>
    <p class="say">${say}</p>
  </div>`;
}
