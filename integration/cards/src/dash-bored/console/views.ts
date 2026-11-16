// How the cards that show less than the whole panel (cards.ts) are laid out, the same in
// every era. Each era's element takes these before its own styles, so where an era says
// otherwise (a label on a plate of its own colour) the era's word stands.
import { css } from "lit";

export const VIEWS = css`
  /* A card for one room, one instrument or the lamps is no page: no page's height, and a narrower margin. */
  .panel.as-room, .panel.as-instrument, .panel.as-lamps { min-height: 0; padding: 12px; }
  .as-room .room { max-width: none; }
  .as-instrument { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 8px; }
  .as-instrument > .warn { flex-basis: 100%; }
  .as-lamps .lamps { margin-bottom: 0; }
  /* An instrument with no backing stands on the dashboard's own card, and its lettering is
     in the dashboard's colour where its era doesn't print it on a plate of its own. */
  .panel.bare { padding: 0; background: none; box-shadow: none; border: 0; }
  :where(.bare) .label { color: var(--primary-text-color); }
`;
