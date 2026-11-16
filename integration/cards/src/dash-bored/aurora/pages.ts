// How Aurora's house becomes screens: a home screen of the house's own tiles, then the
// rooms, split into sets and each set packed into as many screens as it needs
// (bento.ts). Worked out from the survey alone, so only when the registries or the
// screen's size change, never when a light is switched.
import type { Survey } from "../house.ts";
import { bento, type Placed, type Want } from "./bento.ts";

/** A set of rooms that has its own screens, by the rooms' ids. */
export type Split = { id: string; name: string; rooms: string[] };
/** One screen: the home screen, or one of a split's. `part` of `parts` counts from 0. */
export type Screen = { name: string; split?: string; part: number; parts: number; tiles: Placed[] };

// The home screen's tiles, by their ids. A split's tile is SPLIT and its id, a room's ROOM and its id.
export const HERO = "hero";
export const ALERTS = "alerts";
export const SCENES = "scenes";
export const ENERGY = "energy";
export const CLIMATE = "climate";
export const SPLIT = "split:";
export const ROOM = "room:";

const CELL = [200, 175]; // px: the least a cell is across and down
const BAR = 106; // px: what the navigation bar and the screen's edges take of its height

/** How many cells a screen has across and down. */
export function grid(width: number, height: number): [cols: number, rows: number] {
  const cells = (px: number, least: number, most: number) => Math.min(most, Math.max(2, Math.floor(px / least)));
  return [cells(width, CELL[0], 8), cells(height - BAR, CELL[1], 6)];
}

/** How the house is broken into sets of rooms. This is the one place that knows how.
 * Today a set is a floor, with the rooms on no floor as a set of their own, and a house
 * with no floors is one set. The owner means there to be other ways (2026-11-16: "a
 * different as-yet-unspecified way of breaking it down"), so nothing else may assume a
 * set is a floor or an area. */
export function splits(found: Survey): Split[] {
  const floored = found.rooms.some((r) => r.floor);
  const made = new Map<string, Split>();
  for (const r of found.rooms) {
    const name = floored ? (r.floor ?? "Elsewhere") : "Rooms";
    if (!made.has(name)) made.set(name, { id: name, name, rooms: [] });
    made.get(name)!.rooms.push(r.id);
  }
  return [...made.values()];
}

/** The size a room's tile would like, by how much is in the room. */
const wanted = (devices: number): [number, number] => (devices >= 9 ? [2, 2] : devices >= 4 ? [2, 1] : [1, 1]);

/** How many round buttons a tile of this size has room for: three across each cell, and
 * a row of them for each cell down but the first, which shares its cell with the name. */
export const dots = (tile: Pick<Placed, "w" | "h">) => tile.w * 3 * (tile.h * 2 - 1);

const CONTROL = [84, 170, 250]; // px: the least a fader or a key is across, the least it is tall on a tile, and how tall it is on a sheet (styles.ts)
const SPACE = 12; // px: between two of them on a tile
const HEAD = 96; // px: what a tile's name, its temperature and its own edges take of its height
/** How tall each of a room's controls is, in px, on a tile of this size, if the tile can
 * hold them all: the faders and keys of its sheet, in as many rows as they need, as tall
 * as the tile allows up to what they are on a sheet. 0 if they would be too short to
 * use. A tile that holds them is the room's sheet, already open. */
export function holds(wide: number, tall: number, devices: number): number {
  const across = Math.floor((wide - 32 + SPACE) / (CONTROL[0] + SPACE));
  if (!devices || across < 1) return 0;
  const down = Math.ceil(devices / across);
  const each = Math.floor((tall - HEAD - (down - 1) * SPACE) / down);
  return each >= CONTROL[1] ? Math.min(CONTROL[2], each) : 0;
}

/** Every screen, the home screen first. */
export function screens(found: Survey, cols: number, rows: number): Screen[] {
  const sets = splits(found);
  const home: Want[] = [
    { id: HERO, w: cols >= 4 ? 3 : 2, h: 2 },
    { id: ALERTS, w: 2, h: 1 },
    ...(found.scenes.length ? [{ id: SCENES, w: 2, h: 1 }] : []),
    ...(found.power ? [{ id: ENERGY, w: 2, h: 1 }] : []),
    ...(found.rooms.some((r) => r.climate) ? [{ id: CLIMATE, w: 1, h: 2 }] : []),
    ...sets.map((set) => ({ id: SPLIT + set.id, w: 1, h: 1 })),
  ];
  const sizes = new Map(found.rooms.map((r) => [r.id, wanted(r.devices.length)]));

  const paged = (name: string, made: Placed[][], split?: string): Screen[] => made.map((placed, part, all) => ({ name, split, part, parts: all.length, tiles: placed }));
  // A set's rooms are as big as they like only if that costs no more screens than the
  // fewest there can be, which is with every tile one cell: a swipe saved is worth more
  // than a bigger tile. Whatever cells are then left, the tiles grow into anyway.
  const fewest = (tiles: Want[]) => {
    const tried = [tiles, tiles.map((t) => ({ ...t, h: 1 })), tiles.map((t) => ({ ...t, w: 1, h: 1 }))].map((sized) => bento(sized, cols, rows));
    return tried.find((made) => made.length === tried[2].length)!;
  };
  return [...paged("Home", bento(home, cols, rows)), ...sets.flatMap((set) => paged(set.name, fewest(set.rooms.map((id) => ({ id: ROOM + id, w: sizes.get(id)![0], h: sizes.get(id)![1] }))), set.id))];
}
