// The bento: tiles of different sizes packed into screens with no cell left free. A
// screen is a grid of `cols` by `rows` cells. Each tile says the size it would like; it is
// put in the first place it fits, smaller if it must be, and when everything that fits a
// screen is on it, the tiles grow into whatever cells are left.
//
// Why it exists (owner, 2026-11-16): the first build had tiles of one size in a column
// that ended early, with "loads of space around"; the mock-up had none.
//
// A tile's size comes from things that seldom change (how many devices a room has), never
// from how the house stands now: a tile must not move because a light was switched on.

export type Want = { id: string; w: number; h: number };
/** Where a tile is on its screen, in cells from the top left, and how many it covers. */
export type Placed = { id: string; col: number; row: number; w: number; h: number };

/** Whether a block of cells is inside the grid and free. */
function free(taken: boolean[], cols: number, rows: number, col: number, row: number, w: number, h: number) {
  if (col < 0 || row < 0 || col + w > cols || row + h > rows) return false;
  for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if (taken[r * cols + c]) return false;
  return true;
}

function take(taken: boolean[], cols: number, p: Placed) {
  for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) taken[r * cols + c] = true;
}

/** As many of the tiles as fit one screen, in order, each at the first place it fits:
 * at the size it wants, else one row tall, else one cell. It stops at the first that
 * fits nowhere, so that the tiles keep their order from screen to screen. */
function place(tiles: Want[], cols: number, rows: number): { placed: Placed[]; taken: boolean[] } {
  const taken: boolean[] = new Array(cols * rows).fill(false);
  const placed: Placed[] = [];
  for (const tile of tiles) {
    const w = Math.min(tile.w, cols);
    const h = Math.min(tile.h, rows);
    let put: Placed | undefined;
    for (const [tw, th] of [[w, h], [w, 1], [1, 1]]) {
      for (let at = 0; at < cols * rows && !put; at++) if (free(taken, cols, rows, at % cols, Math.floor(at / cols), tw, th)) put = { id: tile.id, col: at % cols, row: Math.floor(at / cols), w: tw, h: th };
      if (put) break;
    }
    if (!put) break;
    take(taken, cols, put);
    placed.push(put);
  }
  return { placed, taken };
}

/** Grow the tiles into the cells that are left, a column or a row at a time, the smallest
 * tile first so that none runs away with the screen. A tile grows to the right or down
 * before it grows to the left or up, so that it stays where it was put. */
function grow(placed: Placed[], taken: boolean[], cols: number, rows: number) {
  for (let grew = true; grew && taken.includes(false); ) {
    grew = false;
    for (const p of [...placed].sort((a, b) => a.w * a.h - b.w * b.h)) {
      // Each way to grow: the strip of cells it would take, and what the tile becomes.
      const ways: [strip: [number, number, number, number], then: Partial<Placed>][] = [
        [[p.col + p.w, p.row, 1, p.h], { w: p.w + 1 }],
        [[p.col, p.row + p.h, p.w, 1], { h: p.h + 1 }],
        [[p.col - 1, p.row, 1, p.h], { col: p.col - 1, w: p.w + 1 }],
        [[p.col, p.row - 1, p.w, 1], { row: p.row - 1, h: p.h + 1 }],
      ];
      const way = ways.find(([strip]) => free(taken, cols, rows, ...strip));
      if (!way) continue;
      Object.assign(p, way[1]);
      take(taken, cols, p);
      grew = true;
    }
  }
}

/** The tiles as screens of `cols` by `rows` cells, in order, as few screens as hold them
 * and about as many tiles on each. */
export function bento(tiles: Want[], cols: number, rows: number): Placed[][] {
  // How many screens it takes when each is filled before the next is begun.
  let count = 0;
  for (let left = tiles; left.length; count++) left = left.slice(place(left, cols, rows).placed.length || 1);

  const screens: Placed[][] = [];
  for (let left = tiles; left.length; ) {
    // Shared out: a last screen with one tile on it would be one tile a screen wide.
    const share = Math.ceil(left.length / Math.max(1, count - screens.length));
    let { placed, taken } = place(left.slice(0, share), cols, rows);
    grow(placed, taken, cols, rows);
    // Tall tiles can box a free cell in, where none of them can grow into it (about one
    // screen in fifty, by a sweep of 12,600). Tiles one row tall can't: the screen is laid
    // out again with them so, and each row is then filled by the tile at its end.
    if (taken.includes(false)) {
      ({ placed, taken } = place(left.slice(0, share).map((tile) => ({ ...tile, h: 1 })), cols, rows));
      grow(placed, taken, cols, rows);
    }
    screens.push(placed);
    left = left.slice(placed.length || 1);
  }
  return screens;
}
