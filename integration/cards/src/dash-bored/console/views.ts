// What is laid out the same in every era: the grid the rooms' chassis stand in, the
// selector switch, and the cards that show less than the whole panel (cards.ts). Each
// era's element takes these before its own styles, so where an era says otherwise (a
// label on a plate of its own colour) the era's word stands.
import { css } from "lit";
import { SELECTOR } from "./selector.ts";

const LAYOUT = css`
  /* The rooms stand on a grid of columns (--cols, as many as fit: panel.ts). A bay is some
     of them across, where balance.ts says (panel.ts places each by its row and column),
     and holds one chassis or a few small ones, one under another. The bays of a row are
     stretched to one height, as panels in a rack are. Where a bay's chassis are shorter
     than that by enough, they keep their own height and a blanking plate is fitted under
     them (.blanked: balance.ts says); otherwise they share what is spare. balance.ts
     counts on these sizes: change them together. */
  .rooms { display: grid; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); column-gap: 12px; align-items: stretch; }
  .bay { display: flex; flex-direction: column; gap: 12px; min-width: 0; margin-bottom: 12px; }
  .room { flex: 1 1 auto; min-width: 0; align-content: start; }
  .blanked > .room { flex: 0 0 auto; }
  /* The plate is a chassis with nothing on it but a vent: its look is its era's chassis. */
  .blanked > .room.blank { flex: 1 1 0; display: flex; align-items: center; justify-content: center; min-height: 0; padding: 14px; overflow: hidden; }
  .blank::before, .blank::after { content: none; }
  .vent { display: block; width: min(64%, 240px); height: min(100%, 132px); border-radius: 5px;
    background: repeating-linear-gradient(rgba(0,0,0,.5) 0 5px, rgba(255,255,255,.1) 5px 6px, transparent 6px 13px); box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); }
  /* A floor's plate, in the lane over the row its floor begins in, with a push button for
     each of the floor's own scenes beside it. */
  .floor { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 18px; min-width: 0; margin: 6px 0; }
  /* The bar between two floors that share a row: on the panel itself, between their
     chassis, from the plate down. The bay before it (.bars) and the floor it begins
     (.barred) each stand 17 px off, so that the bar has 20 px of panel on each side
     (owner, 2026-11-16: twice the 10 px it had). An era may make it of its own stuff. */
  .barred { padding-left: 17px; }
  .bars { padding-right: 17px; }
  .bar { position: relative; justify-self: start; width: 6px; margin: 6px 0 12px -9px; border-radius: 3px; background: currentColor; opacity: .4; }
  /* A room's one scene has a knife switch among its controls. An open blade stands well above its switch. */
  .works > .knife { flex: 0 0 130px; min-height: 124px; margin-top: 38px; }

  /* A card for one room, one instrument, the lamps or a meter panel is no page: no page's height, and a narrower margin. */
  .panel.as-room, .panel.as-instrument, .panel.as-lamps, .panel.as-meters { min-height: 0; padding: 12px; }
  .as-instrument { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 8px; }
  .as-instrument > .warn { flex-basis: 100%; }
  .as-meters > .warn { margin-bottom: 10px; }
  .as-lamps .lamps { margin-bottom: 0; }
  /* An instrument with no backing stands on the dashboard's own card, and its lettering is
     in the dashboard's colour where its era doesn't print it on a plate of its own. */
  .panel.bare { padding: 0; background: none; box-shadow: none; border: 0; }
  :where(.bare) .label { color: var(--primary-text-color); }

  /* A meter panel (metered.ts): its chassis side by side where there is room, one with
     phases wanting more of it than one with none. */
  .rack { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; }
  .metered { flex: 1 1 440px; } .metered.phased { flex-basis: 520px; }
  /* Its works are laid out at their natural width (a meter is 150 px, and 10 px from the
     next: meters.ts CELL and GAP, change them together) and the whole of them zoomed to
     the width the chassis has (sized in metered.ts, which also names the form as a class).
     A stopgap until every control can be drawn at any size: BACKLOG. */
  .metered > .works { display: block; }
  .fit { margin: 0 auto; }
  /* A strip is one phase's meters, standing as a column. Laid flat (a meter with no
     phases) it is a row, with its registers under it or after it. */
  .strip { display: flex; flex-direction: column; align-items: center; gap: 8px 10px; min-width: 0; }
  .strip.flat { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  /* A cell is a meter, and under it Sensor Watch's lamp when it has something to say of it. */
  .cell { display: flex; flex: none; flex-direction: column; align-items: center; gap: 4px; width: 150px; min-width: 0; }
  .cell > .meter { flex: none; width: 100%; margin: 0; }
  /* The phases' strips share their rows (--rows, as many as a strip has meters), so that a
     quantity's meters are in a line across them whatever is lettered under each. Each
     strip's own column is its place's width and no more: left to its content, the strips
     overlapped each other in a narrow card (owner's phone, 2026-11-18). */
  .phases { display: grid; grid-template-columns: repeat(var(--strips), 150px); gap: 8px 10px; align-items: start; }
  .phases > .strip { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: subgrid; grid-row: span var(--rows); justify-items: center; align-items: start; }
  .phases > .whole { display: flex; }
  .registers { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 6px 8px; }
  .flat .registers { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .register { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  /* Too small with everything abreast: the whole meter's strip lies under the phases'. */
  .under > .phases { grid-template-columns: repeat(var(--phases), 150px); }
  .under > .phases > .whole { grid-row: auto; grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .under .registers { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  /* Too small for that as well: every meter in one column (owner, 2026-11-18: no tall thin
     panel unless it is needed). */
  .column > .phases { display: flex; flex-direction: column; align-items: center; }
  .column > .phases > .strip { display: flex; }
  .column > .strip.flat { flex-direction: column; flex-wrap: nowrap; }
  .column .registers { flex-direction: column; }
`;

export const VIEWS = [LAYOUT, SELECTOR];
