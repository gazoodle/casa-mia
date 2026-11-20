// A room's valves and the water they let in: what turns a room's devices and their
// machines (machines.js) into something a page can draw and work. The page puts the
// drawing where it wants it, and calls `tick` on every frame the room is in view.
//
// A valve shows what was asked for, at once. The water then takes its time to arrive
// and the machine its time to work: that is the show, and nothing waits for it.
window.Works = (() => {
  const { clamp, spring, turn, show } = Kit;

  // How far open a device's valve is, 0 to 1: a level, or just on.
  const range = (d) => d.span ?? { min: 0, max: 100 };
  const open = (d) => (!d.on ? 0 : d.dims ? Math.max(0.15, (d.level - range(d).min) / (range(d).max - range(d).min)) : 1);

  // ---- Drawing it.
  // A valve's handwheel, cast in one piece as on a garden tap: a scalloped rim of six
  // lobes, a round hole in each, and a hub with a square for the spindle. One lobe is
  // painted, to show where shut is.
  const at = (r, deg) => `${(r * Math.sin((deg * Math.PI) / 180)).toFixed(1)},${(-r * Math.cos((deg * Math.PI) / 180)).toFixed(1)}`;
  const six = (fn) => [0, 60, 120, 180, 240, 300].map(fn).join(" ");
  const hole = (deg) => `M${at(17, deg)} m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0`;
  const handwheel = `<g class="wheel"><path class="cast" fill-rule="evenodd" d="M${at(20, -30)} ${six((a) => `A10,10 0 0 1 ${at(20, a + 30)}`)} z ${six(hole)}"/>
    <path class="cloth" fill-rule="evenodd" d="M${at(20, -30)} A10,10 0 0 1 ${at(20, 30)} L${at(8, 30)} A8,8 0 0 0 ${at(8, -30)} z ${hole(0)}"/>
    <circle class="cast" r="7"/><rect class="solid" x="-2.5" y="-2.5" width="5" height="5"/></g>`;
  const body = (c) => `<path class="iron" d="M${c.m.x - 9},${c.y - 6} h18 v22 h-18 z"/>`;
  const valve = (c) => `<g class="hot" data-id="${c.d.id}" tabindex="0" role="${c.d.dims ? "slider" : "switch"}" aria-label="${c.d.name}"
    transform="translate(${c.m.x},${c.y})"><circle class="hit" r="34"/><g data-p="v_${c.d.id}">${handwheel}</g></g>`;
  const caption = (c) => { const [x, y, anchor = "middle"] = c.m.cap;
    return `<text x="${x}" y="${y - 6}" text-anchor="${anchor}">${c.d.name}<tspan class="state" x="${x}" dy="14" data-p="st_${c.d.id}"></tspan></text>`; };
  // Out of order: a cork in the outlet and a luggage label saying since when.
  const cork = (c) => `<g class="oo" data-p="oo_${c.d.id}" transform="translate(${c.m.x},${c.y + 16})"><path class="wood" d="M-6,0 h12 l-2,12 h-8 z"/>
    <g transform="rotate(-6)"><rect class="label" x="-56" y="20" width="112" height="34" rx="2"/>
    <text y="34" text-anchor="middle">Out of order<tspan x="0" dy="14" data-p="oos_${c.d.id}"></tspan></text></g></g>`;
  const feed = (c) => `<path class="stream" pathLength="1" data-p="w_${c.d.id}" d="${c.m.feed}"/>`;

  // The room's cells, one for each device, and the drawing of them: `still` is what
  // never moves and `live` is what does.
  function build(room) {
    const cells = room.devices.map((d) => {
      const m = Machines[d.id], c = { d, m, y: m.y ?? Room.ty(m.x) + 2, valve: { x: 0, v: 0 }, head: 0, tail: 0, amt: 0, fed: 0, away: "" };
      return Object.assign(c, m.start?.(c));
    });
    const each = (fn) => cells.map(fn).join("");

    return { cells, cellOf: (id) => cells.find((c) => c.d.id === id),
      still: each((c) => c.m.still) + each(body),
      live: each(feed) + each((c) => c.m.live) + each(valve) + each(caption) + each(cork) };
  }

  // ---- Working it. A tap on a valve switches the device; a drag sideways sets its level.
  function controls(stage, works) {
    const refuse = (hot) => { hot.classList.remove("nope"); void hot.getBoundingClientRect(); hot.classList.add("nope"); };
    const level = (c, to) => House.set(c.d.id, clamp(to, Math.max(1, range(c.d).min), range(c.d).max));
    let drag = null;

    stage.addEventListener("pointerdown", (e) => {
      const hot = e.target.closest(".hot"), c = hot && works.cellOf(hot.dataset.id);
      if (!c) return;
      if (c.away) return refuse(hot);
      hot.setPointerCapture(e.pointerId);
      drag = { c, x: e.clientX, from: c.d.level, moved: false };
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag?.c.d.dims) return;
      const dx = e.clientX - drag.x, r = range(drag.c.d);
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) level(drag.c, drag.from + (dx / 160) * (r.max - r.min));
    });
    stage.addEventListener("pointerup", () => { if (drag && !drag.moved) House.toggle(drag.c.d.id); drag = null; });
    stage.addEventListener("pointercancel", () => { drag = null; });
    stage.addEventListener("keydown", (e) => {
      const hot = e.target.closest(".hot"), c = hot && works.cellOf(hot.dataset.id), turnBy = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!c) return;
      if (c.away) return refuse(hot);
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); House.toggle(c.d.id); }
      if (turnBy && c.d.dims) { e.preventDefault(); level(c, c.d.level + (turnBy * (range(c.d).max - range(c.d).min)) / 20); }
    });
  }

  // The water in a cell's feed: its head runs down when the valve opens, and its tail
  // follows when it shuts. The machine is fed while water is arriving at the bottom.
  function run(q, c, want, dt) {
    const pace = dt / (c.m.secs ?? 0.7);
    if (want > 0) { c.tail = 0; c.head = Math.min(1, c.head + pace); c.amt = want; }
    else if (c.head > 0) { c.tail += pace; if (c.tail >= c.head) c.head = c.tail = 0; }
    c.fed = c.head >= 1 ? c.amt : 0;

    const w = q(`w_${c.d.id}`);
    w.setAttribute("stroke-dasharray", `0 ${c.tail.toFixed(3)} ${(c.head - c.tail).toFixed(3)} 2`);
    w.style.strokeWidth = (2 + 4 * c.amt).toFixed(1);
  }

  // One frame of every cell. `fresh` is 1 while the data is coming and 0 when it has
  // stopped, when no water runs whatever the valves say.
  function tick(q, works, fresh, dt, now) {
    for (const c of works.cells) {
      const asked = open(c.d);
      turn(q(`v_${c.d.id}`), spring(c.valve, asked * 270, dt, 60, 8));
      run(q, c, c.away || fresh < 0.5 ? 0 : asked, dt);
      c.m.pose(q, c, dt, now);

      // Words change far less often than the frame, so they are only written when they do.
      const said = c.m.state?.(c) ?? House.state(c.d);
      if (said !== c.said) q(`st_${c.d.id}`).textContent = c.said = said;
      if (c.away !== c.gone) { c.gone = c.away; show(q(`oo_${c.d.id}`), c.away ? 1 : 0); q(`oos_${c.d.id}`).textContent = `since ${c.away}`; }
    }
  }

  return { build, controls, tick };
})();
