// Heating Flow mock-up: the water parts: mains, softener, storage tank and the outlets in
// the house. NEVER TEST THIS.
'use strict';

// The mains stopcock, where the water enters the plant room.
HF.stopcock = (x, y) =>
  `<g class="hit" data-e="sensor.mains_flow"><title>Mains in</title>` +
  `<circle class="hl" cx="${x}" cy="${y}" r="9" style="fill:var(--panel);stroke:var(--edge)" stroke-width="2"/>` +
  `<path d="M${x - 5} ${y - 5}L${x + 5} ${y + 5}" style="stroke:var(--edge)" stroke-width="2.5" stroke-linecap="round"/>` +
  `<text x="${x - 8}" y="${y + 24}" font-size="11" font-weight="700" class="t halo">Mains in</text></g>`;

// The softener: a resin column beside a salt cabinet, its salt shown as a level. When it
// needs topping up, the cabinet is ringed amber and says so.
HF.softener = (x, y, w, h) => {
  const salt = HF.data.salt, low = HF.data.salt_low.v, lvl = Math.max(0, Math.min(1, salt.v / 100));
  const cx = x + 26, cw = w - 30, sy = y + 22, sh = h - 30;
  return `<g class="hit" data-e="${salt.e}"><title>Softener: salt ${HF.fmt(salt)}${low ? ', needs topping up' : ''}</title>` +
    (low ? `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="12" fill="none" style="stroke:var(--warn)" stroke-width="3" class="pulse"/>` : '') +
    `<rect class="hl" x="${x}" y="${y + 10}" width="20" height="${h - 10}" rx="10" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
    `<rect x="${cx}" y="${y}" width="${cw}" height="${h}" rx="8" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
    `<rect x="${cx + 6}" y="${sy}" width="${cw - 12}" height="${sh}" rx="4" style="fill:var(--panel2);stroke:var(--line)"/>` +
    `<rect x="${cx + 6}" y="${sy + sh * (1 - lvl)}" width="${cw - 12}" height="${sh * lvl}" rx="4" fill="${low ? 'var(--warn)' : '#e8e2d4'}" style="stroke:var(--line)"/>` +
    `<text x="${cx + cw / 2}" y="${y + 15}" text-anchor="middle" font-size="10.5" font-weight="700" class="t">${salt.v}%</text>` +
    `<text x="${x + w / 2}" y="${y - 8}" text-anchor="middle" font-size="11" font-weight="700" class="${low ? 'w' : 't'} halo">${low ? 'Top up salt' : 'Softener'}</text></g>`;
};

// The storage tank: a tall vessel of soft water. With no level sensor its water is drawn
// without a level; while the inlet solenoid is open it says "Filling" and the inlet pours.
HF.storage = (x, y, w, h, filling) => {
  const c = HF.CIRCUIT.cold;
  let g = `<g class="hit" data-e="binary_sensor.storage_inlet"><title>Storage tank${filling ? ': filling' : ''}; no level sensor</title>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.4}" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.8"/>` +
    `<rect x="${x + 7}" y="${y + 30}" width="${w - 14}" height="${h - 37}" rx="${w / 3}" fill="${c}" opacity=".22"/>` +
    `<text x="${x + w / 2}" y="${y + 52}" text-anchor="middle" font-size="11" font-weight="700" class="t">Storage</text>` +
    `<text x="${x + w / 2}" y="${y + 67}" text-anchor="middle" font-size="10.5" class="m">level: no sensor</text>`;
  if (filling) {
    g += Array.from({length: 5}, (_, j) => `<circle cx="${x + w * .33 + (j % 2) * 4}" cy="${y + 14}" r="2" fill="${c}" class="drip" style="animation-delay:-${(j * .14).toFixed(2)}s"/>`).join('');
    g += `<rect x="${x + w / 2 - 28}" y="${y + 76}" width="56" height="18" rx="9" fill="${c}"/><text x="${x + w / 2}" y="${y + 89}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">Filling</text>`;
  }
  return g + `</g>`;
};

// The outlets in the house, one row per kind of water, each animating while it is in use.
// rows: [{y, label, icon: 'shower' | 'tap', on, note}]
HF.outlets = (x, y, w, h, rows) => {
  const drops = (cx, cy, n, on) => Array.from({length: n}, (_, j) => `<circle cx="${cx + (j % 3 - 1) * 4}" cy="${cy}" r="1.8" fill="${HF.CIRCUIT.cold}" class="${on ? 'drip' : ''}" style="animation-delay:-${(j * .23).toFixed(2)}s" opacity="${on ? 1 : .25}"/>`).join('');
  const icon = (ix, iy, kind, on) => kind === 'none' ? '' : kind === 'shower'
    ? `<path d="M${ix} ${iy - 12}v6h8M${ix + 2} ${iy}a10 5 0 0 1 20 0z" fill="none" style="stroke:var(--edge);fill:var(--panel2)" stroke-width="2.5" stroke-linejoin="round"/>${drops(ix + 12, iy + 10, 6, on)}`
    : `<path d="M${ix} ${iy - 6}h14a6 6 0 0 1 6 6v3M${ix + 6} ${iy - 6}v-5m-4 0h8" fill="none" style="stroke:var(--edge)" stroke-width="3" stroke-linecap="round"/>${drops(ix + 20, iy + 12, 3, on)}`;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#panelg)" style="stroke:var(--line)"/>` +
    `<text x="${x + 12}" y="${y + 18}" font-size="12" font-weight="700" class="t">Taps &amp; showers</text>` +
    rows.map(r => `<g class="hit" data-e="${r.e}"><title>${r.label}</title><text x="${x + 12}" y="${r.y + 4}" font-size="11" class="${r.on ? 't' : 'm'}" font-weight="${r.on ? 700 : 400}">${r.label}</text>` +
      icon(x + w - 40, r.y, r.icon, r.on) + (r.note ? `<text x="${x + 12}" y="${r.y + 18}" font-size="9.5" class="m">${r.note}</text>` : '') + `</g>`).join('') + `</g>`;
};

// The immersion heater: a rod through the tank wall, glowing while it is on.
HF.immersion = (x0, x1, y) => {
  const d = HF.data.immersion, on = d.v > 0;
  return `<g class="hit" data-e="${d.e}"><title>Immersion heater · ${on ? HF.fmt(d) : 'off'}</title>` +
    `<rect x="${Math.min(x0, x1)}" y="${y - 3}" width="${Math.abs(x1 - x0)}" height="6" rx="3" fill="${on ? '#ff7a1a' : '#8a8f99'}" style="${on ? 'filter:drop-shadow(0 0 4px #ff7a1a)' : ''}" class="${on ? 'pulse' : ''}"/>` +
    `<rect class="hl" x="${x0 - 4}" y="${y - 7}" width="9" height="14" rx="2" style="fill:var(--panel2);stroke:var(--edge)" stroke-width="1.4"/></g>`;
};
