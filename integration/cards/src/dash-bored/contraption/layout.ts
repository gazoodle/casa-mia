// Lays a room out by rule, as a way for the ducks from the hole they join the game by to
// the hole they leave it by. The owner asked for height and for turns (2026-11-18: the
// first rule, two long rows, was "too conveyor belt-ish"), so:
//   - The stream runs along a band three rows deep. After about `LONG` columns it drops
//     to a new band under the first and runs back the other way.
//   - Lights that are switched together (the same `group`) make one wide tile.
//   - A device by itself is followed by a climb or a drop to another row of the band: an
//     escalator, a slide, or a pop up or a fall by way of two carriers. So no two device
//     tiles touch along the stream, and the gap costs one column, as a straight carrier would.
//   - Two or more devices in a row fan out: a redirector, a lane for each of two or three
//     of them (or twice that, two to a lane), and a collector. Every lane has a duck
//     every period (points.ts), so the devices on them all have their engines.
//   - A fan and a device by itself take turns, so that a room is not all one or the other.
//   - Device tiles are drawn left to right only, and every turn is a carrier's.
// A tile is mirrored where the stream runs the other way from the way it is drawn (`flip`).
import { CARRIERS } from "./carriers.ts";
import { escalator, lift, pegs, slide } from "./climbs.ts";
import { standin } from "./devices.ts";
import { group } from "./group.ts";
import { hash } from "./kit.ts";
import { light } from "./light.ts";
import { collector, redirector, sink, source } from "./points.ts";
import { edges, type Dev, type Tile } from "./tile.ts";

export type Step = { col: number; row: number; tile: Tile; flip: boolean };
const LONG = 7; // columns a band runs before the stream turns back under it
const DEEP = 3; // rows to a band
const { cork, toaster, plug, trampoline, mangle, ladle } = CARRIERS;
const STRAIGHT = [mangle, ladle];
// A row up, and a row down: the tile the stream leaves the row by, and the one it comes into the next by.
const UP = [[cork, toaster], escalator], DOWN = [[plug, trampoline], slide];

/** The way through a room of `devices` (at least one). `id` is the room's, which settles its own choices. */
export function route(id: string, devices: Dev[]): Step[] {
  const items: Dev[][] = [];
  for (const d of devices) {
    if (d.group && items.at(-1)?.[0].group === d.group) items.at(-1)!.push(d);
    else items.push([d]);
  }

  const way: Step[] = [];
  let band = 0, dir = 1, origin = 0, col = 1, row = 1, picks = hash(id), drives = hash(id);
  // A tile is drawn for a stream going one way: it is mirrored where this band goes the other.
  const leftward = (tile: Tile) => edges(tile.io).ins.includes("R") || edges(tile.io).outs.includes("L");
  const put = (c: number, r: number, tile: Tile) => void way.push({ col: origin + dir * c, row: band * DEEP + r, tile, flip: dir < 0 !== leftward(tile) });
  const made = (item: Dev[]) => {
    const n = drives++;
    return item.length > 1 ? group(item, n) : [item[0].kind === "light" ? light(item[0], n) : standin(item[0])];
  };
  /** How many devices by themselves come next: lights switched together are not for a lane. */
  const singles = (i: number) => {
    let n = 0;
    while (items[i + n]?.length === 1) n++;
    return n;
  };

  /** From one row to another in one column: by a pair of carriers, with the lift or the cutlery between them for a longer way. */
  function climb(from: number, to: number) {
    const up = to < from, [first, last] = Math.abs(to - from) > 1 ? (up ? UP : DOWN)[0] : (up ? UP : DOWN)[picks++ % 2];
    put(col, from, first);
    for (let r = from + Math.sign(to - from); r !== to; r += Math.sign(to - from)) put(col, r, up ? lift : pegs);
    put(col, to, last);
    [col, row] = [col + 1, to];
  }

  put(0, 1, source);
  let fanned = true; // the room starts with a device by itself
  for (let i = 0; i < items.length; ) {
    const lone = singles(i);

    if (!fanned && lone >= 2 && row === 1) {
      // ---- A fan: the middle row straight on, and a lane above it, below it or both.
      const lanes = Math.min(3, lone), deep = lone >= 2 * lanes && picks++ % 2 ? 2 : 1;
      const rows = lanes === 3 ? [1, 0, 2] : [1, picks++ % 2 ? 0 : 2], sides = rows.map((r) => "RTB"[r === 1 ? 0 : r === 0 ? 1 : 2]).join("");
      const end = col + 2 * deep;
      put(col, 1, redirector(sides));
      put(end, 1, collector(sides.replace("R", "L")));
      for (const r of rows) {
        if (r !== 1) {
          put(col, r, r ? trampoline : toaster);
          put(end, r, r ? cork : plug);
        }
        for (let k = 0; k < deep; k++) {
          put(col + 1 + 2 * k, r, made(items[i++])[0]);
          if (k < deep - 1) put(col + 2 + 2 * k, r, STRAIGHT[picks++ % 2]);
        }
      }
      col = end + 1;
      fanned = true;
    } else {
      // ---- A device by itself, or lights switched together, where the stream is.
      for (const tile of made(items[i++])) put(col++, row, tile);
      fanned = false;
    }
    if (i === items.length) break;

    if (col >= LONG) {
      // ---- A new band: down the end of this one, and back the other way under it.
      put(col, row, plug);
      for (let r = row + 1; r < DEEP; r++) put(col, r, pegs);
      [origin, band, dir] = [origin + dir * col, band + 1, -dir];
      put(0, 0, pegs);
      put(0, 1, trampoline);
      [col, row, fanned] = [1, 1, false];
    } else if (!fanned) {
      // After a device by itself the stream changes row: to the middle one if a fan comes next.
      const next = singles(i) >= 2 ? 1 : (row + 1 + (picks++ % 2)) % DEEP;
      if (next === row) put(col++, row, STRAIGHT[picks++ % 2]);
      else climb(row, next);
    }
  }
  put(col, row, sink);

  const first = Math.min(...way.map((s) => s.col));
  for (const s of way) s.col -= first;
  return way;
}

const BESIDE: Record<string, [number, number, string]> = { L: [-1, 0, "R"], R: [1, 0, "L"], T: [0, -1, "B"], B: [0, 1, "T"] };

/** How the tiles of a way lead to one another: for each, its ways in and out as it lies,
 * and for each way out the tile it leads to (`to`, its place in the list) and which of
 * that tile's ways in it is (`from`). A way out that leads nowhere, a way in that nothing
 * leads to, or two tiles in one place is a mistake in the route, and is said as one. */
export function links(way: Step[]) {
  const where = (s: Step) => `column ${s.col}, row ${s.row}`;
  const at = new Map(way.map((s, i) => [`${s.col},${s.row}`, i]));
  if (at.size !== way.length) throw new Error("The route is wrong: two tiles are in one place.");
  const io = way.map((s) => edges(s.tile.io, s.flip)), fed = io.map(({ ins }) => [...ins].map(() => 0));

  const next = way.map((s, i) => [...io[i].outs].map((side) => {
    const [dc, dr, facing] = BESIDE[side], to = at.get(`${s.col + dc},${s.row + dr}`), from = to === undefined ? -1 : io[to].ins.indexOf(facing);
    if (to === undefined || from < 0) throw new Error(`The route is wrong: the tile at ${where(s)} sends a duck out by ${side}, and nothing takes it.`);
    fed[to][from]++;
    return { to, from };
  }));
  fed.forEach((ways, i) => {
    if (ways.some((n) => n !== 1)) throw new Error(`The route is wrong: the tile at ${where(way[i])} is drawn to be entered by ${io[i].ins}, and is not.`);
  });
  return { io, next };
}
