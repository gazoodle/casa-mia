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
