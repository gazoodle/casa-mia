// A tile of the duck run. Every tile is 260 square and keeps one rule, at its edges: a
// duck comes in at the middle of one edge as the period starts and goes out at the middle
// of another as it ends. What happens in between is the tile's own business, and no two
// tiles do the same thing.
//
// A tile is { io, device, still, live, duck(c), pose(q, c), mode(d) }:
//   io      the edges it is drawn to go in and out by, as two of L, R, T and B. The page
//           mirrors it where the route needs left and right the other way about
//   device  the id of the house's device it shows, if it shows one
//   still   what never moves, and `live` what does (two layers, as on the water pages)
//   duck    where the duck is: { x, y } and, if it wants, r (turned), sx, sy (squashed)
//           and o (0 when out of sight)
//   pose    puts its moving parts where they belong (`q` finds a part of this tile by name)
//   mode    which way the duck is to go for the device as it is (else: is it on)
// `c` is { p, on, d, dt, now }: how far through the period (0 to 1), which way the duck
// goes this period (fixed as it comes in, so that it never jumps), the device, and time.
window.Tile = (() => {
  const S = 260, made = {};

  // A way through a tile, as [p, x, y, hop]: straight from each point to the next, or
  // over a hop that high. Answers with where the duck is, which leg it is on (`i`) and
  // how far along it (`u`).
  function track(...frames) {
    return (p) => {
      let i = 0;
      while (i < frames.length - 2 && p >= frames[i + 1][0]) i++;

      const [p0, x0, y0, hop = 0] = frames[i], [p1, x1, y1] = frames[i + 1];
      const u = Kit.clamp((p - p0) / (p1 - p0));
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - hop * Math.sin(Math.PI * u), i, u };
    };
  }

  // 1 while `p` is from `a` up to `b`.
  const between = (p, a, b) => (p >= a && p < b ? 1 : 0);

  // An electric lamp hung at x, y: the glass, and the glow that is the part `name`.
  const lamp = (x, y, r, name) => ({
    still: `<path class="thin" d="M${x},${y - r - 30} V${y - r - 8}"/><rect class="brass" x="${x - 6}" y="${y - r - 8}" width="12" height="10"/>
      <circle class="glass" cx="${x}" cy="${y}" r="${r}"/><path class="thin" d="M${x - 5},${y - r} v${r - 4} l5,7 l5,-7 v${4 - r}"/>`,
    live: `<circle class="lit" data-p="${name}" cx="${x}" cy="${y}" r="${r * 1.6}"/>`,
  });

  // A device's name and what it is doing (main.js writes the second line).
  const caption = (id, x, y) => `<text data-p="cap-${id}" x="${x}" y="${y}" text-anchor="middle">${House.find(id).name}<tspan class="state" x="${x}" dy="15"></tspan></text>`;

  // Something that turns about x, y as the part `name`.
  const wheel = (x, y, name, inner) => `<g transform="translate(${x},${y})"><g data-p="${name}">${inner}</g></g>`;

  // A device that has stopped answering is still a tile the ducks must get through, or
  // everything after it would stop too. So its machine goes under a dust sheet, and a
  // tube is clamped across from the way in to the way out (`from` and `to`, as [x, y]).
  // `through(p)` is where the duck is in the tube. One drawing serves every tile. The
  // page writes the sign's second and third lines.
  function broken(d, from, to) {
    const through = (p) => { const u = 1 - p; return { x: u * u * from[0] + 2 * u * p * 130 + p * p * to[0], y: u * u * from[1] + 2 * u * p * 130 + p * p * to[1], o: 0 }; };
    const way = `M${from} Q130,130 ${to}`, half = through(0.5);
    // The sign goes in the corner the tube keeps clear of.
    const sx = half.x < 130 ? 186 : 74, sy = half.y < 130 ? 212 : 50;

    const art = `<g class="broken" data-p="out-${d.id}">
      <path class="paper" d="M14,40 q40,-26 76,-8 q44,-30 84,-2 q40,-16 72,12 l4,196 q-34,14 -60,-2 q-30,16 -58,0 q-30,14 -60,-2 q-28,12 -62,0 z"/>
      <path class="thin" d="M90,32 q-8,60 6,110 M174,30 q10,80 -8,150 M60,120 q20,60 4,116 M214,90 q-12,70 6,140"/>
      <path class="tube" d="${way}"/><path class="bore" d="${way}"/><circle class="paper" data-p="lump-${d.id}" r="17"/>
      <g data-p="sign-${d.id}"><g transform="translate(${sx},${sy}) rotate(-4)"><path d="M0,-28 V-40"/><rect class="label" x="-58" y="-28" width="116" height="56"/>
        <text text-anchor="middle" y="-8">${d.name}</text><text class="small" data-p="word-${d.id}" text-anchor="middle" y="6"></text>
        <text class="small" data-p="since-${d.id}" text-anchor="middle" y="19"></text></g></g></g>`;
    return { art, through };
  }

  return { S, made, track, between, lamp, caption, wheel, broken, add: (name, tile) => { made[name] = tile; } };
})();
