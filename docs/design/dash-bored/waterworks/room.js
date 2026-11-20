// The room's waterworks: what every machine in it shares. A bucket lift raises water from
// the sump to a header tank, a trough carries it across the top of the room past a valve
// for each device, and what is not drawn off falls down a glass pipe to a gutter under
// the floor and back to the sump. A duck goes round with it.
//
// Everything is drawn in one space, 1200 by 780. `still` is what never moves and `live`
// is what does; the page keeps them in two layers.
window.Room = (() => {
  const { clamp, move, show, turn, set, scissor, cog } = Kit;
  // The trough's water line: it falls 1 in 20 to the right.
  const ty = (x) => 140 + (x - 300) * 0.05;
  const A = ty(300), B = ty(1156), FLOOR = 706;

  // The lift is a loop of chain round two sprockets. Buckets go up the left side, tip
  // over the top into the tank and come down the right side empty.
  const LX = 100, LR = 20, TOP = 60, BOT = 722;
  const { side: SIDE, half: HALF, loop: LOOP, mod, at: onLift } = Kit.chain(LX, LR, TOP, BOT);
  const N = 8, PACE = 110; // buckets, and px a second

  // The duck's way round, as [x, y, how fast]: along the trough, down the pipe and back
  // along the gutter to the sump (DOWN), where it waits for a bucket; and from where the
  // bucket tips it out, across the tank and over the spout (UP).
  const DOWN = [[1150, B - 3, 1], [1172, B + 16, 3], [1172, 722, 4], [1160, 725, 1], [176, 741, 1], [150, 752, 2], [84, 728, 1]];
  const UP = [[150, 80, 2], [290, 80, 0.5], [306, 84, 1], [312, A - 3, 2]];
  const duck = { x: 312, y: A - 3, route: DOWN, i: 0, ride: -1, spin: 0, facing: 1 };
  // What is left to run, in seconds, of each of the silly things that happen now and then.
  const SILLY = { fish: 0.9, cuckoo: 2.4, quack: 1.3 }, left = { fish: 0, cuckoo: 0, quack: 0 };
  let lift = 0, sillies = 0;

  const DUCK = `<ellipse class="duck" cy="-5" rx="10" ry="6"/><circle class="duck" cx="8" cy="-13" r="4.5"/>
    <path class="flame" d="M12,-14 l6,1.5 l-6,1.5 z"/><circle class="solid" cx="9" cy="-14" r="1"/>`;
  const FISH = `<path class="iron" d="M-9,0 q9,-8 16,0 q-7,8 -16,0 z M-9,0 l-6,-5 v10 z"/>`;
  const bucket = (i) => `<g data-p="lb${i}"><path class="iron" d="M-9,-2 h18 l-3,14 h-12 z"/><path class="pool" data-p="lw${i}" d="M-7,1 h14 l-2,9 h-10 z"/></g>`;
  const all = (fn) => Array.from({ length: N }, (_, i) => fn(i)).join("");

  function still(room) {
    return `<path d="M10,10 H1190"/>
      <path class="thin" d="M360,10 V${ty(360)} M760,10 V${ty(760)} M980,10 V${ty(980)}"/>
      <text class="title" x="690" y="42">Fig. 1. The ${room.name}, by water</text>
      <text x="690" y="62">${room.temp}° within (${room.target}° wanted), the air ${room.humidity}% damp</text>
      <!-- the lift, the sump it dips into and the header tank it fills -->
      <rect class="glass" x="40" y="708" width="126" height="64"/>
      <path class="rope" d="M80,${TOP} V${BOT} M120,${TOP} V${BOT}"/>
      <rect class="glass" x="140" y="70" width="160" height="66"/><path class="thin" d="M140,92 h160 M140,116 h160"/>
      <path class="wood" d="M120,56 L150,70 v5 L120,62 z"/><path class="brass" d="M300,80 h12 v8 h-12 z"/>
      <!-- the trough, the pipe at its far end and the gutter under the floor -->
      <path class="wood" d="M298,${A + 2} L1158,${B + 2} v7 L298,${A + 9} z"/><path d="M298,${A - 8} V${A + 9}"/>
      <path class="brass" d="M1152,206 h40 l-12,18 h-16 z"/><rect class="glass" x="1164" y="224" width="16" height="504"/>
      <path d="M170,${FLOOR} H1164 M1180,${FLOOR} H1190"/>
      <path class="thin" d="M300,${FLOOR} l-8,7 M520,${FLOOR} l-8,7 M830,${FLOOR} l-8,7 M1100,${FLOOR} l-8,7"/>
      <path class="wood" d="M1184,733 L166,749 v6 L1184,739 z"/>
      <!-- the cuckoo's house -->
      <g transform="translate(1130,50)"><path class="wood" d="M-20,4 l20,-18 l20,18 v30 h-40 z"/><rect class="paper" x="-8" y="12" width="16" height="16"/></g>
      <g class="dim"><path d="M300,${A + 26} H1156 M300,${A + 20} v12 M1156,${A + 20} v12"/><text x="700" y="${A + 40}">FALL 1 IN 20</text></g>`;
  }

  function live() {
    const way = `M302,${A} L1156,${B} L1172,${B + 12} V728 L170,744 L160,762`;
    return `<rect class="pool" data-p="tank" x="142" y="84" width="156" height="50"/>
      <rect class="pool" x="42" y="730" width="122" height="40"/>
      <g data-p="flow"><path class="stream" d="M306,88 V${A}"/><path class="stream" d="${way}"/><path class="ripple" d="${way}"/></g>
      ${cog(100, TOP, 13, 8, "spT")}${cog(100, BOT, 13, 8, "spB")}${all(bucket)}
      <g data-p="fish">${FISH}</g>
      <g transform="translate(1130,70) scale(-1,1)"><path class="thin" data-p="tongs"/>
        <g data-p="cuckoo"><ellipse class="cloth" rx="9" ry="6"/><path class="flame" d="M8,-2 l7,2 l-7,2 z"/><circle class="solid" cx="4" cy="-2" r="1.2"/></g></g>
      <text data-p="coo" x="1046" y="30" text-anchor="end">cuckoo!</text>
      <g data-p="duck">${DUCK}</g>
      <text data-p="quack" text-anchor="middle">quack</text>`;
  }

  // The duck, `step` px on. In a bucket it goes where the bucket goes.
  function swim(step, dt) {
    duck.spin = 0;
    if (duck.ride >= 0) {
      const s = mod(lift + (duck.ride * LOOP) / N), at = onLift(s);
      duck.x = at.x; duck.y = at.y - 2;
      if (s > SIDE + HALF * 0.6) Object.assign(duck, { ride: -1, route: UP, i: 0 });
      return;
    }

    const to = duck.route[duck.i];
    if (!to) {
      // Out of the tank it starts down again; in the sump it takes the next bucket.
      if (duck.route === UP) Object.assign(duck, { route: DOWN, i: 0 });
      else for (let i = 0; i < N; i++) if (mod(lift + (i * LOOP) / N) < 12) duck.ride = i;
      return;
    }

    const dx = to[0] - duck.x, dy = to[1] - duck.y, far = Math.hypot(dx, dy), go = step * to[2];
    if (to[2] >= 3) duck.spin = dt * 600; // it tumbles down the pipe
    if (Math.abs(dx) > 4) duck.facing = Math.sign(dx);
    if (far <= go) { duck.x = to[0]; duck.y = to[1]; duck.i += 1; } else { duck.x += (dx / far) * go; duck.y += (dy / far) * go; }
  }

  let tumble = 0;

  // `steam` is 1 while the data is coming and falls to 0 when it stops: the tank runs
  // dry and the lift stops.
  function tick(q, steam, dt, now) {
    lift += PACE * steam * dt;
    for (let i = 0; i < N; i++) {
      const at = onLift(mod(lift + (i * LOOP) / N));
      move(q(`lb${i}`), at.x, at.y, `rotate(${at.a.toFixed(0)})`);
      show(q(`lw${i}`), at.a < 40 ? steam : 0);
    }
    turn(q("spT"), lift * 4.4); turn(q("spB"), lift * 4.4);
    set(q("tank"), "y", 134 - 50 * steam); set(q("tank"), "height", 50 * steam);
    show(q("flow"), clamp(steam * 1.5));

    swim(PACE * steam * dt, dt);
    tumble = duck.spin ? tumble + duck.spin : 0;
    move(q("duck"), duck.x, duck.y + Math.sin(now * 5) * 1.2, `rotate(${tumble.toFixed(0)}) scale(${duck.facing},1)`);

    for (const name in left) left[name] = Math.max(0, left[name] - dt);
    const done = (name) => 1 - left[name] / SILLY[name];

    // A fish leaps out of the tank and back.
    show(q("fish"), left.fish ? 1 : 0);
    if (left.fish) { const p = done("fish"); move(q("fish"), 185 + 70 * p, 84 - 64 * Math.sin(Math.PI * p), `rotate(${(-70 + 140 * p).toFixed(0)})`); }

    // The cuckoo comes out on lazy tongs, says so and goes back in.
    const out = left.cuckoo ? 8 + 70 * clamp(Math.sin(Math.PI * done("cuckoo")) * 1.6) : 8;
    set(q("tongs"), "d", scissor(out, 4, 20)); move(q("cuckoo"), out, 0);
    show(q("coo"), out > 70 ? 1 : 0);

    show(q("quack"), left.quack ? 1 : 0);
    if (left.quack) move(q("quack"), duck.x, duck.y - 24);
  }

  // Something silly, a different thing each time.
  function surprise() { const name = Object.keys(SILLY)[sillies++ % 3]; left[name] = SILLY[name]; }

  return { ty, FLOOR, DUCK, FISH, still, live, tick, surprise };
})();
