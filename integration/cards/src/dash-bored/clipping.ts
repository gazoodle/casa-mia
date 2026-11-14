// The clipping: one device's story, cut out and laid over the page in place of Home
// Assistant's dialog. What it is and since when, what can be done to it, and the record
// of its last day. gazette.ts holds what is open and acts on what is pressed.
import { html, nothing, type TemplateResult } from "lit";
import type { Device } from "./house.ts";
import { DAY, lit, type Change } from "./record.ts";
import { cap, clock } from "./stories.ts";
import { fill, words, type Voice } from "./voices.ts";

/** The clipping that is open: its record once fetched, why it could not be, and whether
 * a press that unlocks or opens the house has been made once and waits for its second. */
export type Open = { id: string; record?: Change[]; fault?: string; armed?: boolean };
const LINES = 12; // the record lists this many of the latest changes

export function clipping(voice: Voice, d: Device, open: Open, now: number, scale: unknown, on: { flip(): void; more(): void; shut(): void }): TemplateResult {
  const c = voice.clipping;
  const told = (change: Change) => cap(words(voice, { ...d, on: change.on, level: change.level, away: change.away }));
  const record = open.record;
  // The dialog itself is the margin round the cutting: a press there, or Escape, folds it away.
  return html`<dialog class="clipping" @close=${on.shut} @click=${(e: Event) => e.target === e.currentTarget && on.shut()}>
    <div class="cutting">
      <p class="kicker">${d.room}</p>
      <h4 class="title">${d.name}</h4>
      <p class="deck">${cap(words(voice, d))}. ${d.since ? fill(c.since, { at: clock(d.since) }) : ""}</p>
      ${d.away ? nothing : html`<button class="act ${open.armed ? "sure" : ""}" @click=${on.flip}>${open.armed ? c.sure : voice.acts[`${d.kind}.${d.on ? "on" : "off"}`]}</button>`}
      ${scale}
      <h3>${c.record}</h3>
      ${open.fault
        ? html`<p class="fault" role="alert">Home Assistant's history could not be read (${open.fault}).</p>`
        : !record
          ? html`<p class="wait">${c.wait}</p>`
          : html`<div class="band">${lit(record, now - DAY, now).map(([left, width]) => html`<i style="left:${left}%;width:${width}%"></i>`)}</div>
              <div class="span"><span>${c.ago}</span><span>${c.now}</span></div>
              <ol>${record.length ? record.slice(-LINES).reverse().map((change) => html`<li><time>${clock(change.at)}</time>${told(change)}</li>`) : html`<li>${c.none}</li>`}</ol>`}
      <div class="foot"><button class="mend" @click=${on.more}>${c.more}</button><button class="act" @click=${on.shut}>${c.shut}</button></div>
    </div>
  </dialog>`;
}
