// How wide each room's chassis is and where it stands: the panel is a grid of columns, a
// chassis is some of them across, small ones stand one under another, and the columns of
// a row are all as tall as the tallest. ../pack.ts chooses; this is what it is told about the Console: how tall a
// room's controls are in a chassis of each width.
import { bays, rows, type Bay, type Placed } from "../pack.ts";

/** What a room has on its chassis. `selectors` is how many stops each selector switch has. */
export type Load = { knobs: number; dollies: number; alarms: number; tvs: number; meter: boolean; knives: number; selectors: number[] };

// The sizes are a model of the stylesheets: a column of the panel's grid with the gap
// beside it, what of a chassis one column wide is no room for controls (its padding and
// that gap), and each control as [width, height] with its plate and the gap beside it.
// They follow views.ts and bakelite/styles.ts: change them together. Every era keeps to
// these sizes, so the same rows are right in each.
const COLUMN = 172;
const EDGES = 32;
const METER = [156, 185];
const KNOB = [110, 156];
const DOLLY = [98, 126];
const ALARM = [146, 170];
const TV = [156, 158];
const KNIFE = [136, 166];
const selector = (stops: number) => [140, 124 + stops * 15];
const BETWEEN = 12; // px: between one chassis and the one under it
const HEAD = 120; // px: what every chassis has above and below its controls: its lamp, its name and its Chart button

/** How many columns a panel has, whose rooms have `px` across to stand in. */
export const columns = (px: number) => Math.max(1, Math.floor((px + 12) / COLUMN));

/** The height of a room's controls in a chassis `wide` columns across. They are laid in
 * rows as they come, the meter first, and a row is as tall as its tallest. */
export function tall(r: Load, wide: number): number {
  const room = COLUMN * wide - EDGES;
  let height = 0, used = room, row = 0;
  for (const [w, h] of [...(r.meter ? [METER] : []), ...Array(r.knives).fill(KNIFE), ...r.selectors.map(selector), ...Array(r.knobs).fill(KNOB), ...Array(r.dollies).fill(DOLLY), ...Array(r.tvs).fill(TV), ...Array(r.alarms).fill(ALARM)]) {
    if (used + w > room) {
      height += row;
      used = row = 0;
    }
    used += w;
    row = Math.max(row, h);
  }
  return height + row;
}

const BLANK = 96; // px: the least space under a bay's chassis that a blanking plate is fitted in

/** The bays the rooms' chassis stand in, each with whether it has a blanking plate under
 * its chassis: where the row is taller than they are by enough for one. A chassis is not
 * stretched to its row's height: a room with two switches was a tenth full that way (the
 * test VM, 2026-11-16). With less to spare than a plate needs, the chassis take it up. */
export function racks(rooms: Load[], placed: Placed[]): (Bay & { blank: boolean })[] {
  const found = bays(placed);
  const stands = found.map((bay) => bay.things.reduce((sum, i) => sum + BETWEEN + HEAD + tall(rooms[i], bay.wide), -BETWEEN));
  const row = new Map<number, number>();
  found.forEach((bay, k) => row.set(bay.row, Math.max(row.get(bay.row) ?? 0, stands[k])));
  return found.map((bay, k) => ({ ...bay, blank: row.get(bay.row)! - stands[k] - BETWEEN >= BLANK }));
}

/** A width and a place for each room's chassis, on a panel `across` columns wide. `apart`
 * says that a room may not stand under the one before it: it begins a floor. */
export const laid = (rooms: Load[], across: number, apart: (i: number) => boolean = () => false): Placed[] => rows(rooms.length, (i, wide) => HEAD + tall(rooms[i], wide), across, BETWEEN, apart);
