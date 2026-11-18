// Lays a room out by rule, as a way round for the ducks: [column, row, tile] for each
// tile in turn, the last leading back to the first.
//
// The rule, for a room whose devices all have tiles that go left to right (so far, that
// is lights):
//   - Lights that are switched together (the same `group`) make one wide tile.
//   - The tiles go out along the middle row and back along the bottom one, split so that
//     the two runs are as near the same length as they can be.
//   - A tile that only carries ducks goes between every two devices, so no two device
//     tiles touch. A run that is the shorter is made up with more of them.
//   - On the way out, one pair of those is a climb to the top row and a drop back, so
//     the way is not a plain ring. Which pair is the room's own, from its name.
//   - Every turn is a carrier's: device tiles are never asked to go round a corner.
// The page works out which tiles are to be mirrored from the way they are entered.
window.Layout = (() => {
  const STRAIGHT = ["mangle", "ladle"];

  function route(room) {
    const items = [];
    for (const d of room.devices) {
      if (d.group && items.at(-1)?.[0].group === d.group) items.at(-1).push(d); else items.push([d]);
    }
    const width = (run) => run.reduce((w, item) => w + item.length, 0) + run.length - 1;

    // Where to turn back: the split that leaves the two runs nearest in length.
    let cut = 1;
    for (let i = 1; i < items.length; i++) {
      const lop = (at) => Math.abs(width(items.slice(0, at)) - width(items.slice(at)));
      if (lop(i) < lop(cut)) cut = i;
    }
    const out = items.slice(0, cut), back = items.slice(cut), inner = Math.max(width(out), width(back));

    const way = [], climb = out.length > 2 ? Kit.hash(room.id) % (out.length - 2) : -1;
    let drives = Kit.hash(room.id), straights = 0, col = 1, row = 1;
    const place = (item, step) => {
      const tiles = item.length > 1 ? Tile.group(item, drives++) : [Tile.light(item[0], drives++)];
      for (const tile of tiles) { way.push([col, row, tile]); col += step; }
    };
    const straight = (step) => { way.push([col, row, STRAIGHT[straights++ % STRAIGHT.length]]); col += step; };

    // Out: up from the bottom row, along, and down again at the far end.
    way.push([0, 1, "toaster"]);
    out.forEach((item, i) => {
      place(item, 1);
      if (i === out.length - 1) return;
      if (i === climb) { way.push([col, 1, "cork"], [col, 0, "toaster"]); row = 0; col++; }
      else if (i === climb + 1 && climb >= 0) { way.push([col, 0, "plug"], [col, 1, "trampoline"]); row = 1; col++; }
      else straight(1);
    });
    while (col <= inner) straight(1);
    way.push([inner + 1, 1, "plug"], [inner + 1, 2, "trampoline"]);

    // Back: along the bottom row to where it started.
    col = inner; row = 2;
    straights++; // so that the carriers on the way back are not under their like on the way out
    back.forEach((item, i) => { place(item, -1); if (i < back.length - 1) straight(-1); });
    while (col >= 1) straight(-1);
    way.push([0, 2, "cork"]);
    return way;
  }

  return { route };
})();
