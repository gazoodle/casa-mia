// NEVER TEST THIS: a trial, to be thrown away once the duck run is drawn this way.
//
// The question it answers: how many tiles can one canvas show, each with its parts being
// placed and turned on every frame, when the parts are bitmaps (sprites.js)? It takes the
// Long Gallery's real tiles, makes the bitmaps, and shows as many copies of the room as
// are asked for (`?tiles=`), every moving part of every tile turning. The poses are not
// the real ones; the amount of drawing is.
//
// `?size=` is px to a tile (all of it fitted to the screen if not given), `?skin=` the skin.
(async () => {
  const params = new URLSearchParams(location.search), S = Tile.S, said = document.getElementById("rate");
  document.body.dataset.skin = params.get("skin") ?? "tin";

  // The room's tiles, put on the page unseen, to be measured.
  const route = Rooms.gallery.loops()[0], cols = Math.max(...route.map((c) => c[0])) + 1, rows = Math.max(...route.map((c) => c[1])) + 1;
  const bench = document.getElementById("bench");
  bench.innerHTML = route.map(([, , tile], i) => { tile = typeof tile === "string" ? Tile.made[tile] : tile; return `<g data-still="${i}">${tile.still ?? ""}</g><g data-live="${i}">${tile.live ?? ""}</g>`; }).join("")
    + `<g data-duck><g data-p="duck" transform="scale(1.6)">${Room.DUCK}</g></g>`;

  // Which copies of the room, and how big.
  const tiles = +(params.get("tiles") ?? 300), copies = Math.ceil(tiles / route.length), across = Math.ceil(Math.sqrt((copies * rows) / cols * (innerWidth / innerHeight)));
  const W = across * (cols + 1) * S, H = Math.ceil(copies / across) * rows * S;
  const canvas = document.getElementById("view"), ctx = canvas.getContext("2d"), dpr = devicePixelRatio;
  canvas.width = innerWidth * dpr; canvas.height = (innerHeight - 40) * dpr;
  const px = params.get("size") ? +params.get("size") / S : Math.min(canvas.width / dpr / W, canvas.height / dpr / H), scale = px * dpr;

  // Every piece: each tile's still drawing, and each of its moving parts.
  const cells = route.map(([col, row, tile], i) => {
    tile = typeof tile === "string" ? Tile.made[tile] : tile;
    const still = { markup: bench.querySelector(`[data-still="${i}"]`).innerHTML, box: [0, 0, (tile.span ?? 1) * S, (tile.tall ?? 1) * S] };
    return { col, row, still, parts: Sprites.parts(bench.querySelector(`[data-live="${i}"]`)) };
  });
  const duck = Sprites.parts(bench.querySelector("[data-duck]"))[0];
  // What is small is taken to be a wheel or a cog, and turns; the rest only moves.
  // `?turn=draw` turns them as they are drawn instead, to compare.
  const STEPS = 24, ahead = params.get("turn") !== "draw";
  for (const c of cells) for (const part of c.parts) if (ahead && Math.max(part.box[2], part.box[3]) < 80) part.ring = Sprites.turned(part, STEPS);
  const pieces = [...cells.flatMap((c) => [c.still, ...c.parts.flatMap((part) => part.ring ?? [part])]), duck];
  const t0 = performance.now(), { canvas: sheet, drawn } = await Sprites.atlas(pieces, scale);
  const took = Math.round(performance.now() - t0);
  bench.remove();

  // One piece, in a tile at x, y, turned by `turn` about the middle of its box.
  function put(piece, x, y, turn) {
    if (piece.ring) { piece = piece.ring[((Math.round((turn / (2 * Math.PI)) * STEPS) % STEPS) + STEPS) % STEPS]; turn = 0; }
    else if (ahead) turn = 0; // it only moves
    const [bx, by, bw, bh] = piece.box, [a, b, c, d, e, f] = piece.m, cx = bx + bw / 2, cy = by + bh / 2, cos = Math.cos(turn), sin = Math.sin(turn);
    const re = cx - cos * cx + sin * cy, rf = cy - sin * cx - cos * cy;
    ctx.setTransform(scale * (a * cos + c * sin), scale * (b * cos + d * sin), scale * (c * cos - a * sin), scale * (d * cos - b * sin),
      scale * (a * re + c * rf + e + x), scale * (b * re + d * rf + f + y));
    ctx.drawImage(sheet, ...piece.at, bx, by, bw, bh);
  }

  // `?plain=1` places the parts without turning them and `?rough=1` without smoothing,
  // to see what each costs.
  const still = params.get("plain") === "1", paper = getComputedStyle(document.body).getPropertyValue("--bg");
  ctx.imageSmoothingEnabled = params.get("rough") !== "1";
  let frames = 0, placed = 0, shown = 0;
  function frame(ms) {
    const t = ms / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
    placed = 0; shown = 0;

    for (let n = 0; n < copies; n++) {
      const ox = (n % across) * (cols + 1) * S, oy = Math.floor(n / across) * rows * S;
      for (const c of cells) {
        const x = ox + c.col * S, y = oy + c.row * S;
        if (x * scale > canvas.width || y * scale > canvas.height) continue; // out of view

        ctx.setTransform(scale, 0, 0, scale, x * scale, y * scale);
        ctx.drawImage(sheet, ...c.still.at, ...c.still.box);
        c.parts.forEach((part, i) => put(part, x, y, still ? 0 : t * (1 + (i % 3)) + n));
        // A duck, on its way across and bouncing.
        ctx.setTransform(scale, 0, 0, scale, (x + ((t * 100 + n * 37) % S)) * scale, (y + 130 - Math.abs(Math.sin(t * 9 + n + c.col)) * 12) * scale);
        ctx.drawImage(sheet, ...duck.at, ...duck.box);
        placed += c.parts.length + 2; shown++;
      }
    }
    frames++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setInterval(() => { said.textContent = `${shown} tiles in view of ${copies * route.length}, ${placed} pieces placed a frame, ${frames} frames a second. ${drawn} pieces drawn once, in ${took} ms, into ${sheet.width} by ${sheet.height} px.`; frames = 0; }, 1000);
})();
