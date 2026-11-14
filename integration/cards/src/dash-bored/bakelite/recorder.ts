// The chart recorder: how a room's devices stood through the last day, drawn as a pen
// recorder draws it, a lane and an ink for each device on a strip of paper. The record
// itself is record.ts's, as the Gazette's clippings use it.
import { html, nothing, svg, type TemplateResult } from "lit";
import type { Change } from "../record.ts";
import { label, push } from "./kit.ts";

/** One device's trace, as runs of points with x and y from 0 to 1: across the strip from
 * `from` to `to`, and up it from off to full. A device with a level (from `lo` to `hi`)
 * is drawn at it while it is on; one with none is drawn up or down. The pen is lifted
 * while a device is not answering, which ends a run. */
export function plot(changes: Change[], from: number, to: number, lo: number, hi: number): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] | undefined;
  changes.forEach((change, i) => {
    const start = Math.max(change.at, from);
    const end = Math.min(changes[i + 1]?.at ?? to, to);
    if (end <= start) return;
    if (change.away) return void (run = undefined);

    const y = !change.on ? 0 : change.level === undefined ? 1 : Math.min(1, Math.max(0.08, (change.level - lo) / (hi - lo)));
    if (!run) runs.push((run = []));
    run.push([(start - from) / (to - from), y], [(end - from) / (to - from), y]);
  });
  return runs;
}

export type Lane = { name: string; lo: number; hi: number; changes?: Change[] };
const INKS = ["#a3261a", "#1f3f7a", "#2c6b3a", "#6a2a6a"];
const LEFT = 96; // the strip's margin, where the lanes are named
const WIDE = 640;
const LANE = 34;
const HOUR = 3_600_000;

/** The recorder's dialog: the room's strip of paper for the day up to `to`, or why there is none. */
export function recorder(room: string, lanes: Lane[], to: number, fault: string, shut: () => void): TemplateResult {
  const from = to - 24 * HOUR;
  const across = (at: number) => LEFT + ((at - from) / (to - from)) * (WIDE - LEFT - 8);
  // A line for each hour of the clock, heavier and numbered at each third one.
  const first = Math.ceil(from / HOUR) * HOUR;
  const hours = Array.from({ length: 24 }, (_, i) => first + i * HOUR).filter((at) => at <= to);
  const tall = lanes.length * LANE + 26;
  return html`<dialog class="recorder" aria-label="${room}: the last day" @close=${shut} @click=${(e: Event) => e.target === e.currentTarget && shut()}>
    ${label(`${room}: the last day`)}
    ${fault ? html`<div class="warn"><span class="lamp"></span>${label(`The record could not be read (${fault}).`)}</div>` : nothing}
    <svg class="paper" viewBox="0 0 ${WIDE} ${tall}" role="img" aria-label="A chart of when each device in ${room} was on">
      <rect width=${WIDE} height=${tall} fill="url(#sepia)"/>
      ${hours.map((at) => {
        const third = new Date(at).getHours() % 3 === 0;
        return svg`<path d="M${across(at).toFixed(1)},4 V${tall - 16}" stroke="#7a5a2c" stroke-opacity=${third ? 0.5 : 0.2} stroke-width=".6"/>${third ? svg`<text class="hour" x=${across(at).toFixed(1)} y=${tall - 5}>${String(new Date(at).getHours()).padStart(2, "0")}</text>` : nothing}`;
      })}
      ${lanes.map((lane, i) => {
        const foot = (i + 1) * LANE; // the lane's line for off
        const path = plot(lane.changes ?? [], from, to, lane.lo, lane.hi)
          .map((run) => run.map(([x, y], n) => `${n ? "L" : "M"}${(LEFT + x * (WIDE - LEFT - 8)).toFixed(1)},${(foot - y * (LANE - 12)).toFixed(1)}`).join(" "))
          .join(" ");
        const ink = INKS[i % INKS.length];
        return svg`<path d="M${LEFT},${foot} H${WIDE - 8}" stroke="#7a5a2c" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1 3"/>
          <text class="lane" x=${LEFT - 6} y=${foot - 3}>${lane.name}</text>
          ${lane.changes ? svg`<path d=${path} fill="none" stroke=${ink} stroke-width="1.3" stroke-linejoin="round" stroke-opacity=".9"/>` : svg`<text class="hour" x=${LEFT + 40} y=${foot - 3}>${fault ? "" : "reading…"}</text>`}`;
      })}
    </svg>
    ${push("Close", shut)}
  </dialog>`;
}
