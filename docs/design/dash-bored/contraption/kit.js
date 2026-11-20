// Contraption's kit: what every part of the machine is drawn and moved with.
window.Kit = (() => {
  // The same choice every time for the same device, so a house's machine is the same
  // machine on every visit.
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const pick = (id, list) => list[hash(id) % list.length];

  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const ease = (x) => x * x * (3 - 2 * x);
  // How far through one part of a run: 0 before `from`, 1 after `to`.
  const phase = (p, from, to) => clamp((p - from) / (to - from));

  // A soft spring towards `target`, so things overshoot and settle as if on a rope.
  // `s` is { x, v }.
  function spring(s, target, dt, k = 70, c = 9) {
    s.v += ((target - s.x) * k - s.v * c) * dt;
    s.x += s.v * dt;
    if (Math.abs(target - s.x) < 0.001 && Math.abs(s.v) < 0.001) { s.x = target; s.v = 0; }
    return s.x;
  }

  // A wheel turned by the line shaft, at `ratio` times its speed (machine.js turns
  // everything marked data-shaft).
  const wheel = (x, y, r, ratio = 1) => `<g transform="translate(${x},${y})"><g data-shaft="${ratio}">
    <circle class="fill" r="${r}"/><path d="M${-r},0 H${r} M0,${-r} V${r}"/></g><circle class="solid" r="2"/></g>`;

  // A cog of `n` teeth, turned as the part `name`.
  function cog(x, y, r, n, name) {
    let teeth = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
      teeth += `M${(c * r).toFixed(1)},${(s * r).toFixed(1)} L${(c * (r + 3.5)).toFixed(1)},${(s * (r + 3.5)).toFixed(1)} `;
    }
    return `<g transform="translate(${x},${y})"><g data-p="${name}"><circle class="fill" r="${r}"/>
      <path d="${teeth}M0,0 L${r - 3},0"/></g><circle class="solid" r="1.8"/></g>`;
  }

  // Towards `to` at a steady rate, `step` at a time.
  const toward = (x, to, step) => (x < to ? Math.min(to, x + step) : Math.max(to, x - step));

  // A lazy-tongs (scissor) arm `len` long along x, of `n` crossings whose bars are `arm`
  // long: it gets wider as it closes, as a real one does.
  function scissor(len, n, arm) {
    const seg = len / n, w = Math.sqrt(Math.max(0, arm * arm - seg * seg)) / 2;
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = (i * seg).toFixed(1), b = ((i + 1) * seg).toFixed(1), u = w.toFixed(1);
      d += `M${a},-${u} L${b},${u} M${a},${u} L${b},-${u} `;
    }
    return d;
  }

  // A loop of chain round two sprockets of radius `r`, one above the other at `x`. `at(s)`
  // is where a point `s` px round it is, going up the left side first, and how far a
  // bucket hung there has turned over.
  function chain(x, r, top, bot) {
    const side = bot - top, half = Math.PI * r, loop = 2 * side + 2 * half;
    const mod = (s) => ((s % loop) + loop) % loop;

    function at(s) {
      s = mod(s);
      if (s < side) return { x: x - r, y: bot - s, a: 0 };
      s -= side;
      if (s < half) return { x: x - r * Math.cos(s / r), y: top - r * Math.sin(s / r), a: (s / r) * 57.3 };
      s -= half;
      if (s < side) return { x: x + r, y: top + s, a: 180 };
      s -= side;
      return { x: x + r * Math.cos(s / r), y: bot + r * Math.sin(s / r), a: 180 + (s / r) * 57.3 };
    }

    return { side, half, loop, mod, at };
  }

  const set = (el, name, value) => el.setAttribute(name, value);
  const move = (el, x, y, more = "") => el.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) ${more}`);
  const turn = (el, deg, cx = 0, cy = 0) => el.setAttribute("transform", `rotate(${deg.toFixed(1)} ${cx} ${cy})`);
  const show = (el, opacity) => { el.style.opacity = opacity; };

  return { hash, pick, clamp, ease, phase, spring, toward, scissor, chain, wheel, cog, set, move, turn, show };
})();
