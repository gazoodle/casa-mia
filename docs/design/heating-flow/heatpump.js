// Heating Flow mock-up: the Heat pump view, a cutaway of the refrigerant cycle as the textbook
// diagrams draw it: source, evaporator, compressor, condenser, expansion valve, load. NEVER TEST THIS.
'use strict';

HF.views.heatpump = cfg => {
  HF.reset();
  const ground = cfg.source !== 'air', prio = HF.status.prio, defrost = prio === 'Defrost', run = HF.flows.comp;
  const Z = [[0, 230, ground ? 'Source' : 'Outside', '--zone-out'], [230, 770, 'Heat pump', '--zone-plant'], [770, 1000, 'Load', '--zone-house']];
  const bgAt = x => `var(${Z.find(z => x < z[1])[3]})`;
  const P = [];
  let under = `<rect x="250" y="62" width="500" height="555" rx="28" style="fill:var(--panel);stroke:var(--line)" opacity=".55"/>`, over = '';

  // ---- Source, through the evaporator ----
  if (ground) {
    under += HF.ground(20, 470, 190, 150, cfg.source === 'borehole' ? 'Borehole' : 'Ground loop');
    P.push({circ: 'brine', pts: [[150, 470], [150, 595], [70, 595], [70, 470]], r: 40, w: 10, flow: 'brine', speed: 'pump_brine',
            sensors: [{f: 0, k: 'brine_out', show: false}, {f: 1, k: 'brine_ground', show: false}]});
    P.push({circ: 'brine', pts: [[70, 470], [70, 250], [290, 250]], flow: 'brine', speed: 'pump_brine', sensors: [{f: 0, k: 'brine_ground', show: false}, {at: [200, 250], k: 'brine_in'}]});
    P.push({circ: 'brine', pts: [[290, 440], [150, 440], [150, 470]], flow: 'brine', speed: 'pump_brine', sensors: [{at: [220, 440], k: 'brine_out'}]});
    over += HF.pump(70, 360, 'n', 'pump_brine', 'Brine pump', [92, 364, 'start'], HF.flags.brinePumpWarn);
  } else {
    under += `<g class="hit" data-e="sensor.outdoor"><rect class="hl" x="20" y="200" width="190" height="290" rx="16" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
      `<circle cx="115" cy="345" r="70" style="fill:var(--panel2);stroke:var(--edge)" stroke-width="2"/>` +
      `<g class="${run ? 'spin' : ''}" style="transform-origin:115px 345px;--sd:.8s">${[0, 120, 240].map(a => `<path d="M115 345c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${a} 115 345)" style="fill:var(--line)"/>`).join('')}</g>` +
      `<text x="115" y="190" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan</text></g>` + HF.readout(115, 460, 'outdoor');
    if (run) over += [270, 330, 390, 450].map(y => `<path d="M190 ${y}H385" fill="none" stroke="${HF.CIRCUIT.cold}" stroke-width="3" stroke-dasharray="6 8" class="dash" style="--d:.5s" opacity=".8"/>`).join('');
  }
  under += HF.vessel(290, 200, 100, 280, 'suction', 'evap', 'Evaporator', 'evap', run);
  if (ground) P.push({circ: 'brine', w: 9, r: 9, flow: 'brine', speed: 'pump_brine',
    pts: [[290, 250], [370, 250], [370, 290], [310, 290], [310, 330], [370, 330], [370, 370], [310, 370], [310, 410], [370, 410], [370, 440], [290, 440]],
    sensors: [{f: 0, k: 'brine_in', show: false}, {f: 1, k: 'brine_out', show: false}]});

  // ---- Refrigerant: suction gas, compressor, hot gas, condenser, liquid, expansion ----
  const ref = (pts, k) => P.push({circ: 'ref', pts, flow: 'comp', speed: 'hz', rev: defrost, sensors: [{f: 0, k, show: false}]});
  ref([[340, 200], [340, 110], [456, 110]], 'suction');
  ref([[544, 110], [700, 110], [700, 200]], 'hotgas');
  ref([[700, 480], [700, 560], [524, 560]], 'liquid');
  ref([[476, 560], [340, 560], [340, 480]], 'evap');
  over += HF.compressor(500, 110, 44, 'hz') +
    `<text x="500" y="52" text-anchor="middle" font-size="12" font-weight="700" class="t">Compressor · ${run ? HF.fmt(HF.data.hz) : 'stopped'}</text>`;
  over += HF.valve(500, 560, ['w', 'e'], ['w', 'e'], 'Expansion valve', 'expansion_valve', [500, 598, 'middle']);
  if (!ground) over += `<g class="hit" data-e="binary_sensor.defrost"><rect class="hl" x="603" y="97" width="34" height="26" rx="4" style="fill:var(--panel2);stroke:var(--edge)" stroke-width="1.6"/>` +
    `<path d="M610 104l20 12M610 116l20 -12" style="stroke:${defrost ? HF.CIRCUIT.cold : 'var(--edge)'}" stroke-width="2"/>` +
    `<text x="620" y="88" text-anchor="middle" font-size="10.5" class="m halo">Reversing valve · ${defrost ? 'defrost' : 'heating'}</text></g>`;
  under += HF.vessel(650, 200, 100, 280, 'hotgas', 'liquid', 'Condenser', 'cond', run);
  over += HF.callout(115, 92, 140, 'Suction gas', 'suction', 'low pressure', [340, 150]);
  over += HF.callout(540, 140, 150, 'Hot gas', 'hotgas', 'high pressure', [700, 170]);
  over += HF.callout(535, 490, 150, 'Liquid', 'liquid', 'high pressure', [620, 560]);

  // ---- Load: through the condenser, the heating pump, the diverter ----
  P.push({circ: 'heat', w: 9, r: 9, flow: 'hp_out', speed: 'pump_heat',
    pts: [[750, 460], [670, 460], [670, 420], [730, 420], [730, 380], [670, 380], [670, 340], [730, 340], [730, 300], [670, 300], [670, 260], [750, 260]],
    sensors: [{f: 0, k: 'return', show: false}, {f: 1, k: 'supply', show: false}]});
  P.push({circ: 'heat', pts: [[750, 260], [850, 260]], flow: 'hp_out', speed: 'pump_heat', sensors: [{at: [775, 260], k: 'supply'}]});
  P.push({circ: 'heat', pts: [[850, 260], [880, 260]], flow: 'heat', speed: 'pump_heat', sensors: [{f: 0, k: 'supply', show: false}]});
  P.push({circ: 'heat', pts: [[880, 300], [870, 300], [870, 460], [750, 460]], flow: 'hp_out', speed: 'pump_heat', sensors: [{f: 0, k: 'house_return', show: false}, {at: [800, 460], k: 'return'}]});
  if (cfg.dhw) {
    P.push({circ: 'dhw', pts: [[850, 260], [850, 390], [880, 390]], flow: 'coil', speed: 'pump_heat', hops: [[870, 390, 'h']], sensors: [{f: 0, k: 'coil_in', show: false}]});
    P.push({circ: 'dhw', pts: [[880, 440], [870, 440]], flow: 'coil', speed: 'pump_heat', sensors: [{f: 0, k: 'coil_out', show: false}]});
  }
  over += HF.pump(815, 260, 'e', 'pump_heat', 'Heating pump', [815, 232, 'middle']);
  over += HF.valve(850, 260, ['w', 'e', 's'], ['w', prio === 'Hot water' ? 's' : 'e'], 'Diverter', 'diverter');
  const box = (y, title, rows) => `<g><rect x="880" y="${y}" width="110" height="${18 + rows.length * 22 + 8}" rx="10" fill="url(#panelg)" style="stroke:var(--line)"/>` +
    `<text x="890" y="${y + 18}" font-size="12" font-weight="700" class="t">${title}</text>` + rows.map(([l, k], j) => HF.row(890, y + 40 + j * 22, l, k, 982)).join('') + `</g>`;
  over += box(200, 'Heating', [['Supply', 'house_supply'], ['Target', 'calc'], ['Return', 'house_return'], ['DM', 'dm']]);
  if (cfg.dhw) over += box(360, 'Hot water', [['Top', 'tank_top'], ['Coil in', 'coil_in'], ['Coil out', 'coil_out']]);

  const p = HF.pipes(P, bgAt);
  return `<defs>${HF.defs()}${p.defs}</defs>${HF.zones(Z, 630)}${under}` +
    `<g style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))">${p.body}</g>${over}${p.pills}`;
};
