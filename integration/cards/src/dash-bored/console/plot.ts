// A device's day as a trace, for an era's recorder to draw: on paper in Bakelite. The
// record itself is record.ts's, as the Gazette's clippings use it.
import type { Change } from "../record.ts";

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
