// How Aurora's house becomes screens: a home screen of the house's own tiles, then the
// rooms, split into sets and each set packed into as many screens as it needs
// (bento.ts). Worked out from the survey alone, so only when the registries or the
// screen's size change, never when a light is switched.
import type { Survey } from "../house.ts";
import { bento, type Placed, type Want } from "./bento.ts";

/** A set of rooms that has its own screens, by the rooms' ids. */
export type Split = { id: string; name: string; rooms: string[] };
/** One screen: the home screen (no splits), or one that holds the rooms of one split or
 * of several small ones. `part` of `parts` counts from 0. Each screen has its own grid. */
export type Screen = { name: string; splits: string[]; part: number; parts: number; cols: number; rows: number; tiles: Placed[] };

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

const SHAPE = 1.3; // a cell's width over its height, where there is a choice: about the mock-up's
const FULL = 0.85; // sets of rooms share a screen only while they take no more of its cells than this
const ROOMY = [300, 250, 1.6]; // px: the cell at which a tile's contents are life size, and the most they are enlarged

/** How much a tile's contents are enlarged in a cell of this size: a big cell has big
 * lettering and controls, not the same ones in a corner of an empty tile. */
export const zoom = (wide: number, tall: number) => Math.min(ROOMY[2], Math.max(1, Math.min(wide / ROOMY[0], tall / ROOMY[1])));

/** The most cells a screen can have across and down. */
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

/** The grid for tiles that fit one screen: the one with the fewest cells to spare whose
 * cells are nearest SHAPE, so that each tile is about the size it asked for. Why (owner,
 * 2026-11-16, of a Mac's window): a grid of as many cells as the window could hold made
 * seven tiles share 48 cells, and each grew into an empty slab. `shape` is the screen's
 * width over its height. Nothing if the tiles need more than one screen. */
function fitted(tiles: Want[], cols: number, rows: number, shape: number) {
  const need = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
  let best: { cost: number; cols: number; rows: number; tiles: Placed[] } | undefined;
  for (let c = Math.max(...tiles.map((t) => t.w)); c <= cols; c++) {
    for (let r = Math.max(...tiles.map((t) => t.h)); r <= rows; r++) {
      const cost = (c * r - need) / need + Math.abs(Math.log((shape * r) / c / SHAPE));
      if (c * r < need || (best && cost >= best.cost)) continue;
      const made = bento(tiles, c, r);
      if (made.length === 1) best = { cost, cols: c, rows: r, tiles: made[0] };
    }
  }
  return best;
}

/** Every screen of an element `width` by `height` px, the home screen first. */
export function screens(found: Survey, width: number, height: number): Screen[] {
  const [cols, rows] = grid(width, height);
  const shape = width / Math.max(1, height - BAR);
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

  const want = (set: Split): Want[] => set.rooms.map((id) => ({ id: ROOM + id, w: sizes.get(id)![0], h: sizes.get(id)![1] }));

  // A set's rooms are as big as they like only if that costs no more screens than the
  // fewest there can be, which is with every tile one cell: a swipe saved is worth more
  // than a bigger tile. Whatever cells are then left, the tiles grow into anyway.
  const fewest = (tiles: Want[]) => {
    const tried = [tiles, tiles.map((t) => ({ ...t, h: 1 })), tiles.map((t) => ({ ...t, w: 1, h: 1 }))].map((sized) => bento(sized, cols, rows));
    return tried.find((made) => made.length === tried[2].length)!;
  };
  // Tiles that fit one screen have a grid of their own; the rest have the most cells there can be, on as many screens as they need.
  const paged = (name: string, tiles: Want[], ids: string[], lay = fewest): Screen[] => {
    const one = fitted(tiles, cols, rows, shape);
    if (one) return [{ name, splits: ids, part: 0, parts: 1, cols: one.cols, rows: one.rows, tiles: one.tiles }];
    return lay(tiles).map((placed, part, all) => ({ name, splits: ids, part, parts: all.length, cols, rows, tiles: placed }));
  };

  // Small sets next to each other share a screen while they fit one at the sizes their
  // rooms would like: two rooms would otherwise have a whole screen between them.
  const shared: Split[][] = [];
  for (const set of sets) {
    const tiles = [...(shared.at(-1) ?? []), set].flatMap(want);
    const fits = shared.length > 0 && tiles.reduce((sum, t) => sum + t.w * t.h, 0) <= cols * rows * FULL && bento(tiles, cols, rows).length === 1;
    if (fits) shared.at(-1)!.push(set);
    else shared.push([set]);
  }
  const named = (group: Split[]) => (group.length === sets.length && group.length > 1 ? "Rooms" : group.map((set) => set.name).join(" · "));

  return [...paged("Home", home, [], (tiles) => bento(tiles, cols, rows)), ...shared.flatMap((group) => paged(named(group), group.flatMap(want), group.map((set) => set.id)))];
}
