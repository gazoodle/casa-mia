// Heating Flow mock-up: the Rooms view, each floor's manifold and its loops, one tile per room
// with its actuator, temperature and target. NEVER TEST THIS.
'use strict';

HF.views.rooms = cfg => {
  HF.reset();
  const keys = ['tf', 'ff', 'gf'].slice(3 - cfg.floors), bandH = Math.min(205, 620 / keys.length);
  const bgAt = () => 'var(--zone-house)';
  const P = [];
  let out = '';

  keys.forEach((fk, i) => {
    const F = HF.ROOMS[fk], y0 = 10 + i * bandH, h = bandH - 14, ufh = HF.floorType(cfg, fk) === 'ufh', mixed = cfg.emitters === 'mixed' && ufh;
    const open = F.loops.filter(l => l[3]).length;

    // The manifold card
    out += `<g class="hit" data-e="sensor.${fk}_manifold"><rect class="hl" x="12" y="${y0}" width="166" height="${h}" rx="14" fill="url(#panelg)" style="stroke:var(--line)"/>` +
      `<text x="26" y="${y0 + 24}" font-size="14" font-weight="700" class="t">${F.name}</text>` +
      `<text x="26" y="${y0 + 42}" font-size="11" class="m">${ufh ? 'Underfloor' : 'Radiators'}${mixed ? ' · mixed' : ''}</text>` +
      `<text x="26" y="${y0 + 74}" font-size="11.5" class="m">Supply</text><text x="26" y="${y0 + 102}" font-size="11.5" class="m">Return</text>` +
      `<text x="26" y="${y0 + h - 14}" font-size="11" class="m">${ufh ? `${open} of ${F.loops.length} loops open` : `${F.loops.length} radiators`}</text></g>` +
      HF.readout(140, y0 + 70, fk + '_s') + HF.readout(140, y0 + 98, fk + '_r');

    // A tile per room
    const m = F.loops.length, tw = (800 - (m - 1) * 10) / m;
    F.loops.forEach(([name, t, target, isOpen], j) => {
      const x = 190 + j * (tw + 10), cold = isOpen && HF.flows.heat && t < target - 1;
      out += `<g class="hit" data-e="climate.room_${fk}${j}"><rect class="hl" x="${x}" y="${y0}" width="${tw}" height="${h}" rx="14" fill="url(#panelg)" style="stroke:${cold ? 'var(--warn)' : 'var(--line)'}" stroke-width="${cold ? 2.5 : 1}"/>` +
        `<text x="${x + 12}" y="${y0 + 22}" font-size="12.5" font-weight="700" class="t">${name}</text>` +
        `<text x="${x + 12}" y="${y0 + 54}" font-size="24" font-weight="700" class="t">${t.toFixed(1)}°</text>` +
        `<text x="${x + 12}" y="${y0 + 72}" font-size="11" class="${cold ? 'w' : 'm'}">${cold ? `${(target - t).toFixed(1)}° below ${target.toFixed(1)}°` : `target ${target.toFixed(1)}°`}</text></g>` +
        `<g class="hit" data-e="binary_sensor.actuator_${fk}${j}"><rect class="hl" x="${x + tw - 62}" y="${y0 + 9}" width="50" height="18" rx="9" style="fill:${isOpen ? 'var(--run)' : 'var(--panel2)'};stroke:${isOpen ? 'var(--run)' : 'var(--line)'}"/>` +
        `<text x="${x + tw - 37}" y="${y0 + 22}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:${isOpen ? '#fff' : 'var(--muted)'}">${ufh ? (isOpen ? 'Open' : 'Closed') : (isOpen ? 'TRV 60%' : 'TRV 0%')}</text></g>`;

      // The loop under the floor, from the manifold's supply to this loop's return; or a radiator.
      const gx0 = x + 14, gx1 = x + tw - 14, gy0 = y0 + 88, gy1 = y0 + h - 14;
      if (ufh) {
        const rows = Math.max(2, Math.floor((gy1 - gy0) / 15) + 1), pts = [[gx0, gy0]];
        for (let r = 0; r < rows; r++) {
          const y = gy0 + r * (gy1 - gy0) / (rows - 1);
          if (r) pts.push([r % 2 ? gx1 : gx0 + 10, y]);   // drop to the next row where the last one ended
          pts.push([r % 2 ? gx0 + 10 : gx1, y]);
        }
        P.push({circ: 'heat', w: 6, r: 7, pts, flow: isOpen && HF.flows.heat ? 'heat' : 'none', speed: 'pump_heat',
                // A closed loop stands at its own temperature; an open one runs from supply to return.
                sensors: [...(isOpen ? [{f: 0, k: fk + '_s', show: false}] : []), {f: 1, k: `loop_${fk}${j}`, show: false}]});
      } else out += HF.radiator(gx0, gy0, Math.min(120, gx1 - gx0), gy1 - gy0, fk + '_s', `loop_${fk}${j}`);
    });
  });

  const p = HF.pipes(P, bgAt);
  return `<defs>${HF.defs()}${p.defs}</defs><rect width="1000" height="630" style="fill:var(--zone-house)"/>${out}${p.body}${p.pills}`;
};
