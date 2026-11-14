// The look of each paper. `.paper` carries the broadsheet, which is also the base;
// `[data-style="tabloid"]` overrides it. A new paper is another block like that one and
// a voice in voices.ts. Sizes follow the element's own width (a container query), since
// the Gazette may be a whole page or a card in a column.
import { css } from "lit";

export const STYLES = css`
  :host { display: block; container-type: inline-size; }
  :host([panel]) { height: 100vh; overflow-y: auto; }
  .paper { --paper: #f3eee0; --ink: #1c1a17; --flash: #8c1c13; --mark: #f6d95a; --head: "Bodoni 72", "Didot", "Playfair Display", serif;
    box-sizing: border-box; min-height: 100%; padding: 14px 30px 24px; background: var(--paper); color: var(--ink);
    font-family: "Hoefler Text", "Baskerville", "Times New Roman", serif;
    background-image: radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px); background-size: 4px 4px; }
  .paper * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  :focus-visible { outline: 2px solid var(--flash); outline-offset: 2px; }
  .wait { font-size: 18px; font-style: italic; }

  /* What must never be missed: breaking news, a lost connection, a refused action. */
  .breaking { border: 3px double var(--flash); color: var(--flash); padding: 6px 12px; margin-bottom: 10px; font-size: 17px; text-align: center;
    animation: flash 1.6s ease-out; overflow-wrap: anywhere; }
  .breaking b { letter-spacing: .3em; text-transform: uppercase; margin-right: 12px; }
  @keyframes flash { 0%, 45% { background: var(--mark); } }
  .fault { background: var(--flash); color: #fff; padding: 6px 12px; margin-bottom: 10px; font: 600 15px/1.3 system-ui, sans-serif; overflow-wrap: anywhere; }

  .masthead { text-align: center; border-bottom: 4px double var(--ink); padding-bottom: 6px; }
  /* The masthead's blackletter is the page's own font (gazette.ts loads it), sized to the
     paper's width so that the name stays on one line on a phone. Never the browser's
     "fantasy": on an iPhone that is a script whose swashes ran up over the breaking news. */
  .masthead h1 { margin: 0; font: 400 clamp(32px, 12cqi, 74px)/1.1 "Dash-Bored Masthead", var(--head); overflow-wrap: anywhere; }
  .masthead p { margin: 0; } .masthead p:empty { display: none; }
  .dateline { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; justify-content: space-between; font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
    border-bottom: 1px solid var(--ink); padding: 5px 2px; margin-bottom: 14px; }
  .styles button { padding: 1px 8px; border-bottom: 1.5px dotted; }
  .styles button[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: transparent; }

  .page { display: grid; grid-template-columns: 2.1fr 1.4fr 1.1fr; gap: 0 26px; }
  .page > * { min-width: 0; }
  .page > * + * { border-left: 1px solid var(--ink); padding-left: 26px; }
  .kicker { margin: 0 0 6px; font-size: 12px; letter-spacing: .3em; text-transform: uppercase; color: var(--flash); }
  h2 { margin: 0 0 8px; font: 900 46px/.98 var(--head); text-transform: uppercase; letter-spacing: -.01em; text-wrap: balance; overflow-wrap: anywhere; animation: ink 1.2s ease-out; }
  @keyframes ink { from { background: var(--mark); } }
  .deck { font-size: 19px; font-style: italic; margin: 0 0 12px; line-height: 1.25; }
  /* The figure: the story's one number, set like an engraving. */
  .figure { float: right; width: 150px; margin: 4px 0 8px 16px; border: 3px double var(--ink); text-align: center; padding: 10px 6px;
    background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,.07) 3px 4px); }
  .figure b { display: block; font: 900 38px/1 var(--head); overflow-wrap: anywhere; }
  .figure span { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }
  .act { display: inline-block; border: 1.5px solid var(--ink); padding: 3px 12px; margin-bottom: 10px; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; }
  .act:hover { background: var(--ink); color: var(--paper); }
  /* A photograph: printed in black and white, as a broadsheet's are. */
  .photo { margin: 0 0 12px; clear: both; cursor: pointer; }
  .photo img { display: block; width: 100%; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .photo figcaption { padding-top: 3px; font-size: 12px; font-style: italic; overflow-wrap: anywhere; }
  .item .photo { margin-bottom: 6px; }
  /* The archive: the last half hour's sightings, each with its photograph small. */
  .archive li { display: grid; grid-template-columns: 72px 1fr; gap: 8px; align-items: center; cursor: pointer; overflow-wrap: anywhere; }
  .archive img, .archive i { width: 72px; aspect-ratio: 16 / 9; object-fit: cover; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .archive i { background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,.07) 3px 4px); }
  .copy { columns: 2; column-gap: 22px; column-rule: 1px solid rgba(0,0,0,.25); font-size: 15px; line-height: 1.42; clear: both; }
  .copy p { margin: 0 0 8px; break-inside: avoid; }
  [data-style="broadsheet"] .copy p:first-of-type::first-letter { font-size: 52px; float: left; line-height: .82; padding: 4px 6px 0 0; font-family: var(--head); }
  .copy b { text-transform: uppercase; font-size: 12px; letter-spacing: .12em; }
  /* A crosshead: the floor, over its rooms in the report and on the switchboard. */
  h5 { margin: 12px 0 6px; font: italic 400 16px/1.2 var(--head); text-align: center; break-after: avoid; }
  h5::before, h5::after { content: " — "; }
  h5:first-child { margin-top: 0; }
  /* Anything in the report that can be switched is set like a correction: underlined, and pressable. */
  .fact { border-bottom: 1.5px dotted var(--ink); cursor: pointer; }
  .fact:hover { background: var(--ink); color: var(--paper); }
  .fact.away { border-bottom-style: solid; border-bottom-color: var(--flash); color: var(--flash); }
  /* A level that can be set is ruled twice: pressing it opens the scale, not the switch. */
  .fact.level { border-bottom: 3px double var(--ink); }
  /* The scale: a printed rule with a mark at every ten, and a slide in the paper's red. */
  .scale { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; margin: 6px 0 8px; padding: 4px 8px; border: 1px solid var(--ink); break-inside: avoid; font-size: 13px; }
  /* The readers' poll over it: a question, and a vote each way. */
  .poll { flex: 1 1 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  .poll i { flex: 1 1 100%; font-size: 14px; }
  .poll .act { margin: 0; font-size: 11px; padding: 6px 10px; }
  .poll .act[disabled] { opacity: .35; cursor: default; pointer-events: none; }
  .scale input { flex: 1 1 130px; min-width: 0; height: 34px; margin: 0; appearance: none; -webkit-appearance: none; cursor: pointer;
    background: repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 10%) bottom / 100% 9px no-repeat, linear-gradient(var(--ink), var(--ink)) bottom / 100% 1px no-repeat; }
  .scale input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 34px; background: var(--flash); border: 0; border-radius: 0; }
  .scale input::-moz-range-thumb { width: 14px; height: 34px; background: var(--flash); border: 0; border-radius: 0; }
  .scale output { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
  .scale > button { padding: 4px 8px; font-size: 18px; line-height: 1; }
  .copy .scale { margin-bottom: 0; }
  /* The clipping: one device's story, cut out and laid over the page a little askew. */
  dialog.clipping { width: min(540px, calc(100vw - 24px)); max-height: calc(100vh - 24px); padding: 0; border: 0; background: none; color: var(--ink); font: inherit; overflow: visible; }
  dialog.clipping::backdrop { background: rgba(0, 0, 0, .5); }
  /* Its edges are torn (clipping.ts gives the outline), so the shadow is the dialog's: a box's own shadow is cut off with it. */
  dialog.clipping { filter: drop-shadow(5px 7px 0 rgba(0, 0, 0, .4)); }
  .cutting { display: grid; grid-template-columns: minmax(0, 1fr) 30px; max-height: calc(100vh - 40px); overflow-y: auto; background: var(--paper); rotate: -.5deg;
    background-image: radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px); background-size: 4px 4px; }
  .story { padding: 12px 16px 12px 20px; border-right: 1px solid var(--ink); min-width: 0; }
  /* What came away with it: the foot of the story above, cut through its last line; the
     edge of the next column, cut through its words; and the top of the headline below. */
  .scrap { overflow: hidden; opacity: .8; user-select: none; pointer-events: none; }
  .above { grid-column: 1 / -1; height: 15px; padding: 0 20px; border-bottom: 2px solid var(--ink); font-size: 15px; line-height: 5px; white-space: nowrap; } /* a line shorter than its type: the words stand half above the edge, where the tear takes them */
  .beside { position: relative; }
  .beside span { position: absolute; top: 6px; left: 8px; width: 190px; font-size: 14px; line-height: 1.42; }
  .below { grid-column: 1 / -1; height: 21px; padding: 5px 20px 0; border-top: 2px solid var(--ink); font: 900 28px/1 var(--head); white-space: nowrap; }
  .cutting .title { margin: 0 0 6px; font: 900 32px/1.02 var(--head); text-wrap: balance; overflow-wrap: anywhere; }
  .cutting .deck { font-size: 17px; }
  .cutting .still { display: block; width: 100%; margin: 0 0 12px; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .cutting .act { margin: 0 0 12px; }
  .act.sure { background: var(--flash); color: #fff; border-color: var(--flash); }
  .cutting .scale > button { display: none; }
  .cutting .scale { margin: 0 0 12px; }
  .cutting ol { max-height: 232px; overflow-y: auto; margin-bottom: 10px; }
  /* The record's band: the last day from left to right, inked where the device was on, with a mark at each hour. */
  .band { position: relative; height: 20px; border: 1px solid var(--ink); background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .3) 0 1px, transparent 1px calc(100% / 24)); }
  .band i { position: absolute; top: 0; bottom: 0; background: var(--ink); }
  .span { display: flex; justify-content: space-between; margin: 2px 0 6px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-variant-numeric: tabular-nums; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
  .foot .act { margin: 0; }
  li[role="button"] { cursor: pointer; }

  h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .3em; text-transform: uppercase; text-align: center;
    border-top: 2px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 4px 0; }
  .item { border-bottom: 1px solid var(--ink); padding-bottom: 8px; margin-bottom: 10px; }
  .item h4 { margin: 0 0 4px; font: 900 24px/1.05 var(--head); text-wrap: balance; overflow-wrap: anywhere; }
  .item p { margin: 0 0 6px; font-size: 15px; line-height: 1.35; }
  .item .act { margin-bottom: 2px; font-size: 11px; }
  ul, ol { list-style: none; padding: 0; margin: 0 0 16px; font-size: 14px; line-height: 1.35; }
  li { padding: 4px 0; border-bottom: 1px dotted rgba(0,0,0,.4); }
  time { font-variant-numeric: tabular-nums; font-weight: 700; margin-right: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 16px; }
  td { padding: 4px 2px; border-bottom: 1px dotted rgba(0,0,0,.4); } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  /* What Home Assistant isn't told about the house: a count that opens into its list. */
  details { border-bottom: 1px dotted rgba(0,0,0,.4); padding: 5px 0; font-size: 15px; }
  summary { cursor: pointer; font-weight: 700; }
  details ul { margin: 4px 0 0 16px; max-height: 260px; overflow-y: auto; }
  details li { border: 0; padding: 2px 0; }
  details li.via { font-style: italic; margin: 6px 0 2px; overflow-wrap: anywhere; }
  button.mend { border-bottom: 1.5px dotted var(--ink); overflow-wrap: anywhere; }
  p.mend { margin: 6px 0 16px; font-size: 13px; font-style: italic; line-height: 1.3; }
  /* The switchboard: every device as a plain button, for when you only want a switch. */
  .row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; break-inside: avoid; }
  /* A big house: the switchboard is a spread across the foot of the page, in columns. */
  .page > .board { grid-column: 1 / -1; border-left: 0; padding-left: 0; margin-top: 18px; }
  .board .rows { columns: 230px; column-gap: 26px; column-rule: 1px solid rgba(0,0,0,.25); }
  /* One story and no others: it takes the empty column too. */
  .solo > article { grid-column: span 2; }
  .row > span { flex: 0 0 100%; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
  .chip { border: 1.5px solid var(--ink); padding: 3px 7px; font-size: 13px; }
  .chip.on { background: var(--ink); color: var(--paper); }
  .pair { display: inline-flex; } .chip.tab { border-left: 0; font-variant-numeric: tabular-nums; }
  .chip.tab[aria-expanded="true"] { background: var(--mark); color: #111; }
  .chip.away { border-style: dashed; border-color: var(--flash); color: var(--flash); text-decoration: line-through; }
  .ad { display: block; width: 100%; border: 1px solid var(--ink); padding: 8px 10px; margin-bottom: 8px; text-align: center; font-size: 14px; line-height: 1.3; }
  .ad b { display: block; font: 400 17px var(--head); letter-spacing: .14em; text-transform: uppercase; }
  .ad:hover { background: var(--ink); color: var(--paper); }

  /* ---------- the red-top ---------- */
  [data-style="tabloid"] { --paper: #fff; --ink: #111; --flash: #d7141a; --mark: #ffe600; --head: Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background-image: none; }
  [data-style="tabloid"] .breaking { border: 0; background: var(--flash); color: #fff; font-weight: 800; text-align: left; text-transform: uppercase; animation-name: none; }
  [data-style="tabloid"] .breaking b { background: var(--mark); color: #111; padding: 2px 8px; letter-spacing: 0; font-style: italic; }
  [data-style="tabloid"] .masthead { text-align: left; border: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; }
  [data-style="tabloid"] .masthead h1 { font: italic 900 52px/1 "Arial Black", "Helvetica Neue", sans-serif; background: var(--flash); color: #fff; padding: 6px 20px 8px 14px; letter-spacing: -.05em; text-transform: uppercase; }
  [data-style="tabloid"] .masthead p { font: italic 800 16px/1.1 inherit; }
  [data-style="tabloid"] .dateline { background: var(--ink); color: #fff; border: 0; padding: 5px 10px; letter-spacing: .06em; font-weight: 700; }
  [data-style="tabloid"] .styles button[aria-pressed="true"] { background: var(--mark); color: #111; }
  [data-style="tabloid"] .page { gap: 0 22px; }
  [data-style="tabloid"] .page > * + * { border-left: 0; padding-left: 0; }
  [data-style="tabloid"] .kicker { display: inline-block; background: var(--mark); color: #111; font: italic 900 15px/1 "Arial Black", sans-serif; padding: 5px 10px; rotate: -2deg; letter-spacing: 0; }
  [data-style="tabloid"] h2 { font: 400 92px/.88 var(--head); letter-spacing: 0; }
  [data-style="tabloid"] .deck { font: 800 22px/1.15 inherit; }
  [data-style="tabloid"] .figure { border: 0; color: #fff; rotate: 2deg; width: 120px; background: radial-gradient(#fff3 1.2px, transparent 1.6px) 0 0 / 6px 6px, #111; }
  [data-style="tabloid"] .photo img { filter: none; border: 4px solid #111; }
  [data-style="tabloid"] .archive img, [data-style="tabloid"] .cutting .still { filter: none; }
  [data-style="tabloid"] .photo figcaption { font: 700 11px/1.3 system-ui, sans-serif; text-transform: uppercase; letter-spacing: .06em; }
  [data-style="tabloid"] .figure b { font: 400 36px/1 var(--head); color: var(--mark); }
  [data-style="tabloid"] .act { background: var(--flash); color: #fff; border: 0; font-weight: 900; font-style: italic; padding: 7px 14px; }
  [data-style="tabloid"] .act:hover { background: var(--ink); }
  [data-style="tabloid"] .copy { column-rule: 0; font-size: 14px; }
  [data-style="tabloid"] .fact { border-bottom: 2px solid var(--flash); }
  [data-style="tabloid"] h5 { font: italic 900 14px/1 "Arial Black", sans-serif; text-transform: uppercase; text-align: left; color: var(--flash); }
  [data-style="tabloid"] h5::before, [data-style="tabloid"] h5::after { content: none; }
  [data-style="tabloid"] .board .rows { column-rule: 0; }
  [data-style="tabloid"] .fact:hover { background: var(--mark); color: #111; }
  [data-style="tabloid"] .fact.level { border: 0; background: var(--mark); color: #111; padding: 0 3px; font-weight: 800; }
  [data-style="tabloid"] h3 { text-align: left; border: 0; background: var(--flash); color: #fff; padding: 5px 8px; letter-spacing: .02em; font: italic 900 14px/1 "Arial Black", sans-serif; }
  [data-style="tabloid"] .item h4 { font: 400 34px/.95 var(--head); text-transform: uppercase; }
  [data-style="tabloid"] .chip.on { background: var(--mark); color: #111; font-weight: 800; }
  [data-style="tabloid"] .ad { border: 3px solid var(--ink); } [data-style="tabloid"] .ad b { font: 400 24px/1 var(--head); letter-spacing: .02em; }
  [data-style="tabloid"] .ad:hover { background: var(--mark); color: #111; }

  /* ---------- narrow: one column, in reading order ---------- */
  @container (max-width: 900px) {
    .paper { padding: 10px 14px 20px; }
    .page { grid-template-columns: 1fr; } .page > * + * { border-left: 0; padding-left: 0; margin-top: 18px; } .solo > article { grid-column: auto; }
    .copy { columns: 1; } h2 { font-size: 34px; }
    [data-style="tabloid"] h2 { font-size: 62px; } [data-style="tabloid"] .masthead h1 { font-size: 36px; }
    .figure, [data-style="tabloid"] .figure { width: 104px; } .figure b, [data-style="tabloid"] .figure b { font-size: 28px; }
  }
`;
