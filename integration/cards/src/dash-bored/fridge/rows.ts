// How wide each room's cluster on the door is, and which row it is in. ../pack.ts
// chooses; this is what it is told about the Fridge: about how tall a room's polaroid,
// prints and magnets are when it has each number of columns to spread over.
//
// The heights are estimates, not the stylesheet's sizes to the pixel: a magnet's name
// wraps as it likes, and nothing on a fridge lines up. So the rows are left ragged
// (styles.ts), and an estimate that is a little out moves nothing that anyone would see.
import { rows, type Placed } from "../pack.ts";

/** What a room has on the door. `strips` are the magnets with a paper strip to set a level on. */
export type Load = { magnets: number; strips: number; prints: number; alarms: number; words: number };

const COLUMN = 228; // px: a column of the door's grid, with the gap beside it
const GAP = 14;
const BETWEEN = 30; // px: between one room and the one under it
const SNAP = 220; // a polaroid with its magnet, and the gaps above and below it
const MAGNET = [80, 108]; // [width, height], each with its gap
const STRIP = 30; // what a paper strip adds to a row of magnets that has one
const PRINT = [144, 172];
const ALARM = 250;
const WORD = [110, 40]; // a word magnet for a scene

/** How many columns the door has, whose rooms have `px` across. */
export const columns = (px: number) => Math.max(1, Math.floor((px + GAP) / COLUMN));

/** About how tall a room is on the door when it is `wide` columns across. */
export function tall(r: Load, wide: number): number {
  const room = COLUMN * wide - GAP;
  const lines = (count: number, width: number) => Math.ceil(count / Math.max(1, Math.floor(room / width)));
  // The magnets with strips come among the others, so a row is taken to have one while there are any left.
  const magnets = lines(r.magnets, MAGNET[0]);
  const stripped = Math.min(magnets, lines(r.strips, MAGNET[0]) * 2);
  return SNAP + lines(r.prints, PRINT[0]) * PRINT[1] + magnets * MAGNET[1] + stripped * STRIP + r.alarms * ALARM + lines(r.words, WORD[0]) * WORD[1];
}

/** A width and a place for each room, on a door `across` columns wide. `apart` says that
 * a room may not be under the one before it: it begins a floor. */
export const laid = (rooms: Load[], across: number, apart: (i: number) => boolean): Placed[] => rows(rooms.length, (i, wide) => tall(rooms[i], wide), across, BETWEEN, apart);
