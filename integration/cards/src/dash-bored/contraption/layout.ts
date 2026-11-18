// Lays a room out by rule, as a network of loops for the ducks: tiles on the sheet, and
// tunnels under it. What the owner asked of it (2026-11-18): height and turns, since two
// long rows were "too conveyor belt-ish"; a dumb waiter in the middle that feeds both
// sides; and many loops that look complicated and are "engineered to be clean".
//   - A dumb waiter goes up a shaft in the middle. The room's devices are shared out
//     among wings, two to a band three rows deep: one out to the right of the shaft and
//     one to the left. At each band a redirector on the shaft sends a duck along each
//     wing and one on up.
//   - A wing runs outwards and ends at a hole. Its ducks go back under the sheet by a
//     tunnel, to the shaft's redirector at its own band, whose spares they are.
//   - The duck that rides to the top goes down a hole there, and back to the foot by a
//     tunnel that goes the long way round, through the places with no tile, forking as
//     it goes (owner, 2026-11-18: "a pointless tunnel system to fill blank spaces, driven
//     from the top exit of the dumb waiter").
//   - Along a wing, a device by itself is followed by a climb or a drop to another row:
//     an escalator, a slide, or a pop up or a fall by way of two carriers. So no two
//     device tiles touch along the stream, and the gap costs one column.
//   - Two or more devices in a row fan out: a redirector, a lane for each of two or three
//     of them (or twice that, two to a lane), and a collector, whose hole is joined to
//     the redirector's by a tunnel for each duck it has too many.
//   - Lights that are switched together (the same `group`) make one wide tile.
//   - Device tiles are drawn left to right only, and every turn is a carrier's.
// What it gives is a block in its own columns and rows, which the machine places on the
// sheet. Nothing here says how rooms adjoin: that is to come from Topology
// (docs/design/topology.md), and the shaft is where a floor above or below would join.
import { CARRIERS } from "./carriers.ts";
import { escalator, lift, pegs, slide } from "./climbs.ts";
import { standin } from "./devices.ts";
import { group } from "./group.ts";
import { hash } from "./kit.ts";
import { light } from "./light.ts";
import { collector, foot, redirector, sink, top } from "./points.ts";
import { S, edges, type Dev, type Tile } from "./tile.ts";
import { LAYERS, legs, placed, timed, wander, type Leg, type Point, type Way } from "./underground.ts";

/** A tile's place. It is mirrored where the stream runs the other way from the way it is drawn (`flip`). */
export type Step = { col: number; row: number; tile: Tile; flip: boolean };
/** A tunnel from one tile's hole to another's (their places in `way`), its ways under the
 * sheet in the sheet's units (one, or several that the ducks take in turn), and the layer it is on. */
export type Tunnel = { from: number; to: number; ways: Way[]; layer: number };
export type Layout = { way: Step[]; tunnels: Tunnel[] };

const LONG = 8; // about how many columns of devices a wing holds before the room has another wing
const DEEP = 3; // rows to a band
const { cork, toaster, plug, trampoline, mangle, ladle } = CARRIERS;
const STRAIGHT = [mangle, ladle];
// A row up, and a row down: the tile the stream leaves the row by, and the one it comes into the next by.
const UP = [[cork, toaster], escalator], DOWN = [[plug, trampoline], slide];
/** About how many columns something takes with the gap after it. */
const takes = (item: Dev[]) => item.length + 1;

/** The network for a room of `devices` (at least one). `id` is the room's, which settles its own choices. */
export function route(id: string, devices: Dev[]): Layout {
  const items: Dev[][] = [];
  for (const d of devices) {
    if (d.group && items.at(-1)?.[0].group === d.group) items.at(-1)!.push(d);
    else items.push([d]);
  }

  // ---- The wings: the devices in their order, shared out so that the wings are about as long as each other.
  const all = items.reduce((sum, item) => sum + takes(item), 0), share = all / Math.max(1, Math.ceil(all / LONG));
  const wings: Dev[][][] = [[]];
  let filled = 0;
  for (const item of items) {
    if (filled >= share * wings.length && wings.at(-1)!.length) wings.push([]);
    wings.at(-1)!.push(item);
    filled += takes(item);
  }

  const way: Step[] = [], joins: [from: number, to: number][] = [], ends: number[][] = [];
  let picks = hash(id), drives = hash(id);
  // A tile is drawn for a stream going one way: it is mirrored where the wing goes the other.
  const leftward = (tile: Tile) => edges(tile.io).ins.includes("R") || edges(tile.io).outs.includes("L");
  const made = (item: Dev[]) => {
    const n = drives++;
    return item.length > 1 ? group(item, n) : [item[0].kind === "light" ? light(item[0], n) : standin(item[0])];
  };

  wings.forEach((wing, k) => {
    const band = k >> 1, dir = k % 2 ? -1 : 1;
    let col = 1, row = 1, fanned = true; // a wing starts with a device by itself
    const put = (c: number, r: number, tile: Tile) => way.push({ col: dir * c, row: band * DEEP + r, tile, flip: dir < 0 !== leftward(tile) }) - 1;
    /** How many devices by themselves come next: lights switched together are not for a lane. */
    const singles = (i: number) => {
      let n = 0;
      while (wing[i + n]?.length === 1) n++;
      return n;
    };

    for (let i = 0; i < wing.length; ) {
      const lone = singles(i);
      if (!fanned && lone >= 2 && row === 1) {
        // ---- A fan: the middle row straight on, and a lane above it, below it or both.
        const lanes = Math.min(3, lone), deep = lone >= 2 * lanes && picks++ % 2 ? 2 : 1;
        const rows = lanes === 3 ? [1, 0, 2] : [1, picks++ % 2 ? 0 : 2], sides = rows.map((r) => "RTB"[r === 1 ? 0 : r === 0 ? 1 : 2]).join("");
        const end = col + 2 * deep, parts = put(col, 1, redirector("L", sides)), meets = put(end, 1, collector(sides.replace("R", "L")));
        // The collector has a duck too many for every lane but one, and the redirector one too few.
        for (let spare = 1; spare < lanes; spare++) joins.push([meets, parts]);

        for (const r of rows) {
          if (r !== 1) {
            put(col, r, r ? trampoline : toaster);
            put(end, r, r ? cork : plug);
          }
          for (let n = 0; n < deep; n++) {
            put(col + 1 + 2 * n, r, made(wing[i++])[0]);
            if (n < deep - 1) put(col + 2 + 2 * n, r, STRAIGHT[picks++ % 2]);
          }
        }
        col = end + 1;
        fanned = true;
      } else {
        // ---- A device by itself, or lights switched together, where the stream is.
        for (const tile of made(wing[i++])) put(col++, row, tile);
        fanned = false;
      }
      if (i === wing.length || fanned) continue;

      // After a device by itself the stream changes row: to the middle one if a fan comes next.
      const next = singles(i) >= 2 ? 1 : (row + 1 + (picks++ % 2)) % DEEP, up = next < row;
      if (next === row) put(col, row, STRAIGHT[picks++ % 2]);
      else {
        const [first, last] = Math.abs(next - row) > 1 ? (up ? UP : DOWN)[0] : (up ? UP : DOWN)[picks++ % 2];
        put(col, row, first);
        for (let r = row + Math.sign(next - row); r !== next; r += Math.sign(next - row)) put(col, r, up ? lift : pegs);
        put(col, next, last);
      }
      [col, row] = [col + 1, next];
    }
    (ends[band] ??= []).push(put(col, row, sink));
  });

  // ---- The shaft: the dumb waiter from its foot up to its top, with a way off at each band.
  const bands = ends.length, shaft = (row: number, tile: Tile) => way.push({ col: 0, row, tile, flip: false }) - 1;
  const base = shaft((bands - 1) * DEEP + 2, foot), roof = shaft(0, top);
  for (let band = 0; band < bands; band++) {
    const node = shaft(band * DEEP + 1, redirector("B", "R" + (wings[2 * band + 1] ? "L" : "") + "T"));
    for (const end of ends[band]) joins.push([end, node]);
    if (band) for (const row of [band * DEEP - 1, band * DEEP]) shaft(row, lift);
  }

  const first = Math.min(...way.map((s) => s.col));
  for (const s of way) s.col -= first;

  // ---- The tunnels, from hole to hole. The long way round first, on the deepest layer:
  // it goes where it likes, and the others are then placed to keep clear of it and of each other.
  const pit = ({ col, row, tile, flip }: Step): Point => [col * S + (flip ? S - tile.pit![0] : tile.pit![0]), row * S + tile.pit![1]];
  const full = new Set(way.map((s) => `${s.col},${s.row}`)), cols = Math.max(...way.map((s) => s.col)) + 1;
  const blank = Array.from({ length: cols * bands * DEEP }, (_, i): [number, number] => [i % cols, Math.floor(i / cols)]).filter((cell) => !full.has(String(cell)));
  const round = wander(pit(way[roof]), pit(way[base]), blank, way[base].col, id);
  const tunnels: Tunnel[] = [{ from: roof, to: base, ways: round, layer: LAYERS - 1 }], there: Leg[] = round.flatMap((w) => legs(w.path));

  const holes = [...new Set(joins.map(([, to]) => to))];
  joins.forEach(([from, to], i) => {
    // Tunnels bound for one hole are on one layer, where they may share a tube; two between the same holes share all of it.
    const kin = tunnels.filter((t) => t.to === to), twin = kin.find((t) => t.from === from);
    const path = twin?.ways[0].path ?? placed(pit(way[from]), pit(way[to]), `${id}.${i}`, there, kin.map((t) => t.ways[0].path));
    tunnels.push({ from, to, ways: [timed(path, kin.length, joins.filter((j) => j[1] === to).length)], layer: holes.indexOf(to) % (LAYERS - 1) });
    there.push(...legs(path));
  });
  return { way, tunnels };
}

const BESIDE: Record<string, [number, number, string]> = { L: [-1, 0, "R"], R: [1, 0, "L"], T: [0, -1, "B"], B: [0, 1, "T"] };

/** How the tiles of a layout lead to one another: for each, its ways in and out as it
 * lies; for each way out the tile it leads to (`to`, its place in the list) and which of
 * that tile's ways in it is (`from`); and the tunnels that come up at its hole and go
 * down it. A mistake in the layout is said as one: a way out that leads nowhere, a way in
 * that nothing leads to, two tiles in one place, or a tile that is not in balance, which
 * is one that takes in more or fewer ducks a period than it sends out. */
export function links({ way, tunnels }: Layout) {
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
  const up = way.map((_, i) => tunnels.flatMap((t, n) => (t.to === i ? n : []))), down = way.map((_, i) => tunnels.flatMap((t, n) => (t.from === i ? n : [])));

  way.forEach((s, i) => {
    if (fed[i].some((n) => n !== 1)) throw new Error(`The route is wrong: the tile at ${where(s)} is drawn to be entered by ${io[i].ins}, and is not.`);
    const comes = io[i].ins.length + up[i].length, goes = io[i].outs.length + down[i].length;
    if (comes !== goes || !comes) throw new Error(`The route is wrong: ${comes} ducks a period come into the tile at ${where(s)} and ${goes} leave it.`);
    if ((up[i].length || down[i].length) && !s.tile.pit) throw new Error(`The route is wrong: a tunnel ends at the tile at ${where(s)}, which has no hole.`);
  });
  return { io, next, up, down };
}
