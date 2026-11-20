// Puts a room's duck run together and runs it: the route through the tiles, the ducks,
// the cover over a device that has stopped answering, the small things that go wrong and
// the bot that mends them, the cords, the skins and the one loop. Which room is in the
// address (`?room=`), and the Kitchen if none is.
//
// Every tile runs on the same period and there is one duck to a tile, so all of a
// room's ducks come in together and go out together: that is the machine's beat. So that
// it is not all in step besides, each room starts its period at a moment of its own,
// each tile runs a little early or late between its two ends, each tile's duck bounces
// to its own time, and the ducks are not all one size.
//
// A sheet may hold several ways round, each a closed loop (rooms.js). Only the tiles in
// view are worked: the rest keep their place in the period and are not drawn again until
// they come into view (`?cull=0` works them all, to measure what that saves).
(() => {
  const { clamp, spring, move, show, hash } = Kit, { S, made } = Tile;
  // Seconds a duck spends in a tile. Anyone who has asked for less motion gets a slow one.
  const P = matchMedia("(prefers-reduced-motion: reduce)").matches ? 8 : 2.6;
  const X0 = 80, POLE = 66; // the margin either side of the tiles, and where the bot's pole is in it

  const params = new URLSearchParams(location.search), run = Rooms[params.get("room")] ?? Rooms.kitchen, loops = run.loops();
  const culling = params.get("cull") !== "0", FAR = +(params.get("far") ?? 60); // tiles in view, over which the view is a far one
  const stage = document.getElementById("stage"), notice = document.getElementById("notice"), found = {};
  const q = (name) => (found[name] ??= stage.querySelector(`[data-p="${name}"]`));
  document.querySelector("h1").textContent = document.title = `The ${run.name}, by duck`;
  document.getElementById("rooms").innerHTML = Object.entries(Rooms).map(([id, r]) => `<a href="?room=${id}" ${r === run ? 'aria-current="page"' : ""}>${r.name}</a>`).join("");

  // `on` is which way the duck in a tile goes this period, `away` since when its device
  // has not answered, `sheeted` whether its dust sheet is on, and `tubed` whether this
  // period's duck goes through the tube. `before` and `after` are its neighbours on its
  // loop, `round` how many tiles the loop has, and `seen` whether it is in view.
  const mode = (c) => (c.d ? (c.tile.mode ? c.tile.mode(c.d) : c.d.on) : false);
  // `bend` is how far a tile runs ahead of the period in the middle of it (or behind,
  // below nought): by a fifth at most, or its duck would have to go backwards. A drawing
  // shared by two tiles keeps time (`steady`). `rate` and `lag` are the tile's own clock,
  // for whatever in it bounces or shakes.
  const rings = [];
  const cells = loops.flatMap((route, r) => {
    const loop = route.map(([col, row, tile], i) => {
      tile = typeof tile === "string" ? made[tile] : tile;
      const d = tile.device ? House.find(tile.device) : null;
      return { col, row, x: X0 + col * S, y: row * S, tile, d, on: false, away: "", sheeted: false, tubed: false, seen: true, kept: true, round: route.length, found: {},
        p: 0, bend: tile.steady ? 0 : ((hash(`bend${r}.${i}`) % 401) - 200) / 1000, rate: 0.85 + (hash(`rate${r}.${i}`) % 300) / 1000, lag: hash(`lag${r}.${i}`) % 7 };
    });
    loop.forEach((c, i) => { c.before = loop.at(i - 1); c.after = loop[(i + 1) % loop.length]; });
    // `shift` is where in the period the room starts, and `p` where it has got to.
    rings.push({ cells: loop, shift: r ? (hash(`ring${r}`) % 1000) / 1000 : 0, p: 0 });
    return loop;
  });
  for (const c of cells) c.on = mode(c);
  const ducks = cells.map((c, n) => ({ cell: c, x: 0, y: 0, facing: 1, drawn: true, size: 0.9 + (hash(`size${n}`) % 21) / 100 }));
  rings.forEach((ring) => { ring.ducks = ducks.filter((k) => ring.cells.includes(k.cell)); });
  const VW = (Math.max(...cells.map((c) => c.col)) + 1) * S + 2 * X0, VH = (Math.max(...cells.map((c) => c.row)) + 1) * S;

  // How each tile is entered and left, from the tiles either side of it on the route. A
  // tile drawn for the other hand is mirrored; one that cannot be made to fit is a
  // mistake in the route, and says so. A device's tile also gets its cover (tile.js).
  const side = (c, other) => (other.col < c.col ? "L" : other.col > c.col ? "R" : other.row < c.row ? "T" : "B");
  const edge = (c, other) => [S / 2 + ((other.col - c.col) * S) / 2, S / 2 + ((other.row - c.row) * S) / 2];
  const mirrored = (io) => io.replace(/[LR]/g, (s) => (s === "L" ? "R" : "L"));
  cells.forEach((c) => {
    const { before, after } = c, need = side(c, before) + side(c, after);
    c.flip = c.tile.io !== need;
    if (c.flip && mirrored(c.tile.io) !== need) {
      notice.textContent = `The route is wrong: the tile at column ${c.col}, row ${c.row} goes ${c.tile.io}, and it is asked to go ${need}.`;
      throw new Error(notice.textContent);
    }
    if (c.d) c.cover = Tile.broken(c.d, edge(c, before), edge(c, after));
  });

  // ---- The drawing: what stands still, and over it what moves (as on the water pages).
  const place = (c) => (c.flip ? `class="flip" transform="translate(${c.x + S},${c.y}) scale(-1,1)"` : `transform="translate(${c.x},${c.y})"`);
  const layer = (part) => cells.map((c, i) => (c.tile[part] ? `<g data-${part}="${i}" ${place(c)}>${c.tile[part]}</g>` : "")).join("");
  const covers = cells.map((c, i) => (c.d ? `<g data-cover="${i}" transform="translate(${c.x},${c.y})">${c.cover.art}</g>` : "")).join("");
  const HAT = `<path class="solid" d="M3,-18 h10 M5,-18 v-8 h6 v8 z"/>`; // one duck wears a hat
  const duck = (n) => `<g data-p="duck${n}"><g data-p="body${n}"><g transform="scale(1.6)">${Room.DUCK}${n === 3 ? HAT : ""}</g></g>
    <text class="zz small" x="8" y="-34">z z z</text></g>`;
  const hit = (c) => `<rect class="hit hot" data-f="${c.d.id}" role="button" tabindex="0" x="${c.x}" y="${c.y}" width="${S}" height="${S}"/>`;

  stage.innerHTML = `<div class="sheet" style="--shape:${VW / VH}">
    <svg class="ink wob" viewBox="0 0 ${VW} ${VH}">${layer("still")}<path d="M${POLE},0 V${VH}"/>
      <text class="title" x="44" y="${VH / 2}" transform="rotate(-90 44 ${VH / 2})" text-anchor="middle">Fig. 3. The ${run.name}, by duck</text>
      <text x="${VW - 40}" y="${VH / 2}" transform="rotate(90 ${VW - 40} ${VH / 2})" text-anchor="middle">${run.note}</text></svg>
    <svg class="ink" viewBox="0 0 ${VW} ${VH}">${layer("live")}${covers}${ducks.map((_, n) => duck(n)).join("")}
      <text data-p="honk" text-anchor="middle">HONK</text>${Faults.art(cells, S)}${Bot.art()}${cells.filter((c) => c.d).map(hit).join("")}</svg></div>`;
  // The bot rides along the foot of each row, and changes rows by the pole in the margin.
  Bot.setup({ speed: 420, lo: X0 + 20, hi: VW - X0 - 20, floor: VH - 4, pole: POLE });

  // Words in a mirrored tile are turned back, each about its own place, to be read.
  for (const text of stage.querySelectorAll(".flip text")) text.setAttribute("transform", `translate(${2 * (text.getAttribute("x") ?? 0)},0) scale(-1,1)`);
  // A tile finds its own moving parts: the same tile may be on the route more than once.
  // `drawn` is everything of the tile's that is in the drawing, to take out of it when
  // the tile is out of view.
  cells.forEach((c, i) => {
    const mine = stage.querySelector(`[data-live="${i}"]`);
    c.q = (name) => (c.found[name] ??= mine.querySelector(`[data-p="${name}"]`));
    c.drawn = [...stage.querySelectorAll(`[data-still="${i}"], [data-live="${i}"], [data-cover="${i}"]`)];
  });

  // ---- How big a tile is drawn, in px. Until the slider is moved, the sheet fits the screen.
  const sheet = stage.firstChild, size = document.querySelector("#size input"), said = document.querySelector("#size output");
  size.value = Math.round((sheet.clientWidth / VW) * S);
  said.textContent = "to fit";
  size.addEventListener("input", () => { sheet.style.width = `${(VW * size.value) / S}px`; said.textContent = `${size.value} px`; });

  // ---- Which tiles are in view. Worked out when the view changes (a scroll, or a change
  // of size), never frame by frame. A tile counts as in view a tile's width before it
  // gets there, so that a duck is already moving as it comes on. A drawing more than one
  // tile wide or tall (`span`, `tall`) is in view if any of it is.
  //
  // A tile out of view is taken out of the drawing, not just left alone. Measured in
  // WebKit on 2026-11-18 with 300 tiles on the sheet and 40 in view: leaving the others
  // alone gave 31 frames a second, the same as working them all, because the cost was
  // the browser's, for the size of the drawing.
  //
  // `far` is a view with more tiles in it than can be drawn in full at a fair rate (at
  // 87 in view: 31 frames a second, and 16 in the engraving). Then the machinery is
  // shown as one bitmap of itself with only the ducks moving over it (`farmap`). Measured the same day with all 300 in view:
  // 9 frames a second drawn in full, and 42 with the machinery not drawn at all.
  let far = false, farmap = null, baking = 0;
  const pose = (c, dt, now) => c.tile.pose?.(c.q, { p: c.p, on: c.on, d: c.d, dt, now: now * c.rate + c.lag });

  // The bitmap shows the devices as they are when it is made, so it is made again
  // whenever one changes. Until it is ready, and if it cannot be made, the drawing stays
  // as it is, which is right but slow.
  async function bakeFar() {
    const mine = ++baking;
    for (const c of cells) pose(c, 0, last);
    const inner = stage.querySelector(".wob").innerHTML + [...stage.querySelectorAll("[data-live]")].map((el) => el.outerHTML).join("");

    try {
      const made = await Bake.plain(inner, `0 0 ${VW} ${VH}`, Math.min(4096, Math.round(sheet.clientWidth * devicePixelRatio)));
      if (mine !== baking || !far) return; // the view, or a device, has changed since
      farmap?.remove(); farmap = made;
      made.className = "farmap"; sheet.prepend(made); sheet.classList.add("far");
    } catch (err) { console.warn("Duck run: the far view could not be made a bitmap, so it is drawn in full.", err); }
  }

  function look() {
    const view = stage.getBoundingClientRect(), on = sheet.getBoundingClientRect(), k = VW / on.width, was = far;
    const left = (view.left - on.left) * k - S, right = (view.right - on.left) * k + S, top = (view.top - on.top) * k - S, foot = (view.bottom - on.top) * k + S;

    for (const c of cells) {
      const wide = (c.tile.span ?? 1) * S, x = c.flip ? c.x + S - wide : c.x;
      c.seen = !culling || (x < right && x + wide > left && c.y < foot && c.y + (c.tile.tall ?? 1) * S > top);
    }
    far = cells.filter((c) => c.seen).length > FAR;

    // In a far view every tile stays in the drawing, since the bitmap is made from it.
    for (const c of cells) {
      const kept = far || c.seen;
      if (kept !== c.kept) for (const el of c.drawn) el.style.display = kept ? "" : "none";
      c.kept = kept;
    }
    if (far && !was) bakeFar();
    if (!far && was) { baking++; sheet.classList.remove("far"); }
  }
  stage.addEventListener("scroll", look, { passive: true });
  new ResizeObserver(look).observe(stage); new ResizeObserver(look).observe(sheet);

  // How it is going, once a second: how many tiles there are, how many are in view, and
  // how many frames were drawn.
  const rate = document.getElementById("rate");
  let frames = 0;
  setInterval(() => { rate.textContent = `${cells.length} tiles, ${cells.filter((c) => c.seen).length} in view${far ? ", far" : ""}, ${frames} frames a second`; frames = 0; }, 1000);

  // ---- A device's words, on the drawing and for a screen reader.
  function update(c) {
    const state = c.away ? `out of order since ${c.away}` : House.state(c.d), el = stage.querySelector(`[data-f="${c.d.id}"]`);
    q(`cap-${c.d.id}`).querySelector("tspan").textContent = c.away ? "" : state; // the sign over the sheet says it
    el.setAttribute("aria-label", `${c.d.name}: ${state}`); el.setAttribute("aria-pressed", c.d.on);
    // The sheet stays on until the bot has been, so its sign says at once that the device is back.
    q(`word-${c.d.id}`).textContent = c.away ? "OUT OF ORDER" : "BACK IN ORDER";
    q(`since-${c.d.id}`).textContent = c.away ? `since ${c.away}` : "sheet coming off";
  }
  const cellOf = (id) => cells.find((c) => c.d?.id === id);
  cells.filter((c) => c.d).forEach(update);
  House.on((d) => { const c = cellOf(d.id); if (c) update(c); if (far) bakeFar(); });

  // A device stops answering (`away` is since when), or answers again. The sheet goes on
  // at once. It comes off when the bot has been round to pull it.
  function answers(c, away) {
    const sheet = q(`out-${c.d.id}`);
    c.away = away; update(c);
    if (away) { c.sheeted = true; sheet.style.cssText = ""; return; }

    Bot.ask({
      x: c.x + S / 2 - 18, face: 1, floor: c.y + S - 4, rise: 170,
      start() {},
      // Should the device have stopped again by the time the bot gets here, it leaves the sheet be.
      work(p) { if (!c.away) sheet.style.cssText = `translate:0 ${(-70 * p).toFixed(1)}px;opacity:${(1 - p).toFixed(2)}`; },
      done() { if (!c.away) c.sheeted = false; },
    });
  }

  // A tap on a device's tile switches it. One that is not answering shakes its sign.
  function press(el) {
    const c = cellOf(el.dataset.f), words = q(`sign-${c.d.id}`);
    if (!c.away) { House.toggle(c.d.id); return; }
    words.classList.remove("nope"); words.getBBox(); words.classList.add("nope");
  }
  stage.addEventListener("click", (e) => { const el = e.target.closest("[data-f]"); if (el) press(el); });
  stage.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.f) { e.preventDefault(); press(e.target); } });

  // ---- The cords: things to try that would otherwise need a real house.
  let stale = "", goose = null, lap = 0, honk = 0, geese = 0;
  // Something silly: one of the ducks is a goose for a lap.
  const surprise = () => { goose = ducks[hash(`goose${geese++}`) % ducks.length]; lap = P * goose.cell.round; honk = 1.4; };
  const other = House.find(run.other), breaks = cellOf(run.breaks);
  Page.cords({
    [`Someone else switches: ${other.name}`]: () => House.toggle(other.id),
    [`${breaks.d.name} stops answering`]: () => answers(breaks, breaks.away ? "" : Page.clock()),
    "The data stops": () => { stale = stale ? "" : Page.clock(); },
    "Something silly": surprise,
  });
  Page.skins((skin) => { if (skin === "patent") Bake.start(stage.querySelector(".wob")); if (far) bakeFar(); });

  // ---- The loop.
  const steam = { x: 1, v: 0 };
  let last = 0, ph = 0, silly = 12, sillies = 0;

  function frame(ms) {
    const now = ms / 1000, dt = Math.min(0.05, now - last);
    last = now; frames++;

    // With no data the ducks slow to a stop where they are and go to sleep.
    const fresh = clamp(spring(steam, stale ? 0 : 1, dt, 6, 5));
    document.body.classList.toggle("stale", !!stale);
    notice.textContent = stale ? `No word from the house since ${stale}. The ducks are asleep, and nothing shown here is current.` : "";

    // When a room's period comes round, each of its ducks goes on to the next tile, and
    // each tile fixes which way its new duck is to go.
    ph += (dt / P) * fresh;
    for (const ring of rings) {
      const p = (ph + ring.shift) % 1;
      if (p < ring.p) {
        for (const c of ring.cells) { c.on = mode(c); c.tubed = c.sheeted; }
        for (const k of ring.ducks) k.cell = k.cell.after;
      }
      ring.p = p;
      for (const c of ring.cells) c.p = p + c.bend * Math.sin(Math.PI * p);
    }

    // A tile is covered from the moment its device stops answering until the bot has
    // pulled the sheet off and the last duck sent through its tube is out. Under the
    // sheet the machine stands still, unless it is a wide one that others share.
    for (const c of cells) {
      if (!c.seen) continue;
      const covered = c.tubed || c.sheeted;
      if (c.d) q(`out-${c.d.id}`).classList.toggle("is", covered);
      if (!far && (!covered || c.tile.wide)) pose(c, dt * fresh, now);
    }

    ducks.forEach((k, n) => {
      const c = k.cell;
      // A duck out of view is put out of sight once, and then left alone.
      if (!c.seen) { if (k.drawn) { q(`duck${n}`).style.display = "none"; k.drawn = false; } return; }
      if (!k.drawn) { q(`duck${n}`).style.display = ""; k.drawn = true; }

      const at = c.tubed ? c.cover.through(c.p) : c.tile.duck({ p: c.p, on: c.on, d: c.d, now: now * c.rate + c.lag });
      // A mirrored tile's duck is mirrored with it; the tube is not, being drawn for the edges.
      const turned = c.flip && !c.tubed, x = c.x + (turned ? S - at.x : at.x), y = c.y + at.y, big = k.size * (k === goose ? 1.5 : 1);
      if (Math.abs(x - k.x) > 0.4) k.facing = Math.sign(x - k.x);
      if (c.tubed) move(q(`lump-${c.d.id}`), at.x, at.y);
      k.x = x; k.y = y;

      move(q(`duck${n}`), x, y);
      if ((at.o ?? 1) !== k.o) show(q(`duck${n}`), (k.o = at.o ?? 1));
      if (far) return; // too small to see which way up it is
      q(`body${n}`).setAttribute("transform", `rotate(${((at.r ?? 0) * (turned ? -1 : 1)).toFixed(0)}) scale(${(k.facing * (at.sx ?? 1) * big).toFixed(2)},${((at.sy ?? 1) * big).toFixed(2)})`);
    });

    Faults.tick(q, dt * fresh, now); Bot.tick(q, dt * fresh, now);

    if (goose && (lap -= dt) < 0) goose = null;
    honk = Math.max(0, honk - dt);
    show(q("honk"), goose && honk ? 1 : 0);
    if (goose) move(q("honk"), goose.x, goose.y - 56);

    // Every half minute or so, something silly.
    if ((silly -= dt) < 0) { surprise(); silly = 25 + (hash(`silly${sillies++}`) % 20); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
