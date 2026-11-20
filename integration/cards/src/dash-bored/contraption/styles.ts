// How Contraption's page looks round its drawing. The drawing itself is inked by the skin
// (skins.ts), whose values the page is given as custom properties.
import { css, unsafeCSS } from "lit";
import { INK } from "./skins.ts";

export const STYLES = css`
  .contraption { position: relative; box-sizing: border-box; padding: 10px 16px 12px; color: var(--line); background-color: var(--bg); font-family: var(--font); }
  .contraption[data-skin="blueprint"] { text-transform: uppercase; letter-spacing: .04em; background-size: 24px 24px;
    background-image: linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px); }
  /* Printed tin: a ground of dots. */
  .contraption[data-skin="tin"] { background-size: 22px 22px; background-image: radial-gradient(rgba(255,255,255,.22) 2.2px, transparent 2.8px); }
  /* Foxed paper, for the engraving only: darker towards the edges. */
  .contraption[data-skin="patent"]::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(110,70,20,.35)); }

  header { display: flex; align-items: flex-end; gap: 6px 20px; flex-wrap: wrap; padding: 0 0 6px; }
  h1 { font: 400 30px/1 var(--title); margin: 0; }
  header p { margin: 0 0 4px; font-size: 13.5px; font-style: italic; flex: 1; min-width: 220px; }
  .size { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .size input { accent-color: var(--line); width: 140px; }
  .size output { min-width: 4.5em; }
  .rate { font-size: 12px; opacity: .8; }
  .skins { display: flex; gap: 6px; }
  .skins button { font: inherit; font-size: 13px; color: inherit; background: none; border: 2px solid var(--line); border-radius: 4px; padding: 3px 9px; cursor: pointer; }
  .skins button[aria-pressed="true"] { background: var(--line); color: var(--bg); }
  /* The lever opens the choice of family (shell.ts), on the page only: it is drawn in the skin's own line, and leans over under the hand. */
  .lever { display: flex; align-items: center; gap: 6px; font: inherit; font-size: 13px; color: inherit; background: none; border: 2px solid var(--line); border-radius: 4px; padding: 2px 9px 2px 6px; cursor: pointer; }
  .lever svg { width: 30px; height: 26px; fill: none; stroke: var(--line); stroke-width: 2; stroke-linecap: round; overflow: visible; }
  .lever circle { fill: var(--red); }
  .lever:hover svg, .lever:active svg { transform: scaleX(-1); }
  .lever:focus-visible { outline: 2px dashed var(--line); outline-offset: 2px; }
  .skins button:focus-visible, .hit:focus-visible { outline: 2px dashed var(--line); outline-offset: -4px; }
  .notice { margin: 4px 0; padding: 6px 10px; font-size: 15px; background: var(--red); color: var(--bg); border: 2px solid var(--line); overflow-wrap: anywhere; }

  /* The gauge, while a machine is made ready (gauge.ts): over whatever is there, in the
     middle of what is seen of the element. Its top is set by the element (_centre), as the
     element may be far taller than the screen. */
  .getting { min-height: 300px; }
  .gauge { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px; pointer-events: none; }
  .gauge .dial { position: relative; width: min(280px, 70vw); }
  .gauge svg { display: block; width: 100%; overflow: visible; fill: none; stroke: var(--line); stroke-width: 2.5; stroke-linecap: round; }
  .gauge .dial > svg { filter: drop-shadow(0 3px 0 rgba(0,0,0,.18)); }
  .gauge .pipe { stroke-width: 9; } .gauge .flange { stroke-width: 5; }
  .gauge .bezel { fill: var(--brass); } .gauge .face { fill: var(--paper); stroke-width: 1.5; }
  .gauge .hot { stroke: var(--red); stroke-width: 6; stroke-linecap: butt; } .gauge .ticks { stroke-width: 1.6; }
  /* The needle turns about the hub, which is the middle of the dial's box. Both boxes are
     moved by transform only, which the browser animates by itself while the page is busy. */
  .gauge .quiver, .gauge .needle { position: absolute; inset: 0; will-change: transform; }
  .gauge .quiver { animation: quiver .7s ease-in-out infinite alternate; }
  .gauge .needle { transition: transform .45s cubic-bezier(.3,1.5,.5,1); }
  .gauge .needle svg { stroke: var(--red); stroke-width: 3; }
  @keyframes quiver { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }
  .gauge .tip { fill: var(--red); } .gauge .hub { fill: var(--brass); stroke: var(--line); stroke-width: 2.5; }
  .gauge .say { margin: 0; min-height: 1.3em; font-size: 13px; font-variant-numeric: tabular-nums; }
  .gauge text { stroke: none; fill: var(--line); font-family: var(--font); }
  .gauge .maker { font-size: 7px; letter-spacing: .08em; } .gauge .read { font-size: 20px; }
  .gauge ol { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 8px; margin: 0; padding: 0; list-style: none; max-width: 640px; }
  .gauge li { font-size: 13px; padding: 3px 10px 3px 8px; border: 2px solid var(--line); border-radius: 4px; background: var(--bg); opacity: .55; }
  .gauge li::before { content: "○ "; }
  .gauge li.done { opacity: 1; } .gauge li.done::before { content: "● "; }
  .gauge li.now { opacity: 1; background: var(--line); color: var(--bg); } .gauge li.now::before { content: "◐ "; }
  @media (prefers-reduced-motion: reduce) { .gauge .needle { transition: none; } .gauge .quiver { animation: none; } }

  /* The sheet is as big as the tiles are drawn, and is walked along sideways where it is
     wider than the screen. The canvas is only as wide as what is seen of it, and stays
     put while the sheet goes by under it: a canvas the size of a big sheet would pass a
     tablet's limit. */
  .scroll { overflow-x: auto; overflow-y: hidden; }
  .sheet { position: relative; margin: 0 auto; }
  canvas { position: sticky; left: 0; display: block; }
  /* No word from the house: the whole machine fades. */
  .stale canvas { opacity: .5; }
  /* A device's tile is a button over the drawing, for a finger, the keyboard and a screen reader. */
  .hit { all: unset; position: absolute; box-sizing: border-box; width: var(--t); height: var(--t); cursor: pointer; }

  /* Where a tile's drawing is measured before it is made into bitmaps: on the page, as it
     must be to be measured, and never seen. */
  .bench { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none; }
  ${unsafeCSS(INK)}
`;
