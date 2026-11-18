// Puts the Kitchen's duck run together and runs it: the route through the tiles, the
// ducks, the cover over a device that has stopped answering, the cords, the skins and
// the one loop.
//
// Every tile runs on the same period and there is one duck to a tile, so all of them
// come in together and go out together, and the whole room moves in step.
(() => {
  const { clamp, spring, move, show, hash } = Kit, { S, made } = Tile;
  // Seconds a duck spends in a tile. Anyone who has asked for less motion gets a slow one.
  const P = matchMedia("(prefers-reduced-motion: reduce)").matches ? 8 : 2.6;
  const X0 = 80; // the margin either side of four tiles on a sheet 1200 wide

  // The way round, as [column, row, tile]: each tile's way out is the next one's way in,
  // and the last leads back to the first.
  const ROUTE = [[0, 0, "toaster"], [1, 0, "ceiling"], [2, 0, "mangle"], [3, 0, "kettle"], [3, 1, "pegs"], [3, 2, "boiler"],
    [2, 2, "cork"], [2, 1, "blind"], [1, 1, "plug"], [1, 2, "counter"], [0, 2, "waiterLow"], [0, 1, "waiter"]];

  const room = House.rooms.find((r) => r.id === "kitchen");
  const stage = document.getElementById("stage"), notice = document.getElementById("notice"), found = {};
  const q = (name) => (found[name] ??= stage.querySelector(`[data-p="${name}"]`));

  // `on` is which way the duck in a tile goes this period, `away` since when its device
  // has not answered, and `tubed` whether this period's duck goes through the tube.
  const mode = (c) => (c.d ? (c.tile.mode ? c.tile.mode(c.d) : c.d.on) : false);
  const cells = ROUTE.map(([col, row, name]) => {
    const tile = made[name], d = tile.device ? House.find(tile.device) : null;
    return { col, row, x: X0 + col * S, y: row * S, tile, d, on: false, away: "", tubed: false };
  });
  for (const c of cells) c.on = mode(c);
  const ducks = cells.map((_, n) => ({ cell: n, x: 0, y: 0, facing: 1 }));

  // Each device tile's cover, from the edge it shares with the tile before to the edge
  // it shares with the tile after.
  const edge = (c, other) => [S / 2 + ((other.col - c.col) * S) / 2, S / 2 + ((other.row - c.row) * S) / 2];
  cells.forEach((c, i) => { if (c.d) c.cover = Tile.broken(c.d, edge(c, cells.at(i - 1)), edge(c, cells[(i + 1) % cells.length])); });
  const covers = cells.filter((c) => c.d).map((c) => `<g transform="translate(${c.x},${c.y})">${c.cover.art}</g>`).join("");

  // ---- The drawing: what stands still, and over it what moves (as on the water pages).
  const layer = (part) => cells.map((c) => (c.tile[part] ? `<g transform="translate(${c.x},${c.y})">${c.tile[part]}</g>` : "")).join("");
  const HAT = `<path class="solid" d="M3,-18 h10 M5,-18 v-8 h6 v8 z"/>`; // one duck wears a hat
  const duck = (n) => `<g data-p="duck${n}"><g data-p="body${n}"><g transform="scale(1.6)">${Room.DUCK}${n === 3 ? HAT : ""}</g></g>
    <text class="zz small" x="8" y="-34">z z z</text></g>`;
  const hit = (c) => `<rect class="hit hot" data-f="${c.d.id}" role="button" tabindex="0" x="${c.x}" y="${c.y}" width="${S}" height="${S}"/>`;

  stage.innerHTML = `<div class="sheet">
    <svg class="ink wob" viewBox="0 0 1200 780">${layer("still")}
      <text class="title" x="44" y="390" transform="rotate(-90 44 390)" text-anchor="middle">Fig. 3. The ${room.name}, by duck</text>
      <text x="1160" y="390" transform="rotate(90 1160 390)" text-anchor="middle">${room.temp}° within (${room.target}° wanted), the air ${room.humidity}% damp</text></svg>
    <svg class="ink" viewBox="0 0 1200 780">${layer("live")}${covers}${ducks.map((_, n) => duck(n)).join("")}
      <text data-p="honk" text-anchor="middle">HONK</text>${cells.filter((c) => c.d).map(hit).join("")}</svg></div>`;

  // ---- How big a tile is drawn, in px. Until the slider is moved, the sheet fits the screen.
  const sheet = stage.firstChild, size = document.querySelector("#size input"), said = document.querySelector("#size output");
  size.value = Math.round(Math.min(sheet.clientWidth / 1200, sheet.clientHeight / 780) * S);
  said.textContent = "to fit";
  size.addEventListener("input", () => {
    const k = size.value / S;
    sheet.style.cssText = `width:${1200 * k}px;height:${780 * k}px;min-width:0`;
    said.textContent = `${size.value} px`;
  });

  // ---- A device's words, on the drawing and for a screen reader.
  function update(c) {
    const state = c.away ? `out of order since ${c.away}` : House.state(c.d), el = stage.querySelector(`[data-f="${c.d.id}"]`);
    q(`cap-${c.d.id}`).querySelector("tspan").textContent = c.away ? "" : state; // the sign over the sheet says it
    el.setAttribute("aria-label", `${c.d.name}: ${state}`); el.setAttribute("aria-pressed", c.d.on);
    q(`since-${c.d.id}`).textContent = c.away ? `since ${c.away}` : "";
  }
  const cellOf = (id) => cells.find((c) => c.d?.id === id);
  cells.filter((c) => c.d).forEach(update);
  House.on((d) => { const c = cellOf(d.id); if (c) update(c); });

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
  const surprise = () => { goose = ducks[hash(`goose${geese++}`) % ducks.length]; lap = P * cells.length; honk = 1.4; };
  Page.cords({
    "Someone else switches the counter light": () => House.toggle("k_counter"),
    "The blind stops answering": () => { const c = cellOf("k_blind"); c.away = c.away ? "" : Page.clock(); update(c); },
    "The data stops": () => { stale = stale ? "" : Page.clock(); },
    "Something silly": surprise,
  });
  Page.skins((skin) => { if (skin === "patent") Bake.start(stage.querySelector(".wob")); });

  // ---- The loop.
  const steam = { x: 1, v: 0 };
  let last = 0, ph = 0, silly = 12, sillies = 0;

  function frame(ms) {
    const now = ms / 1000, dt = Math.min(0.05, now - last);
    last = now;

    // With no data the ducks slow to a stop where they are and go to sleep.
    const fresh = clamp(spring(steam, stale ? 0 : 1, dt, 6, 5)), before = ph;
    document.body.classList.toggle("stale", !!stale);
    notice.textContent = stale ? `No word from the house since ${stale}. The ducks are asleep, and nothing shown here is current.` : "";

    // The period comes round: every duck goes on to the next tile, and each tile fixes
    // which way its new duck is to go.
    ph += (dt / P) * fresh;
    if (ph >= 1) {
      ph -= 1;
      for (const c of cells) { c.on = mode(c); c.tubed = !!c.away; }
      for (const k of ducks) k.cell = (k.cell + 1) % cells.length;
    }

    // A tile is covered from the moment its device stops answering until the last duck
    // sent through its tube is out. Under the sheet the machine stands still.
    for (const c of cells) {
      const covered = c.tubed || !!c.away;
      if (c.d) q(`out-${c.d.id}`).classList.toggle("is", covered);
      if (!covered) c.tile.pose?.(q, { p: ph, on: c.on, d: c.d, dt: dt * fresh, now });
    }

    ducks.forEach((k, n) => {
      const c = cells[k.cell], at = c.tubed ? c.cover.through(ph) : c.tile.duck({ p: ph, on: c.on, d: c.d, now });
      const x = c.x + at.x, y = c.y + at.y, big = k === goose ? 1.5 : 1;
      if (Math.abs(x - k.x) > 0.4) k.facing = Math.sign(x - k.x);
      if (c.tubed) move(q(`lump-${c.d.id}`), at.x, at.y);
      k.x = x; k.y = y;

      move(q(`duck${n}`), x, y); show(q(`duck${n}`), at.o ?? 1);
      q(`body${n}`).setAttribute("transform", `rotate(${(at.r ?? 0).toFixed(0)}) scale(${(k.facing * (at.sx ?? 1) * big).toFixed(2)},${((at.sy ?? 1) * big).toFixed(2)})`);
    });

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
