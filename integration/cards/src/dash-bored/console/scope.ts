// An oscilloscope for an era's recorder: how a room's devices stood through the last day,
// as traces. A green phosphor line for each device over a graticule, on a tube with a
// little glow. Nixie's, Silverface's and Beige's recorders are this, each with its own
// legends and keys and dressed by its own stylesheet: its parts are named for that (the
// screen, the grid, and each channel's glow and trace). The traces are plot.ts's.
import { html, nothing, svg, type TemplateResult } from "lit";
import type { Kit } from "./kit.ts";
import { plot, type Lane } from "./plot.ts";

const LEFT = 104; // the screen's margin, where the channels are named
const WIDE = 640;
const LANE = 34;
const HOUR = 3_600_000;

/** An era's recorder, made with its `label` and its `push`. Its dialog is the room's day
 * up to `to` on the screen, or why there is none. */
export const scope = (label: Kit["label"], push: Kit["push"]) => (room: string, lanes: Lane[], to: number, fault: string, shut: () => void): TemplateResult => {
  const from = to - 24 * HOUR;
  const across = (at: number) => LEFT + ((at - from) / (to - from)) * (WIDE - LEFT - 10);
  const first = Math.ceil(from / HOUR) * HOUR;
  const hours = Array.from({ length: 24 }, (_, i) => first + i * HOUR).filter((at) => at <= to);
  const tall = lanes.length * LANE + 30;
  return html`<dialog class="recorder" aria-label="${room}: the last day" @close=${shut} @click=${(e: Event) => e.target === e.currentTarget && shut()}>
    ${label(`${room}: the last day`)}
    ${fault ? html`<div class="warn"><span class="lamp"></span>${label(`The record could not be read (${fault}).`)}</div>` : nothing}
    <svg class="scope" viewBox="0 0 ${WIDE} ${tall}" role="img" aria-label="Traces of when each device in ${room} was on">
      <rect class="screen" width=${WIDE} height=${tall} rx="14" fill="#04140d"/>
      ${hours.map((at) => {
        const third = new Date(at).getHours() % 3 === 0;
        return svg`<path class="grid" d="M${across(at).toFixed(1)},6 V${tall - 18}" stroke="#7dffc0" stroke-opacity=${third ? 0.28 : 0.1} stroke-width=".6"/>${third ? svg`<text class="hour" x=${across(at).toFixed(1)} y=${tall - 6}>${String(new Date(at).getHours()).padStart(2, "0")}</text>` : nothing}`;
      })}
      ${lanes.map((lane, i) => {
        const foot = (i + 1) * LANE;
        const path = plot(lane.changes ?? [], from, to, lane.lo, lane.hi)
          .map((run) => run.map(([x, y], n) => `${n ? "L" : "M"}${(LEFT + x * (WIDE - LEFT - 10)).toFixed(1)},${(foot - y * (LANE - 12)).toFixed(1)}`).join(" "))
          .join(" ");
        return svg`<g class="channel"><path class="grid" d="M${LEFT},${foot} H${WIDE - 10}" stroke="#7dffc0" stroke-opacity=".16" stroke-width=".5"/>
          <text class="lane" x=${LEFT - 8} y=${foot - 3}>${lane.name}</text>
          ${lane.changes
            ? svg`<path class="glow" d=${path} fill="none" stroke="#3dff9a" stroke-opacity=".3" stroke-width="4" stroke-linejoin="round"/><path class="trace" d=${path} fill="none" stroke="#c9ffe2" stroke-width="1.1" stroke-linejoin="round"/>`
            : svg`<text class="hour" x=${LEFT + 40} y=${foot - 3}>${fault ? "" : "reading…"}</text>`}</g>`;
      })}
    </svg>
    ${push("Close", shut)}
  </dialog>`;
};
