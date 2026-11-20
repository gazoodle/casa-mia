// Where everything in the house goes, worked out by rule from the list of rooms: nothing
// here is placed by hand.
//
// A room is a cell 1200 by 780, the size the Kitchen was drawn at. The rooms are put in
// rows, in the order the house lists them, and each one stands 60 lower than the one
// before it in its row. That is what lets one trough fall 1 in 20 across a whole row
// and pass through every room at the height the room's machines expect.
//
// The water's way round: the lift raises it from the pond to the tank; it runs along a
// row's trough, past a valve for each device, and what is not drawn off goes down a
// pipe at the row's end; a chute under the row brings it back to the start of the next
// row; and the last chute empties into the pond. Each room also has a gutter under its
// floor for what its machines let go, which runs the same way and into the same pipe.
window.Plan = (() => {
  const CW = 1200, CH = 780, COLS = 3, STEP = 60, PITCH = 1000; // a cell, cells in a row, the step down, and from one row to the next
  const W = 4200, H = 2730, X0 = 440, Y0 = 420; // the whole drawing, and where the first cell is
  const XI = X0 - 40, XP = X0 + COLS * CW + 60; // where water lands on a trough, and a row's pipe
  const LIFT = { x: 120, r: 40, top: 250, bot: 2500 }, TANK = { x: 180, y: 300, w: 220, h: 110 }, POND = { x: 20, y: 2440, w: 410, h: 150, level: 2470 };
  // The mock-up's one room out of doors. A real house would say which of its areas are.
  const OUTSIDE = new Set(["garden"]);

  const cells = House.rooms.map((room, i) => {
    const row = Math.floor(i / COLS), col = i % COLS;
    return { room, row, col, x: X0 + col * CW, y: Y0 + row * PITCH + col * STEP, w: CW, h: CH, outside: OUTSIDE.has(room.id) };
  });
  const rows = Array.from({ length: Math.ceil(cells.length / COLS) }, (_, r) => {
    const y = Y0 + r * PITCH;
    return { y, cells: cells.filter((c) => c.row === r), start: [XI, y + 123], lip: [XP - 20, y + 307], pipe: [XP, y + 905], end: [XI, y + 905 + (XP - XI) / 40] };
  });

  // The trough's water line and the gutter's, inside a cell.
  const ty = Room.ty, gy = (x) => 722 + x * 0.02;

  // The way the water takes from the tank to the pond, as points.
  const river = [[XI, TANK.y + TANK.h - 5], ...rows.flatMap((r) => [r.start, r.lip, [XP, r.lip[1] + 15], r.pipe, r.end]), [XI, POND.level]];
  // And all the way round, for whatever rides it: across the pond, up the lift's rising
  // side, over the top and through the tank.
  const up = LIFT.x - LIFT.r, round = [...river, [up, POND.level], [up, LIFT.top], [LIFT.x, LIFT.top - LIFT.r], [LIFT.x + LIFT.r + 10, LIFT.top],
    [TANK.x + 30, TANK.y + 20], [XI - 10, TANK.y + 20], river[0]];
  const FOOT = river.length; // the point of `round` at which a rider waits for a bucket

  // How far round each point is, and where a point `s` px round is.
  const far = [0];
  for (let i = 1; i < round.length; i++) far.push(far[i - 1] + Math.hypot(round[i][0] - round[i - 1][0], round[i][1] - round[i - 1][1]));
  const LOOP = far.at(-1);
  function at(s) {
    s = ((s % LOOP) + LOOP) % LOOP;
    let i = 1;
    while (far[i] < s) i++;
    const a = round[i - 1], b = round[i], t = (s - far[i - 1]) / (far[i] - far[i - 1] || 1);
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, steep: Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]), left: b[0] < a[0] };
  }
  // How far round the trough is a quarter of the way into a cell: where a rider gets off.
  for (const c of cells) { const r = rows[c.row]; c.s = far[1 + c.row * 5] + (c.x + CW / 4 - r.start[0]) * Math.hypot(1, 0.05); }

  return { CW, CH, W, H, XI, XP, LIFT, TANK, POND, cells, rows, ty, gy, river, at, LOOP, foot: far[FOOT] };
})();
