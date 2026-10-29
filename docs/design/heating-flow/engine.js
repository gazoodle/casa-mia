// Heating Flow mock-up: the drawing engine the views share. NEVER TEST THIS.
//
// A pipe is a polyline with rounded bends. Temperature sensors sit at points along it, and
// their readings are the stops of its colour gradient: colour shows temperature, and the
// moving chevrons show only flow. A reading that is not current drops out of the gradient,
// and its readout shows how long it has been missing.
'use strict';
const HF = (window.HF = {views: {}, data: {}, flows: {}, status: {}, flags: {}, opts: {}});

HF.STOPS = [[-5, '#3b47c9'], [5, '#2f86e0'], [15, '#2fbfd0'], [25, '#43c08a'], [35, '#e2c22e'], [45, '#f2902a'], [55, '#e8492f'], [65, '#b31e3d']];
HF.CIRCUIT = {brine: '#3b6fe0', pvt: '#f0a020', heat: '#e5443a', dhw: '#a652d6', hot: '#d6457f', cold: '#38b8e0', ref: '#7f8ea6'};
HF.OFF = '#9aa3b2';
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
HF.ramp = t => {
  const S = HF.STOPS;
  if (t <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (t <= S[i][0]) {
    const [a, ca] = S[i - 1], [b, cb] = S[i], f = (t - a) / (b - a), x = hex(ca), y = hex(cb);
    return '#' + x.map((v, k) => Math.round(v + (y[k] - v) * f).toString(16).padStart(2, '0')).join('');
  }
  return S[S.length - 1][1];
};

// Mixes colour a towards b by f (0..1).
HF.mix = (a, b, f) => '#' + hex(a).map((v, k) => Math.round(v + (hex(b)[k] - v) * f).toString(16).padStart(2, '0')).join('');

// The areas, left to right, as [name, x0, x1]; each view sets its own.
HF.areas = [];

let uid = 0;
HF.reset = () => { uid = 0; };
HF.id = p => p + uid++;

// A reading, or null when it is missing or not current.
HF.val = k => { const d = HF.data[k]; return d && !d.stale ? d.v : null; };
HF.fmt = d => d.v.toFixed(d.dp ?? 1) + (d.unit ?? '°');
HF.colourOf = k => { const t = HF.val(k); return t == null ? HF.OFF : HF.ramp(t); };

// ---- Geometry ----------------------------------------------------------------------------

function geometry(pts, r) {
  const segs = [];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
    segs.push({ax, ay, bx, by, L, s0: s, ux: (bx - ax) / L, uy: (by - ay) / L, k0: 0, k1: 0});
    s += L;
  }
  // Each bend is cut back by up to r on both sides and drawn as a curve.
  for (let i = 0; i < segs.length - 1; i++) segs[i].k1 = segs[i + 1].k0 = Math.min(r, segs[i].L / 2, segs[i + 1].L / 2);
  return {segs, total: s};
}

function roundPath(segs) {
  let d = `M${segs[0].ax} ${segs[0].ay}`;
  segs.forEach((g, i) => {
    d += `L${g.bx - g.ux * g.k1} ${g.by - g.uy * g.k1}`;
    if (g.k1) { const n = segs[i + 1]; d += `Q${g.bx} ${g.by} ${n.ax + n.ux * n.k0} ${n.ay + n.uy * n.k0}`; }
  });
  return d;
}

// Distance along the pipe of a point on it.
function sOf(segs, [x, y]) {
  for (const g of segs) {
    const t = (x - g.ax) * g.ux + (y - g.ay) * g.uy;
    if (t >= -0.5 && t <= g.L + 0.5 && Math.hypot(g.ax + g.ux * t - x, g.ay + g.uy * t - y) < 1) return g.s0 + t;
  }
  return 0;
}

function pointAt(segs, s) {
  for (const g of segs) if (s <= g.s0 + g.L || g === segs[segs.length - 1]) {
    const t = Math.min(Math.max(s - g.s0, 0), g.L);
    return {x: g.ax + g.ux * t, y: g.ay + g.uy * t, horiz: Math.abs(g.uy) < 1e-6};
  }
}

function tempAt(stops, s) {
  if (!stops.length) return null;
  if (s <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (s <= stops[i][0]) {
    const [s0, t0] = stops[i - 1], [s1, t1] = stops[i];
    return t0 + (t1 - t0) * (s - s0) / ((s1 - s0) || 1);
  }
  return stops[stops.length - 1][1];
}

let meter;
HF.length = d => {
  if (!meter) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0');
    meter = document.createElementNS(svg.namespaceURI, 'path');
    svg.appendChild(meter);
    document.body.appendChild(svg);
  }
  meter.setAttribute('d', d);
  return meter.getTotalLength();
};

// ---- Pipes -------------------------------------------------------------------------------

// The shared <defs>: flow markers and the parts' gradients.
HF.defs = () => `
  <path id="mk-chev" d="M-3 -4L2 0L-3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="mk-arrow" d="M-6 0H3M0 -3L3.5 0L0 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle id="mk-bub" r="2.1" fill="currentColor"/>
  <linearGradient id="panelg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--panel)"/><stop offset="1" style="stop-color:var(--panel2)"/></linearGradient>
  <linearGradient id="earthg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--earth1)"/><stop offset=".55" style="stop-color:var(--earth2)"/><stop offset="1" style="stop-color:var(--earth3)"/></linearGradient>
  <linearGradient id="cellg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a78c4"/><stop offset="1" stop-color="#1f3f7a"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

// Square ends: each end runs on by half the pipe's width, so a pipe that ends on another
// reaches its far wall (a tee) and two that meet at a corner close it.
function capped(pts, e) {
  const a = pts.slice(), n = pts.length;
  const run = ([x0, y0], [x1, y1]) => { const L = Math.hypot(x1 - x0, y1 - y0); return [x1 + (x1 - x0) / L * e, y1 + (y1 - y0) / L * e]; };
  a[0] = run(pts[1], pts[0]);
  a[n - 1] = run(pts[n - 2], pts[n - 1]);
  return a;
}

// Where along the pipe each sensor sits: a fraction (f), a point (at), or spread evenly over
// the stretch of the pipe inside an area (area), in the order they are listed.
function place(sensors, segs, total, rev) {
  const byArea = {};
  sensors.forEach(x => { if (x.area) (byArea[x.area] = byArea[x.area] || []).push(x); });
  const span = {};
  for (const name in byArea) {
    const [, x0, x1] = HF.areas.find(a => a[0] === name);
    let lo = Infinity, hi = -Infinity;
    for (let s = 0; s <= total; s += 2) { const pt = pointAt(segs, s); if (pt.x >= x0 && pt.x < x1) { lo = Math.min(lo, s); hi = Math.max(hi, s); } }
    span[name] = [lo, hi];
  }
  return sensors.map(x => {
    if (x.area) { const list = byArea[x.area], [lo, hi] = span[x.area]; return {...x, s: lo + (list.indexOf(x) + 1) * (hi - lo) / (list.length + 1)}; }
    return {...x, s: x.at ? sOf(segs, x.at) : (rev ? 1 - x.f : x.f) * total};
  });
}

// p: {pts, circ, w, r, flow, speed, rev, z, hops: [[x, y, 'h'|'v']], sensors: [{k, f | at | area, show}]}
// Returns the pipe's layers, {defs, gap, outline, fill, marks, pills}, for HF.pipes to stack.
HF.pipe = (p, bgAt) => {
  const o = HF.opts, w = p.w || 12, pts = capped(p.rev ? p.pts.slice().reverse() : p.pts, w / 2);
  const {segs, total} = geometry(pts, p.r ?? 12);
  const sens = place(p.sensors || [], segs, total, p.rev);
  const stops = sens.map(x => [x.s, HF.val(x.k)]).filter(x => x[1] != null).sort((a, b) => a[0] - b[0]);
  const flowing = !!HF.flows[p.flow];
  const col = s => {
    const t = tempAt(stops, s), c = o.scheme === 'circuit' ? HF.CIRCUIT[p.circ] : t == null ? HF.OFF : HF.ramp(t);
    return flowing ? c : HF.mix(c, '#9aa3b2', .35);   // still water keeps its colour, dimmed
  };
  const d = roundPath(segs);

  // The colour, one straight piece at a time (each its own gradient through the sensors on it),
  // and each bend in the colour at its corner.
  let defs = '', pieces = '';
  segs.forEach((g, i) => {
    const s0 = g.s0 + g.k0, s1 = g.s0 + g.L - g.k1;
    const x0 = g.ax + g.ux * g.k0, y0 = g.ay + g.uy * g.k0, x1 = g.bx - g.ux * g.k1, y1 = g.by - g.uy * g.k1;
    if (s1 > s0 + 0.1) {
      const gid = HF.id('pg'), at = [s0, ...stops.map(q => q[0]).filter(s => s > s0 && s < s1), s1];
      defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}">` +
        at.map(s => `<stop offset="${((s - s0) / (s1 - s0)).toFixed(4)}" stop-color="${col(s)}"/>`).join('') + `</linearGradient>`;
      pieces += `<path d="M${x0} ${y0}L${x1} ${y1}" style="stroke:url(#${gid})"/>`;
    }
    if (g.k1) {
      const n = segs[i + 1];
      pieces += `<path d="M${x1} ${y1}Q${g.bx} ${g.by} ${n.ax + n.ux * n.k0} ${n.ay + n.uy * n.k0}" style="stroke:${col(g.s0 + g.L)}"/>`;
    }
  });

  // Layers for the chosen style: the outline (the pipe's wall) and the fill (the water).
  const mid = col(total / 2);
  const full = (wd, stroke, extra = '') => `<path d="${d}" fill="none" stroke-width="${wd}" style="stroke:${stroke}" ${extra}/>`;
  const colour = (wd, extra = '') => `<g fill="none" stroke-width="${wd}" ${extra}>${pieces}</g>`;
  const s = o.style;
  let outline = '', fill = '';
  if (s === 'outline') { outline = full(w + 3, 'var(--edge)'); fill = full(w, mid) + colour(w); }
  if (s === 'glass') { outline = full(w + 3, mid) + colour(w + 3); fill = full(w, 'var(--panel)') + colour(w, 'opacity=".32"'); }
  if (s === 'conduit' || s === 'neon') { outline = full(w + 2, 'var(--conduit)'); fill = colour(Math.max(3, w * .42), s === 'neon' ? `style="filter:drop-shadow(0 0 3px ${mid})"` : ''); }

  // Flow: markers ride along the pipe, faster when its pump runs faster (or, with no reading,
  // faster in a narrower pipe). No flow, no markers.
  let marks = '';
  if (flowing) {
    const L = HF.length(d), n = Math.max(1, Math.round(L / 26)), v = HF.val(p.speed) != null ? 18 + HF.val(p.speed) * 0.5 : 48 * 12 / w, dur = L / v;
    const mc = s === 'glass' ? 'var(--edge)' : '#fff', sc = w < 12 ? ` transform="scale(${Math.max(.6, w / 12)})"` : '';
    for (let k = 0; k < n; k++) marks += `<use href="#mk-${o.marker}"${sc} style="color:${mc}"><animateMotion dur="${dur.toFixed(2)}s" begin="-${(dur * k / n).toFixed(2)}s" repeatCount="indefinite" rotate="auto" path="${d}"/></use>`;
  }

  // A pipe that crosses another (hops) cuts a gap in it, so it reads as passing over.
  const gap = (p.hops || []).map(([x, y, dir]) => `<path d="${dir === 'h' ? `M${x - w} ${y}H${x + w}` : `M${x} ${y - w}V${y + w}`}" stroke-width="${w + 8}" style="stroke:${bgAt(x)}"/>`).join('');
  const pills = sens.filter(x => x.show !== false).map(x => { const pt = pointAt(segs, x.s); return HF.readout(pt.x, pt.y, x.k, pt.horiz); }).join('');
  return {defs, gap, outline, fill, marks, pills};
};

// Draws pipes as one plumbed network: every outline, then every fill, so where pipes meet the
// water joins and the walls don't cross it. Pipes others tee into (z: 1) fill last. A pipe
// that crosses another (hops) goes on top, whole, with its gap cut first.
HF.pipes = (list, bgAt) => {
  const r = list.map(p => ({p, ...HF.pipe(p, bgAt)}));
  const net = r.filter(x => !x.p.hops).sort((a, b) => (a.p.z || 0) - (b.p.z || 0)), over = r.filter(x => x.p.hops);
  const body = net.map(x => x.outline).join('') + net.map(x => x.fill).join('') + net.map(x => x.marks).join('') +
    over.map(x => x.gap + x.outline + x.fill + x.marks).join('');
  return {defs: r.map(x => x.defs).join(''), body, pills: r.map(x => x.pills).join('')};
};

// A reducer where a pipe W wide meets one w wide: a short taper from (x, y) in direction dir
// (from the wide side to the narrow), its wall and water matching each pipe at its end, so the
// thin pipe looks joined rather than pushed into the fat one.
HF.reducer = (x, y, dir, W, w, colour, L = 12) => {
  const [ux, uy] = {n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0]}[dir], [px, py] = [-uy, ux];
  const quad = (a, b) => `M${x + px * a} ${y + py * a}L${x + ux * L + px * b} ${y + uy * L + py * b}L${x + ux * L - px * b} ${y + uy * L - py * b}L${x - px * a} ${y - py * a}Z`;
  return `<path d="${quad((W + 3) / 2, (w + 3) / 2)}" style="fill:var(--edge)"/><path d="${quad(W / 2, w / 2)}" fill="${colour}"/>`;
};

// ---- Readouts ----------------------------------------------------------------------------

// A reading on a pipe: a pill on it, or text beside it. One not current shows its age, always as a pill.
HF.readout = (x, y, k, horiz = true) => {
  const d = HF.data[k];
  if (!d) return '';
  const o = HF.opts, txt = d.stale ? `— ${d.stale}` : HF.fmt(d);
  const ring = d.stale ? 'var(--warn)' : (d.unit ?? '°') === '°' && o.scheme === 'temp' ? HF.ramp(d.v) : 'var(--line)';
  const tip = `<title>${d.e}${d.stale ? `: not current for ${d.stale}` : ''}</title>`;
  if (o.read === 'pill' || d.stale) {
    const w = Math.max(46, txt.length * 6.6 + 14);
    return `<g class="hit" data-e="${d.e}">${tip}<rect class="hl" x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="10" style="fill:var(--panel);stroke:${ring}" stroke-width="2"/>` +
      `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" class="${d.stale ? 'w' : 't'}">${txt}</text></g>`;
  }
  const [tx, ty, a] = horiz ? [x, y - 11, 'middle'] : [x + 11, y + 4, 'start'];
  return `<g class="hit" data-e="${d.e}">${tip}<text x="${tx}" y="${ty}" text-anchor="${a}" font-size="12" font-weight="700" class="t halo">${txt}</text></g>`;
};

// A labelled reading in a panel: label left, value right-aligned at xr.
HF.row = (x, y, label, k, xr) => {
  const d = HF.data[k];
  if (!d) return '';
  return `<g class="hit" data-e="${d.e}"><rect class="hl" x="${x - 4}" y="${y - 13}" width="${xr - x + 8}" height="18" rx="4" fill="transparent"/>` +
    `<text x="${x}" y="${y}" font-size="11.5" class="m">${label}</text>` +
    `<text x="${xr}" y="${y}" text-anchor="end" font-size="12" font-weight="700" class="${d.stale ? 'w' : 't'}">${d.stale ? '— ' + d.stale : HF.fmt(d)}</text></g>`;
};

// ---- Symbols -----------------------------------------------------------------------------

const ROT = {e: 0, s: 90, w: 180, n: 270};

// A circulation pump: the standard circle and triangle, pointing the way it pumps. Running, its
// ring turns; `warn` rings it amber (running when it shouldn't, or stopped when it should run).
HF.pump = (x, y, dir, k, label, lab, warn = false) => {
  const d = HF.data[k] || {v: 0, e: k}, on = !d.stale && d.v > 0, [lx, ly, la] = lab;
  return `<g class="hit" data-e="${d.e}"><title>${label}</title>` +
    (warn ? `<circle cx="${x}" cy="${y}" r="22" fill="none" style="stroke:var(--warn)" stroke-width="3" class="pulse"/>` : '') +
    (on ? `<circle cx="${x}" cy="${y}" r="18" fill="none" style="stroke:var(--run);transform-origin:${x}px ${y}px" stroke-width="2" stroke-dasharray="3 4" class="spin"/>` : '') +
    `<circle class="hl" cx="${x}" cy="${y}" r="14" style="fill:var(--panel);stroke:var(--edge)" stroke-width="2"/>` +
    `<path d="M-7 -11L13 0L-7 11Z" transform="translate(${x} ${y}) rotate(${ROT[dir]})" style="fill:${on ? 'var(--run)' : 'var(--off)'};stroke:var(--edge)" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<text x="${lx}" y="${ly}" text-anchor="${la}" font-size="10.5" class="m halo">${label} · ${on ? HF.fmt(d) : 'off'}</text></g>`;
};

// A valve: a triangle per port, filled where it is open; the actuator sits on the free side.
HF.valve = (x, y, dirs, open, label, k, lab) => {
  const tri = dir => `<path d="M0 0L12 -8L12 8Z" transform="translate(${x} ${y}) rotate(${ROT[dir]})" style="fill:${open.includes(dir) ? 'var(--edge)' : 'var(--panel)'};stroke:var(--edge)" stroke-width="1.6" stroke-linejoin="round"/>`;
  const free = ['n', 's', 'e', 'w'].find(q => !dirs.includes(q)), [vx, vy] = {n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0]}[free];
  return `<g class="hit" data-e="sensor.${k}"><title>${label}</title>` +
    `<path d="M${x} ${y}L${x + vx * 13} ${y + vy * 13}" style="stroke:var(--edge)" stroke-width="2"/>` +
    `<rect class="hl" x="${x + vx * 18 - 6}" y="${y + vy * 18 - 6}" width="12" height="12" rx="2" style="fill:var(--panel2);stroke:var(--edge)" stroke-width="1.6"/>` +
    dirs.map(tri).join('') +
    (lab ? `<text x="${lab[0]}" y="${lab[1]}" text-anchor="${lab[2]}" font-size="10.5" class="m halo">${label}</text>` : '') + `</g>`;
};

// A callout, as in the textbook diagrams: a box in the reading's colour, pointing at the pipe.
HF.callout = (x, y, w, title, k, note, [px, py]) => {
  const d = HF.data[k], c = HF.colourOf(k);
  return `<g class="hit" data-e="${d.e}"><path d="M${x + w / 2} ${y + 22}L${px} ${py}" style="stroke:${c}" stroke-width="2"/><circle cx="${px}" cy="${py}" r="3.5" fill="${c}"/>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="44" rx="8" fill="${c}"/>` +
    `<text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" letter-spacing=".04em">${title.toUpperCase()}</text>` +
    `<text x="${x + w / 2}" y="${y + 35}" text-anchor="middle" font-size="12" fill="#fff">${d.stale ? '—' : HF.fmt(d)} · ${note}</text></g>`;
};

// ---- Parts -------------------------------------------------------------------------------

HF.zones = (Z, h) => Z.map(([a, b, label, v]) =>
  `<rect x="${a}" y="0" width="${b - a}" height="${h}" style="fill:var(${v})"/><text x="${a + 12}" y="20" class="zl">${label}</text>`).join('') +
  Z.slice(1).map(([a]) => `<path d="M${a} 0V${h}" style="stroke:var(--line)" stroke-dasharray="2 4"/>`).join('');

HF.ground = (x, y, w, h, label) => {
  const c = HF.id('gc');
  return `<g class="hit" data-e="sensor.ground_loop"><clipPath id="${c}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath>` +
    `<g clip-path="url(#${c})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#earthg)"/><rect x="${x}" y="${y}" width="${w}" height="10" style="fill:var(--grass)"/>` +
    `<path d="M${x} ${y + h * .4}q${w * .25} -8 ${w * .5} 0t${w * .5} -3M${x} ${y + h * .72}q${w * .3} 8 ${w * .55} 0t${w * .45} 4" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/></g>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" style="stroke:var(--line)"/>` +
    `<text x="${x + w - 10}" y="${y + h - 12}" text-anchor="end" font-size="12" font-weight="700" class="lt">${label}</text></g>`;
};

HF.pvt = (x, y, w, h) => {
  const cw = (w - 12) / 2, ch = (h - 12) / 2;
  let g = `<g class="hit" data-e="sensor.pvt_output"><rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.2"/>`;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const cx = x + 4 + i * (cw + 4), cy = y + 4 + j * (ch + 4);
    g += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="3" fill="url(#cellg)"/><path d="M${cx} ${cy + ch / 2}h${cw}M${cx + cw / 2} ${cy}v${ch}" stroke="#fff" stroke-opacity=".18"/>`;
  }
  g += `<path d="M${x + 4} ${y + 4}h${w - 8}l-${w * .45} ${h - 8}h-${w * .55 - 8}z" fill="url(#sheen)"/>`;
  g += `<circle cx="${x + 10}" cy="${y - 16}" r="5" fill="#f4b400"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M${x + 10} ${y - 24.5}v-3" transform="rotate(${a} ${x + 10} ${y - 16})" stroke="#f4b400" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  return g + `<text x="${x + 24}" y="${y - 11}" font-size="12" font-weight="700" class="t">PVT panels</text></g>`;
};

// A hot water tank: insulated jacket, the water shaded through its sensors (top to bottom).
// list: [[key, fraction down the water]]. Returns {under, over}; the coil goes between.
HF.tank = (x, y, w, h, list) => {
  const i = 8, ix = x + i, iy = y + i, iw = w - 2 * i, ih = h - 2 * i, gid = HF.id('tw');
  const known = list.map(([k, f]) => [f, HF.val(k)]).filter(q => q[1] != null);
  const at = f => {
    if (!known.length) return null;
    if (f <= known[0][0]) return known[0][1];
    for (let n = 1; n < known.length; n++) if (f <= known[n][0]) { const [f0, t0] = known[n - 1], [f1, t1] = known[n]; return t0 + (t1 - t0) * (f - f0) / (f1 - f0); }
    return known[known.length - 1][1];
  };
  const stops = Array.from({length: 11}, (_, n) => { const t = at(n / 10); return `<stop offset="${n / 10}" stop-color="${t == null ? HF.OFF : HF.ramp(t)}"/>`; }).join('');
  const under = `<g class="hit" data-e="sensor.dhw_tank"><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="24" fill="url(#${gid})"/>` +
    `<rect x="${ix + 6}" y="${iy + 12}" width="8" height="${ih - 24}" rx="4" fill="#fff" opacity=".2"/></g>`;
  const over = list.map(([k, f]) => {
    const d = HF.data[k], cy = iy + f * ih;
    return `<g class="hit" data-e="${d.e}"><title>${d.e}</title><path d="M${x + w - i - 36} ${cy}l6 -4v8z" fill="#fff"/>` +
      `<text x="${x + w - i - 3}" y="${cy + 4}" text-anchor="end" font-size="11" font-weight="700" class="${d.stale ? 'w' : 'lt'}">${d.stale ? '—' : d.v.toFixed(1) + '°'}</text></g>`;
  }).join('');
  return {under, over};
};

// A radiator: columns shaded from its supply (top) to its return (bottom).
HF.radiator = (x, y, w, h, ks, kr) => {
  const gid = HF.id('rg'), n = Math.max(3, Math.floor(w / 7)), cw = w / n;
  return `<g><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + h}"><stop offset="0" stop-color="${HF.colourOf(ks)}"/><stop offset="1" stop-color="${HF.colourOf(kr)}"/></linearGradient>` +
    Array.from({length: n}, (_, j) => `<rect x="${x + j * cw}" y="${y}" width="${cw - 2}" height="${h}" rx="${(cw - 2) / 2}" fill="url(#${gid})" style="stroke:var(--edge)" stroke-width=".8"/>`).join('') + `</g>`;
};

// A heat exchanger vessel: refrigerant shaded from bottom to top, bubbling while it runs.
HF.vessel = (x, y, w, h, kTop, kBottom, name, kName, running) => {
  const gid = HF.id('vg'), d = HF.data[kName];
  let g = `<g class="hit" data-e="${d.e}"><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${HF.colourOf(kTop)}" stop-opacity=".75"/><stop offset="1" stop-color="${HF.colourOf(kBottom)}" stop-opacity=".75"/></linearGradient>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="url(#${gid})" style="stroke:var(--edge)" stroke-width="2"/>`;
  if (running) for (let j = 0; j < 9; j++) g += `<circle cx="${x + 14 + (j * 37) % (w - 28)}" cy="${y + h - 14}" r="${2 + j % 3}" fill="#fff" opacity=".7" class="rise" style="animation-delay:-${(j * .41).toFixed(2)}s"/>`;
  return g + `<text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="700" class="lt">${name}</text>` +
    `<text x="${x + w / 2}" y="${y + 37}" text-anchor="middle" font-size="12" class="lt">${d.stale ? '—' : HF.fmt(d)}</text></g>`;
};

// The compressor: an impeller turning at a speed that follows its frequency.
HF.compressor = (x, y, r, k) => {
  const d = HF.data[k], on = d.v > 0, blades = Array.from({length: 7}, (_, j) =>
    `<path d="M${x} ${y}q${r * .25} ${-r * .45} ${r * .12} ${-r * .72}" transform="rotate(${j * 360 / 7} ${x} ${y})" fill="none" style="stroke:var(--edge)" stroke-width="3" stroke-linecap="round"/>`).join('');
  return `<g class="hit" data-e="${d.e}"><circle class="hl" cx="${x}" cy="${y}" r="${r}" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="2.5"/>` +
    `<g class="${on ? 'spin' : ''}" style="transform-origin:${x}px ${y}px;--sd:${on ? (60 / d.v).toFixed(2) : 0}s">${blades}</g>` +
    `<circle cx="${x}" cy="${y}" r="${r * .16}" style="fill:var(--edge)"/></g>`;
};

// Taps and showers: the house's hot water, dripping while it is drawn.
HF.taps = (x, y, w, h, drawing) => {
  const drops = (cx, cy, n) => Array.from({length: n}, (_, j) => `<circle cx="${cx + (j % 3 - 1) * 5}" cy="${cy}" r="2" fill="${HF.CIRCUIT.cold}" class="${drawing ? 'drip' : ''}" style="animation-delay:-${(j * .23).toFixed(2)}s" opacity="${drawing ? 1 : .3}"/>`).join('');
  return `<g class="hit" data-e="sensor.dhw_flow"><rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#panelg)" style="stroke:var(--line)"/>` +
    `<text x="${x + 14}" y="${y + 46}" font-size="12" font-weight="700" class="t">Taps &amp; showers</text>` +
    `<path d="M${x + 30} ${y + 66}h20a8 8 0 0 1 8 8v4M${x + 38} ${y + 66}v-7m-5 0h10" fill="none" style="stroke:var(--edge)" stroke-width="4" stroke-linecap="round"/>${drops(x + 58, y + 86, 3)}` +
    `<path d="M${x + 120} ${y + 56}v8h10M${x + 122} ${y + 72}a12 6 0 0 1 24 0z" fill="none" style="stroke:var(--edge);fill:var(--panel2)" stroke-width="3" stroke-linejoin="round"/>${drops(x + 134, y + 84, 6)}` +
    `</g>` + HF.row(x + 14, y + h - 12, 'Flow', 'dhw_flow', x + w - 14);
};
