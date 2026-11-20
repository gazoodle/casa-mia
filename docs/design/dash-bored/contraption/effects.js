// The mechanisms: one for each kind of device. Each is drawn in a space 80 wide and 150
// tall with the floor at 150; the line shaft runs 24 above its top.
//
// `art(d)` draws it once. `pose(q, s)` moves it, every frame:
//   s.on   0 to 1, sprung: how far it is towards being on
//   s.v    how fast s.on is moving
//   s.lvl  0 to 1, sprung: its level across its span
//   s.d    the device;  s.now  seconds;  s.dt  seconds since the last frame
//   s.c    the cell, for what a mechanism must remember (an angle, a flash)
window.Effects = (() => {
  const { clamp, set, move, turn, show, wheel, cog, pick } = Kit;
  const sway = (now, rate) => Math.sin(now * rate);
  // A wheel that runs freely: its angle is kept on the cell.
  const run = (s, speed) => (s.c.angle = ((s.c.angle ?? 0) + s.dt * speed) % 360);
  const flames = (xs, y) => xs.map((x, i) =>
    `<path class="flame flick" d="M${x},${y} q-5,-8 0,-16 q5,8 0,16 z" style="animation-delay:${i * 0.1}s"/>`).join("");
  const puffs = (x, y, n = 2) => Array.from({ length: n }, (_, i) =>
    `<circle class="puff fill" cx="${x}" cy="${y}" r="5" style="animation-delay:${i * 1.2}s"/>`).join("");

  // What hangs over a candle to snuff it, drawn hanging from (0,0).
  const WEIGHTS = [
    { name: "a boot", art: `<path class="fill" d="M-9,8 h15 v18 q15,1 19,9 q1,5 -3,6 h-31 z"/><path d="M-9,36 h31 M-5,14 h7 M-5,19 h7"/>` },
    { name: "a flat iron", art: `<path class="hatch" d="M-20,40 q2,-17 22,-17 h17 v17 z"/><path d="M-9,23 q9,-15 21,0"/>` },
    { name: "the second-best teapot", art: `<ellipse class="fill" cx="0" cy="30" rx="16" ry="11"/><path d="M15,28 q10,-2 12,-11 M-15,25 q-11,4 -3,12 M-8,19 h16"/><circle class="solid" cx="0" cy="16" r="2"/>` },
    { name: "a common brick", art: `<rect class="hatch" x="-19" y="16" width="38" height="24"/>` },
    { name: "a kipper", art: `<path class="fill" d="M-21,28 q15,-15 31,0 q-16,15 -31,0 z"/><path class="fill" d="M10,28 l11,-9 v18 z"/><circle class="solid" cx="-13" cy="26" r="1.4"/><path class="thin" d="M-6,22 q4,6 0,12 M0,21 q4,7 0,14"/>` },
    { name: "a small anvil", art: `<path class="hatch" d="M-21,14 h37 q6,0 8,5 h-14 q-2,10 4,14 v7 h-31 v-7 q6,-4 4,-14 h-8 z"/>` },
  ];
  const weight = (d) => pick(d.id + "w", WEIGHTS);

  // A glass with a mark for what is wanted: `at(deg)` is how far up a reading is.
  const glass = (q, d, at) => {
    const y = at(d.temp);
    set(q("merc"), "y", y); set(q("merc"), "height", Math.max(0, at.foot - y));
    move(q("want"), 0, at(d.level));
    show(q("fire"), d.level > d.temp ? 1 : 0);
  };
  const scale = (foot, top, min, max) => Object.assign((deg) => foot - clamp((deg - min) / (max - min)) * (foot - top), { foot });
  const STOVE = scale(118, 28, 5, 30), TANK = scale(132, 52, 30, 70);

  return {
    weight,

    // A candle, and something heavy on a rope to snuff it. The rope's length is fixed,
    // so what the sandbag takes up on its side lifts the weight on the other.
    light: {
      art: (d) => `<circle class="glow" data-p="glow" cx="46" cy="112" r="34"/>
        <path data-p="rays" class="thin" d="M46,82 v-10 M68,92 l8,-8 M24,92 l-8,-8"/>
        <path class="hatch" d="M32,150 h28 l-4,-6 h-20 z"/><path class="fill" d="M42,144 v-22 h8 v22 z"/>
        <g data-p="wick"><path class="flame flick" d="M0,0 q-6,-8 0,-17 q6,8 0,17 z"/></g>
        <path data-p="rope"/>
        <g data-p="bob"><path class="hatch" d="M-5,0 h10 l2,12 h-14 z"/></g>
        <g data-p="weight"><path d="M0,0 v9"/>${weight(d).art}</g>
        <g transform="translate(33,8)"><g data-p="pulley"><circle class="fill" r="13"/><path d="M-13,0 H13 M0,-13 V13"/></g><circle class="solid" r="2"/></g>`,
      pose(q, s) {
        const hook = 84 - 48 * s.on, bob = 34 + 48 * s.on, lit = clamp(s.on);
        move(q("weight"), 46, hook); move(q("bob"), 20, bob);
        set(q("rope"), "d", `M20,${bob.toFixed(1)} V8 A13,13 0 0 1 46,8 V${hook.toFixed(1)}`);
        turn(q("pulley"), s.on * 210);
        show(q("glow"), lit * (0.2 + 0.4 * s.lvl)); show(q("rays"), lit); show(q("wick"), lit);
        move(q("wick"), 46, 121, `scale(${(0.55 + 0.6 * s.lvl).toFixed(2)})`);
      } },

    // A knife switch, and a meter for what it draws.
    switch: {
      art: () => `<g transform="translate(40,32)"><circle class="fill" r="18"/><path class="thin" d="M-13,-9 l3,2 M0,-16 v4 M13,-9 l-3,2"/>
          <path data-p="needle" d="M0,4 V-13" stroke-width="2"/><circle class="solid" cy="4" r="2"/></g>
        <path class="thin" d="M40,50 V96"/><path class="hatch" d="M8,96 h64 v40 h-64 z"/><path d="M14,136 v14 M66,136 v14"/>
        <path class="fill" d="M58,106 h7 v14 h-7 z"/>
        <g transform="translate(20,114)"><g data-p="blade"><path d="M0,0 H40" stroke-width="3"/><circle class="solid" cx="44" r="5"/></g><circle class="solid" r="3"/></g>
        <path data-p="spark" class="glow" d="M61,98 l3,-10 l2,6 l8,-4 l-5,7 l7,3 l-9,2 z"/>`,
      pose(q, s) {
        turn(q("blade"), -58 * (1 - s.on));
        turn(q("needle"), -55 + 110 * clamp(s.on) * clamp(Math.log10(s.d.watts + 1) / 3.5), 0, 4);
        show(q("spark"), s.on > 0.5 ? clamp(Math.abs(s.v) * 0.5) : 0);
      } },

    // A window, with a blind wound up from a drum at the floor.
    cover: {
      art: () => `<path class="wash" d="M14,34 h52 v76 h-52 z"/><path class="thin" d="M16,100 q12,-18 24,-4 q10,-14 24,2"/>
        <path d="M12,32 h56 v80 h-56 z M40,32 V112 M12,72 H68"/>
        <rect data-p="blind" class="hatch" x="13" y="33" width="54" height="0"/>
        <path class="fill" d="M8,25 h64 v7 h-64 z"/><path class="thin" d="M74,32 V134"/>
        ${cog(74, 136, 8, 7, "drum")}<path d="M74,144 V150"/>`,
      pose(q, s) {
        set(q("blind"), "height", (78 * (1 - clamp(s.lvl))).toFixed(1));
        turn(q("drum"), s.lvl * 540);
      } },

    // A door, a bolt and a key.
    lock: {
      art: () => `<path d="M10,8 V150"/><path class="fill" d="M22,14 h50 v136 h-50 z"/>
        <path class="thin" d="M30,24 h34 v42 h-34 z M30,92 h34 v48 h-34 z"/><path class="hatch" d="M3,70 h10 v14 h-10 z"/>
        <g data-p="bolt"><path class="fill" d="M6,73 h36 v8 h-36 z"/><path d="M36,73 v-8" stroke-width="3"/></g>
        <g transform="translate(58,78)"><circle class="fill" r="7"/><g data-p="key"><path d="M0,0 H17 M13,0 v5 M17,0 v5"/></g><circle class="solid" r="2"/></g>`,
      pose(q, s) { move(q("bolt"), 16 * (1 - s.on), 0); turn(q("key"), 90 * s.on); } },

    // A stove that burns while the room is colder than is wanted, and a thermometer
    // with a pointer for what is wanted.
    climate: {
      art: () => `<rect class="fill" x="6" y="24" width="8" height="98" rx="4"/><circle class="solid" cx="10" cy="126" r="7"/>
        <rect data-p="merc" class="solid" x="8.5" width="3"/><path data-p="want" class="solid" d="M16,0 l8,-4 v8 z"/>
        <path d="M40,-6 V72 M50,-6 V72"/><path class="fill" d="M28,150 q-8,-40 4,-78 h26 q12,38 4,78 z"/>
        <path class="hatch" d="M35,104 h20 v28 h-20 z"/>
        <g data-p="fire">${flames([41, 49], 130)}${puffs(45, -8)}</g>`,
      pose(q, s) { glass(q, s.d, STOVE); } },

    // A copper cylinder on legs over a flame, with a sight glass.
    water_heater: {
      art: () => `<path d="M40,28 V-12"/><path class="fill" d="M18,136 V50 q22,-24 44,0 V136 z"/><path d="M18,72 H62 M18,114 H62 M22,136 v14 M58,136 v14"/>
        <rect class="fill" x="68" y="48" width="6" height="88"/><rect data-p="merc" class="solid" x="69.5" width="3"/>
        <path data-p="want" class="solid" d="M66,0 l-8,-4 v8 z"/>
        <g data-p="fire">${flames([32, 40, 48], 150)}</g>`,
      pose(q, s) { glass(q, s.d, TANK); } },

    // A gramophone turned by the shaft. A sock in the horn is the volume: the further
    // out it is pulled, the louder.
    media_player: {
      art: () => `${wheel(30, -24, 8, 1)}<path class="thin" d="M23,-24 L13,100 M37,-24 L47,100"/>
        <path class="hatch" d="M10,122 h50 v28 h-50 z"/><path d="M30,118 v4"/>
        <g transform="translate(30,100)"><g data-p="disc"><circle class="fill" r="18"/><circle r="6"/><path d="M6,0 H18"/></g><circle class="solid" r="1.5"/></g>
        <path d="M52,86 L40,96"/><path class="fill" d="M50,86 q4,-30 -8,-54 q22,-16 36,-2 q-18,14 -22,56 z"/>
        <g data-p="notes"><text class="puff" x="58" y="24" style="font-size:14px">♪</text>
          <text class="puff" x="64" y="26" style="font-size:14px;animation-delay:1.1s">♫</text></g>
        <g data-p="sock"><path class="hatch" d="M-6,-8 h10 v10 q0,6 -8,6 h-7 q-4,-6 5,-8 z"/></g>`,
      pose(q, s) {
        turn(q("disc"), run(s, 200 * clamp(s.on)));
        move(q("sock"), 58 - 16 * s.lvl, 26 - 22 * s.lvl, `rotate(${(-40 * s.lvl).toFixed(1)})`);
        show(q("notes"), s.lvl > 0.02 ? clamp(s.on) : 0);
      } },

    // A camera on a tripod, a tray of flash powder, and the day's plates on a line.
    camera: {
      art: () => `<path class="thin" d="M0,10 Q40,18 80,8"/><path class="fill" d="M10,14 h14 v12 h-14 z M32,16 h14 v12 h-14 z"/>
        <g data-p="plate"><path class="fill" d="M56,14 h14 v12 h-14 z"/><path class="thin" d="M58,23 l4,-5 l3,3 l3,-4"/></g>
        <path d="M44,104 L26,150 M44,104 V150 M44,104 L62,150"/>
        <g data-p="bird"><path class="fill" d="M0,0 q-6,-8 -12,0 q6,6 12,0 z"/><path d="M-12,-1 l-5,1 l5,2"/><circle class="solid" cx="-8" cy="-2" r="1"/></g>
        <path class="hatch" d="M30,78 h30 v26 h-30 z"/><path class="fill" d="M30,82 l-12,-3 v24 l12,-3 z"/><path d="M60,78 q14,4 12,30"/>
        <path d="M66,78 V52 M58,52 h16"/><circle data-p="flash" class="glow" cx="66" cy="46" r="20"/>`,
      pose(q, s) {
        const f = (s.c.flash = Math.max(0, (s.c.flash ?? 0) - s.dt / 1.2));
        show(q("flash"), clamp((f - 0.75) * 4));
        move(q("bird"), 30 - 18 * Math.sin(Math.PI * clamp(1 - f)) * (f > 0 ? 1 : 0), 91);
        turn(q("plate"), sway(s.now, 8) * 12 * f, 63, 14);
      } },

    // A fan belted to the shaft: the higher its level, the faster.
    fan: {
      art: () => `${wheel(44, -24, 8, 1)}<path class="thin" d="M37,-24 L40,72 M51,-24 L48,72"/>
        <path d="M44,99 V150 M30,150 H58"/><circle class="thin" cx="44" cy="72" r="27"/>
        <g transform="translate(44,72)"><g data-p="blades"><path class="fill" d="M0,0 q-10,-14 0,-24 q10,10 0,24 z M0,0 q14,-10 24,0 q-10,10 -24,0 z M0,0 q10,14 0,24 q-10,-10 0,-24 z M0,0 q-14,10 -24,0 q10,-10 24,0 z"/></g><circle class="solid" r="3"/></g>
        <path data-p="wind" class="thin" d="M8,56 q-6,4 0,8 M4,70 q-6,4 0,8 M8,84 q-6,4 0,8"/>`,
      pose(q, s) { turn(q("blades"), run(s, 900 * clamp(s.on) * (0.25 + s.lvl))); show(q("wind"), clamp(s.on)); } },

    // A tap over a water wheel and a bucket.
    valve: {
      art: () => `<path d="M0,44 H50 v16 h10 v-6 M0,54 H44 v6"/>
        <g transform="translate(47,38)"><path d="M0,0 v6"/><g data-p="tap"><path d="M-9,0 H9" stroke-width="3"/></g></g>
        <path data-p="stream" class="run" d="M55,62 V132"/>
        <g transform="translate(42,104)"><g data-p="mill"><circle class="fill" r="12"/><path d="M-16,0 H16 M0,-16 V16 M-11,-11 L11,11 M-11,11 L11,-11"/></g><circle class="solid" r="2"/></g>
        <path d="M42,104 L30,150 M42,104 L54,150"/><path class="fill" d="M46,134 h26 l-3,16 h-20 z"/>`,
      pose(q, s) { turn(q("tap"), 90 * s.on); show(q("stream"), clamp(s.on)); turn(q("mill"), run(s, 240 * clamp(s.on))); } },

    // A clockwork sweeper that lives in a kennel.
    vacuum: {
      art: () => `<g data-p="cart"><path class="hatch" d="M-12,-16 h24 v10 h-24 z"/><circle class="fill" cx="-8" cy="-3" r="3"/><circle class="fill" cx="8" cy="-3" r="3"/>
          <path d="M-12,-11 h-6 M-18,-15 v8"/><g data-p="broom"><path d="M12,-14 L22,-2 M18,-2 h8 M19,-2 v3 M22,-2 v3 M25,-2 v3"/></g></g>
        <path class="fill" d="M0,150 v-36 q15,-16 30,0 v36 z"/><path class="solid" d="M7,150 v-22 q8,-10 16,0 v22 z"/>
        <g data-p="dust">${puffs(62, 142, 1)}</g>`,
      pose(q, s) {
        const out = clamp(s.on);
        move(q("cart"), 15 + out * (34 + 14 * sway(s.now, 1.6)), 150);
        turn(q("broom"), 9 * sway(s.now, 9) * out, 12, -14);
        show(q("dust"), out);
      } },

    // A sheep on a tether, which mows; or in its pen, which doesn't.
    lawn_mower: {
      art: () => `<path class="thin" d="M36,150 l2,-6 l2,6 M50,150 l2,-7 l2,7 M62,150 l2,-6 l2,6"/><path d="M77,150 v-8"/><path data-p="tether" class="thin"/>
        <g data-p="sheep"><path d="M-7,-8 v8 M6,-8 v8"/><path class="fill" d="M-12,-14 q-4,-8 4,-10 q2,-6 8,-3 q6,-4 9,2 q7,2 3,9 q2,6 -6,6 h-12 q-7,0 -6,-4 z"/>
          <g data-p="head"><ellipse class="solid" cx="15" cy="-17" rx="5" ry="3.5"/></g></g>
        <path d="M2,150 v-24 M12,150 v-24 M22,150 v-24 M0,132 h26 M0,142 h26"/>`,
      pose(q, s) {
        const out = clamp(s.on), x = 12 + out * (32 + 12 * sway(s.now, 0.7));
        move(q("sheep"), x, 150);
        turn(q("head"), out * (35 + 10 * sway(s.now, 6)), 10, -15);
        set(q("tether"), "d", `M77,143 L${(x + 4).toFixed(1)},136`);
      } },

    // A watering can that tips onto a hot brick, and a hair hygrometer.
    humidifier: {
      art: () => `<g transform="translate(18,30)"><circle class="fill" r="15"/><path data-p="want" class="thin" d="M0,-15 v-6"/>
          <path data-p="hair" d="M0,3 V-11" stroke-width="2"/><circle class="solid" cy="3" r="2"/></g>
        <path d="M34,92 V150 M24,150 H44"/>
        <g transform="translate(34,92)"><g data-p="can"><path class="fill" d="M-12,-10 h20 v22 h-20 z"/><path d="M8,-4 L26,-12 M-12,-6 q-10,6 0,14"/><path class="solid" d="M24,-15 l5,2 l-3,5 z"/></g></g>
        <path data-p="stream" class="run thin" d="M62,98 V126"/><path class="hatch" d="M48,128 h28 v10 h-28 z"/>${flames([62], 150)}
        <g data-p="steam">${puffs(62, 122)}</g>`,
      pose(q, s) {
        turn(q("can"), 35 * s.on);
        show(q("stream"), s.on > 0.8 ? 1 : 0); show(q("steam"), clamp(s.on));
        turn(q("hair"), (s.d.room.humidity - 50) * 2.4, 0, 3);
        turn(q("want"), (s.d.level - 50) * 2.4, 0, 3);
      } },

    // A klaxon, sounded by a mallet falling on its bulb.
    siren: {
      art: () => `<path d="M40,98 V150 M28,150 H52"/>
        <g data-p="horn"><path class="fill" d="M22,86 q10,-2 22,-6 q14,-6 26,-22 v56 q-12,-16 -26,-22 q-12,-4 -22,-6 z"/><ellipse class="hatch" cx="14" cy="86" rx="9" ry="7"/></g>
        <g transform="translate(14,36)"><g data-p="mallet"><path d="M0,0 V36" stroke-width="2.5"/><path class="fill" d="M-7,34 h14 v9 h-14 z"/></g><circle class="solid" r="2.5"/></g>
        <path data-p="noise" d="M74,46 l5,-6 M76,86 h6 M74,126 l5,6"/>`,
      pose(q, s) {
        const loud = s.on > 0.5 ? 1 : 0;
        turn(q("mallet"), -70 * (1 - s.on));
        move(q("horn"), loud * sway(s.now, 50) * 1.2, 0);
        show(q("noise"), loud * (sway(s.now, 20) > 0 ? 1 : 0.3));
      } },

    // A dog in a kennel: asleep when the alarm is not set, up and watching when it is.
    // Its bell rings as it changes.
    alarm_control_panel: {
      art: () => `<path d="M72,150 V50 H58"/><path class="thin" d="M58,68 q-8,26 -20,34"/>
        <g transform="translate(58,50)"><g data-p="bell"><path class="fill" d="M-8,16 q0,-16 8,-16 q8,0 8,16 z"/><circle class="solid" cy="18" r="2"/></g></g>
        <path class="fill" d="M4,150 V104 L26,84 L48,104 V150 z"/><path class="solid" d="M15,150 v-26 q11,-13 22,0 v26 z"/>
        <g data-p="dog"><path class="fill" d="M0,0 q-2,-14 10,-14 q14,0 14,8 q0,6 -10,6 z"/><path class="solid" d="M4,-12 l-3,-9 l8,6 z"/>
          <circle class="solid" cx="15" cy="-8" r="1.3"/><circle class="solid" cx="24" cy="-5" r="2"/></g>
        <text data-p="zz" x="42" y="122" style="font-size:11px">z z</text>`,
      pose(q, s) {
        move(q("dog"), 20 + 8 * s.on, 149 - 22 * s.on, `rotate(${(-14 * s.on).toFixed(1)})`);
        show(q("zz"), clamp(1 - s.on));
        turn(q("bell"), sway(s.now, 30) * 22 * clamp(Math.abs(s.v)));
      } },
  };
})();
