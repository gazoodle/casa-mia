// The tiles that show no device: they only get a duck from one edge to another, each in
// its own way. Drawn for the Kitchen, so they are kitchen things.
(() => {
  const { track, between, add } = Tile, { clamp, cog, move, turn, show, set } = Kit;

  // ---- The toaster: in from below, out to the right. The duck is toasted and popped.
  {
    const way = track([0, 130, 260], [0.35, 130, 150, 95], [0.75, 218, 130], [1, 260, 130]);
    add("toaster", {
      still: `<path class="thin" d="M118,236 V260 M142,236 V260"/>
        <rect class="iron" x="82" y="150" width="96" height="86" rx="12"/><path d="M98,150 h64 M96,236 v8 M164,236 v8"/>
        <text x="130" y="200" text-anchor="middle">TOAST</text>
        <path class="wood" d="M196,132 h64 v7 h-64 z"/><path class="thin" d="M202,139 l-12,38 V139"/>`,
      live: `<path class="flame bare" data-p="toast-glow" d="M100,145 h60 v5 h-60 z"/>
        <g data-p="toast-lever"><path d="M178,0 h8"/><rect class="brass" x="186" y="-5" width="12" height="10" rx="2"/></g>
        <text data-p="toast-pop" x="152" y="104">pop!</text>`,
      duck({ p }) { const at = way(p); return { ...at, o: p < 0.35 ? 0 : 1, r: at.i === 1 ? at.u * 360 : 0 }; },
      pose(q, { p }) {
        move(q("toast-lever"), 0, p < 0.3 ? 168 + 146 * p : p < 0.35 ? 212 : 168);
        show(q("toast-glow"), between(p, 0, 0.35) * clamp(p / 0.3));
        show(q("toast-pop"), between(p, 0.35, 0.55));
      },
    });
  }

  // ---- The mangle: in from the left, out to the right, flat, and springing back.
  add("mangle", {
    still: `<path class="wood" d="M84,40 h12 v170 h-12 z M164,40 h12 v170 h-12 z M70,210 h120 v10 h-120 z"/>
      <path class="wood" d="M0,132 h84 v6 h-84 z M176,132 h84 v6 h-84 z"/>`,
    live: `${cog(130, 98, 28, 10, "mangle-a")}${cog(130, 160, 28, 10, "mangle-b")}`,
    duck({ p }) {
      const back = clamp((p - 0.62) / 0.25);
      const sy = p < 0.62 ? 1 - 0.75 * clamp((p - 0.38) / 0.12) : 1 - 0.75 * (1 - back) * Math.cos(back * 10);
      return { x: 260 * p, y: 130, sy, sx: 1 + (1 - sy) * 0.8 };
    },
    pose(q, { p }) { turn(q("mangle-a"), p * 360); turn(q("mangle-b"), -p * 360); },
  });

  // ---- The cutlery: in from above, out below, from spoon to spoon.
  {
    const way = track([0, 130, 0], [0.2, 92, 62, 14], [0.4, 168, 112, 14], [0.6, 92, 164, 14], [0.8, 168, 214, 14], [1, 130, 260]);
    const spoon = (x, y, left) => `<g transform="translate(${x},${y}) ${left ? "scale(-1,1)" : ""} rotate(-8)"><path d="M10,0 H62"/><ellipse class="iron" rx="15" ry="7"/></g>`;
    add("pegs", {
      still: `<path class="thin" d="M30,40 V200 M230,90 V245"/>${spoon(92, 69, true)}${spoon(168, 119)}${spoon(92, 171, true)}${spoon(168, 221)}`,
      live: `<text data-p="pegs-ting" class="small">ting!</text>`,
      duck({ p }) { const at = way(p); return { ...at, r: (at.i % 2 ? 25 : -25) * Math.sin(Math.PI * at.u) }; },
      pose(q, { p }) {
        const at = way(p), struck = at.i > 0 && at.u < 0.35;
        show(q("pegs-ting"), struck ? 1 : 0);
        if (struck) move(q("pegs-ting"), at.x + (at.i % 2 ? -44 : 20), at.y - 22);
      },
    });
  }

  // ---- The bottle: in from the right, out through the ceiling on the cork.
  {
    const way = track([0, 260, 130], [0.3, 150, 130, 10], [0.38, 130, 120], [0.6, 130, 120], [1, 130, 0]);
    add("cork", {
      still: `<path class="wood" d="M150,132 h110 v7 h-110 z M86,250 h88 v7 h-88 z"/><path class="thin" d="M158,139 l-10,30 V139"/>`,
      live: `<g data-p="cork-bottle"><path class="glass" d="M112,250 V172 q0,-14 10,-22 V132 h16 v18 q10,8 10,22 V250 z"/>
          <rect class="paper" x="114" y="190" width="32" height="30"/><text class="small" x="130" y="208" text-anchor="middle">FIZZ</text></g>
        <g data-p="cork-cork"><rect class="brass" x="-7" y="-10" width="14" height="12" rx="2"/></g>
        <text data-p="cork-pop" x="150" y="96">POP</text>`,
      duck({ p, now }) { const at = way(p); return { ...at, x: at.x + (at.i === 2 ? Math.sin(now * 40) * 1.5 : 0) }; },
      pose(q, { p, now }) {
        // The cork goes up under the duck, runs out of puff and falls back in.
        const y = p < 0.6 ? 132 : p < 0.8 ? 132 - (p - 0.6) * 450 : 42 + (p - 0.8) * 450;
        move(q("cork-cork"), 130, y);
        turn(q("cork-bottle"), between(p, 0.38, 0.6) * Math.sin(now * 40) * 1.5, 130, 250);
        show(q("cork-pop"), between(p, 0.6, 0.8));
      },
    });
  }

  // ---- The plughole: in from the right, out below, round and round on the way.
  {
    const way = track([0, 260, 130], [0.2, 212, 130]);
    add("plug", {
      still: `<path class="wood" d="M222,132 h38 v6 h-38 z"/>
        <path class="glass" d="M40,136 H220 L138,214 V260 H122 V214 z"/>
        <ellipse class="thin" cx="130" cy="152" rx="66" ry="6"/><ellipse class="thin" cx="130" cy="176" rx="40" ry="4"/><ellipse class="thin" cx="130" cy="198" rx="17" ry="3"/>
        <path d="M130,0 V22 M112,22 h36"/><path class="brass" d="M120,22 h20 v20 h-20 z"/>`,
      live: `<circle class="drop" data-p="plug-drip" cx="130" r="3"/><text data-p="plug-glug" x="150" y="240">glug</text>`,
      duck({ p }) {
        if (p < 0.2) return way(p);
        if (p >= 0.85) return { x: 130, y: 212 + ((p - 0.85) / 0.15) * 48, r: p * 2000 };
        const u = (p - 0.2) / 0.65, round = 82 * (1 - u) ** 0.8;
        return { x: 130 + round * Math.cos(u * 5 * Math.PI), y: 138 + 74 * u };
      },
      pose(q, { p }) { set(q("plug-drip"), "cy", 46 + ((p * 3) % 1) * 88); show(q("plug-glug"), between(p, 0.85, 1)); },
    });
  }

  // ---- The dumb waiter, two tiles tall: in from the right at the bottom, out through
  // the top. Its drawing belongs to the upper tile; the lower one only says where its
  // duck is. A board passes the ledge half-way through each period.
  {
    const ledge = track([0, 260, 130], [0.45, 136, 130], [0.5, 130, 130], [1, 130, 0]);
    const board = (k) => `<g data-p="waiter-${k}"><path class="wood" d="M-34,0 h68 v6 h-68 z"/><path class="rope" d="M-30,0 L0,-36 L30,0"/></g>`;
    const ties = [65, 130, 195, 260, 325, 390, 455].map((y) => `M92,${y} h76`).join(" ");
    add("waiter", {
      still: `<path d="M92,0 V520 M168,0 V520"/><path class="thin" d="${ties}"/>
        <path class="wood" d="M168,392 h92 v7 h-92 z"/><path class="thin" d="M250,399 l-12,36 V399"/>
        <text x="60" y="260" transform="rotate(-90 60 260)" text-anchor="middle">DUMB WAITER</text>`,
      live: `<path class="rope run" d="M130,0 V520"/>${board(0)}${board(1)}`,
      duck: ({ p }) => ({ x: 130, y: 260 - 260 * p }),
      pose(q, { p }) { for (const k of [0, 1]) move(q(`waiter-${k}`), 130, 520 - 260 * (p + k)); },
    });
    add("waiterLow", { duck: ({ p }) => ledge(p) });
  }
})();
