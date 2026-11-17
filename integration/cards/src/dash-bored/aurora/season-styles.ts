// How Aurora's season and holiday skins are decorated (seasons.ts): where each
// decoration is, and how it moves. Everything moves by transform or opacity alone, and
// nothing moves for somebody who has asked for less motion.
import { css } from "lit";

export const SEASONS = css`
  .season { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
  .season > * { position: absolute; }
  .foot { left: 0; bottom: 0; }
  .top { left: 0; top: 0; }
  .top.flip { left: auto; right: 0; scale: -1 1; } /* drawn for the left corner, shown in the right */
  .top.right { left: auto; right: -40px; top: -40px; }

  /* What drifts: each has its own place, size, time and start (seasons.ts gives them). */
  .p { left: var(--x); top: -40px; width: var(--s); height: var(--s); animation: fall var(--d) linear var(--w) infinite; }
  @keyframes fall { to { translate: var(--sway) var(--drop); rotate: var(--turn); } }
  .p.rise { top: auto; bottom: -40px; animation-name: rise; }
  @keyframes rise { to { translate: var(--sway) calc(-1 * var(--drop)); } }
  .p.cross { left: -70px; top: var(--y); animation-name: cross; }
  @keyframes cross { 25% { translate: calc(var(--span) * .25) -34px; } 50% { translate: calc(var(--span) * .5) 12px; } 75% { translate: calc(var(--span) * .75) -26px; } 100% { translate: var(--span) 0; } }
  .p.burst { top: var(--y); animation-name: burst; animation-timing-function: ease-out; }
  /* Faint, and gone quickly: a firework that lingers over a tile looks like something loading. */
  @keyframes burst { 0% { scale: 0; opacity: .7; } 40% { opacity: .6; } 100% { scale: 1; opacity: 0; } }

  /* The drawing in the greeting tile's top right corner, which the date, the greeting and
     the sentence under it leave free: at the foot it stood on the sentence. */
  .motif { position: absolute; z-index: -1; right: 4%; top: 4%; height: 35%; max-width: 40%; pointer-events: none; }
  .twinkle { animation: twinkle 3s ease-in-out infinite; }
  @keyframes twinkle { 50% { opacity: .35; } }
  .bob { animation: bob 4s ease-in-out infinite alternate; }
  @keyframes bob { to { translate: 0 -8px; } }
  .beat { transform-origin: 100px 90px; animation: beat 1.4s ease-in-out infinite; }
  @keyframes beat { 15% { scale: 1.06; } 30% { scale: 1; } 45% { scale: 1.04; } 60% { scale: 1; } }
  .wave { transform-origin: 100px 20px; animation: wave 1.6s ease-in-out infinite alternate; }
  @keyframes wave { to { transform: skewY(8deg) scaleX(.9); } }
  .turn { animation: turn 60s linear infinite; }
  @keyframes turn { to { rotate: 360deg; } }

  @media (prefers-reduced-motion: reduce) {
    .p, .twinkle, .bob, .beat, .wave, .turn { animation: none; }
    .p.burst { display: none; }
  }
`;
