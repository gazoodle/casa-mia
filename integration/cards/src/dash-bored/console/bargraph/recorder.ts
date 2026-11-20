// Bargraph's recorder: how a room's devices stood through the last day, as a spectrum
// analyser would show it. A row of columns for each device, one to a quarter of an hour,
// each lit as high as the device stood then. The traces are ../plot.ts's.
import { html, nothing, type TemplateResult } from "lit";
import { plot, type Lane } from "../plot.ts";
import { label, push } from "./kit.ts";

const COLUMNS = 96; // a quarter of an hour each
const PITCH = 6; // px: from one column to the next, as styles.ts draws them
const RUNGS = 6; // the segments in a column
const HOUR = 3_600_000;

/** How a device stood at the middle of each of `n` columns across its day, from 0 to 1,
 * from ../plot.ts's runs: each run is pairs of points, the start and the end of a time
 * it stood at one level. A column in no run (the device was not answering) has nothing. */
export function sampled(runs: [number, number][][], n = COLUMNS): (number | undefined)[] {
  const columns = Array<number | undefined>(n).fill(undefined);
  for (const run of runs)
    for (let p = 0; p + 1 < run.length; p += 2) {
      const [from, y] = run[p];
      const to = run[p + 1][0];
      for (let i = Math.max(0, Math.ceil(from * n - 0.5)); i < n && (i + 0.5) / n < to; i++) columns[i] = y;
    }
  return columns;
}

/** The recorder's dialog: the room's day up to `to`, or why there is none. A device that
 * is on with no level lights its whole column; one that was not answering leaves a gap. */
export function recorder(room: string, lanes: Lane[], to: number, fault: string, shut: () => void): TemplateResult {
  const from = to - 24 * HOUR;
  const first = Math.ceil(from / HOUR) * HOUR;
  const hours = Array.from({ length: 24 }, (_, i) => first + i * HOUR).filter((at) => at <= to && new Date(at).getHours() % 3 === 0);
  return html`<dialog class="recorder" aria-label="${room}: the last day" @close=${shut} @click=${(e: Event) => e.target === e.currentTarget && shut()}>
    ${label(`${room}: the last day`)}
    ${fault ? html`<div class="warn"><span class="lamp"></span>${label(`The record could not be read (${fault}).`)}</div>` : nothing}
    <div class="analyser" role="img" aria-label="When each device in ${room} was on">
      ${lanes.map(
        (lane) => html`<div class="lane"><span class="name">${lane.name}</span>
          ${lane.changes
            ? html`<span class="columns">${sampled(plot(lane.changes, from, to, lane.lo, lane.hi)).map((y) => html`<i class=${y === undefined ? "gap" : ""} style="--n: ${Math.round((y ?? 0) * RUNGS)}"></i>`)}</span>`
            : html`<span class="columns reading">${fault ? "" : "reading…"}</span>`}</div>`,
      )}
      <div class="lane hours"><span class="name"></span><span class="columns">${hours.map((at) => html`<b style="left: ${(((at - from) / (to - from)) * COLUMNS * PITCH).toFixed(0)}px">${String(new Date(at).getHours()).padStart(2, "0")}</b>`)}</span></div>
    </div>
    ${push("Close", shut)}
  </dialog>`;
}
