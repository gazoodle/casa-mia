// The tiles that show a device of the Kitchen. Each handles the duck one way while its
// device is on and another while it is off, so what the house is doing is read from what
// happens to the ducks. What can be read at a glance (a glow, a fire) follows the device
// at once; the duck's way changes with the next duck in.
(() => {
  const { track, between, lamp, caption, add } = Tile, { clamp, move, turn, show, set, toward } = Kit;

  // ---- The kettle: in from the left, out below. On, the duck jumps in and is whistled
  // out again; off, it steps off the ledge into the funnel.
  {
    const boil = track([0, 0, 130], [0.2, 58, 130, 62], [0.4, 204, 116], [0.62, 204, 116, 70], [0.82, 130, 168], [1, 130, 260]);
    const cold = track([0, 0, 130], [0.2, 58, 130, 26], [0.5, 130, 168], [0.65, 130, 168], [1, 130, 260]);
    add("kettle", {
      device: "k_kettle",
      still: `<path class="wood" d="M0,132 h64 v6 h-64 z"/><path class="brass" d="M100,170 H160 L140,206 V260 H120 V206 z"/>
        <path class="iron" d="M168,208 h76 v8 h-76 z"/><path class="thin" d="M176,216 V250 M236,216 V250"/>`,
      live: `<path class="flame flick" data-p="kettle-fire" d="M184,206 q6,-16 10,0 q6,-18 10,0 q6,-16 10,0 z"/>
        <g data-p="kettle-pot"><path class="copper" d="M174,188 V140 q0,-18 30,-18 q30,0 30,18 V188 z"/><path d="M234,150 l16,-12 M186,123 q18,-24 36,0"/></g>
        <g data-p="kettle-steam"><circle class="thin puff" cx="252" cy="132" r="5"/><circle class="thin puff" cx="252" cy="132" r="5" style="animation-delay:-1.2s"/></g>
        <text data-p="kettle-whee" x="150" y="84">wheeee</text>${caption("k_kettle", 56, 190)}`,
      duck({ p, on }) {
        const at = (on ? boil : cold)(p);
        return on ? { ...at, o: at.i === 2 ? 0 : 1, r: at.i === 3 ? at.u * 540 : 0 } : at;
      },
      pose(q, { p, on, d, now }) {
        const inside = on && between(p, 0.4, 0.62);
        show(q("kettle-fire"), d.on ? 1 : 0); show(q("kettle-steam"), d.on ? 1 : 0); show(q("kettle-whee"), inside ? 1 : 0);
        turn(q("kettle-pot"), inside ? Math.sin(now * 45) * 3 : 0, 204, 188);
      },
    });
  }

  // ---- The boiler: in from above, out to the left. Heating, the duck is blown out on a
  // jet of steam; cold, it climbs out and goes down the slide.
  {
    const hot = track([0, 130, 0], [0.2, 130, 92], [0.5, 130, 92, 100], [0.8, 38, 130], [1, 0, 130]);
    const cold = track([0, 130, 0], [0.2, 130, 92], [0.45, 130, 92, 10], [0.65, 84, 66], [0.9, 10, 126], [1, 0, 130]);
    add("boiler", {
      device: "k_boiler",
      still: `<path class="copper" d="M80,66 V204 H180 V66"/><path d="M80,204 v10 M180,204 v10 M180,110 h8"/>
        <path class="thin" d="M78,68 L6,128"/><path class="wood" d="M0,132 h56 v6 h-56 z"/><circle class="paper" cx="204" cy="110" r="16"/>`,
      live: `<rect class="pool" x="82" y="94" width="96" height="108"/>
        <path class="flame flick" data-p="boiler-fire" d="M96,234 q8,-20 14,0 q8,-22 14,0 q8,-20 14,0 q8,-22 14,0 z"/>
        <g data-p="boiler-bub"><circle class="thin puff" cx="106" cy="182" r="4"/><circle class="thin puff" cx="150" cy="186" r="4" style="animation-delay:-1s"/></g>
        <path class="stream" data-p="boiler-jet" d="M130,92 V36"/>
        <path data-p="boiler-needle" d="M204,110 V98"/><text data-p="boiler-temp" x="204" y="146" text-anchor="middle"></text>${caption("k_boiler", 216, 190)}`,
      duck({ p, on, now }) {
        const at = (on ? hot : cold)(p);
        return { ...at, y: at.y + (at.i === 1 ? Math.sin(now * 6) * 2 : 0), r: on && at.i === 2 ? -at.u * 360 : 0 };
      },
      pose(q, { p, on, d }) {
        show(q("boiler-fire"), d.on ? 1 : 0); show(q("boiler-bub"), d.on ? 1 : 0); show(q("boiler-jet"), on ? between(p, 0.5, 0.62) : 0);
        turn(q("boiler-needle"), (d.temp - 50) * 4, 204, 110);
        q("boiler-temp").textContent = `${d.temp}°`;
      },
    });
  }

  // ---- The blind: in from below, out to the left, past the window. Open, the duck
  // walks under it; closed, it bumps its beak and then pushes through.
  {
    const open = track([0, 130, 260], [0.28, 130, 100], [0.4, 104, 130], [1, 0, 130]);
    const shut = track([0, 130, 260], [0.28, 130, 100], [0.4, 104, 130], [0.6, 70, 130], [0.68, 84, 130, 8], [0.8, 66, 130], [1, 0, 130]);
    let foot = 130;
    add("blind", {
      device: "k_blind",
      mode: (d) => d.on && d.level >= 35,
      still: `<path class="wood" d="M0,132 h112 v6 h-112 z M150,132 h70 v6 h-70 z"/>
        <rect class="glass" x="22" y="34" width="56" height="96"/><path class="thin" d="M50,34 V130 M22,82 H78"/><circle class="brass" cx="50" cy="32" r="8"/>`,
      live: `<g data-p="blind-flap"><rect class="cloth" data-p="blind-cloth" x="24" y="36" width="52" height="94"/></g>${caption("k_blind", 192, 176)}`,
      duck: ({ p, on }) => (on ? open : shut)(p),
      pose(q, { p, on, d, dt }) {
        foot = toward(foot, d.on ? 130 - 0.9 * d.level : 130, dt * 90);
        set(q("blind-cloth"), "height", (foot - 36).toFixed(1));
        turn(q("blind-flap"), on ? 0 : -50 * Math.sin(Math.PI * clamp((p - 0.78) / 0.17)), 50, 36);
      },
    });
  }

  // ---- The counter light: in from above, out to the left. The duck lands on one end of
  // a seesaw, and what is on the other end goes up and strikes the lamp.
  {
    const way = track([0, 130, 0], [0.25, 134, 158, 46], [0.7, 24, 130], [1, 0, 130]);
    const bulb = lamp(42, 44, 18, "counter-glow");
    add("counter", {
      device: "k_counter",
      still: `<path class="iron" d="M92,158 l-12,26 h24 z"/><path d="M30,184 h130"/><path class="wood" d="M0,132 h30 v6 h-30 z"/>${bulb.still}`,
      live: `${bulb.live}<g data-p="counter-plank"><path class="wood" d="M-52,-3 h104 v6 h-104 z"/></g>
        <circle class="iron" data-p="counter-weight" cx="42" r="8"/>
        <path class="spark" data-p="counter-spark" d="M42,62 l4,8 l8,-2 l-6,6 l6,6 l-8,-2 l-4,8 l-4,-8 l-8,2 l6,-6 l-6,-6 l8,2 z"/>
        <text data-p="counter-clonk" class="small" x="62" y="76">clonk</text>${caption("k_counter", 196, 216)}`,
      duck: ({ p }) => way(p),
      pose(q, { p, d }) {
        const tip = p < 0.25 ? -10 : p < 0.33 ? -10 + 250 * (p - 0.25) : p < 0.8 ? 10 : 10 - 100 * (p - 0.8);
        move(q("counter-plank"), 92, 154, `rotate(${tip.toFixed(1)})`);
        set(q("counter-weight"), "cy", (154 - 86 * Math.sin(Math.PI * clamp((p - 0.3) / 0.32))).toFixed(1));

        const struck = between(p, 0.43, 0.56);
        show(q("counter-spark"), d.on ? struck : 0); show(q("counter-clonk"), d.on ? 0 : struck);
        show(q("counter-glow"), d.on ? 0.4 + 0.45 * between(p, 0.43, 0.7) : 0);
      },
    });
  }
})();
