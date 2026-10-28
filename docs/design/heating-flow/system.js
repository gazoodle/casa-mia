// Heating Flow mock-up: the System view, the whole installation in three areas
// (outside, plant room, house), each drawn from what the config says is there. NEVER TEST THIS.
//
// Pipes are plumbed: every end lands on a part or tees into another pipe. Pipes others tee
// into are z: 1, so their water covers the joins. Six runs cross into the house: heating
// send and return, hot, its return loop, soft cold and hard (or plain cold, with no softener).
'use strict';

HF.W = 1180;
HF.H = 740;

HF.views.system = cfg => {
  HF.reset();
  const ground = cfg.source !== 'air', pvt = ground && cfg.pvt, prio = HF.status.prio;
  const Z = [['outside', 0, 245, cfg.zones[0], '--zone-out'], ['plant', 245, 900, cfg.zones[1], '--zone-plant'], ['house', 900, 1180, cfg.zones[2], '--zone-house']];
  HF.areas = Z;
  const bgAt = x => `var(${Z.find(z => x < z[2])[4]})`;
  const P = [];
  let under = '', over = '';

  // ---- Source ----
  if (ground) {
    under += HF.ground(25, 440, 200, 180, cfg.source === 'borehole' ? 'Borehole' : 'Ground loop');
    let U = [[70, 440], [70, 600], [150, 600], [150, 440]];
    if (cfg.source === 'horizontal') {
      U = [[70, 440], [70, 560]];
      for (let x = 82, j = 0; x <= 202; x += 12, j++) U.push([x, j % 2 ? 548 : 572]);
      U.push([206, 560], [206, 480], [150, 480], [150, 440]);
    }
    P.push({circ: 'brine', pts: U, r: cfg.source === 'borehole' ? 40 : 6, w: 10, flow: 'brine', speed: 'pump_brine',
            sensors: [{f: 0, k: 'brine_out', show: false}, {f: 1, k: 'brine_ground', show: false}]});
    P.push({circ: 'brine', pts: [[285, 330], [70, 330], [70, 440]], flow: 'brine', speed: 'pump_brine',
            hops: pvt ? [[205, 330, 'h'], [240, 330, 'h']] : undefined, sensors: [{at: [120, 330], k: 'brine_out'}]});
    P.push({circ: 'brine', z: 1, pts: [[150, 440], [150, 385], [285, 385]], flow: 'brine', speed: 'pump_brine',
            sensors: [{f: 0, k: 'brine_ground', show: false}, {at: [262, 385], k: 'brine_in'}]});
    if (pvt) {
      under += HF.pvt(40, 62, 155, 85);
      P.push({circ: 'brine', pts: [[205, 385], [205, 127], [195, 127]], flow: 'pvt', speed: 'pump_brine', sensors: [{at: [205, 250], k: 'brine_ground'}]});
      P.push({circ: 'pvt', pts: [[195, 84], [240, 84], [240, 385]], flow: 'pvt', speed: 'pump_brine', sensors: [{at: [240, 190], k: 'pvt_out'}]});
      over += HF.valve(205, 385, ['w', 'e', 'n'], HF.flows.pvt ? ['w', 'n'] : ['w', 'e'], 'PVT valve', 'pvt_valve', [196, 372, 'end']);
    }
    over += HF.pump(150, 412, 'n', 'pump_brine', 'Brine pump', [172, 426, 'start'], HF.flags.brinePumpWarn);
  } else {
    // Air: the outdoor unit's fan coil, and the refrigerant lines to the heat pump.
    const on = HF.flows.comp;
    under += `<g class="hit" data-e="sensor.outdoor"><rect class="hl" x="30" y="230" width="200" height="190" rx="16" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
      `<circle cx="130" cy="325" r="72" style="fill:var(--panel2);stroke:var(--edge)" stroke-width="2"/>` +
      `<g class="${on ? 'spin' : ''}" style="transform-origin:130px 325px;--sd:.8s">${[0, 120, 240].map(a => `<path d="M130 325c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${a} 130 325)" style="fill:var(--line)"/>`).join('')}</g>` +
      [0, 1, 2, 3, 4].map(j => `<circle cx="130" cy="325" r="${20 + j * 13}" fill="none" style="stroke:var(--edge)" stroke-opacity=".35"/>`).join('') +
      `<text x="130" y="222" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan coil</text></g>` +
      (on ? [270, 325, 380].map(y => `<path d="M30 ${y}c-8 -6 -16 6 -26 0" fill="none" stroke="${HF.CIRCUIT.cold}" stroke-width="3" stroke-dasharray="4 6" class="dash" style="--d:.6s"/>`).join('') : '');
    P.push({circ: 'ref', pts: [[285, 300], [230, 300]], flow: 'comp', speed: 'hz', sensors: [{f: 0, k: 'liquid', show: false}]});
    P.push({circ: 'ref', pts: [[230, 360], [285, 360]], flow: 'comp', speed: 'hz', sensors: [{f: 0, k: 'suction', show: false}]});
    over += HF.readout(130, 445, 'outdoor');
  }

  // ---- Heat pump panel ----
  const pc = HF.PRIO[prio], hz = HF.data.hz;
  over += `<g><rect x="285" y="170" width="235" height="280" rx="18" fill="url(#panelg)" style="stroke:var(--edge)" stroke-width="1.5"/>` +
    `<text x="300" y="194" font-size="13" font-weight="700" class="t">${ground ? 'Ground' : 'Air'} source heat pump</text>` +
    `<g class="hit" data-e="sensor.priority"><title>Priority</title><rect class="hl" x="300" y="204" width="96" height="22" rx="11" fill="${pc}"/><text x="348" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${prio}</text></g>` +
    (HF.status.alarm ? `<g class="hit" data-e="sensor.alarm"><title>${HF.status.alarm}</title><rect class="hl pulse" x="404" y="204" width="104" height="22" rx="11" style="fill:var(--bad)"/><text x="456" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Alarm</text></g>` : '') +
    HF.compressor(337, 282, 30, 'hz') + `<text x="337" y="330" text-anchor="middle" font-size="12" font-weight="700" class="t">${hz.v > 0 ? HF.fmt(hz) : 'Stopped'}</text>` +
    HF.row(382, 258, 'Supply', 'supply', 508) + HF.row(382, 280, 'Calculated', 'calc', 508) + HF.row(382, 302, 'Return', 'return', 508) +
    `<path d="M300 344H506" style="stroke:var(--line)"/>` +
    HF.row(300, 368, 'Outdoor', 'outdoor', 396) + HF.row(300, 390, 'Power', 'pin', 396) + HF.row(300, 412, 'Heat', 'pout', 396) +
    HF.row(412, 368, 'COP', 'cop', 508) + HF.row(412, 390, 'Aux', 'aux', 508) + HF.row(412, 412, 'DM', 'dm', 508) + `</g>`;

  // ---- Heating: pump and diverter, a long run to the house, a riser up to each floor and
  // a riser down the far side collecting the returns ----
  const keys = ['tf', 'ff', 'gf'].slice(3 - cfg.floors), slots = [30, 145, 260].slice(3 - cfg.floors);
  const ys = slots.map(y => y + 34), yr = slots.map(y => y + 74);
  const heat = (pts, sensors, more = {}) => P.push({circ: 'heat', pts, flow: 'heat', speed: 'pump_heat', sensors, ...more});
  P.push({circ: 'heat', pts: [[520, 250], [620, 250]], flow: 'hp_out', speed: 'pump_heat', sensors: [{f: 0, k: 'supply', show: false}]});
  heat([[620, 250], [920, 250]], [{f: 0, k: 'supply', show: false}, {area: 'plant', k: 'run_s1'}, {area: 'plant', k: 'run_s2'}, {f: 1, k: keys[keys.length - 1] + '_s', show: false}]);
  if (Math.min(...ys) < 250) heat([[920, 250], [920, ys[0]], [960, ys[0]]], [{f: 0, k: 'run_s2', show: false}, {f: 1, k: keys[0] + '_s', show: false}], {z: 1});
  if (Math.max(...ys) > 250) heat([[920, 250], [920, ys[ys.length - 1]], [960, ys[ys.length - 1]]], [{f: 1, k: keys[keys.length - 1] + '_s', show: false}], {z: 1});
  keys.forEach((fk, i) => { if (i > 0 && i < keys.length - 1) heat([[920, ys[i]], [960, ys[i]]], [{f: 1, k: fk + '_s', show: false}]); });
  heat([[1150, yr[0]], [1165, yr[0]], [1165, 405], [900, 405]], [{f: 0, k: keys[0] + '_r', show: false}, {f: 1, k: 'house_return', show: false}], {z: 1});
  keys.forEach((fk, i) => { if (i > 0) heat([[1150, yr[i]], [1165, yr[i]]], [{f: 0, k: fk + '_r', show: false}]); });
  heat([[900, 405], [560, 405]], [{f: 0, k: 'house_return', show: false}, {area: 'plant', k: 'run_r2'}, {area: 'plant', k: 'run_r1'}], {z: 1, r: 0});
  P.push({circ: 'heat', z: 1, pts: [[560, 405], [520, 405]], flow: 'hp_out', speed: 'pump_heat', sensors: [{f: 1, k: 'return', show: false}]});
  over += HF.pump(565, 250, 'e', 'pump_heat', 'Pump', [565, 283, 'middle']);
  over += HF.valve(620, 250, ['w', 'e', 's'], ['w', prio === 'Hot water' ? 's' : 'e'], `Diverter → ${prio === 'Hot water' ? 'hot water' : 'heating'}`, 'diverter', [620, 216, 'middle']);
  const floors = keys.map((fk, i) => floorBox(cfg, fk, slots[i], ys[i], yr[i], bgAt));

  // ---- Hot water: the coil in and out of the tank's side, hot out of the top and along its run
  // to the house, the return loop back (narrower), the immersion heater ----
  let tankOver = '';
  if (cfg.dhw) {
    P.push({circ: 'dhw', pts: [[620, 250], [620, 455], [584, 455], [584, 500], [600, 500]], flow: 'coil', speed: 'pump_heat', hops: [[620, 405, 'v']], sensors: [{at: [620, 340], k: 'coil_in'}]});
    const t = HF.tank(600, 470, 140, 160, [['tank_top', .14], ['tank_mid', .5], ['tank_bot', .86]]);
    under += t.under;
    tankOver = t.over + (cfg.immersion ? HF.immersion(740, 652, 512) : '');
    P.push({circ: 'dhw', w: 8, r: 8, flow: 'coil', speed: 'pump_heat', pts: [[600, 500], [688, 500], [688, 526], [624, 526], [624, 552], [688, 552], [688, 578], [624, 578], [624, 604], [600, 604]],
            sensors: [{f: 0, k: 'coil_in', show: false}, {f: 1, k: 'coil_out', show: false}]});
    P.push({circ: 'dhw', pts: [[600, 604], [560, 604], [560, 405]], flow: 'coil', speed: 'pump_heat', sensors: [{at: [560, 560], k: 'coil_out'}]});
    P.push({circ: 'hot', pts: [[720, 470], [720, 445], [1030, 445]], flow: 'hot', sensors: [{f: 0, k: 'hot_out', show: false},
            {area: 'plant', k: 'hot_p1'}, {area: 'plant', k: 'hot_p2'}, {area: 'house', k: 'hot_h1'}, {area: 'house', k: 'hot_h2'}]});
    if (cfg.recirc) {
      P.push({circ: 'hot', w: 7, pts: [[1030, 530], [740, 530]], flow: 'recirc', sensors: [{area: 'house', k: 'circ_h2'}, {area: 'house', k: 'circ_h1'}, {area: 'plant', k: 'circ_p2'}, {area: 'plant', k: 'circ_p1'}]});
      over += HF.pump(756, 530, 'w', 'pump_recirc', 'Loop', [772, 560, 'start']);
    }
  }

  // ---- Water: mains in, softener, storage tank and its pumps, and the runs to the house ----
  const soft = cfg.softener, store = cfg.storage, coldK = 'cold';
  // The mains comes in along the bottom; with a softener it tees up into it and carries on to
  // the house as hard water.
  under += HF.stopcock(262, 712);
  const quiet = {f: 0, k: coldK, show: false};
  if (soft) {
    under += HF.softener(285, 530, 60, 142);
    P.push({circ: 'cold', z: 1, pts: [[262, 712], [300, 712]], flow: 'mains', sensors: [quiet]});
    P.push({circ: 'cold', pts: [[300, 712], [300, 672]], flow: 'mains', sensors: [quiet]});
    P.push({circ: 'cold', pts: [[300, 712], [1030, 712]], flow: 'hard', sensors: [quiet]});
  } else P.push({circ: 'cold', z: 1, pts: [[262, 712], [330, 712]], flow: 'mains', sensors: [quiet]});
  const src = soft ? [[345, 560], [362, 560], [362, 486]] : [[330, 712], [330, 486]];   // softened, or straight from the mains
  if (store) {
    under += HF.storage(380, 498, 120, 202, cfg.filling);
    P.push({circ: 'cold', pts: [...src, [440, 486], [440, 498]], flow: 'fill', sensors: [quiet]});
    over += HF.valve(395, 486, ['w', 'e'], cfg.filling ? ['w', 'e'] : [], `Inlet${cfg.filling ? ' · open' : ''}`, 'storage_inlet', [395, 452, 'middle']);
    // The pumps sit in the water and lift into a header that leaves through the side.
    const pumps = cfg.pumps > 1 ? [405, 470] : [440];
    pumps.forEach((x, j) => {
      P.push({circ: 'cold', w: 8, pts: [[x, 668], [x, 650]], flow: HF.val(`pump_soft${j + 1}`) > 0 ? 'soft' : 'none', speed: `pump_soft${j + 1}`, sensors: [quiet]});
      over += HF.pump(x, 682, 'n', `pump_soft${j + 1}`, `P${j + 1}`, [x, 638, 'middle']);
    });
    P.push({circ: 'cold', z: 1, pts: [[pumps[0], 650], [760, 650], [760, 612], [740, 612]], flow: 'soft', speed: 'pump_soft1', sensors: [quiet, {at: [640, 650], k: coldK}]});
  } else {
    // No storage tank: the cold main feeds the tank and the house straight from the mains (or softener).
    P.push({circ: 'cold', z: 1, pts: soft ? [...src, [520, 486], [520, 650], [760, 650], [760, 612], [740, 612]] : [[330, 712], [330, 650], [760, 650], [760, 612], [740, 612]],
            flow: 'soft', sensors: [quiet, {at: [640, 650], k: coldK}]});
  }
  P.push({circ: 'cold', pts: [[760, 650], [1030, 650]], flow: 'soft', speed: 'pump_soft1', sensors: [{f: 0, k: coldK, show: false}]});
  const inUse = HF.inUse, unsure = inUse.soft ? 'in use · hot or cold?' : '';
  over += HF.outlets(1030, 412, 135, 318, [
    {y: 470, label: soft ? 'Soft hot' : 'Hot', icon: 'shower', on: inUse.soft, note: unsure, e: 'sensor.hot_h2'},
    ...(cfg.recirc ? [{y: 530, label: 'Return loop', icon: 'none', on: HF.flows.recirc, e: 'sensor.circ_h2'}] : []),
    {y: 650, label: soft ? 'Soft cold' : 'Cold', icon: 'tap', on: inUse.soft, note: unsure, e: 'sensor.cold'},
    ...(soft ? [{y: 704, label: 'Hard (kitchen)', icon: 'tap', on: inUse.hard, note: cfg.meter ? '' : 'needs a mains meter', e: 'sensor.mains_flow'}] : []),
  ]);

  const p = HF.pipes(P, bgAt);
  return `<defs>${HF.defs()}${p.defs}</defs>${HF.zones(Z.map(z => [z[1], z[2], z[3], z[4]]), HF.H)}${under}` +
    `<g style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))">${p.body}</g>` +
    `${tankOver}${floors.map(f => f.box).join('')}<g style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))">${floors.map(f => f.pipes).join('')}</g>${floors.map(f => f.over).join('')}${over}${p.pills}`;
};

// One floor: its manifold (underfloor loops, each with its actuator) or its radiators. The send
// comes in on the left, the return leaves on the right.
function floorBox(cfg, fk, y0, ys, yr, bgAt) {
  const F = HF.ROOMS[fk], ufh = HF.floorType(cfg, fk) === 'ufh', mixed = cfg.emitters === 'mixed' && ufh;
  const open = F.loops.filter(l => l[3]).length, x0 = mixed ? 982 : 966;
  const box = `<g class="hit" data-e="sensor.${fk}_manifold"><rect class="hl" x="960" y="${y0}" width="190" height="100" rx="12" fill="url(#panelg)" style="stroke:var(--line)"/>` +
    `<text x="972" y="${y0 + 18}" font-size="12" font-weight="700" class="t">${F.name}</text>` +
    `<text x="1140" y="${y0 + 18}" text-anchor="end" font-size="10.5" class="m">${ufh ? 'Underfloor' : 'Radiators'}${mixed ? ' · mixed' : ''}</text>` +
    `<text x="972" y="${y0 + 93}" font-size="10.5" class="m">${ufh ? `${open} of ${F.loops.length} loops open` : `${F.loops.length} radiators`}</text></g>`;
  const P = [
    {circ: 'heat', w: 6, r: 0, z: 1, pts: [[960, ys], [1120, ys]], flow: 'heat', speed: 'pump_heat', sensors: [{f: 0, k: fk + '_s', show: false}]},
    {circ: 'heat', w: 6, r: 0, z: 1, pts: [[x0 + 50, yr], [1150, yr]], flow: 'heat', speed: 'pump_heat', sensors: [{f: 1, k: fk + '_r', show: false}]},
  ];
  let over = '';
  if (ufh) F.loops.forEach((l, j) => {
    const x = x0 + 56 + j * 15;
    P.push({circ: 'heat', w: 5, r: 0, pts: [[x, ys], [x, yr]], flow: l[3] && HF.flows.heat ? 'heat' : 'none', speed: 'pump_heat',
            sensors: [...(l[3] ? [{f: 0, k: fk + '_s', show: false}] : []), {f: 1, k: `loop_${fk}${j}`, show: false}]});
    over += `<g class="hit" data-e="binary_sensor.actuator_${fk}${j}"><title>${l[0]}: ${l[3] ? 'open' : 'closed'}</title><circle class="hl" cx="${x}" cy="${ys + 11}" r="4.5" style="fill:${l[3] ? 'var(--run)' : 'var(--panel)'};stroke:var(--edge)" stroke-width="1.5"/></g>`;
  });
  else F.loops.slice(0, 3).forEach((l, j) => { over += HF.radiator(x0 + 54 + j * 30, ys + 7, 24, yr - ys - 20, fk + '_s', fk + '_r'); });
  if (mixed) over += HF.valve(974, ys, ['w', 'e', 'n'], ['w', 'e', 'n'], 'Mixing valve', fk + '_mixing');
  over += HF.readout(x0 + 24, ys, fk + '_s') + HF.readout(1120, yr, fk + '_r');
  const p = HF.pipes(P, bgAt);
  return {box: `<defs>${p.defs}</defs>` + box, pipes: p.body, over};
}
