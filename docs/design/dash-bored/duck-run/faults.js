// A machine like this is bound to work loose. Every so often something small goes wrong
// in a tile: a bearing squeaks for oil, a bolt rattles, a cord frays. None of it stops a
// duck (a device that has really failed gets the dust sheet, tile.js). The unicycle bot
// (waterworks/bot.js) is asked to see to each one. A frayed cord is mended with a knot,
// and the knot goes round with the cord from then on.
//
// A tile says where it can go wrong, as `faults`: { kind: "oil" | "bolt", at: [x, y] },
// or { kind: "cord", loop: [[x, y], ...], run(t) } where `loop` is the way the cord goes
// round and `run` is how far it has gone, in px, `t` seconds into the page.
window.Faults = (() => {
  const { hash, move, set, turn } = Kit;
  // What is not wrong is not drawn at all. Hidden by opacity, each of these was still
  // composited on every frame: measured in WebKit on 2026-11-18, 46 frames a second for
  // the Long Gallery in the engraving skin against 61 without them.
  const show = (el, on) => { el.style.display = on ? "" : "none"; };
  const spots = [], MOST = 3; // how many things may be wrong at once
  let q = null, wait = 4, broken = 0, t = 0;

  // What is drawn while a thing is wrong. The origin is the place itself.
  const ART = {
    oil: (i) => `<g class="jitter"><path class="thin" d="M8,-8 q6,-4 4,-12 M14,-4 q10,-6 8,-18"/></g><text class="small" x="18" y="-24">eek eek</text>
      <circle class="drop" data-p="drip${i}" r="2.5" style="display:none"/>`,
    bolt: (i) => `<g data-p="bolt${i}"><path class="brass" d="M-6,0 l3,-5.2 h6 l3,5.2 l-3,5.2 h-6 z"/><path d="M-3,0 H3"/></g><text class="small" x="10" y="-10">rattle</text>`,
    cord: () => `<g class="jitter"><path class="thin" d="M0,0 q6,-10 2,-18 M0,0 q-8,-6 -12,-16"/></g><text class="small" x="8" y="-22">twang</text>`,
  };
  const KNOT = (i) => `<g data-p="knot${i}" style="display:none"><circle class="solid" r="3.5"/><path class="thin" d="M0,0 l5,-6 M0,0 l-6,-4"/></g>`;

  // The drawing for every place in `cells` that can go wrong, in the sheet's own space
  // (a mirrored tile's places are mirrored with it). `S` is a tile's size.
  function art(cells, S) {
    for (const c of cells) for (const f of c.tile.faults ?? []) {
      const on = ([x, y]) => [c.x + (c.flip ? S - x : x), c.y + y], loop = f.loop?.map(on), [x, y] = loop ? loop[0] : on(f.at);
      spots.push({ ...f, cell: c, x, y, loop, floor: c.y + S - 4, state: "sound" });
    }
    return spots.map((s, i) => `<g data-p="fault${i}" transform="translate(${s.x},${s.y})" style="display:none">${ART[s.kind](i)}</g>${s.loop ? KNOT(i) : ""}`).join("");
  }

  // Where a point `far` px round a loop is.
  function round(loop, far) {
    const legs = loop.map((a, i) => { const b = loop[(i + 1) % loop.length]; return { a, b, long: Math.hypot(b[0] - a[0], b[1] - a[1]) }; });
    far = ((far % legs.reduce((sum, l) => sum + l.long, 0)) + 1e6) % legs.reduce((sum, l) => sum + l.long, 0);
    for (const { a, b, long } of legs) {
      if (far <= long) return [a[0] + ((b[0] - a[0]) * far) / long, a[1] + ((b[1] - a[1]) * far) / long];
      far -= long;
    }
    return loop[0];
  }

  // Something goes wrong at `s`, and the bot is asked to come. It reaches up from the
  // row's floor on its tongs, so its arm is 40 above its wheel before it rises.
  function fail(s) {
    const i = spots.indexOf(s);
    s.state = "wrong"; broken++;
    show(q(`fault${i}`), 1);

    Bot.ask({
      x: s.x - 18, face: 1, floor: s.floor, rise: Math.max(0, s.floor - 40 - s.y),
      start() { s.state = "mending"; },
      work(p) {
        if (s.kind === "bolt") turn(q(`bolt${i}`), p * 1080);
        if (s.kind === "oil") { show(q(`drip${i}`), 1); set(q(`drip${i}`), "cy", (-26 + ((p * 5) % 1) * 26).toFixed(1)); }
      },
      done() {
        show(q(`fault${i}`), 0); broken--;
        if (s.kind === "oil") show(q(`drip${i}`), 0);
        // Oil and bolts can go again. A cord keeps its knot, and is not mended twice.
        s.state = s.loop ? "knotted" : "sound";
        if (s.loop) show(q(`knot${i}`), 1);
      },
    });
  }

  function tick(find, dt, now) {
    q = find; t += dt;

    if ((wait -= dt) < 0) {
      // Only where it can be seen: the joke needs someone to see it.
      const sound = spots.filter((s) => s.state === "sound" && !s.cell.away && s.cell.seen);
      wait = 5 + (hash(`wait${now | 0}`) % 8);
      if (sound.length && broken < MOST) fail(sound[hash(`fault${now | 0}`) % sound.length]);
    }

    spots.forEach((s, i) => {
      if (s.state === "wrong" && s.kind === "bolt") turn(q(`bolt${i}`), Math.sin(now * 30) * 25);
      if (s.state === "knotted") move(q(`knot${i}`), ...round(s.loop, s.run(t)));
    });
  }

  return { art, tick };
})();
