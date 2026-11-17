// How Aurora's season and holiday skins are decorated (seasons.ts): where each
// decoration is, and how it moves. Everything moves by transform or opacity alone, and
// nothing moves for somebody who has asked for less motion (drifting.ts sees to its own).
import { css } from "lit";

export const SEASONS = css`
  .season { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
  .season > * { position: absolute; }
  .foot { left: 0; bottom: 0; }
  .top { left: 0; top: 0; }
  .top.flip { left: auto; right: 0; scale: -1 1; } /* drawn for the left corner, shown in the right */
  .top.right { left: auto; right: -40px; top: -40px; }

  /* What drifts is placed each frame by drifting.ts, about its own middle. One that is not on the page is hidden. */
  .m { left: 0; top: 0; width: var(--s); height: var(--s); margin: calc(var(--s) / -2); visibility: hidden; will-change: transform; }
  .machine { left: -30px; top: 0; width: 60px; height: 56px; visibility: hidden; }
  .machine .prop { display: none; }
  .machine.flying .prop { display: inline; }
  .whirr { animation: whirr .12s linear infinite alternate; }
  @keyframes whirr { to { scale: .25 1; } }
  .heaps { left: 0; top: 0; }
  .heaps path { stroke-width: 1; }
  /* A firework bursts where it is. Faint, and gone quickly: one that lingers over a tile looks like something loading. */
  .p { left: var(--x); top: var(--y); width: var(--s); height: var(--s); animation: burst var(--d) ease-out var(--w) infinite; }
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
    .twinkle, .bob, .beat, .wave, .turn, .whirr { animation: none; }
    .p { display: none; }
  }
`;
