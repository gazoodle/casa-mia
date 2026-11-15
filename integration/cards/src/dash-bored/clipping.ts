// The clipping: one device's story, cut out and laid over the page in place of Home
// Assistant's dialog. What it is and since when, what can be done to it, and the record
// of its last day. gazette.ts holds what is open and acts on what is pressed.
import { html, nothing, type TemplateResult } from "lit";
import type { Device } from "./house.ts";
import { DAY, lit, type Change } from "./record.ts";
import { cap, clock } from "./stories.ts";
import { fill, words, type Voice } from "./voices.ts";
import { look } from "./zoom.ts";

/** The clipping that is open: its record once fetched, why it could not be, and whether
 * a press that unlocks or opens the house has been made once and waits for its second. */
export type Open = { id: string; record?: Change[]; fault?: string; armed?: boolean };
const LINES = 12; // the record lists this many of the latest changes
/** What was next to the story on the page it was cut from, and came away with it: the
 * end of the story above, the edge of the next column, and the headline below. */
export type Scraps = { above: string; beside: string; below: string };

const TEAR = 5; // px: how far in a torn edge wanders
const torn = new Map<string, string>();
/** A torn outline for the cutting, as a clip-path. It is worked out from the device's id,
 * so each clipping has its own and keeps it: an edge that moved at every state change in
 * the house would be worse than a straight one. */
export function ragged(seed: string): string {
  const known = torn.get(seed);
  if (known) return known;
  let n = [...seed].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 7);
  const chance = () => (n = (n * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const along = (count: number) => Array.from({ length: count }, (_, i) => (((i + chance() * 0.8) / count) * 100).toFixed(1));
  const depth = () => (chance() * TEAR).toFixed(1);
  const outline = `polygon(${[
    ...along(30).map((p) => `${p}% ${depth()}px`),
    ...along(22).map((p) => `calc(100% - ${depth()}px) ${p}%`),
    ...along(30).map((p) => `calc(100% - ${p}%) calc(100% - ${depth()}px)`),
    ...along(22).map((p) => `${depth()}px calc(100% - ${p}%)`),
  ].join(",")})`;
  torn.set(seed, outline);
  return outline;
}

/** A photograph that is open as a clipping: its address, what is printed over it, and the
 * camera to see live. */
export type Shot = { src: string; caption: string; see?: string };

/** The cutting itself, with what came away round it. The dialog is the margin round the
 * cutting: a press there, or Escape, folds it away. */
const cutting = (seed: string, scraps: Scraps, shut: () => void, story: unknown, how = "") =>
  html`<dialog class="clipping ${how}" @close=${shut} @click=${(e: Event) => e.target === e.currentTarget && shut()}>
    <div class="cutting" style="clip-path:${ragged(seed)}">
      <div class="scrap above" aria-hidden="true">${scraps.above}</div>
      <div class="story">${story}</div>
      <div class="scrap beside" aria-hidden="true"><span>${scraps.beside}</span></div>
      <div class="scrap below" aria-hidden="true">${scraps.below}</div>
    </div>
  </dialog>`;

/** A photograph cut from the paper, to be looked at closely (zoom.ts): the picture as it
 * was taken. The camera as it is now is a press away, in Home Assistant's own dialog. */
export function photograph(voice: Voice, shot: Shot, scraps: Scraps, on: { more(): void; shut(): void }): TemplateResult {
  const c = voice.clipping;
  return cutting(shot.src, scraps, on.shut, html`<p class="kicker">${shot.caption}</p>
    <div class="zoom" @pointerdown=${look.down} @pointermove=${look.move} @pointerup=${look.up} @pointercancel=${look.up} @wheel=${look.wheel} @dblclick=${look.twice}>
      <img src=${shot.src} alt=${shot.caption} draggable="false" @load=${look.whole} />
    </div>
    <p class="hint">${c.closer}</p>
    <div class="foot">${shot.see ? html`<button class="mend" @click=${on.more}>${c.live}</button>` : html`<span></span>`}<button class="act" @click=${on.shut}>${c.shut}</button></div>`, "shot");
}

export function clipping(voice: Voice, d: Device, open: Open, now: number, scale: unknown, scraps: Scraps, on: { flip(): void; more(): void; picture(): void; shut(): void }): TemplateResult {
  const c = voice.clipping;
  const told = (change: Change) => cap(words(voice, { ...d, on: change.on, phase: change.phase, level: change.level, away: change.away }));
  const record = open.record;
  // A camera has no button and no record: nothing puts it the other way, and it has no
  // day to tell. An alarm has no button either: it is set and unset in Home Assistant's
  // own dialog, which has its keypad, and not from a page that a guest may open.
  const act = voice.acts[`${d.kind}.${d.on ? "on" : "off"}`];
  return cutting(d.id, scraps, on.shut, html`<p class="kicker">${d.room}</p>
      <h4 class="title">${d.name}</h4>
      <p class="deck">${cap(words(voice, d))}. ${d.since && d.kind !== "camera" ? fill(c.since, { at: clock(d.since) }) : ""}
        ${d.temp === undefined ? "" : fill(c.reads, { temp: d.temp.toFixed(1) })} ${d.title ? fill(c.playing, { title: d.title }) : ""}</p>
      ${d.picture ? html`<img class="still" src=${d.picture} alt=${d.name} role="button" tabindex="0" @click=${on.picture} @keydown=${(e: KeyboardEvent) => e.key === "Enter" && on.picture()} />` : nothing}
      ${d.away || !act ? nothing : html`<button class="act ${open.armed ? "sure" : ""}" @click=${on.flip}>${open.armed ? c.sure : act}</button>`}
      ${scale}
      ${d.kind === "camera" ? nothing : html`<h3>${c.record}</h3>`}
      ${d.kind === "camera"
        ? nothing
        : open.fault
        ? html`<p class="fault" role="alert">Home Assistant's history could not be read (${open.fault}).</p>`
        : !record
          ? html`<p class="wait">${c.wait}</p>`
          : html`<div class="band">${lit(record, now - DAY, now).map(([left, width]) => html`<i style="left:${left}%;width:${width}%"></i>`)}</div>
              <div class="span"><span>${c.ago}</span><span>${c.now}</span></div>
              <ol>${record.length ? record.slice(-LINES).reverse().map((change) => html`<li><time>${clock(change.at)}</time>${told(change)}</li>`) : html`<li>${c.none}</li>`}</ol>`}
      <div class="foot"><button class="mend" @click=${on.more}>${c.more}</button><button class="act" @click=${on.shut}>${c.shut}</button></div>`);
}
