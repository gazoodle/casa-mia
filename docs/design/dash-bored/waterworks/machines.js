// The Kitchen's machines, one for each device, each a different size and a different
// joke. Water is let into a machine by its valve (main.js) down the path `feed`, and the
// machine does its work for as long as the water runs.
//
// A machine is { x, y?, feed, cap, secs?, still, live, start?(c), state?(c), pose(q, c, dt, now) }:
// `x` is where its valve sits on the trough, `cap` where its caption goes, `secs` how
// long the water takes to arrive. `c` is the device's cell: `c.fed` is how much water is
// arriving, 0 to 1.
//
// These are placed by hand, for this one room. Each has one way in (the feed) and one
// way out (a drain through the floor), so that they can become tiles laid out by rule.
window.Machines = (() => {
  const { clamp, ease, phase, spring, toward, move, turn, show, set, cog } = Kit;
  const { ty, FLOOR } = Room;

  // Where falling water lands: it is shown for as long as water is landing there.
  const splash = (name, x, y) => `<g data-p="${name}" transform="translate(${x},${y})"><path class="splash" d="M-5,0 q-4,-8 -10,-9 M0,0 v-12 M5,0 q4,-8 10,-9"/></g>`;
  // A bucket on a rope, cut away to show how full it is. Its origin is the top of its
  // bail. It has two holes in its bottom and leaks through them, which is what lets it
  // rise again when the water stops.
  const DROPS = 4;
  const bucket = (name, w) => `<g data-p="${name}"><path d="M${-w / 2},10 q${w / 2},-18 ${w},0"/>
    ${Array.from({ length: DROPS }, (_, i) => `<circle class="drop" data-p="${name}_d${i}" cx="${i % 2 ? 7 : -7}" r="2.2"/>`).join("")}
    <path class="iron" d="M${-w / 2},10 h${w} l-4,34 h${8 - w} z"/><path d="M-9,44 v4 h4 v-4 M5,44 v4 h4 v-4"/>
    <rect class="pool" data-p="${name}_w" x="${5 - w / 2}" y="44" width="${w - 10}" height="0"/>${splash(`${name}_s`, -12, 12)}</g>`;
  const fill = (q, name, f) => { set(q(`${name}_w`), "y", 43 - f * 30); set(q(`${name}_w`), "height", f * 30); };
  // The water falls as far as the bucket, wherever the bucket hangs: `d` is the feed as far
  // as the last drop, and `y` the bucket's rim.
  const pour = (q, id, d, y) => set(q(`w_${id}`), "d", `${d} V${(y + 14).toFixed(0)}`);
  // The drips from a bucket hanging at `y`, for as long as there is water in it (`f`).
  // Each falls from a hole to the floor, gathering speed.
  function leak(q, name, y, f, now) {
    for (let i = 0; i < DROPS; i++) {
      const t = (now * 1.1 + i / DROPS) % 1, drop = q(`${name}_d${i}`);
      set(drop, "cy", 50 + (FLOOR - y - 52) * t * t);
      show(drop, f > 0.03 ? 1 : 0);
    }
  }
  const pulley = (x, y) => `<circle class="brass" cx="${x}" cy="${y}" r="12"/><circle class="solid" cx="${x}" cy="${y}" r="2"/>`;
  const flames = (name, x, y) => `<g data-p="${name}" transform="translate(${x},${y})">
    <path class="flame flick" d="M-12,0 q-8,-12 2,-22 q8,10 -2,22 z"/><path class="flame flick" d="M0,0 q-8,-14 2,-26 q8,12 -2,26 z" style="animation-delay:.1s"/>
    <path class="flame flick" d="M12,0 q-8,-12 2,-22 q8,10 -2,22 z" style="animation-delay:.2s"/></g>`;
  const puffs = (name, x, y) => `<g data-p="${name}"><circle class="puff paper" cx="${x}" cy="${y}" r="7"/>
    <circle class="puff paper" cx="${x}" cy="${y}" r="7" style="animation-delay:.8s"/><circle class="puff paper" cx="${x}" cy="${y}" r="7" style="animation-delay:1.6s"/></g>`;

  // ---- The ceiling light: an overshot waterwheel, belted to a dynamo, wired to a bulb.
  // The further the valve is opened, the faster the wheel and the brighter the bulb.
  const spokes = Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45})" d="M0,-20 V-62"/>`).join("");
  const paddles = Array.from({ length: 16 }, (_, i) => `<path transform="rotate(${i * 22.5})" d="M0,-62 l11,-16"/>`).join("");
  const ceiling = {
    x: 400, feed: "M400,158 V296 Q400,318 412,324", cap: [400, 99],
    still: `<path class="thin" d="M530,278 V106"/><path d="M400,405 L338,${FLOOR} M400,405 L462,${FLOOR} M530,312 V${FLOOR} M506,312 h48"/>
      <path class="cloth" d="M512,304 v-22 a18,18 0 0 1 36,0 v22 h-9 v-22 a9,9 0 0 0 -18,0 v22 z"/>
      <rect class="brass" x="522" y="92" width="16" height="14"/><circle class="glass" cx="530" cy="62" r="30"/>
      <path class="thin" d="M523,92 l4,-24 l3,9 l3,-9 l4,24"/>
      <g class="dim"><path d="M322,508 H478 M322,502 v12 M478,502 v12"/><text x="400" y="524">Ø 156</text></g>`,
    live: `<circle class="lit" data-p="glow_c" cx="530" cy="62" r="54"/>
      <path class="rope" data-p="belt_c" d="M392,387 L524,282 M408,423 L536,303"/>
      <g transform="translate(400,405)"><g data-p="wheel_c">
        <path class="wood" fill-rule="evenodd" d="M-78,0 a78,78 0 1,0 156,0 a78,78 0 1,0 -156,0 M-62,0 a62,62 0 1,0 124,0 a62,62 0 1,0 -124,0"/>
        ${spokes}${paddles}<circle class="brass" r="20"/></g><circle class="solid" r="3"/></g>
      ${cog(530, 292, 10, 8, "dyn_c")}
      <g data-p="spark_c"><path class="flick" d="M504,268 l-8,-7 M556,268 l8,-7 M530,258 v-9"/></g>
      <path class="stream" pathLength="1" data-p="over_c" d="M413,325 A81,81 0 0 1 453,466 Q462,486 464,520 V${FLOOR}"/>
      ${splash("land_c", 414, 322)}${splash("foot_c", 464, FLOOR)}
      ${[0, 1, 2].map((i) => `<path class="spark" data-p="zap_c${i}" d="M0,-6 l2,4 l5,-1 l-4,3 l2,5 l-5,-3 l-5,3 l2,-5 l-4,-3 l5,1 z"/>`).join("")}`,
    start: () => ({ spin: { x: 0, v: 0 }, a: 0, over: 0, zap: 0 }),
    pose(q, c, dt, now) {
      const w = spring(c.spin, c.fed * 200, dt, 5, 4.5);
      c.a += w * dt;

      turn(q("wheel_c"), c.a); turn(q("dyn_c"), c.a * 6);
      q("belt_c").classList.toggle("run", w > 8);
      show(q("spark_c"), w > 20 ? 1 : 0);
      show(q("glow_c"), clamp(w / 200) * 0.9);

      // The water lands just past the top of the wheel, is carried round its falling
      // side and drops off underneath. It arrives from the top, and leaves from the top.
      const on = c.fed > 0, over = q("over_c");
      c.over = toward(c.over, on ? 1 : 0, dt * 1.6);
      over.setAttribute("stroke-dasharray", on ? `${c.over.toFixed(3)} 2` : `0 ${(1 - c.over).toFixed(3)} ${c.over.toFixed(3)} 2`);
      over.style.strokeWidth = (2 + 4 * c.amt).toFixed(1);
      show(q("land_c"), on ? 1 : 0); show(q("foot_c"), c.over >= 1 ? 1 : 0);

      // Sparks go up the wire to the bulb, faster as the dynamo turns faster.
      c.zap = (c.zap + (dt * w) / 150) % 1;
      for (let i = 0; i < 3; i++) {
        const t = (c.zap + i / 3) % 1, zap = q(`zap_c${i}`);
        move(zap, 530 + Math.sin(now * 40 + i * 2) * 2, 278 - 172 * t, `rotate(${((now * 400 + i * 50) % 360).toFixed(0)}) scale(.8)`);
        show(zap, w > 20 ? 1 : 0);
      }
    },
  };

  // ---- The counter light: a jar of glow-worms under a tea cosy. Water fills a bucket,
  // the bucket sinks, and the rope over the pulleys lifts the cosy off. The bucket leaks,
  // so it rises again when the water stops.
  const counter = {
    x: 640, feed: "M640,166 V214 H615", cap: [640, 111],
    still: `<path class="wood" d="M606,218 h44 v4 h-44 z"/><path d="M622,288 H740 M738,288 V590"/>${pulley(642, 300)}${pulley(708, 300)}
      <rect class="wood" x="668" y="590" width="112" height="10"/><path d="M680,600 V${FLOOR} M768,600 V${FLOOR}"/>
      <path class="glass" d="M704,590 v-42 q0,-6 6,-6 h20 q6,0 6,6 v42 z"/>
      <circle class="solid" cx="713" cy="578" r="1.6"/><circle class="solid" cx="722" cy="566" r="1.6"/><circle class="solid" cx="728" cy="580" r="1.6"/>`,
    live: `<circle class="lit" data-p="glow_n" cx="720" cy="566" r="34"/>
      <line class="rope" data-p="r1_n" x1="630" y1="300" x2="630" y2="468"/><line class="rope" data-p="r2_n" x1="720" y1="300" x2="720" y2="528"/>
      ${bucket("bk_n", 44)}
      <g data-p="cosy_n"><path class="cloth" d="M-22,0 q-2,-58 22,-58 q24,0 22,58 z"/><circle class="cloth" cy="-61" r="4"/>
        <path class="thin" d="M-14,-12 q14,8 28,0 M-12,-30 q12,8 24,0"/></g>`,
    start: () => ({ f: 0 }),
    pose(q, c, dt, now) {
      // It fills faster than it leaks, and leaks slowly: about five seconds to empty.
      c.f = toward(c.f, c.fed > 0 ? 1 : 0, dt * (c.fed > 0 ? 0.9 : 0.2));
      const drop = ease(c.f) * 56;

      move(q("bk_n"), 630, 468 + drop); fill(q, "bk_n", c.f); pour(q, c.d.id, counter.feed, 468 + drop);
      set(q("r1_n"), "y2", 468 + drop); set(q("r2_n"), "y2", 526 - drop);
      move(q("cosy_n"), 720, 590 - drop);
      show(q("glow_n"), ease(c.f) * 0.85);
      leak(q, "bk_n", 468 + drop, c.f, now); show(q("bk_n_s"), c.fed > 0 ? 1 : 0);
    },
  };

  // ---- The kettle: the long way round. Water lifts a float, the float lets go a
  // marble, the marble runs three ramps and knocks over six dominoes, the last domino
  // pushes a bowling ball off the end of the shelf, the ball lands on a bellows and
  // squashes it, and the bellows blows up the fire under the kettle. That is the change;
  // the fire is the state. The bot puts it all back afterwards, the ball included, and
  // if it hasn't yet, the fire lights as soon as the float rises.
  const RAMPS = [[851, 229], [1001, 248], [1003, 278], [867, 298], [863, 328], [1001, 348], [1003, 392]];
  const lengths = RAMPS.map((p, i) => (i ? Math.hypot(p[0] - RAMPS[i - 1][0], p[1] - RAMPS[i - 1][1]) : 0));
  const whole = lengths.reduce((a, b) => a + b);
  // Where the marble is, `p` of the way down.
  function onRamps(p) {
    let left = p * whole, i = 1;
    while (i < RAMPS.length - 1 && left > lengths[i]) left -= lengths[i++];
    const a = RAMPS[i - 1], b = RAMPS[i], t = clamp(left / lengths[i]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  const ROLL = 1.9, DOMINOES = 6; // seconds the marble rolls
  // When, in seconds from the start, the ball is pushed, has left the shelf, has landed
  // and has squashed the bellows flat, which ends the chain.
  const PUSH = 2.75, OFF = 3.05, LAND = 3.4, END = 3.7;
  // The bellows stands on its nozzle at BASE and is TALL when full; the ball squashes it by SQUASH.
  const BASE = 524, TALL = 58, SQUASH = 0.45, BALL = 10;
  const domino = (i) => `<g transform="translate(${992 - i * 21},398)"><g data-p="dm_k${i}"><rect class="paper" x="-4" y="-26" width="8" height="26"/>
    <circle class="solid" cy="-19" r="1.2"/><circle class="solid" cy="-8" r="1.2"/></g></g>`;
  const kettle = {
    x: 820, feed: "M820,175 V238", cap: [820, 120], secs: 0.4,
    still: `<rect class="glass" x="802" y="232" width="36" height="80"/><path class="thin" d="M820,312 V${FLOOR}"/>
      <path d="M842,226 v12 h8 M846,238 L1000,256 M1006,286 L866,306 M860,336 L1000,356 M1010,244 V290 M856,296 V340 M1010,344 V398"/>
      <rect class="wood" x="862" y="398" width="152" height="7"/>
      <path class="iron" d="M842,${BASE} h12 v24 h-12 z"/><path class="pipe" d="M848,${BASE + 24} V668 H905"/>
      <path class="iron" d="M905,630 h90 v62 h-90 z"/><rect class="paper" x="922" y="650" width="56" height="38"/><path d="M912,692 V${FLOOR} M988,692 V${FLOOR}"/>
      <path class="copper" d="M918,630 q-4,-44 32,-44 q36,0 32,44 z"/><path d="M980,616 q16,-6 14,-30 M932,592 q18,-22 36,0"/><circle class="brass" cx="950" cy="583" r="3.5"/>`,
    live: `<rect class="pool" data-p="pool_k" x="804" width="32" y="310" height="0"/>
      <g data-p="float_k"><path d="M10,-4 V-64 H28"/><circle class="cloth" r="11"/></g>
      <path class="stream" data-p="waste_k" d="M820,312 V738"/>
      ${Array.from({ length: DOMINOES }, (_, i) => domino(i)).join("")}<circle class="solid" data-p="mb_k" r="5"/>
      <g data-p="ball_k"><circle class="solid" r="${BALL}"/><circle class="paper bare" cx="-3" cy="-4" r="1.6"/><circle class="paper bare" cx="2.5" cy="-5" r="1.6"/><circle class="paper bare" cx="0.5" cy="0.5" r="1.6"/></g>
      <g transform="translate(848,${BASE})"><g data-p="bel_k"><path class="cloth" d="M-18,-58 h36 l-7,10 l7,10 l-7,10 l7,10 l-7,10 l5,8 h-32 l5,-8 l-7,-10 l7,-10 l-7,-10 l7,-10 z"/></g></g>
      ${flames("fire_k", 950, 686)}${puffs("steam_k", 996, 582)}`,
    start(c) {
      // The bot's job: it winds the chain backwards from wherever it stopped.
      let from = 0;
      const job = { x: 884, rise: 280, start() { c.fixing = true; from = c.chain; }, work(p) { c.chain = from * (1 - p); }, done() { c.chain = 0; c.fixing = false; } };
      return { f: 0, chain: 0, lit: false, fixing: false, boil: 0, was: false, job };
    },
    pose(q, c, dt, now) {
      const on = c.fed > 0, up = on && c.f >= 1;
      c.f = toward(c.f, on ? 1 : 0, dt * 1.7);
      if (up && !c.lit && !c.fixing) c.chain = Math.min(END, c.chain + dt);
      if (up && c.chain >= END) c.lit = true;
      if (!on) { c.lit = false; if (c.was && c.chain > 0) Bot.ask(c.job); }
      c.was = on;
      c.boil = toward(c.boil, c.lit ? 1 : 0, dt * 0.5);

      move(q("float_k"), 820, 298 - 40 * ease(c.f));
      set(q("pool_k"), "y", 310 - 46 * c.f); set(q("pool_k"), "height", 46 * c.f);
      show(q("waste_k"), up ? 1 : 0);

      const [mx, my] = onRamps(ease(phase(c.chain, 0, ROLL)) * 0.5 + phase(c.chain, 0, ROLL) * 0.5);
      move(q("mb_k"), mx, my);
      for (let i = 0; i < DOMINOES; i++) {
        const fall = ease(phase(c.chain, ROLL + i * 0.13, ROLL + 0.3 + i * 0.13));
        // The last one leans on the ball, and falls flat when the ball has gone.
        turn(q(`dm_k${i}`), i === DOMINOES - 1 ? -fall * 52 - 38 * phase(c.chain, PUSH, OFF) : -fall * 66);
      }

      // The ball is pushed along the shelf and off its end, drops on the bellows and
      // squashes it. It stays there, and the bellows wheezes under it while the fire burns.
      const pushed = ease(phase(c.chain, PUSH, OFF)), fallen = phase(c.chain, OFF, LAND), wheeze = c.lit ? 0.04 * Math.sin(now * 6) : 0;
      const tall = TALL * (1 - SQUASH * ease(phase(c.chain, LAND, END)) + wheeze), shelf = 398 - BALL;
      const by = fallen < 1 ? shelf + (BASE - TALL - BALL - shelf) * fallen * fallen : BASE - tall - BALL;
      move(q("ball_k"), 872 - 24 * pushed, by, `rotate(${(-150 * pushed).toFixed(0)})`);
      q("bel_k").setAttribute("transform", `scale(1,${(tall / TALL).toFixed(3)})`);
      show(q("fire_k"), c.lit ? 1 : 0); show(q("steam_k"), c.boil);
    },
  };

  // ---- The blind: a counterweight. The more water in the bucket, the lower it hangs
  // and the higher the blind is drawn. It rains outside.
  const rain = Array.from({ length: 7 }, (_, i) => `M${1084 + i * 11},296 l-10,172`).join(" ");
  const blind = {
    x: 1040, feed: "M1040,186 V224 H1029", cap: [1040, 131],
    still: `<path class="wood" d="M1020,228 h30 v4 h-30 z"/><path d="M1052,${ty(1052) + 9} V262 M1062,254 L1069,282"/>${pulley(1052, 262)}
      <rect class="glass" x="1070" y="290" width="84" height="182"/><path class="thin" d="M1112,290 V472 M1070,381 H1154"/>
      <path class="ripple" d="${rain}"/><path class="wood" d="M1062,472 h100 v7 h-100 z"/><rect class="wood" x="1066" y="278" width="92" height="12"/>`,
    live: `<line class="rope" data-p="r_b" x1="1040" y1="262" x2="1040" y2="520"/>${bucket("bk_b", 44)}
      <rect class="cloth" data-p="bl_b" x="1072" y="290" width="80" height="180"/><path data-p="bar_b" d="M-44,0 h88"/>`,
    start: (c) => ({ f: c.d.on ? c.d.level / 100 : 0 }),
    pose(q, c, dt, now) {
      c.f = toward(c.f, c.fed, dt * (c.fed > c.f ? 0.5 : 0.2));
      const y = 520 + c.f * 90, hung = 180 * (1 - c.f);

      move(q("bk_b"), 1040, y); fill(q, "bk_b", c.f); set(q("r_b"), "y2", y); pour(q, c.d.id, blind.feed, y);
      set(q("bl_b"), "height", hung); move(q("bar_b"), 1112, 290 + hung);
      leak(q, "bk_b", y, c.f, now); show(q("bk_b_s"), c.fed > 0 ? 1 : 0);
    },
  };

  // ---- The boiler, fed from the tank. The valve sets how hot it is to be (the brass
  // pointer); the flame is as big as the valve is open, and the thermometer follows.
  const MIN = 30, MAX = 70, mark = (deg) => 520 - ((deg - MIN) / (MAX - MIN)) * 160;
  const boiler = {
    x: 225, y: 152, feed: "M225,168 V300", cap: [264, 180, "start"],
    still: `<path class="brass" d="M218,136 h14 v8 h-14 z"/><path class="brass" d="M206,294 h38 l-13,18 h-12 z"/>
      <path class="copper" d="M180,330 q0,-20 45,-20 q45,0 45,20 V610 q0,14 -45,14 q-45,0 -45,-14 z"/>
      <path class="thin" d="M180,340 h90 M180,600 h90"/><path d="M190,620 V${FLOOR} M260,620 V${FLOOR} M200,692 h50 M225,692 V${FLOOR}"/>
      <rect class="paper" x="218" y="352" width="14" height="172" rx="7"/><circle class="cloth" cx="225" cy="530" r="9"/>
      <path class="thin" d="M236,${mark(30)} h6 M236,${mark(50)} h6 M236,${mark(70)} h6"/>
      <text class="small" x="245" y="${mark(30) + 3}">30</text><text class="small" x="245" y="${mark(50) + 3}">50</text><text class="small" x="245" y="${mark(70) + 3}">70</text>`,
    live: `<rect class="cloth" data-p="merc_w" x="222" width="6"/><path class="brass" data-p="set_w" d="M-12,-6 l10,6 l-10,6 z"/>
      ${flames("fire_w", 225, 690)}${puffs("blow_w", 262, 306)}`,
    start: (c) => ({ temp: c.d.temp, fl: 0 }),
    state: (c) => (c.d.on ? `${Math.round(c.temp)}°, set to ${c.d.level}°` : `off, ${Math.round(c.temp)}°`),
    pose(q, c, dt) {
      const on = c.fed > 0;
      c.fl = toward(c.fl, c.fed, dt * 1.5);
      c.temp = toward(c.temp, on ? c.d.level : MIN, dt * (on ? 0.8 : 0.15));

      set(q("merc_w"), "y", mark(c.temp)); set(q("merc_w"), "height", 524 - mark(c.temp));
      move(q("set_w"), 218, mark(c.d.level));
      q("fire_w").setAttribute("transform", `translate(225,690) scale(1,${(0.4 + c.fl).toFixed(2)})`);
      show(q("fire_w"), c.fl > 0.02 ? 1 : 0);
      show(q("blow_w"), on && c.temp >= c.d.level - 0.5 ? 1 : 0);
    },
  };

  return { k_ceiling: ceiling, k_counter: counter, k_kettle: kettle, k_blind: blind, k_boiler: boiler };
})();
