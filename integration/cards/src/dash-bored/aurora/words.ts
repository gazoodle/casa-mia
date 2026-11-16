// What Aurora says in words, and the line it draws of the house's power. Nothing is drawn
// here: aurora.ts puts these on the page.
import { lights, type Device, type House } from "../house.ts";
import { counted } from "../stories.ts";

export const greeting = (hour: number) => (hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.");

/** How much of a set of lights' light is on, from 0 to 1: a light at half is half a light.
 * A light that is on and tells no brightness is fully on. */
export const glow = (list: Device[]) => (list.length ? list.reduce((sum, d) => sum + (d.on ? (d.level ?? 100) : 0), 0) / (list.length * 100) : 0);

/** The hero's sentence, in pieces: those marked are set in bold. It says only what the
 * house knows: nothing of power without a power sensor, and no warmest room unless there
 * are two to compare. */
export function said(house: House): [text: string, strong: boolean][] {
  const lit = lights(house).filter((d) => d.on).length;
  const { N, s } = counted(lit);
  const warm = house.rooms.filter((r) => r.temp !== undefined).sort((a, b) => b.temp! - a.temp!);

  const clauses: [string, boolean][][] = [[[`${N} light${s} ${lit === 1 ? "is" : "are"} on`, true]]];
  if (house.kw !== undefined) clauses.push([[`the house is drawing ${house.kw.toFixed(1)} kW`, false]]);
  if (warm.length > 1) clauses.push([[`the warmest room is ${warm[0].name} at `, false], [`${warm[0].temp!.toFixed(1)}°`, true]]);

  // "a", "a and b", "a, b and c".
  return [...clauses.flatMap((clause, i): [string, boolean][] => [...(i ? [[i === clauses.length - 1 ? " and " : ", ", false] as [string, boolean]] : []), ...clause]), [".", false]];
}

/** The readings with none sooner than `gap` ms after the one kept before it: a sensor
 * that reports every second would otherwise give the line thousands of points. */
export function thinned(points: [number, number][], gap: number): [number, number][] {
  const kept: [number, number][] = [];
  for (const point of points) if (!kept.length || point[0] - kept.at(-1)![0] >= gap) kept.push(point);
  return kept;
}

const FLOOR = 0.9; // kW: the least the chart's height stands for, so that a quiet house draws a low line and not a mountain range

/** Readings ([ms, kW]) between `from` and `to` as an SVG path across a box `w` by `h`,
 * smoothed through the midpoints so that it reads as a curve; and the same closed along
 * the bottom, to fill. Nothing for fewer than two readings: one is not a line. */
export function spark(points: [number, number][], from: number, to: number, w = 300, h = 90): { line: string; area: string } | undefined {
  if (points.length < 2 || to <= from) return undefined;
  const most = Math.max(FLOOR, ...points.map(([, kw]) => kw));
  const at = points.map(([ms, kw]) => [Math.round((Math.max(0, ms - from) / (to - from)) * w * 10) / 10, Math.round((h - 6 - (Math.max(0, kw) / most) * (h - 16)) * 10) / 10]);

  let line = `M${at[0]}`;
  for (let i = 1; i < at.length; i++) line += ` Q${at[i - 1]} ${(at[i - 1][0] + at[i][0]) / 2},${(at[i - 1][1] + at[i][1]) / 2}`;
  line += ` L${at.at(-1)}`;
  return { line, area: `${line} L${at.at(-1)![0]},${h} L${at[0][0]},${h}Z` };
}
