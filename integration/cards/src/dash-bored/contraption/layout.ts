// Lays a room out by rule, as a way round for the ducks: [column, row, tile] for each
// tile in turn, the last leading back to the first.
//
// The rule, for a room whose devices all have tiles that go left to right:
//   - Lights that are switched together (the same `group`) make one wide tile.
//   - The tiles go out along the middle row and back along the bottom one, split so that
//     the two runs are as near the same length as they can be.
//   - A tile that only carries ducks goes between every two devices, so no two device
//     tiles touch. A run that is the shorter is made up with more of them.
//   - On the way out, one pair of those is a climb to the top row and a drop back, so
//     the way is not a plain ring. Which pair is the room's own, from its id.
//   - Every turn is a carrier's: device tiles are never asked to go round a corner.
// The page works out which tiles are to be mirrored from the way they are entered (`fits`).
import { CARRIERS } from "./carriers.ts";
import { standin } from "./devices.ts";
import { group } from "./group.ts";
import { hash } from "./kit.ts";
import { light } from "./light.ts";
import type { Dev, Tile } from "./tile.ts";

export type Step = [col: number, row: number, tile: Tile];
const STRAIGHT = [CARRIERS.mangle, CARRIERS.ladle];

/** The way round a room of `devices` (at least one). `id` is the room's, which settles its own choices. */
export function route(id: string, devices: Dev[]): Step[] {
  const items: Dev[][] = [];
  for (const d of devices) {
    if (d.group && items.at(-1)?.[0].group === d.group) items.at(-1)!.push(d);
    else items.push([d]);
  }
  const width = (run: Dev[][]) => run.reduce((w, item) => w + item.length, 0) + run.length - 1;

  // Where to turn back: the split that leaves the two runs nearest in length.
  let cut = 1;
  for (let i = 1; i < items.length; i++) {
    const lop = (at: number) => Math.abs(width(items.slice(0, at)) - width(items.slice(at)));
    if (lop(i) < lop(cut)) cut = i;
  }
  const out = items.slice(0, cut), back = items.slice(cut), inner = Math.max(width(out), width(back));

  const way: Step[] = [], climb = out.length > 2 ? hash(id) % (out.length - 2) : -1;
  let drives = hash(id), straights = 0, col = 1, row = 1;
  const place = (item: Dev[], step: number) => {
    const n = drives++;
    const tiles = item.length > 1 ? group(item, n) : [item[0].kind === "light" ? light(item[0], n) : standin(item[0])];
    for (const tile of tiles) {
      way.push([col, row, tile]);
      col += step;
    }
  };
  const straight = (step: number) => {
    way.push([col, row, STRAIGHT[straights++ % STRAIGHT.length]]);
    col += step;
  };

  // Out: up from the bottom row, along, and down again at the far end.
  way.push([0, 1, CARRIERS.toaster]);
  out.forEach((item, i) => {
    place(item, 1);
    if (i === out.length - 1) return;
    if (i === climb) {
      way.push([col, 1, CARRIERS.cork], [col, 0, CARRIERS.toaster]);
      row = 0;
      col++;
    } else if (i === climb + 1 && climb >= 0) {
      way.push([col, 0, CARRIERS.plug], [col, 1, CARRIERS.trampoline]);
      row = 1;
      col++;
    } else straight(1);
  });
  while (col <= inner) straight(1);
  way.push([inner + 1, 1, CARRIERS.plug], [inner + 1, 2, CARRIERS.trampoline]);

  // Back: along the bottom row to where it started.
  col = inner;
  row = 2;
  straights++; // so that the carriers on the way back are not under their like on the way out
  back.forEach((item, i) => {
    place(item, -1);
    if (i < back.length - 1) straight(-1);
  });
  while (col >= 1) straight(-1);
  way.push([0, 2, CARRIERS.cork]);
  return way;
}

const side = (c: Step, other: Step) => (other[0] < c[0] ? "L" : other[0] > c[0] ? "R" : other[1] < c[1] ? "T" : "B");
const mirrored = (io: string) => io.replace(/[LR]/g, (s) => (s === "L" ? "R" : "L"));

/** Whether each tile of a way round is to be mirrored, from the tiles either side of it.
 * A tile that cannot be made to fit is a mistake in the route, and is said as one. */
export function fits(way: Step[]): boolean[] {
  return way.map((c, i) => {
    const need = side(c, way.at(i - 1)!) + side(c, way[(i + 1) % way.length]), io = c[2].io;
    if (io !== need && mirrored(io) !== need) throw new Error(`The route is wrong: the tile at column ${c[0]}, row ${c[1]} goes ${io}, and it is asked to go ${need}.`);
    return io !== need;
  });
}
