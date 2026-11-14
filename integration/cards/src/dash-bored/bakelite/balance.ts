// How wide each room's chassis is: one, two or three widths of the panel's grid. A room
// with many controls is made wider so that it is not far taller than its neighbours.
export type Load = { knobs: number; dollies: number; alarms: number; meter: boolean };

// What a chassis of each width has room for across, and the size of each control as
// [width, height] with its plate and the gap beside it. They follow the sizes in
// styles.ts: change them together.
const ROOM = [140, 312, 484];
const METER = [196, 150];
const KNOB = [110, 140];
const DOLLY = [98, 100];
const ALARM = [146, 170];
const LEAST = 300; // px: a house of small rooms keeps them one wide, up to this height

/** The height of a room's controls in a chassis `wide` widths across (1 to 3). They are
 * laid in rows as they come, the meter first, and a row is as tall as its tallest. */
export function tall(r: Load, wide: number): number {
  const room = ROOM[wide - 1];
  let height = 0, used = room, row = 0;
  for (const [w, h] of [...(r.meter ? [METER] : []), ...Array(r.knobs).fill(KNOB), ...Array(r.dollies).fill(DOLLY), ...Array(r.alarms).fill(ALARM)]) {
    if (used + w > room) {
      height += row;
      used = row = 0;
    }
    used += w;
    row = Math.max(row, h);
  }
  return height + row;
}

/** A width for each room. The room that is tallest at three wide sets the height, and
 * every room takes the narrowest width that fits under it. */
export function widths(rooms: Load[]): number[] {
  const limit = Math.max(LEAST, ...rooms.map((r) => tall(r, 3)));
  return rooms.map((r) => [1, 2].find((wide) => tall(r, wide) <= limit) ?? 3);
}
