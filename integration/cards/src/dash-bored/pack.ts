// Rows for things that can be made wider to be made shorter: a room's chassis on the
// Console, a room's magnets on the Fridge. A family says how tall each of its rooms is at
// each width (its own sizes), and how many columns its page has across; this chooses each
// room's width and where the rows break, so that the page is as short as it can be. The
// rooms keep their order: a room is found where it was yesterday (owner, 2026-11-16).
//
// Why it exists: on a big house every room but the biggest was one column wide,
// and a row was as tall as its tallest room, so the Console was 25,655 px tall with a
// third of it controls, and the Fridge 31,274 px (measured 2026-11-16). Sorting the rooms
// by height was tried on those figures and saved 2% to 4% more, which is not worth a room
// moving for.

// A row is columns of things, and a column may be a stack of small ones: on a house of
// small floors a room with two switches was stretched to the height of the alarm beside
// it and was a tenth full (the test VM, 2026-11-16).

/** Where a thing stands: how many columns wide, whether it begins a row, and whether it
 * stands under the thing before it, in the same columns. */
export type Placed = { wide: number; first: boolean; under: boolean };
/** A column of a row, or several columns across: the things that stand in it one under another. */
export type Bay = { row: number; column: number; wide: number; things: number[] };

// ponytail: a stack holds at most this many. Without a limit the shortest page is every
// room in columns as tall as the tallest room, and a room is then read down a column two
// screens long and back up to the top of the next.
const STACK = 3;

/** A width and a place for each of `count` things, in rows, for the least height in all.
 * `tall(i, wide)` is how tall thing `i` is when `wide` columns across (1 to `columns`),
 * and is asked once for each. A row is as tall as its tallest column; each thing in it
 * is as narrow as will fit under that, small things stack in one column while they fit,
 * with `between` px between them, and a row's spare columns go to the columns they make
 * shorter. `apart(i)` says that thing `i` may not stand under the thing before it. */
export function rows(count: number, tall: (i: number, wide: number) => number, columns: number, between = 0, apart: (i: number) => boolean = () => false): Placed[] {
  const heights = Array.from({ length: count }, (_, i) => Array.from({ length: columns }, (_, w) => tall(i, w + 1)));
  // The narrowest that thing `i` can be and stand no taller than `limit`.
  const narrowest = (i: number, limit: number) => {
    const at = heights[i].findIndex((h) => h <= limit);
    return at < 0 ? Infinity : at + 1;
  };

  // The things from `from` up to `to` as a row no taller than `limit`: each column's width and how many stand in it.
  const fitted = (from: number, to: number, limit: number): { wide: number; holds: number }[] | undefined => {
    const stacks: { wide: number; holds: number }[] = [];
    for (let i = from, used = 0; i < to; ) {
      const wide = narrowest(i, limit);
      used += wide;
      if (used > columns) return undefined;
      let holds = 1;
      for (let height = heights[i++][wide - 1]; i < to && holds < STACK && !apart(i) && height + between + heights[i][wide - 1] <= limit; i++, holds++) height += between + heights[i][wide - 1];
      stacks.push({ wide, holds });
    }
    return stacks;
  };
  // The least height of a row of those things, and the row. A row is taken to be as tall as one of its things alone.
  const row = (from: number, to: number) => {
    const things = Array.from({ length: to - from }, (_, k) => from + k);
    for (const height of [...new Set(things.flatMap((i) => heights[i]))].sort((a, b) => a - b)) {
      const stacks = fitted(from, to, height);
      if (stacks) return { height, stacks };
    }
    return undefined;
  };

  // From the last thing back: the least height of everything from `i` on, and the row that begins it.
  const least: number[] = Array(count + 1).fill(0);
  const begun: { wide: number; holds: number }[][] = [];
  for (let i = count - 1; i >= 0; i--) {
    least[i] = Infinity;
    for (let to = i + 1; to <= Math.min(count, i + columns * STACK); to++) {
      const found = row(i, to);
      if (!found) continue;
      // Of two ways as short as each other, the one with more in this row.
      if (found.height + between + least[to] <= least[i]) {
        least[i] = found.height + between + least[to];
        begun[i] = found.stacks;
      }
    }
  }

  const placed: Placed[] = [];
  for (let i = 0; i < count; ) {
    const stacks = begun[i].map((s) => ({ ...s }));
    const starts = stacks.map((_, k) => i + stacks.slice(0, k).reduce((sum, t) => sum + t.holds, 0));
    const height = (k: number, wide: number) => Array.from({ length: stacks[k].holds }, (_, n) => heights[starts[k] + n][wide - 1]).reduce((sum, h) => sum + h + between, 0);
    // A spare column goes to the tallest column that it would make shorter, while there is one.
    for (let spare = columns - stacks.reduce((sum, s) => sum + s.wide, 0); spare > 0; spare--) {
      const gains = stacks.map((s, k) => (height(k, s.wide + 1) < height(k, s.wide) ? height(k, s.wide) : -1));
      const most = Math.max(...gains);
      if (most < 0) break;
      stacks[gains.indexOf(most)].wide++;
    }
    stacks.forEach((s, k) => {
      for (let n = 0; n < s.holds; n++) placed.push({ wide: s.wide, first: k === 0 && n === 0, under: n > 0 });
    });
    i += stacks.reduce((sum, s) => sum + s.holds, 0);
  }
  return placed;
}

/** The places as the columns of each row, for a page that draws them on a grid: which
 * row, which column it begins at (from 1), how wide, and which things stand in it. */
export function bays(placed: Placed[]): Bay[] {
  const found: Bay[] = [];
  let row = 0, column = 1;
  placed.forEach((p, i) => {
    if (p.under) return void found.at(-1)!.things.push(i);
    if (p.first && i) row++, (column = 1);
    found.push({ row, column, wide: p.wide, things: [i] });
    column += p.wide;
  });
  return found;
}
