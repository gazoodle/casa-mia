// Lights that are switched together, as one machine as many tiles wide as there are
// lights: one duck turns a line shaft that runs under them all, and each light takes its
// power off the shaft through a clutch of its own. Here they are picture lights, each
// over its picture.
//
// It is one drawing, held by the first tile; the others only say where their duck is,
// which is in front of a picture, looking at it. Each tile still stands for one light,
// so a tap on it switches that light and a cover over it covers that light.
(() => {
  const { track, between, caption, wheel } = Tile, { clamp, cog, turn, show, move, toward } = Kit;
  const look = track([0, 0, 130], [0.4, 122, 130], [0.6, 122, 130], [1, 260, 130]);
  // What hangs in the frames.
  const ART = [`<path class="thin" d="M-22,22 l12,-18 l8,10 l10,-16 l14,24"/><circle class="thin" cx="14" cy="-8" r="4"/>`,
    `<ellipse class="thin" cx="0" cy="2" rx="10" ry="13"/><path class="thin" d="M-18,22 q18,-14 36,0"/>`,
    `<path class="thin" d="M-22,10 h44 M-12,10 q4,-22 12,-6 q6,-14 12,6"/>`];

  // Tiles for the lights `ds`, in the order the duck passes them. `n` chooses the drive.
  Tile.group = (ds, n) => {
    const { DRIVES, way, stroll, works, step } = Tile.parts;
    const drive = Object.values(DRIVES)[n % 3], worked = way(drive, 0.22, 0.7), idle = stroll(drive), s = works();
    const X = ds.map((_, k) => 200 + 255 * k), end = X.at(-1) + 30;
    // Each light's own clutch and dynamo.
    const own = ds.map(() => ({ gap: 1, dyn: 0, spun: 0 }));

    const unit = (d, k) => { const x = X[k]; return {
      still: `<rect class="paper" x="${x - 32}" y="44" width="64" height="48"/><rect class="thin" x="${x - 27}" y="49" width="54" height="38"/>
        <g transform="translate(${x},68)">${ART[k % ART.length]}</g><path class="brass" d="M${x - 26},30 h52 v6 h-52 z"/>
        <rect class="copper" x="${x - 14}" y="180" width="34" height="32" rx="5"/><path class="iron" d="M${x - 18},212 h42 v14 h-42 z M${x - 60},190 h8 v36 h-8 z"/>
        <path class="thin" d="M${x + 20},196 H${x + 44} V22 H${x} V30"/>`,
      live: `<g class="shine" data-p="glow${k}"><path d="M${x - 26},36 h52 l10,58 h-72 z"/></g>${cog(x - 32, 196, 9, 6, `take${k}`)}${cog(x + 3, 196, 7, 8, `dyn${k}`)}
        <g data-p="lever${k}"><path d="M${x - 20},186 V164"/><circle class="solid" cx="${x - 20}" cy="162" r="4"/></g>${caption(d.id, x, 243)}`,
    }; };
    const units = ds.map(unit);

    const first = {
      device: ds[0].id, io: "LR", wide: true, span: ds.length, mode: () => ds.some((d) => d.on),
      faults: [{ kind: "oil", at: [112, 196] }, ...X.map((x) => ({ kind: "bolt", at: [x - 56, 222] }))],
      still: `<path class="wood" d="M0,132 h44 v6 h-44 z M156,132 H${ds.length * 260} v6 H156 z"/><path d="M14,226 H${end + 20} M80,196 H${end}"/>
        <text x="92" y="30" text-anchor="middle">${ds[0].group}</text>${drive.still}${units.map((u) => u.still).join("")}`,
      live: `${cog(70, 196, 10, 6, "a")}${drive.live}${wheel(112, 196, "fly", `<circle class="iron" r="20"/><circle class="paper" r="14"/><path d="M-20,0 H20 M0,-20 V20"/>`)}
        ${units.map((u) => u.live).join("")}`,
      duck({ p, on, now: t }) { const at = (on ? worked : idle)(p); return on && at.i === drive.at ? { ...at, y: at.y - drive.hop(t) } : at; },
      pose(q, { p, on, dt, now: t }) {
        step(s, on && between(p, 0.22, 0.7) === 1, true, dt, t);
        turn(q("a"), s.spin); drive.pose(q, s); turn(q("fly"), s.flown);

        ds.forEach((d, k) => {
          const o = own[k];
          o.gap = toward(o.gap, d.on ? 0 : 1, dt * 6);
          o.dyn += ((o.gap ? 0 : s.fly) - o.dyn) * clamp(dt * 4);
          o.spun += dt * o.dyn;
          turn(q(`take${k}`), s.flown); turn(q(`dyn${k}`), o.spun); turn(q(`lever${k}`), 25 * o.gap, X[k] - 20, 186);
          show(q(`glow${k}`), d.on ? 0.3 + 0.55 * clamp(o.dyn / 700) : 0);
        });
      },
    };

    // The rest: the duck stops in front of the picture.
    const rest = ds.slice(1).map((d) => ({
      device: d.id, io: "LR",
      live: `<text data-p="hm" class="small" x="140" y="98">hm.</text>`,
      duck: ({ p }) => look(p),
      pose(q, { p }) { show(q("hm"), between(p, 0.42, 0.6)); },
    }));
    return [first, ...rest];
  };
})();
