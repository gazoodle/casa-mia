// Which duck is where, period by period: the machine as a network, with no drawing in it.
//
// The network is tiles joined edge to edge, and tunnels under the sheet from one tile's
// hole to another's (owner, 2026-11-18: "a network of loops ... engineered to be clean").
// Clean means: every way in, every way out and every tunnel carries exactly one duck a
// period, on one beat. No duck is made, lost, hurried or kept waiting. A tile that sends
// ducks out by more ways than they come in by gets the rest up its hole, from tunnels; one
// that takes more in than it sends on puts the rest down its hole. The layout has to
// balance (layout.ts `links` refuses one that does not), and then this runs for ever.
//
// A tunnel may fork under the sheet into several ways that all end at its far hole. The
// ducks take the ways in turn. One still comes up each period so long as no two ways bring
// a duck up on the same beat, which `beats` settles.
import { dealt } from "./tile.ts";

/** A tile in the network: how many ways in it has, where each way out leads (`to` a tile,
 * as that tile's way in `from`), and the tunnels that come up at its hole and go down it. */
export type Node = { ins: number; next: { to: number; from: number }[]; up: number[]; down: number[] };
/** A tunnel: the tile it comes up at, and for each of its ways how many periods a duck is in it. */
export type Net = { nodes: Node[]; tunnels: { to: number; ways: { periods: number }[] }[] };
/** A duck. In a tile: `cell`, the way it came in by and the way it is to go out by, each
 * below nought for the tile's hole (tile.ts `Ctx`). In a tunnel: `tunnel`, and `age`, the
 * whole periods it has been there, and `way`, which of its ways it took. The other of
 * `cell` and `tunnel` is -1. */
export type Duck = { id: number; cell: number; tunnel: number; way: number; age: number; from: number; to: number };

/** How many periods a duck is to be in each way of a forked tunnel, given how many each
 * needs at the least (`least`): as few as will do, and such that the ducks, which go in one
 * a period and take the ways in turn, come out one a period too. */
export function beats(least: number[]) {
  const taken = new Set<number>(), m = least.length;
  return least.map((periods, way) => {
    while (taken.has((way + periods) % m)) periods++;
    taken.add((way + periods) % m);
    return periods;
  });
}

/** Say which way each duck that has just come into a tile is to go: they take turns (`dealt`). */
function deal(net: Net, ducks: Duck[], turn: number) {
  const here = net.nodes.map((): Duck[] => []);
  for (const k of ducks) if (k.cell >= 0) here[k.cell].push(k);

  here.forEach((came, c) => {
    const { next, down } = net.nodes[c], places = [...next.map((_, way) => way), ...down.map((_, k) => -1 - k)];
    // Those from the ways in first, in their order, then those from the hole in theirs.
    came.sort((a, b) => (a.from < 0 ? 1e3 - a.from : a.from) - (b.from < 0 ? 1e3 - b.from : b.from));
    came.forEach((k, slot) => (k.to = places[dealt(slot, turn, places.length)]));
  });
  return ducks;
}

/** The ducks of a machine that has been running for ever: one for each way into each
 * tile, one for each tunnel that comes up there, and one for each period of each tunnel. */
export function begin(net: Net): Duck[] {
  const ducks: Duck[] = [], duck = (more: Partial<Duck>) => void ducks.push({ id: ducks.length, cell: -1, tunnel: -1, way: 0, age: 0, from: 0, to: 0, ...more });
  net.nodes.forEach((node, cell) => {
    for (let from = 0; from < node.ins; from++) duck({ cell, from });
    node.up.forEach((_, k) => duck({ cell, from: -1 - k }));
  });
  // The duck that has been in a tunnel `age` periods went in that many turns ago, by the way whose turn it was then.
  net.tunnels.forEach(({ ways }, tunnel) => {
    const m = ways.length, most = Math.max(...ways.map((w) => w.periods));
    for (let age = 0; age < most; age++) {
      const way = (m - (age % m)) % m;
      if (age < ways[way].periods) duck({ tunnel, way, age });
    }
  });
  return deal(net, ducks, 0);
}

/** The period has come round, for the `turn`th time: every duck goes on to the tile its
 * way out leads to, or down its tile's hole into a tunnel, or a period further along its
 * tunnel, or up out of it. Then each tile says which way its new ducks are to go. */
export function advance(net: Net, ducks: Duck[], turn: number) {
  for (const k of ducks) {
    if (k.tunnel >= 0) {
      if (++k.age < net.tunnels[k.tunnel].ways[k.way].periods) continue;
      const cell = net.tunnels[k.tunnel].to;
      Object.assign(k, { cell, from: -1 - net.nodes[cell].up.indexOf(k.tunnel), tunnel: -1 });
    } else if (k.to >= 0) {
      const way = net.nodes[k.cell].next[k.to];
      Object.assign(k, { cell: way.to, from: way.from });
    } else {
      const tunnel = net.nodes[k.cell].down[-1 - k.to];
      Object.assign(k, { tunnel, way: turn % net.tunnels[tunnel].ways.length, age: 0, cell: -1 });
    }
  }
  return deal(net, ducks, turn);
}
