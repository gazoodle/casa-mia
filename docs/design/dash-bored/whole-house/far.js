// The house as seen from far off: every room on one sheet, laid out by plan.js. A room
// is drawn here by rule, as a glyph for each of its devices hung under a tap on the
// trough: water runs to a glyph while its device is on, and the glyph does one thing that
// can be read from across the room. A room that has been drawn in full (the Kitchen)
// puts that drawing in `near`, which the page fades in as the view closes on it.
//
// Nothing here is moved by script but the lift, the tank and the duck: a glyph is
// switched by a class when its device changes, and the page's CSS does the moving.
window.Far = (() => {
  const { cog, move, show, turn, set } = Kit;
  const { W, XI, XP, LIFT, TANK, POND, cells, rows, ty, gy, river } = Plan;
  const lift = Kit.chain(LIFT.x, LIFT.r, LIFT.top, LIFT.bot);
  const N = 14, PACE = 300; // the lift's buckets, and px a second for it and for what rides the water
  const FLOOR = Room.FLOOR, GROUND = POND.y + POND.h;

  // ---- The glyphs, one for each kind of device. Each is drawn below its tap, about 160
  // wide and 270 tall. `spin` turns, `shake` rings and `nod` nods while the device is
  // on; `when` is only there while it is on.
  const teeth = (r, n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    return `M${(c * r).toFixed(0)},${(s * r).toFixed(0)} L${(c * (r + 12)).toFixed(0)},${(s * (r + 12)).toFixed(0)}`; }).join(" ");
  const gear = (x, y, r, n, made, how = "") => `<g transform="translate(${x},${y})"><g class="spin ${how}"><circle class="${made}" r="${r}"/>
    <path d="${teeth(r, n)} M0,0 H${r - 8}"/></g><circle class="solid" r="5"/></g>`;
  const fire = (x, y) => `<g class="when" transform="translate(${x},${y})"><path class="flame flick" d="M-26,0 q-16,-24 4,-44 q16,20 -4,44 z"/>
    <path class="flame flick" d="M0,0 q-16,-28 4,-52 q16,24 -4,52 z" style="animation-delay:.1s"/><path class="flame flick" d="M26,0 q-16,-24 4,-44 q16,20 -4,44 z" style="animation-delay:.2s"/></g>`;
  const puffs = (x, y) => `<g class="when">${[0, 0.8, 1.6].map((s) => `<circle class="puff paper" cx="${x}" cy="${y}" r="16" style="animation-delay:${s}s"/>`).join("")}</g>`;

  const bulb = () => `${gear(0, 46, 34, 8, "wood")}<path class="thin" d="M0,92 V132"/><circle class="lit" cy="200" r="96"/>
    <rect class="brass" x="-14" y="130" width="28" height="22"/><circle class="glass" cy="200" r="50"/><path class="thin" d="M-10,152 l6,40 l4,-12 l4,12 l6,-40"/>`;
  const cogs = () => `${gear(-14, 96, 58, 10, "iron")}${gear(66, 196, 34, 8, "brass", "back")}<path d="M-14,160 V270 M-60,270 H110"/>`;
  const fan = () => `<path d="M0,120 V270 M-46,270 H46"/><g transform="translate(0,110)"><g class="spin fast">
    ${[0, 120, 240].map((a) => `<path class="brass" transform="rotate(${a})" d="M0,0 q34,-60 0,-92 q-34,32 0,92 z"/>`).join("")}<circle class="hit" r="92"/></g><circle class="solid" r="7"/></g>`;
  const pane = () => `<rect class="glass" x="-70" y="62" width="140" height="170"/><path class="thin" d="M0,62 V232 M-70,147 H70"/>
    <rect class="cloth blind" x="-66" y="64" width="132" height="166"/><rect class="wood" x="-80" y="48" width="160" height="14"/><rect class="wood" x="-80" y="232" width="160" height="10"/>`;
  const padlock = () => `<g class="shackle"><path class="pipe" d="M-28,140 v-46 a28,28 0 0 1 56,0 v46"/></g><rect class="iron" x="-52" y="132" width="104" height="92" rx="8"/>
    <circle class="solid" cy="168" r="10"/><path d="M0,172 v28"/>`;
  const bell = () => `<path d="M0,50 V72"/><g class="shake"><path class="brass" d="M-64,206 q12,-10 14,-72 q4,-60 50,-60 q46,0 50,60 q2,62 14,72 z"/><circle class="solid" cy="222" r="11"/></g>`;
  const camera = () => `<circle class="lit" cy="118" r="60"/><rect class="iron" x="-54" y="80" width="108" height="76"/><circle class="glass" cy="118" r="24"/>
    <rect class="brass" x="-20" y="64" width="40" height="16"/><path d="M-30,156 l-34,114 M30,156 l34,114 M0,156 V270"/>`;
  const stove = () => `<path class="copper" d="M-56,214 V92 q0,-26 56,-26 q56,0 56,26 V214 z"/><path class="thin" d="M-56,104 h112 M-56,200 h112"/>
    <path d="M-56,214 V270 M56,214 V270"/>${fire(0, 268)}${puffs(48, 56)}`;
  const horn = () => `<path class="brass" d="M-6,206 q-12,-66 -78,-112 l44,-54 q70,62 86,166 z"/><rect class="wood" x="-52" y="206" width="116" height="62"/>
    ${gear(66, 236, 14, 6, "iron", "fast")}${puffs(-70, 40)}`;
  const barrel = () => `<path class="wood" d="M-50,84 q-22,92 0,184 h100 q22,-92 0,-184 z"/><path class="thin" d="M-60,134 h120 M-60,218 h120"/>
    <g class="when"><rect class="pool" x="-52" y="140" width="104" height="72"/></g>`;
  const sheep = () => `<path d="M-44,226 v44 M-18,234 v36 M22,234 v36 M48,226 v44"/><ellipse class="paper" cy="190" rx="74" ry="48"/>
    <path class="thin" d="M-40,170 q10,-12 20,0 M0,160 q10,-12 20,0 M-20,200 q10,-12 20,0 M24,196 q10,-12 20,0"/><g class="nod"><ellipse class="solid" cx="84" cy="168" rx="24" ry="17"/></g>`;
  const broom = () => `<g class="shake"><path class="pipe" d="M0,56 L-24,226"/><path class="wood" d="M-62,226 h70 l12,44 h-94 z"/><path class="thin" d="M-50,236 v34 M-30,236 v34 M-10,236 v34"/></g>`;
  const GLYPH = { light: bulb, switch: cogs, fan, cover: pane, lock: padlock, alarm_control_panel: bell, siren: bell, camera, climate: stove,
    water_heater: stove, humidifier: stove, media_player: horn, valve: barrel, lawn_mower: sheep, vacuum: broom };

  // A device: its tap on the trough, the water that falls from it and its glyph. A room
  // drawn in full says where its taps are; otherwise they are spaced out along the trough.
  function device(d, i, n) {
    const x = window.Machines?.[d.id]?.x ?? Math.round((1200 * (i + 1)) / (n + 1)), y = ty(x);
    return `<g class="fd" data-f="${d.id}" transform="translate(${x},${y.toFixed(1)})"><path class="thin" d="M0,420 V${(FLOOR - y).toFixed(0)}"/>
      <path class="stream feed" d="M0,6 V150"/><path class="ripple feed" d="M0,6 V150"/><circle class="cast" r="15"/>
      <g transform="translate(0,150)">${GLYPH[d.kind]()}</g><rect class="hit" x="-100" y="-24" width="200" height="460"><title>${d.name}</title></rect></g>`;
  }

  // Show a device as it now is, and whether it has stopped answering.
  function mark(d, away) {
    const el = document.querySelector(`[data-f="${d.id}"]`), level = !d.on ? 0 : d.kind === "light" || d.kind === "cover" ? d.level / 100 : 1;
    el.classList.toggle("on", d.on); el.classList.toggle("away", !!away);
    const lit = el.querySelector(".lit"), blind = el.querySelector(".blind");
    if (lit) show(lit, d.on ? 0.25 + 0.65 * level : 0);
    if (blind) set(blind, "height", 166 * (1 - level));
  }

  // ---- The sheet. `near(cell)` is what a room has to show close up, as { still, live }.
  const fence = Array.from({ length: 12 }, (_, i) => `M${50 + i * 100},${FLOOR} v-70 l12,-14 l12,14 v70`).join(" ");
  const rain = Array.from({ length: 11 }, (_, i) => `M${90 + i * 105},30 l-36,230`).join(" ");
  const box = (c) => (c.outside ? `<path d="M0,${FLOOR} H1200"/><path class="thin" d="${fence} M40,${FLOOR - 40} H1180"/>` : `<rect x="10" y="10" width="1180" height="${FLOOR - 10}"/>`);
  const plank = (a, b) => `<path class="wood" d="M${a[0]},${a[1] + 2} L${b[0]},${b[1] + 2} v7 L${a[0]},${a[1] + 9} z"/>`;

  function still(near) {
    const room = (c) => `<g class="room${c.detail ? " detailed" : ""}" transform="translate(${c.x},${c.y})"><g class="frame">${box(c)}${plank([10, gy(10)], [1190, gy(1190)])}</g>
      <g class="far"><text class="fname" x="1172" y="84" text-anchor="end">${c.room.name}, ${c.room.temp}°</text></g><g class="near">${near(c).still}</g></g>`;
    // A row's trough with a stop at its head, the pipe at its end, and the chute back.
    const row = (r) => `${plank([r.start[0] - 10, r.start[1] - 0.5], r.lip)}<path d="M${r.start[0] - 10},${r.start[1] - 16} V${r.start[1] + 8.5}"/>
      <path class="brass" d="M${XP - 24},${r.lip[1] - 2} h48 l-14,20 h-20 z"/><rect class="glass" x="${XP - 10}" y="${r.lip[1] + 18}" width="20" height="${r.pipe[1] - r.lip[1] - 22}"/>${plank([r.end[0] - 10, r.end[1] + 0.3], [XP + 16, r.pipe[1] - 0.4])}`;

    return `<g class="far"><text class="ftitle" x="2300" y="170" text-anchor="middle">Fig. 1. The House, by water</text>
        <text class="ftext" x="2300" y="250" text-anchor="middle">${House.outside.temp}° outside and ${House.outside.sky}. Tap a room, and the duck will take you to it.</text></g>
      <g class="frame"><path class="rope" d="M${LIFT.x - LIFT.r},${LIFT.top} V${LIFT.bot} M${LIFT.x + LIFT.r},${LIFT.top} V${LIFT.bot}"/>
        <rect class="glass" x="${TANK.x}" y="${TANK.y}" width="${TANK.w}" height="${TANK.h}"/><path class="wood" d="M${LIFT.x + LIFT.r + 2},${LIFT.top + 12} L${TANK.x + 20},${TANK.y} v8 L${LIFT.x + LIFT.r + 2},${LIFT.top + 20} z"/>
        <path class="brass" d="M${XI - 8},${TANK.y + TANK.h - 10} h16 v16 h-16 z"/>
        <rect class="glass" x="${POND.x}" y="${POND.y}" width="${POND.w}" height="${POND.h}"/><path d="M${POND.x + POND.w},${GROUND} H${W - 30}"/>
        <path class="thin" d="${Array.from({ length: 30 }, (_, i) => `M${520 + i * 122},${GROUND} l-14,22`).join(" ")}"/>
        <!-- the engine house: the one place there is steam -->
        <path class="copper" d="M560,${GROUND} v-92 q0,-26 52,-26 q52,0 52,26 v92 z"/><path class="iron" d="M598,${GROUND - 116} v-76 h28 v76 z"/><path d="M500,${GROUND - 60} V${GROUND}"/>
        ${rows.map(row).join("")}</g>
      ${cells.map(room).join("")}`;
  }

  const way = (points) => `M${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")}`;
  const bucket = (i) => `<g data-p="h_lb${i}"><g transform="scale(3)"><path class="iron" d="M-9,-2 h18 l-3,14 h-12 z"/><path class="pool" data-p="h_lw${i}" d="M-7,1 h14 l-2,9 h-10 z"/></g></g>`;

  function live(near) {
    const room = (c) => `<g class="room${c.detail ? " detailed" : ""}" data-room="${c.room.id}" transform="translate(${c.x},${c.y})">
      <rect class="hit" width="1200" height="780" tabindex="0" role="button" aria-label="${c.room.name}"/>
      <g class="frame flag" data-p="h_flag_${c.room.id}" transform="translate(1150,10)"><path d="M0,0 V-120"/><path class="cloth" d="M0,-120 l76,22 l-76,22 z"/>
        <text class="ftext" x="-16" y="-84" text-anchor="end" data-p="h_flagt_${c.room.id}"></text></g>
      ${c.outside ? `<g class="frame"><path class="rain" d="${rain}"/></g>` : ""}
      <g class="far">${c.room.devices.map((d, i, all) => device(d, i, all.length)).join("")}</g><g class="near">${near(c).live}</g></g>`;
    // A row's gutters: each room's runs into the next room's, and the last into the pipe.
    const gutter = (r) => way([...r.cells.flatMap((c) => [[c.x + 10, c.y + gy(10)], [c.x + 1190, c.y + gy(1190)]]), [XP - 10, r.cells.at(-1).y + gy(1250)]]);

    return `<rect class="pool" data-p="h_tank" x="${TANK.x + 2}" width="${TANK.w - 4}"/>
      <rect class="pool" x="${POND.x + 2}" y="${POND.level}" width="${POND.w - 4}" height="${GROUND - POND.level - 2}"/>
      <g class="frame flow"><path class="stream" d="${way(river)}"/><path class="ripple" d="${way(river)}"/>${rows.map((r) => `<path class="stream trickle" d="${gutter(r)}"/>`).join("")}</g>
      <g class="frame engine">${gear(500, GROUND - 60, 46, 10, "iron")}<path class="rope run" d="M500,${GROUND - 106} L${LIFT.x},${LIFT.bot - 26} M500,${GROUND - 14} L${LIFT.x},${LIFT.bot + 26}"/>
        ${[0, 0.8, 1.6].map((s) => `<circle class="puff paper" cx="612" cy="${GROUND - 204}" r="20" style="animation-delay:${s}s"/>`).join("")}
        ${cog(LIFT.x, LIFT.top, 26, 10, "h_spT")}${cog(LIFT.x, LIFT.bot, 26, 10, "h_spB")}${Array.from({ length: N }, (_, i) => bucket(i)).join("")}</g>
      ${cells.map(room).join("")}
      <g data-p="h_fish"><g transform="scale(3)">${Room.FISH}</g></g><g data-p="h_duck">${Room.DUCK}</g>
      <text class="ftext" data-p="h_quack" text-anchor="middle" font-style="italic">quack</text>`;
  }

  // A room's flag, flown while something in it is out of order, with what and since when.
  function flag(q, cell, text) { show(q(`h_flag_${cell.room.id}`), text ? 1 : 0); q(`h_flagt_${cell.room.id}`).textContent = text; }

  // ---- What moves. The duck goes round with the water at the lift's pace and waits in
  // the pond for a bucket. While `held`, the page is moving it (main.js) and it tumbles.
  const duck = { s: 0, x: 0, y: 0, held: false, spin: 0 };
  const SILLY = { fish: 1.1, quack: 1.3 }, left = { fish: 0, quack: 0 };
  let turned = 0, sillies = 0;

  // `steam` is 1 while the data is coming and falls to 0 when it stops: the tank runs
  // dry and the lift stops. `px` is how many of the drawing's units make one px on the screen.
  function tick(q, steam, dt, now, px) {
    turned += PACE * steam * dt;
    for (let i = 0; i < N; i++) {
      const at = lift.at(turned + (i * lift.loop) / N);
      move(q(`h_lb${i}`), at.x, at.y, `rotate(${at.a.toFixed(0)})`);
      show(q(`h_lw${i}`), at.a < 40 ? steam : 0);
    }
    turn(q("h_spT"), turned * 2.2); turn(q("h_spB"), turned * 2.2);
    set(q("h_tank"), "y", TANK.y + TANK.h - 2 - 80 * steam); set(q("h_tank"), "height", 80 * steam);

    if (!duck.held) {
      // At the foot of the lift it goes no further until a bucket is passing.
      const next = duck.s + PACE * steam * dt, waiting = duck.s <= Plan.foot && next > Plan.foot;
      const passing = () => Array.from({ length: N }, (_, i) => lift.mod(turned + (i * lift.loop) / N)).some((s) => Math.abs(s - (LIFT.bot - POND.level)) < 10);
      duck.s = waiting && !passing() ? Plan.foot : next % Plan.LOOP;
    }
    const at = Plan.at(duck.s), size = Math.max(1, px * 0.9), tumbling = duck.held || (at.steep && duck.s < Plan.foot);
    duck.spin = tumbling ? duck.spin + dt * 700 : 0;
    Object.assign(duck, { x: at.x, y: at.y });
    move(q("h_duck"), at.x, at.y + Math.sin(now * 5) * 1.2 * size, `rotate(${duck.spin.toFixed(0)}) scale(${at.left ? -size : size},${size})`);

    for (const name in left) left[name] = Math.max(0, left[name] - dt);
    // A fish leaps out of the pond and back.
    show(q("h_fish"), left.fish ? 1 : 0);
    if (left.fish) { const p = 1 - left.fish / SILLY.fish; move(q("h_fish"), POND.x + 190 + 150 * p, POND.level - 190 * Math.sin(Math.PI * p), `rotate(${(-70 + 140 * p).toFixed(0)})`); }
    show(q("h_quack"), left.quack ? 1 : 0);
    if (left.quack) move(q("h_quack"), at.x, at.y - 26 * size);
  }

  const quack = () => { left.quack = SILLY.quack; };
  // Something silly, a different thing each time.
  function surprise() { const name = Object.keys(SILLY)[sillies++ % 2]; left[name] = SILLY[name]; }

  return { still, live, mark, flag, tick, duck, quack, surprise };
})();
