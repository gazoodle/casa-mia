// The ceiling light's tile: in from the left, out to the right. The duck is the engine.
// It runs on a belt, the belt turns a flywheel, and the flywheel turns a dynamo through a
// clutch: the device being on is the clutch being in. The flywheel keeps what the duck
// put into it, which is why the lamp stays lit between ducks. The lamp's level is how
// long the duck is kept running.
(() => {
  const { track, between, lamp, caption, wheel, add } = Tile, { clamp, cog, turn, show, set, move, toward } = Kit;
  const bulb = lamp(130, 66, 22, "ceiling-glow");
  const stroll = track([0, 0, 130], [1, 260, 130]);
  // Running from a quarter of the way through, for up to half the period.
  const until = (d) => 0.25 + 0.5 * (d.level / 100);
  const run = (d) => track([0, 0, 130], [0.22, 118, 130], [until(d), 142, 130], [1, 260, 130]);

  // What the works are doing: the belt's angle, the flywheel's speed and angle, the
  // dynamo's speed and angle, and how far out the clutch is (0 in, 1 out).
  const now = { belt: 0, fly: 140, flown: 0, dyn: 0, spun: 0, gap: 1 };

  add("ceiling", {
    device: "k_ceiling",
    still: `<path class="wood" d="M0,132 h60 v6 h-60 z M200,132 h60 v6 h-60 z"/><path d="M74,131 H186 M74,153 H186"/>
      <!-- belt to the flywheel, its shaft and bearing, and the floor it all stands on -->
      <path class="rope" d="M176,142 L174,204 M196,142 L226,204"/><path d="M174,204 H146 M84,204 H122"/>
      <path class="iron" d="M154,196 h10 v36 h-10 z M34,222 h56 v10 h-56 z"/><path d="M14,232 H250"/>
      <rect class="copper" x="40" y="186" width="44" height="36" rx="6"/><path class="thin" d="M48,186 v36 M56,186 v36 M68,186 v36 M76,186 v36"/>
      <text class="small" x="62" y="246" text-anchor="middle">DYNAMO</text><text class="small" x="138" y="180" text-anchor="middle">CLUTCH</text>
      <!-- the wire: up the wall on insulators, along the ceiling to the lamp and the meter -->
      <path class="thin" d="M44,186 V168 H22 V14 H222 V34"/>
      <circle class="paper" cx="22" cy="150" r="3"/><circle class="paper" cx="22" cy="60" r="3"/><circle class="paper" cx="86" cy="14" r="3"/><circle class="paper" cx="178" cy="14" r="3"/>
      <circle class="paper" cx="222" cy="52" r="18"/><path class="thin" d="M210,44 l2,3 M222,38 v4 M234,44 l-2,3"/><text class="small" x="222" y="64" text-anchor="middle">VOLTS</text>
      <!-- the governor's stand, and an oil can nobody has put away -->
      <path d="M52,104 h20 M62,104 V58"/><path class="thin" d="M70,134 L64,104"/>
      <path class="brass" d="M230,232 v-12 h14 v12 z"/><path d="M244,222 l10,-8"/>${bulb.still}`,
    live: `${bulb.live}${cog(74, 142, 10, 6, "ceiling-a")}${cog(186, 142, 10, 6, "ceiling-b")}
      ${wheel(200, 204, "ceiling-fly", `<circle class="iron" r="26"/><circle class="paper" r="19"/><path d="M-26,0 H26 M0,-26 V26"/><circle class="solid" r="3"/>`)}
      <rect class="brass" x="140" y="186" width="6" height="36"/>
      <g data-p="ceiling-driven"><rect class="copper" x="134" y="186" width="6" height="36"/><path d="M134,204 H122"/></g>
      <g data-p="ceiling-lever"><path d="M130,246 V222 M130,246 L152,254"/><circle class="solid" cx="152" cy="254" r="4"/></g>
      ${cog(62, 204, 9, 8, "ceiling-dyn")}
      <path class="spark" data-p="ceiling-spark" d="M62,174 l3,6 l6,-2 l-4,5 l4,5 l-6,-2 l-3,6 l-3,-6 l-6,2 l4,-5 l-4,-5 l6,2 z"/>
      <g transform="translate(62,58)"><path data-p="ceiling-arms"/><circle class="brass" data-p="ceiling-ball0" r="5"/><circle class="brass" data-p="ceiling-ball1" r="5"/></g>
      <path data-p="ceiling-volt" d="M222,52 V38"/>${caption("k_ceiling", 70, 34)}`,

    duck({ p, on, d, now: t }) {
      if (!on) return stroll(p);
      const at = run(d)(p);
      return { ...at, y: at.y - (at.i === 1 ? Math.abs(Math.sin(t * 18)) * 5 : 0) };
    },

    pose(q, { p, on, d, dt, now: t }) {
      // The duck drives the belt and the flywheel; the flywheel is slow to gain and to lose.
      const running = on && between(p, 0.22, until(d));
      now.belt += dt * (running ? 900 : 140);
      now.fly += ((running ? 900 : 180) - now.fly) * clamp(dt * (running ? 3 : 0.5));
      now.flown += dt * now.fly;
      turn(q("ceiling-a"), now.belt); turn(q("ceiling-b"), now.belt); turn(q("ceiling-fly"), now.flown);

      // The clutch follows the device at once, and the dynamo turns only while it is in.
      now.gap = toward(now.gap, d.on ? 0 : 1, dt * 6);
      now.dyn += ((now.gap ? 0 : now.fly) - now.dyn) * clamp(dt * 4);
      now.spun += dt * now.dyn;
      move(q("ceiling-driven"), -9 * now.gap, 0); turn(q("ceiling-lever"), -22 * now.gap, 130, 246);
      turn(q("ceiling-dyn"), now.spun);
      show(q("ceiling-spark"), now.dyn > 500 && Math.sin(t * 50) > 0 ? 1 : 0);

      // The governor's balls fly out with the flywheel's speed.
      const out = (15 + 55 * clamp(now.fly / 900)) * (Math.PI / 180), side = Math.cos(now.flown / 57.3);
      const x = 26 * Math.sin(out) * side, y = 26 * Math.cos(out);
      set(q("ceiling-arms"), "d", `M0,0 L${x.toFixed(1)},${y.toFixed(1)} M0,0 L${(-x).toFixed(1)},${y.toFixed(1)}`);
      [x, -x].forEach((bx, i) => { set(q(`ceiling-ball${i}`), "cx", bx.toFixed(1)); set(q(`ceiling-ball${i}`), "cy", y.toFixed(1)); });

      const power = d.on ? clamp(now.dyn / 700) : 0;
      show(q("ceiling-glow"), d.on ? 0.3 + 0.55 * power : 0);
      turn(q("ceiling-volt"), -60 + 120 * power * (d.level / 100), 222, 52);
    },
  });
})();
