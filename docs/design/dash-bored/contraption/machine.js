// The machine: a bay for each room, and in it a cell for each device. A cell is a
// control on the left, a mechanism on the right (effects.js) and, between them, either a
// linkage (links.js) or a train of cogs.
//
// How a cell is driven:
// - A device that is only on or off has a lever. The lever shows what was asked for, at
//   once. The mechanism shows the state, and comes to it when the linkage strikes.
// - A device with a level has a crank, geared straight to the mechanism: drag it for
//   the level, tap it to stop or start.
// - A guarded device (a lock, a siren, an alarm) has its lever under glass. The first
//   press lifts the glass for three seconds and the second pulls.
// - A linkage that has run and not been reset is passed over: a boxing glove does its
//   work, so nothing ever waits for the bot.
// - A scene turns the barrel in the engine house (engine.js), which works the rod that
//   runs under the shaft of every bay. A finger on the rod trips each device's control.
(() => {
  const { clamp, spring, set, move, turn, show, cog, pick } = Kit;
  const QUICK = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const seconds = () => performance.now() / 1000;

  const GUARDED = new Set(["lock", "siren", "alarm_control_panel"]);
  const STEADY = new Set(["cover", "climate", "water_heater"]); // nothing to stop or start
  const span = (d) => d.span ?? { min: 0, max: 100 };
  // A device's level as a fraction of its span. A cover's is how far open it is.
  function level(d) {
    if (!d.dims) return 1;
    if (d.kind === "cover") return d.on ? d.level / 100 : 0;
    return (d.level - span(d).min) / (span(d).max - span(d).min);
  }

  const either = (on, off) => (d) => (d.on ? on : off);
  const wanting = (d) => `${d.temp}°, wanting ${d.level}°`;
  const SAY = {
    light: House.state, switch: House.state, cover: House.state, lock: House.state,
    climate: wanting, water_heater: wanting,
    media_player: (d) => (d.on ? `“${d.title}” at ${d.level}%` : "silent"),
    camera: () => "watching",
    fan: (d) => (d.on ? `${d.level}%` : "still"),
    humidifier: (d) => (d.on ? `damping to ${d.level}%` : "resting"),
    valve: either("open", "shut"), vacuum: either("sweeping", "in its kennel"), lawn_mower: either("grazing", "penned"),
    siren: either("sounding", "quiet"), alarm_control_panel: either("set", "not set"),
  };
  function how(c) {
    if (c.d.kind === "camera") return "squeeze the bulb and watch the birdie";
    if (!c.link) return `by hand, through three cogs${STEADY.has(c.d.kind) ? "" : "; tap the crank to stop or start"}`;
    const by = c.d.kind === "light" ? `${Effects.weight(c.d).name}, raised by ${c.link.how}` : `by ${c.link.how}`;
    return c.guarded ? `under glass: lift it, then pull. ${by}` : by;
  }

  // ---------- drawing a cell ----------
  const named = (d, role) => `tabindex="0" role="${role}" aria-label="${d.room.name}: ${d.name}"`;
  const CONTROL = {
    lever: (c) => `<path d="M22,150 V186 M12,186 H32"/><path data-p="pull" class="thin"/>
      <path class="hatch" d="M34,170 h10 v14 h-10 z"/><g data-p="biff"><path data-p="reach" class="thin"/><circle data-p="fist" class="solid" r="6"/></g>
      <g class="hot" data-act="lever" ${named(c.d, "button")}>
        <g data-p="arm"><path d="M0,0 H24" stroke-width="3"/><circle class="knob solid" cx="27" r="5"/></g>
        <rect class="hit" x="0" y="110" width="50" height="76"/></g>
      <circle class="solid" cx="22" cy="150" r="3"/>
      ${c.guarded ? `<g data-p="lid"><path class="fill glass" d="M0,174 v-42 q24,-36 50,0 v42 z"/><circle class="solid" cx="25" cy="112" r="2.5"/></g>` : ""}
      <g data-p="paddle"><path d="M121,128 V168 M121,148 H132"/></g>`,
    crank: (c) => `<path d="M26,140 V186 M14,186 H38 M41,142 H54"/>
      <g class="hot" data-act="crank" ${named(c.d, "slider")}>
        <g transform="translate(26,140)"><g data-p="crank"><circle class="fill" r="15"/><path d="M-15,0 H15 M0,-15 V15"/>
          <path d="M0,0 H21" stroke-width="3"/><circle class="knob solid" cx="21" r="4.5"/></g></g>
        <rect class="hit" x="0" y="106" width="54" height="68"/></g>`,
    bulb: (c) => `<path class="thin" d="M34,160 q26,-46 50,-12 q22,30 52,-34"/>
      <g class="hot" data-act="bulb" ${named(c.d, "button")}><ellipse class="hatch" cx="24" cy="162" rx="12" ry="9"/>
        <rect class="hit" x="0" y="130" width="50" height="56"/></g>`,
  };
  const COGS = `${cog(16, 106, 13, 10, "cog1")}${cog(39, 91, 9, 8, "cog2")}${cog(57, 108, 9, 7, "cog3")}<path d="M66,108 H78"/>`;
  // What runs through every cell and sign: the line shaft, the scene rod under it, the
  // floor, and under the floor the gutter that marbles go home by.
  const SHAFT = (w) => `<path d="M0,10 H${w} M0,15 H${w}"/><path data-rod class="thin" d="M-6,24 H${w}"/>
    <path d="M0,186 H${w}"/><path class="thin" d="M0,194 H${w}"/>`;

  let figure = 1;
  function cell(d) {
    const act = d.kind === "camera" ? "bulb" : d.dims ? "crank" : "lever";
    const c = {
      d, act, link: act === "lever" ? pick(d.id, Links) : null, guarded: GUARDED.has(d.kind), fig: ++figure,
      shown: d.on, // what the mechanism shows: the state, once the linkage has struck
      on: { x: d.on ? 1 : 0, v: 0 }, lvl: { x: level(d), v: 0 }, arm: { x: d.on ? 1 : 0, v: 0 }, lid: { x: 0, v: 0 }, kick: { x: 0, v: 0 }, trip: { x: 0, v: 0 },
      p: 0, run: 0, // the linkage: how far through, and whether running (1) or being reset (-1)
      struck: false, spent: false, open: 0, biff: 0,
    };

    c.el = document.createElement("figure");
    c.el.className = "cell";
    c.el.dataset.id = d.id;
    c.el.innerHTML = `<svg class="ink" width="200" height="196" viewBox="0 0 200 196">
      <ellipse class="wash" cx="118" cy="168" rx="74" ry="18"/>${SHAFT(200)}
      <path class="thin" d="M96,0 V10 M104,0 V10 M30,192 l8,-6 M96,192 l8,-6 M160,192 l8,-6"/>
      <g transform="translate(50,36)">${c.link ? c.link.art : act === "crank" ? COGS : ""}</g>
      <g transform="translate(118,36)">${Effects[d.kind].art(d)}</g>${CONTROL[act](c)}
      <g data-p="trip"><path class="thin" d="M34,24 V108 M30,108 h8"/></g>
      <path class="web thin" d="M200,15 q-22,6 -28,28 M200,15 l-32,14 M200,15 l-17,32 M187,21 q0,9 8,11 M177,26 q3,14 17,18"/></svg>
      <span class="tag"></span><figcaption class="fig"></figcaption>`;

    const found = {};
    c.q = (name) => (found[name] ??= c.el.querySelector(`[data-p="${name}"]`));
    return c;
  }

  function paint(c) {
    c.el.classList.toggle("away", !!c.d.away);
    c.el.querySelector(".tag").textContent = c.d.away ? `Out of order since ${c.d.away}` : "";
    c.el.querySelector("figcaption").innerHTML = `Fig. ${c.fig}. ${c.d.name}: <b>${SAY[c.d.kind](c.d)}</b><i>${how(c)}</i>`;
  }

  // A room's sign: its name, a thermometer with a mark for what is wanted, and a
  // weather house, whose man with the umbrella comes out as the air gets damper.
  function sign(room) {
    const at = (deg) => 164 - clamp((deg - 5) / 25) * 82;
    const el = document.createElement("figure");
    el.className = "cell sign";
    el.innerHTML = `<svg class="ink" width="140" height="196" viewBox="0 0 140 196">${SHAFT(140)}
      <path d="M36,15 V34 M104,15 V34"/><path class="fill board" d="M8,34 h124 v28 h-124 z"/>
      <text x="70" y="54" text-anchor="middle" style="font-size:16px">${room.name}</text>
      <rect class="fill" x="22" y="78" width="8" height="90" rx="4"/><circle class="solid" cx="26" cy="172" r="7"/>
      <rect class="solid" x="24.5" y="${at(room.temp)}" width="3" height="${168 - at(room.temp)}"/>
      <path class="solid" d="M32,${at(room.target)} l8,-4 v8 z"/>
      <path class="fill" d="M58,186 V124 L94,98 L130,124 V186 z"/><path class="solid" d="M66,186 v-36 h20 v36 z M102,186 v-36 h20 v36 z"/>
      <g transform="translate(94,176) rotate(${(room.humidity - 50) * -0.5})"><path d="M-18,0 H18"/>
        <circle class="fill" cx="-18" cy="-12" r="4"/><path d="M-18,-8 V0 M-27,-20 q9,-8 18,0 M-18,-20 v8"/>
        <circle class="fill" cx="18" cy="-12" r="4"/><path class="fill" d="M18,-8 l-5,8 h10 z"/></g></svg>
      <figcaption class="fig"><b>${room.temp.toFixed(1)}°</b>, wanting ${room.target}°<i>the air ${room.humidity}% damp</i></figcaption>`;
    return el;
  }

  // ---------- running a cell ----------
  // Set the linkage off. If it can't run (it has run already and the bot hasn't been,
  // or the bot is at it now), the glove does the work instead, at once.
  function fire(c) {
    if (c.run === 1) return; // it takes up the newest state when it strikes
    if (c.spent || c.run === -1) { c.biff = 1; c.shown = c.d.on; return; }
    c.run = 1; c.p = 0; c.struck = false;
  }

  function advance(c, dt) {
    c.p = QUICK ? 1 : Math.min(1, c.p + dt / c.link.secs);
    if (!c.struck && c.p >= c.link.hit) { c.struck = true; c.shown = c.d.on; c.kick.v = 90; }
    if (c.p < 1) return;

    c.run = 0;
    if (!c.link.resets) c.p = 0;
    else { c.spent = true; if (c.marble) Marbles.drop(c); else Bot.ask(c); }
    if (c.shown !== c.d.on) fire(c); // it was changed again while this ran
  }

  function tick(c, dt, now) {
    const { d, q } = c;
    const lvl = spring(c.lvl, level(d), dt, 60, 12);
    move(q("trip"), 0, 14 * spring(c.trip, 0, dt, 180, 10));

    if (c.link) {
      const deg = -50 + 70 * spring(c.arm, d.on ? 1 : 0, dt, 120, 12), rad = (deg * Math.PI) / 180;
      set(q("arm"), "transform", `translate(22,150) rotate(${deg.toFixed(1)})`);
      set(q("pull"), "d", `M${(22 + 20 * Math.cos(rad)).toFixed(1)},${(150 + 20 * Math.sin(rad)).toFixed(1)} L52,150`);

      if (c.run === 1) advance(c, dt);
      c.link.pose(q, c.p);
      if (c.marble) show(q("ball"), c.marble.state === "home" ? 1 : 0);
      move(q("paddle"), spring(c.kick, 0, dt, 200, 10), 0);

      c.biff = Math.max(0, c.biff - dt / 0.4);
      const reach = Math.sin(Math.PI * c.biff), fx = 44 + 74 * reach, fy = 176 - 22 * reach;
      show(q("biff"), c.biff > 0 ? 1 : 0);
      set(q("reach"), "d", `M44,176 L${fx.toFixed(1)},${fy.toFixed(1)}`); move(q("fist"), fx, fy);

      if (c.guarded) move(q("lid"), 0, -48 * spring(c.lid, now < c.open ? 1 : 0, dt));
    } else if (c.act === "crank") {
      turn(q("crank"), lvl * 720); turn(q("cog1"), lvl * 720); turn(q("cog2"), lvl * -1040); turn(q("cog3"), lvl * 1040);
    }

    const on = spring(c.on, (c.link ? c.shown : d.on) ? 1 : 0, dt);
    Effects[d.kind].pose(q, { on, v: c.on.v, lvl, d, now, dt, c });
  }

  // ---------- the works ----------
  const works = document.getElementById("works"), cells = [], byId = {};
  for (const room of House.rooms) {
    const bay = document.createElement("section");
    bay.className = "bay";
    bay.append(sign(room));
    for (const d of room.devices) { const c = cell(d); cells.push(c); byId[d.id] = c; bay.append(c.el); paint(c); }
    works.append(bay);
  }
  Marbles.lay(works);
  for (const c of cells) if (c.link?.name === "ball") c.marble = Marbles.make();
  Engine.build(document.getElementById("engine"));
  Bot.build(works, cells[0]);

  // The data: `since` is when it stopped coming. The shaft turns only while it comes.
  let kw = House.watts() / 1000, since = "";
  const steam = { x: 1, v: 0 };
  Engine.paint(kw, since);

  House.on((d) => {
    const c = byId[d.id];
    if (c.link && c.shown !== d.on) fire(c);
    paint(c);
    kw = House.watts() / 1000;
    Engine.paint(kw, since);
  });

  // ---------- the controls ----------
  const cellOf = (el) => byId[el.closest(".cell").dataset.id];
  // Something out of order doesn't answer: it shakes, and the bot is sent to look.
  function refuse(c) {
    c.el.classList.remove("nope"); void c.el.offsetWidth; c.el.classList.add("nope");
    Bot.ask(c);
  }
  function press(c) {
    if (c.d.away) return refuse(c);
    if (c.act === "bulb") { c.flash = 1; return; }
    if (c.act === "crank") { if (!STEADY.has(c.d.kind)) House.toggle(c.d.id); return; }
    if (c.guarded && seconds() > c.open) { c.open = seconds() + 3; return; }
    c.open = 0;
    House.toggle(c.d.id);
  }
  function wind(c, by) {
    const d = c.d, { min, max } = span(d);
    d.level = Math.round(clamp(d.level + by * (max - min), min, max));
    if (d.kind === "cover") d.on = d.level > 0;
    House.changed(d);
  }

  let drag = null;
  works.addEventListener("pointerdown", (e) => {
    const hot = e.target.closest("[data-act]");
    if (!hot) return;
    drag = { c: cellOf(hot), x: e.clientX, y: e.clientY, moved: false };
    if (hot.dataset.act === "crank" && !drag.c.d.away) hot.setPointerCapture(e.pointerId);
  });
  works.addEventListener("pointermove", (e) => {
    if (!drag || drag.c.act !== "crank" || drag.c.d.away) return;
    const by = e.clientX - drag.x - (e.clientY - drag.y); // to the right or upwards is more
    if (!drag.moved && Math.abs(by) < 4) return;
    drag.moved = true; drag.x = e.clientX; drag.y = e.clientY;
    wind(drag.c, by / 160);
  });
  works.addEventListener("pointerup", () => { if (drag && !drag.moved) press(drag.c); drag = null; });
  works.addEventListener("pointercancel", () => { drag = null; });
  works.addEventListener("keydown", (e) => {
    const hot = e.target.closest("[data-act]");
    if (!hot) return;
    const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[e.key];
    if (step && hot.dataset.act === "crank") { e.preventDefault(); wind(cellOf(hot), step); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(cellOf(hot)); }
  });

  // Scenes are bell-pulls. The barrel goes round and its pins work the rod: the rod
  // jerks and a finger trips each of the scene's devices, one after another, so the eye
  // can follow it along the bays.
  function trip(d) {
    byId[d.id].trip.v = 16;
    works.classList.remove("jerk"); void works.offsetWidth; works.classList.add("jerk");
    House.toggle(d.id);
  }
  const TRIALS = {
    steam: () => { since = since ? "" : clock(); document.body.classList.toggle("stale", !!since); Engine.paint(kw, since); },
    fault: () => { const d = House.find("g_pond"); d.away = d.away ? "" : clock(); House.changed(d); if (d.away) Bot.ask(byId[d.id]); },
    alert: () => { House.alerts = House.alerts.length ? [] : [{ text: "Freezer door open", since: clock() }]; Engine.paint(kw, since); },
  };
  const cords = document.getElementById("cords");
  cords.innerHTML = House.scenes.map((s) => `<button class="cord" data-scene="${s.id}"><span>${s.name}</span></button>`).join("") +
    `<span class="gap"></span><button class="cord try" data-trial="steam"><span>Cut the steam</span></button>
    <button class="cord try" data-trial="fault"><span>Break a pump</span></button><button class="cord try" data-trial="alert"><span>Raise an alert</span></button>`;
  cords.onclick = (e) => {
    const cord = e.target.closest(".cord");
    if (!cord) return;
    cord.classList.remove("pulled"); void cord.offsetWidth; cord.classList.add("pulled");
    if (cord.dataset.trial) return TRIALS[cord.dataset.trial]();

    const want = new Set(House.scenes.find((s) => s.id === cord.dataset.scene).on);
    Engine.pull();
    House.devices.filter((d) => (d.kind === "light" || d.kind === "switch") && d.on !== want.has(d.id))
      .forEach((d, i) => setTimeout(() => trip(d), 200 + i * 160));
  };

  // ---------- the loop ----------
  const shafts = [...document.querySelectorAll("[data-shaft]")].map((el) => ({ el, ratio: +el.dataset.shaft }));
  let last = performance.now(), angle = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000), now = t / 1000;
    last = t;

    angle += dt * spring(steam, since ? 0 : 1, dt, 4, 4) * (50 + kw * 90);
    for (const s of shafts) s.el.setAttribute("transform", `rotate(${((angle * s.ratio) % 360).toFixed(1)})`);
    for (const c of cells) tick(c, dt, now);
    Engine.tick(kw, steam.x, dt);
    Marbles.tick(dt);
    Bot.tick(dt, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Line boil: redraw the wobble a few times a second, as a hand-drawn film does.
  if (!QUICK && !document.body.classList.contains("plain")) {
    let seed = 4;
    setInterval(() => document.getElementById("boil").setAttribute("seed", (seed = 4 + ((seed - 3) % 3))), 260);
  }
})();
