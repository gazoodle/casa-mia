/** A numeric record's bands as the editor holds them: a ladder built out from nominal.
 * Nominal is the one band that is naturally a from–to; each band beyond has only its far
 * edge, its near edge being the far edge of the one inside it, so no edge is typed twice
 * and gaps and overlaps can't be written. Stored as bands still (`toBands`).
 *
 * No imports but types: tests/test_sensor_watch_ladder.py runs this file in node as it
 * is, so the levels' order and names live here (common.ts re-exports them). */

import type { Band } from "./common";

export const LEVELS = ["nominal", "task", "warning", "error", "critical"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_NAMES: Record<Level, string> = {
  nominal: "Nominal",
  task: "Task",
  warning: "Warning",
  error: "Error",
  critical: "Critical",
};

/** A band beyond nominal: its far edge as typed (the outermost's is unused: open). */
export type Rung = { edge: string; level: Level; message: string };
/** Nominal's edges ("" for open) and message, then the rungs going up and going down,
 * nearest first. */
export type Ladder = { low: string; high: string; message: string; up: Rung[]; down: Rung[] };

const text = (n: number | null) => (n === null ? "" : String(n));
const num = (s: string) => (s.trim() === "" ? null : Number(s));
const rank = (l: Level) => LEVELS.indexOf(l);

/** The ladder for stored bands, and the band made nominal when none was. A gap (or a
 * closed end) opens as a band at `outside`, the level a value there has today, so
 * nothing it does changes and the gap shows. */
export function toLadder(stored: Band[], outside: Level): { ladder: Ladder; promoted: Band | null } {
  const sorted = [...stored].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity));
  if (!sorted.length) return { ladder: { low: "", high: "", message: "", up: [], down: [] }, promoted: null };

  // Fill the gaps and the ends.
  const filler = (from: number | null, to: number | null): Band => ({ from, to, level: outside, message: "" });
  const bands: Band[] = sorted[0].from === null ? [] : [filler(null, sorted[0].from)];
  sorted.forEach((b, i) => {
    const prev = sorted[i - 1];
    if (prev && prev.to !== null && b.from !== null && prev.to < b.from) bands.push(filler(prev.to, b.from));
    bands.push(b);
  });
  const last = sorted[sorted.length - 1];
  if (last.to !== null) bands.push(filler(last.to, null));

  // The centre: the nominal band, or the best there is (a record from before the ladder).
  let n = bands.findIndex((b) => b.level === "nominal");
  const promoted = n < 0 ? bands[(n = bands.reduce((best, b, i) => (rank(b.level) < rank(bands[best].level) ? i : best), 0))] : null;

  const centre = bands[n];
  const rung = (b: Band, edge: number | null): Rung => ({ edge: text(edge), level: b.level, message: b.message });
  const ladder = {
    low: text(centre.from),
    high: text(centre.to),
    message: centre.message,
    up: bands.slice(n + 1).map((b) => rung(b, b.to)),
    down: bands
      .slice(0, n)
      .reverse()
      .map((b) => rung(b, b.from)),
  };
  return { ladder, promoted };
}

/** The bands to store, lowest first: open at both ends, each edge shared. */
export function toBands(l: Ladder): Band[] {
  const side = (rungs: Rung[], inner: string, up: boolean): Band[] =>
    rungs.map((r, i) => {
      const near = num(i ? rungs[i - 1].edge : inner);
      const far = i === rungs.length - 1 ? null : num(r.edge);
      return { from: up ? near : far, to: up ? far : near, level: r.level, message: r.message };
    });
  const nominal: Band = { from: num(l.low), to: num(l.high), level: "nominal", message: l.message };
  return [...side(l.down, l.low, false).reverse(), nominal, ...side(l.up, l.high, true)];
}

/** Why the ladder can't be saved, or null. */
export function problemOf(l: Ladder): string | null {
  const edges = [l.low, l.high, ...[...l.up, ...l.down].map((r) => r.edge)];
  if (edges.some((e) => e.trim() !== "" && !Number.isFinite(Number(e)))) return "Edges must be numbers (with a point for decimals).";
  if (l.up.length && l.high.trim() === "") return "Nominal needs a top edge, or remove the bands above it.";
  if (l.down.length && l.low.trim() === "") return "Nominal needs a bottom edge, or remove the bands below it.";

  for (const [rungs, way] of [
    [l.up, "up to"],
    [l.down, "down to"],
  ] as const) {
    const missing = rungs.slice(0, -1).find((r) => r.edge.trim() === "");
    if (missing) return `${LEVEL_NAMES[missing.level]}: ${way} what?`;
    const same = rungs.find((r, i) => rank(r.level) <= rank(i ? rungs[i - 1].level : "nominal"));
    if (same) return `${LEVEL_NAMES[same.level]}: each band out from nominal must be worse than the one inside it.`;
  }

  const crossed = toBands(l).find((b) => b.from !== null && b.to !== null && b.from >= b.to);
  return crossed ? `${LEVEL_NAMES[crossed.level]}: ${crossed.from} must be below ${crossed.to}.` : null;
}

const decimals = (s: string) => s.split(".")[1]?.length ?? 0;

/** How far an edge moved from `was` to `now`, rounded to the digits typed; null when
 * either isn't a number or it didn't move. */
export function moved(was: string, now: string): number | null {
  if (was.trim() === "" || now.trim() === "") return null;
  const d = Number((Number(now) - Number(was)).toFixed(Math.max(decimals(was), decimals(now))));
  return Number.isFinite(d) && d !== 0 ? d : null;
}

/** The nudge after a nominal edge on `side` moved by `by`: the bands beyond it move by
 * the same amount, keeping their widths; `everything` moves the other side too, nominal's
 * other edge included. */
export function nudge(l: Ladder, side: "low" | "high", by: number, everything: boolean): Ladder {
  const shift = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? s : String(Number((Number(s) + by).toFixed(Math.max(decimals(s), decimals(String(by)))))));
  const move = (rungs: Rung[]) => rungs.map((r) => ({ ...r, edge: shift(r.edge) }));
  const [beyond, other] = side === "high" ? (["up", "down"] as const) : (["down", "up"] as const);
  const out = { ...l, [beyond]: move(l[beyond]) };
  if (!everything) return out;
  return { ...out, [other]: move(l[other]), [side === "high" ? "low" : "high"]: shift(l[side === "high" ? "low" : "high"]) };
}
