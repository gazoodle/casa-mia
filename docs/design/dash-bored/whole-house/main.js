// Puts the whole house on one sheet and runs it: the view and how it closes on a room,
// what is drawn at each distance, the cords, the skins, and the one loop.
//
// The view is the drawing's viewBox, so there is one drawing at every distance. A tap on
// a room sends the duck round the water to it and the view goes after the duck; a second
// tap gets there at once. Only the room in view is worked frame by frame (works.js).
// The rest of the house is switched by class when a device changes (far.js).
(() => {
  const { clamp, ease, phase, spring, hash } = Kit;
  const { W, H, CW, CH, cells } = Plan;
  const stage = document.getElementById("stage"), notice = document.getElementById("notice"), back = document.getElementById("back"), found = {};
  const q = (name) => (found[name] ??= stage.querySelector(`[data-p="${name}"]`));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- The one room drawn in full so far. The others say so when the view reaches them.
  const kitchen = cells.find((c) => c.room.id === "kitchen"), works = Works.build(kitchen.room);
  kitchen.detail = true;
  const hangers = [360, 760, 980].map((x) => `M${x},10 V${Plan.ty(x)}`).join(" ");
  const full = { still: `<path class="thin" d="${hangers}"/><text class="title" x="690" y="42">Fig. 2. The ${kitchen.room.name}, by water</text>
      <text x="690" y="62">${kitchen.room.temp}° within (${kitchen.room.target}° wanted), the air ${kitchen.room.humidity}% damp</text>${works.still}`,
    live: works.live + Bot.art() };
  const sketch = { still: `<text x="600" y="50" text-anchor="middle">This room's machine has not been drawn yet: it is to be laid out by rule.
      <tspan x="600" dy="18">Tap a device to switch it.</tspan></text>`, live: "" };
  const near = (c) => (c.detail ? full : sketch);

  stage.innerHTML = `<div class="sheet"><div class="bake" id="farbake"></div><div class="bake" id="nearbake"></div>
    <svg class="ink wob">${Far.still(near)}</svg><svg class="ink">${Far.live(near)}</svg></div>`;
  const sheet = stage.firstChild, [still, moving] = sheet.querySelectorAll("svg");
  const farbake = document.getElementById("farbake"), nearbake = document.getElementById("nearbake");
  Works.controls(stage, works);

  // ---- The view. `at` is the room it has settled on, `focus` the room it is at, going
  // to or leaving, and `trip` a move in progress.
  const FAR = { x: 0, y: 0, w: W, h: H };
  let view = FAR, at = null, focus = null, trip = null, shown = "", px = 1, baking = 0;

  function look(v) {
    view = v;
    const box = `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`;
    if (box === shown) return;
    shown = box;

    still.setAttribute("viewBox", box); moving.setAttribute("viewBox", box);
    // What the drawing needs to know about the view: how many of its units make one px
    // (so that a line is as heavy on the screen at any distance), and how near it is, 0 to 1.
    px = v.w / sheet.clientWidth;
    const nearness = clamp((W / v.w - 2) / 1.2);
    sheet.style.setProperty("--px", px.toFixed(3)); sheet.style.setProperty("--near", nearness.toFixed(2));
    document.body.classList.toggle("afar", nearness === 0);
    farbake.style.transform = `scale(${W / v.w}) translate(${(-v.x / W) * 100}%,${(-v.y / H) * 100}%)`;
  }
  new ResizeObserver(() => { shown = ""; look(view); }).observe(sheet);

  // The patent skin's wobble, baked (bake.js): the whole house once, and the room the
  // view has settled on while it is there. On the way between the two the house's
  // bitmap is stretched, and is soft for that long.
  const baked = (box, v, nearness) => Bake.sheets(still.innerHTML, { box, px: v.w / sheet.clientWidth, vars: `--near:${nearness}` });
  const failed = (err) => console.warn("Whole house: the wobble could not be baked, so the lines are ruled.", err);
  function bakeHouse() {
    if (farbake.dataset.asked) return;
    farbake.dataset.asked = "yes";
    baked(`0 0 ${W} ${H}`, FAR, 0).then((made) => { farbake.replaceChildren(...made); document.body.classList.add("baked"); if (at) bakeRoom(at); }, failed);
  }
  function bakeRoom(c) {
    const mine = ++baking;
    baked(`${c.x} ${c.y} ${CW} ${CH}`, c, 1).then((made) => {
      if (mine !== baking) return; // the view has moved on since
      nearbake.replaceChildren(...made); document.body.classList.add("nearbaked");
    }, failed);
  }

  function arrive(c) {
    at = c; trip = null; Far.duck.held = false; back.disabled = false;
    look({ x: c.x, y: c.y, w: CW, h: CH });
    if (document.body.classList.contains("baked")) bakeRoom(c);
  }
  function go(c) {
    const from = Far.duck.s, dist = (((c.s - from) % Plan.LOOP) + Plan.LOOP) % Plan.LOOP;
    focus = c; Far.duck.held = true; Far.quack();
    trip = { cell: c, from, dist, t: 0, T: calm ? 0 : clamp(dist / 2600, 1.1, 2.8) };
  }
  function home() {
    if (!at) return;
    at = null; back.disabled = true; baking++;
    nearbake.replaceChildren(); document.body.classList.remove("nearbaked");
    trip = { cell: null, from: view, t: 0, T: calm ? 0 : 0.7 };
  }

  // One frame of a move. Going to a room, the view narrows as it goes: it leaves the
  // middle of the house for the duck, and the duck for the room as the duck gets there.
  function travel(dt) {
    trip.t += dt;
    const p = trip.T ? clamp(trip.t / trip.T) : 1, c = trip.cell;

    if (!c) {
      const k = ease(p), f = trip.from, mix = (name) => f[name] + (FAR[name] - f[name]) * k;
      look({ x: mix("x"), y: mix("y"), w: mix("w"), h: mix("h") });
      if (p >= 1) { trip = null; focus = null; }
      return;
    }

    Far.duck.s = trip.from + trip.dist * ease(p);
    const duck = Plan.at(Far.duck.s), w = W * (CW / W) ** ease(phase(p, 0, 0.85)), h = (w * H) / W;
    const k1 = ease(phase(p, 0, 0.3)), k2 = ease(phase(p, 0.7, 1));
    const mid = (from, on, to) => { const m = from + (on - from) * k1; return m + (to - m) * k2; };
    const cx = clamp(mid(W / 2, duck.x, c.x + CW / 2), w / 2, W - w / 2), cy = clamp(mid(H / 2, duck.y, c.y + CH / 2), h / 2, H - h / 2);
    look({ x: cx - w / 2, y: cy - h / 2, w, h });
    if (p >= 1) arrive(c);
  }

  // A tap: on a room from far off, go to it; on the way, be there at once; in a room
  // that is only sketched, switch the device tapped.
  stage.addEventListener("click", (e) => {
    if (trip) { if (trip.cell) trip.t = trip.T; return; }
    const room = e.target.closest("[data-room]"), fd = e.target.closest(".fd");
    if (!at) { if (room) go(cells.find((c) => c.room.id === room.dataset.room)); return; }
    if (fd && !at.detail) House.toggle(fd.dataset.f);
  });
  stage.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("rect.hit")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") home(); });
  back.addEventListener("click", home);

  // ---- The house's devices as they are, and as they change.
  const away = (d) => works.cellOf(d.id)?.away;
  for (const d of House.devices) Far.mark(d, away(d));
  House.on((d) => Far.mark(d, away(d)));

  // ---- The cords: things to try that would otherwise need a real house.
  const blind = works.cellOf("k_blind");
  let stale = "";
  Page.cords({
    "Someone else switches the counter light": () => House.toggle("k_counter"),
    "Someone sets the Evening scene": () => House.scene("evening"),
    "The blind stops answering": () => {
      blind.away = blind.away ? "" : Page.clock();
      Far.mark(blind.d, blind.away); Far.flag(q, kitchen, blind.away ? `${blind.d.name} out of order since ${blind.away}` : "");
    },
    "The data stops": () => { stale = stale ? "" : Page.clock(); },
    "Something silly": () => Far.surprise(),
  });
  look(FAR);
  Page.skins((skin) => { if (skin === "patent") bakeHouse(); });

  // ---- The loop.
  const steam = { x: 1, v: 0 };
  let last = 0, silly = 12, sillies = 0;

  function frame(ms) {
    const now = ms / 1000, dt = Math.min(0.05, now - last);
    last = now;

    const fresh = clamp(spring(steam, stale ? 0 : 1, dt, 6, 5));
    document.body.classList.toggle("stale", !!stale);
    notice.textContent = stale ? `The tank has been dry since ${stale}. Nothing shown here is current.` : "";

    if (trip) travel(dt);
    Far.tick(q, fresh, dt, now, px);
    // The room in view is the only one worked frame by frame.
    if (focus?.detail && !document.body.classList.contains("afar")) { Works.tick(q, works, fresh, dt, now); Bot.tick(q, dt, now); }

    // Every half minute or so, something silly.
    if ((silly -= dt) < 0) { Far.surprise(); silly = 25 + (hash(`silly${sillies++}`) % 20); }
    requestAnimationFrame(frame);
  }
  // The room drawn in full is put in its first pose now, for when the view first reaches it.
  Works.tick(q, works, 1, 0, 0); Bot.tick(q, 0, 0);
  requestAnimationFrame(frame);
})();
